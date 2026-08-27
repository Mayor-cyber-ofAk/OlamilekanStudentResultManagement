import { Database } from 'sql.js';
import { getDb, saveDb } from '../db.ts';

export interface GradingScaleTier {
  min: number;
  max: number;
  letter: string;
  gpa: number;
  description?: string;
}

export interface EnrollmentCalculationResult {
  enrollmentId: string;
  studentId: string;
  courseId: string;
  rawScore: number;
  curvedScore: number;
  letterGrade: string;
  gpaPoints: number;
  isPassed: boolean;
  componentScores: {
    componentId: string;
    name: string;
    type: string;
    maxScore: number;
    weightPercent: number;
    score: number | null;
    isExcused: boolean;
    percentage: number | null;
    weightedContribution: number;
  }[];
}

export async function calculateCourseGrades(courseId: string): Promise<EnrollmentCalculationResult[]> {
  const db = await getDb();

  // Fetch course info
  const courseRes = db.exec(`
    SELECT c.id, c.code, c.title, c.credits, c.grading_scale_id, c.pass_threshold_percentage, c.curve_offset, c.curve_type, gs.scale_json
    FROM courses c
    JOIN grading_scales gs ON c.grading_scale_id = gs.id
    WHERE c.id = '${courseId}'
  `);

  if (!courseRes || courseRes.length === 0 || courseRes[0].values.length === 0) {
    throw new Error(`Course not found: ${courseId}`);
  }

  const courseRow = courseRes[0].values[0];
  const passThreshold = Number(courseRow[5] ?? 40.0);
  const curveOffset = Number(courseRow[6] ?? 0.0);
  const curveType = String(courseRow[7] ?? 'none');
  const scaleJson = String(courseRow[8] ?? '[]');
  const scaleTiers: GradingScaleTier[] = JSON.parse(scaleJson);

  // Fetch assessment components for this course
  const compRes = db.exec(`
    SELECT id, name, type, max_score, weight_percent, sequence
    FROM assessment_components
    WHERE course_id = '${courseId}'
    ORDER BY sequence ASC, name ASC
  `);

  const components = (compRes.length > 0 ? compRes[0].values : []).map(row => ({
    id: String(row[0]),
    name: String(row[1]),
    type: String(row[2]),
    maxScore: Number(row[3]),
    weightPercent: Number(row[4]),
    sequence: Number(row[5])
  }));

  // Fetch all enrollments for this course
  const enrollRes = db.exec(`
    SELECT e.id, e.student_id, e.status, u.full_name, u.student_id as student_code, u.email
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE e.course_id = '${courseId}'
  `);

  const enrollments = (enrollRes.length > 0 ? enrollRes[0].values : []).map(row => ({
    id: String(row[0]),
    studentId: String(row[1]),
    status: String(row[2]),
    studentName: String(row[3]),
    studentCode: String(row[4]),
    studentEmail: String(row[5])
  }));

  // Fetch all submitted grades for this course
  const gradeRes = db.exec(`
    SELECT g.enrollment_id, g.assessment_component_id, g.score, g.is_excused, g.feedback
    FROM grades g
    JOIN enrollments e ON g.enrollment_id = e.id
    WHERE e.course_id = '${courseId}'
  `);

  const gradesMap = new Map<string, { score: number | null; isExcused: boolean; feedback: string }>();
  if (gradeRes.length > 0) {
    for (const row of gradeRes[0].values) {
      const key = `${row[0]}_${row[1]}`;
      gradesMap.set(key, {
        score: row[2] !== null ? Number(row[2]) : null,
        isExcused: Number(row[3]) === 1,
        feedback: String(row[4] ?? '')
      });
    }
  }

  const results: EnrollmentCalculationResult[] = [];

  for (const enr of enrollments) {
    let totalWeightedScore = 0;
    let totalActiveWeight = 0;
    const compBreakdown = [];

    for (const comp of components) {
      const g = gradesMap.get(`${enr.id}_${comp.id}`);
      const isExcused = g ? g.isExcused : false;
      const score = g && g.score !== null ? g.score : null;

      let pct: number | null = null;
      let weightedContrib = 0;

      if (isExcused) {
        // Excused component: do not penalize, exclude weight from denominator
      } else if (score !== null) {
        pct = Math.min(Math.max((score / comp.maxScore) * 100, 0), 100);
        weightedContrib = (score / comp.maxScore) * comp.weightPercent;
        totalWeightedScore += weightedContrib;
        totalActiveWeight += comp.weightPercent;
      } else {
        // Unentered score is treated as 0 in current weighted total if component is required
        totalActiveWeight += comp.weightPercent;
      }

      compBreakdown.push({
        componentId: comp.id,
        name: comp.name,
        type: comp.type,
        maxScore: comp.maxScore,
        weightPercent: comp.weightPercent,
        score,
        isExcused,
        percentage: pct !== null ? Number(pct.toFixed(2)) : null,
        weightedContribution: Number(weightedContrib.toFixed(2))
      });
    }

    // Normalized Raw Score (0 - 100)
    let rawScore = 0;
    if (totalActiveWeight > 0) {
      rawScore = (totalWeightedScore / totalActiveWeight) * 100;
    } else {
      rawScore = 0;
    }
    rawScore = Math.min(Math.max(rawScore, 0), 100);

    // Apply Curving Rules
    let curvedScore = rawScore;
    if (curveType === 'flat' || curveType === 'offset') {
      curvedScore = Math.min(100, Math.max(0, rawScore + curveOffset));
    } else if (curveType === 'sqrt') {
      curvedScore = Math.min(100, Math.max(0, 10 * Math.sqrt(rawScore) + curveOffset));
    } else if (curveOffset !== 0) {
      curvedScore = Math.min(100, Math.max(0, rawScore + curveOffset));
    }

    // Determine Letter Grade & GPA Points from Nigerian NUC Scale Tiers
    let matchedTier = scaleTiers.find(tier => curvedScore >= tier.min && curvedScore <= (tier.max + 0.001));
    if (!matchedTier) {
      if (curvedScore >= 70) {
        matchedTier = scaleTiers[0];
      } else {
        matchedTier = scaleTiers[scaleTiers.length - 1];
      }
    }

    const letterGrade = matchedTier ? matchedTier.letter : 'F';
    const gpaPoints = matchedTier ? matchedTier.gpa : 0.0;
    const isPassed = curvedScore >= passThreshold;

    // Update enrollment in DB
    db.run(`
      UPDATE enrollments
      SET calculated_raw_score = ${rawScore.toFixed(2)},
          calculated_curved_score = ${curvedScore.toFixed(2)},
          calculated_letter_grade = '${letterGrade}',
          calculated_gpa_points = ${gpaPoints.toFixed(2)},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = '${enr.id}'
    `);

    results.push({
      enrollmentId: enr.id,
      studentId: enr.studentId,
      courseId,
      rawScore: Number(rawScore.toFixed(2)),
      curvedScore: Number(curvedScore.toFixed(2)),
      letterGrade,
      gpaPoints: Number(gpaPoints.toFixed(2)),
      isPassed,
      componentScores: compBreakdown
    });
  }

  saveDb();
  return results;
}

export async function recalculateAllCourses(): Promise<void> {
  const db = await getDb();
  const res = db.exec(`SELECT id FROM courses`);
  if (res.length > 0) {
    for (const row of res[0].values) {
      const courseId = String(row[0]);
      await calculateCourseGrades(courseId);
    }
  }
}

export async function calculateStudentCumulativeRecord(studentId: string) {
  const db = await getDb();

  // Get all completed/enrolled courses for student with semester details
  const res = db.exec(`
    SELECT 
      e.id as enrollment_id,
      e.course_id,
      c.code as course_code,
      c.title as course_title,
      c.credits,
      s.id as semester_id,
      s.code as semester_code,
      s.name as semester_name,
      s.academic_year,
      e.calculated_raw_score,
      e.calculated_curved_score,
      e.calculated_letter_grade,
      e.calculated_gpa_points,
      e.status,
      e.is_published,
      d.name as department_name
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    JOIN semesters s ON e.semester_id = s.id
    JOIN departments d ON c.department_id = d.id
    WHERE e.student_id = '${studentId}'
    ORDER BY s.start_date ASC, c.code ASC
  `);

  if (!res || res.length === 0) {
    return {
      studentId,
      semesters: [],
      cumulativeGpa: 0,
      totalCreditsAttempted: 0,
      totalCreditsEarned: 0,
      academicStanding: 'Good Standing (First Class)'
    };
  }

  const rows = res[0].values;
  const semesterMap = new Map<string, {
    semesterId: string;
    semesterCode: string;
    semesterName: string;
    academicYear: string;
    courses: any[];
    semesterCreditsAttempted: number;
    semesterCreditsEarned: number;
    semesterQualityPoints: number;
    semesterGpa: number;
  }>();

  let cumQualityPoints = 0;
  let cumCreditsAttempted = 0;
  let cumCreditsEarned = 0;

  for (const row of rows) {
    const semId = String(row[5]);
    const credits = Number(row[4]);
    const letterGrade = String(row[11]);
    const gpaPoints = Number(row[12]);
    const isPublished = Number(row[14]) === 1;

    if (!semesterMap.has(semId)) {
      semesterMap.set(semId, {
        semesterId: semId,
        semesterCode: String(row[6]),
        semesterName: String(row[7]),
        academicYear: String(row[8]),
        courses: [],
        semesterCreditsAttempted: 0,
        semesterCreditsEarned: 0,
        semesterQualityPoints: 0,
        semesterGpa: 0
      });
    }

    const semData = semesterMap.get(semId)!;
    const courseItem = {
      enrollmentId: String(row[0]),
      courseId: String(row[1]),
      courseCode: String(row[2]),
      courseTitle: String(row[3]),
      credits,
      rawScore: Number(row[9]),
      curvedScore: Number(row[10]),
      letterGrade,
      gpaPoints,
      status: String(row[13]),
      isPublished,
      departmentName: String(row[15])
    };

    semData.courses.push(courseItem);

    if (isPublished && letterGrade !== 'N/A') {
      semData.semesterCreditsAttempted += credits;
      if (letterGrade !== 'F') {
        semData.semesterCreditsEarned += credits;
      }
      semData.semesterQualityPoints += gpaPoints * credits;

      cumCreditsAttempted += credits;
      if (letterGrade !== 'F') {
        cumCreditsEarned += credits;
      }
      cumQualityPoints += gpaPoints * credits;
    }
  }

  // Calculate semester GPAs
  const semesterList = Array.from(semesterMap.values()).map(sem => {
    const semGpa = sem.semesterCreditsAttempted > 0 
      ? Number((sem.semesterQualityPoints / sem.semesterCreditsAttempted).toFixed(2))
      : 0.0;
    return {
      ...sem,
      semesterGpa: semGpa
    };
  });

  const cumulativeGpa = cumCreditsAttempted > 0
    ? Number((cumQualityPoints / cumCreditsAttempted).toFixed(2))
    : 0.0;

  // Determine Academic Standing according to standard Nigerian University Honours System (5.0 Scale)
  let academicStanding = 'Good Standing';
  if (cumulativeGpa >= 4.50) {
    academicStanding = 'First Class Honours (Distinction)';
  } else if (cumulativeGpa >= 3.50) {
    academicStanding = 'Second Class Honours (Upper Division - 2:1)';
  } else if (cumulativeGpa >= 2.40) {
    academicStanding = 'Second Class Honours (Lower Division - 2:2)';
  } else if (cumulativeGpa >= 1.50) {
    academicStanding = 'Third Class Honours';
  } else if (cumulativeGpa >= 1.00) {
    academicStanding = 'Pass Degree';
  } else {
    academicStanding = 'Academic Probation / Advice to Withdraw';
  }

  return {
    studentId,
    semesters: semesterList,
    cumulativeGpa,
    totalCreditsAttempted: cumCreditsAttempted,
    totalCreditsEarned: cumCreditsEarned,
    academicStanding
  };
}

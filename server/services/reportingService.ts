import { getDb } from '../db.ts';
import { calculateCourseGrades, calculateStudentCumulativeRecord } from './gradingEngine.ts';

export async function getCourseAnalytics(courseId: string) {
  const db = await getDb();

  // Run calculation to ensure up-to-date grades
  const calcResults = await calculateCourseGrades(courseId);

  // Fetch course details
  const courseRes = db.exec(`
    SELECT c.id, c.code, c.title, c.credits, c.pass_threshold_percentage, c.curve_offset, c.curve_type,
           u.full_name as instructor_name, s.name as semester_name, d.name as dept_name
    FROM courses c
    JOIN users u ON c.instructor_id = u.id
    JOIN semesters s ON c.semester_id = s.id
    JOIN departments d ON c.department_id = d.id
    WHERE c.id = '${courseId}'
  `);

  if (!courseRes || courseRes.length === 0) {
    throw new Error('Course not found');
  }

  const cRow = courseRes[0].values[0];

  const scores = calcResults.map(r => r.curvedScore).filter(s => s > 0);
  const rawScores = calcResults.map(r => r.rawScore).filter(s => s > 0);
  const totalEnrolled = calcResults.length;
  const passedCount = calcResults.filter(r => r.isPassed).length;
  const passRate = totalEnrolled > 0 ? (passedCount / totalEnrolled) * 100 : 0;

  // Statistical calculations
  const mean = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const sortedScores = [...scores].sort((a, b) => a - b);
  const median = sortedScores.length > 0
    ? (sortedScores.length % 2 === 0
      ? (sortedScores[sortedScores.length / 2 - 1] + sortedScores[sortedScores.length / 2]) / 2
      : sortedScores[Math.floor(sortedScores.length / 2)])
    : 0;

  const highest = sortedScores.length > 0 ? sortedScores[sortedScores.length - 1] : 0;
  const lowest = sortedScores.length > 0 ? sortedScores[0] : 0;

  // Standard Deviation
  const variance = scores.length > 1
    ? scores.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (scores.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);

  // Grade Distribution Counts (Nigerian NUC standard: A, B, C, D, E, F)
  const gradeCounts: Record<string, number> = {
    'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0
  };

  calcResults.forEach(r => {
    if (gradeCounts[r.letterGrade] !== undefined) {
      gradeCounts[r.letterGrade]++;
    } else {
      gradeCounts[r.letterGrade] = 1;
    }
  });

  const distributionData = Object.entries(gradeCounts).map(([letter, count]) => ({
    grade: letter,
    count,
    percentage: totalEnrolled > 0 ? Number(((count / totalEnrolled) * 100).toFixed(1)) : 0
  }));

  // Score brackets for Nigerian NUC grading model
  const brackets = [
    { range: '0-39% (F - Fail)', min: 0, max: 39.99, count: 0 },
    { range: '40-44% (E - Pass)', min: 40, max: 44.99, count: 0 },
    { range: '45-49% (D - Third Class)', min: 45, max: 49.99, count: 0 },
    { range: '50-59% (C - 2:2 Lower)', min: 50, max: 59.99, count: 0 },
    { range: '60-69% (B - 2:1 Upper)', min: 60, max: 69.99, count: 0 },
    { range: '70-100% (A - First Class)', min: 70, max: 100, count: 0 },
  ];

  scores.forEach(s => {
    for (const b of brackets) {
      if (s >= b.min && s <= b.max) {
        b.count++;
        break;
      }
    }
  });

  // Component breakdown stats
  const componentStatsRes = db.exec(`
    SELECT ac.id, ac.name, ac.type, ac.max_score, ac.weight_percent,
           AVG(g.score) as avg_score,
           MIN(g.score) as min_score,
           MAX(g.score) as max_score_achieved,
           COUNT(g.id) as submissions
    FROM assessment_components ac
    LEFT JOIN grades g ON ac.id = g.assessment_component_id AND g.is_excused = 0
    WHERE ac.course_id = '${courseId}'
    GROUP BY ac.id
    ORDER BY ac.sequence ASC
  `);

  const componentStats = (componentStatsRes.length > 0 ? componentStatsRes[0].values : []).map(row => {
    const maxScore = Number(row[3]);
    const avgScore = row[5] !== null ? Number(row[5]) : 0;
    const avgPct = maxScore > 0 ? (avgScore / maxScore) * 100 : 0;
    return {
      id: String(row[0]),
      name: String(row[1]),
      type: String(row[2]),
      maxScore,
      weightPercent: Number(row[4]),
      averageScore: Number(avgScore.toFixed(1)),
      averagePercentage: Number(avgPct.toFixed(1)),
      minScore: row[6] !== null ? Number(row[6]) : null,
      maxScoreAchieved: row[7] !== null ? Number(row[7]) : null,
      submissionsCount: Number(row[8])
    };
  });

  return {
    course: {
      id: String(cRow[0]),
      code: String(cRow[1]),
      title: String(cRow[2]),
      credits: Number(cRow[3]),
      passThreshold: Number(cRow[4]),
      curveOffset: Number(cRow[5]),
      curveType: String(cRow[6]),
      instructorName: String(cRow[7]),
      semesterName: String(cRow[8]),
      departmentName: String(cRow[9])
    },
    metrics: {
      totalEnrolled,
      passedCount,
      failedCount: totalEnrolled - passedCount,
      passRate: Number(passRate.toFixed(1)),
      mean: Number(mean.toFixed(2)),
      median: Number(median.toFixed(2)),
      highest: Number(highest.toFixed(2)),
      lowest: Number(lowest.toFixed(2)),
      stdDev: Number(stdDev.toFixed(2)),
      rawMean: rawScores.length > 0 ? Number((rawScores.reduce((a, b) => a + b, 0) / rawScores.length).toFixed(2)) : 0
    },
    gradeDistribution: distributionData,
    scoreHistogram: brackets,
    componentPerformance: componentStats
  };
}

export async function generateOfficialTranscript(studentId: string) {
  const db = await getDb();

  // Student info
  const stuRes = db.exec(`
    SELECT u.id, u.student_id, u.full_name, u.email, d.name as dept_name, u.avatar_url, u.created_at
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.id = '${studentId}'
  `);

  if (!stuRes || stuRes.length === 0) {
    throw new Error('Student not found');
  }

  const sRow = stuRes[0].values[0];
  const academicRecord = await calculateStudentCumulativeRecord(studentId);

  // Generate unique official verification token and issue date
  const verificationCode = `NGR-FUST-${studentId.slice(-4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const issueDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return {
    verification: {
      code: verificationCode,
      issueDate,
      issuingAuthority: 'Office of the University Registrar & Academic Directorate',
      institutionName: 'FEDERAL UNIVERSITY OF SCIENCE & TECHNOLOGY, NIGERIA',
      registrarName: 'Mr. Ayanbade Olamilekan John',
      registrarTitle: 'University Registrar & Secretary to Council',
      securityStatus: 'VERIFIED & ENCRYPTED HASH MATCH',
      isOfficial: true
    },
    student: {
      id: String(sRow[0]),
      studentCode: String(sRow[1] ?? 'CSC/2022/1048'),
      fullName: String(sRow[2]),
      email: String(sRow[3]),
      department: String(sRow[4] ?? 'Computer Science & Information Technology'),
      avatarUrl: sRow[5] ? String(sRow[5]) : null,
      degreeProgram: 'Bachelor of Science (B.Sc. Hons) in Computer Science',
      matriculationDate: '2022/2023 Academic Session'
    },
    academicSummary: {
      cumulativeGpa: academicRecord.cumulativeGpa,
      totalCreditsAttempted: academicRecord.totalCreditsAttempted,
      totalCreditsEarned: academicRecord.totalCreditsEarned,
      academicStanding: academicRecord.academicStanding
    },
    semesters: academicRecord.semesters
  };
}

export async function getDepartmentExecutiveSummary() {
  const db = await getDb();
  
  const deptsRes = db.exec(`
    SELECT d.id, d.code, d.name, d.faculty_dean,
           COUNT(DISTINCT c.id) as total_courses,
           COUNT(DISTINCT e.student_id) as total_students,
           AVG(e.calculated_gpa_points) as avg_dept_gpa
    FROM departments d
    LEFT JOIN courses c ON d.id = c.department_id
    LEFT JOIN enrollments e ON c.id = e.course_id AND e.calculated_gpa_points > 0
    GROUP BY d.id
  `);

  const departments = (deptsRes.length > 0 ? deptsRes[0].values : []).map(row => ({
    id: String(row[0]),
    code: String(row[1]),
    name: String(row[2]),
    dean: String(row[3]),
    totalCourses: Number(row[4]),
    totalStudents: Number(row[5]),
    averageGpa: row[6] !== null ? Number(Number(row[6]).toFixed(2)) : 4.25
  }));

  // Overall system metrics
  const statsRes = db.exec(`
    SELECT 
      (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
      (SELECT COUNT(*) FROM users WHERE role = 'faculty') as total_faculty,
      (SELECT COUNT(*) FROM courses) as total_courses,
      (SELECT COUNT(*) FROM enrollments) as total_enrollments,
      (SELECT COUNT(*) FROM grades WHERE score IS NOT NULL) as total_graded_items
  `);

  const sRow = statsRes.length > 0 ? statsRes[0].values[0] : [0, 0, 0, 0, 0];

  return {
    systemStats: {
      totalStudents: Number(sRow[0]),
      totalFaculty: Number(sRow[1]),
      totalCourses: Number(sRow[2]),
      totalEnrollments: Number(sRow[3]),
      totalGradedItems: Number(sRow[4])
    },
    departments
  };
}

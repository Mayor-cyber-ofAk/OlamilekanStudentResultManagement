import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb, saveDb } from './server/db.ts';
import { calculateCourseGrades, calculateStudentCumulativeRecord, recalculateAllCourses } from './server/services/gradingEngine.ts';
import { getCourseAnalytics, generateOfficialTranscript, getDepartmentExecutiveSummary } from './server/services/reportingService.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize DB on boot
  await getDb();
  // Perform initial automated calculation
  await recalculateAllCourses();

  // Active user simulation session (default: Dr. Sarah Chen - Faculty)
  let activeUserId = 'user-fac-1';

  // Audit logging helper
  const logAudit = async (userId: string, action: string, entityType: string, entityId: string, details: string) => {
    const db = await getDb();
    const uRes = db.exec(`SELECT full_name FROM users WHERE id = '${userId}'`);
    const userName = (uRes.length > 0 && uRes[0].values.length > 0) ? String(uRes[0].values[0][0]) : 'System';
    const logId = `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    db.run(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details)
      VALUES ('${logId}', '${userId}', '${userName.replace(/'/g, "''")}', '${action}', '${entityType}', '${entityId}', '${details.replace(/'/g, "''")}')
    `);
    saveDb();
  };

  // ----------------------------------------------------
  // AUTH & USER ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/auth/current-user', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const resData = db.exec(`
        SELECT u.id, u.username, u.role, u.full_name, u.email, u.department_id, u.student_id, u.faculty_id, u.avatar_url, d.name as dept_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = '${activeUserId}'
      `);

      if (!resData || resData.length === 0 || resData[0].values.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const row = resData[0].values[0];
      res.json({
        user: {
          id: String(row[0]),
          username: String(row[1]),
          role: String(row[2]),
          fullName: String(row[3]),
          email: String(row[4]),
          departmentId: row[5] ? String(row[5]) : null,
          studentId: row[6] ? String(row[6]) : null,
          facultyId: row[7] ? String(row[7]) : null,
          avatarUrl: row[8] ? String(row[8]) : null,
          departmentName: row[9] ? String(row[9]) : 'General'
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/auth/switch-user', async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const db = await getDb();
      const check = db.exec(`SELECT id, full_name, role FROM users WHERE id = '${userId}'`);
      if (!check || check.length === 0 || check[0].values.length === 0) {
        return res.status(404).json({ error: 'User does not exist' });
      }

      activeUserId = userId;
      const u = check[0].values[0];
      await logAudit(activeUserId, 'AUTH_ROLE_SWITCH', 'USER', userId, `Session switched to ${u[1]} (${u[2]})`);

      res.json({ success: true, activeUserId, user: { id: u[0], fullName: u[1], role: u[2] } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/auth/users', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const result = db.exec(`
        SELECT u.id, u.username, u.role, u.full_name, u.email, u.student_id, u.faculty_id, u.avatar_url, d.name as dept_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        ORDER BY u.role ASC, u.full_name ASC
      `);

      const users = (result.length > 0 ? result[0].values : []).map(row => ({
        id: String(row[0]),
        username: String(row[1]),
        role: String(row[2]),
        fullName: String(row[3]),
        email: String(row[4]),
        studentId: row[5] ? String(row[5]) : null,
        facultyId: row[6] ? String(row[6]) : null,
        avatarUrl: row[7] ? String(row[7]) : null,
        departmentName: row[8] ? String(row[8]) : null
      }));

      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // COURSES ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/courses', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const { instructorId, studentId, semesterId } = req.query;

      let sql = `
        SELECT c.id, c.code, c.title, c.credits, c.max_enrollment, c.status, c.pass_threshold_percentage, c.curve_offset, c.curve_type, c.description,
               d.name as dept_name, d.code as dept_code,
               s.name as semester_name, s.code as sem_code, s.is_current,
               u.full_name as instructor_name, u.email as instructor_email, u.avatar_url as instructor_avatar,
               (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as enrolled_count,
               (SELECT AVG(e.calculated_curved_score) FROM enrollments e WHERE e.course_id = c.id) as class_average,
               gs.name as scale_name
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        JOIN semesters s ON c.semester_id = s.id
        JOIN users u ON c.instructor_id = u.id
        JOIN grading_scales gs ON c.grading_scale_id = gs.id
        WHERE 1=1
      `;

      if (instructorId) {
        sql += ` AND c.instructor_id = '${instructorId}'`;
      }
      if (semesterId) {
        sql += ` AND c.semester_id = '${semesterId}'`;
      }

      sql += ` ORDER BY s.start_date DESC, c.code ASC`;

      const result = db.exec(sql);
      const courses = (result.length > 0 ? result[0].values : []).map(row => ({
        id: String(row[0]),
        code: String(row[1]),
        title: String(row[2]),
        credits: Number(row[3]),
        maxEnrollment: Number(row[4]),
        status: String(row[5]),
        passThreshold: Number(row[6]),
        curveOffset: Number(row[7]),
        curveType: String(row[8]),
        description: String(row[9] ?? ''),
        departmentName: String(row[10]),
        departmentCode: String(row[11]),
        semesterName: String(row[12]),
        semesterCode: String(row[13]),
        isCurrentSemester: Number(row[14]) === 1,
        instructorName: String(row[15]),
        instructorEmail: String(row[16]),
        instructorAvatar: row[17] ? String(row[17]) : null,
        enrolledCount: Number(row[18]),
        classAverage: row[19] !== null ? Number(Number(row[19]).toFixed(1)) : 0,
        gradingScaleName: String(row[20])
      }));

      // If studentId provided, also attach student's personal grade in that course
      if (studentId) {
        const studentEnrollments = db.exec(`
          SELECT course_id, calculated_raw_score, calculated_curved_score, calculated_letter_grade, calculated_gpa_points, is_published, status
          FROM enrollments
          WHERE student_id = '${studentId}'
        `);

        const stuMap = new Map<string, any>();
        if (studentEnrollments.length > 0) {
          studentEnrollments[0].values.forEach(r => {
            stuMap.set(String(r[0]), {
              rawScore: Number(r[1]),
              curvedScore: Number(r[2]),
              letterGrade: String(r[3]),
              gpaPoints: Number(r[4]),
              isPublished: Number(r[5]) === 1,
              enrollmentStatus: String(r[6])
            });
          });
        }

        const enriched = courses.map(c => ({
          ...c,
          studentGrade: stuMap.get(c.id) || null
        }));

        return res.json({ courses: enriched });
      }

      res.json({ courses });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/courses/:id', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const courseId = req.params.id;

      const courseRes = db.exec(`
        SELECT c.id, c.code, c.title, c.credits, c.max_enrollment, c.status, c.pass_threshold_percentage, c.curve_offset, c.curve_type, c.description,
               d.name as dept_name, d.code as dept_code, d.id as dept_id,
               s.name as semester_name, s.code as sem_code, s.id as sem_id,
               u.id as instructor_id, u.full_name as instructor_name, u.email as instructor_email,
               gs.id as scale_id, gs.name as scale_name, gs.scale_json
        FROM courses c
        JOIN departments d ON c.department_id = d.id
        JOIN semesters s ON c.semester_id = s.id
        JOIN users u ON c.instructor_id = u.id
        JOIN grading_scales gs ON c.grading_scale_id = gs.id
        WHERE c.id = '${courseId}'
      `);

      if (!courseRes || courseRes.length === 0 || courseRes[0].values.length === 0) {
        return res.status(404).json({ error: 'Course not found' });
      }

      const row = courseRes[0].values[0];

      // Fetch components
      const compRes = db.exec(`
        SELECT id, name, type, max_score, weight_percent, due_date, sequence
        FROM assessment_components
        WHERE course_id = '${courseId}'
        ORDER BY sequence ASC
      `);

      const components = (compRes.length > 0 ? compRes[0].values : []).map(r => ({
        id: String(r[0]),
        name: String(r[1]),
        type: String(r[2]),
        maxScore: Number(r[3]),
        weightPercent: Number(r[4]),
        dueDate: r[5] ? String(r[5]) : null,
        sequence: Number(r[6])
      }));

      const totalWeight = components.reduce((acc, c) => acc + c.weightPercent, 0);

      res.json({
        course: {
          id: String(row[0]),
          code: String(row[1]),
          title: String(row[2]),
          credits: Number(row[3]),
          maxEnrollment: Number(row[4]),
          status: String(row[5]),
          passThreshold: Number(row[6]),
          curveOffset: Number(row[7]),
          curveType: String(row[8]),
          description: String(row[9] ?? ''),
          department: { id: String(row[12]), name: String(row[10]), code: String(row[11]) },
          semester: { id: String(row[15]), name: String(row[13]), code: String(row[14]) },
          instructor: { id: String(row[16]), name: String(row[17]), email: String(row[18]) },
          gradingScale: { id: String(row[19]), name: String(row[20]), tiers: JSON.parse(String(row[21])) },
          components,
          totalWeight: Number(totalWeight.toFixed(2)),
          isWeightValid: Math.abs(totalWeight - 100) < 0.01
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // GRADEBOOK MATRIX & CALCULATION ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/courses/:id/gradebook', async (req: Request, res: Response) => {
    try {
      const courseId = req.params.id;
      const db = await getDb();

      // Ensure fresh calculation
      await calculateCourseGrades(courseId);

      // Components
      const compRes = db.exec(`
        SELECT id, name, type, max_score, weight_percent, sequence
        FROM assessment_components
        WHERE course_id = '${courseId}'
        ORDER BY sequence ASC
      `);

      const components = (compRes.length > 0 ? compRes[0].values : []).map(r => ({
        id: String(r[0]),
        name: String(r[1]),
        type: String(r[2]),
        maxScore: Number(r[3]),
        weightPercent: Number(r[4]),
        sequence: Number(r[5])
      }));

      // Enrollments
      const enrRes = db.exec(`
        SELECT e.id, e.student_id, e.status, e.calculated_raw_score, e.calculated_curved_score, e.calculated_letter_grade, e.calculated_gpa_points, e.is_published, e.notes,
               u.full_name, u.student_id as student_code, u.email, u.avatar_url
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.course_id = '${courseId}'
        ORDER BY u.full_name ASC
      `);

      const studentRows = [];
      const enrollmentRows = enrRes.length > 0 ? enrRes[0].values : [];

      // Grades map
      const gradesRes = db.exec(`
        SELECT g.id, g.enrollment_id, g.assessment_component_id, g.score, g.is_excused, g.feedback
        FROM grades g
        JOIN enrollments e ON g.enrollment_id = e.id
        WHERE e.course_id = '${courseId}'
      `);

      const gradesLookup = new Map<string, any>();
      if (gradesRes.length > 0) {
        gradesRes[0].values.forEach(r => {
          gradesLookup.set(`${r[1]}_${r[2]}`, {
            id: String(r[0]),
            score: r[3] !== null ? Number(r[3]) : null,
            isExcused: Number(r[4]) === 1,
            feedback: String(r[5] ?? '')
          });
        });
      }

      for (const enr of enrollmentRows) {
        const enrId = String(enr[0]);
        const compScores: Record<string, any> = {};

        components.forEach(c => {
          const g = gradesLookup.get(`${enrId}_${c.id}`);
          compScores[c.id] = {
            gradeId: g ? g.id : null,
            score: g ? g.score : null,
            isExcused: g ? g.isExcused : false,
            feedback: g ? g.feedback : '',
            maxScore: c.maxScore,
            percentage: (g && g.score !== null) ? Number(((g.score / c.maxScore) * 100).toFixed(1)) : null
          };
        });

        studentRows.push({
          enrollmentId: enrId,
          studentId: String(enr[1]),
          status: String(enr[2]),
          rawScore: Number(enr[3]),
          curvedScore: Number(enr[4]),
          letterGrade: String(enr[5]),
          gpaPoints: Number(enr[6]),
          isPublished: Number(enr[7]) === 1,
          notes: String(enr[8] ?? ''),
          studentName: String(enr[9]),
          studentCode: String(enr[10] ?? 'STU-000'),
          studentEmail: String(enr[11]),
          studentAvatar: enr[12] ? String(enr[12]) : null,
          grades: compScores
        });
      }

      res.json({
        courseId,
        components,
        students: studentRows
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Batch Update Grades with Validation
  app.post('/api/courses/:id/batch-grade', async (req: Request, res: Response) => {
    try {
      const courseId = req.params.id;
      const { updates } = req.body; // array of { enrollmentId, componentId, score, isExcused, feedback }
      const db = await getDb();

      if (!Array.isArray(updates)) {
        return res.status(400).json({ error: 'Updates must be an array' });
      }

      // Validate scores against component max_score
      const compRes = db.exec(`SELECT id, max_score, name FROM assessment_components WHERE course_id = '${courseId}'`);
      const compMap = new Map<string, { maxScore: number; name: string }>();
      if (compRes.length > 0) {
        compRes[0].values.forEach(r => compMap.set(String(r[0]), { maxScore: Number(r[1]), name: String(r[2]) }));
      }

      for (const item of updates) {
        const comp = compMap.get(item.componentId);
        if (!comp) {
          return res.status(400).json({ error: `Invalid assessment component ID: ${item.componentId}` });
        }
        if (item.score !== null && item.score !== undefined && item.score !== '') {
          const numScore = Number(item.score);
          if (isNaN(numScore) || numScore < 0 || numScore > (comp.maxScore * 1.5)) { // allow reasonable extra credit up to 150%
            return res.status(400).json({ error: `Score for ${comp.name} must be between 0 and ${comp.maxScore}` });
          }
        }
      }

      // Execute upserts in SQLite
      for (const item of updates) {
        const scoreVal = (item.score !== null && item.score !== undefined && item.score !== '') ? Number(item.score) : 'NULL';
        const isExcused = item.isExcused ? 1 : 0;
        const feedback = (item.feedback ?? '').replace(/'/g, "''");
        const gradeId = `grd-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        // Check if grade already exists
        const existing = db.exec(`
          SELECT id FROM grades
          WHERE enrollment_id = '${item.enrollmentId}' AND assessment_component_id = '${item.componentId}'
        `);

        if (existing.length > 0 && existing[0].values.length > 0) {
          db.run(`
            UPDATE grades
            SET score = ${scoreVal},
                is_excused = ${isExcused},
                feedback = '${feedback}',
                graded_by_id = '${activeUserId}',
                graded_at = CURRENT_TIMESTAMP
            WHERE enrollment_id = '${item.enrollmentId}' AND assessment_component_id = '${item.componentId}'
          `);
        } else {
          db.run(`
            INSERT INTO grades (id, enrollment_id, assessment_component_id, score, is_excused, feedback, graded_by_id)
            VALUES ('${gradeId}', '${item.enrollmentId}', '${item.componentId}', ${scoreVal}, ${isExcused}, '${feedback}', '${activeUserId}')
          `);
        }
      }

      saveDb();

      // Trigger automatic recalculation of final weighted grades & GPA points
      const calcResults = await calculateCourseGrades(courseId);
      await logAudit(activeUserId, 'BATCH_GRADE_UPDATED', 'COURSE', courseId, `Saved & recalculated grades for ${updates.length} score entries.`);

      res.json({
        success: true,
        updatedCount: updates.length,
        calculationResults: calcResults
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Apply Curve & Recalculate
  app.post('/api/courses/:id/curve', async (req: Request, res: Response) => {
    try {
      const courseId = req.params.id;
      const { curveOffset, curveType } = req.body;
      const db = await getDb();

      const offsetNum = Number(curveOffset ?? 0);
      const cType = String(curveType ?? 'none');

      db.run(`
        UPDATE courses
        SET curve_offset = ${offsetNum},
            curve_type = '${cType}'
        WHERE id = '${courseId}'
      `);
      saveDb();

      const results = await calculateCourseGrades(courseId);
      await logAudit(activeUserId, 'CURVE_CONFIGURED', 'COURSE', courseId, `Applied curve model [${cType}] with offset ${offsetNum}% to ${results.length} students.`);

      res.json({ success: true, curveOffset: offsetNum, curveType: cType, results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Component Management
  app.post('/api/courses/:id/components', async (req: Request, res: Response) => {
    try {
      const courseId = req.params.id;
      const { name, type, maxScore, weightPercent, dueDate } = req.body;
      const db = await getDb();

      if (!name || !maxScore || !weightPercent) {
        return res.status(400).json({ error: 'Name, max score, and weight percentage are required.' });
      }

      const compId = `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      db.run(`
        INSERT INTO assessment_components (id, course_id, name, type, max_score, weight_percent, due_date, sequence)
        VALUES ('${compId}', '${courseId}', '${name.replace(/'/g, "''")}', '${type || 'assignment'}', ${Number(maxScore)}, ${Number(weightPercent)}, ${dueDate ? `'${dueDate}'` : 'NULL'}, 10)
      `);
      saveDb();

      await calculateCourseGrades(courseId);
      await logAudit(activeUserId, 'COMPONENT_CREATED', 'COURSE', courseId, `Added assessment component: ${name} (${weightPercent}% weight).`);

      res.json({ success: true, componentId: compId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/courses/:courseId/components/:compId', async (req: Request, res: Response) => {
    try {
      const { courseId, compId } = req.params;
      const db = await getDb();

      db.run(`DELETE FROM assessment_components WHERE id = '${compId}' AND course_id = '${courseId}'`);
      saveDb();

      await calculateCourseGrades(courseId);
      await logAudit(activeUserId, 'COMPONENT_DELETED', 'COURSE', courseId, `Deleted assessment component ${compId}`);

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Publish Grades
  app.post('/api/courses/:id/publish', async (req: Request, res: Response) => {
    try {
      const courseId = req.params.id;
      const db = await getDb();

      db.run(`
        UPDATE enrollments
        SET is_published = 1
        WHERE course_id = '${courseId}'
      `);
      db.run(`
        UPDATE courses
        SET status = 'published'
        WHERE id = '${courseId}'
      `);
      saveDb();

      await calculateCourseGrades(courseId);
      await logAudit(activeUserId, 'GRADES_OFFICIALLY_PUBLISHED', 'COURSE', courseId, 'Final letter grades published to student academic records.');

      res.json({ success: true, message: 'All student grades published successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // ANALYTICS & REPORTING ENDPOINTS
  // ----------------------------------------------------
  app.get('/api/courses/:id/analytics', async (req: Request, res: Response) => {
    try {
      const courseId = req.params.id;
      const analytics = await getCourseAnalytics(courseId);
      res.json(analytics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/reports/dashboard', async (req: Request, res: Response) => {
    try {
      const summary = await getDepartmentExecutiveSummary();
      const db = await getDb();

      // Recent audit logs
      const logsRes = db.exec(`
        SELECT id, user_name, action, entity_type, entity_id, details, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 10
      `);

      const recentLogs = (logsRes.length > 0 ? logsRes[0].values : []).map(r => ({
        id: String(r[0]),
        userName: String(r[1]),
        action: String(r[2]),
        entityType: String(r[3]),
        entityId: String(r[4]),
        details: String(r[5]),
        createdAt: String(r[6])
      }));

      res.json({
        ...summary,
        recentLogs
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // At-Risk Students Report
  app.get('/api/reports/at-risk', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const studentsRes = db.exec(`SELECT id FROM users WHERE role = 'student'`);
      const studentIds = (studentsRes.length > 0 ? studentsRes[0].values : []).map(r => String(r[0]));

      const atRiskList = [];

      for (const sId of studentIds) {
        const record = await calculateStudentCumulativeRecord(sId);
        const stuInfoRes = db.exec(`
          SELECT u.full_name, u.student_id, u.email, d.name as dept_name, u.avatar_url
          FROM users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.id = '${sId}'
        `);
        const sInfo = stuInfoRes[0].values[0];

        // Check if GPA < 2.5 or has failing grade
        const hasFailingGrade = record.semesters.some(sem => sem.courses.some(c => c.letterGrade === 'F' || c.curvedScore < 60));
        const isLowGpa = record.cumulativeGpa < 2.5 && record.cumulativeGpa > 0;

        if (hasFailingGrade || isLowGpa || record.academicStanding.includes('Warning') || record.academicStanding.includes('Probation')) {
          atRiskList.push({
            studentId: sId,
            fullName: String(sInfo[0]),
            studentCode: String(sInfo[1] ?? 'N/A'),
            email: String(sInfo[2]),
            departmentName: String(sInfo[3] ?? 'General'),
            avatarUrl: sInfo[4] ? String(sInfo[4]) : null,
            cumulativeGpa: record.cumulativeGpa,
            standing: record.academicStanding,
            reasons: [
              ...(isLowGpa ? [`Low CGPA (${record.cumulativeGpa})`] : []),
              ...(hasFailingGrade ? ['Has failing course assessment or final grade'] : []),
              ...(record.academicStanding.includes('Probation') ? ['On Academic Probation'] : [])
            ]
          });
        }
      }

      res.json({ atRiskStudents: atRiskList });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Student Transcript Generation
  app.get('/api/students/:id/transcript', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const transcript = await generateOfficialTranscript(studentId);
      await logAudit(activeUserId, 'TRANSCRIPT_GENERATED', 'STUDENT', studentId, `Generated official transcript with code ${transcript.verification.code}`);
      res.json(transcript);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // What-if GPA simulation for students
  app.post('/api/students/:id/what-if-gpa', async (req: Request, res: Response) => {
    try {
      const studentId = req.params.id;
      const { hypotheticalCourses } = req.body; // array of { credits, projectedGpaPoints }
      const currentRecord = await calculateStudentCumulativeRecord(studentId);

      let totalPoints = currentRecord.cumulativeGpa * currentRecord.totalCreditsAttempted;
      let totalCredits = currentRecord.totalCreditsAttempted;

      if (Array.isArray(hypotheticalCourses)) {
        hypotheticalCourses.forEach(hc => {
          const cred = Number(hc.credits);
          const pts = Number(hc.projectedGpaPoints);
          totalCredits += cred;
          totalPoints += cred * pts;
        });
      }

      const projectedGpa = totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0;

      res.json({
        currentGpa: currentRecord.cumulativeGpa,
        currentCredits: currentRecord.totalCreditsAttempted,
        projectedGpa,
        projectedCredits: totalCredits,
        delta: Number((projectedGpa - currentRecord.cumulativeGpa).toFixed(2))
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Grading Scales
  app.get('/api/grading-scales', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const resData = db.exec(`SELECT id, name, is_default, scale_json FROM grading_scales ORDER BY is_default DESC, name ASC`);
      const scales = (resData.length > 0 ? resData[0].values : []).map(r => ({
        id: String(r[0]),
        name: String(r[1]),
        isDefault: Number(r[2]) === 1,
        tiers: JSON.parse(String(r[3]))
      }));
      res.json({ scales });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Audit Trail
  app.get('/api/audit-logs', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const resData = db.exec(`
        SELECT id, user_id, user_name, action, entity_type, entity_id, details, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const logs = (resData.length > 0 ? resData[0].values : []).map(r => ({
        id: String(r[0]),
        userId: String(r[1]),
        userName: String(r[2]),
        action: String(r[3]),
        entityType: String(r[4]),
        entityId: String(r[5]),
        details: String(r[6]),
        createdAt: String(r[7])
      }));

      res.json({ logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SQL Console / Data Explorer endpoint for transparency
  app.post('/api/sql/query', async (req: Request, res: Response) => {
    try {
      const { sql } = req.body;
      if (!sql || typeof sql !== 'string') {
        return res.status(400).json({ error: 'SQL query string required' });
      }

      // Security check: disallow drop table for demo safety
      if (/DROP\s+TABLE/i.test(sql)) {
        return res.status(403).json({ error: 'DROP TABLE is restricted in demo mode.' });
      }

      const db = await getDb();
      const isSelect = /^\s*(SELECT|PRAGMA|EXPLAIN)/i.test(sql);

      if (isSelect) {
        const result = db.exec(sql);
        if (result.length === 0) {
          return res.json({ columns: [], rows: [], rowCount: 0 });
        }
        const columns = result[0].columns;
        const rows = result[0].values.map(valArr => {
          const rowObj: Record<string, any> = {};
          columns.forEach((col, idx) => {
            rowObj[col] = valArr[idx];
          });
          return rowObj;
        });
        return res.json({ columns, rows, rowCount: rows.length });
      } else {
        db.run(sql);
        saveDb();
        return res.json({ success: true, message: 'Query executed successfully.' });
      }
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ----------------------------------------------------
  // VITE DEV / PRODUCTION MIDDLEWARE
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Automated Grading & Academic Records Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal Server Boot Error:', err);
  process.exit(1);
});

import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: Database | null = null;
const DB_FILE_PATH = path.join(process.cwd(), 'data', 'academic.sqlite');

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dataDir = path.dirname(DB_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      
      // Update all avatars to ensure authentic Nigerian portraits are applied
      dbInstance.run("UPDATE users SET avatar_url = '/src/assets/images/ayanbade_profile_1787865328106.jpg' WHERE id = 'user-admin-1'");
      dbInstance.run("UPDATE users SET avatar_url = '/src/assets/images/adebayo_avatar_1787866150744.jpg' WHERE id = 'user-fac-1'");
      dbInstance.run("UPDATE users SET avatar_url = '/src/assets/images/okafor_avatar_1787866164431.jpg' WHERE id = 'user-fac-2'");
      dbInstance.run("UPDATE users SET avatar_url = '/src/assets/images/alabi_avatar_1787866177475.jpg' WHERE id = 'user-fac-3'");
      dbInstance.run("UPDATE users SET avatar_url = '/src/assets/images/okonkwo_avatar_1787866193769.jpg' WHERE id = 'user-stu-1'");
      dbInstance.run("UPDATE users SET avatar_url = '/src/assets/images/adeleke_avatar_1787866207171.jpg' WHERE id = 'user-stu-2'");
      dbInstance.run("UPDATE users SET avatar_url = '/src/assets/images/bakare_avatar_1787866219653.jpg' WHERE id = 'user-stu-3'");
      dbInstance.run("UPDATE users SET avatar_url = '/src/assets/images/nnamdi_avatar_1787866233541.jpg' WHERE id = 'user-stu-4'");
      dbInstance.run("UPDATE users SET avatar_url = '/src/assets/images/usman_avatar_1787866246615.jpg' WHERE id = 'user-stu-5'");
      saveDb();

      // Check if admin is Mr. Ayanbade Olamilekan John; if not, re-seed
      const checkRes = dbInstance.exec("SELECT full_name FROM users WHERE id = 'user-admin-1'");
      if (!checkRes || checkRes.length === 0 || !checkRes[0].values[0] || checkRes[0].values[0][0] !== 'Mr. Ayanbade Olamilekan John') {
        dbInstance = new SQL.Database();
        initSchemaAndSeed(dbInstance);
        saveDb();
      }
    } catch (e) {
      dbInstance = new SQL.Database();
      initSchemaAndSeed(dbInstance);
      saveDb();
    }
  } else {
    dbInstance = new SQL.Database();
    initSchemaAndSeed(dbInstance);
    saveDb();
  }

  return dbInstance;
}

export function saveDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const dataDir = path.dirname(DB_FILE_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error('Error saving SQLite database:', err);
  }
}

export function resetDatabase() {
  if (!dbInstance) return;
  dbInstance.run(`
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS grades;
    DROP TABLE IF EXISTS enrollments;
    DROP TABLE IF EXISTS assessment_components;
    DROP TABLE IF EXISTS courses;
    DROP TABLE IF EXISTS grading_scales;
    DROP TABLE IF EXISTS semesters;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS departments;
  `);
  initSchemaAndSeed(dbInstance);
  saveDb();
}

function initSchemaAndSeed(db: Database) {
  // Create relational tables
  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      faculty_dean TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student')),
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      department_id TEXT,
      student_id TEXT,
      faculty_id TEXT,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS semesters (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_current INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS grading_scales (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      scale_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      department_id TEXT NOT NULL,
      credits INTEGER NOT NULL,
      semester_id TEXT NOT NULL,
      instructor_id TEXT NOT NULL,
      grading_scale_id TEXT NOT NULL,
      max_enrollment INTEGER DEFAULT 40,
      status TEXT DEFAULT 'active' CHECK(status IN ('draft', 'active', 'grading', 'published', 'archived')),
      pass_threshold_percentage REAL DEFAULT 40.0,
      curve_offset REAL DEFAULT 0.0,
      curve_type TEXT DEFAULT 'none',
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (semester_id) REFERENCES semesters(id),
      FOREIGN KEY (instructor_id) REFERENCES users(id),
      FOREIGN KEY (grading_scale_id) REFERENCES grading_scales(id)
    );

    CREATE TABLE IF NOT EXISTS assessment_components (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('assignment', 'quiz', 'midterm', 'final_exam', 'project', 'attendance', 'lab')),
      max_score REAL NOT NULL,
      weight_percent REAL NOT NULL,
      due_date TEXT,
      sequence INTEGER DEFAULT 0,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      semester_id TEXT NOT NULL,
      status TEXT DEFAULT 'enrolled' CHECK(status IN ('enrolled', 'dropped', 'completed')),
      calculated_raw_score REAL DEFAULT 0,
      calculated_curved_score REAL DEFAULT 0,
      calculated_letter_grade TEXT DEFAULT 'N/A',
      calculated_gpa_points REAL DEFAULT 0.0,
      is_published INTEGER DEFAULT 0,
      notes TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(course_id, student_id),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (semester_id) REFERENCES semesters(id)
    );

    CREATE TABLE IF NOT EXISTS grades (
      id TEXT PRIMARY KEY,
      enrollment_id TEXT NOT NULL,
      assessment_component_id TEXT NOT NULL,
      score REAL,
      is_excused INTEGER DEFAULT 0,
      feedback TEXT,
      graded_by_id TEXT,
      graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enrollment_id, assessment_component_id),
      FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
      FOREIGN KEY (assessment_component_id) REFERENCES assessment_components(id) ON DELETE CASCADE,
      FOREIGN KEY (graded_by_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedInitialData(db);
}

function seedInitialData(db: Database) {
  // Nigerian Universities Commission (NUC) Standard 5.0 Grading scale JSON
  const nigerianNucScale = JSON.stringify([
    { min: 70, max: 100, letter: 'A', gpa: 5.0, description: 'First Class / Excellent' },
    { min: 60, max: 69.99, letter: 'B', gpa: 4.0, description: 'Second Class Upper (2:1) / Very Good' },
    { min: 50, max: 59.99, letter: 'C', gpa: 3.0, description: 'Second Class Lower (2:2) / Good' },
    { min: 45, max: 49.99, letter: 'D', gpa: 2.0, description: 'Third Class / Fair' },
    { min: 40, max: 44.99, letter: 'E', gpa: 1.0, description: 'Pass' },
    { min: 0, max: 39.99, letter: 'F', gpa: 0.0, description: 'Fail / Carry Over' },
  ]);

  const standardScale = JSON.stringify([
    { min: 70, max: 100, letter: 'A', gpa: 4.0, description: 'Distinction' },
    { min: 60, max: 69.99, letter: 'B', gpa: 3.0, description: 'Credit' },
    { min: 50, max: 59.99, letter: 'C', gpa: 2.0, description: 'Merit' },
    { min: 45, max: 49.99, letter: 'D', gpa: 1.0, description: 'Pass' },
    { min: 0, max: 44.99, letter: 'F', gpa: 0.0, description: 'Fail' },
  ]);

  // Insert Scales
  db.run(`INSERT INTO grading_scales (id, name, is_default, scale_json) VALUES
    ('scale-nuc-5.0', 'Nigerian NUC Standard 5.0 Scale', 1, '${nigerianNucScale.replace(/'/g, "''")}'),
    ('scale-standard', 'Standard 4.0 Scale', 0, '${standardScale.replace(/'/g, "''")}')
  `);

  // Insert Nigerian University Departments & Deans
  db.run(`INSERT INTO departments (id, code, name, faculty_dean) VALUES
    ('dept-cs', 'CSC', 'Computer Science & Information Technology', 'Prof. Adekunle Olusegun Balogun'),
    ('dept-math', 'MTH', 'Mathematics & Statistics', 'Prof. (Mrs.) Ngozi Blessing Eze'),
    ('dept-se', 'SEN', 'Software Engineering & Data Systems', 'Dr. Ibrahim Musa Danladi')
  `);

  // Insert Semesters (Nigerian University Academic Calendar)
  db.run(`INSERT INTO semesters (id, code, name, academic_year, start_date, end_date, is_current) VALUES
    ('sem-harmattan-2025', '2025/2026-1', 'First Semester 2025/2026 (Harmattan)', '2025/2026', '2025-09-15', '2026-01-20', 0),
    ('sem-rain-2026', '2025/2026-2', 'Second Semester 2025/2026 (Rain)', '2025/2026', '2026-02-01', '2026-06-30', 1)
  `);

  // Insert Users (Admin: Mr. Ayanbade Olamilekan John, Lecturers, Students - all Nigerian names)
  db.run(`INSERT INTO users (id, username, password_hash, role, full_name, email, department_id, student_id, faculty_id, avatar_url) VALUES
    ('user-admin-1', 'ayanbade.admin', 'admin123', 'admin', 'Mr. Ayanbade Olamilekan John', 'o.ayanbade@fust.edu.ng', 'dept-cs', NULL, 'REG-STAFF-001', '/src/assets/images/ayanbade_profile_1787865328106.jpg'),
    ('user-fac-1', 'adebayo.folashade', 'faculty123', 'faculty', 'Dr. (Mrs.) Folashade Adebayo', 'f.adebayo@fust.edu.ng', 'dept-cs', NULL, 'LEC-CSC-042', '/src/assets/images/adebayo_avatar_1787866150744.jpg'),
    ('user-fac-2', 'okafor.chinedu', 'faculty123', 'faculty', 'Prof. Chinedu Chukwuma Okafor', 'c.okafor@fust.edu.ng', 'dept-math', NULL, 'LEC-MTH-018', '/src/assets/images/okafor_avatar_1787866164431.jpg'),
    ('user-fac-3', 'alabi.babatunde', 'faculty123', 'faculty', 'Dr. Babatunde Olawale Alabi', 'b.alabi@fust.edu.ng', 'dept-se', NULL, 'LEC-SEN-025', '/src/assets/images/alabi_avatar_1787866177475.jpg'),
    
    ('user-stu-1', 'okonkwo.chukwuemeka', 'student123', 'student', 'Chukwuemeka Emmanuel Okonkwo', 'c.okonkwo@student.fust.edu.ng', 'dept-cs', 'CSC/2022/1048', NULL, '/src/assets/images/okonkwo_avatar_1787866193769.jpg'),
    ('user-stu-2', 'adeleke.zainab', 'student123', 'student', 'Zainab Folake Adeleke', 'z.adeleke@student.fust.edu.ng', 'dept-cs', 'CSC/2022/1089', NULL, '/src/assets/images/adeleke_avatar_1787866207171.jpg'),
    ('user-stu-3', 'bakare.damilola', 'student123', 'student', 'Oluwaseun Damilola Bakare', 'o.bakare@student.fust.edu.ng', 'dept-se', 'SEN/2022/2014', NULL, '/src/assets/images/bakare_avatar_1787866219653.jpg'),
    ('user-stu-4', 'nnamdi.chioma', 'student123', 'student', 'Chioma Stephanie Nnamdi', 'c.nnamdi@student.fust.edu.ng', 'dept-cs', 'CSC/2022/1155', NULL, '/src/assets/images/nnamdi_avatar_1787866233541.jpg'),
    ('user-stu-5', 'usman.abubakar', 'student123', 'student', 'Abubakar Sadiq Usman', 'a.usman@student.fust.edu.ng', 'dept-math', 'MTH/2022/0832', NULL, '/src/assets/images/usman_avatar_1787866246615.jpg')
  `);

  // Insert Nigerian University Courses
  db.run(`INSERT INTO courses (id, code, title, department_id, credits, semester_id, instructor_id, grading_scale_id, max_enrollment, status, pass_threshold_percentage, curve_offset, description) VALUES
    ('crs-csc301', 'CSC 301', 'Data Structures & Algorithms', 'dept-cs', 3, 'sem-rain-2026', 'user-fac-1', 'scale-nuc-5.0', 45, 'active', 40.0, 0.0, 'In-depth analysis of abstract data types, balanced trees, graph representations, searching and sorting algorithms, complexity analysis and memory optimization.'),
    ('crs-csc411', 'CSC 411', 'Database Design & Management Systems', 'dept-cs', 3, 'sem-rain-2026', 'user-fac-1', 'scale-nuc-5.0', 40, 'active', 40.0, 2.0, 'Relational data model, relational algebra, SQL DDL/DML, normalization up to BCNF, transaction management, indexing, and recovery protocols.'),
    ('crs-mth201', 'MTH 201', 'Linear Algebra & Matrix Analysis', 'dept-math', 3, 'sem-rain-2026', 'user-fac-2', 'scale-nuc-5.0', 50, 'active', 40.0, 0.0, 'Vector spaces, subspaces, linear transformations, matrices, determinants, eigenvalues, eigenvectors, Cayley-Hamilton theorem, and quadratic forms.'),
    ('crs-sen305', 'SEN 305', 'Software Architecture & Cloud Engineering', 'dept-se', 3, 'sem-rain-2026', 'user-fac-3', 'scale-nuc-5.0', 35, 'active', 40.0, 0.0, 'Architectural patterns, microservices, cloud deployment infrastructure, API gateways, automated testing, and CI/CD pipelines in production.'),
    ('crs-csc201-h25', 'CSC 201', 'Object-Oriented Programming & Software Design', 'dept-cs', 3, 'sem-harmattan-2025', 'user-fac-1', 'scale-nuc-5.0', 45, 'published', 40.0, 0.0, 'Principles of object-oriented programming: encapsulation, inheritance, polymorphism, design patterns, UML modeling, and unit testing.')
  `);

  // Insert Continuous Assessment (CA) and Examination Components for CSC 301 (Second Semester / Rain 2026)
  // Continuous Assessment (CA = 40%): CA Test 1 (15%), Lab Practical Project (15%), Quiz & Attendance (10%)
  // Final Semester Examination (Exam = 60%)
  db.run(`INSERT INTO assessment_components (id, course_id, name, type, max_score, weight_percent, due_date, sequence) VALUES
    ('comp-csc301-ca1', 'crs-csc301', 'Continuous Assessment Test 1 (CA-1)', 'assignment', 100, 15.0, '2026-03-15', 1),
    ('comp-csc301-lab', 'crs-csc301', 'Laboratory Practical Project', 'lab', 100, 15.0, '2026-04-10', 2),
    ('comp-csc301-ca2', 'crs-csc301', 'Mid-Semester Test (CA-2)', 'midterm', 100, 10.0, '2026-04-28', 3),
    ('comp-csc301-exam', 'crs-csc301', 'Final Semester Examination', 'final_exam', 100, 60.0, '2026-06-18', 4)
  `);

  // Assessment Components for CSC 411 (Second Semester / Rain 2026)
  // CA: SQL Lab Project (20%), Midterm Test (20%), Exam (60%)
  db.run(`INSERT INTO assessment_components (id, course_id, name, type, max_score, weight_percent, due_date, sequence) VALUES
    ('comp-csc411-lab', 'crs-csc411', 'Database Practical Lab & SQL Project', 'lab', 100, 20.0, '2026-03-25', 1),
    ('comp-csc411-mid', 'crs-csc411', 'Continuous Assessment Midterm', 'midterm', 100, 20.0, '2026-04-22', 2),
    ('comp-csc411-exam', 'crs-csc411', 'Final Semester Examination', 'final_exam', 100, 60.0, '2026-06-15', 3)
  `);

  // Assessment Components for MTH 201 (Second Semester / Rain 2026)
  // CA: Continuous Assessment Test (20%), Tutorial Assignments (20%), Final Exam (60%)
  db.run(`INSERT INTO assessment_components (id, course_id, name, type, max_score, weight_percent, due_date, sequence) VALUES
    ('comp-mth201-ca', 'crs-mth201', 'Continuous Assessment Test', 'midterm', 100, 20.0, '2026-03-20', 1),
    ('comp-mth201-tut', 'crs-mth201', 'Tutorial Problem Sets Portfolio', 'assignment', 100, 20.0, '2026-04-25', 2),
    ('comp-mth201-exam', 'crs-mth201', 'Final Semester Examination', 'final_exam', 100, 60.0, '2026-06-20', 3)
  `);

  // Assessment Components for SEN 305 (Second Semester / Rain 2026)
  db.run(`INSERT INTO assessment_components (id, course_id, name, type, max_score, weight_percent, due_date, sequence) VALUES
    ('comp-sen305-proj', 'crs-sen305', 'Cloud Architecture Capstone Project', 'project', 100, 25.0, '2026-04-15', 1),
    ('comp-sen305-ca', 'crs-sen305', 'Midterm Architecture Assessment', 'midterm', 100, 15.0, '2026-04-30', 2),
    ('comp-sen305-exam', 'crs-sen305', 'Final Semester Examination', 'final_exam', 100, 60.0, '2026-06-22', 3)
  `);

  // Harmattan 2025 Course Components (CSC 201)
  db.run(`INSERT INTO assessment_components (id, course_id, name, type, max_score, weight_percent, due_date, sequence) VALUES
    ('comp-csc201-lab', 'crs-csc201-h25', 'OOP Laboratory Assignments (CA-1)', 'assignment', 100, 20.0, '2025-10-15', 1),
    ('comp-csc201-mid', 'crs-csc201-h25', 'Mid-Semester Theory Test (CA-2)', 'midterm', 100, 20.0, '2025-11-10', 2),
    ('comp-csc201-exam', 'crs-csc201-h25', 'Final Semester Examination', 'final_exam', 100, 60.0, '2025-12-18', 3)
  `);

  // Insert Enrollments
  // Chukwuemeka Okonkwo (user-stu-1) enrolled in CSC 301, CSC 411, MTH 201 (Rain 2026) & CSC 201 (Harmattan 2025)
  db.run(`INSERT INTO enrollments (id, course_id, student_id, semester_id, status, is_published) VALUES
    ('enr-1-csc301', 'crs-csc301', 'user-stu-1', 'sem-rain-2026', 'enrolled', 1),
    ('enr-1-csc411', 'crs-csc411', 'user-stu-1', 'sem-rain-2026', 'enrolled', 1),
    ('enr-1-mth201', 'crs-mth201', 'user-stu-1', 'sem-rain-2026', 'enrolled', 1),
    ('enr-1-csc201', 'crs-csc201-h25', 'user-stu-1', 'sem-harmattan-2025', 'completed', 1),

    ('enr-2-csc301', 'crs-csc301', 'user-stu-2', 'sem-rain-2026', 'enrolled', 1),
    ('enr-2-csc411', 'crs-csc411', 'user-stu-2', 'sem-rain-2026', 'enrolled', 1),
    ('enr-2-csc201', 'crs-csc201-h25', 'user-stu-2', 'sem-harmattan-2025', 'completed', 1),

    ('enr-3-csc301', 'crs-csc301', 'user-stu-3', 'sem-rain-2026', 'enrolled', 1),
    ('enr-3-sen305', 'crs-sen305', 'user-stu-3', 'sem-rain-2026', 'enrolled', 1),
    ('enr-3-csc201', 'crs-csc201-h25', 'user-stu-3', 'sem-harmattan-2025', 'completed', 1),

    ('enr-4-csc301', 'crs-csc301', 'user-stu-4', 'sem-rain-2026', 'enrolled', 1),
    ('enr-4-csc411', 'crs-csc411', 'user-stu-4', 'sem-rain-2026', 'enrolled', 1),

    ('enr-5-mth201', 'crs-mth201', 'user-stu-5', 'sem-rain-2026', 'enrolled', 1),
    ('enr-5-csc301', 'crs-csc301', 'user-stu-5', 'sem-rain-2026', 'enrolled', 1)
  `);

  // Insert Component Grades (with high Nigerian academic integrity and feedback)
  // Chukwuemeka Okonkwo (user-stu-1) in CSC 301
  db.run(`INSERT INTO grades (id, enrollment_id, assessment_component_id, score, is_excused, feedback, graded_by_id) VALUES
    ('grd-1-1', 'enr-1-csc301', 'comp-csc301-ca1', 88, 0, 'Clean AVL tree balance factor implementation and unit tests.', 'user-fac-1'),
    ('grd-1-2', 'enr-1-csc301', 'comp-csc301-lab', 92, 0, 'Excellent Dijkstra shortest path implementation with Priority Queue.', 'user-fac-1'),
    ('grd-1-3', 'enr-1-csc301', 'comp-csc301-ca2', 85, 0, 'Solid understanding of recursive time bounds and recurrence relations.', 'user-fac-1'),
    ('grd-1-4', 'enr-1-csc301', 'comp-csc301-exam', 82, 0, 'Well-formulated DP matrix optimization and theoretical proofs.', 'user-fac-1'),

    -- Chukwuemeka Okonkwo in CSC 411
    ('grd-1-5', 'enr-1-csc411', 'comp-csc411-lab', 90, 0, 'Optimized SQL schema design in 3NF and proper index definitions.', 'user-fac-1'),
    ('grd-1-6', 'enr-1-csc411', 'comp-csc411-mid', 84, 0, 'Strong answers on relational calculus and transaction isolation levels.', 'user-fac-1'),
    ('grd-1-7', 'enr-1-csc411', 'comp-csc411-exam', 78, 0, 'Clear explanations of WAL and ACID compliance.', 'user-fac-1'),

    -- Chukwuemeka Okonkwo in MTH 201
    ('grd-1-8', 'enr-1-mth201', 'comp-mth201-ca', 82, 0, 'Accurate calculation of eigenvalues and diagonalization.', 'user-fac-2'),
    ('grd-1-9', 'enr-1-mth201', 'comp-mth201-tut', 88, 0, 'Rigorous inductive proofs on vector subspaces.', 'user-fac-2'),
    ('grd-1-10', 'enr-1-mth201', 'comp-mth201-exam', 79, 0, 'Excellent work on Cayley-Hamilton theorem applications.', 'user-fac-2'),

    -- Chukwuemeka Okonkwo in Harmattan 2025 CSC 201
    ('grd-1-11', 'enr-1-csc201', 'comp-csc201-lab', 94, 0, 'Superb OOP encapsulation and decoupling in Java/C++.', 'user-fac-1'),
    ('grd-1-12', 'enr-1-csc201', 'comp-csc201-mid', 89, 0, 'Solid architectural design patterns and polymorphism.', 'user-fac-1'),
    ('grd-1-13', 'enr-1-csc201', 'comp-csc201-exam', 86, 0, 'Flawless object-oriented event-driven system.', 'user-fac-1'),

    -- Zainab Folake Adeleke (user-stu-2) CSC 301
    ('grd-2-1', 'enr-2-csc301', 'comp-csc301-ca1', 95, 0, 'Top score in class; exemplary code structure and comments.', 'user-fac-1'),
    ('grd-2-2', 'enr-2-csc301', 'comp-csc301-lab', 98, 0, 'Outstanding Tarjan strongly connected components benchmark.', 'user-fac-1'),
    ('grd-2-3', 'enr-2-csc301', 'comp-csc301-ca2', 92, 0, 'Flawless recursion tree and master theorem analysis.', 'user-fac-1'),
    ('grd-2-4', 'enr-2-csc301', 'comp-csc301-exam', 89, 0, 'Mastery of advanced dynamic programming algorithms.', 'user-fac-1'),

    -- Zainab Folake Adeleke CSC 411
    ('grd-2-5', 'enr-2-csc411', 'comp-csc411-lab', 96, 0, 'Exceptional custom query optimization and execution plans.', 'user-fac-1'),
    ('grd-2-6', 'enr-2-csc411', 'comp-csc411-mid', 91, 0, 'Accurate conflict serializability precedence graphs.', 'user-fac-1'),
    ('grd-2-7', 'enr-2-csc411', 'comp-csc411-exam', 88, 0, 'Thorough MVCC concurrency control analysis.', 'user-fac-1'),

    -- Oluwaseun Damilola Bakare (user-stu-3) CSC 301
    ('grd-3-1', 'enr-3-csc301', 'comp-csc301-ca1', 68, 0, 'Good logic, needs more unit test coverage.', 'user-fac-1'),
    ('grd-3-2', 'enr-3-csc301', 'comp-csc301-lab', 72, 0, 'Resolved recursion stack overflow; good performance.', 'user-fac-1'),
    ('grd-3-3', 'enr-3-csc301', 'comp-csc301-ca2', 65, 0, 'Solid understanding of divide-and-conquer principles.', 'user-fac-1'),
    ('grd-3-4', 'enr-3-csc301', 'comp-csc301-exam', 64, 0, 'Passes all primary assessment sections.', 'user-fac-1'),

    -- Chioma Stephanie Nnamdi (user-stu-4) CSC 301
    ('grd-4-1', 'enr-4-csc301', 'comp-csc301-ca1', 86, 0, 'Great algorithmic structure and clean code.', 'user-fac-1'),
    ('grd-4-2', 'enr-4-csc301', 'comp-csc301-lab', 88, 0, 'Good graph network flow modeling.', 'user-fac-1'),
    ('grd-4-3', 'enr-4-csc301', 'comp-csc301-ca2', 82, 0, 'Well-explained asymptotic complexity bounds.', 'user-fac-1'),
    ('grd-4-4', 'enr-4-csc301', 'comp-csc301-exam', 80, 0, 'Strong performance across all sections.', 'user-fac-1'),

    -- Abubakar Sadiq Usman (user-stu-5) CSC 301
    ('grd-5-1', 'enr-5-csc301', 'comp-csc301-ca1', 58, 0, 'Passes basic test cases; check edge conditions.', 'user-fac-1'),
    ('grd-5-2', 'enr-5-csc301', 'comp-csc301-lab', 62, 0, 'Satisfactory lab submission; needs optimization.', 'user-fac-1'),
    ('grd-5-3', 'enr-5-csc301', 'comp-csc301-ca2', 54, 0, 'Review asymptotic notation proofs and big-O analysis.', 'user-fac-1'),
    ('grd-5-4', 'enr-5-csc301', 'comp-csc301-exam', 52, 0, 'Passed semester final assessment above pass threshold.', 'user-fac-1')
  `);

  // Insert initial audit logs
  db.run(`INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details) VALUES
    ('log-1', 'user-admin-1', 'Mr. Ayanbade Olamilekan John', 'SYSTEM_INITIALIZED', 'SYSTEM', 'SYS-NGR-001', 'Automated Grading & Academic Records Relational Database initialized for Nigerian University academic catalog and verification checksums.'),
    ('log-2', 'user-fac-1', 'Dr. (Mrs.) Folashade Adebayo', 'GRADES_CALCULATED', 'COURSE', 'crs-csc301', 'Automated weighted Continuous Assessment (CA) and Examination grade run computed for CSC 301 cohort.')
  `);
}

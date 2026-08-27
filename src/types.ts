export type UserRole = 'admin' | 'faculty' | 'student';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
  email: string;
  departmentId?: string | null;
  departmentName?: string | null;
  studentId?: string | null;
  facultyId?: string | null;
  avatarUrl?: string | null;
}

export interface GradingScaleTier {
  min: number;
  max: number;
  letter: string;
  gpa: number;
  description?: string;
}

export interface GradingScale {
  id: string;
  name: string;
  isDefault: boolean;
  tiers: GradingScaleTier[];
}

export interface AssessmentComponent {
  id: string;
  name: string;
  type: 'assignment' | 'quiz' | 'midterm' | 'final_exam' | 'project' | 'attendance' | 'lab';
  maxScore: number;
  weightPercent: number;
  dueDate?: string | null;
  sequence: number;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  credits: number;
  maxEnrollment: number;
  status: 'draft' | 'active' | 'grading' | 'published' | 'archived';
  passThreshold: number;
  curveOffset: number;
  curveType: string;
  description: string;
  departmentName: string;
  departmentCode: string;
  semesterName: string;
  semesterCode: string;
  isCurrentSemester: boolean;
  instructorName: string;
  instructorEmail: string;
  instructorAvatar?: string | null;
  enrolledCount: number;
  classAverage: number;
  gradingScaleName: string;
  studentGrade?: {
    rawScore: number;
    curvedScore: number;
    letterGrade: string;
    gpaPoints: number;
    isPublished: boolean;
    enrollmentStatus: string;
  } | null;
}

export interface GradeItem {
  gradeId?: string | null;
  score: number | null;
  isExcused: boolean;
  feedback: string;
  maxScore: number;
  percentage: number | null;
}

export interface StudentGradebookRow {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentCode: string;
  studentEmail: string;
  studentAvatar?: string | null;
  status: string;
  rawScore: number;
  curvedScore: number;
  letterGrade: string;
  gpaPoints: number;
  isPublished: boolean;
  notes: string;
  grades: Record<string, GradeItem>;
}

export interface CourseAnalytics {
  course: {
    id: string;
    code: string;
    title: string;
    credits: number;
    passThreshold: number;
    curveOffset: number;
    curveType: string;
    instructorName: string;
    semesterName: string;
    departmentName: string;
  };
  metrics: {
    totalEnrolled: number;
    passedCount: number;
    failedCount: number;
    passRate: number;
    mean: number;
    median: number;
    highest: number;
    lowest: number;
    stdDev: number;
    rawMean: number;
  };
  gradeDistribution: {
    grade: string;
    count: number;
    percentage: number;
  }[];
  scoreHistogram: {
    range: string;
    min: number;
    max: number;
    count: number;
  }[];
  componentPerformance: {
    id: string;
    name: string;
    type: string;
    maxScore: number;
    weightPercent: number;
    averageScore: number;
    averagePercentage: number;
    minScore: number | null;
    maxScoreAchieved: number | null;
    submissionsCount: number;
  }[];
}

export interface SemesterTranscriptRecord {
  semesterId: string;
  semesterCode: string;
  semesterName: string;
  academicYear: string;
  semesterCreditsAttempted: number;
  semesterCreditsEarned: number;
  semesterGpa: number;
  courses: {
    enrollmentId: string;
    courseId: string;
    courseCode: string;
    courseTitle: string;
    credits: number;
    rawScore: number;
    curvedScore: number;
    letterGrade: string;
    gpaPoints: number;
    status: string;
    isPublished: boolean;
    departmentName: string;
  }[];
}

export interface OfficialTranscript {
  verification: {
    code: string;
    issueDate: string;
    issuingAuthority: string;
    securityStatus: string;
    isOfficial: boolean;
  };
  student: {
    id: string;
    studentCode: string;
    fullName: string;
    email: string;
    department: string;
    avatarUrl?: string | null;
    degreeProgram: string;
    matriculationDate: string;
  };
  academicSummary: {
    cumulativeGpa: number;
    totalCreditsAttempted: number;
    totalCreditsEarned: number;
    academicStanding: string;
  };
  semesters: SemesterTranscriptRecord[];
}

export interface AuditLogItem {
  id: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface DepartmentSummary {
  id: string;
  code: string;
  name: string;
  dean: string;
  totalCourses: number;
  totalStudents: number;
  averageGpa: number;
}

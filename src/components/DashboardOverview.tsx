import React from 'react';
import { Course, User, DepartmentSummary, AuditLogItem } from '../types';
import { 
  Users, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  ChevronRight, 
  ArrowUpRight,
  Calculator,
  FileSpreadsheet
} from 'lucide-react';

interface DashboardOverviewProps {
  currentUser: User | null;
  courses: Course[];
  summary: {
    systemStats: {
      totalStudents: number;
      totalFaculty: number;
      totalCourses: number;
      totalEnrollments: number;
      totalGradedItems: number;
    };
    departments: DepartmentSummary[];
    recentLogs: AuditLogItem[];
  } | null;
  atRiskCount: number;
  onNavigateTab: (tab: any) => void;
  onSelectCourse: (courseId: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentUser,
  courses,
  summary,
  atRiskCount,
  onNavigateTab,
  onSelectCourse
}) => {
  const isStudent = currentUser?.role === 'student';

  // Overall average calculation across courses
  const overallAvg = courses.length > 0 
    ? (courses.reduce((acc, c) => acc + (c.classAverage || 0), 0) / courses.length).toFixed(1)
    : '84.2';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-[#F2F1E9] border border-[#E5E4D8] rounded-2xl p-6 shadow-xs relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#7C8964]/40 shadow-xs flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#7C8964] flex items-center justify-center text-white font-bold text-2xl shadow-xs flex-shrink-0">
                {currentUser?.fullName.charAt(0)}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7C8964]">
                  Federal University Academic Operations Hub
                </span>
                <span className="text-[#A3A295]">•</span>
                <span className="text-xs text-[#7A7D70] font-medium">Second Semester 2025/2026 (Rain)</span>
              </div>
              <h1 className="text-2xl font-bold text-[#2D3321] tracking-tight">
                Welcome back, {currentUser?.fullName}
              </h1>
              <p className="text-xs text-[#7A7D70] max-w-2xl">
                {isStudent
                  ? 'Review your active enrolled courses, track continuous assessment (CA) contributions, simulate your target CGPA, and download official transcripts.'
                  : 'Automated Continuous Assessment (CA) and Examination calculation, statistical curves, weighted components, and official transcript generation are synchronized in real-time.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
            {isStudent ? (
              <button
                onClick={() => onNavigateTab('student_portal')}
                className="px-4 py-2 bg-[#7C8964] hover:bg-[#6C7954] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Calculator className="w-4 h-4" />
                <span>Open CGPA Simulator</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigateTab('gradebook')}
                  className="px-4 py-2 bg-[#7C8964] hover:bg-[#6C7954] text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Launch Gradebook Matrix</span>
                </button>
                <button
                  onClick={() => onNavigateTab('transcripts')}
                  className="px-4 py-2 bg-white hover:bg-[#FDFCF7] text-[#2D3321] border border-[#E5E4D8] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <span>Issue Transcripts</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E4D8] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7D70]">Total Enrolled Cohort</span>
            <div className="w-8 h-8 rounded-lg bg-[#EDF2E6] text-[#7C8964] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#2D3321]">
              {summary?.systemStats.totalStudents ?? 5} <span className="text-xs font-normal text-[#7A7D70]">Undergraduates</span>
            </div>
            <div className="text-[11px] text-[#7A7D70] mt-1 flex items-center space-x-1">
              <span className="text-[#5C6847] font-semibold">100% Verified</span>
              <span>across 3 academic departments</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E4D8] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7D70]">Active Curriculum Courses</span>
            <div className="w-8 h-8 rounded-lg bg-[#EDF2E6] text-[#7C8964] flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#2D3321]">
              {courses.length} <span className="text-xs font-normal text-[#7A7D70]">Course Units</span>
            </div>
            <div className="text-[11px] text-[#7A7D70] mt-1 flex items-center space-x-1">
              <span className="text-[#5C6847] font-semibold">CA + Exam Rubrics Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E4D8] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7D70]">Cohort Mean Average</span>
            <div className="w-8 h-8 rounded-lg bg-[#EDF2E6] text-[#5C6847] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#2D3321]">
              {overallAvg}% <span className="text-xs font-semibold text-[#5C6847]">(Grade A / First Class)</span>
            </div>
            <div className="text-[11px] text-[#7A7D70] mt-1 flex items-center space-x-1">
              <span className="text-[#5C6847] font-semibold">94.8% Pass Rate</span>
              <span>overall</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#E5E4D8] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7A7D70]">Academic Standing</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              atRiskCount > 0 ? 'bg-[#FBF2ED] text-[#D69E7E]' : 'bg-[#EDF2E6] text-[#5C6847]'
            }`}>
              {atRiskCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <Award className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#2D3321]">
              {atRiskCount > 0 ? `${atRiskCount} Action Needed` : 'Good Standing'}
            </div>
            <div className="text-[11px] text-[#7A7D70] mt-1">
              {atRiskCount > 0 ? (
                <button
                  onClick={() => onNavigateTab('at_risk')}
                  className="text-[#C88A68] hover:underline font-semibold flex items-center space-x-0.5 cursor-pointer"
                >
                  <span>Review At-Risk Students</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              ) : (
                <span className="text-[#5C6847] font-semibold">All cohorts above probation threshold</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Section: Active Courses Matrix & Department Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Courses List */}
        <div className="lg:col-span-2 bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#2D3321]">Curriculum Courses & Gradebooks</h2>
              <p className="text-xs text-[#7A7D70]">Select any course to inspect Continuous Assessment components, curved distributions, or submit scores.</p>
            </div>
            <button
              onClick={() => onNavigateTab('gradebook')}
              className="text-xs text-[#7C8964] hover:text-[#5C6847] font-semibold flex items-center space-x-1 cursor-pointer"
            >
              <span>Full Matrix</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {courses.map(course => (
              <div
                key={course.id}
                onClick={() => {
                  onSelectCourse(course.id);
                  onNavigateTab('gradebook');
                }}
                className="group bg-[#FDFCF7] hover:bg-[#F2F1E9] border border-[#E5E4D8] hover:border-[#7C8964] rounded-xl p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#EDF2E6] text-[#5C6847] font-mono text-xs font-bold border border-[#E5E4D8]">
                      {course.code}
                    </span>
                    <span className="text-xs text-[#7A7D70] font-medium">{course.credits} Units</span>
                    <span className="text-[#A3A295]">•</span>
                    <span className="text-xs text-[#7A7D70] font-medium">{course.departmentName}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#2D3321] group-hover:text-[#5C6847] transition-colors">
                    {course.title}
                  </h3>
                  <div className="text-xs text-[#7A7D70] flex items-center space-x-3">
                    <span>Lecturer: <span className="text-[#2D3321] font-medium">{course.instructorName}</span></span>
                    <span>•</span>
                    <span>Enrolled: <span className="text-[#2D3321] font-medium">{course.enrolledCount} Students</span></span>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-xs text-[#7A7D70]">Class Average</div>
                    <div className="text-sm font-bold text-[#5C6847]">
                      {course.classAverage > 0 ? `${course.classAverage}%` : 'Pending'}
                    </div>
                    {course.curveOffset > 0 && (
                      <span className="text-[10px] text-[#C88A68] bg-[#FBF2ED] px-1.5 py-0.5 rounded font-mono font-semibold border border-[#E5E4D8]">
                        +{course.curveOffset}% Curve
                      </span>
                    )}
                  </div>

                  <div className="w-8 h-8 rounded-lg bg-[#F2F1E9] group-hover:bg-[#7C8964] group-hover:text-white text-[#7A7D70] flex items-center justify-center transition-all border border-[#E5E4D8]">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Department Summary & Live Audit Stream */}
        <div className="space-y-6">
          {/* Department Breakdown */}
          <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-[#2D3321]">Department Academic Performance</h2>
            <p className="text-xs text-[#7A7D70]">Departmental GPA indices under NUC 5.0 scale.</p>

            <div className="space-y-3 pt-1">
              {summary?.departments.map(dept => (
                <div key={dept.id} className="p-3.5 rounded-xl bg-[#FDFCF7] border border-[#E5E4D8] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#2D3321]">{dept.name}</span>
                    <span className="font-mono font-bold text-[#5C6847]">{dept.averageGpa.toFixed(2)} / 5.00 GPA</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#7A7D70]">
                    <span>Dean: {dept.dean}</span>
                    <span>{dept.totalCourses} Courses • {dept.totalStudents} Students</span>
                  </div>
                  {/* Progress bar visual */}
                  <div className="w-full bg-[#E5E4D8] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#7C8964] h-full rounded-full"
                      style={{ width: `${(dept.averageGpa / 5.0) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Stream Snippet */}
          <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#2D3321]">Recent Audit Events</h2>
              <button
                onClick={() => onNavigateTab('audit')}
                className="text-xs text-[#7C8964] hover:text-[#5C6847] font-semibold cursor-pointer"
              >
                View all
              </button>
            </div>

            <div className="space-y-2.5">
              {summary?.recentLogs?.slice(0, 4).map(log => (
                <div key={log.id} className="text-xs p-2.5 rounded-lg bg-[#FDFCF7] border border-[#E5E4D8] space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#2D3321]">{log.userName}</span>
                    <span className="text-[#7A7D70] font-mono text-[10px]">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[#7A7D70] text-[11px] truncate">{log.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

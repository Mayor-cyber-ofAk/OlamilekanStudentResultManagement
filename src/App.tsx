import React, { useState, useEffect } from 'react';
import { User, Course, DepartmentSummary, AuditLogItem } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { GradebookView } from './components/GradebookView';
import { AnalyticsView } from './components/AnalyticsView';
import { TranscriptView } from './components/TranscriptView';
import { StudentPortalView } from './components/StudentPortalView';
import { AuditTrailView } from './components/AuditTrailView';
import { AtRiskView } from './components/AtRiskView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('crs-cs301');
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [atRiskCount, setAtRiskCount] = useState<number>(0);
  const [targetStudentIdForTranscript, setTargetStudentIdForTranscript] = useState<string>('user-stu-1');

  const [dashboardSummary, setDashboardSummary] = useState<{
    systemStats: {
      totalStudents: number;
      totalFaculty: number;
      totalCourses: number;
      totalEnrollments: number;
      totalGradedItems: number;
    };
    departments: DepartmentSummary[];
    recentLogs: AuditLogItem[];
  } | null>(null);

  // Fetch initial app state
  const loadInitialData = async () => {
    try {
      // Current user
      const userRes = await fetch('/api/auth/current-user');
      const userData = await userRes.json();
      if (userData.user) {
        setCurrentUser(userData.user);
      }

      // All users for role switching
      const usersRes = await fetch('/api/auth/users');
      const usersData = await usersRes.json();
      if (usersData.users) {
        setAvailableUsers(usersData.users);
      }

      // Courses
      await loadCourses(userData.user?.id, userData.user?.role);

      // Dashboard summary & at risk
      const sumRes = await fetch('/api/reports/dashboard');
      const sumData = await sumRes.json();
      setDashboardSummary(sumData);

      const riskRes = await fetch('/api/reports/at-risk');
      const riskData = await riskRes.json();
      if (riskData.atRiskStudents) {
        setAtRiskCount(riskData.atRiskStudents.length);
      }
    } catch (err) {
      console.error('Error initializing app:', err);
    }
  };

  const loadCourses = async (userId?: string, role?: string) => {
    try {
      const url = role === 'student' && userId ? `/api/courses?studentId=${userId}` : '/api/courses';
      const res = await fetch(url);
      const data = await res.json();
      if (data.courses) {
        setCourses(data.courses);
        if (data.courses.length > 0 && !data.courses.some((c: any) => c.id === selectedCourseId)) {
          setSelectedCourseId(data.courses[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle Switch User / Role
  const handleUserSwitch = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        // Refresh active user and course view
        const uRes = await fetch('/api/auth/current-user');
        const uData = await uRes.json();
        if (uData.user) {
          setCurrentUser(uData.user);
          await loadCourses(uData.user.id, uData.user.role);

          // Route intelligently on switch
          if (uData.user.role === 'student') {
            setActiveTab('student_portal');
            setTargetStudentIdForTranscript(uData.user.id);
          } else {
            setActiveTab('dashboard');
          }
        }
      }
    } catch (err) {
      console.error('User switch error:', err);
    }
  };

  const availableStudents = availableUsers.filter(u => u.role === 'student');

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-[#3A3D30] flex flex-col font-sans selection:bg-[#7C8964] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onUserSwitch={handleUserSwitch}
        availableUsers={availableUsers}
        onRefreshData={loadInitialData}
      />

      {/* Main Workspace with Sidebar & Dynamic View */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        <Sidebar
          currentTab={activeTab}
          onTabChange={setActiveTab}
          userRole={currentUser?.role || 'faculty'}
          atRiskCount={atRiskCount}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-full">
          {activeTab === 'dashboard' && (
            <DashboardOverview
              currentUser={currentUser}
              courses={courses}
              summary={dashboardSummary}
              atRiskCount={atRiskCount}
              onNavigateTab={setActiveTab}
              onSelectCourse={setSelectedCourseId}
            />
          )}

          {activeTab === 'gradebook' && (
            <GradebookView
              courses={courses}
              selectedCourseId={selectedCourseId}
              onSelectCourse={setSelectedCourseId}
              onTriggerRecalculate={loadInitialData}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              courses={courses}
              selectedCourseId={selectedCourseId}
              onSelectCourse={setSelectedCourseId}
            />
          )}

          {activeTab === 'transcripts' && (
            <TranscriptView
              currentUser={currentUser}
              availableStudents={availableStudents}
              defaultStudentId={targetStudentIdForTranscript}
            />
          )}

          {activeTab === 'student_portal' && (
            <StudentPortalView
              currentUser={currentUser}
              courses={courses}
              onOpenTranscript={() => {
                if (currentUser) setTargetStudentIdForTranscript(currentUser.id);
                setActiveTab('transcripts');
              }}
            />
          )}

          {activeTab === 'audit' && <AuditTrailView />}

          {activeTab === 'at_risk' && (
            <AtRiskView
              onOpenStudentTranscript={(sId) => {
                setTargetStudentIdForTranscript(sId);
                setActiveTab('transcripts');
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

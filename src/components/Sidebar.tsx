import React from 'react';
import { UserRole } from '../types';
import { 
  LayoutDashboard, 
  Table2, 
  BarChart3, 
  FileText, 
  GraduationCap, 
  Database, 
  History,
  AlertTriangle,
  Layers
} from 'lucide-react';

export type NavTab = 'dashboard' | 'gradebook' | 'analytics' | 'transcripts' | 'student_portal' | 'sql_console' | 'audit' | 'at_risk';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  userRole: UserRole;
  atRiskCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  userRole,
  atRiskCount = 0
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavTab,
      label: 'Overview & KPIs',
      icon: LayoutDashboard,
      roles: ['admin', 'faculty', 'student'] as UserRole[],
      badge: null
    },
    {
      id: 'gradebook' as NavTab,
      label: 'Gradebook Matrix',
      icon: Table2,
      roles: ['admin', 'faculty'] as UserRole[],
      badge: 'Auto-Calc'
    },
    {
      id: 'analytics' as NavTab,
      label: 'Analytics & Curves',
      icon: BarChart3,
      roles: ['admin', 'faculty'] as UserRole[],
      badge: null
    },
    {
      id: 'transcripts' as NavTab,
      label: 'Official Transcripts',
      icon: FileText,
      roles: ['admin', 'faculty', 'student'] as UserRole[],
      badge: 'Verified'
    },
    {
      id: 'student_portal' as NavTab,
      label: 'Student Degree Portal',
      icon: GraduationCap,
      roles: ['student', 'admin', 'faculty'] as UserRole[],
      badge: userRole === 'student' ? 'My Portal' : null
    },
    {
      id: 'at_risk' as NavTab,
      label: 'Academic Intervention',
      icon: AlertTriangle,
      roles: ['admin', 'faculty'] as UserRole[],
      badge: atRiskCount > 0 ? `${atRiskCount} alerts` : null,
      badgeColor: 'bg-amber-500/20 text-amber-300'
    },
    {
      id: 'sql_console' as NavTab,
      label: 'Relational SQL Console',
      icon: Database,
      roles: ['admin', 'faculty'] as UserRole[],
      badge: 'SQLite'
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit & Integrity Trail',
      icon: History,
      roles: ['admin', 'faculty'] as UserRole[],
      badge: null
    }
  ];

  const visibleItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <aside id="app-sidebar" className="w-full md:w-64 bg-[#F2F1E9] border-r border-[#E5E4D8] flex-shrink-0 flex flex-col justify-between p-4">
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#7C8964] px-3 mb-2 flex items-center justify-between">
            <span>Navigation Hub</span>
            <Layers className="w-3.5 h-3.5 text-[#7C8964]" />
          </div>
          <nav className="space-y-1">
            {visibleItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  id={`nav-item-${item.id}`}
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#7C8964] text-white shadow-xs font-semibold'
                      : 'text-[#3A3D30] hover:bg-[#EAE9DE] hover:text-[#2D3321]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#7C8964]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
                      item.badgeColor || (isActive ? 'bg-[#5C6847] text-white' : 'bg-[#EAE9DE] text-[#5C6847] border border-[#E5E4D8]')
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* System & Architecture Status pill */}
        <div className="bg-white border border-[#E5E4D8] rounded-xl p-3 text-xs shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-[#2D3321]">Relational DB Status</span>
            <span className="flex items-center space-x-1 text-[10px] text-[#5C6847] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C8964] animate-pulse"></span>
              <span>ACID Active</span>
            </span>
          </div>
          <div className="space-y-1 text-[11px] text-[#7A7D70]">
            <div className="flex justify-between">
              <span>Engine:</span>
              <span className="text-[#2D3321] font-mono font-semibold">SQLite (Relational)</span>
            </div>
            <div className="flex justify-between">
              <span>Auto-Calculation:</span>
              <span className="text-[#5C6847] font-semibold">Synchronized</span>
            </div>
            <div className="flex justify-between">
              <span>Security Access:</span>
              <span className="text-[#D69E7E] capitalize font-semibold">{userRole} Level</span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#E5E4D8] text-center">
        <p className="text-[10px] text-[#7A7D70] font-medium">Gradex Automated Grading Engine</p>
        <p className="text-[9px] text-[#A3A295]">v4.2.0 • Data Integrity Verified</p>
      </div>
    </aside>
  );
};

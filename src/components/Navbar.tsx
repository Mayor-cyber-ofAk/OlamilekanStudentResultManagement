import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { GraduationCap, ShieldCheck, UserCheck, Users, RefreshCw, Sparkles } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  onUserSwitch: (userId: string) => void;
  availableUsers: User[];
  onRefreshData?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserSwitch,
  availableUsers,
  onRefreshData
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => setDropdownOpen(false);
    if (dropdownOpen) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  const facultyUsers = availableUsers.filter(u => u.role === 'faculty');
  const studentUsers = availableUsers.filter(u => u.role === 'student');
  const adminUsers = availableUsers.filter(u => u.role === 'admin');

  return (
    <header id="app-navbar" className="bg-[#FDFCF7] text-[#3A3D30] border-b border-[#E5E4D8] sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Institution Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#5C6847] flex items-center justify-center shadow-xs text-white font-bold">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-[#2D3321]">FUST Academic Portal</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#EAE9DE] text-[#5C6847] font-semibold border border-[#E5E4D8]">
                  Federal University Registry
                </span>
              </div>
              <p className="text-xs text-[#7A7D70]">Rain (2nd) Semester 2025/2026 • NUC 5.0 CGPA Standard</p>
            </div>
          </div>

          {/* Role Switching & User Info */}
          <div className="flex items-center space-x-3">
            {onRefreshData && (
              <button
                id="btn-refresh-data"
                onClick={onRefreshData}
                className="p-2 rounded-xl bg-[#F2F1E9] hover:bg-[#EAE9DE] border border-[#E5E4D8] text-[#3A3D30] transition-colors text-xs flex items-center space-x-1.5 cursor-pointer"
                title="Recalculate & Sync"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#5C6847]" />
                <span className="hidden sm:inline font-medium">Synchronize Results</span>
              </button>
            )}

            {/* Role Simulation Switcher */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                id="btn-role-switcher"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2.5 bg-[#F2F1E9] hover:bg-[#EAE9DE] border border-[#E5E4D8] px-3 py-1.5 rounded-xl transition-all text-left shadow-xs cursor-pointer"
              >
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-[#7C8964]/40"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#7C8964] flex items-center justify-center text-xs font-bold text-white">
                    {currentUser?.fullName.charAt(0)}
                  </div>
                )}
                
                <div className="text-xs pr-1">
                  <div className="font-semibold text-[#2D3321] flex items-center space-x-1.5">
                    <span>{currentUser?.fullName || 'Select User'}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                      currentUser?.role === 'admin' ? 'bg-[#D69E7E]' :
                      currentUser?.role === 'faculty' ? 'bg-[#7C8964]' : 'bg-[#5B8296]'
                    }`} />
                    <span className="text-[10px] text-[#7A7D70] capitalize font-medium">
                      {currentUser?.role} {currentUser?.departmentName ? `• ${currentUser.departmentName.split(' ')[0]}` : ''}
                    </span>
                  </div>
                </div>

                <div className="text-[#7A7D70] text-xs pl-1 border-l border-[#E5E4D8]">
                  <span className="text-[10px] bg-[#E5E4D8] px-1.5 py-0.5 rounded text-[#2D3321] font-medium">Switch</span>
                </div>
              </button>

              {/* Role Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-76 bg-white border border-[#E5E4D8] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3.5 py-2 border-b border-[#F2F1E9] text-[11px] font-bold text-[#7C8964] uppercase tracking-wider flex items-center justify-between">
                    <span>Simulate User Persona</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#7C8964]" />
                  </div>

                  {/* Admin */}
                  <div className="px-2 pt-2">
                    <div className="text-[10px] uppercase font-bold text-[#D69E7E] px-2 py-0.5 flex items-center space-x-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Administrator</span>
                    </div>
                    {adminUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onUserSwitch(u.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center space-x-2.5 transition-colors cursor-pointer ${
                          currentUser?.id === u.id ? 'bg-[#FBF2ED] text-[#2D3321] font-semibold border border-[#E5E4D8]' : 'text-[#3A3D30] hover:bg-[#F2F1E9]'
                        }`}
                      >
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.fullName}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-[#D69E7E]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#D69E7E] text-white flex items-center justify-center text-[10px] font-bold">
                            {u.fullName.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="truncate text-[#2D3321] font-medium">{u.fullName}</div>
                          <div className="text-[10px] text-[#7A7D70]">System Admin & University Registrar</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Faculty */}
                  <div className="px-2 pt-2">
                    <div className="text-[10px] uppercase font-bold text-[#7C8964] px-2 py-0.5 flex items-center space-x-1">
                      <UserCheck className="w-3 h-3" />
                      <span>Lecturers & Faculty</span>
                    </div>
                    {facultyUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onUserSwitch(u.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center space-x-2.5 transition-colors cursor-pointer ${
                          currentUser?.id === u.id ? 'bg-[#EDF2E6] text-[#2D3321] font-semibold border border-[#E5E4D8]' : 'text-[#3A3D30] hover:bg-[#F2F1E9]'
                        }`}
                      >
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.fullName}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-[#7C8964]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#7C8964] text-white flex items-center justify-center text-[10px] font-bold">
                            {u.fullName.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="truncate text-[#2D3321] font-medium">{u.fullName}</div>
                          <div className="text-[10px] text-[#7A7D70]">{u.departmentName ?? 'Faculty'}</div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Students */}
                  <div className="px-2 pt-2 border-t border-[#F2F1E9] mt-1">
                    <div className="text-[10px] uppercase font-bold text-[#5B8296] px-2 py-0.5 flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>Undergraduate Students</span>
                    </div>
                    {studentUsers.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onUserSwitch(u.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center space-x-2.5 transition-colors cursor-pointer ${
                          currentUser?.id === u.id ? 'bg-[#EEF4F8] text-[#2D3321] font-semibold border border-[#E5E4D8]' : 'text-[#3A3D30] hover:bg-[#F2F1E9]'
                        }`}
                      >
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.fullName}
                            className="w-6 h-6 rounded-full object-cover ring-1 ring-[#5B8296]"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#5B8296] text-white flex items-center justify-center text-[10px] font-bold">
                            {u.fullName.charAt(0)}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="truncate text-[#2D3321] font-medium">{u.fullName}</div>
                          <div className="text-[10px] text-[#7A7D70] font-mono">{u.studentId}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

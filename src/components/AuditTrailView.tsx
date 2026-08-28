import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../types';
import { History, ShieldCheck, Filter, Search, Award } from 'lucide-react';

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'BATCH_GRADE_UPDATED': { label: 'Scores & CA Marks Recorded', color: 'bg-[#EDF2E6] text-[#5C6847] border-[#C8E6C9]' },
  'CURVE_CONFIGURED': { label: 'Senate Moderation Configured', color: 'bg-[#FFF9E6] text-[#8C6D23] border-[#FFE8A3]' },
  'GRADES_OFFICIALLY_PUBLISHED': { label: 'Senate Results Approved & Gazetted', color: 'bg-[#EDF2E6] text-[#2E5E3B] border-[#A5D6A7]' },
  'TRANSCRIPT_GENERATED': { label: 'Official Transcript Verified & Issued', color: 'bg-[#EEF4F8] text-[#38647A] border-[#C2DBEC]' },
  'AUTH_ROLE_SWITCH': { label: 'Registry User Verification', color: 'bg-[#F2F1E9] text-[#7A7D70] border-[#E5E4D8]' }
};

export const AuditTrailView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit-logs');
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#5C6847] uppercase tracking-wider">
                Official Senate Gazette
              </span>
              <span className="text-[#A3A295]">•</span>
              <span className="text-xs text-[#7A7D70]">Academic Integrity & Verification Register</span>
            </div>
            <h1 className="text-xl font-bold text-[#2D3321] tracking-tight flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-[#5C6847]" />
              <span>Senate Result Gazette & Academic Records Register</span>
            </h1>
            <p className="text-xs text-[#7A7D70]">
              Official record of Continuous Assessment submissions, Senate moderations, degree classifications, and transcript issuances.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadLogs}
              className="px-3 py-1.5 bg-[#F2F1E9] hover:bg-[#EAE9DE] text-[#2D3321] rounded-xl text-xs font-semibold border border-[#E5E4D8] shadow-xs cursor-pointer"
            >
              Refresh Gazette
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E5E4D8] text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#7A7D70] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by lecturer, examiner, course or matric number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FDFCF7] border border-[#E5E4D8] rounded-xl pl-9 pr-3 py-1.5 text-[#2D3321] focus:ring-2 focus:ring-[#5C6847]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-[#7A7D70]" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-[#FDFCF7] border border-[#E5E4D8] rounded-xl px-3 py-1.5 text-[#2D3321] focus:ring-2 focus:ring-[#5C6847]"
            >
              <option value="ALL">All Senate Actions</option>
              <option value="BATCH_GRADE_UPDATED">Scores & CA Marks Recorded</option>
              <option value="CURVE_CONFIGURED">Senate Moderation Configured</option>
              <option value="GRADES_OFFICIALLY_PUBLISHED">Senate Results Approved & Gazetted</option>
              <option value="TRANSCRIPT_GENERATED">Official Transcript Verified & Issued</option>
              <option value="AUTH_ROLE_SWITCH">Registry User Verification</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#F2F1E9] text-[#2D3321] font-bold border-b border-[#E5E4D8]">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Officer / Examiner</th>
                <th className="py-3 px-4">Action Recorded</th>
                <th className="py-3 px-4">Academic Record</th>
                <th className="py-3 px-4">Official Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E4D8]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#7A7D70]">
                    Loading Senate gazette stream...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#7A7D70]">
                    No matching Senate gazette entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const meta = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-[#EDF2E6] text-[#5C6847] border-[#E5E4D8]' };

                  return (
                    <tr key={log.id} className="hover:bg-[#FDFCF7] transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[#7A7D70] text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-[#2D3321]">
                        {log.userName}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-[#5C6847] text-[11px]">
                        {log.entityType === 'COURSE' ? 'Course Unit' : log.entityType === 'STUDENT' ? 'Student Record' : 'Registry'}: {log.entityId.replace('crs-', '').replace('user-stu-', 'Student #')}
                      </td>
                      <td className="py-2.5 px-4 text-[#3A3D30]">
                        {log.details}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

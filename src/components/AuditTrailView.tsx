import React, { useState, useEffect } from 'react';
import { AuditLogItem } from '../types';
import { History, ShieldCheck, Filter, Search } from 'lucide-react';

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
              <span className="text-xs font-bold text-[#7C8964] uppercase tracking-wider">
                System Security & Traceability
              </span>
              <span className="text-[#A3A295]">•</span>
              <span className="text-xs text-[#7A7D70]">Immutable Audit Records</span>
            </div>
            <h1 className="text-xl font-bold text-[#2D3321] tracking-tight flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-[#5C6847]" />
              <span>Academic Integrity & Grade Mutation Audit Trail</span>
            </h1>
            <p className="text-xs text-[#7A7D70]">
              Detailed timestamps, actor attributions, and exact changes for all grade entries, curve calculations, and transcript generations.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={loadLogs}
              className="px-3 py-1.5 bg-[#F2F1E9] hover:bg-[#EAE9DE] text-[#2D3321] rounded-xl text-xs font-semibold border border-[#E5E4D8] shadow-xs"
            >
              Refresh Log Feed
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E5E4D8] text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#7A7D70] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by actor name, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#FDFCF7] border border-[#E5E4D8] rounded-xl pl-9 pr-3 py-1.5 text-[#2D3321] focus:ring-2 focus:ring-[#7C8964]"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-[#7A7D70]" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full bg-[#FDFCF7] border border-[#E5E4D8] rounded-xl px-3 py-1.5 text-[#2D3321] focus:ring-2 focus:ring-[#7C8964]"
            >
              <option value="ALL">All Actions</option>
              <option value="BATCH_GRADE_UPDATED">BATCH_GRADE_UPDATED</option>
              <option value="CURVE_CONFIGURED">CURVE_CONFIGURED</option>
              <option value="GRADES_OFFICIALLY_PUBLISHED">GRADES_OFFICIALLY_PUBLISHED</option>
              <option value="TRANSCRIPT_GENERATED">TRANSCRIPT_GENERATED</option>
              <option value="AUTH_ROLE_SWITCH">AUTH_ROLE_SWITCH</option>
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
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E4D8]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#7A7D70]">
                    Loading audit stream...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#7A7D70]">
                    No matching audit entries found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-[#FDFCF7] transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[#7A7D70] text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-bold text-[#2D3321]">
                      {log.userName}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-[#EDF2E6] text-[#5C6847] border border-[#E5E4D8] font-semibold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[#7A7D70] text-[11px]">
                      {log.entityType}: {log.entityId}
                    </td>
                    <td className="py-2.5 px-4 text-[#3A3D30]">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

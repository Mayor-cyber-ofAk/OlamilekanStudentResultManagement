import React, { useState, useEffect } from 'react';
import { AlertTriangle, User, Mail, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';

interface AtRiskViewProps {
  onOpenStudentTranscript: (studentId: string) => void;
}

export const AtRiskView: React.FC<AtRiskViewProps> = ({ onOpenStudentTranscript }) => {
  const [atRiskList, setAtRiskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAtRisk = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports/at-risk');
      const data = await res.json();
      if (data.atRiskStudents) {
        setAtRiskList(data.atRiskStudents);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAtRisk();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-[#D69E7E] uppercase tracking-wider">
              Early Academic Intervention
            </span>
            <span className="text-[#A3A295]">•</span>
            <span className="text-xs text-[#7A7D70]">Automated Grade Monitoring System</span>
          </div>
          <h1 className="text-xl font-bold text-[#2D3321] tracking-tight flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-[#C88A68]" />
            <span>Students Requiring Academic Advising & Support</span>
          </h1>
          <p className="text-xs text-[#7A7D70]">
            Identifies students falling below GPA thresholds or carrying non-passing marks in course assessments.
          </p>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-[#7A7D70] text-xs">
            Scanning academic records and gradebooks for risk indicators...
          </div>
        ) : atRiskList.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#5C6847] mx-auto" />
            <h3 className="text-sm font-bold text-[#2D3321]">No At-Risk Students Detected</h3>
            <p className="text-xs text-[#7A7D70]">All student cohorts are currently in Good Standing above required GPA cutoffs.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E4D8]">
            {atRiskList.map(student => (
              <div key={student.studentId} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#FDFCF7] transition-colors">
                <div className="flex items-center space-x-3.5">
                  {student.avatarUrl ? (
                    <img
                      src={student.avatarUrl}
                      alt={student.fullName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-[#E5E4D8]"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#F2F1E9] border border-[#E5E4D8] flex items-center justify-center font-bold text-[#2D3321]">
                      {student.fullName.charAt(0)}
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-[#2D3321] text-sm">{student.fullName}</h3>
                      <span className="font-mono text-[10px] text-[#7A7D70]">({student.studentCode})</span>
                    </div>
                    <p className="text-xs text-[#7A7D70]">Department: {student.departmentName} • Email: {student.email}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {student.reasons.map((r: string, idx: number) => (
                        <span key={idx} className="text-[10px] bg-[#FDF2F2] text-[#B83A3A] px-2 py-0.5 rounded-full border border-[#F5C2C2] font-semibold">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-[10px] text-[#7A7D70] uppercase font-bold">Current CGPA</div>
                    <div className="text-lg font-mono font-extrabold text-[#C88A68]">
                      {student.cumulativeGpa.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-[#B83A3A] font-bold">{student.standing}</div>
                  </div>

                  <button
                    onClick={() => onOpenStudentTranscript(student.studentId)}
                    className="px-3 py-1.5 bg-[#F2F1E9] hover:bg-[#EAE9DE] border border-[#E5E4D8] text-[#2D3321] rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all shadow-xs"
                  >
                    <span>View Transcript</span>
                    <ChevronRight className="w-3 h-3 text-[#7A7D70]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

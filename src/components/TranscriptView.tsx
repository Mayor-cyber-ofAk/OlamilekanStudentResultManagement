import React, { useState, useEffect } from 'react';
import { User, OfficialTranscript } from '../types';
import { 
  Printer, 
  Download, 
  ShieldCheck, 
  Award, 
  FileCheck, 
  CheckCircle2, 
  GraduationCap, 
  Calendar,
  Building,
  UserCheck
} from 'lucide-react';

interface TranscriptViewProps {
  currentUser: User | null;
  availableStudents: User[];
  defaultStudentId?: string;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  currentUser,
  availableStudents,
  defaultStudentId
}) => {
  const initialStudentId = currentUser?.role === 'student' 
    ? currentUser.id 
    : (defaultStudentId || availableStudents[0]?.id || 'user-stu-1');

  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialStudentId);
  const [transcript, setTranscript] = useState<OfficialTranscript | null>(null);
  const [loading, setLoading] = useState(false);

  const isStudentRole = currentUser?.role === 'student';

  const loadTranscript = async (studentId: string) => {
    if (!studentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/students/${studentId}/transcript`);
      const data = await res.json();
      setTranscript(data);
    } catch (err) {
      console.error('Error loading transcript:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      loadTranscript(selectedStudentId);
    }
  }, [selectedStudentId]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  // Handle JSON export
  const handleExportJson = () => {
    if (!transcript) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(transcript, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Official_Transcript_${transcript.student.studentCode.replace(/\//g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#7C8964] uppercase tracking-wider">
                Official Records & Reporting Service
              </span>
              <span className="text-[#A3A295]">•</span>
              <span className="text-xs text-[#7A7D70]">Cryptographically Verified Transcript</span>
            </div>
            <h1 className="text-xl font-bold text-[#2D3321] tracking-tight">
              Official Student Performance Transcript
            </h1>
            <p className="text-xs text-[#7A7D70]">
              Authorized Nigerian University academic record computed under the NUC 5.0 CGPA system.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!isStudentRole && availableStudents.length > 0 && (
              <select
                id="select-transcript-student"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-[#FDFCF7] border border-[#E5E4D8] text-[#2D3321] rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#7C8964]"
              >
                {availableStudents.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.studentId})
                  </option>
                ))}
              </select>
            )}

            <button
              id="btn-print-transcript"
              onClick={handlePrint}
              className="px-4 py-2 bg-[#7C8964] hover:bg-[#6C7954] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Transcript</span>
            </button>

            <button
              onClick={handleExportJson}
              className="px-3 py-2 bg-[#F2F1E9] hover:bg-[#EAE9DE] border border-[#E5E4D8] text-[#2D3321] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#7A7D70]" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {loading || !transcript ? (
        <div className="bg-white border border-[#E5E4D8] rounded-2xl p-12 text-center text-[#7A7D70] text-xs shadow-xs">
          Compiling student academic record and computing cumulative GPA breakdown...
        </div>
      ) : (
        /* Printable Document Container */
        <div className="bg-[#FDFCF7] text-[#2D3321] rounded-2xl shadow-lg border border-[#E5E4D8] p-8 sm:p-12 relative overflow-hidden print:p-0 print:border-none print:shadow-none print:bg-white">
          {/* Watermark Seal */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <GraduationCap className="w-[450px] h-[450px] text-[#2D3321]" />
          </div>

          <div className="relative z-10 space-y-8">
            {/* Nigerian Institution Letterhead */}
            <div className="border-b-2 border-[#2D3321] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-[#5C6847] text-white flex items-center justify-center font-serif text-2xl font-bold shadow-xs">
                  F
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#2D3321] tracking-tight uppercase">
                    FEDERAL UNIVERSITY OF SCIENCE & TECHNOLOGY, NIGERIA
                  </h2>
                  <p className="text-xs text-[#5C6847] font-semibold tracking-wide">
                    Office of the University Registrar & Directorate of Academic Records
                  </p>
                  <p className="text-[11px] text-[#7A7D70] font-sans">
                    P.M.B. 1024, University Main Campus • Official Transcript of Academic Records
                  </p>
                </div>
              </div>

              {/* Official Verification Box */}
              <div className="p-3 bg-[#F2F1E9] border border-[#E5E4D8] rounded-xl text-right space-y-1">
                <div className="flex items-center justify-end space-x-1 text-[#5C6847] text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>OFFICIAL TRANSCRIPT</span>
                </div>
                <div className="text-[11px] font-mono text-[#7A7D70]">
                  Verification: <span className="font-bold text-[#2D3321]">{transcript.verification.code}</span>
                </div>
                <div className="text-[10px] text-[#A3A295]">
                  Issued: {transcript.verification.issueDate}
                </div>
              </div>
            </div>

            {/* Student Metadata Header Grid with Official Passport Photo */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-[#F2F1E9] rounded-xl border border-[#E5E4D8] text-xs">
              {transcript.student.avatarUrl ? (
                <img
                  src={transcript.student.avatarUrl}
                  alt={transcript.student.fullName}
                  className="w-16 h-16 rounded-xl object-cover ring-2 ring-[#5C6847]/30 border border-[#E5E4D8] flex-shrink-0 shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#7C8964] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-xs">
                  {transcript.student.fullName.charAt(0)}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7D70] block">Student Full Name</span>
                  <span className="font-bold text-[#2D3321] text-sm">{transcript.student.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7D70] block">Matriculation No.</span>
                  <span className="font-mono font-bold text-[#2D3321] text-sm">{transcript.student.studentCode}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7D70] block">Faculty & Department</span>
                  <span className="font-semibold text-[#2D3321]">{transcript.student.department}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7D70] block">Academic Standing</span>
                  <span className="font-bold text-[#5C6847]">{transcript.academicSummary.academicStanding}</span>
                </div>
              </div>
            </div>

            {/* Academic Semesters List */}
            <div className="space-y-6">
              {transcript.semesters.map((sem) => (
                <div key={sem.semesterId} className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E4D8] text-xs">
                    <span className="font-serif font-bold text-[#2D3321] text-sm">
                      {sem.semesterName} ({sem.academicYear})
                    </span>
                    <div className="flex items-center space-x-3 text-[#7A7D70] font-mono text-[11px]">
                      <span>Units Registered: <strong className="text-[#2D3321]">{sem.semesterCreditsAttempted}</strong></span>
                      <span>•</span>
                      <span>Semester GPA: <strong className="text-[#2D3321]">{sem.semesterGpa.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F2F1E9] text-[#2D3321] text-[11px] font-bold border-b border-[#E5E4D8]">
                        <th className="py-2 px-3">Course Code</th>
                        <th className="py-2 px-3">Course Title</th>
                        <th className="py-2 px-3 text-center">Units</th>
                        <th className="py-2 px-3 text-center">Score %</th>
                        <th className="py-2 px-3 text-center">Grade</th>
                        <th className="py-2 px-3 text-center">Grade Point</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E4D8]">
                      {sem.courses.map((c) => (
                        <tr key={c.enrollmentId} className="hover:bg-white/60">
                          <td className="py-2 px-3 font-mono font-bold text-[#2D3321]">{c.courseCode}</td>
                          <td className="py-2 px-3 text-[#3A3D30] font-medium">{c.courseTitle}</td>
                          <td className="py-2 px-3 text-center font-mono text-[#7A7D70]">{c.credits}</td>
                          <td className="py-2 px-3 text-center font-mono text-[#7A7D70]">
                            {c.curvedScore > 0 ? `${c.curvedScore}%` : '—'}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-[#2D3321]">
                            {c.letterGrade}
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-bold text-[#5C6847]">
                            {c.gpaPoints.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {/* Cumulative Summary Totals */}
            <div className="border-t-2 border-[#5C6847] pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F2F1E9] p-5 rounded-xl border border-[#E5E4D8]">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7A7D70]">Degree Classification (NUC Standard)</span>
                <div className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-[#5C6847]" />
                  <span className="text-base font-bold text-[#2D3321]">
                    {transcript.academicSummary.academicStanding}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-6 text-xs text-right">
                <div>
                  <span className="text-[#7A7D70] block text-[10px] uppercase font-bold">Total Units Registered</span>
                  <span className="font-mono font-bold text-[#2D3321] text-sm">
                    {transcript.academicSummary.totalCreditsAttempted}
                  </span>
                </div>
                <div>
                  <span className="text-[#7A7D70] block text-[10px] uppercase font-bold">Total Units Passed</span>
                  <span className="font-mono font-bold text-[#2D3321] text-sm">
                    {transcript.academicSummary.totalCreditsEarned}
                  </span>
                </div>
                <div className="pl-4 border-l border-[#E5E4D8]">
                  <span className="text-[#7A7D70] block text-[10px] uppercase font-bold">Cumulative CGPA</span>
                  <span className="font-mono font-extrabold text-[#5C6847] text-xl">
                    {transcript.academicSummary.cumulativeGpa.toFixed(2)} / 5.00
                  </span>
                </div>
              </div>
            </div>

            {/* Registrar Signature & Security Stamp Footer */}
            <div className="pt-8 border-t border-[#E5E4D8] flex flex-col sm:flex-row sm:items-end justify-between gap-6 text-xs text-[#7A7D70]">
              <div className="space-y-1">
                <p className="text-[11px] font-sans font-medium text-[#3A3D30]">
                  This academic record is authenticated and generated with cryptographic checksum validation.
                </p>
                <p className="text-[10px] text-[#7A7D70]">
                  Grade Scale: NUC 5.0 Standard (A=5.0 [70-100%], B=4.0 [60-69%], C=3.0 [50-59%], D=2.0 [45-49%], E=1.0 [40-44%], F=0.0 [0-39%]).
                </p>
              </div>

              <div className="text-right space-y-2">
                <div className="font-serif italic text-base text-[#2D3321] font-bold border-b border-[#7A7D70] pb-1 inline-block min-w-[240px] text-center">
                  Mr. Ayanbade Olamilekan John
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[#5C6847] font-bold">
                  University Registrar & Secretary to Council
                </div>
                <div className="text-[9px] text-[#7A7D70]">
                  Federal University of Science & Technology, Nigeria
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

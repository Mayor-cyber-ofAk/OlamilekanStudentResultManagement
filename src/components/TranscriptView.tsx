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
  UserCheck,
  Stamp
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

  // Handle print / PDF export
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#5C6847] uppercase tracking-wider">
                Directorate of Academic Records & Registry
              </span>
              <span className="text-[#A3A295]">•</span>
              <span className="text-xs text-[#7A7D70]">NUC Verified Academic Transcript</span>
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
                className="bg-[#FDFCF7] border border-[#E5E4D8] text-[#2D3321] rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#5C6847]"
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
              className="px-4 py-2 bg-[#5C6847] hover:bg-[#4D573B] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Transcript / Save PDF</span>
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
          {/* Green-White-Green Nigerian National Flag Ribbon on top */}
          <div className="h-2 w-full flex rounded-t-xl overflow-hidden mb-6 print:mb-4">
            <div className="bg-[#1B4D3E] flex-1"></div>
            <div className="bg-white flex-1 border-x border-[#E5E4D8]"></div>
            <div className="bg-[#1B4D3E] flex-1"></div>
          </div>

          {/* Watermark Seal */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <GraduationCap className="w-[450px] h-[450px] text-[#2D3321]" />
          </div>

          <div className="relative z-10 space-y-8">
            {/* Nigerian Institution Letterhead */}
            <div className="border-b-2 border-[#2D3321] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-[#1B4D3E] text-white flex flex-col items-center justify-center font-serif shadow-xs flex-shrink-0 border-2 border-[#D4AF37]">
                  <span className="text-xl font-bold">FUST</span>
                  <span className="text-[8px] uppercase tracking-widest font-sans font-semibold">NIGERIA</span>
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#1B4D3E] tracking-tight uppercase">
                    FEDERAL UNIVERSITY OF SCIENCE & TECHNOLOGY
                  </h2>
                  <p className="text-xs text-[#5C6847] font-semibold tracking-wide">
                    Office of the University Registrar • Directorate of Academic Affairs & Examinations
                  </p>
                  <p className="text-[11px] text-[#7A7D70] font-sans">
                    P.M.B. 1024, University Main Campus, Nigeria • Accredited by the National Universities Commission (NUC)
                  </p>
                </div>
              </div>

              {/* Official Verification Box */}
              <div className="p-3.5 bg-[#F2F1E9] border border-[#E5E4D8] rounded-xl text-right space-y-1">
                <div className="flex items-center justify-end space-x-1 text-[#1B4D3E] text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>OFFICIAL TRANSCRIPT</span>
                </div>
                <div className="text-[11px] font-mono text-[#7A7D70]">
                  Verification Code: <span className="font-bold text-[#2D3321]">{transcript.verification.code}</span>
                </div>
                <div className="text-[10px] text-[#7A7D70]">
                  Date of Issue: <span className="font-semibold text-[#2D3321]">{transcript.verification.issueDate}</span>
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
                <div className="w-16 h-16 rounded-xl bg-[#5C6847] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-xs">
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
                  <span className="font-mono font-bold text-[#1B4D3E] text-sm">{transcript.student.studentCode}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7D70] block">Faculty & Department</span>
                  <span className="font-semibold text-[#2D3321]">{transcript.student.department}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#7A7D70] block">Academic Standing</span>
                  <span className="font-bold text-[#1B4D3E]">{transcript.academicSummary.academicStanding}</span>
                </div>
              </div>
            </div>

            {/* Academic Semesters List */}
            <div className="space-y-6">
              {transcript.semesters.map((sem) => (
                <div key={sem.semesterId} className="space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#E5E4D8] text-xs">
                    <span className="font-serif font-bold text-[#2D3321] text-sm">
                      {sem.semesterName} ({sem.academicYear} Academic Session)
                    </span>
                    <div className="flex items-center space-x-3 text-[#7A7D70] font-mono text-[11px]">
                      <span>Units Registered: <strong className="text-[#2D3321]">{sem.semesterCreditsAttempted}</strong></span>
                      <span>•</span>
                      <span>Semester GPA: <strong className="text-[#1B4D3E]">{sem.semesterGpa.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F2F1E9] text-[#2D3321] text-[11px] font-bold border-b border-[#E5E4D8]">
                        <th className="py-2 px-3">Course Code</th>
                        <th className="py-2 px-3">Course Title</th>
                        <th className="py-2 px-3 text-center">Credit Units</th>
                        <th className="py-2 px-3 text-center">Final Score %</th>
                        <th className="py-2 px-3 text-center">Letter Grade</th>
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
                          <td className="py-2 px-3 text-center font-mono font-bold text-[#1B4D3E]">
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
            <div className="border-t-2 border-[#1B4D3E] pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F2F1E9] p-5 rounded-xl border border-[#E5E4D8]">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#7A7D70]">Degree Classification (NUC Standard)</span>
                <div className="flex items-center space-x-2">
                  <Award className="w-5 h-5 text-[#1B4D3E]" />
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
                  <span className="text-[#7A7D70] block text-[10px] uppercase font-bold">Total Units Earned</span>
                  <span className="font-mono font-bold text-[#2D3321] text-sm">
                    {transcript.academicSummary.totalCreditsEarned}
                  </span>
                </div>
                <div className="pl-4 border-l border-[#E5E4D8]">
                  <span className="text-[#7A7D70] block text-[10px] uppercase font-bold">Cumulative CGPA</span>
                  <span className="font-mono font-extrabold text-[#1B4D3E] text-xl">
                    {transcript.academicSummary.cumulativeGpa.toFixed(2)} / 5.00
                  </span>
                </div>
              </div>
            </div>

            {/* Dual Signatures & Registry Seal Stamps */}
            <div className="pt-8 border-t border-[#E5E4D8] grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-[#7A7D70]">
              <div className="space-y-1 text-left">
                <p className="text-[11px] font-sans font-medium text-[#3A3D30]">
                  Official Academic Transcript issued under Senate authority.
                </p>
                <p className="text-[10px] text-[#7A7D70]">
                  Grading Scale: NUC 5.0 Benchmark (A=5.0 [70-100%], B=4.0 [60-69%], C=3.0 [50-59%], D=2.0 [45-49%], E=1.0 [40-44%], F=0.0 [0-39%]).
                </p>
              </div>

              {/* Head of Department / Dean verification */}
              <div className="text-center space-y-2">
                <div className="font-serif italic text-sm text-[#2D3321] font-bold border-b border-[#7A7D70] pb-1 inline-block min-w-[180px]">
                  Dr. (Mrs.) Folashade Adebayo
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[#5C6847] font-bold">
                  Head of Department / Faculty Dean
                </div>
                <div className="text-[9px] text-[#7A7D70]">
                  Department of Computer Science & IT
                </div>
              </div>

              {/* Registrar signature */}
              <div className="text-right space-y-2">
                <div className="font-serif italic text-sm text-[#2D3321] font-bold border-b border-[#7A7D70] pb-1 inline-block min-w-[180px] text-center">
                  Mr. Ayanbade Olamilekan John
                </div>
                <div className="text-[10px] uppercase tracking-wider text-[#1B4D3E] font-bold">
                  University Registrar & Secretary to Senate
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

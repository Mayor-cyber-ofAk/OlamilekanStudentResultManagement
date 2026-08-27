import React, { useState, useEffect } from 'react';
import { User, Course } from '../types';
import { 
  GraduationCap, 
  Award, 
  Calculator, 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Plus, 
  Trash2, 
  FileText, 
  MessageSquare 
} from 'lucide-react';

interface StudentPortalViewProps {
  currentUser: User | null;
  courses: Course[];
  onOpenTranscript: () => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  currentUser,
  courses,
  onOpenTranscript
}) => {
  const [whatIfCourses, setWhatIfCourses] = useState([
    { id: '1', name: 'CSC 490 Senior Year Thesis & Capstone Project', credits: 6, projectedPoints: 5.0 },
    { id: '2', name: 'MTH 340 Numerical Analysis & Optimization', credits: 3, projectedPoints: 5.0 },
    { id: '3', name: 'CSC 422 Distributed Cloud Architectures', credits: 3, projectedPoints: 4.0 }
  ]);
  const [projectedGpaResult, setProjectedGpaResult] = useState<any>(null);
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<string | null>(null);
  const [courseBreakdown, setCourseBreakdown] = useState<any>(null);

  // Filter courses student is enrolled in
  const enrolledCourses = courses.filter(c => c.studentGrade !== null);

  // What-If Simulation runner
  const calculateWhatIf = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/students/${currentUser.id}/what-if-gpa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hypotheticalCourses: whatIfCourses.map(c => ({
            credits: c.credits,
            projectedGpaPoints: c.projectedPoints
          }))
        })
      });
      const data = await res.json();
      setProjectedGpaResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    calculateWhatIf();
  }, [whatIfCourses, currentUser]);

  // Load detailed components for student in a course
  const loadCourseDetail = async (courseId: string) => {
    setSelectedCourseDetail(courseId);
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook`);
      const data = await res.json();
      if (data.students && currentUser) {
        const myRow = data.students.find((s: any) => s.studentId === currentUser.id);
        setCourseBreakdown({
          components: data.components,
          myRow
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addWhatIfCourse = () => {
    setWhatIfCourses([
      ...whatIfCourses,
      { id: Date.now().toString(), name: 'General Elective Course', credits: 3, projectedPoints: 5.0 }
    ]);
  };

  const removeWhatIfCourse = (id: string) => {
    setWhatIfCourses(whatIfCourses.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Student Profile & Degree Progress Banner */}
      <div className="bg-[#F2F1E9] border border-[#E5E4D8] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#E5E4D8]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#7C8964] flex items-center justify-center text-white font-bold text-xl">
                {currentUser?.fullName.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-[#2D3321] tracking-tight">{currentUser?.fullName}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-[#EDF2E6] text-[#5C6847] font-mono text-[10px] font-bold border border-[#C8E6C9]">
                  First Class Standing (5.00 Scale)
                </span>
              </div>
              <p className="text-xs text-[#3A3D30]">
                Matriculation No: <span className="font-mono text-[#5C6847] font-bold">{currentUser?.studentId}</span> • {currentUser?.departmentName}
              </p>
              <p className="text-[11px] text-[#7A7D70]">
                Degree: Bachelor of Science (B.Sc. Hons) in Computer Science
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenTranscript}
              className="px-4 py-2 bg-[#7C8964] hover:bg-[#6C7954] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Official Academic Transcript</span>
            </button>
          </div>
        </div>

        {/* Degree Units Progress Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#E5E4D8] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#2D3321]">Curriculum Unit Progress (B.Sc. Requirement: 120 Academic Units)</span>
            <span className="font-mono font-bold text-[#5C6847]">48 / 120 Units (40%)</span>
          </div>
          <div className="w-full bg-[#EAE9DE] h-2.5 rounded-full overflow-hidden">
            <div className="bg-[#7C8964] h-full rounded-full" style={{ width: '40%' }} />
          </div>
        </div>
      </div>

      {/* Enrolled Courses & Detailed Breakdown */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#2D3321]">Active Enrolled Courses & Continuous Assessment Scores</h2>
            <p className="text-xs text-[#7A7D70]">Real-time grading computed under Continuous Assessment (CA) and Examination rubrics.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrolledCourses.map(course => {
            const grade = course.studentGrade;
            const isSelected = selectedCourseDetail === course.id;

            return (
              <div
                key={course.id}
                onClick={() => loadCourseDetail(course.id)}
                className={`bg-white border rounded-2xl p-5 shadow-xs space-y-3 cursor-pointer transition-all ${
                  isSelected ? 'border-[#7C8964] ring-2 ring-[#7C8964]/20' : 'border-[#E5E4D8] hover:border-[#7C8964]/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-[#7C8964] bg-[#EDF2E6] px-2 py-0.5 rounded border border-[#C8E6C9]">
                      {course.code}
                    </span>
                    <h3 className="font-bold text-[#2D3321] text-sm mt-1">{course.title}</h3>
                    <p className="text-xs text-[#7A7D70]">{course.instructorName}</p>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold font-mono text-[#2D3321]">
                      {grade?.letterGrade ?? 'N/A'}
                    </div>
                    <div className="text-[10px] text-[#5C6847] font-semibold">
                      {grade?.gpaPoints ? `${grade.gpaPoints.toFixed(1)} / 5.0 GP` : 'In Progress'}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E4D8] flex items-center justify-between text-xs text-[#7A7D70]">
                  <span>Total Cumulative Score:</span>
                  <span className="font-mono font-bold text-[#2D3321]">
                    {grade?.curvedScore ? `${grade.curvedScore.toFixed(1)}%` : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Course Assessment Breakdown */}
        {selectedCourseDetail && courseBreakdown && (
          <div className="bg-white border border-[#E5E4D8] rounded-2xl p-6 shadow-xs space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#2D3321]">
                  Component Breakdown & Lecturer Feedback
                </h3>
                <p className="text-xs text-[#7A7D70]">
                  Detailed itemization of Continuous Assessment (CA) and Semester Examination components.
                </p>
              </div>
              <button
                onClick={() => setSelectedCourseDetail(null)}
                className="text-xs text-[#7A7D70] hover:text-[#2D3321] underline"
              >
                Hide Breakdown
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F2F1E9] text-[#2D3321] font-bold border-b border-[#E5E4D8]">
                    <th className="py-2.5 px-3">Assessment Rubric</th>
                    <th className="py-2.5 px-3 text-center">Weight</th>
                    <th className="py-2.5 px-3 text-center">Score / Max</th>
                    <th className="py-2.5 px-3">Percentage</th>
                    <th className="py-2.5 px-3">Lecturer Note & Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E4D8]">
                  {courseBreakdown.components.map((comp: any) => {
                    const g = courseBreakdown.myRow?.grades?.[comp.id];
                    const score = g?.score ?? null;
                    return (
                      <tr key={comp.id} className="hover:bg-[#FDFCF7]">
                        <td className="py-2.5 px-3 font-medium text-[#2D3321]">{comp.name}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#7A7D70]">{comp.weightPercent}%</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-[#2D3321]">
                          {score !== null ? `${score} / ${comp.maxScore}` : 'Pending'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#5C6847] font-bold">
                          {score !== null ? `${((score / comp.maxScore) * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-[#3A3D30] italic">
                          {g?.feedback ? `"${g.feedback}"` : <span className="text-[#A3A295]">Verified</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Interactive "What-If" GPA Scenario Simulator */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-[#7C8964]">
            <Calculator className="w-5 h-5" />
            <h2 className="text-base font-bold text-[#2D3321]">"What-If" Target CGPA Simulator (NUC 5.0 Scale)</h2>
          </div>
          <button
            onClick={addWhatIfCourse}
            className="px-3 py-1.5 bg-[#F2F1E9] hover:bg-[#EAE9DE] text-[#2D3321] rounded-xl text-xs font-semibold flex items-center space-x-1 border border-[#E5E4D8] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#7C8964]" />
            <span>Add Hypothetical Course</span>
          </button>
        </div>
        <p className="text-xs text-[#7A7D70]">
          Simulate prospective course grades or upcoming terms to see the exact mathematical impact on your cumulative CGPA and Degree Classification.
        </p>

        {/* What-If Courses List */}
        <div className="space-y-2.5">
          {whatIfCourses.map((c, idx) => (
            <div key={c.id} className="p-3 bg-[#FDFCF7] border border-[#E5E4D8] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex-1">
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => {
                    const next = [...whatIfCourses];
                    next[idx].name = e.target.value;
                    setWhatIfCourses(next);
                  }}
                  className="w-full bg-white border border-[#E5E4D8] rounded-lg px-2.5 py-1 text-[#2D3321] font-semibold"
                />
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-[#7A7D70] font-medium">Units:</span>
                  <select
                    value={c.credits}
                    onChange={(e) => {
                      const next = [...whatIfCourses];
                      next[idx].credits = Number(e.target.value);
                      setWhatIfCourses(next);
                    }}
                    className="bg-white border border-[#E5E4D8] text-[#2D3321] rounded-lg px-2 py-1"
                  >
                    <option value={1}>1 Unit</option>
                    <option value={2}>2 Units</option>
                    <option value={3}>3 Units</option>
                    <option value={4}>4 Units</option>
                    <option value={6}>6 Units</option>
                  </select>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span className="text-[#7A7D70] font-medium">Target Grade:</span>
                  <select
                    value={c.projectedPoints}
                    onChange={(e) => {
                      const next = [...whatIfCourses];
                      next[idx].projectedPoints = Number(e.target.value);
                      setWhatIfCourses(next);
                    }}
                    className="bg-white border border-[#E5E4D8] text-[#2D3321] rounded-lg px-2 py-1 font-mono font-bold"
                  >
                    <option value={5.0}>A (5.0) - First Class (70-100%)</option>
                    <option value={4.0}>B (4.0) - 2:1 Upper (60-69%)</option>
                    <option value={3.0}>C (3.0) - 2:2 Lower (50-59%)</option>
                    <option value={2.0}>D (2.0) - Third Class (45-49%)</option>
                    <option value={1.0}>E (1.0) - Pass (40-44%)</option>
                    <option value={0.0}>F (0.0) - Fail (0-39%)</option>
                  </select>
                </div>

                <button
                  onClick={() => removeWhatIfCourse(c.id)}
                  className="text-[#7A7D70] hover:text-[#B83A3A] p-1 transition-colors cursor-pointer"
                  title="Remove course"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Projection Outcome Banner */}
        {projectedGpaResult && (
          <div className="bg-[#EDF2E6] p-4 rounded-xl border border-[#C8E6C9] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase text-[#5C6847]">Projected CGPA Standing</div>
              <div className="text-xs text-[#3A3D30]">
                Current CGPA: <strong className="text-[#2D3321]">{projectedGpaResult.currentGpa.toFixed(2)}</strong> across {projectedGpaResult.currentCredits} registered units
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-[10px] text-[#7A7D70] uppercase font-bold">Projected New CGPA</div>
                <div className="text-xl font-extrabold font-mono text-[#5C6847]">
                  {projectedGpaResult.projectedGpa.toFixed(2)} / 5.00
                </div>
              </div>

              <div className="px-2.5 py-1 rounded-lg bg-white text-[#5C6847] font-mono text-xs font-bold border border-[#C8E6C9] shadow-xs">
                {projectedGpaResult.delta >= 0 ? `+${projectedGpaResult.delta.toFixed(2)}` : `${projectedGpaResult.delta.toFixed(2)}`}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

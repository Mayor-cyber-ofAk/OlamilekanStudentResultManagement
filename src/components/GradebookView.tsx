import React, { useState, useEffect } from 'react';
import { Course, StudentGradebookRow, AssessmentComponent } from '../types';
import { 
  Calculator, 
  Sparkles, 
  Sliders, 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Plus, 
  Trash2, 
  Check, 
  AlertCircle, 
  Save, 
  Send,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';

interface GradebookViewProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (id: string) => void;
  onTriggerRecalculate?: () => void;
}

export const GradebookView: React.FC<GradebookViewProps> = ({
  courses,
  selectedCourseId,
  onSelectCourse,
  onTriggerRecalculate
}) => {
  const [loading, setLoading] = useState(false);
  const [components, setComponents] = useState<AssessmentComponent[]>([]);
  const [students, setStudents] = useState<StudentGradebookRow[]>([]);
  const [dirtyGrades, setDirtyGrades] = useState<Record<string, { score: any; isExcused: boolean; feedback: string }>>({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [showCurveModal, setShowCurveModal] = useState(false);
  const [showComponentsModal, setShowComponentsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState<{
    enrollmentId: string;
    componentId: string;
    studentName: string;
    componentName: string;
    feedback: string;
  } | null>(null);

  // Curve settings state
  const [curveOffset, setCurveOffset] = useState<number>(0);
  const [curveType, setCurveType] = useState<string>('flat');

  // New component form state
  const [newCompName, setNewCompName] = useState('');
  const [newCompType, setNewCompType] = useState<any>('assignment');
  const [newCompMax, setNewCompMax] = useState<number>(100);
  const [newCompWeight, setNewCompWeight] = useState<number>(15);

  // CSV import text
  const [importCsvText, setImportCsvText] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  // Fetch gradebook data
  const loadGradebook = async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/gradebook`);
      const data = await res.json();
      if (data.components && data.students) {
        setComponents(data.components);
        setStudents(data.students);
        setDirtyGrades({});
      }
    } catch (err) {
      console.error('Error loading gradebook:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadGradebook(selectedCourseId);
      if (selectedCourse) {
        setCurveOffset(selectedCourse.curveOffset || 0);
        setCurveType(selectedCourse.curveType || 'flat');
      }
    }
  }, [selectedCourseId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Handle Score Input Change
  const handleScoreChange = (enrollmentId: string, componentId: string, value: string) => {
    const key = `${enrollmentId}_${componentId}`;
    const prev = dirtyGrades[key] || {
      score: students.find(s => s.enrollmentId === enrollmentId)?.grades[componentId]?.score ?? '',
      isExcused: students.find(s => s.enrollmentId === enrollmentId)?.grades[componentId]?.isExcused ?? false,
      feedback: students.find(s => s.enrollmentId === enrollmentId)?.grades[componentId]?.feedback ?? ''
    };

    setDirtyGrades(prevMap => ({
      ...prevMap,
      [key]: {
        ...prev,
        score: value === '' ? null : Number(value)
      }
    }));
  };

  // Handle Excused Toggle
  const handleExcusedToggle = (enrollmentId: string, componentId: string) => {
    const key = `${enrollmentId}_${componentId}`;
    const currentExcused = dirtyGrades[key]?.isExcused ?? students.find(s => s.enrollmentId === enrollmentId)?.grades[componentId]?.isExcused ?? false;
    const currentScore = dirtyGrades[key]?.score ?? students.find(s => s.enrollmentId === enrollmentId)?.grades[componentId]?.score ?? null;
    const currentFeedback = dirtyGrades[key]?.feedback ?? students.find(s => s.enrollmentId === enrollmentId)?.grades[componentId]?.feedback ?? '';

    setDirtyGrades(prevMap => ({
      ...prevMap,
      [key]: {
        score: currentScore,
        isExcused: !currentExcused,
        feedback: currentFeedback
      }
    }));
  };

  // Save pending grades to server with automatic calculation run
  const handleSaveGrades = async () => {
    if (!selectedCourseId) return;
    setSaving(true);

    const updates = Object.entries(dirtyGrades).map(([key, val]: [string, { score: any; isExcused: boolean; feedback: string }]) => {
      const [enrollmentId, componentId] = key.split('_');
      return {
        enrollmentId,
        componentId,
        score: val.score,
        isExcused: val.isExcused,
        feedback: val.feedback
      };
    });

    try {
      const res = await fetch(`/api/courses/${selectedCourseId}/batch-grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Saved and calculated ${updates.length} score entries successfully.`);
        await loadGradebook(selectedCourseId);
        if (onTriggerRecalculate) onTriggerRecalculate();
      } else {
        alert(data.error || 'Failed to save grades');
      }
    } catch (err: any) {
      alert('Error saving grades: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Apply Curve
  const handleApplyCurve = async () => {
    if (!selectedCourseId) return;
    try {
      const res = await fetch(`/api/courses/${selectedCourseId}/curve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ curveOffset, curveType })
      });

      if (res.ok) {
        showToast(`Applied ${curveType} curve (${curveOffset > 0 ? '+' : ''}${curveOffset}%) to course.`);
        setShowCurveModal(false);
        await loadGradebook(selectedCourseId);
        if (onTriggerRecalculate) onTriggerRecalculate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Component
  const handleAddComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) return;

    try {
      const res = await fetch(`/api/courses/${selectedCourseId}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompName,
          type: newCompType,
          maxScore: newCompMax,
          weightPercent: newCompWeight
        })
      });

      if (res.ok) {
        showToast(`Added assessment component: ${newCompName}`);
        setNewCompName('');
        await loadGradebook(selectedCourseId);
        if (onTriggerRecalculate) onTriggerRecalculate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Component
  const handleDeleteComponent = async (compId: string) => {
    if (!confirm('Are you sure you want to remove this assessment component and its grades?')) return;
    try {
      const res = await fetch(`/api/courses/${selectedCourseId}/components/${compId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Assessment component removed.');
        await loadGradebook(selectedCourseId);
        if (onTriggerRecalculate) onTriggerRecalculate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Publish Official Grades
  const handlePublishGrades = async () => {
    if (!confirm('Are you ready to publish final letter grades and GPA points to student transcripts?')) return;
    try {
      const res = await fetch(`/api/courses/${selectedCourseId}/publish`, { method: 'POST' });
      if (res.ok) {
        showToast('All student grades have been officially published.');
        await loadGradebook(selectedCourseId);
        if (onTriggerRecalculate) onTriggerRecalculate();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!selectedCourse || students.length === 0) return;

    const headers = ['Student ID', 'Student Name', 'Email', ...components.map(c => `${c.name} (${c.weightPercent}%) [Max ${c.maxScore}]`), 'Raw Total %', 'Curved %', 'Letter Grade', 'GPA Points', 'Status'];
    
    const rows = students.map(s => {
      const compValues = components.map(c => {
        const g = s.grades[c.id];
        if (g?.isExcused) return 'EXCUSED';
        return g?.score !== null && g?.score !== undefined ? g.score : '';
      });

      return [
        s.studentCode,
        `"${s.studentName}"`,
        s.studentEmail,
        ...compValues,
        s.rawScore,
        s.curvedScore,
        s.letterGrade,
        s.gpaPoints,
        s.rawScore >= (selectedCourse.passThreshold || 60) ? 'PASS' : 'FAIL'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedCourse.code}_Gradebook_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV text for import preview
  const handleParseCsv = (text: string) => {
    setImportCsvText(text);
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setImportPreview([]);
      return;
    }

    const preview = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (parts.length >= 2) {
        preview.push({
          studentCode: parts[0],
          studentName: parts[1],
          scores: parts.slice(3)
        });
      }
    }
    setImportPreview(preview);
  };

  const totalWeight = components.reduce((acc, c) => acc + c.weightPercent, 0);
  const isWeight100 = Math.abs(totalWeight - 100) < 0.1;
  const dirtyCount = Object.keys(dirtyGrades).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-white border border-[#7C8964] text-[#2D3321] px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs animate-in slide-in-from-bottom-2 duration-200">
          <Check className="w-4 h-4 text-[#7C8964]" />
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header Toolbar & Course Selection */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#7C8964] uppercase tracking-wider">
                Automated Calculation Engine
              </span>
              <span className="text-[#A3A295]">•</span>
              <span className="text-xs text-[#7A7D70] font-mono font-medium">Weighted Matrix Mode</span>
            </div>
            <h1 className="text-xl font-bold text-[#2D3321] tracking-tight flex items-center space-x-2">
              <span>{selectedCourse?.code}: {selectedCourse?.title}</span>
            </h1>
            <p className="text-xs text-[#7A7D70]">
              Instructor: <span className="text-[#2D3321] font-medium">{selectedCourse?.instructorName}</span> • Term: <span className="text-[#2D3321] font-medium">{selectedCourse?.semesterName}</span>
            </p>
          </div>

          {/* Course Selector Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              id="select-active-course"
              value={selectedCourseId}
              onChange={(e) => onSelectCourse(e.target.value)}
              className="bg-[#FDFCF7] border border-[#E5E4D8] text-[#2D3321] rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#7C8964]"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>

            <button
              id="btn-curve-studio"
              onClick={() => setShowCurveModal(true)}
              className="px-3 py-2 bg-[#F2F1E9] hover:bg-[#EAE9DE] border border-[#E5E4D8] text-[#2D3321] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Sliders className="w-3.5 h-3.5 text-[#7C8964]" />
              <span>Curve Studio {selectedCourse?.curveOffset ? `(+${selectedCourse.curveOffset}%)` : ''}</span>
            </button>

            <button
              id="btn-manage-components"
              onClick={() => setShowComponentsModal(true)}
              className="px-3 py-2 bg-[#F2F1E9] hover:bg-[#EAE9DE] border border-[#E5E4D8] text-[#2D3321] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-[#7C8964]" />
              <span>Rubric Weights</span>
            </button>

            <button
              id="btn-export-csv"
              onClick={handleExportCsv}
              className="px-3 py-2 bg-[#F2F1E9] hover:bg-[#EAE9DE] border border-[#E5E4D8] text-[#2D3321] rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs"
              title="Export Gradebook to CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#7A7D70]" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Weights Integrity Bar */}
        <div className="bg-[#FDFCF7] border border-[#E5E4D8] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className={`px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] flex items-center space-x-1 ${
              isWeight100 ? 'bg-[#EDF2E6] text-[#5C6847] border border-[#C8E6C9]' : 'bg-[#FBF2ED] text-[#C88A68] border border-[#FFE0B2]'
            }`}>
              {isWeight100 ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>Total Weight: {totalWeight.toFixed(1)}%</span>
            </div>
            <span className="text-[#7A7D70] text-[11px] font-medium">
              {isWeight100 
                ? 'Component weights mathematically balanced to 100%.' 
                : `Weights must sum to 100% (currently ${totalWeight > 100 ? 'over' : 'under'} by ${Math.abs(100 - totalWeight).toFixed(1)}%).`}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {dirtyCount > 0 && (
              <button
                id="btn-save-grades"
                onClick={handleSaveGrades}
                disabled={saving}
                className="px-4 py-1.5 bg-[#7C8964] hover:bg-[#6C7954] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all animate-pulse"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Calculating...' : `Save & Auto-Calculate (${dirtyCount})`}</span>
              </button>
            )}

            <button
              id="btn-publish-grades"
              onClick={handlePublishGrades}
              className="px-3.5 py-1.5 bg-[#5C6847] hover:bg-[#4E583C] text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Official</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Gradebook Matrix Table */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F2F1E9] text-[#2D3321] text-xs border-b border-[#E5E4D8] font-bold">
                <th className="py-3 px-4 sticky left-0 bg-[#F2F1E9] z-20 min-w-[220px]">
                  Student Name & ID
                </th>
                {components.map(comp => (
                  <th key={comp.id} className="py-3 px-4 min-w-[130px] border-l border-[#E5E4D8]">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#2D3321] truncate">{comp.name}</span>
                      <span className="text-[10px] text-[#7C8964] font-mono font-semibold">
                        {comp.weightPercent}% wt • Max {comp.maxScore}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 min-w-[100px] border-l border-[#E5E4D8] bg-[#EAE9DE]/50 text-center">
                  Raw %
                </th>
                <th className="py-3 px-4 min-w-[110px] border-l border-[#E5E4D8] bg-[#EAE9DE]/50 text-center">
                  Curved %
                </th>
                <th className="py-3 px-4 min-w-[90px] border-l border-[#E5E4D8] bg-[#EAE9DE]/50 text-center">
                  Letter
                </th>
                <th className="py-3 px-4 min-w-[80px] border-l border-[#E5E4D8] bg-[#EAE9DE]/50 text-center">
                  GPA
                </th>
                <th className="py-3 px-4 min-w-[90px] border-l border-[#E5E4D8] bg-[#EAE9DE]/50 text-center">
                  Standing
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E5E4D8] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={components.length + 6} className="py-12 text-center text-[#7A7D70]">
                    Loading synchronized grade matrix...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={components.length + 6} className="py-12 text-center text-[#7A7D70]">
                    No enrolled students found for this course section.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const isPassed = student.curvedScore >= (selectedCourse?.passThreshold || 60);

                  return (
                    <tr key={student.enrollmentId} className="hover:bg-[#FDFCF7] transition-colors">
                      {/* Student Info Sticky Column */}
                      <td className="py-3 px-4 sticky left-0 bg-white hover:bg-[#FDFCF7] z-10 border-r border-[#E5E4D8]">
                        <div className="flex items-center space-x-2.5">
                          {student.studentAvatar ? (
                            <img
                              src={student.studentAvatar}
                              alt={student.studentName}
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-[#E5E4D8]"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#EAE9DE] flex items-center justify-center text-[10px] font-bold text-[#2D3321]">
                              {student.studentName.charAt(0)}
                            </div>
                          )}
                          <div className="truncate">
                            <div className="font-bold text-[#2D3321] truncate">{student.studentName}</div>
                            <div className="text-[10px] font-mono text-[#7A7D70]">{student.studentCode}</div>
                          </div>
                        </div>
                      </td>

                      {/* Component Grade Cells */}
                      {components.map(comp => {
                        const gradeData = student.grades[comp.id];
                        const key = `${student.enrollmentId}_${comp.id}`;
                        const isDirty = dirtyGrades[key] !== undefined;
                        const currentScore = isDirty ? dirtyGrades[key].score : gradeData?.score;
                        const isExcused = isDirty ? dirtyGrades[key].isExcused : (gradeData?.isExcused ?? false);
                        const feedback = isDirty ? dirtyGrades[key].feedback : (gradeData?.feedback ?? '');

                        return (
                          <td key={comp.id} className="py-2 px-3 border-l border-[#E5E4D8]">
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={comp.maxScore * 1.5}
                                  step={0.5}
                                  disabled={isExcused}
                                  value={currentScore !== null && currentScore !== undefined ? currentScore : ''}
                                  placeholder="—"
                                  onChange={(e) => handleScoreChange(student.enrollmentId, comp.id, e.target.value)}
                                  className={`w-16 px-2 py-1 rounded-lg text-center font-mono text-xs font-bold focus:outline-none transition-all ${
                                    isExcused
                                      ? 'bg-[#F2F1E9] text-[#A3A295] line-through'
                                      : isDirty
                                      ? 'bg-[#FBF2ED] text-[#C88A68] border border-[#D69E7E]'
                                      : 'bg-[#FDFCF7] text-[#2D3321] border border-[#E5E4D8] focus:border-[#7C8964]'
                                  }`}
                                />

                                {/* Feedback icon button */}
                                <button
                                  type="button"
                                  onClick={() => setShowFeedbackModal({
                                    enrollmentId: student.enrollmentId,
                                    componentId: comp.id,
                                    studentName: student.studentName,
                                    componentName: comp.name,
                                    feedback
                                  })}
                                  title={feedback ? `Feedback: ${feedback}` : 'Add feedback note'}
                                  className={`p-1 rounded hover:bg-[#F2F1E9] transition-colors ${
                                    feedback ? 'text-[#7C8964]' : 'text-[#A3A295] hover:text-[#2D3321]'
                                  }`}
                                >
                                  <MessageSquare className="w-3 h-3" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between text-[10px]">
                                <label className="flex items-center space-x-1 text-[#7A7D70] hover:text-[#2D3321] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isExcused}
                                    onChange={() => handleExcusedToggle(student.enrollmentId, comp.id)}
                                    className="rounded border-[#E5E4D8] bg-[#FDFCF7] text-[#7C8964] focus:ring-0 w-3 h-3"
                                  />
                                  <span>Excused</span>
                                </label>

                                {currentScore !== null && currentScore !== undefined && !isExcused && (
                                  <span className="font-mono text-[#7A7D70]">
                                    {((currentScore / comp.maxScore) * 100).toFixed(0)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}

                      {/* Calculated Columns */}
                      <td className="py-3 px-4 border-l border-[#E5E4D8] bg-[#FDFCF7] text-center font-mono font-bold text-[#2D3321]">
                        {student.rawScore.toFixed(1)}%
                      </td>

                      <td className="py-3 px-4 border-l border-[#E5E4D8] bg-[#FDFCF7] text-center">
                        <span className="font-mono font-bold text-[#2D3321] text-xs">
                          {student.curvedScore.toFixed(1)}%
                        </span>
                        {selectedCourse?.curveOffset > 0 && (
                          <div className="text-[9px] text-[#C88A68] font-mono font-semibold">
                            (+{selectedCourse.curveOffset}%)
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 border-l border-[#E5E4D8] bg-[#FDFCF7] text-center">
                        <span className={`px-2.5 py-0.5 rounded-md font-bold font-mono text-xs ${
                          student.letterGrade.startsWith('A') ? 'bg-[#EDF2E6] text-[#5C6847] border border-[#C8E6C9]' :
                          student.letterGrade.startsWith('B') ? 'bg-[#EEF4F8] text-[#38647A] border border-[#C2DBEC]' :
                          student.letterGrade.startsWith('C') ? 'bg-[#FFF9E6] text-[#8C6D23] border border-[#FFE8A3]' :
                          student.letterGrade.startsWith('D') ? 'bg-[#FBF2ED] text-[#C88A68] border border-[#FFE0B2]' :
                          'bg-[#FDECEC] text-[#B83A3A] border border-[#F8C8C8]'
                        }`}>
                          {student.letterGrade}
                        </span>
                      </td>

                      <td className="py-3 px-4 border-l border-[#E5E4D8] bg-[#FDFCF7] text-center font-mono font-bold text-[#5C6847]">
                        {student.gpaPoints.toFixed(2)}
                      </td>

                      <td className="py-3 px-4 border-l border-[#E5E4D8] bg-[#FDFCF7] text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPassed ? 'bg-[#EDF2E6] text-[#5C6847] border border-[#C8E6C9]' : 'bg-[#FDECEC] text-[#B83A3A] border border-[#F8C8C8]'
                        }`}>
                          {isPassed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Curve Studio Modal */}
      {showCurveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E4D8] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E4D8]">
              <div className="flex items-center space-x-2 text-[#7C8964]">
                <Sliders className="w-5 h-5" />
                <h3 className="text-base font-bold text-[#2D3321]">Curve Studio & Grading Model</h3>
              </div>
              <button onClick={() => setShowCurveModal(false)} className="text-[#7A7D70] hover:text-[#2D3321] text-xs font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#2D3321] font-semibold mb-1">Curve Algorithm Type</label>
                <select
                  value={curveType}
                  onChange={(e) => setCurveType(e.target.value)}
                  className="w-full bg-[#FDFCF7] border border-[#E5E4D8] rounded-xl px-3 py-2 text-[#2D3321] focus:ring-2 focus:ring-[#7C8964]"
                >
                  <option value="flat">Linear Flat Offset (+X% to raw score)</option>
                  <option value="sqrt">Square Root Curve (10 * √score + Offset)</option>
                  <option value="none">No Curve (Pure Raw Score)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#2D3321] font-semibold mb-1">Curve Offset Percentage (%)</label>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min={0}
                    max={15}
                    step={0.5}
                    value={curveOffset}
                    onChange={(e) => setCurveOffset(Number(e.target.value))}
                    className="w-full accent-[#7C8964] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-[#5C6847] text-sm min-w-[50px] text-right">
                    +{curveOffset}%
                  </span>
                </div>
              </div>

              <div className="bg-[#FDFCF7] p-3.5 rounded-xl border border-[#E5E4D8] text-[#7A7D70] space-y-1">
                <span className="text-[11px] font-bold text-[#2D3321]">Live Mathematical Simulation:</span>
                <p className="text-[11px]">
                  A raw score of <strong>82.0%</strong> will become{' '}
                  <strong className="text-[#5C6847]">
                    {curveType === 'sqrt' 
                      ? Math.min(100, 10 * Math.sqrt(82) + curveOffset).toFixed(1)
                      : Math.min(100, 82 + curveOffset).toFixed(1)}%
                  </strong>{' '}
                  under the selected curve model.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[#E5E4D8]">
              <button
                onClick={() => setShowCurveModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-[#F2F1E9] text-[#2D3321] border border-[#E5E4D8] text-xs font-semibold hover:bg-[#EAE9DE]"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCurve}
                className="px-4 py-1.5 rounded-xl bg-[#7C8964] text-white text-xs font-bold hover:bg-[#6C7954] shadow-xs"
              >
                Apply & Recalculate Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Components / Rubric Weighting Modal */}
      {showComponentsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E4D8] rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E4D8]">
              <div>
                <h3 className="text-base font-bold text-[#2D3321]">Assessment Components & Rubric Weights</h3>
                <p className="text-xs text-[#7A7D70]">Configure assignments, tests, and component weight percentages.</p>
              </div>
              <button onClick={() => setShowComponentsModal(false)} className="text-[#7A7D70] hover:text-[#2D3321] text-xs font-bold">✕</button>
            </div>

            {/* List of existing components */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#7C8964] uppercase tracking-wider">Active Components</span>
              {components.map(comp => (
                <div key={comp.id} className="p-3 bg-[#FDFCF7] border border-[#E5E4D8] rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-[#2D3321]">{comp.name}</div>
                    <div className="text-[11px] text-[#7A7D70] capitalize">
                      {comp.type} • Max Score: {comp.maxScore} pts
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="px-2.5 py-1 rounded-md bg-[#EDF2E6] text-[#5C6847] font-mono font-bold text-xs border border-[#E5E4D8]">
                      {comp.weightPercent}% wt
                    </span>
                    <button
                      onClick={() => handleDeleteComponent(comp.id)}
                      className="p-1.5 rounded-lg text-[#7A7D70] hover:text-[#B83A3A] hover:bg-[#FDECEC] transition-colors"
                      title="Delete component"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new component form */}
            <form onSubmit={handleAddComponent} className="p-4 bg-[#F2F1E9] border border-[#E5E4D8] rounded-xl space-y-3">
              <span className="text-xs font-bold text-[#7C8964] uppercase tracking-wider">Add New Assessment</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[#2D3321] font-semibold mb-1">Component Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lab 3: Spatial Indexing"
                    value={newCompName}
                    onChange={(e) => setNewCompName(e.target.value)}
                    className="w-full bg-white border border-[#E5E4D8] rounded-lg px-3 py-1.5 text-[#2D3321]"
                  />
                </div>

                <div>
                  <label className="block text-[#2D3321] font-semibold mb-1">Type</label>
                  <select
                    value={newCompType}
                    onChange={(e) => setNewCompType(e.target.value)}
                    className="w-full bg-white border border-[#E5E4D8] rounded-lg px-3 py-1.5 text-[#2D3321]"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="quiz">Quiz</option>
                    <option value="midterm">Midterm Exam</option>
                    <option value="final_exam">Final Exam</option>
                    <option value="project">Project</option>
                    <option value="lab">Lab Assessment</option>
                    <option value="attendance">Attendance & Participation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#2D3321] font-semibold mb-1">Max Score (Points)</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    required
                    value={newCompMax}
                    onChange={(e) => setNewCompMax(Number(e.target.value))}
                    className="w-full bg-white border border-[#E5E4D8] rounded-lg px-3 py-1.5 text-[#2D3321]"
                  />
                </div>

                <div>
                  <label className="block text-[#2D3321] font-semibold mb-1">Weight Percentage (%)</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={0.5}
                    required
                    value={newCompWeight}
                    onChange={(e) => setNewCompWeight(Number(e.target.value))}
                    className="w-full bg-white border border-[#E5E4D8] rounded-lg px-3 py-1.5 text-[#2D3321]"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#7C8964] hover:bg-[#6C7954] text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Component</span>
                </button>
              </div>
            </form>

            <div className="flex justify-end pt-2 border-t border-[#E5E4D8]">
              <button
                onClick={() => setShowComponentsModal(false)}
                className="px-4 py-2 bg-[#F2F1E9] hover:bg-[#EAE9DE] text-[#2D3321] border border-[#E5E4D8] rounded-xl text-xs font-semibold"
              >
                Close Rubric Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Note Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E4D8] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E4D8]">
              <div>
                <h3 className="text-sm font-bold text-[#2D3321]">Assessment Feedback Note</h3>
                <p className="text-xs text-[#7A7D70]">
                  {showFeedbackModal.studentName} • {showFeedbackModal.componentName}
                </p>
              </div>
              <button onClick={() => setShowFeedbackModal(null)} className="text-[#7A7D70] hover:text-[#2D3321] text-xs font-bold">✕</button>
            </div>

            <textarea
              rows={4}
              value={showFeedbackModal.feedback}
              onChange={(e) => setShowFeedbackModal({ ...showFeedbackModal, feedback: e.target.value })}
              placeholder="Provide constructive feedback for student review..."
              className="w-full bg-[#FDFCF7] border border-[#E5E4D8] rounded-xl p-3 text-xs text-[#2D3321] focus:ring-2 focus:ring-[#7C8964]"
            />

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowFeedbackModal(null)}
                className="px-3.5 py-1.5 bg-[#F2F1E9] text-[#2D3321] border border-[#E5E4D8] rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const key = `${showFeedbackModal.enrollmentId}_${showFeedbackModal.componentId}`;
                  const prev = dirtyGrades[key] || {
                    score: students.find(s => s.enrollmentId === showFeedbackModal.enrollmentId)?.grades[showFeedbackModal.componentId]?.score ?? null,
                    isExcused: students.find(s => s.enrollmentId === showFeedbackModal.enrollmentId)?.grades[showFeedbackModal.componentId]?.isExcused ?? false,
                    feedback: ''
                  };
                  setDirtyGrades({
                    ...dirtyGrades,
                    [key]: { ...prev, feedback: showFeedbackModal.feedback }
                  });
                  setShowFeedbackModal(null);
                  showToast('Feedback recorded. Click "Save & Auto-Calculate" to commit.');
                }}
                className="px-4 py-1.5 bg-[#7C8964] hover:bg-[#6C7954] text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Save Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

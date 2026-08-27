import React, { useState, useEffect } from 'react';
import { Course, CourseAnalytics } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Activity,
  Layers,
  Sparkles
} from 'lucide-react';

interface AnalyticsViewProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (id: string) => void;
}

const GRADE_COLORS: Record<string, string> = {
  'A': '#7C8964',
  'A-': '#8E9C76',
  'B+': '#5B8C6A',
  'B': '#709F7F',
  'B-': '#85B294',
  'C+': '#D69E7E',
  'C': '#E2B296',
  'C-': '#ECC5AF',
  'D+': '#C88A68',
  'D': '#D99B7A',
  'F': '#B83A3A'
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  courses,
  selectedCourseId,
  onSelectCourse
}) => {
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAnalytics = async (courseId: string) => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadAnalytics(selectedCourseId);
    }
  }, [selectedCourseId]);

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  return (
    <div className="space-y-6">
      {/* Header & Course Switcher */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#7C8964] uppercase tracking-wider">
                Statistical Analytics & Bell Curve
              </span>
              <span className="text-[#A3A295]">•</span>
              <span className="text-xs text-[#7A7D70]">Normal Distribution Assessment</span>
            </div>
            <h1 className="text-xl font-bold text-[#2D3321] tracking-tight">
              {selectedCourse?.code}: Performance Distribution & Curving Analytics
            </h1>
            <p className="text-xs text-[#7A7D70]">
              Department of {selectedCourse?.departmentName} • Term: {selectedCourse?.semesterName}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={selectedCourseId}
              onChange={(e) => onSelectCourse(e.target.value)}
              className="bg-[#FDFCF7] border border-[#E5E4D8] text-[#2D3321] rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#7C8964]"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading || !analytics ? (
        <div className="bg-white border border-[#E5E4D8] rounded-2xl p-12 text-center text-[#7A7D70] text-xs shadow-xs">
          Computing real-time statistical curves and score frequency distributions...
        </div>
      ) : (
        <>
          {/* Statistical Metric Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-[#E5E4D8] rounded-xl p-3.5 space-y-1 shadow-xs">
              <div className="text-[11px] font-medium text-[#7A7D70]">Class Mean (μ)</div>
              <div className="text-xl font-bold text-[#2D3321] font-mono">{analytics.metrics.mean}%</div>
              <div className="text-[10px] text-[#A3A295] font-mono">Raw: {analytics.metrics.rawMean}%</div>
            </div>

            <div className="bg-white border border-[#E5E4D8] rounded-xl p-3.5 space-y-1 shadow-xs">
              <div className="text-[11px] font-medium text-[#7A7D70]">Median Score</div>
              <div className="text-xl font-bold text-[#5C6847] font-mono">{analytics.metrics.median}%</div>
              <div className="text-[10px] text-[#7C8964]">50th Percentile</div>
            </div>

            <div className="bg-white border border-[#E5E4D8] rounded-xl p-3.5 space-y-1 shadow-xs">
              <div className="text-[11px] font-medium text-[#7A7D70]">Std Deviation (σ)</div>
              <div className="text-xl font-bold text-[#2D3321] font-mono">±{analytics.metrics.stdDev}%</div>
              <div className="text-[10px] text-[#7A7D70]">Spread factor</div>
            </div>

            <div className="bg-white border border-[#E5E4D8] rounded-xl p-3.5 space-y-1 shadow-xs">
              <div className="text-[11px] font-medium text-[#7A7D70]">Pass Rate</div>
              <div className="text-xl font-bold text-[#5C6847] font-mono">{analytics.metrics.passRate}%</div>
              <div className="text-[10px] text-[#7A7D70]">{analytics.metrics.passedCount}/{analytics.metrics.totalEnrolled} Passed</div>
            </div>

            <div className="bg-white border border-[#E5E4D8] rounded-xl p-3.5 space-y-1 shadow-xs">
              <div className="text-[11px] font-medium text-[#7A7D70]">Highest Score</div>
              <div className="text-xl font-bold text-[#38647A] font-mono">{analytics.metrics.highest}%</div>
              <div className="text-[10px] text-[#7A7D70]">Cohort Max</div>
            </div>

            <div className="bg-white border border-[#E5E4D8] rounded-xl p-3.5 space-y-1 shadow-xs">
              <div className="text-[11px] font-medium text-[#7A7D70]">Lowest Score</div>
              <div className="text-xl font-bold text-[#B83A3A] font-mono">{analytics.metrics.lowest}%</div>
              <div className="text-[10px] text-[#7A7D70]">Cohort Min</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grade Distribution Bar Chart */}
            <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#2D3321]">Letter Grade Distribution</h2>
                  <p className="text-xs text-[#7A7D70]">Student count per grade category on 4.0 scale.</p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-[#EDF2E6] text-[#5C6847] text-[10px] font-mono font-bold border border-[#E5E4D8]">
                  {analytics.metrics.totalEnrolled} Total Enrolled
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.gradeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E4D8" vertical={false} />
                    <XAxis dataKey="grade" stroke="#7A7D70" fontSize={11} />
                    <YAxis allowDecimals={false} stroke="#7A7D70" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FDFCF7', borderColor: '#E5E4D8', borderRadius: '12px', color: '#2D3321', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      formatter={(val: any, name: any, item: any) => [`${val} students (${item.payload.percentage}%)`, 'Count']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {analytics.gradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={GRADE_COLORS[entry.grade] || '#7C8964'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Score Brackets Histogram */}
            <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#2D3321]">Score Frequency Histogram</h2>
                  <p className="text-xs text-[#7A7D70]">Cohort scores grouped into 10% interval brackets.</p>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-[#EDF2E6] text-[#5C6847] text-[10px] font-mono font-bold border border-[#E5E4D8]">
                  Pass Threshold: {analytics.course.passThreshold}%
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.scoreHistogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E4D8" vertical={false} />
                    <XAxis dataKey="range" stroke="#7A7D70" fontSize={10} />
                    <YAxis allowDecimals={false} stroke="#7A7D70" fontSize={11} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FDFCF7', borderColor: '#E5E4D8', borderRadius: '12px', color: '#2D3321', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    />
                    <Bar dataKey="count" fill="#7C8964" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Component Breakdown Analysis Table */}
          <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[#2D3321]">Rubric Component Performance Metrics</h2>
            <p className="text-xs text-[#7A7D70]">Analysis of student scores across individual course assessments.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F2F1E9] text-[#2D3321] font-bold border-b border-[#E5E4D8]">
                    <th className="py-2.5 px-3">Assessment Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-center">Weight %</th>
                    <th className="py-2.5 px-3 text-center">Max Pts</th>
                    <th className="py-2.5 px-3 text-center">Average Score</th>
                    <th className="py-2.5 px-3 text-center">Average %</th>
                    <th className="py-2.5 px-3 text-center">Min / Max Recorded</th>
                    <th className="py-2.5 px-3">Difficulty Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E4D8]">
                  {analytics.componentPerformance.map((comp) => {
                    const isChallenging = comp.averagePercentage < 80;
                    return (
                      <tr key={comp.id} className="hover:bg-[#FDFCF7] transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#2D3321]">{comp.name}</td>
                        <td className="py-2.5 px-3 capitalize text-[#7A7D70]">{comp.type}</td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#5C6847] font-semibold">{comp.weightPercent}%</td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#7A7D70]">{comp.maxScore}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-[#2D3321]">{comp.averageScore}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-[#5C6847]">{comp.averagePercentage}%</td>
                        <td className="py-2.5 px-3 text-center font-mono text-[#7A7D70]">
                          {comp.minScore ?? '—'} / {comp.maxScoreAchieved ?? '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            isChallenging ? 'bg-[#FBF2ED] text-[#C88A68] border border-[#FFE0B2]' : 'bg-[#EDF2E6] text-[#5C6847] border border-[#C8E6C9]'
                          }`}>
                            {isChallenging ? 'High Rigor' : 'Standard Mastery'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

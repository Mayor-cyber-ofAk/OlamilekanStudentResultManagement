import React, { useState } from 'react';
import { Database, Play, Code2, Table, Check, AlertCircle, Sparkles } from 'lucide-react';

const PRESET_QUERIES = [
  {
    title: 'Department GPA Performance & Enrollments',
    sql: `SELECT 
  d.code AS dept_code,
  d.name AS department_name,
  d.faculty_dean,
  COUNT(DISTINCT c.id) AS active_courses,
  COUNT(DISTINCT e.student_id) AS enrolled_students,
  ROUND(AVG(e.calculated_gpa_points), 2) AS dept_average_gpa
FROM departments d
LEFT JOIN courses c ON d.id = c.department_id
LEFT JOIN enrollments e ON c.id = e.course_id AND e.calculated_gpa_points > 0
GROUP BY d.id
ORDER BY dept_average_gpa DESC;`
  },
  {
    title: 'Top Students by Cumulative Quality Points',
    sql: `SELECT 
  u.student_id,
  u.full_name,
  d.name AS major,
  COUNT(e.id) AS courses_taken,
  SUM(c.credits) AS total_credits_earned,
  ROUND(AVG(e.calculated_curved_score), 1) AS overall_avg_pct,
  ROUND(AVG(e.calculated_gpa_points), 2) AS cumulative_gpa
FROM users u
JOIN enrollments e ON u.id = e.student_id
JOIN courses c ON e.course_id = c.id
JOIN departments d ON u.department_id = d.id
WHERE u.role = 'student'
GROUP BY u.id
ORDER BY cumulative_gpa DESC, overall_avg_pct DESC;`
  },
  {
    title: 'Assessment Component Weight Balance Audit',
    sql: `SELECT 
  c.code AS course_code,
  c.title AS course_title,
  COUNT(ac.id) AS total_components,
  SUM(ac.weight_percent) AS total_rubric_weight,
  CASE 
    WHEN ABS(SUM(ac.weight_percent) - 100.0) < 0.01 THEN 'BALANCED (100%)'
    ELSE 'MISCONFIGURED'
  END AS integrity_status
FROM courses c
LEFT JOIN assessment_components ac ON c.id = ac.course_id
GROUP BY c.id;`
  },
  {
    title: 'Recent Audit Logs & Grade Modifications',
    sql: `SELECT 
  al.created_at,
  al.user_name AS actor,
  al.action,
  al.entity_type,
  al.details
FROM audit_logs al
ORDER BY al.created_at DESC
LIMIT 15;`
  }
];

export const SqlConsoleView: React.FC = () => {
  const [query, setQuery] = useState(PRESET_QUERIES[0].sql);
  const [results, setResults] = useState<{ columns: string[]; rows: any[]; rowCount: number } | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const runQuery = async (sqlToRun?: string) => {
    const activeSql = sqlToRun || query;
    setExecuting(true);
    setError(null);
    const start = performance.now();

    try {
      const res = await fetch('/api/sql/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: activeSql })
      });

      const data = await res.json();
      const end = performance.now();
      setExecutionTime(Number((end - start).toFixed(1)));

      if (res.ok) {
        setResults(data);
      } else {
        setError(data.error || 'SQL execution failed');
        setResults(null);
      }
    } catch (err: any) {
      setError(err.message);
      setResults(null);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-[#7C8964] uppercase tracking-wider">
                Relational Database Layer
              </span>
              <span className="text-[#A3A295]">•</span>
              <span className="text-xs text-[#7A7D70] font-mono">SQLite Relational Engine</span>
            </div>
            <h1 className="text-xl font-bold text-[#2D3321] tracking-tight flex items-center space-x-2">
              <Database className="w-5 h-5 text-[#7C8964]" />
              <span>Interactive Relational SQL Console & Schema Explorer</span>
            </h1>
            <p className="text-xs text-[#7A7D70]">
              Directly query structured database tables: courses, enrollments, assessment_components, grades, grading_scales, audit_logs.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => runQuery()}
              disabled={executing}
              className="px-4 py-2 bg-[#7C8964] hover:bg-[#6C7954] text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{executing ? 'Executing...' : 'Run SQL Query'}</span>
            </button>
          </div>
        </div>

        {/* Preset Queries Bar */}
        <div className="space-y-2 pt-2 border-t border-[#E5E4D8]">
          <span className="text-[11px] font-bold text-[#7A7D70] uppercase tracking-wider">
            Quick Analytical SQL Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setQuery(preset.sql);
                  runQuery(preset.sql);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-[#F2F1E9] hover:bg-[#EAE9DE] border border-[#E5E4D8] text-[#2D3321] text-xs font-medium transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <Code2 className="w-3 h-3 text-[#7C8964]" />
                <span>{preset.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SQL Editor Input */}
      <div className="bg-white border border-[#E5E4D8] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#2D3321]">SQL Statement</span>
          {executionTime !== null && (
            <span className="text-[#7A7D70] font-mono text-[11px]">
              Executed in <strong className="text-[#5C6847]">{executionTime}ms</strong>
            </span>
          )}
        </div>

        <textarea
          rows={7}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-[#FDFCF7] font-mono text-xs text-[#2D3321] border border-[#E5E4D8] rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[#7C8964] leading-relaxed"
          placeholder="SELECT * FROM courses;"
        />
      </div>

      {/* Query Errors */}
      {error && (
        <div className="bg-[#FDF2F2] border border-[#F5C2C2] rounded-xl p-4 text-xs text-[#B83A3A] flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-[#B83A3A] flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">SQL Syntax or Execution Error:</div>
            <div className="font-mono mt-1 text-[11px]">{error}</div>
          </div>
        </div>
      )}

      {/* Result Grid */}
      {results && (
        <div className="bg-white border border-[#E5E4D8] rounded-2xl shadow-xs overflow-hidden space-y-3 p-5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 font-bold text-[#2D3321]">
              <Table className="w-4 h-4 text-[#7C8964]" />
              <span>Query Results ({results.rowCount} rows returned)</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#E5E4D8] rounded-xl">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="bg-[#F2F1E9] text-[#2D3321] font-bold border-b border-[#E5E4D8]">
                  {results.columns.map((col, idx) => (
                    <th key={idx} className="py-2.5 px-3 font-mono text-[11px] text-[#2D3321] border-r border-[#E5E4D8] last:border-r-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E4D8]">
                {results.rows.length === 0 ? (
                  <tr>
                    <td colSpan={results.columns.length || 1} className="py-6 text-center text-[#7A7D70]">
                      No matching records found.
                    </td>
                  </tr>
                ) : (
                  results.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-[#FDFCF7]">
                      {results.columns.map((col, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 text-[#3A3D30] border-r border-[#E5E4D8] last:border-r-0 font-mono text-[11px]">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-[#A3A295] italic">NULL</span>}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

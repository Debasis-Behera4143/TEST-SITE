import React from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';

export const TeacherCharts = ({ analytics, gc, GRADE_COLORS }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Subject Averages */}
      <div className={`p-5 rounded-2xl border ${gc}`}>
        <h3 className="font-bold text-sm mb-4">Subject-wise Average Score (%)</h3>
        {analytics.subjectChartData.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No result data available yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.subjectChartData}>
                <XAxis dataKey="subject" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#0d0e18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                <Bar dataKey="average" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Grade Distribution */}
      <div className={`p-5 rounded-2xl border ${gc}`}>
        <h3 className="font-bold text-sm mb-4">Grade Distribution</h3>
        {analytics.gradeChartData.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-8">No graded results yet.</p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.gradeChartData} dataKey="count" nameKey="grade" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {analytics.gradeChartData.map((entry, idx) => (
                    <Cell key={idx} fill={GRADE_COLORS[idx % GRADE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#0d0e18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                <Legend verticalAlign="bottom" height={36} iconSize={10} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 7-Day Submission Trend */}
      <div className={`p-5 rounded-2xl border ${gc} md:col-span-2`}>
        <h3 className="font-bold text-sm mb-4">Submission Trend (Last 7 Days)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={analytics.trendData}>
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0d0e18', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="submissions" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default TeacherCharts;

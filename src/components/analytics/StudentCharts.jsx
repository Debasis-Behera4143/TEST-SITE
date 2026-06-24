
import { 
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, AreaChart, Area, XAxis, YAxis, Tooltip 
} from 'recharts';
import { Activity, BarChart2 } from 'lucide-react';

export const StudentCharts = ({ theme, performanceData, trendData }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Subject competency radar */}
      <div className={`p-6 rounded-3xl border ${
        theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
      }`}>
        <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-cyan" />
          Subject Competency Radar
        </h3>
        
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" radius="80%" data={performanceData}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" fontSize={9} />
              <Radar name="Student Score" dataKey="score" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance trends curve */}
      <div className={`p-6 rounded-3xl border ${
        theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
      }`}>
        <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-brand-purple" />
          Academic Growth Trend
        </h3>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="mathGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="physGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              <Area type="monotone" dataKey="Mathematics" stroke="#a855f7" fillOpacity={1} fill="url(#mathGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Physics" stroke="#06b6d4" fillOpacity={1} fill="url(#physGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default StudentCharts;

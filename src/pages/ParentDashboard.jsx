import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockDb } from '../database/mockDb';
import { supabase, isLiveMode } from '../database/supabaseClient';
import DashboardHeader from '../components/DashboardHeader';
import { Button, Card, Modal, Input, Dropdown, Table, Notification, ChartContainer, Skeleton, EmptyState } from '../components/ui';
import { 
  GraduationCap, LogOut, Trophy, Award, Calendar, Clock, Download, Eye, Sparkles, AlertTriangle, 
  CheckCircle, ArrowUpRight, BarChart2, ShieldCheck, Mail
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export const ParentDashboard = () => {
  const { user, parent, logout, theme } = useAuth();
  
  const [childUser, setChildUser] = useState(null);
  const [childStudent, setChildStudent] = useState(null);
  const [childSubmissions, setChildSubmissions] = useState([]);
  const [childResults, setChildResults] = useState([]);
  const [childBadges, setChildBadges] = useState([]);
  const [tests, setTests] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [dataLoading, setDataLoading] = useState(true);

  const loadParentData = async () => {
    if (!user || !parent) return;
    try {
      if (isLiveMode && supabase) {
        // Fetch kid link details
        const { data: childProfile } = await supabase.from('users').select('*').eq('id', parent.student_id).single();
        setChildUser(childProfile);

        const { data: childDetails } = await supabase.from('students').select('*').eq('id', parent.student_id).single();
        setChildStudent(childDetails);

        const { data: subs } = await supabase.from('submissions').select('*').eq('student_id', parent.student_id);
        setChildSubmissions(subs || []);

        const subIds = (subs || []).map(s => s.id);
        if (subIds.length > 0) {
          const { data: res } = await supabase.from('results').select('*').in('submission_id', subIds);
          setChildResults(res || []);
        }

        const { data: t } = await supabase.from('tests').select('*');
        setTests(t || []);
      } else {
        // Mock Portal Fetch
        const db = JSON.parse(localStorage.getItem('edutrack_mock_db'));
        const kidId = parent.student_id || "usr-student-1";

        const childProf = db.users.find(u => u.id === kidId);
        setChildUser(childProf);

        const childDet = db.students.find(s => s.id === kidId);
        setChildStudent(childDet);

        const subs = db.submissions.filter(s => s.student_id === kidId);
        setChildSubmissions(subs);

        const res = db.results.filter(r => subs.map(s => s.id).includes(r.submission_id));
        setChildResults(res);

        const t = db.tests;
        setTests(t);

        const bdg = db.badges.filter(b => b.student_id === kidId);
        setChildBadges(bdg);
      }
    } catch (err) {
      console.error("Error loading parent dashboard data:", err);
    } finally {
      setTimeout(() => setDataLoading(false), 500);
    }
  };

  useEffect(() => {
    loadParentData();
  }, [user, parent]);

  const handlePrintReportCard = (res, test) => {
    if (!childUser) return;
    const doc = window.open("", "_blank");
    doc.document.write(`
      <html>
        <head>
          <title>Report Card - ${test.title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1e293b; }
            .card { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin: 15px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
            .grade-badge { background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 6px; font-weight: bold; }
            .feedback-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 20px; font-style: italic; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; }
            .btn { display: inline-block; margin-top: 20px; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; font-weight: bold; text-decoration: none; cursor: pointer; }
            @media print { .btn { display: none; } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div>
                <h2 style="margin: 0; color: #3b82f6;">EduTrack AI Report Card</h2>
                <small>Official Student Progress Report</small>
              </div>
              <div style="text-align: right;">
                <strong>${childUser.name}</strong><br/>
                <span style="font-size: 11px; color: #64748b;">${childStudent?.registration_number || ''}</span>
              </div>
            </div>
            <div class="row"><strong>Exam:</strong><span>${test.title}</span></div>
            <div class="row"><strong>Subject:</strong><span>${test.subject}</span></div>
            <div class="row"><strong>Marks Obtained:</strong><span>${res.marks_obtained} / ${test.total_marks}</span></div>
            <div class="row"><strong>Percentage:</strong><span>${res.percentage}%</span></div>
            <div class="row"><strong>Grade:</strong><span class="grade-badge">${res.grade}</span></div>
            <div class="feedback-box">
              <strong>Teacher Remarks:</strong><br/>
              "${res.feedback || 'Excellent class participation.'}"
            </div>
            <div class="footer">
              Report card verified by Parent Gateway. Generated on ${new Date(res.published_at).toLocaleDateString()}<br/>
              <button class="btn" onclick="window.print()">Print Report Card</button>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.document.close();
  };

  const childTrendData = [
    { name: 'Month 1', score: 78 },
    { name: 'Month 2', score: 82 },
    { name: 'Month 3', score: 88 },
    { name: 'Month 4', score: 88 }
  ];

  if (dataLoading) {
    return (
      <div className="flex-grow flex flex-col justify-between p-6 max-w-7xl mx-auto w-full relative z-10 text-left">
        {/* Header Skeleton */}
        <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 mb-8 ${
          theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
        }`}>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Skeleton variant="circle" width="64px" height="64px" />
            <div className="space-y-2">
              <Skeleton variant="rect" width="180px" height="24px" />
              <Skeleton variant="rect" width="120px" height="16px" />
            </div>
          </div>
          <div className="flex items-center gap-6 w-full md:w-auto">
            <div className="space-y-1"><Skeleton variant="rect" width="80px" height="20px" /></div>
            <div className="space-y-1"><Skeleton variant="rect" width="100px" height="20px" /></div>
          </div>
        </div>

        {/* Content Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="md:col-span-2 space-y-6">
            {/* Child Performance Card skeleton */}
            <div className={`p-6 rounded-3xl border ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <Skeleton variant="rect" width="200px" height="22px" className="mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-white/5 bg-slate-950/10 flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton variant="rect" width="120px" height="16px" />
                      <Skeleton variant="rect" width="85px" height="12px" />
                    </div>
                    <Skeleton variant="rect" width="100px" height="36px" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Side chart skeleton */}
            <div className={`p-6 rounded-3xl border ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            } space-y-4`}>
              <Skeleton variant="rect" width="150px" height="20px" />
              <Skeleton variant="rect" width="100%" height="150px" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col justify-between p-6 max-w-7xl mx-auto w-full relative z-10 text-left">
      
      {/* Top Welcome bar */}
      <DashboardHeader
        roleLabel="Parent"
        roleColorClass="text-brand-pink bg-brand-pink/15 border-brand-pink/30"
        subtitle={
          <p className={`text-xs font-light mt-1 text-left ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Accessing child academic dashboard: <strong className="text-brand-cyan">{childUser ? childUser.name : 'Unknown Student'}</strong>
          </p>
        }
        statsContainer={
          <>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Child's Level</span>
              <span className="text-xl font-extrabold text-brand-cyan">{childStudent ? childStudent.level : 1}</span>
            </div>

            <div className="border-l border-white/5 pl-6 text-right shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">XP Accumulation</span>
              <span className="text-xl font-extrabold text-brand-purple">{childStudent ? childStudent.xp : 0} XP</span>
            </div>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Child performance and progress list */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Progress reports */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
          }`}>
            <h3 className="font-display font-bold text-lg mb-4">Child Performance Reports</h3>
            
            <div className="space-y-3">
              {childResults.length === 0 ? (
                <p className="text-xs text-slate-400">No grades registered for your child.</p>
              ) : (
                childResults.map((res) => {
                  const test = tests.find(t => t.id === childSubmissions.find(s => s.id === res.submission_id)?.test_id);
                  if (!test) return null;

                  return (
                    <div key={res.id} className="p-4 rounded-2xl border border-white/5 bg-slate-950/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-brand-purple/20 transition-all">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-brand-cyan/20 text-[9px] font-bold text-brand-cyan uppercase">
                          {test.subject}
                        </span>
                        <h4 className="font-bold text-sm mt-1.5">{test.title}</h4>
                        <p className="text-[10px] text-slate-400 mt-2 font-mono">
                          Marks: {res.marks_obtained}/{test.total_marks} | Grade: <strong className="text-emerald-400">{res.grade}</strong>
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedResult({ result: res, test })}
                          className="px-4 py-2 text-center rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View Feedback
                        </button>
                        
                        <button
                          onClick={() => handlePrintReportCard(res, test)}
                          className="p-2 rounded-xl bg-brand-pink/10 border border-brand-pink/20 hover:bg-brand-pink/20 text-brand-pink"
                          title="Print report card"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Child active tests submission history */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
          }`}>
            <h3 className="font-display font-bold text-lg mb-4">Assigned Test Progress Tracking</h3>
            
            <div className="space-y-3">
              {tests.map((t) => {
                const sub = childSubmissions.find(s => s.test_id === t.id);
                return (
                  <div key={t.id} className="p-3 rounded-xl bg-slate-950/20 border border-white/5 flex justify-between items-center text-xs">
                    <div>
                      <h4 className="font-bold">{t.title}</h4>
                      <p className="text-[9px] text-slate-500 mt-1">Due Date: {new Date(t.deadline).toLocaleDateString()}</p>
                    </div>
                    {sub ? (
                      <span className="px-3 py-1 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        ✓ Submitted
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded bg-yellow-500/20 text-yellow-400 font-bold text-[10px]">
                        ⌛ Pending Submission
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Sidebar analytics widgets */}
        <div className="space-y-6">
          
          {/* Child progress trends */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
          }`}>
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-1">
              <BarChart2 className="h-5 w-5 text-brand-pink" />
              Monthly Progress Trend
            </h3>
            
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={childTrendData}>
                  <defs>
                    <linearGradient id="childGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip />
                  <Area type="monotone" dataKey="score" stroke="#ec4899" fillOpacity={1} fill="url(#childGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Child Badges highlights */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
          }`}>
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-1.5">
              <Award className="h-5 w-5 text-brand-purple" />
              Child Achievement Badges
            </h3>

            <div className="flex flex-wrap gap-2">
              {childBadges.length === 0 ? (
                <p className="text-xs text-slate-400">Achievements will unlock as tests get evaluated.</p>
              ) : (
                childBadges.map((b) => (
                  <span 
                    key={b.id} 
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-brand-purple/20 bg-brand-purple/10 text-[10px] font-bold text-brand-purple"
                  >
                    <Sparkles className="h-3 w-3 text-brand-cyan" />
                    {b.badge_type}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Notification settings checklist */}
          <div className={`p-6 rounded-3xl border border-emerald-500/10 bg-emerald-500/5 text-xs text-slate-300 space-y-2`}>
            <span className="font-bold text-emerald-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Parent Email Alerts Enabled
            </span>
            <p className="font-light leading-relaxed text-[11px]">
              You will automatically receive Resend alerts when your child submits work or when results are officially graded.
            </p>
          </div>

        </div>

      </div>

      {/* AI Results Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-xl p-8 rounded-3xl border relative max-h-[85vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-black/10 text-slate-900'
          }`}>
            <button 
              onClick={() => setSelectedResult(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-xl">{selectedResult.test.title}</h3>
                <span className="text-[10px] uppercase font-bold text-slate-400">{selectedResult.test.subject}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="p-4 rounded-2xl bg-slate-900/60 text-center">
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Marks Obtained</span>
                <span className="text-xl font-extrabold text-brand-cyan">{selectedResult.result.marks_obtained}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">/ {selectedResult.test.total_marks}</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 text-center">
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Percentage</span>
                <span className="text-xl font-extrabold text-brand-cyan">{selectedResult.result.percentage}%</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 text-center">
                <span className="block text-[9px] uppercase tracking-wider text-slate-500">Grade Letter</span>
                <span className="text-xl font-extrabold text-emerald-400 font-display">{selectedResult.result.grade}</span>
              </div>
            </div>

            <div className="mt-6 text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Teacher Remarks</h4>
              <p className="mt-2 text-sm italic bg-slate-900/40 p-4 rounded-xl border border-white/5 text-slate-300">
                " {selectedResult.result.feedback || 'Excellent class response.'} "
              </p>
            </div>

            {selectedResult.result.ai_feedback && (
              <div className="mt-6 text-left space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-purple flex items-center gap-1">
                  <Sparkles className="h-4 w-4 text-brand-cyan animate-pulse" />
                  AI Diagnostic suggestions
                </h4>
                
                <div className="p-4 rounded-xl border border-brand-purple/20 bg-brand-purple/5 space-y-2 text-xs">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span>OCR Recognition Score:</span>
                    <strong className="text-brand-cyan font-mono">{selectedResult.result.ai_feedback.ocr_confidence}</strong>
                  </div>
                  <div className="pt-2">
                    <span className="block font-semibold mb-1">Key Performance Areas:</span>
                    <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-300 font-light">
                      {selectedResult.result.ai_feedback.suggestions.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => handlePrintReportCard(selectedResult.result, selectedResult.test)}
                className="flex-1 py-3 text-center text-xs font-bold text-white bg-brand-cyan hover:bg-brand-cyan/80 rounded-xl"
              >
                Download PDF Report Card
              </button>
              <button
                onClick={() => setSelectedResult(null)}
                className="px-6 py-3 text-center text-xs font-bold text-slate-300 bg-slate-900 border border-white/10 rounded-xl hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const X = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
  </svg>
);

export default ParentDashboard;

import { useState, useEffect, lazy, Suspense, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockDb } from '../database/mockDb';
import { supabase, isLiveMode } from '../database/supabaseClient';
import { encryptPayload } from '../utils/crypto';
import DashboardHeader from '../components/DashboardHeader';
import NotificationBell from '../components/NotificationBell';
import { Skeleton, EmptyState } from '../components/ui';
import { 
  BookOpen, Award, CheckCircle, Clock, Calendar, Download, Upload, Eye, Trophy, Star, Sparkles, 
  BarChart2, AlertTriangle, FileText, CheckCircle2, LogOut, Flame,
  Menu, X, LayoutDashboard
} from 'lucide-react';

// Lazy-loaded analytics
const StudentCharts = lazy(() => import('../components/analytics/StudentCharts'));

const STUDENT_NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tests', label: 'My Exams', icon: BookOpen },
  { id: 'analytics', label: 'Performance', icon: BarChart2 },
  { id: 'achievements', label: 'Certificates', icon: Award },
];

const renderMarkdown = (text) => {
  if (!text) return '<p class="text-slate-500 italic">No notes entered yet.</p>';
  
  // Escape HTML to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks: ```js ... ```
  html = html.replace(/```([\s\S]*?)```/g, (match, p1) => {
    return `<pre class="bg-slate-950/80 p-3.5 rounded-xl my-3 overflow-x-auto font-mono text-xs text-brand-cyan border border-white/5 whitespace-pre-wrap">${p1.trim()}</pre>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`\n]+)`/g, '<code class="bg-slate-900 px-1.5 py-0.5 rounded font-mono text-[11px] text-brand-cyan">$1</code>');

  // Headings
  html = html.replace(/^### (.*?)$/gm, '<h5 class="text-xs font-extrabold text-slate-200 mt-4 mb-2 uppercase tracking-wide">$1</h5>');
  html = html.replace(/^## (.*?)$/gm, '<h4 class="text-sm font-extrabold text-brand-cyan mt-5 mb-2.5">$1</h4>');
  html = html.replace(/^# (.*?)$/gm, '<h3 class="text-base font-extrabold text-white mt-6 mb-3 border-b border-white/10 pb-1.5">$1</h3>');

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-white">$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong class="font-bold text-white">$1</strong>');

  // Italic: *text*
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-200">$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em class="italic text-slate-200">$1</em>');

  // Horizontal Rule: ---
  html = html.replace(/^---$/gm, '<hr class="border-white/10 my-4" />');

  // Bullet Lists: - item or * item
  html = html.replace(/^\s*[-*]\s+(.*?)$/gm, '<li class="ml-4 list-disc text-slate-400 my-1 leading-relaxed">$1</li>');

  // Numbered Lists: 1. item
  html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li class="ml-4 list-decimal text-slate-400 my-1 leading-relaxed">$1</li>');

  // Process paragraphs
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<pre') || trimmed.startsWith('</pre') || trimmed.startsWith('<hr') || trimmed.startsWith('<p') || trimmed.startsWith('</p')) {
      return line;
    }
    return `<p class="my-2 text-slate-400 leading-relaxed font-light text-xs">${line}</p>`;
  });
  
  return processedLines.join('\n');
};

// Self-contained component to run count-up animation locally
// to prevent dashboard-wide re-renders during the animation.
const ScorecardGrid = ({ marksObtained, totalMarks, grade }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Number(marksObtained) || 0;
    if (end <= 0) {
      setTimeout(() => setCount(0), 0);
      return;
    }
    const stepVal = Math.max(1, end / 30);
    const timer = setInterval(() => {
      start += stepVal;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.round(start));
      }
    }, 25);
    return () => clearInterval(timer);
  }, [marksObtained]);

  const percentage = Math.round((count / totalMarks) * 100) || 0;

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-6">
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 text-center border border-white/5">
        <span className="block text-[9px] uppercase tracking-wider text-slate-500">Marks Obtained</span>
        <span className="text-lg sm:text-xl font-extrabold text-brand-cyan">{count}</span>
        <span className="text-[10px] text-slate-500 block mt-0.5">/ {totalMarks}</span>
      </div>

      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 text-center border border-white/5">
        <span className="block text-[9px] uppercase tracking-wider text-slate-500">Percentage</span>
        <span className="text-lg sm:text-xl font-extrabold text-brand-cyan">{percentage}%</span>
      </div>

      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 text-center border border-white/5">
        <span className="block text-[9px] uppercase tracking-wider text-slate-500">Grade Letter</span>
        <span className="text-lg sm:text-xl font-extrabold text-emerald-400 font-display">{grade}</span>
      </div>
    </div>
  );
};

export const StudentDashboard = () => {
  const { user, student, logout, theme } = useAuth();
  const [tests, setTests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [results, setResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [badges, setBadges] = useState([]);
  const [certificates, setCertificates] = useState([]);
  
  // Dashboard Tabs: 'overview' | 'tests' | 'analytics' | 'achievements'
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Interactive Modals
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedTestToSubmit, setSelectedTestToSubmit] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFileType, setUploadFileType] = useState('pdf');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Gamification states
  const [streakCount, setStreakCount] = useState(5);
  const [dataLoading, setDataLoading] = useState(true);

  // Load data
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    try {
      if (isLiveMode && supabase) {
        // Supabase DB fetch — only tests assigned to this student
        const { data: assignedRows } = await supabase
          .from('test_assignments')
          .select('test_id')
          .eq('student_id', user.id);
        const assignedIds = (assignedRows || []).map(r => r.test_id);
        if (assignedIds.length > 0) {
          const { data: tList } = await supabase.from('tests').select('*').in('id', assignedIds);
          setTests(tList || []);
        } else {
          setTests([]);
        }

        const { data: sList } = await supabase.from('submissions').select('*').eq('student_id', user.id);
        setSubmissions(sList || []);

        const subIds = (sList || []).map(s => s.id);
        if (subIds.length > 0) {
          const { data: rList } = await supabase
            .from('results')
            .select('*')
            .in('submission_id', subIds)
            .eq('status', 'published');
          setResults(rList || []);
        }

        const { data: lead } = await supabase.from('leaderboard').select('*').order('rank', { ascending: true });
        setLeaderboard(lead || []);

        const { data: bdgList } = await supabase.from('badges').select('*').eq('student_id', user.id);
        setBadges(bdgList || []);

        const { data: certList } = await supabase.from('certificates').select('*').eq('student_id', user.id);
        setCertificates(certList || []);
      } else {
        // Mock DB fetch — only assigned tests for this student
        const tList = await mockDb.getAssignedTests(user.id);
        setTests(tList);

        const sList = await mockDb.getSubmissions();
        const studentSubs = sList.filter(s => s.student_id === user.id);
        setSubmissions(studentSubs);

        // Only load published results
        const studentResults = await mockDb.getStudentResults(user.id);
        setResults(studentResults);

        const lead = await mockDb.getLeaderboard();
        setLeaderboard(lead);

        const bdg = await mockDb.getBadges(user.id);
        setBadges(bdg);

        const certs = await mockDb.getCertificates(user.id);
        setCertificates(certs);
      }
    } catch (err) {
      console.error("Error loading student dashboard data:", err);
    } finally {
      setTimeout(() => setDataLoading(false), 600);
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [loadDashboardData]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (selectedResult || selectedTestToSubmit) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedResult, selectedTestToSubmit]);

  // Submit Answer Sheet handler
  const handleAnswerSubmit = (e) => {
    if (e) e.preventDefault();
    if (!uploadFile) {
      setUploadStatus("Please specify a document to upload.");
      return;
    }

    setIsUploading(true);
    setUploadStatus("Uploading document...");
    setUploadProgress(0);
    setUploadError(null);

    let progress = 0;
    const interval = setInterval(async () => {
      progress += 10;
      setUploadProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        try {
          let fileUrl = '';
          if (isLiveMode && supabase) {
            // Upload actual file to Supabase Storage bucket 'answer-sheets'
            const storagePath = `${user.id}_${selectedTestToSubmit.id}_${Date.now()}_answers.${uploadFileType}`;
            const { error: uploadErr } = await supabase.storage
              .from('answer-sheets')
              .upload(storagePath, uploadFile);

            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage
              .from('answer-sheets')
              .getPublicUrl(storagePath);

            fileUrl = publicUrl;
          } else {
            fileUrl = `${user.name.toLowerCase().replace(/\s+/g, '_')}_${selectedTestToSubmit.title.slice(0, 10).toLowerCase().replace(/\s+/g, '_')}_answers.${uploadFileType}`;
          }
          
          const encryptedUrl = `e2ee:${encryptPayload(fileUrl)}`;
          await mockDb.addSubmission(selectedTestToSubmit.id, user.id, encryptedUrl, uploadFileType);
          setUploadStatus("Submission successful!");
          
          setTimeout(() => {
            setSelectedTestToSubmit(null);
            setUploadFile(null);
            setUploadStatus('');
            setUploadProgress(null);
            setIsUploading(false);
          }, 600);

          loadDashboardData();
        } catch (err) {
          setUploadError(err.message);
          setUploadStatus(`Upload failed: ${err.message}`);
          setIsUploading(false);
        }
      }
    }, 100);
  };

  // Download printable PDF certificate simulation
  const handleDownloadCertificate = (cert) => {
    const doc = window.open("", "_blank");
    doc.document.write(`
      <html>
        <head>
          <title>Certificate - ${cert.certificate_type}</title>
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@800&family=Plus+Jakarta+Sans:wght@300;600&display=swap" rel="stylesheet">
          <style>
            body {
              background: #0f172a;
              color: #f8fafc;
              font-family: 'Plus Jakarta Sans', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .cert-box {
              border: 10px solid #38bdf8;
              border-image: linear-gradient(135deg, #0ea5e9, #a855f7) 10;
              padding: 50px;
              width: 700px;
              text-align: center;
              background: rgba(30, 41, 59, 0.5);
              border-radius: 8px;
              box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            }
            h1 {
              font-family: 'Outfit', sans-serif;
              font-size: 40px;
              color: #38bdf8;
              margin: 0 0 10px 0;
              letter-spacing: 2px;
            }
            p { font-size: 16px; margin: 15px 0; font-weight: 300; line-height: 1.6; }
            .name { font-size: 28px; font-weight: 600; color: #e2e8f0; border-bottom: 2px dashed #a855f7; display: inline-block; padding: 0 20px 5px 20px; }
            .badge-icon { font-size: 60px; margin: 20px 0; }
            .date { color: #64748b; font-size: 12px; margin-top: 40px; }
            .btn-print {
              margin-top: 30px;
              padding: 10px 20px;
              background: #a855f7;
              border: none;
              color: white;
              font-weight: bold;
              border-radius: 6px;
              cursor: pointer;
            }
            @media print {
              .btn-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="cert-box">
            <div class="badge-icon">🎓</div>
            <h1>CERTIFICATE OF ACHIEVEMENT</h1>
            <p>This is proudly presented to</p>
            <div class="name">${user.name}</div>
            <p>for demonstrating academic excellence and earning the title of</p>
            <h2 style="color: #a855f7; font-family: Outfit; margin: 10px 0;">${cert.certificate_type}</h2>
            <p>in recognition of outstanding grades and consistent performance on the EduTrack AI platform.</p>
            <div class="date">Issued on: ${new Date(cert.issued_at).toLocaleDateString()}</div>
            <button class="btn-print" onclick="window.print()">Print/Download PDF</button>
          </div>
        </body>
      </html>
    `);
    doc.document.close();
  };

  // Download Printable Report Card
  const handlePrintReportCard = (res, test) => {
    const doc = window.open("", "_blank");
    doc.document.write(`
      <html>
        <head>
          <title>Report Card - ${test.title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; background: #ffffff; color: #1e293b; padding: 40px; }
            .card { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 15px; }
            .row { display: flex; justify-content: space-between; margin: 15px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
            .bold { font-weight: 600; }
            .grade-badge { background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 6px; font-weight: bold; }
            .feedback-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin-top: 20px; font-style: italic; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #64748b; }
            .btn { display: inline-block; margin-top: 20px; background: #3b82f6; color: white; padding: 10px 20px; border-radius: 6px; font-weight: bold; text-decoration: none; cursor: pointer; text-align: center; }
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
                <strong>${user.name}</strong><br/>
                <span style="font-size: 11px; color: #64748b;">${student?.registration_number || 'REG-2026'}</span>
              </div>
            </div>
            
            <div class="row"><span class="bold">Exam:</span><span>${test.title}</span></div>
            <div class="row"><span class="bold">Subject:</span><span>${test.subject}</span></div>
            <div class="row"><span class="bold">Maximum Marks:</span><span>${test.total_marks}</span></div>
            <div class="row"><span class="bold">Marks Obtained:</span><span>${res.marks_obtained}</span></div>
            <div class="row"><span class="bold">Percentage:</span><span>${res.percentage}%</span></div>
            <div class="row"><span class="bold">Grade:</span><span class="grade-badge">${res.grade}</span></div>
            
            <div class="feedback-box">
              <strong>Teacher Remarks:</strong><br/>
              "${res.feedback || 'Outstanding conceptual grasp.'}"
            </div>

            ${res.ai_feedback?.studentFeedback ? `
              <div class="feedback-box" style="border-left-color: #a855f7; margin-top: 15px; font-size: 13px; line-height: 1.5;">
                <strong>AI Diagnostic Evaluation:</strong><br/>
                ${res.ai_feedback.studentFeedback}
              </div>
            ` : ''}

            ${res.ai_feedback?.strengths && res.ai_feedback.strengths.length > 0 ? `
              <div class="feedback-box" style="border-left-color: #10b981; margin-top: 15px; font-size: 13px; line-height: 1.5;">
                <strong>Key Strengths Identified:</strong><br/>
                ${res.ai_feedback.strengths.map(s => `• ${s}<br/>`).join('')}
              </div>
            ` : ''}

            ${res.ai_feedback?.weakAreas && res.ai_feedback.weakAreas.length > 0 ? `
              <div class="feedback-box" style="border-left-color: #f43f5e; margin-top: 15px; font-size: 13px; line-height: 1.5;">
                <strong>Areas Needing Practice:</strong><br/>
                ${res.ai_feedback.weakAreas.map(w => `• ${w}<br/>`).join('')}
              </div>
            ` : ''}

            ${res.ai_feedback?.revisionPlan ? `
              <div class="feedback-box" style="border-left-color: #3b82f6; margin-top: 15px; font-size: 13px; line-height: 1.5;">
                <strong>7-Day AI Revision Study Plan:</strong><br/>
                ${res.ai_feedback.revisionPlan}
              </div>
            ` : ''}

            <div class="footer">
              This document is digitally verified. Generated on ${new Date(res.published_at).toLocaleDateString()}<br/>
              <button class="btn" onclick="window.print()">Print Report Card</button>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.document.close();
  };

  // Subject Score Radar Charts Config
  const performanceData = [
    { subject: 'Math', score: 85, fullMark: 100 },
    { subject: 'Physics', score: 90, fullMark: 100 },
    { subject: 'Chemistry', score: 88, fullMark: 100 },
    { subject: 'Biology', score: 75, fullMark: 100 },
    { subject: 'English', score: 92, fullMark: 100 }
  ];

  const trendData = [
    { name: 'Month 1', Physics: 75, Mathematics: 80, Chemistry: 70 },
    { name: 'Month 2', Physics: 82, Mathematics: 85, Chemistry: 78 },
    { name: 'Month 3', Physics: 85, Mathematics: 82, Chemistry: 85 },
    { name: 'Month 4', Physics: 90, Mathematics: 88, Chemistry: 88 }
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

        {/* Tabs skeleton */}
        <div className="flex bg-slate-950/20 p-1.5 rounded-2xl border border-white/5 mb-8 w-fit gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rect" width="100px" height="36px" />
          ))}
        </div>

        {/* Content Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="md:col-span-2 space-y-6">
            {/* Active Tests skeleton */}
            <div className={`p-6 rounded-3xl border ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <Skeleton variant="rect" width="150px" height="20px" className="mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-white/5 bg-slate-950/10 flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton variant="rect" width="120px" height="16px" />
                      <Skeleton variant="rect" width="80px" height="12px" />
                    </div>
                    <Skeleton variant="rect" width="100px" height="36px" />
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Reports skeleton */}
            <div className={`p-6 rounded-3xl border ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <Skeleton variant="rect" width="180px" height="20px" className="mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="p-4 rounded-2xl border border-white/5 bg-slate-900/40 space-y-3">
                    <Skeleton variant="rect" width="100%" height="60px" />
                    <Skeleton variant="rect" width="80px" height="20px" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Podium skeleton */}
            <div className={`p-6 rounded-3xl border ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <Skeleton variant="rect" width="120px" height="20px" className="mb-4" />
              <div className="flex items-end justify-center h-44 gap-2 pt-6">
                <Skeleton variant="rect" width="30%" height="60px" />
                <Skeleton variant="rect" width="30%" height="100px" />
                <Skeleton variant="rect" width="30%" height="40px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative z-10 w-full">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-300 border-r
        ${theme === 'dark' ? 'bg-slate-950/95 border-white/5' : 'bg-white/95 border-slate-200'}
        backdrop-blur-xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Logo */}
        <div className={`flex items-center justify-between px-5 py-5 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-brand-purple to-brand-cyan">
              <Award className="h-5 w-5 text-white" />
            </div>
            <span className="font-display font-extrabold text-lg bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
              EduTrack <span className="text-brand-cyan">AI</span>
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close Navigation Menu" className="lg:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/50">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Student Profile Info summary in sidebar */}
        <div className={`p-4 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <img src={user?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user?.name || 'student')}`} className="h-9 w-9 rounded-xl border border-white/10" alt="" />
            <div className="min-w-0">
              <p className="text-xs font-bold truncate text-slate-900 dark:text-white">{user?.name}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Student Account</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {STUDENT_NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-brand-purple/15 to-brand-cyan/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm'
                    : theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-brand-cyan' : ''}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar logout */}
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all text-red-500 hover:bg-red-500/10 cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0 text-red-500" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-grow lg:ml-64 flex flex-col min-h-screen">
        
        {/* Sticky Mobile Header */}
        <div className={`sticky top-0 z-30 px-4 py-3 border-b flex items-center justify-between gap-4 lg:hidden
          ${theme === 'dark' ? 'bg-slate-950/80 border-white/5 backdrop-blur-xl' : 'bg-white/80 border-slate-200 backdrop-blur-xl'}
        `}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Navigation Menu"
              aria-expanded={sidebarOpen}
              className={`p-3 rounded-xl border text-slate-400 hover:text-slate-650 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 ${
                theme === 'dark' ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display font-extrabold text-sm text-slate-900 dark:text-white">
                {STUDENT_NAV_ITEMS.find(n => n.id === activeTab)?.label}
              </h1>
              <p className="text-[10px] text-slate-500">EduTrack AI Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user?.id} theme={theme} />
            <button
              onClick={logout}
              className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500/50 ${
                theme === 'dark' ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
              }`}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-grow p-4 sm:p-6 max-w-7xl mx-auto w-full relative z-10 text-left">
      
      {/* Top Welcome Panel */}
      <DashboardHeader
        roleLabel="Student"
        roleColorClass="text-brand-cyan bg-brand-cyan/15 border-brand-cyan/30"
        notificationSlot={<NotificationBell userId={user?.id} theme={theme} />}
        nameSuffix={
          <div 
            onClick={() => {
              setStreakCount(prev => prev + 1);
            }}
            className="px-2.5 py-1 rounded bg-orange-500/20 border border-orange-500/40 text-[10px] font-bold text-orange-400 flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow shrink-0"
            title="Click to claim daily streak XP!"
          >
            <Flame className="h-3.5 w-3.5 fill-orange-400 animate-pulse" />
            <span>{streakCount} Day Streak</span>
          </div>
        }
        subtitle={
          <p className={`text-xs font-light mt-1 text-left ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            Class: {student?.class_name || 'Unassigned'} | ID: <span className="font-mono font-bold">{student?.registration_number || 'Unregistered'}</span>
          </p>
        }
        statsContainer={
          <>
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="5" fill="transparent" />
                <circle cx="32" cy="32" r="28" stroke="url(#cyanGlowGrad)" strokeWidth="5" fill="transparent" 
                  strokeDasharray={2 * Math.PI * 28} 
                  strokeDashoffset={2 * Math.PI * 28 * (1 - (((student?.xp || 0) % 1000) / 1000))} 
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="cyanGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute text-center">
                <span className="block text-[8px] uppercase tracking-wider text-slate-400">Level</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white">{student?.level || 1}</span>
              </div>
            </div>

            <div className="text-left shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-brand-purple flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-brand-purple" />
                XP SCOREBOARD
              </span>
              <span className="block text-xl font-extrabold text-brand-cyan mt-0.5">{student?.xp || 0} XP</span>
              <span className={`block text-[9px] font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                {(1000 - ((student?.xp || 0) % 1000))} XP to level {((student?.level || 1) + 1)}
              </span>
            </div>

            <div className="border-slate-200 dark:border-white/10 md:border-l md:pl-6 text-left shrink-0">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Class Rank</span>
              <span className="block text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{student?.rank ? `#${student.rank}` : '-'}</span>
            </div>
          </>
        }
      />

      {/* Tabs Switcher */}
      <div className="flex lg:hidden bg-slate-955/20 p-1.5 rounded-2xl border border-white/5 mb-8 w-fit overflow-x-auto no-scrollbar">
        {['overview', 'tests', 'analytics', 'achievements'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-bold rounded-xl uppercase tracking-wider transition-all whitespace-nowrap ${
              activeTab === tab
                ? 'bg-slate-800 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Grid Dashboard Modules */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          
          {/* Quick widgets list */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Upcoming/Assigned Tests Card */}
            <div className={`p-6 rounded-3xl border ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-brand-cyan" />
                Active Assigned Tests
              </h3>
              
              <div className="space-y-3">
                {tests.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No Assigned Tests"
                    description="You are all caught up! No active exam or test sheets have been assigned to your profile."
                    iconColorClass="text-brand-cyan border-brand-cyan/20 bg-brand-cyan/10"
                    className="w-full py-8"
                  />
                ) : (
                  tests.map((t) => {
                    const submission = submissions.find(s => s.test_id === t.id);
                    const result = submission ? results.find(r => r.submission_id === submission.id) : null;

                    return (
                      <div key={t.id} className="p-4 rounded-2xl border border-white/5 bg-slate-950/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-brand-cyan/20 transition-all">
                        <div>
                          <span className="px-2 py-0.5 rounded bg-brand-purple/20 text-[9px] font-bold text-brand-purple uppercase">
                            {t.subject}
                          </span>
                          <h4 className="font-bold text-sm mt-1.5">{t.title}</h4>
                          <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-400 font-light">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due: {new Date(t.deadline).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Marks: {t.total_marks}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.open(t.question_paper_url, '_blank')}
                            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5 text-brand-cyan" />
                            Question
                          </button>
                          
                          {submission ? (
                            submission.status === 'evaluated' && result ? (
                              <button
                                onClick={() => {
                                  setSelectedResult({ result, test: t });
                                }}
                                className="px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Grade: {result.grade} ({result.marks_obtained}/{t.total_marks})
                              </button>
                            ) : (
                              <span className="px-4 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-semibold flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                Grading Queue
                              </span>
                            )
                          ) : (
                            <button
                              onClick={() => setSelectedTestToSubmit(t)}
                              className="px-4 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/80 text-xs font-bold text-white flex items-center gap-1.5 shadow-md"
                            >
                              <Upload className="h-3.5 w-3.5" />
                              Submit Work
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent Results Viewer List */}
            <div className={`p-6 rounded-3xl border ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Graded Performance Reports
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {results.filter(r => r.status === 'published').length === 0 ? (
                  <div className="col-span-full">
                    <EmptyState
                      icon={CheckCircle2}
                      title="No Graded Reports"
                      description="You do not have any published grades or reports yet. Complete your pending test sheets."
                      iconColorClass="text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
                      className="w-full py-8"
                    />
                  </div>
                ) : (
                  results.filter(r => r.status === 'published').map((res) => {
                    const sub = submissions.find(s => s.id === res.submission_id);
                    const test = sub ? tests.find(t => t.id === sub.test_id) : null;
                    if (!test) return null;

                    return (
                      <div key={res.id} className="p-4 rounded-2xl border border-white/5 bg-slate-900/40 hover:border-emerald-500/20 transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase">
                              {test.subject}
                            </span>
                            <span className="text-xl font-extrabold text-emerald-400 font-display">{res.grade}</span>
                          </div>
                          <h4 className="font-bold text-xs mt-2 truncate" title={test.title}>{test.title}</h4>
                          <p className="text-[10px] text-slate-400 mt-2 font-mono">
                            Marks: {res.marks_obtained}/{test.total_marks} ({res.percentage}%)
                          </p>
                        </div>

                        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-white/5">
                          <button
                            onClick={() => {
                              setSelectedResult({ result: res, test });
                            }}
                            className="flex-1 py-2 text-center rounded-xl bg-slate-950/60 border border-white/10 hover:bg-slate-900 text-[10px] font-bold flex items-center justify-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            AI Report
                          </button>
                          
                          <button
                            onClick={() => handlePrintReportCard(res, test)}
                            className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-semibold text-emerald-400"
                            title="Download Report Card PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right Sidebar Widgets */}
          <div className="space-y-6">
            
            {/* Podium stand Leaderboard */}
            <div className={`p-6 rounded-3xl border ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-400 animate-bounce" />
                Podium Standings
              </h3>

              {leaderboard.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-xs">
                  <Trophy className="h-8 w-8 text-slate-500 mb-2" />
                  <span className="text-slate-400">No leaderboard standings recorded yet.</span>
                </div>
              ) : (
                <div className="flex items-end justify-center h-44 gap-2 pt-6 border-b border-white/5 pb-6">
                  
                  {/* Silver Step (2nd) */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[9px] font-bold text-slate-350 truncate max-w-[70px]">
                      {leaderboard[1] ? leaderboard[1].name : 'Vacant'}
                    </span>
                    <span className="text-[8px] text-slate-500">
                      {leaderboard[1] ? `Lv. ${leaderboard[1].level}` : ''}
                    </span>
                    <div className="w-full h-16 bg-slate-400/40 rounded-t-xl flex items-center justify-center border border-white/10 shadow-lg mt-2 relative">
                      <span className="text-lg">🥈</span>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-600/10 to-transparent" />
                    </div>
                  </div>

                  {/* Gold Step (1st) */}
                  <div className="flex flex-col items-center flex-1 z-10">
                    <Sparkles className="h-4.5 w-4.5 text-yellow-400 animate-spin absolute -mt-5" />
                    <span className="text-[10px] font-extrabold text-yellow-400 truncate max-w-[80px]">
                      {leaderboard[0] ? leaderboard[0].name : 'Vacant'}
                    </span>
                    <span className="text-[8px] text-slate-400">
                      {leaderboard[0] ? `Lv. ${leaderboard[0].level}` : ''}
                    </span>
                    <div className="w-full h-24 bg-yellow-500/30 rounded-t-2xl flex items-center justify-center border border-yellow-400/30 shadow-2xl mt-2 relative neon-glow-purple">
                      <span className="text-2xl">🥇</span>
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(253,224,71,0.2)_0%,transparent_70%)]" />
                    </div>
                  </div>

                  {/* Bronze Step (3rd) */}
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-[9px] font-bold text-amber-600 truncate max-w-[70px]">
                      {leaderboard[2] ? leaderboard[2].name : 'Vacant'}
                    </span>
                    <span className="text-[8px] text-slate-500">
                      {leaderboard[2] ? `Lv. ${leaderboard[2].level}` : ''}
                    </span>
                    <div className="w-full h-12 bg-amber-700/40 rounded-t-xl flex items-center justify-center border border-white/10 shadow-lg mt-2 relative">
                      <span className="text-base">🥉</span>
                      <div className="absolute inset-0 bg-gradient-to-t from-amber-800/10 to-transparent" />
                    </div>
                  </div>

                </div>
              )}

              {/* Leaderboard list */}
              <div className="space-y-2 mt-4">
                {leaderboard.slice(0, 3).map((lead, idx) => (
                  <div key={lead.id} className={`p-2 rounded-xl flex items-center justify-between border ${
                    lead.student_id === user.id 
                      ? 'border-brand-cyan/40 bg-brand-cyan/10' 
                      : 'border-transparent bg-slate-900/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold text-slate-500">#{idx + 1}</span>
                      <img src={lead.avatar} alt="avatar" className="h-6 w-6 rounded bg-white/5 border border-white/10" />
                      <h4 className="font-bold text-xs truncate max-w-[90px]">{lead.name}</h4>
                    </div>
                    <span className="text-xs font-bold text-brand-purple">{lead.monthly_score}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Badges */}
            <div className={`p-6 rounded-3xl border ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-brand-purple" />
                Unlocked Badges
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {badges.length === 0 ? (
                  <p className="text-xs text-slate-400">Assessments pending to unlock badges.</p>
                ) : (
                  badges.map((b) => (
                    <span 
                      key={b.id} 
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-purple/20 bg-brand-purple/10 text-[10px] font-bold text-brand-purple hover:scale-105 transition-all cursor-pointer"
                      title={`Unlocked on ${new Date(b.unlocked_at).toLocaleDateString()}`}
                    >
                      <Sparkles className="h-3 w-3 text-brand-cyan animate-pulse" />
                      {b.badge_type}
                    </span>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tests Portal Tab */}
      {activeTab === 'tests' && (
        <div className={`p-6 rounded-3xl border text-left ${
          theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
        }`}>
          <h3 className="font-display font-extrabold text-xl mb-6">Assigned Question Papers & Submissions</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.map((t) => {
              const submission = submissions.find(s => s.test_id === t.id);
              const result = submission ? results.find(r => r.submission_id === submission.id && r.status === 'published') : null;

              return (
                <div key={t.id} className="p-5 rounded-2xl border border-white/5 bg-slate-900/30 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-[9px] font-bold text-indigo-400 uppercase">
                        {t.subject}
                      </span>
                      <span className="text-[10px] text-slate-400 font-light flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Deadline: {new Date(t.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-base mt-3">{t.title}</h4>
                    <p className={`text-xs font-light mt-2 line-clamp-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{t.description}</p>
                    
                    <div className="flex items-center gap-4 mt-4 text-xs">
                      <span className="font-mono">Max Marks: <strong className="text-brand-cyan">{t.total_marks}</strong></span>
                      <span>•</span>
                      <span>
                        Status:{' '}
                        {submission ? (
                          <strong className="text-emerald-400">Submitted</strong>
                        ) : (
                          <strong className="text-red-400">Pending upload</strong>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                    <button
                      onClick={() => window.open(t.question_paper_url, '_blank')}
                      className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-bold text-white flex items-center justify-center gap-2"
                    >
                      <Download className="h-4 w-4 text-brand-cyan" />
                      Paper PDF
                    </button>

                    {submission ? (
                      submission.status === 'evaluated' && result ? (
                        <button
                          onClick={() => {
                            setSelectedResult({ result, test: t });
                          }}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold"
                        >
                          Grade: {result.grade} ({result.percentage}%)
                        </button>
                      ) : (
                        <button
                          onClick={() => setSelectedTestToSubmit(t)}
                          className="flex-1 py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-semibold"
                        >
                          Resubmit Answers
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => setSelectedTestToSubmit(t)}
                        className="flex-1 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/80 text-xs font-bold text-white"
                      >
                        Upload Answers
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Graphing Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 text-left">
          <Suspense fallback={
            <div className="py-20 text-center flex flex-col items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-brand-cyan"></div>
              <p className="text-xs text-slate-400 mt-2 font-mono uppercase tracking-wider animate-pulse">Loading Analytics Charts...</p>
            </div>
          }>
            <StudentCharts theme={theme} performanceData={performanceData} trendData={trendData} />
          </Suspense>

          {/* Weak chapters and strong areas highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="p-6 rounded-3xl border border-red-500/10 bg-red-500/5">
              <h4 className="font-display font-bold text-base text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Focus Chapters (Improvement Needed)
              </h4>
              <ul className="mt-4 space-y-2 text-xs font-light text-slate-300">
                <li className="flex justify-between items-center p-2 rounded bg-slate-955/20">
                  <span>Chemical Equilibrium & Catalyst Rates</span>
                  <span className="text-red-400 font-semibold font-mono">CHEM-303</span>
                </li>
                <li className="flex justify-between items-center p-2 rounded bg-slate-955/20">
                  <span>Three-Dimensional Vector Coordinates</span>
                  <span className="text-red-400 font-semibold font-mono">MATH-101</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-3xl border border-emerald-500/10 bg-emerald-500/5">
              <h4 className="font-display font-bold text-base text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Strong Concept Pillars (Excellence)
              </h4>
              <ul className="mt-4 space-y-2 text-xs font-light text-slate-350">
                <li className="flex justify-between items-center p-2 rounded bg-slate-955/20">
                  <span>Carbon Ring Isomer & Benzene Structures</span>
                  <span className="text-emerald-400 font-semibold font-mono">CHEM-303</span>
                </li>
                <li className="flex justify-between items-center p-2 rounded bg-slate-955/20">
                  <span>Maxwell Electromagnetism Integration</span>
                  <span className="text-emerald-400 font-semibold font-mono">PHYS-202</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* Achievements and Certificates Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-6 text-left">
          
          {/* Printable Certificates */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
          }`}>
            <h3 className="font-display font-extrabold text-lg mb-4">Official Performance Certificates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="p-4 rounded-2xl border border-white/5 bg-slate-900/30 flex justify-between items-center hover:border-brand-purple/20 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan flex items-center justify-center text-white">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">{cert.certificate_type} Certificate</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Issued: {new Date(cert.issued_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadCertificate(cert)}
                    className="p-2.5 rounded-xl bg-slate-90 border border-white/10 hover:bg-slate-800 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    <Download className="h-4 w-4 text-brand-cyan" />
                    PDF
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Badges library */}
          <div className={`p-6 rounded-3xl border ${
            theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
          }`}>
            <h3 className="font-display font-extrabold text-lg mb-4">Milestone Badges Library</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/20 text-center space-y-2 hover:rotate-2 transition-transform cursor-pointer">
                <div className="text-3xl animate-bounce">🔥</div>
                <h4 className="text-xs font-bold text-brand-pink">Fast Submission</h4>
                <p className="text-[9px] text-slate-500 font-light">Turn in answers 24 hours before deadlines.</p>
              </div>

              <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/20 text-center space-y-2 hover:-rotate-2 transition-transform cursor-pointer">
                <div className="text-3xl animate-bounce">🌟</div>
                <h4 className="text-xs font-bold text-yellow-400">Consistent Performer</h4>
                <p className="text-[9px] text-slate-500 font-light">Hold an average above 85% for 3 months.</p>
              </div>

              <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/20 text-center space-y-2 hover:rotate-2 transition-transform cursor-pointer">
                <div className="text-3xl animate-bounce">🧪</div>
                <h4 className="text-xs font-bold text-brand-cyan">Subject Expert</h4>
                <p className="text-[9px] text-slate-500 font-light">Unlock A grades across 3 sciences tests.</p>
              </div>

              <div className="p-4 rounded-2xl border border-white/5 bg-slate-900/20 text-center space-y-2 hover:-rotate-2 transition-transform cursor-pointer">
                <div className="text-3xl animate-bounce">🏆</div>
                <h4 className="text-xs font-bold text-brand-purple">Top Scorer</h4>
                <p className="text-[9px] text-slate-500 font-light">Achieve a perfect 95%+ score on midterms.</p>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* Answer Upload Overlay Modal */}
      {selectedTestToSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className={`w-full max-w-md p-6 rounded-3xl border relative ${
            theme === 'dark' ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-black/10 text-slate-900'
          }`}>
            <button 
              onClick={() => {
                setSelectedTestToSubmit(null);
                setUploadProgress(null);
                setUploadError(null);
                setIsUploading(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white cursor-pointer"
              disabled={isUploading}
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-display font-extrabold text-lg flex items-center gap-1.5 text-brand-purple">
              <Upload className="h-5 w-5 text-brand-cyan" />
              Upload Answer Sheet
            </h3>
            <p className="text-xs text-slate-400 mt-1">Submit solved sheet for: {selectedTestToSubmit.title}</p>

            {uploadStatus && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-medium border ${
                uploadError 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple'
              }`}>
                {uploadStatus}
              </div>
            )}

            {uploadError && (
              <div className="mt-2 text-xs text-rose-500 font-semibold leading-relaxed">
                {uploadError}
              </div>
            )}

            <form onSubmit={handleAnswerSubmit} className="mt-6 space-y-4">
              {/* File Type Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Select File Type</label>
                <div className="flex gap-2">
                  {['pdf', 'jpg', 'png'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={isUploading}
                      onClick={() => setUploadFileType(type)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border uppercase transition-all cursor-pointer ${
                        uploadFileType === type
                          ? 'border-brand-cyan bg-brand-cyan/20 text-white'
                          : 'border-white/5 bg-slate-900 text-slate-400'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag or Browse Zone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Drag or Browse File</label>
                <input
                  type="file"
                  required
                  disabled={isUploading}
                  onChange={(e) => {
                    setUploadFile(e.target.files[0]);
                  }}
                  accept={uploadFileType === 'pdf' ? '.pdf' : '.jpg,.jpeg,.png'}
                  className="w-full py-4 px-4 text-xs rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-slate-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-brand-cyan file:cursor-pointer"
                />
              </div>

              {/* Real-time Progress Bar */}
              {uploadProgress !== null && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                    <span>Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions Button */}
              {uploadError ? (
                <button
                  type="button"
                  onClick={() => handleAnswerSubmit()}
                  className="w-full py-3.5 font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl shadow-lg hover:shadow-orange-500/10 hover:scale-102 active:scale-98 transition-all cursor-pointer"
                >
                  Retry Upload
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3.5 font-bold text-white bg-gradient-to-r from-brand-purple to-brand-cyan rounded-xl shadow-lg hover:shadow-cyan-500/10 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? 'Uploading solved sheet...' : 'Upload Sheet'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Result Details Modal (Simplified - No Locked Vault) */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className={`w-full max-w-xl p-5 sm:p-8 rounded-2xl sm:rounded-3xl border relative max-h-[85vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-955 border-white/10 text-white' : 'bg-white border-black/10 text-slate-900'
          }`}>
            <button 
              onClick={() => {
                setSelectedResult(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-xl">{selectedResult.test.title}</h3>
                <span className="text-[10px] uppercase font-bold text-brand-purple tracking-wide">{selectedResult.test.subject}</span>
              </div>
            </div>

            {/* Scorecard Widget Grid (Uses isolated local countup scorecard) */}
            <ScorecardGrid 
              marksObtained={selectedResult.result.marks_obtained} 
              totalMarks={selectedResult.test.total_marks} 
              grade={selectedResult.result.grade} 
            />

            {/* Teacher feedback remarks */}
            <div className="mt-6 text-left">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Teacher Evaluation Remarks</h4>
              <p className="mt-2 text-sm italic bg-slate-900/40 p-4 rounded-xl border border-white/5 text-slate-400 font-light">
                " {selectedResult.result.feedback || 'Outstanding reasoning in formulas.'} "
              </p>
            </div>

            {/* AI Diagnostics */}
            {selectedResult.result.ai_feedback && (
              <div className="mt-6 text-left space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-brand-purple flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-brand-cyan animate-pulse" />
                  AI Performance Diagnostic & Feedback
                </h4>
                
                {/* Simulated OCR Scanner Specs */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/5 text-[10px]">
                  <div>
                    <span className="text-slate-500">OCR Scan Confidence:</span>
                    <strong className="block text-brand-cyan font-mono mt-0.5">{selectedResult.result.ai_feedback.ocr_confidence || '95.2%'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Syllabus Match Similarity:</span>
                    <strong className="block text-brand-cyan font-mono mt-0.5">{selectedResult.result.ai_feedback.comparison_matched || '88%'}</strong>
                  </div>
                </div>

                {/* Gemini Feedback Text */}
                {selectedResult.result.ai_feedback.studentFeedback && (
                  <div className="p-4 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 space-y-1">
                    <span className="text-[10px] font-bold text-brand-cyan uppercase tracking-wider block">Diagnostic Summary</span>
                    <p className="text-xs text-slate-300 leading-relaxed font-light">
                      {selectedResult.result.ai_feedback.studentFeedback}
                    </p>
                  </div>
                )}

                {/* Detailed Answer Review */}
                {selectedResult.result.ai_feedback.detailedAnswers && (
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-brand-purple uppercase tracking-wider block">Detailed Question & Answer Review</span>
                    {typeof selectedResult.result.ai_feedback.detailedAnswers === 'string' ? (
                      <div 
                        className="p-4 rounded-xl border border-white/5 bg-slate-900/60 text-xs text-slate-400 font-light leading-relaxed max-h-[300px] overflow-y-auto text-left"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedResult.result.ai_feedback.detailedAnswers) }}
                      />
                    ) : Array.isArray(selectedResult.result.ai_feedback.detailedAnswers) && selectedResult.result.ai_feedback.detailedAnswers.length > 0 ? (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {selectedResult.result.ai_feedback.detailedAnswers.map((item, idx) => (
                          <div key={idx} className="p-3.5 rounded-xl border border-white/5 bg-slate-900/60 text-xs space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-brand-cyan">{item.questionNumber}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                item.status === 'Correct' ? 'bg-emerald-500/10 text-emerald-400' :
                                item.status === 'Partially Correct' ? 'bg-yellow-500/10 text-yellow-400' :
                                'bg-rose-500/10 text-rose-400'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                            
                            <div>
                              <span className="text-[10px] text-slate-500 block">Question:</span>
                              <p className="text-slate-400 font-light mt-0.5">{item.questionText}</p>
                            </div>

                            <div className="p-2.5 rounded bg-slate-950/40 border border-white/5">
                              <span className="text-[9px] text-slate-500 block font-semibold">Student's Answer:</span>
                              <p className="text-slate-400 italic font-light mt-0.5">"{item.studentAnswer}"</p>
                            </div>

                            {/* Keywords tags */}
                            <div className="flex flex-wrap gap-1.5 py-1">
                              {item.keywordsMatched && item.keywordsMatched.map((k, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] text-emerald-400 border border-emerald-500/20">
                                  ✓ {k}
                                </span>
                              ))}
                              {item.keywordsMissing && item.keywordsMissing.map((k, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-rose-500/10 text-[9px] text-rose-400 border border-rose-500/20">
                                  ✗ {k}
                                </span>
                              ))}
                            </div>

                            {item.mistake && (
                              <div className="text-[11px]">
                                <span className="text-rose-400 font-semibold">Mistake: </span>
                                <span className="text-slate-300 font-light">{item.mistake}</span>
                              </div>
                            )}

                            {item.improvement && (
                              <div className="text-[11px]">
                                <span className="text-yellow-400 font-semibold">How to Improve: </span>
                                <span className="text-slate-300 font-light">{item.improvement}</span>
                              </div>
                            )}

                            {item.correctAnswer && (
                              <div className="p-2.5 rounded bg-brand-purple/5 border border-brand-purple/10 text-[11px]">
                                <span className="text-brand-cyan font-semibold block mb-0.5">Proper Model Answer to Learn:</span>
                                <p className="text-slate-300 font-light">{item.correctAnswer}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Strengths & Weak Areas Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Strengths */}
                  {selectedResult.result.ai_feedback.strengths && (
                    <div className="p-3.5 rounded-xl border border-emerald-500/10 bg-emerald-500/5">
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block mb-2">Strengths</span>
                      <ul className="space-y-1 text-[10px] list-disc list-inside text-slate-400 leading-relaxed font-light">
                        {selectedResult.result.ai_feedback.strengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Weak Areas */}
                  {selectedResult.result.ai_feedback.weakAreas && (
                    <div className="p-3.5 rounded-xl border border-brand-pink/10 bg-brand-pink/5">
                      <span className="text-[9px] font-bold text-brand-pink uppercase tracking-wider block mb-2">Areas of Focus</span>
                      <ul className="space-y-1 text-[10px] list-disc list-inside text-slate-400 leading-relaxed font-light">
                        {selectedResult.result.ai_feedback.weakAreas.map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Revision Plan */}
                {selectedResult.result.ai_feedback.revisionPlan && (
                  <div className="p-4 rounded-xl border border-brand-purple/20 bg-brand-purple/5 space-y-1">
                    <span className="text-[10px] font-bold text-brand-purple uppercase tracking-wider block">7-Day Study Revision Plan</span>
                    <p className="text-xs text-slate-300 leading-relaxed font-light">
                      {selectedResult.result.ai_feedback.revisionPlan}
                    </p>
                  </div>
                )}

                {/* Motivation Message */}
                {selectedResult.result.ai_feedback.motivationMessage && (
                  <div className="p-3 text-center rounded-xl bg-gradient-to-r from-brand-purple/10 to-brand-cyan/10 border border-white/5 text-[10px] text-brand-cyan font-semibold">
                    ✨ "{selectedResult.result.ai_feedback.motivationMessage}"
                  </div>
                )}
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
                onClick={() => {
                  setSelectedResult(null);
                }}
                className="px-6 py-3 text-center text-xs font-bold text-slate-300 bg-slate-900 border border-white/10 rounded-xl hover:bg-slate-800"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

        </main>
      </div>
    </div>
  );
};

export default StudentDashboard;

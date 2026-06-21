import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockDb } from '../database/mockDb';
import { supabase, isLiveMode } from '../database/supabaseClient';
import DashboardHeader from '../components/DashboardHeader';
import NotificationBell from '../components/NotificationBell';
import { EmptyState, Skeleton } from '../components/ui';
import ResultModal from '../components/ResultModal';
import {
  LayoutDashboard, Plus, BookOpen, FileText, ClipboardList, CheckCircle2,
  Users, BarChart2, Settings, Menu, X, Upload, Calendar, Clock, Trash2,
  Edit, Download, Search, Sparkles, ChevronRight, Award, Eye, AlertTriangle,
  RefreshCw, CheckSquare
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'question-bank', label: 'Question Bank', icon: ClipboardList },
  { id: 'create-test', label: 'Create Test', icon: Plus },
  { id: 'tests', label: 'Tests', icon: BookOpen },
  { id: 'submissions', label: 'Submissions', icon: FileText },
  { id: 'eval-queue', label: 'Evaluation Queue', icon: ClipboardList },
  { id: 'results', label: 'Results', icon: CheckCircle2 },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'English'];
const GRADE_COLORS = ['#4ade80', '#22d3ee', '#facc15', '#fb923c', '#f87171', '#a78bfa'];

const gradeLabel = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

export const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user, teacher, theme } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Data state
  const [stats, setStats] = useState({ students: 0, activeTests: 0, pending: 0, evaluated: 0 });
  const [tests, setTests] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [results, setResults] = useState([]);
  const [students, setStudents] = useState([]);
  const [analytics, setAnalytics] = useState({ subjectChartData: [], gradeChartData: [], trendData: [] });
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  // Create Test form
  const [testForm, setTestForm] = useState({
    title: '', description: '', subject: 'Physics', chapter: '',
    total_marks: 40, deadline: '', question_paper_url: ''
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [paperUploadStatus, setPaperUploadStatus] = useState('');
  const [testFormMsg, setTestFormMsg] = useState('');
  const [testFormLoading, setTestFormLoading] = useState(false);
  const [editTestId, setEditTestId] = useState(null);

  // Submission filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTest, setFilterTest] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  // Result view modal
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedResultSubmission, setSelectedResultSubmission] = useState(null);
  const [selectedResultTest, setSelectedResultTest] = useState(null);
  const [selectedResultStudent, setSelectedResultStudent] = useState(null);

  // Question Bank states
  const [questions, setQuestions] = useState([]);
  const [qSearchQuery, setQSearchQuery] = useState('');
  const [qFilterSubject, setQFilterSubject] = useState('all');
  const [qFilterDifficulty, setQFilterDifficulty] = useState('all');
  const [showQModal, setShowQModal] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [qForm, setQForm] = useState({
    subject: 'Physics',
    topic: '',
    difficulty: 'Medium',
    question_text: '',
    marking_scheme: ''
  });
  const [qFormLoading, setQFormLoading] = useState(false);
  const [qFormMsg, setQFormMsg] = useState('');

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [tList, sList, rList, stdList, analyticsData, qList] = await Promise.all([
        mockDb.getTests(),
        isLiveMode && supabase
          ? supabase.from('submissions').select('*').order('submitted_at', { ascending: false }).then(r => r.data || [])
          : mockDb.getSubmissions(),
        mockDb.getResults(),
        mockDb.getAllStudents(),
        mockDb.getAnalytics(),
        mockDb.getQuestionBank()
      ]);

      setTests(tList);
      setSubmissions(sList);
      setResults(rList);
      setStudents(stdList);
      setAnalytics(analyticsData);
      setRecentSubmissions(sList.slice(0, 5));
      setQuestions(qList || []);

      const pendingCount = sList.filter(s => s.status === 'pending').length;
      const evaluatedCount = sList.filter(s => s.status === 'evaluated').length;

      setStats({
        students: stdList.length,
        activeTests: tList.filter(t => t.status === 'published').length,
        pending: pendingCount,
        evaluated: evaluatedCount
      });
    } catch (err) {
      console.error('TeacherDashboard loadData error:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleQSubmit = async (e) => {
    e.preventDefault();
    setQFormLoading(true);
    setQFormMsg('');
    try {
      if (editingQuestionId) {
        await mockDb.updateQuestionInBank(editingQuestionId, qForm);
        setQFormMsg('Question updated successfully.');
      } else {
        await mockDb.addQuestionToBank(qForm);
        setQFormMsg('Question added successfully.');
      }
      setQForm({ subject: 'Physics', topic: '', difficulty: 'Medium', question_text: '', marking_scheme: '' });
      setEditingQuestionId(null);
      await loadData();
      setTimeout(() => {
        setQFormMsg('');
        setShowQModal(false);
      }, 1500);
    } catch (err) {
      setQFormMsg(`Error: ${err.message}`);
    } finally {
      setQFormLoading(false);
    }
  };

  const handleOpenEditQ = (q) => {
    setEditingQuestionId(q.id);
    setQForm({
      subject: q.subject,
      topic: q.topic,
      difficulty: q.difficulty,
      question_text: q.question_text,
      marking_scheme: q.marking_scheme
    });
    setShowQModal(true);
  };

  const handleDeleteQ = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question from the bank?')) return;
    try {
      await mockDb.deleteQuestionFromBank(id);
      await loadData();
    } catch (err) {
      alert(`Failed to delete question: ${err.message}`);
    }
  };

  // â”€â”€â”€ FILE UPLOAD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handlePaperUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPaperUploadStatus('Uploadingâ€¦');
    try {
      if (isLiveMode && supabase) {
        const path = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const { error } = await supabase.storage.from('question-papers').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('question-papers').getPublicUrl(path);
        setTestForm(f => ({ ...f, question_paper_url: publicUrl }));
        setPaperUploadStatus('Uploaded âœ“');
      } else {
        setTestForm(f => ({ ...f, question_paper_url: file.name }));
        setPaperUploadStatus(`Saved: ${file.name}`);
      }
    } catch (err) {
      setPaperUploadStatus(`Failed: ${err.message}`);
    }
  };

  // â”€â”€â”€ CREATE / EDIT TEST â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleTestSubmit = async (e) => {
    e.preventDefault();
    setTestFormLoading(true);
    setTestFormMsg('');
    try {
      let test;
      if (editTestId) {
        test = await mockDb.editTest(editTestId, { ...testForm, teacher_id: user?.id });
        setTestFormMsg('Test updated successfully.');
      } else {
        test = await mockDb.addTest({ ...testForm, teacher_id: user?.id });
        if (selectedStudents.length > 0) {
          await mockDb.assignTestToStudents(test.id, selectedStudents);
          setTestFormMsg(`Test created and assigned to ${selectedStudents.length} student(s). Emails sent.`);
        } else {
          setTestFormMsg('Test created. No students selected for assignment.');
        }
      }
      setTestForm({ title: '', description: '', subject: 'Physics', chapter: '', total_marks: 40, deadline: '', question_paper_url: '' });
      setSelectedStudents([]);
      setPaperUploadStatus('');
      setEditTestId(null);
      await loadData();
      setTimeout(() => { setTestFormMsg(''); setActiveTab('tests'); }, 2000);
    } catch (err) {
      setTestFormMsg(`Error: ${err.message}`);
    } finally {
      setTestFormLoading(false);
    }
  };

  const handleOpenEdit = (t) => {
    setEditTestId(t.id);
    setTestForm({
      title: t.title,
      description: t.description || '',
      subject: t.subject,
      chapter: t.chapter || '',
      total_marks: t.total_marks,
      deadline: t.deadline ? t.deadline.slice(0, 16) : '',
      question_paper_url: t.question_paper_url || ''
    });
    setActiveTab('create-test');
  };

  const handleDeleteTest = async (id) => {
    if (!window.confirm('Delete this test? All submissions will also be removed.')) return;
    await mockDb.deleteTest(id);
    await loadData();
  };

  const toggleStudentSelect = (id) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  // â”€â”€â”€ SUBMISSION FILTERING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredSubmissions = submissions
    .filter(sub => {
      const student = students.find(s => s.id === sub.student_id);
      const name = (student?.name || '').toLowerCase();
      const matchSearch = name.includes(searchQuery.toLowerCase());
      const matchTest = filterTest === 'all' || sub.test_id === filterTest;
      return matchSearch && matchTest;
    })
    .sort((a, b) => sortOrder === 'newest'
      ? new Date(b.submitted_at) - new Date(a.submitted_at)
      : new Date(a.submitted_at) - new Date(b.submitted_at)
    );

  const pendingSubmissions = filteredSubmissions.filter(s => s.status === 'pending');

  // â”€â”€â”€ RESULT VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleViewResult = (r) => {
    const sub = submissions.find(s => s.id === r.submission_id);
    const t = sub ? tests.find(x => x.id === sub.test_id) : null;
    const std = sub ? students.find(s => s.id === sub.student_id) : null;
    setSelectedResult(r);
    setSelectedResultSubmission(sub);
    setSelectedResultTest(t);
    setSelectedResultStudent(std);
  };

  const gc = (theme === 'dark') ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5';

  if (dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-cyan" />
          <p className="text-sm text-slate-400">Loading dashboardâ€¦</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative z-10">
      {/* ── SIDEBAR ────────────────────────────────────────────────────────── */}
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
          <button onClick={() => setSidebarOpen(false)} className={`lg:hidden p-1 text-slate-400 hover:text-slate-650 dark:hover:text-white`}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Admin badge */}
        <div className="px-5 pt-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-3">Admin Panel</span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-6">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? 'bg-gradient-to-r from-brand-purple/15 to-brand-cyan/10 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 shadow-sm'
                    : theme === 'dark'
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-brand-cyan' : ''}`} />
                {item.label}
                {item.id === 'eval-queue' && stats.pending > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[9px] font-bold">
                    {stats.pending}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <div className={`sticky top-0 z-30 px-4 lg:px-6 py-3 border-b flex items-center justify-between gap-4
          ${theme === 'dark' ? 'bg-slate-950/80 border-white/5 backdrop-blur-xl' : 'bg-white/80 border-slate-200 backdrop-blur-xl'}
        `}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-xl border text-slate-400 hover:text-slate-650 dark:hover:text-white ${
                theme === 'dark' ? 'border-white/10' : 'border-slate-200'
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-display font-extrabold text-base text-slate-900 dark:text-white">
                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
              </h1>
              <p className="text-[11px] text-slate-500">EduTrack AI Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell userId={user?.id} theme={theme} />
            <img
              src={user?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user?.name || 'admin')}`}
              alt="avatar"
              className="h-9 w-9 rounded-xl border border-white/10"
            />
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full">

          {/* â•â• DASHBOARD â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students', value: stats.students, icon: Users, color: 'text-brand-cyan', bg: 'border-brand-cyan/15 bg-brand-cyan/5' },
                  { label: 'Active Tests', value: stats.activeTests, icon: BookOpen, color: 'text-brand-purple', bg: 'border-brand-purple/15 bg-brand-purple/5' },
                  { label: 'Pending Evaluations', value: stats.pending, icon: Clock, color: 'text-yellow-400', bg: 'border-yellow-500/15 bg-yellow-500/5' },
                  { label: 'Evaluated', value: stats.evaluated, icon: CheckCircle2, color: 'text-emerald-400', bg: 'border-emerald-500/15 bg-emerald-500/5' },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className={`p-5 rounded-2xl border ${card.bg}`}>
                      <Icon className={`h-5 w-5 ${card.color} mb-3`} />
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{card.label}</p>
                      <h3 className={`text-3xl font-extrabold font-display mt-1 ${card.color}`}>{card.value}</h3>
                    </div>
                  );
                })}
              </div>

              {/* Recent Submissions */}
              <div className={`p-5 rounded-2xl border ${gc}`}>
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-cyan" />
                  Recent Submissions
                </h3>
                {recentSubmissions.length === 0 ? (
                  <EmptyState icon={FileText} title="No submissions yet" description="Student answer sheets will appear here once submitted." iconColorClass="text-slate-500 border-slate-700 bg-slate-800/50" />
                ) : (
                  <div className="space-y-2">
                    {recentSubmissions.map(sub => {
                      const std = students.find(s => s.id === sub.student_id);
                      const t = tests.find(x => x.id === sub.test_id);
                      return (
                        <div key={sub.id} className={`flex items-center justify-between p-3 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/2' : 'border-slate-100 bg-slate-50'}`}>
                          <div className="flex items-center gap-3">
                            <img src={std?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${std?.name}`} className="h-8 w-8 rounded-lg border border-white/10" alt="" />
                            <div>
                              <p className="text-xs font-semibold">{std?.name || 'Student'}</p>
                              <p className="text-[10px] text-slate-500">{t?.title || 'Test'} â€¢ {sub.file_type?.toUpperCase()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${sub.status === 'evaluated' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                              {sub.status}
                            </span>
                            {sub.status === 'pending' && (
                              <button
                                onClick={() => navigate(`/evaluate?submission=${sub.id}`)}
                                className="px-3 py-1 rounded-lg bg-brand-purple/20 text-brand-purple text-[10px] font-bold hover:bg-brand-purple/30 transition-colors"
                              >
                                Evaluate
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* â•â• CREATE TEST â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'create-test' && (
            <div className={`p-6 rounded-2xl border ${gc} max-w-2xl`}>
              <h2 className="font-display font-extrabold text-xl mb-1 flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-cyan" />
                {editTestId ? 'Edit Test' : 'Create New Test'}
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                {editTestId ? 'Update the existing test configuration.' : 'Fill in the test details and assign students.'}
              </p>

              {testFormMsg && (
                <div className={`p-3 rounded-xl text-xs mb-4 ${testFormMsg.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                  {testFormMsg}
                </div>
              )}

              <form onSubmit={handleTestSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subject *</label>
                    <select value={testForm.subject} onChange={e => setTestForm(f => ({ ...f, subject: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Marks *</label>
                    <input type="number" min="1" required value={testForm.total_marks}
                      onChange={e => setTestForm(f => ({ ...f, total_marks: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Test Title *</label>
                  <input type="text" required placeholder="e.g. Physics Chapter 5 â€” Magnetism" value={testForm.title}
                    onChange={e => setTestForm(f => ({ ...f, title: e.target.value }))}
                    className={`w-full py-2.5 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chapter / Topic</label>
                  <input type="text" placeholder="e.g. Magnetism and Matter" value={testForm.chapter}
                    onChange={e => setTestForm(f => ({ ...f, chapter: e.target.value }))}
                    className={`w-full py-2.5 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Instructions *</label>
                  <textarea required rows="3" placeholder="Answer all questions. Attempt any 4 questions from Section Bâ€¦" value={testForm.description}
                    onChange={e => setTestForm(f => ({ ...f, description: e.target.value }))}
                    className={`w-full py-2.5 px-3 text-xs rounded-xl border resize-none ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Deadline *</label>
                    <input type="datetime-local" required value={testForm.deadline}
                      onChange={e => setTestForm(f => ({ ...f, deadline: e.target.value }))}
                      className={`w-full py-2.5 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Question Paper PDF{' '}
                      {paperUploadStatus && <span className="text-brand-cyan font-normal normal-case">({paperUploadStatus})</span>}
                    </label>
                    <input type="file" accept=".pdf" onChange={handlePaperUpload}
                      className={`w-full py-2 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-600'}`} />
                  </div>
                </div>

                {/* Student Assignment */}
                {!editTestId && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Assign to Students ({selectedStudents.length} selected)
                    </label>
                    {students.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No students registered yet.</p>
                    ) : (
                      <div className={`max-h-40 overflow-y-auto rounded-xl border p-2 space-y-1 ${theme === 'dark' ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
                        {students.map(s => (
                          <label key={s.id} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedStudents.includes(s.id) ? 'bg-brand-cyan/10' : 'hover:bg-white/3'}`}>
                            <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudentSelect(s.id)}
                              className="rounded border-white/20 accent-brand-cyan" />
                            <img src={s.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.name}`} className="h-6 w-6 rounded-lg" alt="" />
                            <span className="text-xs font-medium">{s.name}</span>
                            <span className="text-[10px] text-slate-500 ml-auto">{s.class_name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {students.length > 0 && (
                      <button type="button" onClick={() => setSelectedStudents(selectedStudents.length === students.length ? [] : students.map(s => s.id))}
                        className="text-[10px] text-brand-cyan hover:underline">
                        {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {editTestId && (
                    <button type="button" onClick={() => { setEditTestId(null); setTestForm({ title: '', description: '', subject: 'Physics', chapter: '', total_marks: 40, deadline: '', question_paper_url: '' }); }}
                      className={`flex-1 py-3 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}>
                      Cancel Edit
                    </button>
                  )}
                  <button type="submit" disabled={testFormLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                    {testFormLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {editTestId ? 'Update Test' : 'Publish & Assign Test'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* â•â• TESTS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'tests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display font-bold text-lg">All Tests ({tests.length})</h2>
                <button onClick={() => { setEditTestId(null); setActiveTab('create-test'); }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-bold flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> Create Test
                </button>
              </div>

              {tests.length === 0 ? (
                <EmptyState icon={BookOpen} title="No tests created yet" description="Create your first test to get started." iconColorClass="text-brand-cyan border-brand-cyan/20 bg-brand-cyan/5" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tests.map(t => {
                    const subCount = submissions.filter(s => s.test_id === t.id).length;
                    const isPast = new Date(t.deadline) < new Date();
                    return (
                      <div key={t.id} className={`p-5 rounded-2xl border flex flex-col gap-4 ${gc}`}>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="px-2 py-0.5 rounded bg-brand-cyan/15 text-[9px] font-bold text-brand-cyan uppercase">{t.subject}</span>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${isPast ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                              {isPast ? 'Closed' : 'Active'}
                            </span>
                          </div>
                          <h4 className="font-bold text-sm mt-1">{t.title}</h4>
                          {t.chapter && <p className="text-[10px] text-slate-500 mt-0.5">{t.chapter}</p>}
                          <div className="flex gap-3 mt-3 text-[10px] text-slate-400 font-mono">
                            <span>Marks: <strong className="text-white">{t.total_marks}</strong></span>
                            <span>Submissions: <strong className="text-brand-cyan">{subCount}</strong></span>
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-500">
                            <Calendar className="h-3 w-3" />
                            <span>Due: {new Date(t.deadline).toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-white/5">
                          <button onClick={() => handleOpenEdit(t)}
                            className={`flex-1 py-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 ${theme === 'dark' ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-100'}`}>
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </button>
                          {t.question_paper_url && t.question_paper_url !== 'question_paper.pdf' && (
                            <a href={t.question_paper_url} target="_blank" rel="noreferrer"
                              className="py-2 px-3 rounded-xl border border-brand-cyan/20 bg-brand-cyan/5 text-brand-cyan text-[10px] font-bold flex items-center gap-1">
                              <Download className="h-3.5 w-3.5" /> PDF
                            </a>
                          )}
                          <button onClick={() => handleDeleteTest(t.id)}
                            className="p-2 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* â•â• SUBMISSIONS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {(activeTab === 'submissions' || activeTab === 'eval-queue') && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg">
                {activeTab === 'eval-queue' ? `Evaluation Queue (${stats.pending} pending)` : `All Submissions (${submissions.length})`}
              </h2>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <input type="text" placeholder="Search studentsâ€¦" value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full py-2.5 pl-9 pr-4 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`} />
                </div>
                <select value={filterTest} onChange={e => setFilterTest(e.target.value)}
                  className={`py-2.5 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}>
                  <option value="all">All Tests</option>
                  {tests.map(t => <option key={t.id} value={t.id}>{t.title.slice(0, 30)}</option>)}
                </select>
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
                  className={`py-2.5 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {(activeTab === 'eval-queue' ? pendingSubmissions : filteredSubmissions).length === 0 ? (
                <EmptyState icon={activeTab === 'eval-queue' ? CheckCircle2 : FileText}
                  title={activeTab === 'eval-queue' ? 'No pending evaluations' : 'No submissions found'}
                  description={activeTab === 'eval-queue' ? 'All submissions have been evaluated.' : 'No answer sheets match your filter.'}
                  iconColorClass="text-brand-purple border-brand-purple/20 bg-brand-purple/5" />
              ) : (
                <div className="space-y-2">
                  {(activeTab === 'eval-queue' ? pendingSubmissions : filteredSubmissions).map(sub => {
                    const std = students.find(s => s.id === sub.student_id);
                    const t = tests.find(x => x.id === sub.test_id);
                    const res = results.find(r => r.submission_id === sub.id);
                    return (
                      <div key={sub.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${theme === 'dark' ? 'border-white/5 bg-white/2 hover:border-white/10' : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}>
                        <div className="flex items-center gap-3">
                          <img src={std?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${std?.name}`} className="h-10 w-10 rounded-xl border border-white/10" alt="" />
                          <div>
                            <p className="text-sm font-bold">{std?.name || 'Student'}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {t?.title || 'Test'} â€¢ <span className="uppercase font-bold text-brand-cyan">{sub.file_type}</span> â€¢ {new Date(sub.submitted_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${sub.status === 'evaluated' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                            {sub.status}
                          </span>
                          {res && (
                            <span className="text-xs font-bold text-brand-cyan">{res.marks_obtained}/{t?.total_marks}</span>
                          )}
                          <button
                            onClick={() => navigate(`/evaluate?submission=${sub.id}`)}
                            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-1 ${
                              sub.status === 'evaluated'
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                                : 'bg-brand-purple hover:bg-brand-purple/80 text-white'
                            }`}>
                            {sub.status === 'evaluated' ? <Eye className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                            {sub.status === 'evaluated' ? 'Review' : 'Evaluate'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* â•â• RESULTS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'results' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg">Published Results ({results.filter(r => r.status === 'published').length})</h2>
              {results.filter(r => r.status === 'published').length === 0 ? (
                <EmptyState icon={CheckCircle2} title="No published results yet" description="Results will appear here after teacher publishes evaluations." iconColorClass="text-emerald-400 border-emerald-500/20 bg-emerald-500/5" />
              ) : (
                <div className="space-y-2">
                  {results.filter(r => r.status === 'published').map(r => {
                    const sub = submissions.find(s => s.id === r.submission_id);
                    const std = sub ? students.find(s => s.id === sub.student_id) : null;
                    const t = sub ? tests.find(x => x.id === sub.test_id) : null;
                    const gConf = {
                      color: r.grade?.startsWith('A') ? 'text-emerald-400' : r.grade === 'B' ? 'text-cyan-400' : r.grade === 'C' ? 'text-yellow-400' : r.grade === 'D' ? 'text-orange-400' : 'text-red-400'
                    };
                    return (
                      <div key={r.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border transition-all cursor-pointer ${theme === 'dark' ? 'border-white/5 bg-white/2 hover:border-brand-purple/20' : 'border-slate-100 bg-slate-50 hover:border-brand-purple/20'}`}
                        onClick={() => handleViewResult(r)}>
                        <div className="flex items-center gap-3">
                          <img src={std?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${std?.name}`} className="h-10 w-10 rounded-xl border border-white/10" alt="" />
                          <div>
                            <p className="text-sm font-bold">{std?.name || 'Student'}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{t?.subject} â€” {t?.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className={`text-lg font-extrabold ${gConf.color}`}>{r.marks_obtained}/{t?.total_marks}</p>
                            <p className="text-[10px] text-slate-500">{r.percentage}%</p>
                          </div>
                          <div className={`text-2xl font-extrabold font-display ${gConf.color}`}>{r.grade}</div>
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* â•â• STUDENTS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'students' && (
            <div className="space-y-4">
              <h2 className="font-display font-bold text-lg">Students ({students.length})</h2>
              {students.length === 0 ? (
                <EmptyState icon={Users} title="No students registered" description="Students will appear here after they sign up." iconColorClass="text-brand-cyan border-brand-cyan/20 bg-brand-cyan/5" />
              ) : (
                <div className="space-y-2">
                  {students.map(s => {
                    const subCount = submissions.filter(x => x.student_id === s.id).length;
                    return (
                      <div key={s.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border ${gc}`}>
                        <div className="flex items-center gap-3">
                          <img src={s.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${s.name}`} className="h-10 w-10 rounded-xl border border-white/10" alt="" />
                          <div>
                            <p className="text-sm font-bold">{s.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{s.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right text-xs">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Class</p>
                            <p className="font-bold text-white">{s.class_name || 'â€”'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Reg No.</p>
                            <p className="font-mono font-bold text-brand-cyan text-[10px]">{s.registration_number || 'â€”'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tests</p>
                            <p className="font-bold text-white">{subCount}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* â•â• REPORTS / ANALYTICS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <h2 className="font-display font-bold text-lg">Analytics & Reports</h2>

              {analytics.subjectChartData.length === 0 && analytics.gradeChartData.length === 0 ? (
                <EmptyState icon={BarChart2} title="No analytics data yet"
                  description="Charts and reports will appear once students submit tests and results are published."
                  iconColorClass="text-brand-purple border-brand-purple/20 bg-brand-purple/5" />
              ) : (
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
              )}
            </div>
          )}

          {/* â•â• SETTINGS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          {activeTab === 'settings' && (
            <div className="space-y-4 max-w-lg">
              <h2 className="font-display font-bold text-lg">Settings</h2>
              <div className={`p-6 rounded-2xl border ${gc} space-y-4`}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Admin Profile</h3>
                <div className="flex items-center gap-4">
                  <img
                    src={user?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${user?.name}`}
                    className="h-16 w-16 rounded-2xl border border-white/10"
                    alt="avatar"
                  />
                  <div>
                    <p className="font-bold text-white">{user?.name}</p>
                    <p className="text-xs text-slate-400">{user?.email}</p>
                    <p className="text-[10px] text-brand-cyan mt-1 uppercase font-bold tracking-wider">Admin / Teacher</p>
                  </div>
                </div>
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/3' : 'border-slate-100 bg-slate-50'} space-y-2`}>
                  {[
                    ['Department', teacher?.department || 'Science & Mathematics'],
                    ['Role', 'Admin / Teacher'],
                    ['Portal Mode', isLiveMode ? 'Live Supabase' : 'Local Sandbox'],
                  ].map(([label, val]) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className="font-bold text-white">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ QUESTION BANK ════════════════════════════════════════════════ */}
          {activeTab === 'question-bank' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-extrabold text-xl text-white">Question Bank DDL</h2>
                  <p className="text-xs text-slate-400">Curate, filter, and manage standard questions for exams.</p>
                </div>
                <button
                  onClick={() => {
                    setEditingQuestionId(null);
                    setQForm({ subject: 'Physics', topic: '', difficulty: 'Medium', question_text: '', marking_scheme: '' });
                    setShowQModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-bold flex items-center gap-1.5 hover:shadow-cyan-500/10 transition-all"
                >
                  <Plus className="h-4 w-4" /> Add Question
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-550" />
                  <input
                    type="text"
                    placeholder="Search by topic or text..."
                    value={qSearchQuery}
                    onChange={e => setQSearchQuery(e.target.value)}
                    className={`w-full py-2.5 pl-9 pr-4 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}
                  />
                </div>
                <select
                  value={qFilterSubject}
                  onChange={e => setQFilterSubject(e.target.value)}
                  className={`py-2.5 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}
                >
                  <option value="all">All Subjects</option>
                  {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
                <select
                  value={qFilterDifficulty}
                  onChange={e => setQFilterDifficulty(e.target.value)}
                  className={`py-2.5 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}
                >
                  <option value="all">All Difficulties</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {/* Questions List */}
              {questions.filter(q => {
                const matchSearch = q.topic.toLowerCase().includes(qSearchQuery.toLowerCase()) || q.question_text.toLowerCase().includes(qSearchQuery.toLowerCase());
                const matchSub = qFilterSubject === 'all' || q.subject === qFilterSubject;
                const matchDiff = qFilterDifficulty === 'all' || q.difficulty === qFilterDifficulty;
                return matchSearch && matchSub && matchDiff;
              }).length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No Questions Found"
                  description="Add questions or clear your search filters."
                  iconColorClass="text-brand-purple border-brand-purple/20 bg-brand-purple/5"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {questions.filter(q => {
                    const matchSearch = q.topic.toLowerCase().includes(qSearchQuery.toLowerCase()) || q.question_text.toLowerCase().includes(qSearchQuery.toLowerCase());
                    const matchSub = qFilterSubject === 'all' || q.subject === qFilterSubject;
                    const matchDiff = qFilterDifficulty === 'all' || q.difficulty === qFilterDifficulty;
                    return matchSearch && matchSub && matchDiff;
                  }).map(q => {
                    const diffColors = q.difficulty === 'Easy' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : q.difficulty === 'Hard' ? 'bg-red-500/15 text-red-400 border-red-500/20' : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
                    return (
                      <div key={q.id} className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 ${gc}`}>
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-brand-cyan/15 border border-brand-cyan/30 text-[9px] font-bold text-brand-cyan uppercase">{q.subject}</span>
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${diffColors}`}>{q.difficulty}</span>
                          </div>
                          <h4 className="text-[10px] uppercase font-bold text-slate-500 mt-3 font-mono">Topic: {q.topic}</h4>
                          <p className="text-xs text-slate-200 mt-2 font-medium leading-relaxed font-sans">{q.question_text}</p>
                          <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-white/5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-purple block mb-1">Standard Marking Scheme</span>
                            <p className="text-[11px] text-slate-400 leading-normal font-light">{q.marking_scheme}</p>
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
                          <button
                            onClick={() => handleOpenEditQ(q)}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteQ(q.id)}
                            className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add/Edit Question Glass Modal Dialog */}
              {showQModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                  <div className={`w-full max-w-lg p-6 rounded-3xl border relative ${theme === 'dark' ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-black/10 text-slate-900'}`}>
                    <button
                      onClick={() => setShowQModal(false)}
                      className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <h3 className="font-display font-extrabold text-lg mb-1 flex items-center gap-2">
                      <ClipboardList className="h-5 w-5 text-brand-cyan" />
                      {editingQuestionId ? 'Modify Question' : 'Add Question to Bank'}
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-4">Complete the fields to define standard grading parameters.</p>

                    {qFormMsg && (
                      <div className={`p-2.5 rounded-xl text-xs mb-3 ${qFormMsg.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'}`}>
                        {qFormMsg}
                      </div>
                    )}

                    <form onSubmit={handleQSubmit} className="space-y-3.5 text-left">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Subject *</label>
                          <select
                            value={qForm.subject}
                            onChange={e => setQForm(f => ({ ...f, subject: e.target.value }))}
                            className={`w-full py-2 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}
                          >
                            {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Difficulty Level *</label>
                          <select
                            value={qForm.difficulty}
                            onChange={e => setQForm(f => ({ ...f, difficulty: e.target.value }))}
                            className={`w-full py-2 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Topic / Chapter *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Electromagnetism, Organic Mechanism"
                          value={qForm.topic}
                          onChange={e => setQForm(f => ({ ...f, topic: e.target.value }))}
                          className={`w-full py-2 px-3 text-xs rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Question Text *</label>
                        <textarea
                          required
                          rows="4"
                          placeholder="State the core question text clearly..."
                          value={qForm.question_text}
                          onChange={e => setQForm(f => ({ ...f, question_text: e.target.value }))}
                          className={`w-full py-2 px-3 text-xs rounded-xl border resize-none ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Marking Scheme *</label>
                        <textarea
                          required
                          rows="3"
                          placeholder="Define the marks distribution (e.g. Definition: 2 marks, Formula: 1 mark)..."
                          value={qForm.marking_scheme}
                          onChange={e => setQForm(f => ({ ...f, marking_scheme: e.target.value }))}
                          className={`w-full py-2 px-3 text-xs rounded-xl border resize-none ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowQModal(false)}
                          className={`flex-1 py-2.5 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'}`}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={qFormLoading}
                          className="flex-1 py-2.5 bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {qFormLoading ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <Sparkles className="h-4.5 w-4.5" />}
                          {editingQuestionId ? 'Update' : 'Save Question'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}


          {/* Result Detail Modal */}
          {selectedResult && (
            <ResultModal
              result={selectedResult}
              submission={selectedResultSubmission}
              test={selectedResultTest}
              student={selectedResultStudent}
              user={students.find(s => s.id === selectedResultSubmission?.student_id)}
              theme={theme}
              onClose={() => {
                setSelectedResult(null);
                setSelectedResultSubmission(null);
                setSelectedResultTest(null);
                setSelectedResultStudent(null);
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default TeacherDashboard;

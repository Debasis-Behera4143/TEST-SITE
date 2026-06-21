import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockDb } from '../database/mockDb';
import { supabase, isLiveMode } from '../database/supabaseClient';
import { decryptPayload } from '../utils/crypto';
import { generateAIEvaluationFeedback } from '../services/gemini';
import {
  ArrowLeft, Sparkles, BrainCircuit, CheckCircle, Save, CheckSquare,
  RefreshCw, AlertTriangle, Eye, Download, ZoomIn, ZoomOut, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

const gradeFromPct = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
};

export const EvaluationModule = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get('submission');
  const { theme } = useAuth();

  const [submission, setSubmission] = useState(null);
  const [test, setTest] = useState(null);
  const [studentUser, setStudentUser] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [existingResult, setExistingResult] = useState(null);

  // Grading state
  const [marks, setMarks] = useState('');
  const [teacherRemarks, setTeacherRemarks] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState('info'); // 'info' | 'error' | 'success'
  const [publishing, setPublishing] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // File viewer state
  const [zoom, setZoom] = useState(1);
  const [fileViewError, setFileViewError] = useState(false);

  // AI state
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const loadSubmission = useCallback(async () => {
    if (!submissionId) return;
    try {
      if (isLiveMode && supabase) {
        const { data: sub } = await supabase.from('submissions').select('*').eq('id', submissionId).single();
        if (!sub) { setStatusMsg('Submission not found.'); setStatusType('error'); return; }
        setSubmission(sub);

        const { data: t } = await supabase.from('tests').select('*').eq('id', sub.test_id).single();
        setTest(t);

        const { data: u } = await supabase.from('users').select('*').eq('id', sub.student_id).single();
        setStudentUser(u);

        const { data: sd } = await supabase.from('students').select('*').eq('id', sub.student_id).single();
        setStudentDetails(sd);

        const res = await mockDb.getResultBySubmission(submissionId);
        if (res) {
          setExistingResult(res);
          setMarks(res.marks_obtained);
          setTeacherRemarks(res.teacher_remarks || res.feedback || '');
          setAiResult(res.ai_feedback);
        }
      } else {
        const db = JSON.parse(localStorage.getItem('edutrack_mock_db'));
        if (!db) return;
        const sub = db.submissions.find(s => s.id === submissionId);
        if (!sub) { setStatusMsg('Submission not found.'); setStatusType('error'); return; }
        setSubmission(sub);

        const t = db.tests.find(item => item.id === sub.test_id);
        setTest(t);

        const u = db.users.find(u => u.id === sub.student_id);
        setStudentUser(u);

        const sd = db.students.find(s => s.id === sub.student_id);
        setStudentDetails(sd);

        const res = db.results.find(r => r.submission_id === sub.id);
        if (res) {
          setExistingResult(res);
          setMarks(res.marks_obtained);
          setTeacherRemarks(res.teacher_remarks || res.feedback || '');
          setAiResult(res.ai_feedback);
        }
      }
    } catch (err) {
      console.error('EvaluationModule loadSubmission error:', err);
      setStatusMsg('Error loading submission data.');
      setStatusType('error');
    }
  }, [submissionId]);

  useEffect(() => { loadSubmission(); }, [loadSubmission]);

  // â”€â”€â”€ SAVE DRAFT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveDraft = async () => {
    if (!marks || isNaN(marks)) { setStatusMsg('Enter valid marks first.'); setStatusType('error'); return; }
    setSavingDraft(true);
    setStatusMsg('');
    try {
      await mockDb.saveDraftResult(submissionId, parseFloat(marks), teacherRemarks);
      setStatusMsg('Draft saved successfully.');
      setStatusType('success');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setStatusMsg(`Draft save failed: ${err.message}`);
      setStatusType('error');
    } finally {
      setSavingDraft(false);
    }
  };

  // â”€â”€â”€ PUBLISH RESULT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!marks || isNaN(marks)) { setStatusMsg('Please enter valid marks.'); setStatusType('error'); return; }
    if (!teacherRemarks.trim()) { setStatusMsg('Please enter teacher remarks.'); setStatusType('error'); return; }

    const marksNum = parseFloat(marks);
    const totalMarks = test?.total_marks || 100;
    if (marksNum < 0 || marksNum > totalMarks) {
      setStatusMsg(`Marks must be between 0 and ${totalMarks}.`);
      setStatusType('error');
      return;
    }

    setPublishing(true);
    setStatusMsg('Generating AI feedback via Geminiâ€¦');
    setStatusType('info');

    try {
      // 1. Generate AI feedback
      let aiFeedback = null;
      try {
        aiFeedback = await generateAIEvaluationFeedback({
          subject: test.subject,
          marks: marksNum,
          totalMarks,
          teacherRemarks
        });
      } catch (aiErr) {
        console.warn('Gemini feedback failed, continuing without:', aiErr);
      }

      const pct = parseFloat(((marksNum / totalMarks) * 100).toFixed(1));
      const grade = gradeFromPct(pct);

      // 2. Publish result
      await mockDb.publishResult(submissionId, marksNum, grade, teacherRemarks, aiFeedback);

      setStatusMsg('Result published! Student notified via email.');
      setStatusType('success');
      setAiResult(aiFeedback);

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 } });

      setTimeout(() => navigate('/teacher-dashboard'), 2000);
    } catch (err) {
      setStatusMsg(`Publish failed: ${err.message}`);
      setStatusType('error');
    } finally {
      setPublishing(false);
    }
  };

  // â”€â”€â”€ AI PRE-ANALYSIS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const runAIAnalysis = async () => {
    if (!test) return;
    setAiRunning(true);
    setStatusMsg('');
    try {
      const currentMarks = marks || Math.round((test.total_marks || 40) * 0.80);
      const feedback = await generateAIEvaluationFeedback({
        subject: test.subject,
        marks: parseFloat(currentMarks),
        totalMarks: test.total_marks,
        teacherRemarks: teacherRemarks || 'Evaluated by teacher.'
      });
      setAiResult(feedback);
      if (!marks) setMarks(currentMarks);
      if (!teacherRemarks && feedback.studentFeedback) {
        setTeacherRemarks(`Good effort. ${feedback.weakAreas?.[0] ? `Focus on: ${feedback.weakAreas[0]}.` : ''}`);
      }
      setStatusMsg('AI analysis complete. Prefilled suggestions are editable.');
      setStatusType('success');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      setStatusMsg('AI analysis failed. You can still evaluate manually.');
      setStatusType('error');
    } finally {
      setAiRunning(false);
    }
  };

  const gc = theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5';

  if (!submission && !statusMsg) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-brand-purple" />
          <p className="text-sm text-slate-400">Loading submissionâ€¦</p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-red-400">{statusMsg}</p>
        <button onClick={() => navigate('/teacher-dashboard')} className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isEncrypted = submission.file_url && submission.file_url.startsWith('e2ee:');
  const fileUrl = isEncrypted
    ? decryptPayload(submission.file_url.slice(5))
    : submission.file_url;
  const fileType = submission.file_type?.toLowerCase();
  const isPdf = fileType === 'pdf';
  const isImage = fileType === 'jpg' || fileType === 'png' || fileType === 'jpeg';
  const hasRealFile = fileUrl && fileUrl.startsWith('http');

  return (
    <div className="flex-grow flex flex-col p-4 lg:p-6 max-w-7xl mx-auto w-full relative z-10">

      {/* Top Nav */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/teacher-dashboard')}
          className="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
        <div className="flex items-center gap-3">
          {isEncrypted && (
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold flex items-center gap-1">
              🔒 E2EE Secured
            </span>
          )}
          {existingResult && (
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${existingResult.status === 'published' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'}`}>
              {existingResult.status === 'published' ? 'Published' : 'Draft saved'}
            </span>
          )}
          <span className="text-xs text-slate-400 font-mono hidden sm:block">
            ID: <strong className="text-brand-cyan">{submission.id.slice(0, 8)}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* â”€â”€ LEFT: ANSWER SHEET VIEWER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="lg:col-span-7 space-y-4">
          <div className={`p-5 rounded-3xl border relative overflow-hidden ${gc}`}>

            {/* File Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
              <div>
                <span className="px-2 py-0.5 rounded bg-brand-cyan/15 text-[9px] font-bold text-brand-cyan uppercase">
                  {test?.subject}
                </span>
                <h3 className="font-display font-bold text-base mt-2">{test?.title}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Submitted by <strong>{studentUser?.name || 'Student'}</strong>
                  {studentDetails?.registration_number && ` (${studentDetails.registration_number})`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Zoom controls */}
                <button onClick={() => setZoom(z => Math.max(0.5, z - 0.2))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-[10px] font-mono text-slate-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(2.5, z + 0.2))} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400">
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* File Viewer */}
            <div className="min-h-[400px] flex items-start justify-center overflow-auto">
              {hasRealFile ? (
                isPdf ? (
                  <iframe
                    src={fileUrl}
                    title="Answer Sheet PDF"
                    style={{ width: `${zoom * 100}%`, minHeight: '450px', border: 'none', borderRadius: 8 }}
                    onError={() => setFileViewError(true)}
                  />
                ) : isImage ? (
                  <img
                    src={fileUrl}
                    alt="Answer Sheet"
                    style={{ width: `${zoom * 100}%`, maxWidth: '100%', borderRadius: 8 }}
                    onError={() => setFileViewError(true)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
                    <FileText className="h-12 w-12 text-slate-600" />
                    <p className="text-sm text-slate-400">File format: <strong className="text-white uppercase">{fileType}</strong></p>
                    <a href={fileUrl} target="_blank" rel="noreferrer"
                      className="px-4 py-2 rounded-xl bg-brand-cyan/15 text-brand-cyan text-xs font-bold flex items-center gap-1.5">
                      <Download className="h-4 w-4" /> Download & View
                    </a>
                  </div>
                )
              ) : (
                /* No real file â€” show instructional placeholder */
                <div className={`w-full max-w-lg p-8 rounded-2xl bg-white text-slate-900 shadow-2xl font-mono text-[11px] leading-relaxed border-2 border-slate-300 min-h-[350px] relative`}>
                  <div className="absolute top-0 left-12 right-12 flex justify-between">
                    {[1,2,3,4,5,6].map(i => <div key={i} className="h-4 w-2 bg-slate-400 rounded-full -mt-2" />)}
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="text-right text-slate-400 border-b border-slate-200 pb-2">
                      <span className="block font-bold">REG: {studentDetails?.registration_number || 'â€”'}</span>
                      <span className="block text-[8px]">CBSE GRADE 10 EXAMINATION â€” {test?.subject?.toUpperCase()}</span>
                    </div>
                    <div className="text-slate-600 text-center py-8">
                      <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                      <p className="text-sm font-bold text-slate-500">Answer sheet file not available for preview.</p>
                      <p className="text-xs text-slate-400 mt-1">Student submitted: <strong>{fileUrl}</strong></p>
                      <p className="text-xs text-slate-400 mt-0.5">Evaluate using teacher judgement below.</p>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[9px] text-slate-400">Test: {test?.title} | Total: {test?.total_marks} marks | Subject: {test?.subject}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* File Actions */}
            <div className={`border-t border-white/5 pt-4 mt-4 flex justify-between items-center text-xs text-slate-400`}>
              <span>Format: <strong className="uppercase text-white">{fileType}</strong> â€¢ Submitted: {new Date(submission.submitted_at).toLocaleString()}</span>
              {hasRealFile && (
                <a href={fileUrl} target="_blank" rel="noreferrer"
                  className="text-brand-cyan hover:underline flex items-center gap-1">
                  <Download className="h-3.5 w-3.5" />
                  Download Raw File
                </a>
              )}
            </div>
          </div>
        </div>

        {/* â”€â”€ RIGHT: GRADING PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="lg:col-span-5 space-y-4">

          {/* AI Analysis Card */}
          <div className="p-5 rounded-3xl border border-brand-purple/20 bg-brand-purple/5">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h4 className="font-display font-extrabold text-sm flex items-center gap-1.5 text-brand-purple">
                  <Sparkles className="h-4 w-4 text-brand-cyan animate-pulse" />
                  AI Evaluation Assistant
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Get AI-generated feedback suggestions based on subject, marks, and your remarks.
                </p>
              </div>
              <button type="button" onClick={runAIAnalysis} disabled={aiRunning}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-bold rounded-xl flex items-center gap-1.5 shrink-0">
                {aiRunning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <BrainCircuit className="h-3.5 w-3.5" />}
                {aiRunning ? 'Analyzingâ€¦' : 'Analyze'}
              </button>
            </div>

            {aiResult && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-3 text-xs">
                {aiResult.studentFeedback && (
                  <div>
                    <span className="block text-[10px] font-bold text-brand-cyan uppercase tracking-wider mb-1">Student Feedback</span>
                    <p className="text-slate-300 leading-relaxed text-[11px]">{aiResult.studentFeedback}</p>
                  </div>
                )}
                {aiResult.strengths?.length > 0 && (
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Strengths</span>
                    <ul className="space-y-1">
                      {aiResult.strengths.map((s, i) => <li key={i} className="text-[11px] text-slate-300 flex gap-1.5"><span className="text-emerald-400">â€¢</span>{s}</li>)}
                    </ul>
                  </div>
                )}
                {aiResult.weakAreas?.length > 0 && (
                  <div>
                    <span className="block text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Focus Areas</span>
                    <ul className="space-y-1">
                      {aiResult.weakAreas.map((w, i) => <li key={i} className="text-[11px] text-slate-300 flex gap-1.5"><span className="text-red-400">!</span>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Grading Form */}
          <div className={`p-5 rounded-3xl border ${gc}`}>
            <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-emerald-400" />
              Teacher Grading Console
            </h3>

            {statusMsg && (
              <div className={`p-3 rounded-xl text-xs mb-4 border ${
                statusType === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                statusType === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
              }`}>
                {statusMsg}
              </div>
            )}

            <form onSubmit={handlePublish} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Marks Obtained (Out of {test?.total_marks})
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={test?.total_marks}
                  step="0.5"
                  value={marks}
                  onChange={e => setMarks(e.target.value)}
                  placeholder={`0 â€“ ${test?.total_marks}`}
                  className={`w-full py-2.5 px-3 text-sm font-bold rounded-xl border ${
                    theme === 'dark' ? 'border-white/10 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                  }`}
                />
                {marks && test?.total_marks && (
                  <div className="flex items-center justify-between text-[10px] mt-1">
                    <span className="text-slate-500">
                      {((parseFloat(marks) / test.total_marks) * 100).toFixed(1)}%
                    </span>
                    <span className={`font-bold ${
                      parseFloat(marks) / test.total_marks >= 0.8 ? 'text-emerald-400' :
                      parseFloat(marks) / test.total_marks >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      Grade: {gradeFromPct(((parseFloat(marks) / test.total_marks) * 100))}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Teacher Remarks *
                </label>
                <textarea
                  required
                  rows="4"
                  value={teacherRemarks}
                  onChange={e => setTeacherRemarks(e.target.value)}
                  placeholder="Good understanding of reflection. Needs improvement in numericalsâ€¦"
                  className={`w-full py-2.5 px-3 text-xs rounded-xl border resize-none ${
                    theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                  }`}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || publishing}
                  className={`flex-1 py-3 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                    theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}>
                  {savingDraft ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Draft
                </button>

                <button
                  type="submit"
                  disabled={publishing || savingDraft}
                  className="flex-1 py-3 bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-[10px] font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {publishing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                  {publishing ? 'Publishingâ€¦' : 'Publish Result'}
                </button>
              </div>

              <p className="text-[9px] text-slate-600 text-center">
                Publishing will notify the student via email and in-app notification. AI feedback will be generated automatically.
              </p>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default EvaluationModule;

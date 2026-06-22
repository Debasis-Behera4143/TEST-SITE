import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockDb } from '../database/mockDb';
import { supabase, isLiveMode } from '../database/supabaseClient';
import { decryptPayload } from '../utils/crypto';
import { generateAIEvaluationFeedback } from '../services/gemini';
import {
  ArrowLeft, Sparkles, BrainCircuit, CheckCircle, Save, CheckSquare,
  RefreshCw, AlertTriangle, Eye, Download, ZoomIn, ZoomOut, FileText,
  Trash2, Plus
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

const fetchFileAsBase64 = async (url) => {
  try {
    let blob = null;
    let mimeType = null;

    // Check if it's a Supabase URL and we are in Live Mode to use SDK download (bypasses CORS/private restrictions)
    if (isLiveMode && supabase && url.includes('/storage/v1/object/')) {
      try {
        const marker = '/storage/v1/object/';
        const index = url.indexOf(marker);
        const parts = url.substring(index + marker.length).split('/');
        if (parts.length >= 3) {
          // parts[0] is access type (public/sign/authenticated), parts[1] is bucket name
          const bucket = parts[1];
          const filePath = parts.slice(2).join('/');

          console.log(`[EduTrack AI]: Fetching from Supabase bucket "${bucket}" path: "${filePath}"`);
          const { data, error } = await supabase.storage.from(bucket).download(filePath);
          if (error) {
            console.warn(`[EduTrack AI]: Supabase SDK download failed for path: ${filePath}:`, error);
          } else if (data) {
            blob = data;
            mimeType = data.type;
          }
        }
      } catch (parseErr) {
        console.warn("[EduTrack AI]: Error parsing Supabase URL or using SDK download:", parseErr);
      }
    }

    // Fallback to standard fetch if not a Supabase URL or SDK download failed
    if (!blob) {
      console.log(`[EduTrack AI]: Fetching file via standard HTTP request from ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }
      blob = await response.blob();
      mimeType = blob.type;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        resolve({
          base64: base64String,
          mimeType: mimeType || blob.type
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("[EduTrack AI]: Failed to fetch file as base64:", err);
    return null;
  }
};

const formatDetailedAnswersToText = (answers) => {
  if (!answers) return '';
  if (typeof answers === 'string') return answers;
  if (!Array.isArray(answers)) return '';
  return answers.map((item, idx) => {
    const parts = [];
    const qNum = item.questionNumber || `Question ${idx + 1}`;
    parts.push(`[${qNum}] (${item.status || 'Partially Correct'})`);
    if (item.questionText) parts.push(`Question: ${item.questionText}`);
    if (item.studentAnswer) parts.push(`Student's Answer: ${item.studentAnswer}`);
    if (item.keywordsMatched && item.keywordsMatched.length > 0) parts.push(`Matched Keywords: ${item.keywordsMatched.join(', ')}`);
    if (item.keywordsMissing && item.keywordsMissing.length > 0) parts.push(`Missing Keywords: ${item.keywordsMissing.join(', ')}`);
    if (item.mistake) parts.push(`Mistake: ${item.mistake}`);
    if (item.improvement) parts.push(`Improvement: ${item.improvement}`);
    if (item.correctAnswer) parts.push(`Model Answer: ${item.correctAnswer}`);
    return parts.join('\n');
  }).join('\n\n----------------------------------------\n\n');
};

export const renderMarkdown = (text) => {
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
  html = html.replace(/^\s*[-*]\s+(.*?)$/gm, '<li class="ml-4 list-disc text-slate-350 my-1 leading-relaxed">$1</li>');

  // Numbered Lists: 1. item
  html = html.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li class="ml-4 list-decimal text-slate-350 my-1 leading-relaxed">$1</li>');

  // Process paragraphs
  const lines = html.split('\n');
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<pre') || trimmed.startsWith('</pre') || trimmed.startsWith('<hr') || trimmed.startsWith('<p') || trimmed.startsWith('</p')) {
      return line;
    }
    return `<p class="my-2 text-slate-350 leading-relaxed font-light text-xs">${line}</p>`;
  });
  
  return processedLines.join('\n');
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
  const [detailedAnswersText, setDetailedAnswersText] = useState('');
  const [activeAuditTab, setActiveAuditTab] = useState('edit'); // 'edit' | 'preview'

  // Sync formatted text representing detailedAnswers array/string
  useEffect(() => {
    if (aiResult) {
      if (typeof aiResult.detailedAnswers === 'string') {
        setDetailedAnswersText(aiResult.detailedAnswers);
      } else if (Array.isArray(aiResult.detailedAnswers)) {
        setDetailedAnswersText(formatDetailedAnswersToText(aiResult.detailedAnswers));
      } else {
        setDetailedAnswersText('');
      }
    } else {
      setDetailedAnswersText('');
    }
  }, [aiResult]);

  const handleDetailedAnswersTextChange = (val) => {
    setDetailedAnswersText(val);
    setAiResult(prev => {
      if (!prev) {
        return {
          studentFeedback: 'Manual feedback by teacher.',
          parentFeedback: 'Manual feedback by teacher.',
          strengths: ['Good overall attempt.'],
          weakAreas: ['Focus on revision.'],
          improvementSuggestions: ['Study consistently.'],
          revisionPlan: 'Days 1-7: Standard revision.',
          motivationMessage: 'Keep up the effort!',
          detailedAnswers: val
        };
      }
      return {
        ...prev,
        detailedAnswers: val
      };
    });
  };

  const startManualAudit = () => {
    setAiResult({
      studentFeedback: 'Manual feedback by teacher.',
      parentFeedback: 'Manual feedback by teacher.',
      strengths: ['Good overall attempt.'],
      weakAreas: ['Focus on revision.'],
      improvementSuggestions: ['Study consistently.'],
      revisionPlan: 'Days 1-7: Standard revision.',
      motivationMessage: 'Keep up the effort!',
      detailedAnswers: ''
    });
  };

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
        } else {
          // Initialize empty aiResult so text box is visible by default
          setAiResult({
            studentFeedback: '',
            parentFeedback: '',
            strengths: [],
            weakAreas: [],
            improvementSuggestions: [],
            revisionPlan: '',
            motivationMessage: '',
            detailedAnswers: ''
          });
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
        } else {
          // Initialize empty aiResult so text box is visible by default
          setAiResult({
            studentFeedback: '',
            parentFeedback: '',
            strengths: [],
            weakAreas: [],
            improvementSuggestions: [],
            revisionPlan: '',
            motivationMessage: '',
            detailedAnswers: ''
          });
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
      await mockDb.saveDraftResult(submissionId, parseFloat(marks), teacherRemarks, aiResult);
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

  // ——— PUBLISH RESULT ——————————————————————————————
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
    setStatusMsg('Publishing result...');
    setStatusType('info');

    try {
      // Determine if we need to generate AI feedback (only if aiResult fields are empty)
      const isAiResultEmpty = !aiResult || (
        !aiResult.studentFeedback &&
        !aiResult.parentFeedback &&
        (!detailedAnswersText || detailedAnswersText.trim() === '')
      );

      let finalFeedback = null;

      if (isAiResultEmpty) {
        setStatusMsg('Generating AI feedback via Gemini…');
        try {
          let studentAnswerFile = null;
          if (fileUrl && fileUrl.startsWith('http')) {
            setStatusMsg('Reading student answer sheet...');
            studentAnswerFile = await fetchFileAsBase64(fileUrl);
          }
          let questionPaperFile = null;
          if (test?.question_paper_url && test.question_paper_url.startsWith('http')) {
            setStatusMsg('Reading test question paper...');
            questionPaperFile = await fetchFileAsBase64(test.question_paper_url);
          }

          finalFeedback = await generateAIEvaluationFeedback({
            subject: test.subject,
            marks: marksNum,
            totalMarks,
            teacherRemarks,
            testTitle: test?.title || '',
            testDescription: test?.description || '',
            studentAnswerFile,
            questionPaperFile
          });
        } catch (aiErr) {
          console.warn('Gemini feedback failed, continuing with fallback:', aiErr);
          finalFeedback = {
            studentFeedback: `Good effort. Remarks: "${teacherRemarks}"`,
            parentFeedback: `Your child scored ${marksNum}/${totalMarks}. Remarks: "${teacherRemarks}"`,
            strengths: ['Completed test submission.'],
            weakAreas: ['Focus on revision.'],
            improvementSuggestions: ['Practice consistently.'],
            revisionPlan: 'Days 1-7: General revision.',
            motivationMessage: 'Keep up the effort!',
            detailedAnswers: detailedAnswersText || ''
          };
        }
      } else {
        finalFeedback = {
          ...aiResult,
          detailedAnswers: detailedAnswersText
        };
      }

      const pct = parseFloat(((marksNum / totalMarks) * 100).toFixed(1));
      const grade = gradeFromPct(pct);

      // 2. Publish result
      await mockDb.publishResult(submissionId, marksNum, grade, teacherRemarks, finalFeedback);

      setStatusMsg('Result published! Student notified via email.');
      setStatusType('success');
      setAiResult(finalFeedback);

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 } });

      setTimeout(() => navigate('/teacher-dashboard'), 2000);
    } catch (err) {
      setStatusMsg(`Publish failed: ${err.message}`);
      setStatusType('error');
    } finally {
      setPublishing(false);
    }
  };

  // ——— AI PRE-ANALYSIS ——————————————————————————————
  const runAIAnalysis = async () => {
    if (!test) return;
    setAiRunning(true);
    setStatusMsg('Checking answers via Gemini...');
    setStatusType('info');
    try {
      const currentMarks = marks || Math.round((test.total_marks || 40) * 0.80);

      let studentAnswerFile = null;
      if (fileUrl && fileUrl.startsWith('http')) {
        setStatusMsg('Reading student answer sheet...');
        studentAnswerFile = await fetchFileAsBase64(fileUrl);
      }
      let questionPaperFile = null;
      if (test?.question_paper_url && test.question_paper_url.startsWith('http')) {
        setStatusMsg('Reading test question paper...');
        questionPaperFile = await fetchFileAsBase64(test.question_paper_url);
      }

      setStatusMsg('Checking answers via Gemini...');
      const feedback = await generateAIEvaluationFeedback({
        subject: test.subject,
        marks: parseFloat(currentMarks),
        totalMarks: test.total_marks,
        teacherRemarks: teacherRemarks || 'Evaluated by teacher.',
        testTitle: test?.title || '',
        testDescription: test?.description || '',
        studentAnswerFile,
        questionPaperFile
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
  let fileUrl = submission.file_url;
  try {
    if (isEncrypted) {
      fileUrl = decryptPayload(submission.file_url.slice(5));
    }
  } catch (err) {
    console.error("EvaluationModule decryption failed:", err);
  }
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
                    {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-4 w-2 bg-slate-400 rounded-full -mt-2" />)}
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
                {aiRunning ? 'Analyzing…' : 'Analyze'}
              </button>
            </div>

            {(aiResult || (!aiResult && !aiRunning)) && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-4 text-xs text-left">
                {aiResult && aiResult.studentFeedback && (
                  <div>
                    <span className="block text-[10px] font-bold text-brand-cyan uppercase tracking-wider mb-1">Student Feedback</span>
                    <p className="text-slate-350 leading-relaxed font-light">{aiResult.studentFeedback}</p>
                  </div>
                )}

                {/* Detailed Q&A Audit - Single Text Area with markdown preview */}
                {aiResult && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="block text-[10px] font-bold text-brand-purple uppercase tracking-wider">Detailed Q&A Audit</span>
                      <div className="flex gap-1 bg-slate-950/40 p-0.5 rounded-lg border border-white/5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveAuditTab('edit')}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                            activeAuditTab === 'edit'
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <FileText className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveAuditTab('preview')}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                            activeAuditTab === 'preview'
                              ? 'bg-slate-800 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <Eye className="h-3 w-3" />
                          Preview
                        </button>
                      </div>
                    </div>

                    {activeAuditTab === 'edit' ? (
                      <textarea
                        rows="14"
                        value={detailedAnswersText}
                        onChange={(e) => handleDetailedAnswersTextChange(e.target.value)}
                        className={`w-full p-3.5 rounded-2xl border text-xs font-mono font-light resize-y focus:outline-none transition-all leading-relaxed ${
                          theme === 'dark'
                            ? 'bg-slate-950/40 border-white/5 text-slate-300 focus:border-brand-purple/45 placeholder-slate-650'
                            : 'bg-white/60 border-slate-200 text-slate-800 focus:border-brand-purple/45 placeholder-slate-400'
                        }`}
                        placeholder="Write detailed Q&A audit notes in Markdown..."
                      />
                    ) : (
                      <div
                        className={`w-full p-4 rounded-2xl border text-xs min-h-[280px] max-h-[350px] overflow-y-auto transition-all leading-relaxed text-left ${
                          theme === 'dark'
                            ? 'bg-slate-950/40 border-white/5 text-slate-300'
                            : 'bg-white/60 border-slate-200 text-slate-800'
                        }`}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(detailedAnswersText) }}
                      />
                    )}
                  </div>
                )}

                {aiResult && aiResult.strengths?.length > 0 && (
                  <div>
                    <span className="block text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1">Strengths</span>
                    <ul className="space-y-1">
                      {aiResult.strengths.map((s, i) => <li key={i} className="text-[11px] text-slate-350 flex gap-1.5"><span className="text-emerald-400">•</span>{s}</li>)}
                    </ul>
                  </div>
                )}
                {aiResult && aiResult.weakAreas?.length > 0 && (
                  <div>
                    <span className="block text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Focus Areas</span>
                    <ul className="space-y-1">
                      {aiResult.weakAreas.map((w, i) => <li key={i} className="text-[11px] text-slate-350 flex gap-1.5"><span className="text-red-400">!</span>{w}</li>)}
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
              <div className={`p-3 rounded-xl text-xs mb-4 border ${statusType === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
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
                  className={`w-full py-2.5 px-3 text-sm font-bold rounded-xl border ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-900'
                    }`}
                />
                {marks && test?.total_marks && (
                  <div className="flex items-center justify-between text-[10px] mt-1">
                    <span className="text-slate-500">
                      {((parseFloat(marks) / test.total_marks) * 100).toFixed(1)}%
                    </span>
                    <span className={`font-bold ${parseFloat(marks) / test.total_marks >= 0.8 ? 'text-emerald-400' :
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
                  className={`w-full py-2.5 px-3 text-xs rounded-xl border resize-none ${theme === 'dark' ? 'border-white/10 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800'
                    }`}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={savingDraft || publishing}
                  className={`flex-1 py-3 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 ${theme === 'dark' ? 'border-white/10 hover:bg-white/5 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
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

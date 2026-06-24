import { useState } from 'react';
import { X, Award, ChevronDown, ChevronUp, BookOpen, AlertTriangle, CheckCircle2, Target, Lightbulb, Calendar, Sparkles } from 'lucide-react';
import ReportCard from './ReportCard';

const gradeConfig = (grade) => {
  if (!grade) return { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' };
  if (grade.startsWith('A')) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' };
  if (grade === 'B') return { color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' };
  if (grade === 'C') return { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (grade === 'D') return { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
  return { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
};

const AccordionPanel = ({ icon: Icon, iconColor, title, children, theme, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          theme === 'dark' ? 'hover:bg-white/3 bg-slate-900/30' : 'hover:bg-slate-50 bg-slate-50/50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-700'}`}>{title}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>
      {open && (
        <div className={`px-4 pb-4 pt-1 border-t text-xs leading-relaxed ${
          theme === 'dark' ? 'border-white/5 text-slate-300' : 'border-slate-200 text-slate-600'
        }`}>
          {children}
        </div>
      )}
    </div>
  );
};

const ResultModal = ({ result, submission, test, student, user, theme, onClose }) => {
  if (!result || !test) return null;

  const ai = result.ai_feedback || {};
  const gConf = gradeConfig(result.grade);
  const percentage = result.percentage || 0;

  // Percentage bar width capped at 100
  const barWidth = Math.min(100, percentage);
  const barColor = percentage >= 80 ? '#4ade80' : percentage >= 60 ? '#22d3ee' : percentage >= 40 ? '#facc15' : '#f87171';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className={`w-full max-w-2xl rounded-2xl sm:rounded-3xl border shadow-2xl my-4 sm:my-8 ${
        theme === 'dark'
          ? 'bg-slate-950 border-white/10'
          : 'bg-white border-slate-200'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan">
              <Award className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className={`font-display font-extrabold text-lg ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Result Details</h2>
              <p className="text-xs text-slate-400 mt-0.5">{test.subject} — {test.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition-colors ${
              theme === 'dark'
                ? 'border-white/5 hover:bg-white/5 text-slate-400 hover:text-white'
                : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Score Block */}
          <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-900/40 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Marks Obtained</p>
                <p className={`text-4xl font-extrabold font-display mt-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {result.marks_obtained}
                  <span className="text-xl text-slate-500 font-normal"> / {test.total_marks}</span>
                </p>
              </div>
              <div className={`px-5 py-3 rounded-2xl border text-center ${gConf.bg}`}>
                <p className={`text-4xl font-extrabold font-display ${gConf.color}`}>{result.grade}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">Grade</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Score</span>
                <span className="text-sm font-bold" style={{ color: barColor }}>{percentage}%</span>
              </div>
              <div className={`h-2.5 w-full rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${barColor}88, ${barColor})` }}
                />
              </div>
            </div>
          </div>

          {/* Teacher Remarks */}
          {(result.teacher_remarks || result.feedback) && (
            <div className={`p-4 rounded-2xl border-l-4 border-brand-purple ${theme === 'dark' ? 'bg-brand-purple/5 border border-brand-purple/20' : 'bg-purple-50 border border-purple-100'}`}>
              <p className="text-[10px] uppercase tracking-wider font-bold text-brand-purple mb-2">Teacher Remarks</p>
              <p className={`text-sm leading-relaxed italic ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                "{result.teacher_remarks || result.feedback}"
              </p>
            </div>
          )}

          {/* AI Feedback Section */}
          {Object.keys(ai).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-brand-cyan animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">AI-Generated Feedback</span>
              </div>

              {ai.studentFeedback && (
                <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'border-white/5 bg-white/3' : 'border-slate-200 bg-slate-50'}`}>
                  <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{ai.studentFeedback}</p>
                </div>
              )}

              {ai.strengths?.length > 0 && (
                <AccordionPanel icon={CheckCircle2} iconColor="text-emerald-400" title="Strengths" theme={theme} defaultOpen={true}>
                  <ul className="space-y-1.5 mt-1">
                    {ai.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-emerald-400 shrink-0">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionPanel>
              )}

              {ai.weakAreas?.length > 0 && (
                <AccordionPanel icon={AlertTriangle} iconColor="text-red-400" title="Areas for Improvement" theme={theme}>
                  <ul className="space-y-1.5 mt-1">
                    {ai.weakAreas.map((w, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-red-400 shrink-0">!</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionPanel>
              )}

              {ai.improvementSuggestions?.length > 0 && (
                <AccordionPanel icon={Target} iconColor="text-brand-cyan" title="Improvement Suggestions" theme={theme}>
                  <ul className="space-y-1.5 mt-1">
                    {ai.improvementSuggestions.map((s, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-brand-cyan shrink-0">{i + 1}.</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionPanel>
              )}

              {ai.revisionPlan && (
                <AccordionPanel icon={Calendar} iconColor="text-brand-blue" title="7-Day Revision Plan" theme={theme}>
                  <p className="mt-1 leading-relaxed">{ai.revisionPlan}</p>
                </AccordionPanel>
              )}

              {ai.motivationMessage && (
                <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'border-yellow-500/20 bg-yellow-500/5' : 'border-yellow-200 bg-yellow-50'}`}>
                  <div className="flex gap-2.5">
                    <Lightbulb className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className={`text-sm italic leading-relaxed ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'}`}>
                      {ai.motivationMessage}
                    </p>
                  </div>
                </div>
              )}

              {ai.parentFeedback && (
                <AccordionPanel icon={BookOpen} iconColor="text-brand-purple" title="Parent Feedback Note" theme={theme}>
                  <p className="mt-1 leading-relaxed">{ai.parentFeedback}</p>
                </AccordionPanel>
              )}
            </div>
          )}

          {/* Report Card Download */}
          <div className={`pt-4 border-t ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
            <ReportCard
              result={result}
              submission={submission}
              test={test}
              student={student}
              user={user}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;

import { useState, useEffect } from 'react';
import { Mail, X, Trash2, ShieldAlert, CheckCircle, ExternalLink, Calendar, GraduationCap } from 'lucide-react';
import { mockDb } from '../database/mockDb';

export const DeveloperMailCenter = ({ theme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showDetailOnMobile, setShowDetailOnMobile] = useState(false);

  const fetchEmails = async () => {
    const list = await mockDb.getMockEmails();
    setEmails(list);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmails();
    }, 0);
    // Poll for mock emails changes
    const interval = setInterval(fetchEmails, 2000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleClear = async () => {
    await mockDb.clearMockEmails();
    setEmails([]);
    setSelectedEmail(null);
    setShowDetailOnMobile(false);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-tr from-brand-purple to-brand-cyan text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 neon-glow-purple flex items-center gap-2 group"
      >
        <Mail className="h-5 w-5 animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out text-xs font-bold uppercase tracking-wider">
          Mail Center
        </span>
        {emails.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-brand-pink text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center animate-bounce border border-white">
            {emails.length}
          </span>
        )}
      </button>

      {/* Slide-out Sidebar Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
          <div className="absolute inset-0" onClick={() => { setIsOpen(false); setShowDetailOnMobile(false); }}></div>
          
          <div className={`relative w-full max-w-2xl h-full shadow-2xl flex flex-col border-l transition-all duration-300 ${
            theme === 'dark' 
              ? 'bg-slate-950/95 border-white/10 text-white' 
              : 'bg-white/95 border-black/10 text-slate-900'
          }`}>
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg">Developer Mail Center</h3>
                  <p className="text-[10px] font-light text-slate-400">Resend API Sandbox Outbox Simulators</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {emails.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-all"
                    title="Clear Mail Outbox"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowDetailOnMobile(false);
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Main Area */}
            <div className="flex-grow flex overflow-hidden">
              {/* Emails List Sidebar */}
              <div className={`w-full md:w-1/2 border-r border-white/5 overflow-y-auto p-4 space-y-3 ${
                showDetailOnMobile ? 'hidden md:block' : 'block'
              }`}>
                {emails.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                    <Mail className="h-8 w-8 text-slate-600 mb-2 stroke-1" />
                    <span className="text-xs font-semibold text-slate-400">Outbox is empty</span>
                    <span className="text-[10px] font-light text-slate-500 mt-1">Actions like assigning a test, uploading a submission, or publishing grades will generate emails.</span>
                  </div>
                ) : (
                  emails.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(email);
                        setShowDetailOnMobile(true);
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 ${
                        selectedEmail?.id === email.id
                          ? 'border-brand-cyan bg-brand-cyan/10 shadow-md'
                          : 'border-white/5 bg-slate-900/40 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] uppercase font-bold text-brand-purple tracking-wide">
                          {email.type.replace('_', ' ')}
                        </span>
                        <span className="text-[9px] font-light text-slate-500">
                          {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold truncate">{email.subject}</h4>
                      <p className="text-[10px] text-slate-400 truncate mt-1">To: {email.to}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Email Content Preview */}
              <div className={`w-full md:w-1/2 overflow-y-auto p-6 bg-slate-950/40 ${
                showDetailOnMobile ? 'block' : 'hidden md:block'
              }`}>
                {selectedEmail ? (
                  <div className="space-y-4">
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setShowDetailOnMobile(false)}
                      className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-semibold text-slate-400 hover:text-white mb-2"
                    >
                      &larr; Back to Inbox
                    </button>

                    <div className="p-4 rounded-xl border border-white/5 bg-slate-900/60 text-xs space-y-1">
                      <p><span className="font-bold text-slate-400">Sent via:</span> Resend API Sandbox</p>
                      <p><span className="font-bold text-slate-400">Subject:</span> {selectedEmail.subject}</p>
                      <p><span className="font-bold text-slate-400">Recipient:</span> {selectedEmail.to}</p>
                      <p><span className="font-bold text-slate-400">Time:</span> {new Date(selectedEmail.sentAt).toLocaleString()}</p>
                    </div>

                    {/* Email Template Rendering */}
                    <div className="border border-slate-700 rounded-2xl bg-white text-slate-950 p-6 text-left shadow-lg overflow-hidden font-sans">
                      {/* Email Header */}
                      <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
                        <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-800">EduTrack AI Portal</span>
                      </div>

                      {/* Dynamic Templates */}
                      {selectedEmail.type === 'new_test' && (
                        <div className="mt-4 space-y-4 text-slate-800 text-xs">
                          <p className="text-sm font-semibold">Hello student,</p>
                          <p>A new test has been assigned to your profile by the examination center.</p>
                          
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                            <h4 className="font-extrabold text-sm text-indigo-600">{selectedEmail.details.testName}</h4>
                            <p><strong>Subject:</strong> {selectedEmail.details.subject}</p>
                            <p><strong>Total Marks:</strong> {selectedEmail.details.totalMarks}</p>
                            <p><strong>Deadline:</strong> {selectedEmail.details.deadline}</p>
                          </div>

                          <button className="w-full text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl mt-4 block">
                            Download Question Paper
                          </button>
                        </div>
                      )}

                      {selectedEmail.type === 'submission_received' && (
                        <div className="mt-4 space-y-4 text-slate-800 text-xs">
                          <p className="text-sm font-semibold">Dear {selectedEmail.details.studentName},</p>
                          <p>We confirm that your answer sheet submission has been successfully uploaded and is queued for verification.</p>
                          
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <p><strong>Exam Name:</strong> {selectedEmail.details.testName}</p>
                            <p><strong>Timestamp:</strong> {selectedEmail.details.submittedAt}</p>
                            <p><strong>File Name:</strong> {selectedEmail.details.fileName}</p>
                            <p className="text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                              <CheckCircle className="h-3.5 w-3.5" />
                              Ready for teacher evaluation
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedEmail.type === 'result_published' && (
                        <div className="mt-4 space-y-4 text-slate-800 text-xs">
                          <p className="text-sm font-semibold">Congratulations {selectedEmail.details.studentName},</p>
                          <p>Your results and comments are officially graded and published.</p>
                          
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <h4 className="font-extrabold text-sm text-slate-900">{selectedEmail.details.testName}</h4>
                            <div className="grid grid-cols-3 gap-2 text-center">
                              <div className="p-2 bg-slate-100 rounded-lg">
                                <span className="block text-[10px] text-slate-500 uppercase font-bold">Marks</span>
                                <span className="font-extrabold text-sm text-indigo-600">{selectedEmail.details.marks}</span>
                              </div>
                              <div className="p-2 bg-slate-100 rounded-lg">
                                <span className="block text-[10px] text-slate-500 uppercase font-bold">Percentage</span>
                                <span className="font-extrabold text-sm text-indigo-600">{selectedEmail.details.percentage}%</span>
                              </div>
                              <div className="p-2 bg-slate-100 rounded-lg">
                                <span className="block text-[10px] text-slate-500 uppercase font-bold">Grade</span>
                                <span className="font-extrabold text-sm text-emerald-600">{selectedEmail.details.grade}</span>
                              </div>
                            </div>
                            <p className="pt-2 text-slate-600 italic">" {selectedEmail.details.feedback} "</p>
                          </div>

                          <button className="w-full text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl mt-4 flex items-center justify-center gap-2">
                            View Analytics Portal
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      )}

                      {selectedEmail.type === 'parent_alert' && (
                        <div className="mt-4 space-y-4 text-slate-800 text-xs">
                          <p className="text-sm font-semibold">Dear Parent,</p>
                          <p>We are writing to update you on your child's active exam milestones on the portal.</p>
                          
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <p><strong>Child's Name:</strong> {selectedEmail.details.studentName}</p>
                            <p><strong>Event:</strong> Answer sheet upload completed</p>
                            <p><strong>Exam Name:</strong> {selectedEmail.details.testName}</p>
                            <p><strong>Timestamp:</strong> {selectedEmail.details.submittedAt}</p>
                          </div>
                        </div>
                      )}

                      {selectedEmail.type === 'parent_result_alert' && (
                        <div className="mt-4 space-y-4 text-slate-800 text-xs">
                          <p className="text-sm font-semibold">Dear Parent,</p>
                          <p>Your child's performance report card is now available on the portal.</p>
                          
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                            <p><strong>Child's Name:</strong> {selectedEmail.details.studentName}</p>
                            <p><strong>Exam:</strong> {selectedEmail.details.testName}</p>
                            <div className="flex gap-4">
                              <p><strong>Marks:</strong> {selectedEmail.details.marks} / {selectedEmail.details.totalMarks}</p>
                              <p><strong>Grade:</strong> {selectedEmail.details.grade}</p>
                            </div>
                            <p className="text-slate-600 font-light italic">" {selectedEmail.details.feedback} "</p>
                          </div>
                        </div>
                      )}

                      {/* Email Footer */}
                      <p className="text-[10px] text-slate-400 mt-6 border-t border-slate-100 pt-4 text-center">
                        This is an automatic notification generated from the EduTrack AI Portal. Do not reply directly to this mail.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs font-light">
                    <Calendar className="h-10 w-10 text-slate-600 mb-2 stroke-1" />
                    <span>Select an email in the left list to render the full HTML email template.</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default DeveloperMailCenter;

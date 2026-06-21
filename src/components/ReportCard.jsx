import React, { useRef } from 'react';
import { Download, Printer } from 'lucide-react';

const gradeColor = (grade) => {
  if (!grade) return '#94a3b8';
  if (grade.startsWith('A')) return '#4ade80';
  if (grade === 'B') return '#22d3ee';
  if (grade === 'C') return '#facc15';
  if (grade === 'D') return '#fb923c';
  return '#f87171';
};

export const ReportCard = ({ result, submission, test, student, user }) => {
  const printRef = useRef(null);

  if (!result || !test || !user) return null;

  const ai = result.ai_feedback || {};
  const percentage = result.percentage || 0;
  const grade = result.grade || 'N/A';
  const marks = result.marks_obtained;
  const totalMarks = test.total_marks;
  const issued = result.published_at ? new Date(result.published_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalBody = document.body.innerHTML;
    document.body.innerHTML = printContent.outerHTML;
    window.print();
    document.body.innerHTML = originalBody;
    window.location.reload();
  };

  return (
    <>
      {/* Print Trigger Button */}
      <button
        onClick={handlePrint}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-brand-purple to-brand-cyan text-white text-xs font-bold shadow-md hover:shadow-brand-cyan/20 transition-all"
      >
        <Download className="h-4 w-4" />
        Download Report Card PDF
      </button>

      {/* Hidden Print Template */}
      <div ref={printRef} id="report-card-print" style={{ display: 'none' }}>
        <div style={{
          fontFamily: "'Segoe UI', Arial, sans-serif",
          maxWidth: '700px',
          margin: '0 auto',
          padding: '40px',
          background: '#ffffff',
          color: '#1e293b',
          lineHeight: '1.6'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
            borderRadius: '12px',
            padding: '28px 32px',
            marginBottom: '28px',
            textAlign: 'center',
            color: '#ffffff'
          }}>
            <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' }}>
              EduTrack AI
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: '0.8', letterSpacing: '3px', textTransform: 'uppercase' }}>
              Smart Academic Assessment Portal
            </p>
            <p style={{ margin: '10px 0 0', fontSize: '18px', fontWeight: '700' }}>
              Academic Report Card
            </p>
          </div>

          {/* Student Info */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px 24px',
            marginBottom: '20px',
            background: '#f8fafc'
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', color: '#7c3aed', fontWeight: '700' }}>
              Student Information
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Student Name', user.name],
                  ['Registration No.', student?.registration_number || '—'],
                  ['Class / Grade', student?.class_name || '—'],
                  ['Email', user.email],
                  ['Issue Date', issued]
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: '5px 0', fontSize: '12px', color: '#64748b', width: '40%', fontWeight: '600' }}>{label}</td>
                    <td style={{ padding: '5px 0', fontSize: '12px', color: '#1e293b', fontWeight: '500' }}>: {value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Exam Details */}
          <div style={{
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '20px 24px',
            marginBottom: '20px',
            background: '#f8fafc'
          }}>
            <h2 style={{ margin: '0 0 12px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', color: '#7c3aed', fontWeight: '700' }}>
              Examination Details
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Test Title', test.title],
                  ['Subject', test.subject],
                  ['Chapter / Topic', test.chapter || 'Full Syllabus'],
                  ['Total Marks', `${totalMarks} Marks`]
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ padding: '5px 0', fontSize: '12px', color: '#64748b', width: '40%', fontWeight: '600' }}>{label}</td>
                    <td style={{ padding: '5px 0', fontSize: '12px', color: '#1e293b', fontWeight: '500' }}>: {value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Result Score Card */}
          <div style={{
            border: `2px solid ${gradeColor(grade)}`,
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '20px',
            textAlign: 'center',
            background: '#fafafa'
          }}>
            <h2 style={{ margin: '0 0 16px', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '2px', color: '#7c3aed', fontWeight: '700' }}>
              Performance Summary
            </h2>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', fontWeight: '900', color: gradeColor(grade), lineHeight: '1' }}>{marks}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>out of {totalMarks}</div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginTop: '2px' }}>Marks Obtained</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '40px', fontWeight: '900', color: gradeColor(grade), lineHeight: '1' }}>{percentage}%</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Percentage</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 20px',
                  borderRadius: '999px',
                  background: gradeColor(grade),
                  color: '#fff',
                  fontSize: '28px',
                  fontWeight: '900',
                  lineHeight: '1.2',
                  marginTop: '4px'
                }}>{grade}</div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: '#94a3b8', marginTop: '6px' }}>Grade</div>
              </div>
            </div>
          </div>

          {/* Teacher Remarks */}
          {(result.teacher_remarks || result.feedback) && (
            <div style={{
              borderLeft: '4px solid #7c3aed',
              paddingLeft: '16px',
              marginBottom: '20px',
              background: '#fdf4ff',
              borderRadius: '0 8px 8px 0',
              padding: '16px 16px 16px 20px'
            }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: '#7c3aed', fontWeight: '700' }}>
                Teacher Remarks
              </h3>
              <p style={{ margin: '0', fontSize: '13px', color: '#334155', fontStyle: 'italic', lineHeight: '1.7' }}>
                "{result.teacher_remarks || result.feedback}"
              </p>
            </div>
          )}

          {/* AI Feedback */}
          {ai.studentFeedback && (
            <div style={{
              border: '1px solid #d1fae5',
              borderRadius: '10px',
              padding: '20px',
              marginBottom: '20px',
              background: '#f0fdf4'
            }}>
              <h3 style={{ margin: '0 0 10px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', color: '#16a34a', fontWeight: '700' }}>
                AI-Generated Academic Feedback
              </h3>
              <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#334155', lineHeight: '1.7' }}>{ai.studentFeedback}</p>

              {ai.strengths?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>Strengths:</p>
                  <ul style={{ margin: '0', paddingLeft: '18px' }}>
                    {ai.strengths.map((s, i) => (
                      <li key={i} style={{ fontSize: '12px', color: '#475569', lineHeight: '1.8' }}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ai.weakAreas?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', color: '#dc2626', textTransform: 'uppercase' }}>Areas for Improvement:</p>
                  <ul style={{ margin: '0', paddingLeft: '18px' }}>
                    {ai.weakAreas.map((w, i) => (
                      <li key={i} style={{ fontSize: '12px', color: '#475569', lineHeight: '1.8' }}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {ai.revisionPlan && (
                <div style={{ marginBottom: '8px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: '700', color: '#0369a1', textTransform: 'uppercase' }}>7-Day Revision Plan:</p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#475569', lineHeight: '1.7' }}>{ai.revisionPlan}</p>
                </div>
              )}

              {ai.motivationMessage && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: '#fefce8',
                  borderRadius: '8px',
                  borderLeft: '3px solid #eab308'
                }}>
                  <p style={{ margin: '0', fontSize: '12px', color: '#92400e', fontStyle: 'italic' }}>
                    💡 {ai.motivationMessage}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{
            borderTop: '1px solid #e2e8f0',
            paddingTop: '16px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '11px'
          }}>
            <p style={{ margin: '0' }}>This report was generated by EduTrack AI Smart Exam Portal</p>
            <p style={{ margin: '4px 0 0' }}>AI evaluation is advisory. Teacher evaluation is final and authoritative.</p>
            <p style={{ margin: '4px 0 0', color: '#cbd5e1' }}>© 2026 EduTrack AI — Encrypted Academic Records</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportCard;

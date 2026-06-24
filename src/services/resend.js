import { mockDb } from '../database/mockDb';

const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;

export const sendEmailNotification = async ({
  to,
  subject,
  type,
  details
}) => {
  // Always log to simulated outbox drawer for sandbox visibility
  mockDb.sendMockEmail({ to, subject, type, details });

  if (!resendApiKey || resendApiKey === 'YOUR_RESEND_API_KEY') {
    console.warn('[EduTrack AI]: VITE_RESEND_API_KEY not configured. Email logged to Developer Outbox.');
    return { success: true, simulated: true };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'EduTrack AI <notifications@edutrack.ai>',
        to: [to],
        subject: subject,
        html: generateHtmlBody(type, details)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Resend API ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    return { success: true, messageId: responseData.id };
  } catch (error) {
    console.error('[EduTrack AI]: Resend email failed:', error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================
// Rich styled HTML email templates
// ============================================================

const baseStyles = `
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #0d0e18;
  color: #e2e8f0;
  margin: 0;
  padding: 0;
`;

const wrapHtml = (title, bodyContent) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="${baseStyles}">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#7c3aed,#06b6d4);border-radius:16px;padding:28px 32px;margin-bottom:24px;text-align:center;">
      <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">
        EduTrack <span style="color:#a5f3fc;">AI</span>
      </h1>
      <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">
        Smart Exam Portal
      </p>
    </div>

    <!-- Body -->
    <div style="background:rgba(20,21,38,0.9);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;margin-bottom:24px;">
      ${bodyContent}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:16px;color:#475569;font-size:11px;">
      <p style="margin:0;">Â© 2026 EduTrack AI. Encrypted academic communication.</p>
      <p style="margin:4px 0 0;">If you did not expect this email, please contact your school administrator.</p>
    </div>
  </div>
</body>
</html>
`;

const infoRow = (label, value, valueColor = '#e2e8f0') => `
  <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
    <span style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:600;">${label}</span>
    <span style="font-size:13px;color:${valueColor};font-weight:700;">${value}</span>
  </div>
`;


const generateHtmlBody = (type, details) => {
  if (!details) return wrapHtml('Notification', '<p style="color:#94a3b8;">Academic update from EduTrack AI Portal.</p>');

  // â”€â”€â”€ NEW TEST ASSIGNED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (type === 'new_test') {
    const deadlineStr = details.deadline || 'Check portal';
    return wrapHtml(`New Test: ${details.testName}`, `
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">Hello,</p>
        <h2 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">
          ${details.studentName || 'Student'}
        </h2>
        <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">
          A new exam has been assigned to you. Please download the question paper and prepare your answers before the deadline.
        </p>
      </div>

      <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:20px;margin-bottom:20px;">
        ${infoRow('Test Title', details.testName || 'â€”', '#a5f3fc')}
        ${infoRow('Subject', details.subject || 'â€”', '#c4b5fd')}
        ${infoRow('Total Marks', details.totalMarks ? `${details.totalMarks} Marks` : 'â€”', '#86efac')}
        ${infoRow('Deadline', deadlineStr, '#fca5a5')}
      </div>

      ${details.instructions ? `
      <div style="background:rgba(168,85,247,0.08);border-left:3px solid #7c3aed;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#a855f7;text-transform:uppercase;letter-spacing:1px;">Instructions</p>
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.6;">${details.instructions}</p>
      </div>` : ''}

      ${details.downloadLink && details.downloadLink !== 'question_paper.pdf' ? `
      <div style="text-align:center;margin-top:20px;">
        <a href="${details.downloadLink}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
          Download Question Paper â†’
        </a>
      </div>` : ''}
    `);
  }

  // â”€â”€â”€ RESULT PUBLISHED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (type === 'result_published') {
    const pct = details.percentage !== undefined ? `${details.percentage}%` : 'â€”';
    const gradeColor = details.grade?.startsWith('A') ? '#86efac' : details.grade === 'B' ? '#67e8f9' : details.grade === 'C' ? '#fde68a' : '#fca5a5';
    const ai = details.aiFeedback;

    return wrapHtml(`Result: ${details.testName}`, `
      <div style="margin-bottom:20px;">
        <p style="margin:0 0 4px;font-size:13px;color:#94a3b8;">Dear ${details.studentName || 'Student'},</p>
        <h2 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">Your Result is Out! ðŸŽ‰</h2>
        <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;">
          Your answer sheet for <strong style="color:#e2e8f0;">${details.testName}</strong> has been evaluated by your teacher.
        </p>
      </div>

      <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:20px;margin-bottom:20px;">
        ${infoRow('Marks Obtained', `${details.marks} / ${details.totalMarks}`, '#a5f3fc')}
        ${infoRow('Percentage', pct, '#c4b5fd')}
        ${infoRow('Grade', details.grade || 'â€”', gradeColor)}
      </div>

      ${details.teacherRemarks ? `
      <div style="background:rgba(168,85,247,0.08);border-left:3px solid #7c3aed;border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#a855f7;text-transform:uppercase;letter-spacing:1px;">Teacher Remarks</p>
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.6;font-style:italic;">"${details.teacherRemarks}"</p>
      </div>` : ''}

      ${ai ? `
      <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);border-radius:12px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#4ade80;text-transform:uppercase;letter-spacing:1px;">âœ¨ AI-Generated Feedback</p>
        ${ai.studentFeedback ? `<p style="margin:0 0 12px;font-size:13px;color:#cbd5e1;line-height:1.6;">${ai.studentFeedback}</p>` : ''}
        ${ai.strengths?.length ? `
          <p style="margin:8px 0 4px;font-size:11px;font-weight:700;color:#86efac;">Strengths:</p>
          <ul style="margin:0;padding-left:16px;color:#94a3b8;font-size:12px;line-height:1.8;">
            ${ai.strengths.map(s => `<li>${s}</li>`).join('')}
          </ul>` : ''}
        ${ai.weakAreas?.length ? `
          <p style="margin:8px 0 4px;font-size:11px;font-weight:700;color:#fca5a5;">Focus Areas:</p>
          <ul style="margin:0;padding-left:16px;color:#94a3b8;font-size:12px;line-height:1.8;">
            ${ai.weakAreas.map(w => `<li>${w}</li>`).join('')}
          </ul>` : ''}
        ${ai.motivationMessage ? `<p style="margin:12px 0 0;font-size:13px;color:#fde68a;font-style:italic;">ðŸ’¡ ${ai.motivationMessage}</p>` : ''}
      </div>` : ''}

      <p style="margin:0;font-size:13px;color:#64748b;text-align:center;">
        Log in to your dashboard to view the full report card and revision plan.
      </p>
    `);
  }

  // â”€â”€â”€ SUBMISSION RECEIVED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (type === 'submission_received') {
    return wrapHtml('Submission Confirmed', `
      <div style="margin-bottom:20px;">
        <h2 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">Submission Received âœ…</h2>
        <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">
          We have successfully received your answer sheet. Your teacher will evaluate it shortly.
        </p>
      </div>

      <div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:12px;padding:20px;margin-bottom:20px;">
        ${infoRow('Student', details.studentName || 'â€”', '#86efac')}
        ${infoRow('Test', details.testName || 'â€”', '#a5f3fc')}
        ${infoRow('Submitted At', details.submittedAt || 'â€”', '#fde68a')}
        ${infoRow('File', details.fileName || 'â€”', '#c4b5fd')}
      </div>

      <p style="margin:0;font-size:13px;color:#64748b;text-align:center;">
        You will receive another notification once your result is published.
      </p>
    `);
  }

  // â”€â”€â”€ PARENT RESULT ALERT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (type === 'parent_result_alert') {
    const gradeColor = details.grade?.startsWith('A') ? '#86efac' : details.grade === 'B' ? '#67e8f9' : '#fca5a5';
    return wrapHtml(`Child Result: ${details.testName}`, `
      <div style="margin-bottom:20px;">
        <h2 style="margin:0;font-size:22px;font-weight:800;color:#ffffff;">Academic Result Update</h2>
        <p style="margin:8px 0 0;font-size:14px;color:#94a3b8;line-height:1.6;">
          Your child <strong style="color:#e2e8f0;">${details.studentName}</strong>'s exam result is now available.
        </p>
      </div>

      <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:20px;margin-bottom:20px;">
        ${infoRow('Test', details.testName || 'â€”', '#a5f3fc')}
        ${infoRow('Marks', `${details.marks} / ${details.totalMarks}`, '#c4b5fd')}
        ${infoRow('Percentage', `${details.percentage}%`, '#86efac')}
        ${infoRow('Grade', details.grade || 'â€”', gradeColor)}
      </div>

      ${details.teacherRemarks ? `
      <div style="background:rgba(168,85,247,0.08);border-left:3px solid #7c3aed;border-radius:0 8px 8px 0;padding:14px 16px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#a855f7;text-transform:uppercase;letter-spacing:1px;">Teacher Remarks</p>
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.6;font-style:italic;">"${details.teacherRemarks}"</p>
      </div>` : ''}
    `);
  }

  // â”€â”€â”€ PARENT SUBMISSION ALERT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (type === 'parent_alert') {
    return wrapHtml('Child Submission Alert', `
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#ffffff;">Submission Alert</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#94a3b8;line-height:1.6;">
        Your child <strong style="color:#e2e8f0;">${details.studentName}</strong> has submitted their answer sheet.
      </p>
      <div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:12px;padding:20px;">
        ${infoRow('Test', details.testName || 'â€”', '#a5f3fc')}
        ${infoRow('Submitted At', details.submittedAt || 'â€”', '#fde68a')}
      </div>
    `);
  }

  return wrapHtml('Notification', '<p style="color:#94a3b8;font-size:14px;">Academic update from EduTrack AI Portal.</p>');
};

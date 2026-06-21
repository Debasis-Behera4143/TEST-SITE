// Unified Database Manager for EduTrack AI (Dual Live Supabase & Local Relational Engine)
import { supabase, isLiveMode } from './supabaseClient';
import { sendEmailNotification } from '../services/resend';
import { generateAIEvaluationFeedback } from '../services/gemini';

const SEED_DATA = {
  users: [],
  teachers: [],
  students: [],
  parents: [],
  tests: [],
  submissions: [],
  results: [],
  notifications: [],
  leaderboard: [],
  badges: [],
  question_bank: [
    { id: "qb-1", subject: "Physics", question_text: "State Maxwell's four equations in integral form and explain the physical significance of displacement current.", difficulty: "Hard", topic: "Electromagnetism", marking_scheme: "Integral statements (4 marks), Displacement current definition (3 marks), Ampere-Maxwell completion explanation (3 marks)." },
    { id: "qb-2", subject: "Chemistry", question_text: "Describe the Friedel-Crafts alkylation reaction of benzene. Outline its mechanism and limitations.", difficulty: "Medium", topic: "Organic Compounds", marking_scheme: "Overall equation (2 marks), Carbocation formation mechanism (4 marks), Polyalkylation limitation description (4 marks)." },
    { id: "qb-3", subject: "Mathematics", question_text: "Find the local extrema of the function f(x) = x^3 - 3x^2 - 9x + 5 on the interval [-2, 4]. Show all derivation steps.", difficulty: "Easy", topic: "Calculus", marking_scheme: "First derivative f'(x) = 3x^2 - 6x - 9 (3 marks), Solving critical points x = -1, 3 (3 marks), Second derivative test or interval testing (4 marks)." }
  ],
  certificates: [],
  emails: []
};

// Initialize Local Database if not set
const getDb = () => {
  const db = localStorage.getItem("edutrack_mock_db");
  if (!db) {
    localStorage.setItem("edutrack_mock_db", JSON.stringify(SEED_DATA));
    return SEED_DATA;
  }
  return JSON.parse(db);
};

const saveDb = (data) => {
  localStorage.setItem("edutrack_mock_db", JSON.stringify(data));
};

// Helper for simulating api delay
const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

export const mockDb = {
  // --- AUTH/USERS ---
  async login(email, password, regNumber = null) {
    // Note: AuthContext handles Supabase Auth directly. This helper is for local mode.
    await delay();
    const db = getDb();
    if (regNumber) {
      const student = db.students.find(s => s.registration_number.toLowerCase() === regNumber.trim().toLowerCase());
      if (student) {
        const user = db.users.find(u => u.id === student.id);
        return { data: { user, student }, error: null };
      }
      return { data: null, error: "Invalid registration number." };
    }
    
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      const student = db.students.find(s => s.id === user.id) || null;
      const parent = db.parents.find(p => p.id === user.id) || null;
      const teacher = db.teachers.find(t => t.id === user.id) || null;
      return { data: { user, student, parent, teacher }, error: null };
    }
    return { data: null, error: "Invalid credentials." };
  },

  async signup(name, email, role, extra = {}) {
    // Note: AuthContext handles Supabase Auth directly. This helper is for local mode.
    await delay();
    const db = getDb();
    const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return { data: null, error: "User already exists." };

    const newUserId = `usr-${role}-${Date.now()}`;
    const newUser = {
      id: newUserId,
      email,
      role,
      name,
      avatar_url: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}`,
      created_at: new Date().toISOString()
    };

    db.users.push(newUser);

    let newStudent = null;
    let newParent = null;
    let newTeacher = null;

    if (role === "student") {
      const reg = `REG-2026-${Math.floor(100 + Math.random() * 900)}`;
      newStudent = {
        id: newUserId,
        registration_number: reg,
        class_name: extra.className || "Grade 10-A",
        rank: db.students.length + 1,
        xp: 0,
        level: 1,
        parent_email: extra.parentEmail || ""
      };
      db.students.push(newStudent);
      
      // Auto register to leaderboard
      db.leaderboard.push({
        id: `ld-${Date.now()}`,
        student_id: newUserId,
        rank: db.students.length,
        monthly_score: 0.0
      });
    } else if (role === "parent") {
      const targetStudent = db.students.find(s => s.parent_email.toLowerCase() === email.toLowerCase()) || db.students[0];
      newParent = {
        id: newUserId,
        student_id: targetStudent ? targetStudent.id : "usr-student-1"
      };
      db.parents.push(newParent);
    } else if (role === "teacher") {
      newTeacher = {
        id: newUserId,
        department: extra.department || "General Academy"
      };
      db.teachers.push(newTeacher);
    }

    saveDb(db);
    return { data: { user: newUser, student: newStudent, parent: newParent, teacher: newTeacher }, error: null };
  },

  // --- TESTS ---
  async getTests() {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase.from('tests').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    await delay(300);
    return getDb().tests;
  },

  async addTest(testData) {
    if (isLiveMode && supabase) {
      const newTest = {
        teacher_id: testData.teacher_id || null,
        title: testData.title,
        description: testData.description,
        subject: testData.subject,
        total_marks: parseInt(testData.total_marks) || 100,
        deadline: testData.deadline,
        status: "published",
        question_paper_url: testData.question_paper_url || "question_paper.pdf"
      };
      
      const { data, error } = await supabase.from('tests').insert(newTest).select().single();
      if (error) throw error;

      // Add notifications and send email notifications to all students
      try {
        const { data: students } = await supabase.from('users').select('id, name, email').eq('role', 'student');
        if (students && students.length > 0) {
          const notifs = students.map(student => ({
            user_id: student.id,
            title: "New Test Assigned",
            content: `A new test "${newTest.title}" has been assigned for ${newTest.subject}. Due on ${new Date(newTest.deadline).toLocaleDateString()}`,
            is_read: false,
            type: "new_test"
          }));
          await supabase.from('notifications').insert(notifs);

          // Dispatch email alerts
          for (const s of students) {
            await sendEmailNotification({
              to: s.email,
              subject: `New Test Assigned: ${newTest.title}`,
              type: 'new_test',
              details: {
                studentName: s.name,
                testName: newTest.title,
                subject: newTest.subject,
                totalMarks: newTest.total_marks,
                deadline: new Date(newTest.deadline).toLocaleString(),
                downloadLink: newTest.question_paper_url,
                instructions: newTest.description
              }
            });
          }
        }
      } catch (err) {
        console.error("Error creating notifications / sending emails for new test:", err);
      }

      return data;
    }

    await delay();
    const db = getDb();
    const newTest = {
      id: `tst-${Date.now()}`,
      teacher_id: testData.teacher_id || "usr-teacher-1",
      title: testData.title,
      description: testData.description,
      subject: testData.subject,
      total_marks: parseInt(testData.total_marks) || 100,
      deadline: testData.deadline,
      status: "published",
      question_paper_url: testData.question_paper_url || "question_paper.pdf",
      created_at: new Date().toISOString()
    };
    db.tests.unshift(newTest);
    saveDb(db);

    // Auto trigger notifications for students
    db.students.forEach(student => {
      const studentUser = db.users.find(u => u.id === student.id);
      db.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random()}`,
        user_id: student.id,
        title: "New Test Assigned",
        content: `A new test "${newTest.title}" has been assigned for ${newTest.subject}. Due on ${new Date(newTest.deadline).toLocaleDateString()}`,
        is_read: false,
        type: "new_test",
        created_at: new Date().toISOString()
      });

      sendEmailNotification({
        to: studentUser ? studentUser.email : 'student@edutrack.ai',
        subject: `New Test Assigned: ${newTest.title}`,
        type: 'new_test',
        details: {
          studentName: studentUser ? studentUser.name : 'Student',
          testName: newTest.title,
          subject: newTest.subject,
          totalMarks: newTest.total_marks,
          deadline: new Date(newTest.deadline).toLocaleString(),
          downloadLink: newTest.question_paper_url,
          instructions: newTest.description
        }
      });
    });
    saveDb(db);

    return newTest;
  },

  async editTest(id, testData) {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase.from('tests').update({
        title: testData.title,
        description: testData.description,
        subject: testData.subject,
        total_marks: parseInt(testData.total_marks) || 100,
        deadline: testData.deadline,
        question_paper_url: testData.question_paper_url
      }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }

    await delay();
    const db = getDb();
    const idx = db.tests.findIndex(t => t.id === id);
    if (idx !== -1) {
      db.tests[idx] = { ...db.tests[idx], ...testData };
      saveDb(db);
      return db.tests[idx];
    }
    throw new Error("Test not found");
  },

  async deleteTest(id) {
    if (isLiveMode && supabase) {
      const { error } = await supabase.from('tests').delete().eq('id', id);
      if (error) throw error;
      return true;
    }

    await delay();
    const db = getDb();
    db.tests = db.tests.filter(t => t.id !== id);
    db.submissions = db.submissions.filter(s => s.test_id !== id);
    saveDb(db);
    return true;
  },

  // --- SUBMISSIONS ---
  async getSubmissions() {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase.from('submissions').select('*').order('submitted_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    await delay(350);
    return getDb().submissions;
  },

  async addSubmission(testId, studentId, fileName, fileType) {
    if (isLiveMode && supabase) {
      const newSubmission = {
        test_id: testId,
        student_id: studentId,
        file_url: fileName,
        file_type: fileType,
        status: "pending",
        submitted_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase.from('submissions').upsert(newSubmission, { onConflict: 'test_id, student_id' }).select().single();
      if (error) throw error;

      // Email notifications
      try {
        const { data: test } = await supabase.from('tests').select('title').eq('id', testId).single();
        const { data: studentUser } = await supabase.from('users').select('name, email').eq('id', studentId).single();
        const { data: studentDetails } = await supabase.from('students').select('parent_email').eq('id', studentId).single();

        if (studentUser) {
          await sendEmailNotification({
            to: studentUser.email,
            subject: `Submission Received: ${test ? test.title : "Answer Sheet"}`,
            type: "submission_received",
            details: {
              studentName: studentUser.name,
              testName: test ? test.title : "",
              submittedAt: new Date(newSubmission.submitted_at).toLocaleString(),
              fileName
            }
          });

          if (studentDetails && studentDetails.parent_email) {
            await sendEmailNotification({
              to: studentDetails.parent_email,
              subject: `Child Exam Submission: ${studentUser.name} submitted ${test ? test.title : ""}`,
              type: "parent_alert",
              details: {
                parentName: "Parent",
                studentName: studentUser.name,
                testName: test ? test.title : "",
                submittedAt: new Date(newSubmission.submitted_at).toLocaleString()
              }
            });
          }
        }
      } catch (err) {
        console.error("Error sending submission emails:", err);
      }

      return data;
    }

    await delay();
    const db = getDb();
    db.submissions = db.submissions.filter(s => !(s.test_id === testId && s.student_id === studentId));
    
    const newSubmission = {
      id: `sub-${Date.now()}`,
      test_id: testId,
      student_id: studentId,
      file_url: fileName,
      file_type: fileType,
      status: "pending",
      submitted_at: new Date().toISOString()
    };
    db.submissions.push(newSubmission);
    saveDb(db);

    const test = db.tests.find(t => t.id === testId);
    const studentUser = db.users.find(u => u.id === studentId);

    if (studentUser) {
      sendEmailNotification({
        to: studentUser.email,
        subject: `Submission Received: ${test ? test.title : "Answer Sheet"}`,
        type: "submission_received",
        details: {
          studentName: studentUser.name,
          testName: test ? test.title : "",
          submittedAt: new Date(newSubmission.submitted_at).toLocaleString(),
          fileName
        }
      });

      const student = db.students.find(s => s.id === studentId);
      if (student && student.parent_email) {
        sendEmailNotification({
          to: student.parent_email,
          subject: `Child Exam Submission: ${studentUser.name} submitted ${test ? test.title : ""}`,
          type: "parent_alert",
          details: {
            parentName: "Parent",
            studentName: studentUser.name,
            testName: test ? test.title : "",
            submittedAt: new Date(newSubmission.submitted_at).toLocaleString()
          }
        });
      }
    }

    return newSubmission;
  },

  // --- RESULTS & EVALUATION ---
  async getResults() {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase.from('results').select('*');
      if (error) throw error;
      return data || [];
    }

    await delay(250);
    return getDb().results;
  },

  async addResult(submissionId, marks, grade, feedback, aiFeedback = null) {
    if (isLiveMode && supabase) {
      const { data: submission } = await supabase.from('submissions').select('*').eq('id', submissionId).single();
      if (!submission) throw new Error("Submission not found");

      const { error: subErr } = await supabase.from('submissions').update({ status: 'evaluated' }).eq('id', submissionId);
      if (subErr) throw subErr;

      const { data: test } = await supabase.from('tests').select('total_marks, title, subject').eq('id', submission.test_id).single();
      const percentage = parseFloat(((marks / (test ? test.total_marks : 100)) * 100).toFixed(1));

      // Fetch Gemini feedback
      let finalAIFeedback = aiFeedback;
      try {
        const geminiResult = await generateAIEvaluationFeedback({
          subject: test ? test.subject : "General",
          marks: parseFloat(marks),
          totalMarks: test ? test.total_marks : 100,
          teacherRemarks: feedback
        });
        finalAIFeedback = {
          ...(aiFeedback || {}),
          ...geminiResult
        };
      } catch (geminiErr) {
        console.error("Gemini failed inside live addResult:", geminiErr);
      }

      const newResult = {
        submission_id: submissionId,
        marks_obtained: parseFloat(marks),
        percentage,
        grade,
        feedback,
        ai_feedback: finalAIFeedback
      };

      const { data, error } = await supabase.from('results').upsert(newResult, { onConflict: 'submission_id' }).select().single();
      if (error) throw error;

      // Update student XP, badges, leaderboard, notifications
      try {
        const { data: studentDetails } = await supabase.from('students').select('xp, level').eq('id', submission.student_id).single();
        if (studentDetails) {
          const xpReward = Math.round(percentage * 10);
          const newXp = studentDetails.xp + xpReward;
          const newLevel = Math.floor(newXp / 1000) + 1;

          await supabase.from('students').update({ xp: newXp, level: newLevel }).eq('id', submission.student_id);

          if (newLevel > studentDetails.level) {
            await supabase.from('badges').upsert({
              student_id: submission.student_id,
              badge_type: `Level ${newLevel} Scholar`
            }, { onConflict: 'student_id, badge_type' });
          }

          if (percentage >= 95.0) {
            await supabase.from('badges').upsert({
              student_id: submission.student_id,
              badge_type: "Top Scorer"
            }, { onConflict: 'student_id, badge_type' });
          }

          const { count } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('student_id', submission.student_id).eq('status', 'evaluated');
          if (count >= 2) {
            await supabase.from('badges').upsert({
              student_id: submission.student_id,
              badge_type: "Consistent Performer"
            }, { onConflict: 'student_id, badge_type' });
          }

          const { data: leadItem } = await supabase.from('leaderboard').select('*').eq('student_id', submission.student_id).maybeSingle();
          if (leadItem) {
            const newMonthly = parseFloat(((leadItem.monthly_score + percentage) / 2).toFixed(1));
            await supabase.from('leaderboard').update({ monthly_score: newMonthly }).eq('student_id', submission.student_id);
          } else {
            const { count: leadCount } = await supabase.from('leaderboard').select('*', { count: 'exact', head: true });
            await supabase.from('leaderboard').insert({
              student_id: submission.student_id,
              rank: (leadCount || 0) + 1,
              monthly_score: percentage
            });
          }

          // Re-sort leaderboard ranks
          const { data: allLead } = await supabase.from('leaderboard').select('*').order('monthly_score', { ascending: false });
          if (allLead) {
            for (let i = 0; i < allLead.length; i++) {
              await supabase.from('leaderboard').update({ rank: i + 1 }).eq('id', allLead[i].id);
              await supabase.from('students').update({ rank: i + 1 }).eq('id', allLead[i].student_id);
            }
          }
        }

        // Send in-app notification
        await supabase.from('notifications').insert({
          user_id: submission.student_id,
          title: "Result Published",
          content: `Your exam sheet for "${test ? test.title : ""}" has been graded: ${marks}/${test ? test.total_marks : 100} (Grade: ${grade}).`,
          is_read: false,
          type: "result"
        });

        // Trigger emails via Resend
        const { data: studentUser } = await supabase.from('users').select('name, email').eq('id', submission.student_id).single();
        const { data: sDetails } = await supabase.from('students').select('parent_email').eq('id', submission.student_id).single();

        if (studentUser) {
          await sendEmailNotification({
            to: studentUser.email,
            subject: `Result Published: ${test ? test.title : "Exam"}`,
            type: "result_published",
            details: {
              studentName: studentUser.name,
              testName: test ? test.title : "",
              marks,
              totalMarks: test ? test.total_marks : 100,
              percentage,
              grade,
              feedback
            }
          });

          // Parent email notifications disabled
        }
      } catch (err) {
        console.error("Error post-result evaluation hooks:", err);
      }

      return data;
    }

    await delay();
    const db = getDb();
    db.results = db.results.filter(r => r.submission_id !== submissionId);

    const submissionIndex = db.submissions.findIndex(s => s.id === submissionId);
    if (submissionIndex === -1) throw new Error("Submission not found");
    
    db.submissions[submissionIndex].status = "evaluated";

    const submission = db.submissions[submissionIndex];
    const test = db.tests.find(t => t.id === submission.test_id);
    const percentage = ((marks / (test ? test.total_marks : 100)) * 100).toFixed(1);

    // Call Gemini for local mode too!
    let finalAIFeedback = aiFeedback;
    try {
      const geminiResult = await generateAIEvaluationFeedback({
        subject: test ? test.subject : "General",
        marks: parseFloat(marks),
        totalMarks: test ? test.total_marks : 100,
        teacherRemarks: feedback
      });
      finalAIFeedback = {
        ...(aiFeedback || {}),
        ...geminiResult
      };
    } catch (geminiErr) {
      console.error("Gemini failed inside local addResult:", geminiErr);
    }

    const newResult = {
      id: `res-${Date.now()}`,
      submission_id: submissionId,
      marks_obtained: parseFloat(marks),
      percentage: parseFloat(percentage),
      grade,
      feedback,
      ai_feedback: finalAIFeedback,
      published_at: new Date().toISOString()
    };
    db.results.push(newResult);

    const xpReward = Math.round(parseFloat(percentage) * 10);
    const studentIdx = db.students.findIndex(s => s.id === submission.student_id);
    if (studentIdx !== -1) {
      const student = db.students[studentIdx];
      student.xp += xpReward;
      const oldLevel = student.level;
      student.level = Math.floor(student.xp / 1000) + 1;
      
      if (student.level > oldLevel) {
        db.badges.push({
          id: `bdg-${Date.now()}-${Math.random()}`,
          student_id: student.id,
          badge_type: `Level ${student.level} Scholar`,
          unlocked_at: new Date().toISOString()
        });
      }
      
      if (parseFloat(percentage) >= 95.0) {
        if (!db.badges.some(b => b.student_id === student.id && b.badge_type === "Top Scorer")) {
          db.badges.push({
            id: `bdg-${Date.now()}-${Math.random()}`,
            student_id: student.id,
            badge_type: "Top Scorer",
            unlocked_at: new Date().toISOString()
          });
        }
      }

      const studentSubs = db.submissions.filter(s => s.student_id === student.id && s.status === "evaluated");
      if (studentSubs.length >= 2) {
        if (!db.badges.some(b => b.student_id === student.id && b.badge_type === "Consistent Performer")) {
          db.badges.push({
            id: `bdg-${Date.now()}-${Math.random()}`,
            student_id: student.id,
            badge_type: "Consistent Performer",
            unlocked_at: new Date().toISOString()
          });
        }
      }

      const leadIdx = db.leaderboard.findIndex(l => l.student_id === student.id);
      if (leadIdx !== -1) {
        db.leaderboard[leadIdx].monthly_score = parseFloat(((db.leaderboard[leadIdx].monthly_score + parseFloat(percentage)) / 2).toFixed(1));
      } else {
        db.leaderboard.push({
          id: `ld-${Date.now()}`,
          student_id: student.id,
          rank: db.leaderboard.length + 1,
          monthly_score: parseFloat(percentage)
        });
      }

      db.leaderboard.sort((a, b) => b.monthly_score - a.monthly_score);
      db.leaderboard.forEach((item, index) => {
        item.rank = index + 1;
        const s = db.students.find(st => st.id === item.student_id);
        if (s) s.rank = index + 1;
      });
    }

    const studentUser = db.users.find(u => u.id === submission.student_id);
    db.notifications.unshift({
      id: `notif-${Date.now()}`,
      user_id: submission.student_id,
      title: "Result Published",
      content: `Your exam sheet for "${test ? test.title : ""}" has been graded: ${marks}/${test ? test.total_marks : 100} (Grade: ${grade}).`,
      is_read: false,
      type: "result",
      created_at: new Date().toISOString()
    });

    saveDb(db);

    if (studentUser) {
      sendEmailNotification({
        to: studentUser.email,
        subject: `Result Published: ${test ? test.title : "Exam"}`,
        type: "result_published",
        details: {
          studentName: studentUser.name,
          testName: test ? test.title : "",
          marks,
          totalMarks: test ? test.total_marks : 100,
          percentage,
          grade,
          feedback
        }
      });

      // Parent email notifications disabled
    }

    return newResult;
  },

  // --- LEADERBOARD & ACHIEVEMENTS ---
  async getLeaderboard() {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase
        .from('leaderboard')
        .select(`
          id,
          rank,
          monthly_score,
          student_id,
          students (
            id,
            xp,
            level,
            users (
              name,
              avatar_url
            )
          )
        `)
        .order('rank', { ascending: true });

      if (error) {
        console.error("Supabase getLeaderboard error:", error);
        throw error;
      }

      return (data || []).map(l => ({
        id: l.id,
        student_id: l.student_id,
        rank: l.rank,
        monthly_score: parseFloat(l.monthly_score),
        name: l.students?.users?.name || "Unknown Scholar",
        avatar: l.students?.users?.avatar_url || "",
        level: l.students?.level || 1,
        xp: l.students?.xp || 0
      }));
    }

    await delay(150);
    const db = getDb();
    return db.leaderboard.map(l => {
      const studentUser = db.users.find(u => u.id === l.student_id);
      const studentDetails = db.students.find(s => s.id === l.student_id);
      return {
        ...l,
        name: studentUser ? studentUser.name : "Unknown Scholar",
        avatar: studentUser ? studentUser.avatar_url : "",
        level: studentDetails ? studentDetails.level : 1,
        xp: studentDetails ? studentDetails.xp : 0
      };
    });
  },

  async getBadges(studentId) {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase.from('badges').select('*').eq('student_id', studentId);
      if (error) throw error;
      return data || [];
    }

    await delay(100);
    const db = getDb();
    return db.badges.filter(b => b.student_id === studentId);
  },

  // --- NOTIFICATIONS & IN-APP MOCK SERVICES ---
  async getNotifications(userId) {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }

    await delay(100);
    return getDb().notifications.filter(n => n.user_id === userId);
  },

  async markNotificationRead(id) {
    if (isLiveMode && supabase) {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
      return true;
    }

    const db = getDb();
    const idx = db.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      db.notifications[idx].is_read = true;
      saveDb(db);
      return true;
    }
    return false;
  },

  async deleteNotification(id) {
    if (isLiveMode && supabase) {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      return true;
    }

    const db = getDb();
    db.notifications = db.notifications.filter(n => n.id !== id);
    saveDb(db);
    return true;
  },

  // --- QUESTION BANK ---
  async getQuestionBank() {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase.from('question_bank').select('*');
      if (error || !data || data.length === 0) {
        return SEED_DATA.question_bank;
      }
      return data;
    }

    await delay(150);
    return getDb().question_bank;
  },

  async addQuestionToBank(question) {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase
        .from('question_bank')
        .insert({
          subject: question.subject,
          question_text: question.question_text,
          difficulty: question.difficulty,
          topic: question.topic,
          marking_scheme: question.marking_scheme
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    await delay(150);
    const db = getDb();
    const newQuestion = {
      id: `qb-${Date.now()}`,
      ...question
    };
    db.question_bank.push(newQuestion);
    saveDb(db);
    return newQuestion;
  },

  async updateQuestionInBank(id, updatedQuestion) {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase
        .from('question_bank')
        .update({
          subject: updatedQuestion.subject,
          question_text: updatedQuestion.question_text,
          difficulty: updatedQuestion.difficulty,
          topic: updatedQuestion.topic,
          marking_scheme: updatedQuestion.marking_scheme
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    await delay(150);
    const db = getDb();
    const idx = db.question_bank.findIndex(q => q.id === id);
    if (idx === -1) throw new Error("Question not found");
    db.question_bank[idx] = { id, ...updatedQuestion };
    saveDb(db);
    return db.question_bank[idx];
  },

  async deleteQuestionFromBank(id) {
    if (isLiveMode && supabase) {
      const { error } = await supabase
        .from('question_bank')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    }

    await delay(150);
    const db = getDb();
    db.question_bank = db.question_bank.filter(q => q.id !== id);
    saveDb(db);
    return true;
  },

  // --- CERTIFICATE SYSTEM ---
  async getCertificates(studentId) {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase.from('certificates').select('*').eq('student_id', studentId);
      if (error) throw error;
      return data || [];
    }

    await delay(100);
    const db = getDb();
    return db.certificates.filter(c => c.student_id === studentId);
  },

  async issueCertificate(studentId, certType) {
    if (isLiveMode && supabase) {
      const newCert = {
        student_id: studentId,
        certificate_type: certType,
        file_url: `${certType.toLowerCase().replace(/\s+/g, "_")}_cert_${Date.now().toString().slice(-4)}.pdf`
      };
      const { data, error } = await supabase.from('certificates').insert(newCert).select().single();
      if (error) throw error;
      return data;
    }

    await delay();
    const db = getDb();
    const newCert = {
      id: `cert-${Date.now()}`,
      student_id: studentId,
      certificate_type: certType,
      file_url: `${certType.toLowerCase().replace(/\s+/g, "_")}_cert_${Date.now().toString().slice(-4)}.pdf`,
      issued_at: new Date().toISOString()
    };
    db.certificates.push(newCert);
    saveDb(db);
    return newCert;
  },

  // --- MARK ALL NOTIFICATIONS READ ---
  async markAllNotificationsRead(userId) {
    if (isLiveMode && supabase) {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
      if (error) throw error;
      return true;
    }
    const db = getDb();
    db.notifications.forEach(n => {
      if (n.user_id === userId) n.is_read = true;
    });
    saveDb(db);
    return true;
  },

  // --- TEST ASSIGNMENTS ---
  async getAssignedTests(studentId) {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase
        .from('test_assignments')
        .select('test_id')
        .eq('student_id', studentId);
      if (error) throw error;
      const testIds = (data || []).map(a => a.test_id);
      if (testIds.length === 0) return [];
      const { data: tests } = await supabase.from('tests').select('*').in('id', testIds);
      return tests || [];
    }
    await delay(100);
    const db = getDb();
    const assignments = (db.test_assignments || []).filter(a => a.student_id === studentId);
    const testIds = assignments.map(a => a.test_id);
    return db.tests.filter(t => testIds.includes(t.id));
  },

  async getTestAssignments(testId) {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase
        .from('test_assignments')
        .select('student_id')
        .eq('test_id', testId);
      if (error) throw error;
      return data || [];
    }
    await delay(100);
    const db = getDb();
    return (db.test_assignments || []).filter(a => a.test_id === testId);
  },

  async assignTestToStudents(testId, studentIds) {
    if (isLiveMode && supabase) {
      const rows = studentIds.map(sid => ({ test_id: testId, student_id: sid }));
      const { error } = await supabase
        .from('test_assignments')
        .upsert(rows, { onConflict: 'test_id, student_id' });
      if (error) throw error;

      const { data: test } = await supabase.from('tests').select('title, subject, total_marks, deadline, question_paper_url, description').eq('id', testId).single();
      const notifs = studentIds.map(sid => ({
        user_id: sid,
        title: 'New Test Assigned',
        content: `A new test "${test?.title}" has been assigned for ${test?.subject}. Due: ${new Date(test?.deadline).toLocaleDateString()}.`,
        is_read: false,
        type: 'new_test'
      }));
      await supabase.from('notifications').insert(notifs);

      const { data: students } = await supabase.from('users').select('id, name, email').in('id', studentIds);
      for (const s of (students || [])) {
        await sendEmailNotification({
          to: s.email,
          subject: `New Test Assigned: ${test?.title}`,
          type: 'new_test',
          details: {
            studentName: s.name,
            testName: test?.title,
            subject: test?.subject,
            totalMarks: test?.total_marks,
            deadline: new Date(test?.deadline).toLocaleString(),
            downloadLink: test?.question_paper_url,
            instructions: test?.description
          }
        });
      }
      return true;
    }

    await delay();
    const db = getDb();
    if (!db.test_assignments) db.test_assignments = [];
    const test = db.tests.find(t => t.id === testId);

    studentIds.forEach(sid => {
      const exists = db.test_assignments.some(a => a.test_id === testId && a.student_id === sid);
      if (!exists) {
        db.test_assignments.push({
          id: `ta-${Date.now()}-${Math.random()}`,
          test_id: testId,
          student_id: sid,
          assigned_at: new Date().toISOString()
        });
      }
      db.notifications.unshift({
        id: `notif-${Date.now()}-${Math.random()}`,
        user_id: sid,
        title: 'New Test Assigned',
        content: `A new test "${test?.title}" has been assigned for ${test?.subject}. Due: ${new Date(test?.deadline).toLocaleDateString()}.`,
        is_read: false,
        type: 'new_test',
        created_at: new Date().toISOString()
      });

      const studentUser = db.users.find(u => u.id === sid);
      if (studentUser) {
        sendEmailNotification({
          to: studentUser.email,
          subject: `New Test Assigned: ${test?.title}`,
          type: 'new_test',
          details: {
            studentName: studentUser.name,
            testName: test?.title,
            subject: test?.subject,
            totalMarks: test?.total_marks,
            deadline: new Date(test?.deadline).toLocaleString(),
            downloadLink: test?.question_paper_url,
            instructions: test?.description
          }
        });
      }
    });
    saveDb(db);
    return true;
  },

  // --- DRAFT / PUBLISH RESULT ---
  async saveDraftResult(submissionId, marks, teacherRemarks) {
    if (isLiveMode && supabase) {
      const { data: submission } = await supabase.from('submissions').select('test_id').eq('id', submissionId).single();
      const { data: test } = submission
        ? await supabase.from('tests').select('total_marks').eq('id', submission.test_id).single()
        : { data: null };
      const totalMarks = test?.total_marks || 100;
      const pct = parseFloat(((marks / totalMarks) * 100).toFixed(1));
      let grade = 'F';
      if (pct >= 90) grade = 'A+';
      else if (pct >= 80) grade = 'A';
      else if (pct >= 70) grade = 'B';
      else if (pct >= 60) grade = 'C';
      else if (pct >= 50) grade = 'D';

      const { data, error } = await supabase.from('results').upsert({
        submission_id: submissionId,
        marks_obtained: parseFloat(marks),
        percentage: pct,
        grade,
        teacher_remarks: teacherRemarks,
        feedback: teacherRemarks,
        status: 'draft'
      }, { onConflict: 'submission_id' }).select().single();
      if (error) throw error;
      return data;
    }

    await delay();
    const db = getDb();
    const submission = db.submissions.find(s => s.id === submissionId);
    const test = db.tests.find(t => t.id === submission?.test_id);
    const totalMarks = test?.total_marks || 100;
    const pct = parseFloat(((marks / totalMarks) * 100).toFixed(1));
    let grade = 'F';
    if (pct >= 90) grade = 'A+';
    else if (pct >= 80) grade = 'A';
    else if (pct >= 70) grade = 'B';
    else if (pct >= 60) grade = 'C';
    else if (pct >= 50) grade = 'D';

    const existingIdx = db.results.findIndex(r => r.submission_id === submissionId);
    const draft = {
      id: existingIdx !== -1 ? db.results[existingIdx].id : `res-${Date.now()}`,
      submission_id: submissionId,
      marks_obtained: parseFloat(marks),
      percentage: pct,
      grade,
      teacher_remarks: teacherRemarks,
      feedback: teacherRemarks,
      ai_feedback: existingIdx !== -1 ? db.results[existingIdx].ai_feedback : null,
      status: 'draft',
      published_at: null
    };
    if (existingIdx !== -1) db.results[existingIdx] = draft;
    else db.results.push(draft);
    saveDb(db);
    return draft;
  },

  async publishResult(submissionId, marks, grade, teacherRemarks, aiFeedback) {
    if (isLiveMode && supabase) {
      const { data: submission } = await supabase.from('submissions').select('*').eq('id', submissionId).single();
      if (!submission) throw new Error('Submission not found');
      const { data: test } = await supabase.from('tests').select('*').eq('id', submission.test_id).single();
      const totalMarks = test?.total_marks || 100;
      const percentage = parseFloat(((marks / totalMarks) * 100).toFixed(1));

      await supabase.from('submissions').update({ status: 'evaluated' }).eq('id', submissionId);

      const { data, error } = await supabase.from('results').upsert({
        submission_id: submissionId,
        marks_obtained: parseFloat(marks),
        percentage,
        grade,
        teacher_remarks: teacherRemarks,
        feedback: teacherRemarks,
        ai_feedback: aiFeedback,
        status: 'published',
        published_at: new Date().toISOString()
      }, { onConflict: 'submission_id' }).select().single();
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: submission.student_id,
        title: 'Result Published',
        content: `Your result for "${test?.title}" is out: ${marks}/${totalMarks} (${percentage}%, Grade: ${grade}).`,
        is_read: false,
        type: 'result'
      });

      const { data: studentUser } = await supabase.from('users').select('name, email').eq('id', submission.student_id).single();
      const { data: sDetails } = await supabase.from('students').select('parent_email').eq('id', submission.student_id).single();
      if (studentUser) {
        await sendEmailNotification({
          to: studentUser.email,
          subject: `Result Published: ${test?.title}`,
          type: 'result_published',
          details: {
            studentName: studentUser.name,
            testName: test?.title,
            marks,
            totalMarks,
            percentage,
            grade,
            teacherRemarks,
            aiFeedback
          }
        });
        // Parent email notifications disabled
      }
      return data;
    }

    await delay();
    const db = getDb();
    const submission = db.submissions.find(s => s.id === submissionId);
    if (!submission) throw new Error('Submission not found');
    const test = db.tests.find(t => t.id === submission.test_id);
    const totalMarks = test?.total_marks || 100;
    const percentage = parseFloat(((marks / totalMarks) * 100).toFixed(1));

    const subIdx = db.submissions.findIndex(s => s.id === submissionId);
    if (subIdx !== -1) db.submissions[subIdx].status = 'evaluated';

    const existingIdx = db.results.findIndex(r => r.submission_id === submissionId);
    const result = {
      id: existingIdx !== -1 ? db.results[existingIdx].id : `res-${Date.now()}`,
      submission_id: submissionId,
      marks_obtained: parseFloat(marks),
      percentage,
      grade,
      teacher_remarks: teacherRemarks,
      feedback: teacherRemarks,
      ai_feedback: aiFeedback,
      status: 'published',
      published_at: new Date().toISOString()
    };
    if (existingIdx !== -1) db.results[existingIdx] = result;
    else db.results.push(result);

    db.notifications.unshift({
      id: `notif-${Date.now()}-${Math.random()}`,
      user_id: submission.student_id,
      title: 'Result Published',
      content: `Your result for "${test?.title}" is out: ${marks}/${totalMarks} (${percentage}%, Grade: ${grade}).`,
      is_read: false,
      type: 'result',
      created_at: new Date().toISOString()
    });
    saveDb(db);

    const studentUser = db.users.find(u => u.id === submission.student_id);
    const studentDetails = db.students.find(s => s.id === submission.student_id);
    if (studentUser) {
      sendEmailNotification({
        to: studentUser.email,
        subject: `Result Published: ${test?.title}`,
        type: 'result_published',
        details: {
          studentName: studentUser.name,
          testName: test?.title,
          marks,
          totalMarks,
          percentage,
          grade,
          teacherRemarks,
          aiFeedback
        }
      });
      // Parent email notifications disabled
    }
    return result;
  },

  async getResultBySubmission(submissionId) {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase.from('results').select('*').eq('submission_id', submissionId).maybeSingle();
      if (error) throw error;
      return data || null;
    }
    await delay(100);
    const db = getDb();
    return db.results.find(r => r.submission_id === submissionId) || null;
  },

  async getStudentResults(studentId) {
    if (isLiveMode && supabase) {
      const { data: subs } = await supabase.from('submissions').select('id').eq('student_id', studentId);
      const subIds = (subs || []).map(s => s.id);
      if (subIds.length === 0) return [];
      const { data, error } = await supabase.from('results').select('*').in('submission_id', subIds).eq('status', 'published');
      if (error) throw error;
      return data || [];
    }
    await delay(100);
    const db = getDb();
    const subs = db.submissions.filter(s => s.student_id === studentId);
    const subIds = subs.map(s => s.id);
    return db.results.filter(r => subIds.includes(r.submission_id) && r.status === 'published');
  },

  async getAnalytics() {
    if (isLiveMode && supabase) {
      const { data: results } = await supabase.from('results').select('percentage, submission_id').eq('status', 'published');
      const { data: submissions } = await supabase.from('submissions').select('id, test_id, submitted_at');
      const { data: tests } = await supabase.from('tests').select('id, subject');

      const subjectMap = {};
      const gradeCount = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
      (results || []).forEach(r => {
        const sub = (submissions || []).find(s => s.id === r.submission_id);
        const test = sub ? (tests || []).find(t => t.id === sub.test_id) : null;
        const subject = test?.subject || 'Other';
        if (!subjectMap[subject]) subjectMap[subject] = { total: 0, count: 0 };
        subjectMap[subject].total += parseFloat(r.percentage);
        subjectMap[subject].count += 1;
        let g = 'F';
        if (r.percentage >= 90) g = 'A+';
        else if (r.percentage >= 80) g = 'A';
        else if (r.percentage >= 70) g = 'B';
        else if (r.percentage >= 60) g = 'C';
        else if (r.percentage >= 50) g = 'D';
        if (gradeCount[g] !== undefined) gradeCount[g] += 1;
      });

      const subjectChartData = Object.entries(subjectMap).map(([subject, v]) => ({
        subject: subject.slice(0, 4),
        average: parseFloat((v.total / v.count).toFixed(1))
      }));
      const gradeChartData = Object.entries(gradeCount).filter(([, v]) => v > 0).map(([grade, count]) => ({ grade, count }));

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const trendData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const label = d.toLocaleDateString('en', { weekday: 'short' });
        const count = (submissions || []).filter(s => {
          const sd = new Date(s.submitted_at);
          return sd.toDateString() === d.toDateString();
        }).length;
        trendData.push({ day: label, submissions: count });
      }

      return { subjectChartData, gradeChartData, trendData };
    }

    await delay(200);
    const db = getDb();
    const subjectMap = {};
    const gradeCount = { 'A+': 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
    (db.results || []).filter(r => r.status === 'published').forEach(r => {
      const sub = db.submissions.find(s => s.id === r.submission_id);
      const test = sub ? db.tests.find(t => t.id === sub.test_id) : null;
      const subject = test?.subject || 'Other';
      if (!subjectMap[subject]) subjectMap[subject] = { total: 0, count: 0 };
      subjectMap[subject].total += parseFloat(r.percentage);
      subjectMap[subject].count += 1;
      let g = 'F';
      if (r.percentage >= 90) g = 'A+';
      else if (r.percentage >= 80) g = 'A';
      else if (r.percentage >= 70) g = 'B';
      else if (r.percentage >= 60) g = 'C';
      else if (r.percentage >= 50) g = 'D';
      if (gradeCount[g] !== undefined) gradeCount[g] += 1;
    });

    const subjectChartData = Object.entries(subjectMap).map(([subject, v]) => ({
      subject: subject.slice(0, 4),
      average: parseFloat((v.total / v.count).toFixed(1))
    }));
    const gradeChartData = Object.entries(gradeCount).filter(([, v]) => v > 0).map(([grade, count]) => ({ grade, count }));

    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const label = d.toLocaleDateString('en', { weekday: 'short' });
      const count = (db.submissions || []).filter(s => {
        const sd = new Date(s.submitted_at);
        return sd.toDateString() === d.toDateString();
      }).length;
      trendData.push({ day: label, submissions: count });
    }

    return { subjectChartData, gradeChartData, trendData };
  },

  async getAllStudents() {
    if (isLiveMode && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, created_at, students(registration_number, class_name, xp, level)')
        .eq('role', 'student');
      if (error) throw error;
      return (data || []).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatar_url: u.avatar_url,
        created_at: u.created_at,
        registration_number: u.students?.registration_number,
        class_name: u.students?.class_name,
        xp: u.students?.xp,
        level: u.students?.level
      }));
    }
    await delay(200);
    const db = getDb();
    return db.users.filter(u => u.role === 'student').map(u => {
      const s = db.students.find(st => st.id === u.id);
      return { ...u, ...(s || {}) };
    });
  },

  // --- DEVELOPER EMAIL LOGGER (Resend Simulator) ---
  sendMockEmail(emailData) {
    const db = getDb();
    const mailRecord = {
      id: `mail-${Date.now()}-${Math.random()}`,
      sentAt: new Date().toISOString(),
      status: 'delivered',
      ...emailData
    };
    db.emails.unshift(mailRecord);
    // Keep max 50 emails in outbox
    if (db.emails.length > 50) db.emails = db.emails.slice(0, 50);
    saveDb(db);
    console.log('[MOCK RESEND API]: Email dispatched!', { to: mailRecord.to, subject: mailRecord.subject, type: mailRecord.type });
  },

  async getMockEmails() {
    const db = getDb();
    return db.emails || [];
  },

  async clearMockEmails() {
    const db = getDb();
    db.emails = [];
    saveDb(db);
    return true;
  }
};

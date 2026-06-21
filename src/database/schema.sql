-- Database Schema DDL for EduTrack AI (Supabase & PostgreSQL)
-- Version 2.0 — Production-Ready with Assignment Workflow

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Core authentication profiles)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'parent')),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Students Detail Table
CREATE TABLE students (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    rank INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    parent_email VARCHAR(255)
);

-- 4. Parents Detail Table
CREATE TABLE parents (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL
);

-- 5. Teachers / Admins Detail Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(255) NOT NULL
);

-- 6. Tests Table (Question paper configurations)
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL CHECK (subject IN ('Physics', 'Chemistry', 'Biology', 'Mathematics', 'English')),
    chapter VARCHAR(255),
    total_marks INTEGER NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'published' CHECK (status IN ('published', 'archived')),
    question_paper_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Test Assignments Table (which students are assigned which tests)
CREATE TABLE test_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(test_id, student_id)
);

-- 8. Submissions Table (Answer sheets uploaded by students)
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'png')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'evaluated')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (test_id, student_id)
);

-- 9. Results Table (Graded sheets and teacher/AI comments)
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(5, 2) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    grade VARCHAR(10) NOT NULL,
    teacher_remarks TEXT,
    feedback TEXT,
    ai_feedback JSONB,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    published_at TIMESTAMP WITH TIME ZONE
);

-- 10. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Leaderboard Table
CREATE TABLE leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    monthly_score NUMERIC(5, 2) NOT NULL
);

-- 12. Badges Table (Achievement rewards)
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    badge_type VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, badge_type)
);

-- 13. Question Bank Table
CREATE TABLE question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    topic VARCHAR(255) NOT NULL,
    marking_scheme TEXT NOT NULL
);

-- 14. Certificates Table
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    certificate_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Users: can read own profile; teachers/admins can read all
CREATE POLICY users_select_own ON users
    FOR SELECT USING (
        auth.uid() = id
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

CREATE POLICY users_insert_own ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY users_update_own ON users
    FOR UPDATE USING (auth.uid() = id);

-- Students: students read own; teachers/admins read all
CREATE POLICY students_select ON students
    FOR SELECT USING (
        auth.uid() = id
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

CREATE POLICY students_insert_own ON students
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Teachers: teachers/admins only
CREATE POLICY teachers_select ON teachers
    FOR SELECT USING (
        auth.uid() = id
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

-- Tests: all authenticated users can read; only teachers/admins can write
CREATE POLICY tests_select_all ON tests
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY tests_insert_teacher ON tests
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

CREATE POLICY tests_update_teacher ON tests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

CREATE POLICY tests_delete_teacher ON tests
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

-- Test Assignments: students read own assignments; teachers/admins read/write all
CREATE POLICY test_assignments_student_select ON test_assignments
    FOR SELECT USING (
        auth.uid() = student_id
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

CREATE POLICY test_assignments_teacher_insert ON test_assignments
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

CREATE POLICY test_assignments_teacher_delete ON test_assignments
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

-- Submissions: students read own; teachers/admins read all; students insert own
CREATE POLICY submissions_select ON submissions
    FOR SELECT USING (
        auth.uid() = student_id
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

CREATE POLICY submissions_insert_student ON submissions
    FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY submissions_update_student ON submissions
    FOR UPDATE USING (auth.uid() = student_id);

-- Results: students read own published results; teachers/admins read/write all
CREATE POLICY results_student_select ON results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.id = results.submission_id
            AND (s.student_id = auth.uid() AND results.status = 'published')
        )
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

CREATE POLICY results_teacher_insert ON results
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

CREATE POLICY results_teacher_update ON results
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

-- Notifications: users read/update own
CREATE POLICY notifications_select_own ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notifications_insert_any ON notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY notifications_update_own ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Leaderboard: all authenticated can read
CREATE POLICY leaderboard_select_all ON leaderboard
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY leaderboard_insert_teacher ON leaderboard
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

-- Badges: students read own; teachers read all
CREATE POLICY badges_select ON badges
    FOR SELECT USING (
        auth.uid() = student_id
        OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    );

-- ============================================================
-- SUPABASE STORAGE BUCKETS (run separately in Supabase dashboard)
-- ============================================================
-- CREATE BUCKET: question-papers (public: true)
-- CREATE BUCKET: answer-sheets (public: false)
--
-- Storage Policy for question-papers (public read):
-- Allow public SELECT on question-papers
--
-- Storage Policy for answer-sheets:
-- INSERT: student can upload to path starting with their user id
-- SELECT: student reads own, teacher/admin reads all
-- UPDATE: student updates own
--
-- SQL for storage policies (run in Supabase SQL editor):
/*
INSERT INTO storage.buckets (id, name, public) VALUES ('question-papers', 'question-papers', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('answer-sheets', 'answer-sheets', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read question papers" ON storage.objects FOR SELECT USING (bucket_id = 'question-papers');
CREATE POLICY "Teacher upload question papers" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'question-papers'
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
);
CREATE POLICY "Student upload answer sheets" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'answer-sheets'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
CREATE POLICY "Student read own answer sheets" ON storage.objects FOR SELECT USING (
    bucket_id = 'answer-sheets'
    AND (
        (storage.foldername(name))[1] = auth.uid()::text
        OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('teacher', 'admin'))
    )
);
CREATE POLICY "Student update own answer sheets" ON storage.objects FOR UPDATE USING (
    bucket_id = 'answer-sheets'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
*/
-- Database Schema DDL for EduTrack AI (Supabase & PostgreSQL)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Users Table (Core authentication profiles)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'parent')),
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Students Detail Table
CREATE TABLE students (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    rank INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    parent_email VARCHAR(255)
);

-- 4. Parents Detail Table
CREATE TABLE parents (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE SET NULL
);

-- 5. Teachers Detail Table
CREATE TABLE teachers (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(255) NOT NULL
);

-- 6. Tests Table (Question paper configurations)
CREATE TABLE tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL CHECK (subject IN ('Physics', 'Chemistry', 'Biology', 'Mathematics', 'English')),
    total_marks INTEGER NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'published' CHECK (status IN ('published', 'archived')),
    question_paper_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Submissions Table (Answer sheets uploaded by students)
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'jpg', 'png')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'evaluated')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (test_id, student_id)
);

-- 8. Results Table (Graded sheets and teacher/AI comments)
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID UNIQUE REFERENCES submissions(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(5, 2) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    grade VARCHAR(10) NOT NULL,
    feedback TEXT,
    ai_feedback JSONB,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50) NOT NULL, -- 'new_test', 'result', 'reminder', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Leaderboard Table
CREATE TABLE leaderboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    monthly_score NUMERIC(5, 2) NOT NULL
);

-- 11. Badges Table (Achievement rewards)
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    badge_type VARCHAR(100) NOT NULL, -- 'top_scorer', 'consistent_performer', etc.
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, badge_type)
);

-- 12. Question Bank Table
CREATE TABLE question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    difficulty VARCHAR(50) CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    topic VARCHAR(255) NOT NULL,
    marking_scheme TEXT NOT NULL
);

-- 13. Certificates Table
CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    certificate_type VARCHAR(100) NOT NULL, -- 'top_performer', 'subject_topper', etc.
    file_url TEXT NOT NULL,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security (RLS) Configuration Example
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Select policy: users can read their own profiles, or teachers can read student/parent links
CREATE POLICY select_user_policy ON users
    FOR SELECT USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('teacher')
    ));

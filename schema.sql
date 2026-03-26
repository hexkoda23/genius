-- MathGenius Database Schema
-- Paste this into the Supabase SQL Editor and click "Run"

-- 1. Profiles Table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    school TEXT,
    bio TEXT,
    exam_target TEXT DEFAULT 'WAEC',
    exam_date DATE,
    avatar_color TEXT DEFAULT 'teal',
    role TEXT DEFAULT 'student',
    parent_email TEXT,
    email_alerts_enabled BOOLEAN DEFAULT true,
    alert_threshold INTEGER DEFAULT 50,
    target_score INTEGER,
    target_year INTEGER,
    study_goal_mins_per_day INTEGER DEFAULT 30,
    xp INTEGER DEFAULT 0,
    streak_current INTEGER DEFAULT 0,
    rank INTEGER,
    badges TEXT[] DEFAULT '{}',
    referral_code TEXT UNIQUE,
    theme TEXT DEFAULT 'light',
    onboarded BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Adding columns explicitly in case the table was created before the columns were added to the CREATE script
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded BOOLEAN DEFAULT false;

-- Allow users to read all profiles (for leaderboard)
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);

-- Allow users to update their own profile
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- 2. Exam Questions Table (Objective / MCQ)
CREATE TABLE IF NOT EXISTS public.exam_questions (
    id SERIAL PRIMARY KEY,
    exam_type TEXT NOT NULL,          -- WAEC, JAMB, NECO, BECE, NABTEB
    year INTEGER NOT NULL,
    subject TEXT DEFAULT 'Mathematics',
    topic TEXT NOT NULL,
    question_text TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    option_e TEXT,                    -- Nullable for 4-option exams
    correct_answer TEXT NOT NULL,     -- A, B, C, D, or E
    difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
    image_url TEXT,
    has_image BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Questions are viewable by everyone." ON public.exam_questions;
CREATE POLICY "Questions are viewable by everyone." ON public.exam_questions FOR SELECT USING (true);


-- 3. Theory Questions Table
CREATE TABLE IF NOT EXISTS public.theory_questions (
    id SERIAL PRIMARY KEY,
    exam_type TEXT NOT NULL,
    year INTEGER NOT NULL,
    topic TEXT NOT NULL,
    question_text TEXT NOT NULL,
    model_answer TEXT NOT NULL,
    image_url TEXT,
    difficulty TEXT DEFAULT 'hard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.theory_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Theory queries are viewable by everyone." ON public.theory_questions;
CREATE POLICY "Theory queries are viewable by everyone." ON public.theory_questions FOR SELECT USING (true);


-- 4. User Attempts Table
CREATE TABLE IF NOT EXISTS public.user_attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    question_id INTEGER REFERENCES public.exam_questions(id),
    session_id UUID,
    is_correct BOOLEAN NOT NULL,
    student_answer TEXT,
    time_taken_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own attempts." ON public.user_attempts;
CREATE POLICY "Users view own attempts." ON public.user_attempts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own attempts." ON public.user_attempts;
CREATE POLICY "Users insert own attempts." ON public.user_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 5. Study Sessions / CBT Table
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    session_type TEXT NOT NULL, -- 'practice', 'cbt', 'mock'
    topic TEXT,
    exam_type TEXT,
    score INTEGER,
    total_questions INTEGER,
    duration_seconds INTEGER,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own sessions." ON public.study_sessions;
CREATE POLICY "Users view own sessions." ON public.study_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert/update own sessions." ON public.study_sessions;
CREATE POLICY "Users insert/update own sessions." ON public.study_sessions FOR ALL USING (auth.uid() = user_id);


-- 6. Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    question_id INTEGER REFERENCES public.exam_questions(id) ON DELETE CASCADE NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, question_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bookmarks." ON public.bookmarks;
CREATE POLICY "Users manage own bookmarks." ON public.bookmarks FOR ALL USING (auth.uid() = user_id);


-- 7. Teach Logs Table
CREATE TABLE IF NOT EXISTS public.teach_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    topic TEXT NOT NULL,
    query TEXT,
    response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.teach_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own teach logs." ON public.teach_logs;
CREATE POLICY "Users manage own teach logs." ON public.teach_logs FOR ALL USING (auth.uid() = user_id);


-- Set up Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('question-images', 'question-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

-- Allow public read access to images
DROP POLICY IF EXISTS "Public Read Access" ON storage.objects;
CREATE POLICY "Public Read Access" ON storage.objects FOR SELECT USING (bucket_id = 'question-images' OR bucket_id = 'avatars');

-- Done.

CREATE TABLE IF NOT EXISTS public.cbt_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    exam_type TEXT NOT NULL,
    topic TEXT,
    difficulty TEXT DEFAULT 'mixed',
    year INTEGER,
    duration_mins INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    score INTEGER,
    percentage INTEGER,
    time_taken_secs INTEGER,
    status TEXT DEFAULT 'ongoing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.cbt_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own CBT sessions." ON public.cbt_sessions;
CREATE POLICY "Users view own CBT sessions." ON public.cbt_sessions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users insert/update own CBT sessions." ON public.cbt_sessions;
CREATE POLICY "Users insert/update own CBT sessions." ON public.cbt_sessions FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.cbt_answers (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES public.cbt_sessions(id) ON DELETE CASCADE NOT NULL,
    question_id INTEGER,
    question_text TEXT NOT NULL,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_answer TEXT,
    student_answer TEXT,
    is_correct BOOLEAN,
    time_taken_secs INTEGER,
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.cbt_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own CBT answers." ON public.cbt_answers;
CREATE POLICY "Users view own CBT answers." ON public.cbt_answers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.cbt_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Users insert CBT answers for own sessions." ON public.cbt_answers;
CREATE POLICY "Users insert CBT answers for own sessions." ON public.cbt_answers FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.cbt_sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
);

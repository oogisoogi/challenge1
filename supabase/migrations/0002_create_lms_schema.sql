-- Migration: LMS 핵심 스키마 생성
-- Tables: profiles, terms_agreements, categories, difficulty_levels,
--         courses, enrollments, assignments, submissions, reports

-- =============================================================================
-- 0. Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. Enum Types
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('learner', 'instructor', 'operator');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('draft', 'published', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE submission_status AS ENUM ('submitted', 'graded', 'resubmission_required');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM ('active', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_target_type AS ENUM ('course', 'assignment', 'submission', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM ('received', 'investigating', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_action AS ENUM ('warning', 'invalidate_submission', 'restrict_account');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 2. Tables
-- =============================================================================

-- 2-1. profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role   NOT NULL,
  name        text        NOT NULL,
  phone       text        NOT NULL,
  bio         text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Supabase Auth(auth.users)와 1:1 연결되는 사용자 프로필';

-- 2-2. terms_agreements
CREATE TABLE IF NOT EXISTS public.terms_agreements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agreed_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.terms_agreements IS '약관 동의 이력';

-- 2-3. categories
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.categories IS '코스 카테고리 메타데이터 (운영 관리)';

-- 2-4. difficulty_levels
CREATE TABLE IF NOT EXISTS public.difficulty_levels (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL UNIQUE,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.difficulty_levels IS '난이도 메타데이터 (운영 관리)';

-- 2-5. courses
CREATE TABLE IF NOT EXISTS public.courses (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id   uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text          NOT NULL,
  description     text          NOT NULL DEFAULT '',
  category_id     uuid          REFERENCES public.categories(id) ON DELETE SET NULL,
  difficulty_id   uuid          REFERENCES public.difficulty_levels(id) ON DELETE SET NULL,
  curriculum      text          NOT NULL DEFAULT '',
  status          course_status NOT NULL DEFAULT 'draft',
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.courses IS '코스 본체';

-- 2-6. enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
  id          uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid              NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  learner_id  uuid              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      enrollment_status NOT NULL DEFAULT 'active',
  created_at  timestamptz       NOT NULL DEFAULT now(),
  updated_at  timestamptz       NOT NULL DEFAULT now(),

  UNIQUE (course_id, learner_id)
);

COMMENT ON TABLE public.enrollments IS '수강 등록 (UPSERT로 재수강 지원)';

-- 2-7. assignments
CREATE TABLE IF NOT EXISTS public.assignments (
  id                  uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id           uuid              NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title               text              NOT NULL,
  description         text              NOT NULL DEFAULT '',
  due_date            timestamptz       NOT NULL,
  weight              integer           NOT NULL DEFAULT 1,
  allow_late          boolean           NOT NULL DEFAULT false,
  allow_resubmission  boolean           NOT NULL DEFAULT false,
  status              assignment_status NOT NULL DEFAULT 'draft',
  created_at          timestamptz       NOT NULL DEFAULT now(),
  updated_at          timestamptz       NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.assignments IS '과제';

-- 2-8. submissions
CREATE TABLE IF NOT EXISTS public.submissions (
  id              uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   uuid              NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  learner_id      uuid              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content         text              NOT NULL,
  link            text,
  is_late         boolean           NOT NULL DEFAULT false,
  status          submission_status NOT NULL DEFAULT 'submitted',
  score           integer           CHECK (score >= 0 AND score <= 100),
  feedback        text,
  submitted_at    timestamptz       NOT NULL DEFAULT now(),
  graded_at       timestamptz,
  created_at      timestamptz       NOT NULL DEFAULT now(),
  updated_at      timestamptz       NOT NULL DEFAULT now(),

  UNIQUE (assignment_id, learner_id)
);

COMMENT ON TABLE public.submissions IS '과제 제출물 (과제당 1제출, 재제출은 UPDATE)';

-- 2-9. reports
CREATE TABLE IF NOT EXISTS public.reports (
  id            uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id   uuid              NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type   report_target_type NOT NULL,
  target_id     uuid              NOT NULL,
  reason        text              NOT NULL,
  content       text              NOT NULL DEFAULT '',
  status        report_status     NOT NULL DEFAULT 'received',
  action        report_action,
  created_at    timestamptz       NOT NULL DEFAULT now(),
  updated_at    timestamptz       NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.reports IS '신고 (운영)';

-- =============================================================================
-- 3. Indexes
-- =============================================================================

-- 코스 탐색 (카탈로그 필터/정렬)
CREATE INDEX IF NOT EXISTS idx_courses_status     ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_category   ON public.courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_difficulty  ON public.courses(difficulty_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_at  ON public.courses(created_at DESC);

-- 수강 조회
CREATE INDEX IF NOT EXISTS idx_enrollments_learner ON public.enrollments(learner_id, status);
CREATE INDEX IF NOT EXISTS idx_enrollments_course  ON public.enrollments(course_id, status);

-- 과제 조회 (마감 임박 등)
CREATE INDEX IF NOT EXISTS idx_assignments_course_status ON public.assignments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date      ON public.assignments(due_date);

-- 제출물 조회 (채점 대기 등)
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON public.submissions(assignment_id, status);
CREATE INDEX IF NOT EXISTS idx_submissions_learner    ON public.submissions(learner_id);

-- 신고 조회
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);

-- =============================================================================
-- 4. updated_at 자동 갱신 트리거
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_difficulty_levels_updated_at
    BEFORE UPDATE ON public.difficulty_levels
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_enrollments_updated_at
    BEFORE UPDATE ON public.enrollments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_submissions_updated_at
    BEFORE UPDATE ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- 5. RLS 비활성화
-- =============================================================================
ALTER TABLE IF EXISTS public.profiles          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.terms_agreements  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.difficulty_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.courses           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.enrollments       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assignments       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.submissions       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reports           DISABLE ROW LEVEL SECURITY;

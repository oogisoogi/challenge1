-- Migration: profiles 테이블에 is_restricted 컬럼 추가 (UC-012 restrict_account 액션)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_restricted IS '계정 제한 플래그 (operator restrict_account 액션 적용 시 true)';

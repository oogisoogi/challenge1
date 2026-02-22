-- Migration: 시드 사용자에 누락된 auth.identities 레코드 추가
-- GoTrue v2에서 로그인 시 auth.identities 테이블을 필수 참조하므로
-- 시드 데이터(0003)에서 auth.users에만 INSERT하고 identities를 누락한 문제 수정

-- Instructor 2명
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'c1000000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'sub', 'c1000000-0000-0000-0000-000000000001',
      'email', 'instructor2@example.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    'c1000000-0000-0000-0000-000000000001',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'c1000000-0000-0000-0000-000000000002',
    jsonb_build_object(
      'sub', 'c1000000-0000-0000-0000-000000000002',
      'email', 'instructor3@example.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    'c1000000-0000-0000-0000-000000000002',
    now(), now(), now()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-- Learner 2명
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (
    gen_random_uuid(),
    'd1000000-0000-0000-0000-000000000001',
    jsonb_build_object(
      'sub', 'd1000000-0000-0000-0000-000000000001',
      'email', 'learner1@example.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    'd1000000-0000-0000-0000-000000000001',
    now(), now(), now()
  ),
  (
    gen_random_uuid(),
    'd1000000-0000-0000-0000-000000000002',
    jsonb_build_object(
      'sub', 'd1000000-0000-0000-0000-000000000002',
      'email', 'learner2@example.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    'd1000000-0000-0000-0000-000000000002',
    now(), now(), now()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

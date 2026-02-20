# UC-001 구현 점검 보고서: 역할 선택 & 온보딩

작성일: 2026-02-20

---

## 1. 점검 개요

`/docs/001/spec.md` 및 `/docs/001/plan.md`를 기반으로 UC-001(역할 선택 & 온보딩) 기능의 프로덕션 레벨 구현 여부를 점검하였다.

---

## 2. TODO 체크리스트 및 점검 결과

### Phase 1: Backend Layer

| # | 파일 | 항목 | 상태 | 비고 |
|---|------|------|------|------|
| 1-1 | `src/features/auth/backend/schema.ts` | `signupRequestSchema` (email, password zod 검증) | 완료 | 이메일 형식, 비밀번호 최소 6자 |
| 1-1 | `src/features/auth/backend/schema.ts` | `signupResponseSchema` (uid, redirectTo) | 완료 | `redirectTo: z.string()` |
| 1-1 | `src/features/auth/backend/schema.ts` | `onboardingRequestSchema` (role, name, phone, bio, termsAgreed) | 완료 | role enum, 전화번호 regex, `termsAgreed: z.literal(true)` |
| 1-1 | `src/features/auth/backend/schema.ts` | `onboardingResponseSchema` (redirectTo) | 완료 | |
| 1-1 | `src/features/auth/backend/schema.ts` | `profileRowSchema` | 완료 | |
| 1-2 | `src/features/auth/backend/error.ts` | 에러 코드 6종 정의 | 완료 | `AUTH_SIGNUP_DUPLICATE_EMAIL` 등 |
| 1-3 | `src/features/auth/backend/service.ts` | `signUpUser` — Supabase Auth signUp 호출, 이메일 중복 시 409 반환 | 완료 | |
| 1-3 | `src/features/auth/backend/service.ts` | `completeOnboarding` — profiles/terms_agreements INSERT, 역할 기반 redirectTo | 완료 | |
| 1-3 | `src/features/auth/backend/service.ts` | `getProfileByUserId` — 프로필 존재 여부 확인 | 완료 | |
| 1-4 | `src/features/auth/backend/route.ts` | `POST /api/auth/signup` 엔드포인트 | 완료 | |
| 1-4 | `src/features/auth/backend/route.ts` | `POST /api/auth/onboarding` 엔드포인트 (인증 확인 포함) | 완료 | `extractUserId` 사용 |

### Phase 2: Shared / Infrastructure

| # | 파일 | 항목 | 상태 | 비고 |
|---|------|------|------|------|
| 2-1 | `src/features/auth/lib/validation.ts` | `passwordSchema`, `phoneSchema`, `emailSchema` 공유 규칙 | 완료 | |
| 2-2 | `src/features/auth/constants/index.ts` | `ROLE_REDIRECT_MAP`, `ONBOARDING_PATH` 상수 | 완료 | |
| 2-3 | `src/features/auth/lib/dto.ts` | backend/schema 프론트엔드 재노출 | 완료 | |
| 2-4 | `src/constants/auth.ts` | `ONBOARDING_PATH` 상수 추가 | 완료 | PUBLIC_PATHS에도 포함됨 |
| 2-5 | `src/middleware.ts` | E5: 온보딩 미완료 사용자 강제 리다이렉트 | 완료 | ts-pattern 활용, 3가지 케이스 처리 |
| 2-5 | `src/middleware.ts` | 인증된 사용자가 `/onboarding` 접근 시 프로필 있으면 역할 기반 랜딩 리다이렉트 | 완료 | |
| 2-6 | `src/backend/hono/app.ts` | `registerAuthRoutes(app)` 등록 | 완료 | |

### Phase 3: Frontend Layer

| # | 파일 | 항목 | 상태 | 비고 |
|---|------|------|------|------|
| 3-1 | `src/features/auth/hooks/useSignupMutation.ts` | `POST /api/auth/signup` Hono API 경유 호출 | **미완료 (버그)** | 아래 상세 설명 참고 |
| 3-2 | `src/features/auth/hooks/useOnboardingMutation.ts` | `POST /api/auth/onboarding` apiClient 경유 호출 | 완료 | |
| 3-3 | `src/features/auth/components/signup-form.tsx` | react-hook-form + zod, 이메일/비밀번호/비밀번호확인 필드 | 완료 | |
| 3-3 | `src/features/auth/components/signup-form.tsx` | 에러 메시지 표시, 로딩 상태 처리 | 완료 | |
| 3-3 | `src/features/auth/components/signup-form.tsx` | 로그인 링크 | 완료 | |
| 3-4 | `src/features/auth/components/role-selector.tsx` | Learner/Instructor 카드 UI, 선택 하이라이트 | 완료 | GraduationCap, BookOpen 아이콘 사용 |
| 3-5 | `src/features/auth/components/onboarding-form.tsx` | role/name/phone/bio/termsAgreed 폼 | 완료 | |
| 3-5 | `src/features/auth/components/onboarding-form.tsx` | Instructor 선택 시 Bio 필드 조건부 렌더링 | 완료 | |
| 3-5 | `src/features/auth/components/onboarding-form.tsx` | Instructor→Learner 전환 시 bio 빈 문자열로 전송 | 완료 | `values.role === 'instructor' ? values.bio : ''` |
| 3-5 | `src/features/auth/components/onboarding-form.tsx` | 로딩 상태 처리, 에러 메시지 표시 | 완료 | |
| 3-6 | `src/app/signup/page.tsx` | SignupForm 컴포넌트 사용, 인증 사용자 리다이렉트 | 완료 | |
| 3-7 | `src/app/onboarding/page.tsx` | OnboardingForm 렌더링, 미인증 시 로그인 리다이렉트 | 완료 | |

### DB 스키마

| # | 파일 | 항목 | 상태 | 비고 |
|---|------|------|------|------|
| DB | `supabase/migrations/0002_create_lms_schema.sql` | `profiles` 테이블 (id, role, name, phone, bio, timestamps) | 완료 | `auth.users` 1:1 FK, RLS disabled |
| DB | `supabase/migrations/0002_create_lms_schema.sql` | `terms_agreements` 테이블 (id, user_id, agreed_at, created_at) | 완료 | profiles FK |

---

## 3. 발견된 버그 및 미구현 항목

### [버그 1] `useSignupMutation` — Hono API 미경유, Supabase SDK 직접 호출

**파일:** `src/features/auth/hooks/useSignupMutation.ts`

**현황:**
`plan.md` Phase 3-1에서 명시된 대로 `POST /api/auth/signup` Hono API를 `apiClient`를 통해 호출해야 하나, 현재 구현은 `getSupabaseBrowserClient()`를 직접 사용하여 `supabase.auth.signUp()`을 호출한다.

```typescript
// 현재 구현 (비정상)
const signupFetcher = async (params: SignupRequest): Promise<SignupResponse> => {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signUp({ ... });
  // ...
  return { uid: '', redirectTo: ONBOARDING_PATH }; // uid가 빈 문자열
};
```

**문제점:**
1. `apiClient`, `signupResponseSchema`, `extractApiErrorMessage`가 import되어 있으나 전혀 사용되지 않는다 (dead import).
2. 반환되는 `uid`가 빈 문자열(`''`)로 고정되어 실제 사용자 uid가 전달되지 않는다.
3. Hono 백엔드의 에러 처리(`409 AUTH_SIGNUP_DUPLICATE_EMAIL`, "이미 가입된 이메일입니다." 메시지)가 FE에 전달되지 않아, E1 Edge Case 처리가 불완전하다.
4. Supabase SDK에서 던지는 에러 메시지는 영문이므로 사용자에게 한국어 안내가 되지 않는다.

**구현 방향:**
`apiClient`를 통해 `POST /api/auth/signup`을 호출하도록 수정하고, `signupResponseSchema`로 응답 검증, `extractApiErrorMessage`로 에러 메시지 추출하는 방식으로 전환해야 한다.

```typescript
// 올바른 구현 방향
const signupFetcher = async (params: SignupRequest): Promise<SignupResponse> => {
  try {
    const { data } = await apiClient.post('/api/auth/signup', params);
    return signupResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '회원가입에 실패했습니다.');
    throw new Error(message);
  }
};
```

---

## 4. 종합 평가

### 완료 항목 (21/22)

전체 22개 점검 항목 중 21개가 프로덕션 레벨로 구현되어 있다.

- Backend Layer (schema, error, service, route) 전부 완료.
- Shared/Infrastructure Layer (validation, constants, dto, middleware, hono app) 전부 완료.
- Frontend Layer 중 `useOnboardingMutation`, `SignupForm`, `RoleSelector`, `OnboardingForm`, `signup/page.tsx`, `onboarding/page.tsx` 완료.
- DB 스키마 완료.
- 미들웨어의 E5 처리 완료 (ts-pattern 활용, 3가지 케이스 분기).
- Business Rules (BR1~BR7) 전부 충족.

### 미완료 항목 (1/22)

`useSignupMutation`이 Hono API 대신 Supabase SDK를 직접 호출하여 아키텍처 일관성을 위반하고 E1 Edge Case(이미 가입된 이메일 한국어 에러 메시지 표시)가 실제로 동작하지 않는다.

| 항목 | 파일 | 심각도 |
|------|------|--------|
| `useSignupMutation` Hono API 경유 미구현 | `src/features/auth/hooks/useSignupMutation.ts` | 중간 (기능 동작은 하나, 에러 메시지 품질 저하 및 아키텍처 규칙 위반) |

---

## 5. 수정 계획 요약

`src/features/auth/hooks/useSignupMutation.ts`를 아래와 같이 수정한다.

1. `getSupabaseBrowserClient` import 제거.
2. `signupFetcher`에서 `apiClient.post('/api/auth/signup', params)` 호출.
3. `signupResponseSchema.parse(data)`로 응답 검증.
4. `extractApiErrorMessage`로 에러 메시지 추출 및 throw.
5. 기존 dead import (`apiClient`, `signupResponseSchema`, `extractApiErrorMessage`) 실제 사용으로 전환.

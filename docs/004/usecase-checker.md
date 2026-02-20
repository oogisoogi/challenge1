# UC-004 구현 점검 보고서: 과제 상세 열람 (Learner)

점검일: 2026-02-20

---

## 1. 점검 범위 및 Todo List

spec.md / plan.md 기반으로 아래 모듈 및 로직을 점검 대상으로 선정하였다.

| # | 항목 | 파일 경로 |
|---|------|-----------|
| T1 | Backend Schema | `src/features/assignment-detail/backend/schema.ts` |
| T2 | Backend Error | `src/features/assignment-detail/backend/error.ts` |
| T3 | Backend Service (`getAssignmentDetail`) | `src/features/assignment-detail/backend/service.ts` |
| T4 | Backend Service (`createSubmission`) | `src/features/assignment-detail/backend/service.ts` |
| T5 | Backend Service (`updateSubmission`) | `src/features/assignment-detail/backend/service.ts` |
| T6 | Backend Route | `src/features/assignment-detail/backend/route.ts` |
| T7 | DTO 재노출 | `src/features/assignment-detail/lib/dto.ts` |
| T8 | Query Key 상수 | `src/features/assignment-detail/constants/index.ts` |
| T9 | Hono App 라우트 등록 | `src/backend/hono/app.ts` |
| T10 | useAssignmentDetailQuery 훅 | `src/features/assignment-detail/hooks/useAssignmentDetailQuery.ts` |
| T11 | useSubmitMutation 훅 | `src/features/assignment-detail/hooks/useSubmitMutation.ts` |
| T12 | useResubmitMutation 훅 | `src/features/assignment-detail/hooks/useResubmitMutation.ts` |
| T13 | AssignmentDetailPage 컴포넌트 | `src/features/assignment-detail/components/assignment-detail-page.tsx` |
| T14 | AssignmentMeta 컴포넌트 | `src/features/assignment-detail/components/assignment-meta.tsx` |
| T15 | AssignmentDescription 컴포넌트 | `src/features/assignment-detail/components/assignment-description.tsx` |
| T16 | SubmissionStatus 컴포넌트 | `src/features/assignment-detail/components/submission-status.tsx` |
| T17 | SubmissionZone 컴포넌트 | `src/features/assignment-detail/components/submission-zone.tsx` |
| T18 | 과제 상세 페이지 (App Router) | `src/app/(protected)/courses/my/[courseId]/assignments/[assignmentId]/page.tsx` |
| T19 | DB 스키마 (assignments, submissions, enrollments) | `supabase/migrations/0002_create_lms_schema.sql` |
| T20 | react-markdown, @tailwindcss/typography 패키지 설치 | `package.json`, `src/app/globals.css` |
| T21 | 공통 인증 유틸 | `src/backend/http/auth.ts` |
| T22 | 공통 HTTP 응답 | `src/backend/http/response.ts` |
| T23 | Protected Layout 인증 가드 | `src/app/(protected)/layout.tsx` |

---

## 2. 점검 결과 요약

| 상태 | 건수 |
|------|------|
| 정상 구현 | 21 |
| 버그 / 스펙 불일치 | 2 |
| 미구현 | 0 |

---

## 3. 항목별 상세 점검 결과

### T1. Backend Schema (`schema.ts`)

**상태: 정상**

- `assignmentDetailParamSchema`: `courseId`, `assignmentId` 모두 `z.string().uuid()` 검증.
- `assignmentDetailSchema`: `status` 필드가 `z.enum(['published', 'closed'])` — draft 노출 차단(BR1) 스펙 준수.
- `submissionDetailSchema`: `score`, `feedback`, `gradedAt` 모두 `.nullable()` 처리 정상.
- `assignmentDetailResponseSchema`: `submission: submissionDetailSchema.nullable()` 정상.
- `submissionBodySchema`, `submissionResponseSchema`: UC-005 제출 관련 스키마 추가 포함(스펙 외 선구현, 문제 없음).

---

### T2. Backend Error (`error.ts`)

**상태: 정상**

plan.md에 명세된 6개 에러 코드 모두 구현됨:
- `unauthorized`, `forbiddenRole`, `notEnrolled`, `notFound`, `fetchError`, `validationError`

제출 관련 에러 코드(`alreadySubmitted`, `lateNotAllowed`, `assignmentClosed`, `resubmitNotAllowed`, `notResubmitRequired`, `submissionNotFound`) 추가 정의 — UC-005 선구현 항목, 스펙 충돌 없음.

`AssignmentDetailServiceError` 유니온 타입 `as const` 추론으로 정상 생성됨.

---

### T3. Backend Service — `getAssignmentDetail`

**상태: 정상**

plan.md 4단계 비즈니스 로직 모두 구현됨:

| 단계 | 검증 항목 | 구현 여부 |
|------|-----------|-----------|
| Step 1 | `enrollments` WHERE `course_id`, `learner_id`, `status='active'` 검증 (BR2) | 정상 |
| Step 1 | 미수강 시 403 + `ASSIGNMENT_DETAIL_NOT_ENROLLED` (E2) | 정상 |
| Step 2 | `assignments` WHERE `status IN ('published', 'closed')` 조회 (BR1) | 정상 |
| Step 2 | 없을 시 404 + `ASSIGNMENT_DETAIL_NOT_FOUND` (E1, E3) | 정상 |
| Step 3 | `submissions` WHERE `assignment_id`, `learner_id` — `maybeSingle()` nullable | 정상 |
| Step 4 | snake_case → camelCase 매핑 후 `success()` 반환 | 정상 |

---

### T4. Backend Service — `createSubmission`

**상태: 정상 (UC-005 스펙 포함)**

- 수강 등록 검증 → 403
- 과제 조회 및 `draft` 차단 → 404, `closed` 차단 → 400
- 기존 제출물 중복 체크 → 409 `alreadySubmitted`
- `isLate` 계산: `new Date() > new Date(assignment.due_date)` (BR7 준수)
- 지각 불가(`allowLate=false`) 시 400 반환
- `submitted_at` 명시적 기록 후 INSERT, 201 반환

---

### T5. Backend Service — `updateSubmission`

**상태: 정상 (UC-005/재제출 스펙 포함)**

- 수강 등록 검증 → 403
- 과제 조회 및 `allow_resubmission` 검증 → 400
- 기존 제출물 조회 및 `status='resubmission_required'` 검증 → 400
- `is_late` 재계산 후 UPDATE, `status='submitted'` 초기화
- 200 반환

---

### T6. Backend Route (`route.ts`)

**상태: 정상**

plan.md 엔드포인트 + UC-005 관련 엔드포인트 모두 구현됨:

| Method | Path | 구현 여부 |
|--------|------|-----------|
| GET | `/api/courses/:courseId/assignments/:assignmentId` | 정상 |
| POST | `/api/courses/:courseId/assignments/:assignmentId/submissions` | 정상 |
| PUT | `/api/courses/:courseId/assignments/:assignmentId/submissions` | 정상 |

각 엔드포인트에서:
1. `extractUserId(c)` → 미인증 시 401 (E5)
2. `requireLearnerRole(supabase, userId)` → Instructor/비학습자 403 (E4)
3. `assignmentDetailParamSchema.safeParse()` → 파라미터 검증 400
4. Body 검증 (`submissionBodySchema`) → 400
5. 서비스 호출 및 `respond(c, result)` 반환

CLAUDE.md 규정 "Hono 라우트 경로는 반드시 `/api` prefix" 준수.

---

### T7. DTO 재노출 (`lib/dto.ts`)

**상태: 정상**

plan.md 명세 항목 + UC-005 관련 스키마 타입 모두 재노출됨:
```typescript
export {
  assignmentDetailSchema,
  submissionDetailSchema,
  assignmentDetailResponseSchema,
  submissionBodySchema,
  submissionResponseSchema,
  type AssignmentDetail,
  type SubmissionDetail,
  type AssignmentDetailResponse,
  type SubmissionBody,
  type SubmissionResponse,
} from '../backend/schema';
```

---

### T8. Query Key 상수 (`constants/index.ts`)

**상태: 정상**

```typescript
ASSIGNMENT_DETAIL_QUERY_KEYS = {
  all: ['assignment-detail'] as const,
  detail: (courseId, assignmentId) => ['assignment-detail', courseId, assignmentId] as const,
}
```
plan.md 스펙과 완전 일치.

---

### T9. Hono App 라우트 등록 (`app.ts`)

**상태: 정상**

```typescript
import { registerAssignmentDetailRoutes } from "@/features/assignment-detail/backend/route";
// ...
registerAssignmentDetailRoutes(app);
```
`app.ts`에 정상 등록됨. development HMR 패턴(singleton은 production에서만 캐시) 준수.

---

### T10. useAssignmentDetailQuery 훅

**상태: 정상**

- `apiClient.get()` 사용 (CLAUDE.md 규정 준수)
- `assignmentDetailResponseSchema.parse(data)` 응답 검증
- `queryKey: ASSIGNMENT_DETAIL_QUERY_KEYS.detail(courseId, assignmentId)` 정상
- `staleTime: 30 * 1000` 정상
- `enabled: Boolean(courseId) && Boolean(assignmentId)` 정상
- `'use client'` 지시어 포함

---

### T11. useSubmitMutation 훅

**상태: 정상**

- POST `/api/courses/${courseId}/assignments/${assignmentId}/submissions`
- `submissionBodySchema.parse()` 사전 검증
- `submissionResponseSchema.parse(data)` 응답 검증
- `onSuccess`: toast 알림 + `invalidateQueries`로 캐시 무효화
- `onError`: destructive toast
- `isLate` 여부에 따른 toast 메시지 분기

---

### T12. useResubmitMutation 훅

**상태: 정상**

- PUT `/api/courses/${courseId}/assignments/${assignmentId}/submissions`
- 구조는 `useSubmitMutation`과 동일하며 메서드만 PUT 사용

---

### T13. AssignmentDetailPage 컴포넌트

**상태: 정상**

- `useAssignmentDetailQuery` 훅 사용
- 로딩 시 `PageSkeleton` 스켈레톤 UI 표시
- 에러 시 에러 메시지 + "다시 시도" 버튼 (`refetch`)
- 404 → "존재하지 않는 과제입니다." 표시
- 403 + `ASSIGNMENT_DETAIL_NOT_ENROLLED` → "수강 중인 코스가 아닙니다." 표시
- 403 기타 → "접근 권한이 없습니다." 표시
- 뒤로 가기 링크: `/courses/my` (plan.md 5-1 스펙 준수)
- 레이아웃: 제목 → `AssignmentMeta` → `AssignmentDescription` → `SubmissionStatus` → `SubmissionZone`
- `'use client'` 지시어 포함

---

### T14. AssignmentMeta 컴포넌트

**상태: 정상**

plan.md QA Sheet 기준 전항목 구현됨:

| 항목 | 구현 내용 |
|------|-----------|
| 마감일 | `format(new Date(dueDate), 'yyyy.MM.dd HH:mm')` + Badge |
| 마감 임박 | `differenceInHours < 0` → "마감됨" secondary, `<= 24` → "마감 임박" destructive |
| 점수 비중 | `{weight}점` |
| 지각 제출 | `allowLate ? "허용" : "불허"` Badge |
| 재제출 | `allowResubmission ? "허용" : "불허"` Badge |
| 과제 상태 | `published` → "진행중", `closed` → "마감" |

`date-fns` 라이브러리 사용(CLAUDE.md 규정 준수).

---

### T15. AssignmentDescription 컴포넌트

**상태: 정상**

- `react-markdown` 사용하여 `description` 렌더링
- `prose prose-sm max-w-none dark:prose-invert` Tailwind typography 클래스 적용
- 빈 description → "과제 설명이 없습니다." 안내 텍스트 표시
- `@tailwindcss/typography` 플러그인 `package.json` + `globals.css`에 정상 등록됨

---

### T16. SubmissionStatus 컴포넌트

**상태: 정상**

| 시나리오 | 구현 내용 |
|----------|-----------|
| 제출물 없음 | "아직 제출하지 않았습니다." |
| `submitted` | "제출됨" secondary Badge + 제출 일시 |
| `graded` | "채점완료" default Badge + 점수(score !== null인 경우만) + 피드백(존재 시) + 채점일시 |
| `resubmission_required` | "재제출요청" outline Badge + 피드백 표시 |
| `isLate=true` | "지각" destructive Badge 추가 |
| `gradedAt` | `yyyy.MM.dd HH:mm` 형식으로 표시 |

---

### T17. SubmissionZone 컴포넌트

**상태: 버그 발견 (경미, 서버 측 방어 존재)**

`resolveSubmissionState` 함수에서 `allowResubmission=false` AND `submission.status='resubmission_required'` 케이스 처리 불완전.

**문제:**
```typescript
// 현재 코드
const resolveSubmissionState = (assignment, submission): SubmissionState => {
  if (submission?.status === 'graded') return 'graded';

  // allowResubmission=false 이면 아래 조건 미충족 → 이후 로직으로 진행
  if (assignment.allowResubmission && submission?.status === 'resubmission_required') {
    return 'active_resubmit';
  }

  if (assignment.status === 'closed') return 'closed_status';

  const isPastDeadline = new Date() >= new Date(assignment.dueDate);
  if (!isPastDeadline) return 'active'; // <- 잘못된 'active' 상태 반환
  if (assignment.allowLate) return 'active_late';
  return 'closed_deadline';
};
```

**spec 기대 동작 (QA Sheet #7):** `allowResubmission=false` AND `resubmission_required` → 재제출 버튼 미표시.

현재 구현은 마감 전 `published` 과제인 경우 `active` 상태가 되어 제출 폼이 표시된다. 서버 측에서는 `createSubmission`이 기존 제출물이 있을 경우 409 `alreadySubmitted`를 반환하므로 데이터 무결성은 보장되지만, 사용자 경험(UX) 관점에서 스펙과 불일치한다.

**수정 방안:**
```typescript
const resolveSubmissionState = (
  assignment: AssignmentDetail,
  submission: SubmissionDetail | null,
): SubmissionState => {
  if (submission?.status === 'graded') return 'graded';

  if (submission?.status === 'resubmission_required') {
    // allowResubmission=true 일 때만 재제출 활성화
    if (assignment.allowResubmission) return 'active_resubmit';
    // allowResubmission=false 이면 비활성화
    return 'closed_deadline'; // 또는 별도 'resubmit_not_allowed' 상태 추가
  }

  if (assignment.status === 'closed') return 'closed_status';

  const isPastDeadline = new Date() >= new Date(assignment.dueDate);
  if (!isPastDeadline) return 'active';
  if (assignment.allowLate) return 'active_late';
  return 'closed_deadline';
};
```

---

### T18. 과제 상세 페이지 (App Router)

**상태: 정상**

파일 위치: `src/app/(protected)/courses/my/[courseId]/assignments/[assignmentId]/page.tsx`

- `'use client'` 지시어 포함
- `params: Promise<{ courseId: string; assignmentId: string }>` + `use(params)` 패턴 (CLAUDE.md Next.js 규정 준수)
- `(protected)` 라우트 그룹 하위 → 인증 가드 자동 적용 (E5 처리)
- `AssignmentDetailPage` 컴포넌트에 `courseId`, `assignmentId` 전달
- `mx-auto max-w-4xl px-6 py-12` 레이아웃 적용

---

### T19. DB 스키마

**상태: 정상**

`supabase/migrations/0002_create_lms_schema.sql` 에서 확인:

- `assignments` 테이블: `id`, `course_id`, `title`, `description`, `due_date`, `weight`, `allow_late`, `allow_resubmission`, `status(assignment_status enum)` 컬럼 정상
- `submissions` 테이블: `id`, `assignment_id`, `learner_id`, `content`, `link`, `is_late`, `status`, `score`, `feedback`, `submitted_at`, `graded_at` 컬럼 정상
- `enrollments` 테이블: `course_id`, `learner_id`, `status(enrollment_status enum)` 정상
- 인덱스: `idx_assignments_course_status`, `idx_submissions_assignment`, `idx_enrollments_learner` 등 적절히 설정됨
- RLS 비활성화 (CLAUDE.md Supabase 규정 준수)
- `updated_at` 트리거 정상 설정

---

### T20. 외부 패키지 및 설정

**상태: 정상**

- `package.json`: `react-markdown: ^10.1.0`, `@tailwindcss/typography: ^0.5.10` 모두 설치됨
- `globals.css`: `@plugin "@tailwindcss/typography"` 정상 등록 (Tailwind v4 방식)
- `postcss.config.mjs`: `@tailwindcss/postcss` 플러그인 등록됨

---

### T21. 공통 인증 유틸 (`auth.ts`)

**상태: 정상**

- `extractUserId(c)`: Authorization Bearer 토큰 또는 세션 기반 인증 처리
- `requireLearnerRole(supabase, userId)`: `profiles.role !== 'learner'` 시 403 반환

---

### T22. 공통 HTTP 응답 (`response.ts`)

**상태: 정상**

`success`, `failure`, `respond`, `HandlerResult` 타입 모두 구현됨. 모든 서비스/라우트가 이 패턴 준수.

---

### T23. Protected Layout

**상태: 정상**

- `useCurrentUser()` 기반 인증 상태 체크
- 미인증 시 `router.replace(buildRedirectUrl(pathname))` — 로그인 페이지로 리다이렉트 (E5 처리)
- `redirectedFrom` 쿼리 파라미터로 원래 경로 보존

---

## 4. 발견된 버그 및 스펙 불일치 목록

### BUG-001. SubmissionZone — `allowResubmission=false` AND `resubmission_required` 상태 처리 불완전

**파일:** `src/features/assignment-detail/components/submission-zone.tsx`

**심각도:** 경미 (서버 측 409 방어 존재)

**현상:** `allowResubmission=false`이고 제출물 상태가 `resubmission_required`인 경우, `resolveSubmissionState` 함수가 과제 마감 전이면 `active` 상태를 반환하여 제출 폼이 활성화됨.

**스펙 기대 동작:** spec QA Sheet #7 — "재제출 버튼 미표시" (재제출이 허용되지 않으므로 제출 폼 자체가 보이면 안 됨).

**수정 계획:**
```typescript
// submission-zone.tsx의 resolveSubmissionState 함수 수정
if (submission?.status === 'resubmission_required') {
  if (assignment.allowResubmission) return 'active_resubmit';
  // allowResubmission=false 이면 비활성 상태 유지
  return 'closed_deadline';
}
```

---

### BUG-002. SubmissionZone — 이미 `submitted` 상태인 제출물이 있을 때 제출 폼 재활성화

**파일:** `src/features/assignment-detail/components/submission-zone.tsx`

**심각도:** 낮음 (plan.md QA Sheet #2에서 의도적으로 허용)

**현상:** 이미 `submitted` 상태인 제출물이 있어도 마감 전이라면 `active` 상태로 제출 폼이 다시 표시됨.

**참고:** plan.md QA Sheet #2에서 "제출 입력 폼 활성 (재제출 아님, 제출은 UC-005에서 처리)"라고 명시되어 있어, 이는 UC-004 스펙 범위에서 의도적으로 허용된 동작임. 서버에서 409 `alreadySubmitted`로 방어되어 데이터 무결성에는 문제 없음. UC-005 구현 시 적절히 처리될 예정.

---

## 5. 구현되지 않은 기능

**없음.** plan.md에 명세된 14개 모듈 모두 구현 완료됨.

계획보다 추가로 구현된 항목:
- `useSubmitMutation.ts`: UC-005 제출 액션 훅 (plan.md 주석에서 UC-005에서 구현 예정이었으나 이미 구현됨)
- `useResubmitMutation.ts`: UC-005 재제출 훅 (동일)
- `createSubmission`, `updateSubmission` 서비스 함수 (UC-005 관련 서버 로직 선구현)
- POST/PUT 라우트 엔드포인트 (UC-005 관련)

---

## 6. 종합 평가

UC-004 (과제 상세 열람) 기능은 **전체적으로 프로덕션 수준으로 구현**되어 있다. spec.md의 Main Scenario(MS-1, MS-2, MS-3), Edge Case(E1~E9), Business Rule(BR1~BR7) 모두 백엔드 및 프론트엔드에서 적절히 처리되었다.

발견된 버그(BUG-001)는 `allowResubmission=false` + `resubmission_required` 조합의 UI 분기 오류이나, 서버 측 409 방어가 존재하여 데이터 무결성은 유지된다. 사용자 경험 관점에서의 수정이 필요하다.

CLAUDE.md 코드 컨벤션(`'use client'` 사용, Promise params, apiClient 사용, Hono `/api` prefix, AppLogger 패턴 등) 전반적으로 준수됨.

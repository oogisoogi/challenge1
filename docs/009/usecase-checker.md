# UC-009 구현 점검 보고서: 과제 관리 (Instructor)

작성일: 2026-02-20

---

## 1. 점검 개요

UC-009(Instructor 과제 CRUD + 제출물 목록 조회)의 구현 완성도를 spec.md 및 plan.md 기준으로 점검하였다.

---

## 2. TODO 리스트 및 점검 결과

### Phase 1: Backend Layer

| # | 모듈 | 파일 경로 | 상태 | 비고 |
|---|------|-----------|------|------|
| 1-1 | Backend Schema | `src/features/assignment-management/backend/schema.ts` | 완료 | plan 대비 확장됨 (채점/상태전환 스키마 추가) |
| 1-2 | Backend Error | `src/features/assignment-management/backend/error.ts` | 완료 | plan 대비 확장됨 (채점/상태전환 에러코드 추가) |
| 1-3 | Backend Service | `src/features/assignment-management/backend/service.ts` | 완료 | UC-011 관련 기능도 포함됨 |
| 1-4 | Backend Route | `src/features/assignment-management/backend/route.ts` | 완료 | plan 대비 엔드포인트 2개 추가됨 |

### Phase 2: Shared / Infrastructure

| # | 모듈 | 파일 경로 | 상태 | 비고 |
|---|------|-----------|------|------|
| 2-1 | DTO | `src/features/assignment-management/lib/dto.ts` | 완료 | plan 대비 확장 타입 추가 |
| 2-2 | Constants | `src/features/assignment-management/constants/index.ts` | 완료 | plan 대비 상태전환/배지 상수 추가 |
| 2-3 | Hono App 등록 | `src/backend/hono/app.ts` | 완료 | `registerAssignmentManagementRoutes` 등록 확인 |

### Phase 3: Frontend Hooks

| # | 모듈 | 파일 경로 | 상태 | 비고 |
|---|------|-----------|------|------|
| 3-1 | useInstructorCoursesQuery | `src/features/assignment-management/hooks/useInstructorCoursesQuery.ts` | 완료 | dashboard API 재활용, `staleTime: 30_000` |
| 3-2 | useAssignmentDetailQuery | `src/features/assignment-management/hooks/useAssignmentDetailQuery.ts` | 완료 | `staleTime: 0`, `enabled: Boolean(assignmentId)` |
| 3-3 | useCreateAssignmentMutation | `src/features/assignment-management/hooks/useCreateAssignmentMutation.ts` | 완료 | 성공 시 submissions 페이지로 라우팅 |
| 3-4 | useUpdateAssignmentMutation | `src/features/assignment-management/hooks/useUpdateAssignmentMutation.ts` | 완료 | 성공 시 detail 쿼리 무효화 |
| 3-5 | useAssignmentSubmissionsQuery | `src/features/assignment-management/hooks/useAssignmentSubmissionsQuery.ts` | 완료 | `staleTime: 0`, `enabled: Boolean(assignmentId)` |

### Phase 4: Frontend Components

| # | 모듈 | 파일 경로 | 상태 | 비고 |
|---|------|-----------|------|------|
| 4-1 | AssignmentFormPage | `src/features/assignment-management/components/assignment-form-page.tsx` | 완료 | react-hook-form + zod resolver |
| 4-2 | SubmissionFilterTabs | `src/features/assignment-management/components/submission-filter-tabs.tsx` | 완료 | 카운트 배지 포함 |
| 4-3 | SubmissionListPage | `src/features/assignment-management/components/submission-list-page.tsx` | 완료 | FE 로컬 필터링, 채점 패널 포함 |

### Phase 5: Pages

| # | 모듈 | 파일 경로 | 상태 | 비고 |
|---|------|-----------|------|------|
| 5-1 | NewAssignmentPage | `src/app/(protected)/instructor/assignments/new/page.tsx` | 완료 | `use client`, Promise params |
| 5-2 | SubmissionsPage | `src/app/(protected)/instructor/assignments/[assignmentId]/submissions/page.tsx` | 완료 | `use client`, `use(params)` 패턴 |

---

## 3. 상세 점검 결과

### 3-1. Backend Schema (`schema.ts`)

**구현 상태: 정상**

plan.md에서 요구한 스키마를 모두 충족하며, UC-010/UC-011을 위한 추가 스키마도 사전 구현되어 있다.

- `createAssignmentBodySchema`: courseId(uuid), title(min 1), dueDate(min 1), weight(int, 0~100), allowLate, allowResubmission 모두 올바르게 정의됨
- `updateAssignmentBodySchema`: courseId 필드 없음으로 BR7 스키마 레벨 차단 확인
- `assignmentIdParamSchema`: uuid 검증 포함
- `submissionFilterQuerySchema`: 4가지 enum 값 + default 'all'
- `assignmentManagementResponseSchema`: 응답 스키마 완비
- `submissionDetailItemSchema`: plan의 `submissionItemSchema`를 확장하여 content, link, feedback 포함 (채점 패널을 위한 정당한 확장)
- `assignmentSubmissionsResponseSchema`: `submissionDetailItemSchema` 배열 사용 (plan은 `submissionItemSchema`였으나 채점 기능을 위한 합리적 확장)

**추가 구현:** `gradeSubmissionBodySchema`, `gradeSubmissionResponseSchema`, `submissionIdParamSchema`, `updateAssignmentStatusBodySchema` (UC-010, UC-011 범위)

---

### 3-2. Backend Error (`error.ts`)

**구현 상태: 정상**

plan.md에서 요구한 10개 에러 코드를 모두 포함하며, 추가 에러코드도 구현되어 있다.

- 필수 에러 코드: unauthorized, forbiddenRole, forbidden, notFound, validationError, pastDueDate, courseIdImmutable, createFailed, updateFailed, fetchError 모두 존재
- 추가 에러 코드: gradeFailed, submissionNotFound, invalidStatusTransition, courseNotPublished, missingTitle, pastDueDateOnPublish (UC-010, UC-011 범위)

---

### 3-3. Backend Service (`service.ts`)

**구현 상태: 정상 (주의사항 1건)**

**`createAssignment` 검증:**
- 코스 소유자 검증: `courses.instructor_id !== userId` 시 403 반환 (E4)
- 활성 코스 검증: `status NOT IN ('draft', 'published')` 시 400 반환
- 마감일 과거 검증: `isPastDate` 함수로 400 반환 (E3)
- `status: 'draft'` INSERT: BR1 충족
- 코스 title JOIN: 응답에 courseTitle 포함

**`getAssignment` 검증:**
- 404 처리: `maybeSingle()` 패턴 (E6)
- 소유자 검증: 403 반환 (E5)

**`updateAssignment` 검증:**
- 404 처리 (E6)
- 소유자 검증: 403 반환 (E5)
- courseId 변경 불가: `'courseId' in body` 런타임 방어 (E7, BR7)
- 과거 dueDate 검증 (E3)
- 전달된 필드만 UPDATE

**`getAssignmentSubmissions` 검증:**
- 소유자 검증 (E5)
- 필터링: submitted/late/resubmission_required 서버 사이드 필터 (MS-3)
- 빈 배열 반환 정상 (E11)
- auto-close 로직: `allow_late=false`이고 `due_date <= now()`인 published 과제를 closed로 자동 전환 (BR8 관련)

**주의사항:**

`isPastDate` 함수가 `date <= new Date()`를 사용하여 현재 시각과 동일한 경우도 과거로 판정한다. 엄밀히 경계값 처리에서 밀리초 단위 차이로 인해 실시간으로 입력된 마감일이 거부될 수 있으나, 실무에서는 사용자가 현재 시각을 정확히 입력하는 경우가 드물어 실질적 영향은 미미하다.

---

### 3-4. Backend Route (`route.ts`)

**구현 상태: 정상**

plan.md에서 요구한 4개 엔드포인트를 모두 구현하며, 추가 엔드포인트 2개도 포함한다.

| 엔드포인트 | 구현 여부 | 비고 |
|-----------|----------|------|
| POST `/api/instructor/assignments` | 완료 | extractUserId + requireInstructorRole + schema 검증 |
| GET `/api/instructor/assignments/:assignmentId` | 완료 | param schema 검증 |
| PATCH `/api/instructor/assignments/:assignmentId` | 완료 | param + body schema 검증 |
| GET `/api/instructor/assignments/:assignmentId/submissions` | 완료 | filter query schema 검증 |
| PATCH `/api/instructor/assignments/:assignmentId/status` | 완료 (추가) | UC-011 범위 |
| PATCH `/api/instructor/submissions/:submissionId/grade` | 완료 (추가) | UC-010 범위 |

모든 엔드포인트에서 `extractUserId` → `requireInstructorRole` → service 호출 → `respond` 패턴이 일관되게 적용되어 있다.

---

### 3-5. DTO (`lib/dto.ts`)

**구현 상태: 정상**

plan.md에서 요구한 모든 타입을 re-export하며, 추가 타입도 포함한다. `backend/schema`를 직접 재노출하는 패턴을 올바르게 따른다.

---

### 3-6. Constants (`constants/index.ts`)

**구현 상태: 정상**

plan.md에서 요구한 `ASSIGNMENT_MANAGEMENT_QUERY_KEYS`와 `SUBMISSION_FILTER_LABELS`를 모두 포함한다.
추가로 `GRADING_ACTION_LABELS`, `ALLOWED_ASSIGNMENT_STATUS_TRANSITIONS`, `ASSIGNMENT_STATUS_TRANSITION_CONFIG`, `ASSIGNMENT_STATUS_LABELS`, `ASSIGNMENT_STATUS_VARIANTS` 상수가 구현되어 있어 UC-010, UC-011 지원이 준비되어 있다.

---

### 3-7. Hooks

**구현 상태: 정상**

**`useInstructorCoursesQuery`:**
- `GET /api/instructor/dashboard`를 통해 코스 목록 조회 후 `draft`, `published` 상태만 필터링 (MS-1 step 2 충족)
- `instructorDashboardResponseSchema`로 응답 검증
- `INSTRUCTOR_DASHBOARD_QUERY_KEYS.dashboard`로 기존 대시보드 캐시 공유
- `staleTime: 30_000` 설정

**`useAssignmentDetailQuery`:** plan 요구사항 완전 충족

**`useCreateAssignmentMutation`:**
- 성공 시 `router.push('/instructor/assignments/${assignment.id}/submissions')` 이동 (MS-1 step 10)
- 에러 시 toast 표시

**`useUpdateAssignmentMutation`:**
- 성공 시 `queryClient.invalidateQueries(detail(assignmentId))` 캐시 무효화 (MS-2 step 10)
- 에러 시 toast 표시

**`useAssignmentSubmissionsQuery`:** plan 요구사항 완전 충족

---

### 3-8. AssignmentFormPage (`assignment-form-page.tsx`)

**구현 상태: 부분 미흡 (주의사항 1건)**

**충족 항목:**
- `react-hook-form` + `zodResolver(createAssignmentBodySchema)` 사용
- create/edit 모드 분기 처리
- edit 모드에서 courseId select disabled (BR7)
- `useAssignmentDetailQuery`로 기존 데이터 바인딩 (`form.reset`)
- `formatDatetimeLocal` 유틸로 datetime-local 입력 형식 변환
- weight number input에 `onChange`로 `Number()` 변환
- 저장 중 버튼 disabled + Loader2 스피너
- 에러 시 toast (mutation onError 핸들러)
- 모든 필드 구현 (courseId, title, description, dueDate, weight, allowLate, allowResubmission)
- BR3 안내 문구 표시 ("동일 코스 내 과제들의 비중 합계가 100이 되도록 설정하세요.")

**미흡 항목:**

spec E3에서 요구하는 **클라이언트 사이드 마감일 과거 날짜 경고**가 누락되어 있다. 현재는 BE에서만 400 에러를 반환하며, FE에서는 별도 경고를 표시하지 않는다. 사용자 경험 측면에서 API 호출 이전에 FE에서 먼저 경고를 표시하는 것이 권장된다.

```typescript
// schema.ts 또는 form의 validate에서 미래 날짜 검증 추가 예시
dueDate: z.string()
  .min(1, '마감일을 입력해주세요.')
  .refine(
    (val) => new Date(val) > new Date(),
    '마감일은 미래 날짜여야 합니다.',
  ),
```

---

### 3-9. SubmissionFilterTabs (`submission-filter-tabs.tsx`)

**구현 상태: 정상**

- `SUBMISSION_FILTER_LABELS`에서 탭 목록 동적 생성
- 각 탭에 카운트 Badge 표시
- 현재 활성 탭 강조 (`variant: 'default'` vs `'outline'`)
- `onFilterChange` 콜백 정상 호출

---

### 3-10. SubmissionListPage (`submission-list-page.tsx`)

**구현 상태: 정상**

- `useAssignmentSubmissionsQuery(assignmentId, 'all')`로 전체 데이터 한 번 로드
- FE 로컬 필터링 (`filterSubmissions` 순수 함수)
- `computeCounts` 함수로 각 필터별 카운트 계산
- 과제 제목, 상태 Badge, 코스명, 마감일 표시
- `AssignmentStatusButton`으로 상태 전환 UI 제공
- Collapsible 방식(ChevronUp/Down 토글)으로 과제 수정 폼 내장
- `SubmissionGradingPanel`로 클릭 시 채점 패널 표시
- 빈 상태 메시지: `filter === 'all'` 시 "아직 제출된 과제가 없습니다." / 그 외 "해당 조건의 제출물이 없습니다." (E11 충족)
- 지각 Badge (destructive variant)
- 점수 미채점 시 "미채점" 표시
- 에러 시 에러 메시지 렌더링

---

### 3-11. Pages

**구현 상태: 정상**

**`new/page.tsx`:**
- `'use client'` 지시어 포함
- `params: Promise<Record<string, never>>` Promise 타입 사용 (CLAUDE.md 규칙 충족)
- `<AssignmentFormPage mode="create" />` 렌더링

**`[assignmentId]/submissions/page.tsx`:**
- `'use client'` 지시어 포함
- `params: Promise<{ assignmentId: string }>` Promise 타입 사용
- `use(params)` 패턴으로 assignmentId 추출
- `<SubmissionListPage assignmentId={assignmentId} />` 렌더링

---

### 3-12. Hono App 등록

**구현 상태: 정상**

`src/backend/hono/app.ts`에서 `registerAssignmentManagementRoutes(app)` 가 `registerCourseManagementRoutes` 이후에 올바르게 등록되어 있음을 확인.

---

### 3-13. DB 스키마

**구현 상태: 정상**

`supabase/migrations/0002_create_lms_schema.sql`에서 다음을 확인:
- `assignments` 테이블: id(uuid), course_id(FK), title, description, due_date, weight, allow_late, allow_resubmission, status(assignment_status enum), created_at, updated_at
- `submissions` 테이블: id(uuid), assignment_id(FK), learner_id(FK), content, link, is_late, status(submission_status enum), score(0~100 CHECK), feedback, submitted_at, graded_at, created_at, updated_at
- 인덱스: `idx_assignments_course_status`, `idx_assignments_due_date`, `idx_submissions_assignment`, `idx_submissions_learner`
- updated_at 트리거: 모두 정상 설정
- RLS: 모두 DISABLE (가이드라인 준수)
- UNIQUE (assignment_id, learner_id): 과제당 1제출 제약

---

## 4. 인프라 이슈 (UC-009 전용 아님)

### 4-1. Toaster 컴포넌트 미마운트 (버그)

**심각도: 높음**

`src/components/ui/toaster.tsx`에 `Toaster` 컴포넌트가 정의되어 있으나, `src/app/layout.tsx` 및 `src/app/providers.tsx` 어디에도 `<Toaster />` 가 마운트되어 있지 않다. 이로 인해 `useCreateAssignmentMutation`, `useUpdateAssignmentMutation`, `useGradeSubmissionMutation`, `useUpdateAssignmentStatusMutation` 등 모든 성공/실패 toast 알림이 화면에 표시되지 않는다.

**구현 방법:**

```tsx
// src/app/layout.tsx 또는 src/app/providers.tsx에 추가
import { Toaster } from '@/components/ui/toaster';

// ... 기존 JSX 내부에서
<QueryClientProvider client={queryClient}>
  {children}
  <Toaster />
</QueryClientProvider>
```

---

## 5. 미구현/미흡 항목 요약

| # | 항목 | 심각도 | 관련 spec |
|---|------|--------|-----------|
| I-1 | FE 클라이언트 사이드 마감일 과거 날짜 경고 누락 | 낮음 | spec E3 |
| I-2 | `<Toaster />` 레이아웃 미마운트로 toast 알림 미표시 | 높음 | spec E10 (에러 토스트 요구사항) |

---

## 6. 구현 계획 (미구현 항목)

### I-1. FE 마감일 과거 날짜 클라이언트 검증

**방법:** `createAssignmentBodySchema`에 `.refine()` 추가

```typescript
// src/features/assignment-management/backend/schema.ts
export const createAssignmentBodySchema = z.object({
  // ...기존 필드...
  dueDate: z.string()
    .min(1, '마감일을 입력해주세요.')
    .refine(
      (val) => new Date(val) > new Date(),
      '마감일은 미래 날짜여야 합니다.',
    ),
  // ...
});
```

단, 이 변경은 BE와 FE가 동일 스키마를 공유(`dto.ts` 재노출)하므로 BE에서도 동일하게 적용된다. BE에서는 별도의 `isPastDate` 서비스 로직을 제거하거나 공존시킬 수 있다.

### I-2. Toaster 레이아웃 마운트

**방법:** `src/app/providers.tsx` 또는 `src/app/layout.tsx`에 `<Toaster />` 추가

```tsx
// src/app/providers.tsx
import { Toaster } from '@/components/ui/toaster';

export default function Providers({ children }) {
  // ...
  return (
    <ThemeProvider ...>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

---

## 7. 최종 평가

### spec 요구사항 충족률

| 시나리오 | 상태 |
|---------|------|
| MS-1 과제 생성 | 완료 |
| MS-2 과제 수정 | 완료 |
| MS-3 제출물 목록 조회 및 필터링 | 완료 |

| Edge Case | 상태 |
|----------|------|
| E1 코스 미선택/제목 미입력 | 완료 (FE + BE) |
| E2 비중 범위 밖 | 완료 (FE + BE) |
| E3 마감일 과거 날짜 | 부분 완료 (BE만, FE 경고 누락) |
| E4 타 Instructor 코스에 과제 생성 | 완료 |
| E5 타 Instructor 과제 수정 | 완료 |
| E6 존재하지 않는 assignmentId | 완료 |
| E7 제출물 있는 과제의 코스 변경 | 완료 (스키마 + 서비스 레벨 차단) |
| E8 Learner 역할 과제 관리 | 완료 |
| E9 미인증 사용자 접근 | 완료 (protected layout + BE 401) |
| E10 네트워크 오류 에러 토스트 | 부분 완료 (toast 호출 코드는 있으나 Toaster 미마운트) |
| E11 필터링 결과 0건 빈 상태 | 완료 |

| Business Rule | 상태 |
|--------------|------|
| BR1 초기 상태 draft | 완료 |
| BR2 본인 소유 코스만 생성/수정 | 완료 |
| BR3 weight 0~100 + 합계 참고 표시 | 완료 |
| BR4 allow_late + is_late 기록 | 완료 (DB 스키마 포함) |
| BR5 allow_resubmission 정책 | 완료 |
| BR6 과제 삭제 없음 | 완료 (DELETE 엔드포인트 없음) |
| BR7 course_id 불변 | 완료 (스키마 + 서비스 레벨) |
| BR8 상태 전환은 UC-011 범위 | 완료 (구현 포함, 참고) |

### 종합

UC-009의 핵심 기능인 과제 생성/수정/제출물 목록 조회 및 필터링은 **프로덕션 레벨로 구현 완료**되었다. plan.md에서 설계한 모든 모듈이 존재하며, 인증/권한/소유자 검증 로직도 일관되게 적용되어 있다.

단, 다음 2가지 이슈가 존재한다:
1. FE 마감일 과거 날짜 클라이언트 검증 경고 미구현 (심각도: 낮음 — BE에서 방어됨)
2. `<Toaster />` 레이아웃 미마운트로 인한 toast 미표시 (심각도: 높음 — 프로젝트 전체 인프라 이슈)

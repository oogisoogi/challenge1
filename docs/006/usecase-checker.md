# UC-006 성적 & 피드백 열람 (Learner) — 구현 점검 보고서

작성일: 2026-02-20

---

## 1. 점검 범위 (Todo List)

spec/plan 문서를 기반으로 도출한 점검 항목은 다음과 같다.

| # | 항목 | 파일 경로 | 결과 |
|---|------|-----------|------|
| 1 | Backend Schema (zod) | `src/features/grades/backend/schema.ts` | 완료 |
| 2 | Backend Error 코드 | `src/features/grades/backend/error.ts` | 완료 |
| 3 | Backend Service (getCourseGrades, getAssignmentFeedback) | `src/features/grades/backend/service.ts` | 완료 |
| 4 | Backend Route (2개 엔드포인트) | `src/features/grades/backend/route.ts` | 완료 |
| 5 | DTO 재노출 | `src/features/grades/lib/dto.ts` | 완료 |
| 6 | Query Keys 상수 | `src/features/grades/constants/index.ts` | 완료 |
| 7 | useCourseGradesQuery 훅 | `src/features/grades/hooks/useCourseGradesQuery.ts` | 완료 |
| 8 | useAssignmentFeedbackQuery 훅 | `src/features/grades/hooks/useAssignmentFeedbackQuery.ts` | 완료 |
| 9 | GradesPage 컴포넌트 | `src/features/grades/components/grades-page.tsx` | 완료 |
| 10 | GradesSummaryCard 컴포넌트 | `src/features/grades/components/grades-summary-card.tsx` | 완료 |
| 11 | GradesTable 컴포넌트 | `src/features/grades/components/grades-table.tsx` | 완료 |
| 12 | FeedbackPage 컴포넌트 | `src/features/grades/components/feedback-page.tsx` | 완료 |
| 13 | FeedbackDetail 컴포넌트 | `src/features/grades/components/feedback-detail.tsx` | 완료 |
| 14 | 성적 페이지 라우트 | `src/app/(protected)/courses/my/[courseId]/grades/page.tsx` | 완료 |
| 15 | 피드백 페이지 라우트 | `src/app/(protected)/courses/my/[courseId]/assignments/[assignmentId]/feedback/page.tsx` | 완료 |
| 16 | Hono app.ts grades 라우트 등록 | `src/backend/hono/app.ts` | 완료 |

---

## 2. 모듈별 상세 점검 결과

### Phase 1 — Backend Layer

#### 1-1. `src/features/grades/backend/schema.ts`

**판정: 정상**

- `gradesParamSchema`: `courseId`를 UUID 검증 포함, 명세 충족
- `feedbackParamSchema`: `courseId`, `assignmentId` 모두 UUID 검증 포함, 명세 충족
- `assignmentGradeSchema`: `not_submitted` 가상 상태 포함 4종 enum, `score/isLate` nullable, `feedbackSummary` nullable — 모두 명세 충족
- `courseGradesResponseSchema`: `totalScore` nullable — 채점완료 과제 없을 때 null 처리 가능
- `feedbackAssignmentSchema`: `allowResubmission` boolean 포함
- `feedbackSubmissionSchema`: `score`, `feedback`, `gradedAt` nullable, `status` 3종 enum — 명세 충족
- `assignmentFeedbackResponseSchema`: assignment + submission 결합 응답 — 명세 충족

> 특이 사항: plan 문서의 `assignmentGradeSchema`에 `assignmentId` 필드가 중복 선언된 오탈자가 있었으나, 실제 구현 코드에서는 중복 없이 정상 작성됨.

---

#### 1-2. `src/features/grades/backend/error.ts`

**판정: 정상**

- `GRADES_UNAUTHORIZED`, `GRADES_FORBIDDEN_ROLE`, `GRADES_NOT_ENROLLED`, `GRADES_NOT_FOUND`, `GRADES_FORBIDDEN`, `GRADES_FETCH_ERROR`, `GRADES_VALIDATION_ERROR` — 7종 에러 코드 모두 `as const` 정의
- `GradesServiceError` 유니온 타입 export 완료

---

#### 1-3. `src/features/grades/backend/service.ts`

**판정: 정상**

`getCourseGrades` 비즈니스 로직:

- Step 1 (수강 등록 검증, BR8, E4): `enrollments` 테이블에서 `course_id + learner_id + status='active'` 검증. 결과 없으면 403 `GRADES_NOT_ENROLLED` 반환
- Step 2 (코스 제목 조회): `courses` 테이블에서 `title` SELECT
- Step 3 (과제 목록, BR5): `assignments` 테이블에서 `status IN ('published', 'closed')` 필터, draft 제외, `created_at ASC` 정렬
- Step 4 (제출물 조회, BR1, BR6): `learner_id = userId`로 본인 제출물만 조회, `Map<assignmentId, submission>` 변환
- Step 5 (응답 조합 + 가중 평균):
  - 미제출: `status='not_submitted'`, `score=null`, `isLate=null`
  - submitted/graded/resubmission_required: 상태 그대로 매핑
  - 피드백 요약: `feedback.slice(0, 100)` — 100자 truncate 적용
  - 가중 평균: `graded` 과제만 필터 후 `SUM(score * weight) / SUM(weight)` — BR2, BR3, BR4 준수
  - `totalWeight === 0` 시 `null` 반환 — E10 처리

`getAssignmentFeedback` 비즈니스 로직:

- Step 1 (수강 등록 검증): getCourseGrades와 동일 패턴
- Step 2 (과제 조회): `id + course_id`로 과제 검증, 없으면 404 `GRADES_NOT_FOUND`
- Step 3 (제출물 + 본인 검증): `assignment_id + learner_id`로 조회, 없으면 404. `learner_id !== userId` 시 403 `GRADES_FORBIDDEN` 방어 로직 포함 (BR6, E9)
- Step 4 (응답 조합): snake_case → camelCase 매핑 정상

---

#### 1-4. `src/features/grades/backend/route.ts`

**판정: 정상**

- `GET /api/courses/:courseId/grades`:
  1. `extractUserId` → 미인증 시 401 `GRADES_UNAUTHORIZED`
  2. `requireLearnerRole` → 비학습자 시 403 `GRADES_FORBIDDEN_ROLE`
  3. `gradesParamSchema.safeParse` → 실패 시 400 `GRADES_VALIDATION_ERROR`
  4. `getCourseGrades` 호출 → `respond` 반환

- `GET /api/courses/:courseId/assignments/:assignmentId/submissions/feedback`:
  - 동일한 인증/역할/파라미터 검증 흐름
  - `feedbackParamSchema`로 `courseId + assignmentId` 파싱
  - `getAssignmentFeedback` 호출 → `respond` 반환

- 경로 충돌 없음: 기존 `registerAssignmentDetailRoutes`의 `/api/courses/:courseId/assignments/:assignmentId`와 피드백 엔드포인트 `/api/courses/:courseId/assignments/:assignmentId/submissions/feedback`는 경로가 구별됨

---

### Phase 2 — Shared / Infrastructure

#### 2-1. `src/features/grades/lib/dto.ts`

**판정: 정상**

plan 문서에 명시된 5종 스키마 + 5종 타입 모두 재노출 완료.

---

#### 2-2. `src/features/grades/constants/index.ts`

**판정: 정상**

- `GRADES_QUERY_KEYS.all`, `courseGrades(courseId)`, `feedback(courseId, assignmentId)` 모두 구현

---

#### 2-3. `src/backend/hono/app.ts` (grades 라우트 등록)

**판정: 정상**

```typescript
import { registerGradesRoutes } from "@/features/grades/backend/route";
// ...
registerGradesRoutes(app);
```

`registerAssignmentDetailRoutes` 다음에 정상 등록됨.

---

### Phase 3 — Frontend Hooks

#### 3-1. `src/features/grades/hooks/useCourseGradesQuery.ts`

**판정: 정상**

- `apiClient.get('/api/courses/${courseId}/grades')` 호출
- `courseGradesResponseSchema.parse(data)` 응답 검증
- `queryKey: GRADES_QUERY_KEYS.courseGrades(courseId)`
- `staleTime: 30 * 1000`
- `enabled: Boolean(courseId)`

---

#### 3-2. `src/features/grades/hooks/useAssignmentFeedbackQuery.ts`

**판정: 정상**

- `apiClient.get('/api/courses/${courseId}/assignments/${assignmentId}/submissions/feedback')` 호출
- `assignmentFeedbackResponseSchema.parse(data)` 응답 검증
- `queryKey: GRADES_QUERY_KEYS.feedback(courseId, assignmentId)`
- `staleTime: 30 * 1000`
- `enabled: Boolean(courseId) && Boolean(assignmentId)`

---

### Phase 4 — Frontend Components

#### 4-1. `src/features/grades/components/grades-page.tsx`

**판정: 정상 (경미한 코드 품질 이슈 존재)**

- `'use client'` 지시어 있음
- `useCourseGradesQuery` 호출, `GradesSummaryCard` + `GradesTable` 조합
- 로딩 시 `PageSkeleton` (헤더 + 카드 + 테이블 행 5개) 표시
- 에러 시 메시지 + "다시 시도" 버튼 (`refetch`) 표시
- 뒤로 가기: `/courses/my` 링크

**경미한 이슈:**
- `getErrorMessage` 함수 내 `isAxiosError(error)` 분기가 실질적으로 도달하지 않음. 훅에서 axios 에러를 `new Error(message)`로 래핑하기 때문에 컴포넌트에서는 항상 `error instanceof Error` 분기를 탄다. 단, `extractApiErrorMessage`가 이미 백엔드 에러 메시지를 추출하여 `error.message`에 담으므로 기능적으로는 정상 동작한다.
- 이 패턴은 기존 `assignment-detail` 피처와 동일하게 프로젝트 전체에 공통으로 사용되는 패턴이므로 UC-006 특유의 버그가 아님.

---

#### 4-2. `src/features/grades/components/grades-summary-card.tsx`

**판정: 정상**

- `totalScore !== null` 시: `{totalScore.toFixed(1)}점` 표시 (소수점 1자리 포맷)
- `totalScore === null` 시: "N/A" + "채점 완료된 과제가 없습니다" 안내 표시
- shadcn `Card` 사용

---

#### 4-3. `src/features/grades/components/grades-table.tsx`

**판정: 정상**

- `'use client'` 지시어 있음
- 컬럼 6개 (과제명, 비중, 점수, 지각, 상태, 피드백) 구현
- `getScoreDisplay`: `not_submitted` → "미제출", `submitted` → "채점 대기", `score !== null` → "점수/100"
- `hasFeedbackLink`: `graded` 또는 `resubmission_required` 시 피드백 페이지 링크 활성화
- `STATUS_CONFIG`: 4종 상태 배지 스타일 정의 — `resubmission_required`는 `bg-orange-100 text-orange-800 border-orange-200`
- `isLate === true`: "지각" destructive Badge (BR7)
- `assignments.length === 0`: "등록된 과제가 없습니다" `colSpan=6` 빈 상태 (E1)
- `feedbackSummary ?? '-'`: null 시 "-" 표시

---

#### 4-4. `src/features/grades/components/feedback-page.tsx`

**판정: 정상**

- `'use client'` 지시어 있음
- `useAssignmentFeedbackQuery` 호출
- 로딩 시 스켈레톤, 에러 시 메시지 + "다시 시도" 버튼
- 뒤로 가기: `/courses/my/${courseId}/grades` 링크
- 404 `GRADES_NOT_FOUND`: "제출물이 없습니다." 표시
- 403 `GRADES_NOT_ENROLLED`: "수강 중인 코스가 아닙니다." 표시

---

#### 4-5. `src/features/grades/components/feedback-detail.tsx`

**판정: 정상**

- `'use client'` 지시어 있음
- 제출 정보 섹션: `SubmissionStatusBadge` + `isLate` 지각 Badge + 제출 일시 (`yyyy.MM.dd HH:mm` 포맷, `date-fns` 사용)
- 내 제출 내용 섹션: `content` 표시 + `link !== null` 시 앵커 태그 표시
- Instructor 피드백 섹션:
  - `feedback !== null` 시: `bg-blue-50 border border-blue-200` 강조 카드
  - `score !== null` 시: `{score}/100점` `text-2xl font-bold text-blue-700` 강조
  - 피드백 내용, `gradedAt` 포맷 표시
  - `feedback === null` 시: "아직 피드백이 없습니다" 안내 (E7)
- 재제출 버튼: `status === 'resubmission_required' && allowResubmission === true` 조건 — `/courses/my/${courseId}/assignments/${assignmentId}` 링크

---

### Phase 5 — Pages

#### 5-1. `src/app/(protected)/courses/my/[courseId]/grades/page.tsx`

**판정: 정상**

- `'use client'` 지시어 있음
- `params: Promise<{ courseId: string }>` + `use(params)` 패턴 사용 (Next.js 15 규격 준수)
- `(protected)` 레이아웃 하위 — 인증 가드 자동 적용
- `GradesPage` 컴포넌트에 `courseId` 전달

---

#### 5-2. `src/app/(protected)/courses/my/[courseId]/assignments/[assignmentId]/feedback/page.tsx`

**판정: 정상**

- `'use client'` 지시어 있음
- `params: Promise<{ courseId: string; assignmentId: string }>` + `use(params)` 패턴 사용
- `(protected)` 레이아웃 하위 — 인증 가드 자동 적용
- `FeedbackPage` 컴포넌트에 `courseId`, `assignmentId` 전달

---

### DB 스키마 검증

**판정: 정상**

`supabase/migrations/0002_create_lms_schema.sql`에 필요한 모든 테이블이 존재함.

| 테이블 | 주요 컬럼 | 상태 |
|--------|-----------|------|
| `enrollments` | `course_id`, `learner_id`, `status` (active/cancelled) | 존재 |
| `assignments` | `id`, `course_id`, `title`, `weight`, `allow_resubmission`, `status` (draft/published/closed) | 존재 |
| `submissions` | `id`, `assignment_id`, `learner_id`, `content`, `link`, `is_late`, `status`, `score`, `feedback`, `submitted_at`, `graded_at` | 존재 |
| `courses` | `id`, `title` | 존재 |

---

## 3. Edge Case 처리 검증

| EC | 상황 | 처리 방식 | 구현 여부 |
|----|------|-----------|-----------|
| E1 | 과제 없음 | `assignments: []`, `totalScore: null` 반환 → FE "등록된 과제가 없습니다" + N/A | 정상 |
| E2 | 모든 과제 미제출 | 각 `status='not_submitted'`, `totalScore=null` | 정상 |
| E3 | 모든 과제 채점 대기 | 각 `status='submitted'`, `totalScore=null` (graded 없음) | 정상 |
| E4 | 미수강 코스 접근 | 403 `GRADES_NOT_ENROLLED` → FE "수강 중인 코스가 아닙니다." | 정상 |
| E5 | 미인증 접근 | protected layout에서 로그인 리다이렉트 + API 401 `GRADES_UNAUTHORIZED` | 정상 |
| E6 | Instructor 역할 접근 | 403 `GRADES_FORBIDDEN_ROLE` → FE "접근 권한이 없습니다." | 정상 |
| E7 | 피드백 없는 제출물 피드백 접근 | `feedback=null` 반환 → FE "아직 피드백이 없습니다" | 정상 |
| E8 | 네트워크 오류 | FE 에러 메시지 + "다시 시도" 버튼 (`refetch`) | 정상 |
| E9 | 타인 제출물 접근 | 403 `GRADES_FORBIDDEN` — learner_id 검증 후 반환 | 정상 |
| E10 | weight 모두 0인 graded 과제 | `totalWeight === 0` → `totalScore = null` | 정상 |

---

## 4. Business Rule 검증

| BR | 규칙 | 구현 여부 |
|----|------|-----------|
| BR1 | 본인 제출물만 조회 | `getCourseGrades`에서 `learner_id = userId` 필터, `getAssignmentFeedback`에서 `learner_id` 검증 | 정상 |
| BR2 | 가중 평균 = SUM(score * weight) / SUM(weight) | service.ts Step 5에서 정확히 구현 | 정상 |
| BR3 | 미제출/채점대기 총점 제외 | `gradedAssignments.filter(g => g.status === 'graded')` | 정상 |
| BR4 | 재제출요청 총점 제외 | graded 필터에 포함되지 않음 | 정상 |
| BR5 | published/closed 과제만 성적 표시 | `.in('status', ['published', 'closed'])` | 정상 |
| BR6 | 피드백 열람 시 본인 제출물 검증 | `submission.learner_id !== userId` 방어 로직 | 정상 |
| BR7 | 지각 제출 별도 표시 | GradesTable/FeedbackDetail에서 destructive Badge | 정상 |
| BR8 | 성적 페이지 수강 등록 검증 | 양 서비스 함수 Step 1에서 enrollments 검증 | 정상 |

---

## 5. 발견된 이슈

### 이슈 1: `getErrorMessage`의 `isAxiosError` 분기가 dead code

**심각도: 낮음 (코드 품질)**

**대상 파일:**
- `src/features/grades/components/grades-page.tsx` (32~43번째 줄)
- `src/features/grades/components/feedback-page.tsx` (28~41번째 줄)

**원인:**
훅(`useCourseGradesQuery`, `useAssignmentFeedbackQuery`)에서 axios 에러를 `new Error(message)`로 래핑하여 throw하기 때문에, 컴포넌트의 `getErrorMessage` 함수에서 `isAxiosError(error)`는 항상 `false`를 반환한다.

```typescript
// hook (useCourseGradesQuery.ts)
} catch (error) {
  const message = extractApiErrorMessage(error, '성적 정보를 불러오는데 실패했습니다.');
  throw new Error(message); // axios 에러를 일반 Error로 래핑
}

// component (grades-page.tsx)
const getErrorMessage = (error: unknown): string => {
  if (isAxiosError(error)) { // 항상 false — dead code
    // ...
  }
  if (error instanceof Error) {
    return error.message; // 실제로 이 분기에서 처리됨
  }
};
```

**영향:**
기능적으로는 정상 동작한다. `extractApiErrorMessage`가 이미 백엔드 에러 메시지(`"수강 중인 코스가 아닙니다."` 등)를 추출하여 `new Error(message)`에 담으므로, 컴포넌트에서 `error instanceof Error` 분기를 통해 올바른 메시지가 표시된다.

**개선 방안:**
훅에서 axios 에러를 래핑하지 않고 그대로 re-throw하거나, 컴포넌트에서 `isAxiosError` 분기를 제거하고 `error instanceof Error` 분기만 사용한다. 이 패턴은 프로젝트 전체 공통이므로 UC-006 단독으로 수정하는 것보다 프로젝트 전체 차원에서 일관성 있게 결정해야 한다.

---

## 6. 최종 판정

**전체 구현 상태: 프로덕션 레벨 구현 완료**

plan 문서에 정의된 16개 모듈 모두 구현되었으며, spec 문서에 정의된 메인 시나리오(MS-1, MS-2, MS-3), 모든 Edge Case(E1~E10), 모든 Business Rule(BR1~BR8)이 코드베이스에서 정상적으로 구현되어 있다.

발견된 이슈 1건(`isAxiosError` dead code)은 기능 동작에 영향을 주지 않는 코드 품질 이슈이며, 프로젝트 전체 공통 패턴과 동일하게 구현되어 있어 UC-006 특유의 버그가 아니다.

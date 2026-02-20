# UC-003 Learner 대시보드 — 구현 점검 보고서

점검일: 2026-02-20

---

## 1. 개요

UC-003은 Learner 역할의 사용자가 `/courses/my` 경로에서 수강 중인 코스 목록(진행률 포함), 마감 임박 과제, 최근 피드백을 확인할 수 있는 대시보드 기능이다. spec/plan 문서 기준으로 13개 모듈의 구현 완료 여부를 점검하였다.

---

## 2. 점검 항목 Todo List

| # | 모듈 | 경로 |
|---|------|------|
| 1 | Backend Schema | `src/features/learner-dashboard/backend/schema.ts` |
| 2 | Backend Error | `src/features/learner-dashboard/backend/error.ts` |
| 3 | Backend Service | `src/features/learner-dashboard/backend/service.ts` |
| 4 | Backend Route | `src/features/learner-dashboard/backend/route.ts` |
| 5 | DTO | `src/features/learner-dashboard/lib/dto.ts` |
| 6 | Constants | `src/features/learner-dashboard/constants/index.ts` |
| 7 | useLearnerDashboardQuery | `src/features/learner-dashboard/hooks/useLearnerDashboardQuery.ts` |
| 8 | LearnerDashboardPage | `src/features/learner-dashboard/components/learner-dashboard-page.tsx` |
| 9 | EnrolledCourseList | `src/features/learner-dashboard/components/enrolled-course-list.tsx` |
| 10 | UpcomingAssignmentList | `src/features/learner-dashboard/components/upcoming-assignment-list.tsx` |
| 11 | RecentFeedbackList | `src/features/learner-dashboard/components/recent-feedback-list.tsx` |
| 12 | My Courses Page | `src/app/(protected)/courses/my/page.tsx` |
| 13 | Hono App 라우트 등록 | `src/backend/hono/app.ts` |

---

## 3. 모듈별 점검 결과

### 3-1. `src/features/learner-dashboard/backend/schema.ts`

**상태: 완료**

- `enrolledCourseSchema`, `upcomingAssignmentSchema`, `recentFeedbackSchema`, `learnerDashboardResponseSchema` 모두 plan 명세와 일치하여 정의됨
- `progress.completed`, `progress.total`, `progress.percentage` 필드 포함
- `submissionStatus`, `score`, `gradedAt` nullable 처리 정확
- TypeScript 타입 추론(`z.infer`) 올바르게 export됨
- 빌드 오류 없음

---

### 3-2. `src/features/learner-dashboard/backend/error.ts`

**상태: 완료 (단, route.ts에서 미활용 — 하기 3-4 참조)**

- `dashboardErrorCodes.unauthorized = 'DASHBOARD_UNAUTHORIZED'`
- `dashboardErrorCodes.forbiddenRole = 'DASHBOARD_FORBIDDEN_ROLE'`
- `dashboardErrorCodes.fetchError = 'DASHBOARD_FETCH_ERROR'`
- 에러 코드 3종 모두 고유하게 정의됨
- `DashboardServiceError` 타입 export 됨

---

### 3-3. `src/features/learner-dashboard/backend/service.ts`

**상태: 완료**

plan 1-3에서 명시한 6단계 비즈니스 로직이 모두 구현됨.

**Step 1 — 수강 중인 코스 목록 (BR1, MS-1)**
- `enrollments WHERE learner_id = userId AND status = 'active'` 쿼리 정확
- `courses`, `categories`, `difficulty_levels`, `profiles` JOIN 포함
- `courseIds` 빈 배열 시 즉시 빈 응답 반환 (E1)

**Step 2 — 코스별 전체 과제 수 (BR2)**
- `assignments WHERE course_id IN courseIds AND status IN ('published', 'closed')` 정확
- 클라이언트 사이드 `Map<courseId, totalCount>` 집계 정확

**Step 3 — 코스별 완료 과제 수 (BR2)**
- `submissions WHERE learner_id = userId AND status = 'graded'` 정확
- `assignments(course_id)` JOIN으로 course_id 역참조
- `courseIds.includes(cid)` 필터로 수강 외 코스 제외

**Step 4 — 진행률 계산 (BR2, E2)**
- `percentage = total > 0 ? Math.round((completed / total) * 100) : 0` 정확
- 과제 0건이면 0% 처리 (E2)

**Step 5 — 마감 임박 과제 (MS-2, BR3)**
- `status = 'published'` AND `due_date > now()` AND `course_id IN courseIds` 필터 정확
- `ORDER BY due_date ASC`, `LIMIT 10` 적용
- 제출 상태 `Map<assignmentId, submissionStatus>` 매핑 정확

**Step 6 — 최근 피드백 (MS-3, BR4)**
- `feedback IS NOT NULL`, `ORDER BY graded_at DESC`, `LIMIT 10` 정확
- `assignments(title, courses(title))` 중첩 JOIN으로 과제명/코스명 포함

**BR6 검증:** `archived` 코스에 대해 별도 필터를 적용하지 않으므로, active 수강이면 archived 코스도 대시보드에 포함됨 — 규칙 충족

---

### 3-4. `src/features/learner-dashboard/backend/route.ts`

**상태: 부분 불일치 — 낮은 우선순위 이슈**

- 엔드포인트 `GET /api/learner/dashboard` 등록 정확
- 미인증 시 401 + `DASHBOARD_UNAUTHORIZED` 반환 — plan 일치
- 역할 검증 시 공통 `requireLearnerRole()` 사용 → 반환 에러 코드가 `FORBIDDEN_ROLE`임

**이슈:** plan 1-4에서 403 에러는 `DASHBOARD_FORBIDDEN_ROLE` 코드를 사용해야 한다고 명시하였으나, 공통 헬퍼 `requireLearnerRole()`이 `FORBIDDEN_ROLE`을 반환함. `route.ts`는 이 결과를 그대로 `respond(c, roleError)`로 전달하여 실제 응답 코드가 `FORBIDDEN_ROLE`이 됨.

**구현 계획:**

`route.ts`에서 `requireLearnerRole` 결과를 그대로 반환하는 대신, 역할 오류 시 `dashboardErrorCodes.forbiddenRole`로 재매핑하는 방식으로 수정해야 한다.

```typescript
// route.ts 수정안
const roleError = await requireLearnerRole(supabase, userId);
if (roleError) {
  return respond(
    c,
    failure(403, dashboardErrorCodes.forbiddenRole, '학습자만 접근할 수 있습니다.'),
  );
}
```

---

### 3-5. `src/features/learner-dashboard/lib/dto.ts`

**상태: 완료**

- backend/schema에서 4개 스키마와 4개 타입 모두 재노출
- plan 2-1 명세와 완전 일치

---

### 3-6. `src/features/learner-dashboard/constants/index.ts`

**상태: 완료**

- `DASHBOARD_QUERY_KEYS.all`, `DASHBOARD_QUERY_KEYS.dashboard` 정의
- plan 2-2 명세와 완전 일치

---

### 3-7. `src/features/learner-dashboard/hooks/useLearnerDashboardQuery.ts`

**상태: 완료**

- `'use client'` 지시어 선언
- `apiClient.get('/api/learner/dashboard')` 호출
- `learnerDashboardResponseSchema.parse(data)` 응답 검증
- `queryKey: DASHBOARD_QUERY_KEYS.dashboard`
- `staleTime: 60 * 1000`
- 에러 시 `extractApiErrorMessage`로 메시지 추출 후 throw
- plan 3-1 명세와 완전 일치

---

### 3-8. `src/features/learner-dashboard/components/learner-dashboard-page.tsx`

**상태: 완료**

- `'use client'` 지시어 선언
- `useLearnerDashboardQuery` 호출
- isLoading 시 `SectionSkeleton` × 3 표시 — plan QA #2 충족
- isError 시 에러 메시지 + `RefreshCw` 아이콘 + "다시 시도" 버튼 (`refetch`) — E7, plan QA #3 충족
- 수강 중인 코스 / 마감 임박 과제 / 최근 피드백 3개 섹션 + `Separator` 구분
- `data?.courses ?? []` 패턴으로 undefined 안전 처리

---

### 3-9. `src/features/learner-dashboard/components/enrolled-course-list.tsx`

**상태: 완료**

- `'use client'` 지시어 선언
- 빈 상태: `BookOpen` 아이콘 + "수강 중인 코스가 없습니다" + `/courses` 카탈로그 링크 — E1 충족
- 그리드: `sm:grid-cols-2 lg:grid-cols-3` — plan 명세 일치
- 카드 헤더: 코스 제목(`line-clamp-1`), 카테고리 Badge(secondary), 난이도 Badge(outline)
- nullable 카테고리/난이도 → 뱃지 미표시 — plan QA #6 충족
- 진행률 바: `bg-muted` 배경 + `bg-primary` 내부 + `style={{ width: percentage% }}` — plan 명세 일치
- 카드 클릭 → `/courses/${course.id}` 링크 — plan QA #7 충족

---

### 3-10. `src/features/learner-dashboard/components/upcoming-assignment-list.tsx`

**상태: 완료**

- `'use client'` 지시어 선언
- 빈 상태: `ClipboardList` 아이콘 + "예정된 과제가 없습니다" — E3 충족
- `date-fns`의 `differenceInDays`, `formatDistanceToNow`, `ko` locale 사용
- 마감일 색상 규칙: `days <= 3` → red-600, `days <= 7` → yellow-600, 그 외 → muted-foreground — plan 명세 일치
- 제출 상태 뱃지: submitted/graded/resubmission_required 각 variant 정확, null 시 미표시 — plan 명세 일치
- 과제 카드 클릭 → `/courses/my/${courseId}/assignments/${assignmentId}` 링크

---

### 3-11. `src/features/learner-dashboard/components/recent-feedback-list.tsx`

**상태: 완료**

- `'use client'` 지시어 선언
- 빈 상태: `MessageSquare` 아이콘 + "아직 피드백이 없습니다" — E4 충족
- 상태 뱃지: submitted(blue), graded(green), resubmission_required(orange) — plan 명세 일치
- `score !== null` 조건부로 점수 표시 — plan QA #3 충족
- 피드백 내용 `line-clamp-2` 처리 — plan QA #4 충족
- `gradedAt` 있을 때 `format(date, 'yyyy.MM.dd HH:mm')` 형식 — plan QA #5 충족

---

### 3-12. `src/app/(protected)/courses/my/page.tsx`

**상태: 완료**

- `'use client'` 지시어 선언
- `params: Promise<Record<string, never>>` + `void params` 패턴 적용 (Next.js 규칙 준수)
- `(protected)` 라우트 그룹 하위 → layout.tsx의 인증 가드 자동 적용 (E5)
- `LearnerDashboardPage` 렌더링

---

### 3-13. `src/backend/hono/app.ts`

**상태: 완료**

- `registerLearnerDashboardRoutes` import 및 `registerCourseRoutes` 다음에 등록
- 빌드 오류 없음

---

## 4. DB 스키마 점검

`supabase/migrations/0002_create_lms_schema.sql` 확인:

| 테이블 | 상태 |
|--------|------|
| `profiles` | 존재, `role`, `name` 컬럼 포함 |
| `courses` | 존재, `instructor_id`, `category_id`, `difficulty_id` FK 포함 |
| `categories` | 존재, `name` 컬럼 포함 |
| `difficulty_levels` | 존재, `name` 컬럼 포함 |
| `enrollments` | 존재, `learner_id`, `course_id`, `status` 컬럼 포함 |
| `assignments` | 존재, `course_id`, `due_date`, `status` 컬럼 포함 |
| `submissions` | 존재, `learner_id`, `assignment_id`, `score`, `feedback`, `graded_at`, `status` 포함 |

인덱스:
- `idx_enrollments_learner (learner_id, status)` — MS-1 쿼리 최적화
- `idx_assignments_course_status (course_id, status)` — Step 2/5 최적화
- `idx_assignments_due_date (due_date)` — MS-2 정렬 최적화
- `idx_submissions_learner (learner_id)` — Step 3/6 최적화

---

## 5. 빌드 및 타입 검사

- `npx tsc --noEmit` 실행 결과: 오류 없음
- `npm run build` 실행 결과: 빌드 성공, `/courses/my` 페이지 정상 번들링 확인

---

## 6. Edge Case 및 Business Rule 준수 현황

| 항목 | 처리 방식 | 준수 여부 |
|------|-----------|-----------|
| E1 수강 코스 0건 | service에서 courseIds 빈 배열 시 즉시 빈 응답 반환, 컴포넌트에서 빈 상태 UI + 카탈로그 링크 | 완료 |
| E2 과제 없는 코스 | total=0 → percentage=0 처리 | 완료 |
| E3 마감 임박 과제 0건 | UpcomingAssignmentList 빈 상태 UI | 완료 |
| E4 피드백 없음 | RecentFeedbackList 빈 상태 UI | 완료 |
| E5 미인증 접근 | (protected)/layout.tsx 인증 가드 + 서버 401 반환 | 완료 |
| E6 Instructor 역할 접근 | requireLearnerRole → 403 반환 (코드 불일치 이슈 존재, 하기 7절 참조) | 부분 완료 |
| E7 네트워크 오류 | isError 상태에서 에러 메시지 + 재시도 버튼 | 완료 |
| BR1 active 수강만 표시 | enrollments.status = 'active' 필터 | 완료 |
| BR2 진행률 계산 | round(graded/total*100), 과제 0건 → 0% | 완료 |
| BR3 마감 임박 과제 | status='published' AND due_date > now(), ASC 정렬 | 완료 |
| BR4 최근 피드백 | feedback IS NOT NULL, graded_at DESC | 완료 |
| BR5 Learner만 접근 | requireLearnerRole 가드 | 완료 |
| BR6 archived 코스 active 수강 유지 | courses 상태 필터 없이 enrollments.status만 체크 | 완료 |

---

## 7. 발견된 이슈

### ISSUE-001: 403 에러 코드 불일치 (낮은 우선순위)

**위치:** `src/features/learner-dashboard/backend/route.ts` 22-25행

**문제:**
plan 1-4에서는 Instructor 등 비학습자 역할 접근 시 `DASHBOARD_FORBIDDEN_ROLE` 에러 코드를 반환해야 한다고 명시하였다. 그러나 현재 구현은 공통 헬퍼 `requireLearnerRole()`의 반환값(`FORBIDDEN_ROLE` 코드)을 그대로 전달하고 있어, 실제 응답에는 `FORBIDDEN_ROLE`이 포함된다.

**현재 코드:**
```typescript
// src/features/learner-dashboard/backend/route.ts
const roleError = await requireLearnerRole(supabase, userId);
if (roleError) {
  return respond(c, roleError);  // FORBIDDEN_ROLE 코드로 응답됨
}
```

**수정 계획:**

```typescript
// route.ts 수정안
import { failure, respond } from '@/backend/http/response';
import { dashboardErrorCodes } from './error';

const roleError = await requireLearnerRole(supabase, userId);
if (roleError) {
  return respond(
    c,
    failure(403, dashboardErrorCodes.forbiddenRole, '학습자만 접근할 수 있습니다.'),
  );
}
```

**영향도:** 기능 동작은 정상(403 반환)이나, 클라이언트가 에러 코드를 기반으로 분기 처리할 경우 `DASHBOARD_FORBIDDEN_ROLE`을 기대하는 로직이 있다면 오동작 가능. 현재 프론트엔드는 에러 코드 분기 없이 메시지만 표시하므로 즉각적인 사용자 영향은 없음.

---

## 8. 최종 결론

| 구분 | 결과 |
|------|------|
| 전체 모듈 수 | 13개 |
| 완전 구현 | 12개 |
| 부분 불일치 | 1개 (ISSUE-001: 에러 코드 불일치) |
| 미구현 | 0개 |
| 빌드 성공 여부 | 성공 |
| TypeScript 오류 | 없음 |

UC-003 Learner 대시보드의 핵심 기능(수강 코스 + 진행률, 마감 임박 과제, 최근 피드백)은 모두 구현 완료되었으며 프로덕션 레벨에서 동작 가능한 상태이다. 유일한 이슈인 ISSUE-001은 403 에러 응답의 코드 값 불일치로, 기능 동작에 직접 영향을 주지 않는 낮은 우선순위 항목이다.

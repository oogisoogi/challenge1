# UC-007 Instructor 대시보드 구현 점검 보고서

## 점검 개요

- 대상 유스케이스: UC-007 Instructor 대시보드
- 점검 기준 문서: `/docs/007/spec.md`, `/docs/007/plan.md`
- 점검 일시: 2026-02-20

---

## Todo List (점검 항목)

| # | 모듈 | 위치 | 점검 항목 |
|---|------|------|---------|
| 1 | requireInstructorRole 유틸 | `src/backend/http/auth.ts` | Instructor 역할 가드 유틸 추가 여부 |
| 2 | Backend Schema | `src/features/instructor-dashboard/backend/schema.ts` | zod 스키마 정의 완전성 |
| 3 | Backend Error | `src/features/instructor-dashboard/backend/error.ts` | 에러 코드 정의 |
| 4 | Backend Service | `src/features/instructor-dashboard/backend/service.ts` | 비즈니스 로직 4단계 구현 |
| 5 | Backend Route | `src/features/instructor-dashboard/backend/route.ts` | Hono 라우터 구현 |
| 6 | DTO | `src/features/instructor-dashboard/lib/dto.ts` | 백엔드 스키마 재노출 |
| 7 | Constants | `src/features/instructor-dashboard/constants/index.ts` | Query Key 정의 |
| 8 | useInstructorDashboardQuery | `src/features/instructor-dashboard/hooks/useInstructorDashboardQuery.ts` | React Query 훅 구현 |
| 9 | InstructorDashboardPage | `src/features/instructor-dashboard/components/instructor-dashboard-page.tsx` | 메인 대시보드 레이아웃 |
| 10 | MyCourseList | `src/features/instructor-dashboard/components/my-course-list.tsx` | 코스 카드 그리드 컴포넌트 |
| 11 | RecentSubmissionTable | `src/features/instructor-dashboard/components/recent-submission-table.tsx` | 최근 제출물 테이블 컴포넌트 |
| 12 | Page | `src/app/(protected)/instructor/dashboard/page.tsx` | 페이지 컴포넌트 업데이트 |
| 13 | Hono App 등록 | `src/backend/hono/app.ts` | instructor-dashboard 라우트 등록 |
| 14 | E1: 코스 0건 | service + MyCourseList | 빈 상태 UI 처리 |
| 15 | E2: 채점 대기 0건 | InstructorDashboardPage + MyCourseList | 배지 미표시 처리 |
| 16 | E3: 제출물 0건 | RecentSubmissionTable | 빈 상태 메시지 처리 |
| 17 | E4: 미인증 | route.ts | 401 반환 처리 |
| 18 | E5: Learner 접근 | route.ts | 403 반환 처리 |
| 19 | E6: 네트워크 오류 | InstructorDashboardPage | 에러 메시지 + 재시도 버튼 |
| 20 | E7: 코스 50건 이상 | service.ts | 초기 20건 제한 |
| 21 | BR1: 본인 코스만 | service.ts | instructor_id 필터 |
| 22 | BR2: 상태별 구분 + created_at DESC | service.ts + MyCourseList | 정렬 및 상태 배지 |
| 23 | BR3: 채점 대기 submitted만 | service.ts | status='submitted' 필터 |
| 24 | BR4: 최근 제출물 10건, created_at DESC | service.ts | LIMIT 10 + 정렬 |
| 25 | BR5: Instructor 역할만 접근 | route.ts + auth.ts | 역할 가드 |
| 26 | BR6: 수강생 수 active만 | service.ts | status='active' 필터 |

---

## 점검 결과 상세

### 1. `requireInstructorRole` 유틸 (`src/backend/http/auth.ts`)

**상태: 구현 완료**

`requireInstructorRole` 함수가 `requireLearnerRole`과 동일한 패턴으로 구현되어 있으며, `profiles` 테이블에서 역할을 조회하여 `instructor`가 아닐 경우 403을 반환합니다.

```typescript
export const requireInstructorRole = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<ErrorResult<string> | null> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role !== 'instructor') {
    return failure(403, 'FORBIDDEN_ROLE', 'Instructor만 접근할 수 있습니다.');
  }

  return null;
};
```

### 2. Backend Schema (`src/features/instructor-dashboard/backend/schema.ts`)

**상태: 구현 완료**

`instructorCourseSchema`, `recentSubmissionSchema`, `instructorDashboardResponseSchema` 3개 스키마가 plan.md 명세와 일치하게 정의되어 있습니다. 타입 추론(`z.infer`)도 올바르게 export되고 있습니다.

### 3. Backend Error (`src/features/instructor-dashboard/backend/error.ts`)

**상태: 구현 완료**

`unauthorized`, `forbiddenRole`, `fetchError` 3개 에러 코드가 올바르게 정의되어 있습니다.

### 4. Backend Service (`src/features/instructor-dashboard/backend/service.ts`)

**상태: 구현 완료 (단, 주의사항 2건 존재)**

4단계 비즈니스 로직이 전반적으로 올바르게 구현되어 있습니다.

- Step 1 (코스 목록): `instructor_id = userId` 필터, `created_at DESC` 정렬, categories/difficulty_levels FK 조인 구현
- Step 2 (수강생 수): `status='active'` 필터 후 클라이언트 사이드 GROUP BY
- Step 3 (채점 대기): `status='submitted'` 필터, courseIds 범위 내 필터링
- Step 4 (최근 제출물): assignments 경유 `assignmentIds` 추출 후 submissions 조회, LIMIT 10, `created_at DESC`

**주의사항 1: 채점 대기 건수 조회에서 `courseIds` 범위 필터링 방식**

현재 Step 3에서 `submissions`를 `status='submitted'`로 조회한 뒤, 클라이언트 사이드에서 `courseIds.includes(cid)`로 필터링합니다. 이는 기능적으로는 올바르나, 다른 강사의 코스 submissions까지 모두 DB에서 가져온 뒤 클라이언트에서 거르는 방식이므로 대규모 데이터 환경에서 성능 이슈가 생길 수 있습니다. Step 4처럼 `assignmentIds`를 먼저 추출한 후 `IN` 절로 필터링하는 것이 더 효율적입니다.

**주의사항 2: `submittedAt` 필드에 `created_at` 사용**

`submissions` 테이블에는 `submitted_at`과 `created_at` 컬럼이 모두 존재합니다. 현재 구현은 `created_at`을 `submittedAt`으로 매핑하고 있는데, "제출일시"를 의미하는 `submitted_at` 컬럼을 사용하는 것이 의미론적으로 더 정확합니다. 다만 BR4에서 정렬 기준을 `created_at DESC`로 명시했고, 초기 제출 시 두 값이 동일하므로 실제 동작에는 큰 차이가 없습니다.

### 5. Backend Route (`src/features/instructor-dashboard/backend/route.ts`)

**상태: 구현 완료 (단, 에러 코드 불일치 주의)**

`GET /api/instructor/dashboard` 엔드포인트가 올바르게 구현되어 있습니다. `extractUserId` → 401, `requireInstructorRole` → 403, `getInstructorDashboard` 흐름이 spec과 일치합니다.

**에러 코드 불일치:** `requireInstructorRole`에서 반환하는 에러 코드는 `FORBIDDEN_ROLE`이지만, plan.md에서는 403 시 `INSTRUCTOR_DASHBOARD_FORBIDDEN_ROLE`을 사용하도록 명시합니다. 현재 구현은 공통 `auth.ts`의 generic 코드를 사용하므로 feature별 에러 코드와 일치하지 않습니다. 기능 동작에는 문제가 없지만 프론트엔드에서 에러 코드로 구체적인 분기가 필요할 경우 일치시켜야 합니다.

### 6. DTO (`src/features/instructor-dashboard/lib/dto.ts`)

**상태: 구현 완료**

backend/schema에서 필요한 모든 스키마와 타입을 re-export하고 있습니다.

### 7. Constants (`src/features/instructor-dashboard/constants/index.ts`)

**상태: 구현 완료**

`INSTRUCTOR_DASHBOARD_QUERY_KEYS.all`과 `INSTRUCTOR_DASHBOARD_QUERY_KEYS.dashboard`가 plan.md 명세와 정확히 일치합니다.

### 8. `useInstructorDashboardQuery` 훅 (`src/features/instructor-dashboard/hooks/useInstructorDashboardQuery.ts`)

**상태: 구현 완료**

`use client` 지시자 포함, `apiClient.get('/api/instructor/dashboard')` 호출, `instructorDashboardResponseSchema.parse()` 응답 검증, `staleTime: 60 * 1000` 설정 모두 plan.md 명세와 일치합니다.

### 9. `InstructorDashboardPage` 컴포넌트 (`src/features/instructor-dashboard/components/instructor-dashboard-page.tsx`)

**상태: 구현 완료**

- `use client` 지시자 포함
- `useInstructorDashboardQuery` 호출 및 3개 섹션 데이터 분배
- 로딩 시 스켈레톤 카드 UI 표시
- 에러 시 에러 메시지 + "다시 시도" 버튼(`refetch`) 표시
- `totalPendingGradingCount > 0` 조건부 채점 대기 배지 표시 (E2 처리)

### 10. `MyCourseList` 컴포넌트 (`src/features/instructor-dashboard/components/my-course-list.tsx`)

**상태: 구현 완료**

- `use client` 지시자 포함
- 코스 0건 시 빈 상태 UI ("아직 코스가 없습니다. 새 코스를 만들어 보세요.") + 코스 생성 버튼 표시 (E1)
- `sm:grid-cols-2 lg:grid-cols-3` 반응형 그리드 레이아웃
- `published` → 초록 "공개", `draft` → 노란 "초안", `archived` → 회색 "보관" 배지
- `pendingGradingCount > 0` 시 빨간 "N건 채점 대기" 배지, 0건 시 미표시 (E2)
- `categoryName`, `difficultyName` null 시 해당 배지 미표시
- 수강생 수 "수강생 N명" 표시

### 11. `RecentSubmissionTable` 컴포넌트 (`src/features/instructor-dashboard/components/recent-submission-table.tsx`)

**상태: 구현 완료**

- `use client` 지시자 포함
- 제출물 0건 시 "아직 제출된 과제가 없습니다" 빈 상태 메시지 (E3)
- `submitted` → 파란 "제출됨", `graded` → 초록 "채점완료", `resubmission_required` → 주황 "재제출요청" 배지
- `isLate=true` 시 "지각" 배지 표시, `false` 시 미표시
- `format(submittedAt, 'yyyy.MM.dd HH:mm', { locale: ko })` 날짜 포맷
- 행 클릭 시 `/instructor/assignments/${submission.assignmentId}/submissions` 이동
- 6개 컬럼(제출자, 과제명, 코스명, 제출일, 상태, 지각) 구현

### 12. Page (`src/app/(protected)/instructor/dashboard/page.tsx`)

**상태: 구현 완료**

- `use client` 지시자 포함
- `params: Promise<Record<string, never>>` + `void params` 패턴 적용
- `InstructorDashboardPage` 컴포넌트 렌더링
- `(protected)` 레이아웃에 의해 미인증 접근 시 로그인 리다이렉트 자동 처리 (E4)

### 13. Hono App 라우트 등록 (`src/backend/hono/app.ts`)

**상태: 구현 완료**

`registerInstructorDashboardRoutes(app)`가 `registerLearnerDashboardRoutes(app)` 다음에 올바르게 등록되어 있습니다.

---

## 발견된 이슈 요약

### 이슈 1: E7 (코스 50건 이상 페이지네이션) 미구현 [심각도: 중]

**위치:** `src/features/instructor-dashboard/backend/service.ts` (Step 1)

**문제:** spec E7에서 "코스가 다수(50건 이상)인 경우 페이지네이션 또는 무한 스크롤로 처리, 초기 로드는 최근 생성순 상위 20건"으로 명시되어 있으나, 현재 courses 쿼리에 `.limit(20)` 또는 페이지네이션 처리가 없습니다. 코스 수가 많을 경우 모든 코스가 한 번에 로드됩니다.

**구현 방안:**
- service.ts의 courses 쿼리에 `.limit(20)` 추가 및 응답에 `hasMore` 플래그 포함
- 또는 프론트엔드에서 무한 스크롤을 위해 `useInfiniteQuery`를 사용하고, API에 `cursor` 기반 페이지네이션 파라미터 추가
- 최소한 `.limit(20)` 제한을 서비스 단에서 적용하는 것이 필요

### 이슈 2: 403 에러 코드 불일치 [심각도: 낮]

**위치:** `src/features/instructor-dashboard/backend/route.ts`

**문제:** plan.md에서 403 응답 시 `INSTRUCTOR_DASHBOARD_FORBIDDEN_ROLE` 코드를 사용하도록 명시하였으나, 현재 `requireInstructorRole`에서 반환하는 코드는 공통 `FORBIDDEN_ROLE`입니다. 기능 동작에는 문제가 없지만 에러 코드 명세와 불일치합니다.

**구현 방안:**
- `route.ts`에서 `requireInstructorRole`의 반환 에러를 그대로 사용하는 대신, 에러 발생 시 `instructorDashboardErrorCodes.forbiddenRole` 코드로 재매핑하여 respond:

```typescript
const roleError = await requireInstructorRole(supabase, userId);
if (roleError) {
  return respond(
    c,
    failure(
      403,
      instructorDashboardErrorCodes.forbiddenRole,
      'Instructor만 접근할 수 있습니다.',
    ),
  );
}
```

### 이슈 3: `submittedAt` 필드에 `created_at` 사용 [심각도: 낮]

**위치:** `src/features/instructor-dashboard/backend/service.ts` (Step 4, 232번째 줄)

**문제:** `submissions` 테이블에는 `submitted_at`(제출 시각)과 `created_at`(레코드 생성 시각) 컬럼이 별도로 존재합니다. 현재 구현에서는 `s.created_at`을 `submittedAt`으로 매핑하고 있는데, 의미론적으로는 `s.submitted_at`을 사용하는 것이 정확합니다.

초기 제출 시 두 값이 동일하지만, 재제출(UPDATE) 발생 시 `submitted_at`이 갱신될 수 있으므로 `submitted_at`을 사용하는 것이 더 올바릅니다.

**구현 방안:**
- service.ts의 submissions select에 `submitted_at` 추가 및 매핑 수정:

```typescript
// service.ts에서 select 쿼리 수정
submitted_at,  // 추가

// RawSubmission 타입에 추가
submitted_at: string;

// 매핑 수정
submittedAt: s.submitted_at,  // created_at → submitted_at
```

### 이슈 4: Step 3 채점 대기 건수 조회 성능 [심각도: 낮]

**위치:** `src/features/instructor-dashboard/backend/service.ts` (Step 3, 97~128번째 줄)

**문제:** Step 3에서 `status='submitted'`인 모든 submissions를 가져온 뒤 클라이언트 사이드에서 courseIds 기반으로 필터링합니다. 이는 다른 강사의 코스 submissions까지 DB에서 전부 가져오는 방식이므로 데이터 규모가 커질수록 성능이 저하됩니다.

**구현 방안:**
- Step 4와 동일하게 먼저 `assignmentIds`를 추출한 뒤, `submissions` 조회 시 `.in('assignment_id', assignmentIds)` 필터를 적용:

```typescript
// Step 3 개선안
const { data: pendingRaw, error: pendingError } = await supabase
  .from(SUBMISSIONS_TABLE)
  .select('id, assignment_id')
  .in('assignment_id', assignmentIds)  // assignmentIds는 Step 4와 공유하거나 선행 추출
  .eq('status', 'submitted');
```

---

## 최종 구현 완료 여부

| # | 항목 | 상태 |
|---|------|------|
| 1 | requireInstructorRole 유틸 | 완료 |
| 2 | Backend Schema | 완료 |
| 3 | Backend Error | 완료 |
| 4 | Backend Service (핵심 로직) | 완료 |
| 5 | Backend Route | 완료 |
| 6 | DTO | 완료 |
| 7 | Constants | 완료 |
| 8 | useInstructorDashboardQuery 훅 | 완료 |
| 9 | InstructorDashboardPage 컴포넌트 | 완료 |
| 10 | MyCourseList 컴포넌트 | 완료 |
| 11 | RecentSubmissionTable 컴포넌트 | 완료 |
| 12 | /instructor/dashboard/page.tsx | 완료 |
| 13 | Hono App 라우트 등록 | 완료 |
| 14 | E1 (코스 0건 빈 상태 UI) | 완료 |
| 15 | E2 (채점 대기 0건 배지 미표시) | 완료 |
| 16 | E3 (제출물 0건 빈 상태) | 완료 |
| 17 | E4 (미인증 401 + 리다이렉트) | 완료 |
| 18 | E5 (Learner 403 처리) | 완료 |
| 19 | E6 (네트워크 오류 재시도) | 완료 |
| 20 | E7 (코스 50건 이상 페이지네이션) | **미구현** |
| 21 | BR1 (본인 코스만) | 완료 |
| 22 | BR2 (상태별 구분 + created_at DESC) | 완료 |
| 23 | BR3 (채점 대기 submitted만) | 완료 |
| 24 | BR4 (최근 제출물 10건, DESC) | 완료 |
| 25 | BR5 (Instructor 역할 가드) | 완료 |
| 26 | BR6 (수강생 수 active만) | 완료 |

**전체 26개 항목 중 25개 완료, 1개 미구현 (E7 페이지네이션)**

---

## 결론

UC-007 Instructor 대시보드의 핵심 기능은 프로덕션 레벨로 구현되어 있습니다. 인증/역할 가드, 비즈니스 로직(코스 목록, 채점 대기, 최근 제출물), 모든 Edge Case 처리, 프론트엔드 컴포넌트가 spec에 부합하게 구현되었습니다.

다만 다음 3가지 개선 사항이 권고됩니다:

1. **[필수]** E7 대응: 코스 목록 초기 로드를 20건으로 제한하는 `.limit(20)` 추가
2. **[권고]** `submittedAt` 필드에 `submitted_at` 컬럼 사용으로 수정
3. **[권고]** Step 3 채점 대기 조회 성능 개선 (DB 필터 적용)
4. **[선택]** 403 에러 코드를 `INSTRUCTOR_DASHBOARD_FORBIDDEN_ROLE`로 일치시키는 route.ts 수정

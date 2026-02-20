# UC-002 구현 점검 보고서: 코스 탐색 & 수강신청/취소

**점검일:** 2026-02-20
**점검 대상:** `docs/002/spec.md`, `docs/002/plan.md`
**점검 범위:** UC-002 전체 구현 (Backend / Frontend / Infrastructure)

---

## 1. 점검 대상 모듈 목록 (TODO List)

| # | 모듈 | 경로 | 점검 항목 |
|---|------|------|-----------|
| B1 | Error Codes | `src/features/course/backend/error.ts` | 에러 코드 정의 완전성 |
| B2 | Schema | `src/features/course/backend/schema.ts` | 요청/응답 zod 스키마 일치 여부 |
| B3 | Service | `src/features/course/backend/service.ts` | 비즈니스 로직 및 엣지케이스 처리 |
| B4 | Route | `src/features/course/backend/route.ts` | 엔드포인트 등록 및 인증 처리 |
| F1 | Constants | `src/features/course/constants/index.ts` | Query key, 정렬 옵션, 페이지 사이즈 |
| F2 | DTO | `src/features/course/lib/dto.ts` | 스키마 재노출 완전성 |
| F3 | useCourseListQuery | `src/features/course/hooks/useCourseListQuery.ts` | API 연결, 스키마 파싱, staleTime |
| F4 | useCourseDetailQuery | `src/features/course/hooks/useCourseDetailQuery.ts` | API 연결, enabled 옵션, staleTime |
| F5 | useCourseMetaQuery | `src/features/course/hooks/useCourseMetaQuery.ts` | API 연결, staleTime 5분 설정 |
| F6 | useEnrollMutation | `src/features/course/hooks/useEnrollMutation.ts` | mutation, 성공/에러 토스트, 캐시 무효화 |
| F7 | useCancelEnrollmentMutation | `src/features/course/hooks/useCancelEnrollmentMutation.ts` | mutation, 성공/에러 토스트, 캐시 무효화 |
| F8 | CourseCard | `src/features/course/components/course-card.tsx` | 렌더링, hover, null 처리 |
| F9 | CourseList | `src/features/course/components/course-list.tsx` | 로딩/에러/빈 상태 처리 |
| F10 | CourseFilters | `src/features/course/components/course-filters.tsx` | 검색/필터/정렬 UI, `__all__` 초기화 |
| F11 | CourseDetailView | `src/features/course/components/course-detail-view.tsx` | 상세 섹션 렌더링, 스켈레톤 |
| F12 | EnrollButton | `src/features/course/components/enroll-button.tsx` | 수강신청/취소 버튼, 확인 다이얼로그 |
| P1 | CatalogPage | `src/app/(protected)/courses/page.tsx` | 상태 관리, 페이지네이션, 필터 리셋 |
| P2 | CourseDetailPage | `src/app/(protected)/courses/[courseId]/page.tsx` | params 처리, 렌더링 |
| I1 | Route Registration | `src/backend/hono/app.ts` | `registerCourseRoutes` 등록 |
| DB | DB Schema | `supabase/migrations/0002_create_lms_schema.sql` | 테이블 구조, 인덱스, 제약 조건 |

---

## 2. 모듈별 점검 결과

### B1 - Error Codes (`src/features/course/backend/error.ts`)

**상태: 구현 완료 (spec 초과 구현)**

```typescript
export const courseErrorCodes = {
  notFound: 'COURSE_NOT_FOUND',
  notPublished: 'COURSE_NOT_PUBLISHED',
  alreadyEnrolled: 'COURSE_ALREADY_ENROLLED',
  notEnrolled: 'COURSE_NOT_ENROLLED',
  forbiddenRole: 'COURSE_FORBIDDEN_ROLE',
  unauthorized: 'COURSE_UNAUTHORIZED',
  fetchError: 'COURSE_FETCH_ERROR',
  enrollFailed: 'COURSE_ENROLL_FAILED',
  cancelFailed: 'COURSE_CANCEL_FAILED',
  validationError: 'COURSE_VALIDATION_ERROR',
  courseArchived: 'COURSE_ARCHIVED',  // plan에 없었으나 E8 엣지케이스 처리를 위해 추가됨
} as const;
```

plan에 명시된 10개 에러 코드 외에 `courseArchived`가 추가 정의되었으며, 이는 spec의 Edge Case E8(`archived` 코스 수강신청 → 400 반환)을 처리하기 위한 적절한 추가입니다.

---

### B2 - Schema (`src/features/course/backend/schema.ts`)

**상태: 구현 완료**

plan에 명시된 모든 스키마가 구현됨:
- `courseListQuerySchema`: q, categoryId, difficultyId, sort, page, limit 모두 포함
- `courseIdParamSchema`: UUID 검증 포함
- `courseSummarySchema`, `courseListResponseSchema`: 완전 구현
- `courseDetailResponseSchema`: `enrollmentStatus: z.enum(['active', 'cancelled']).nullable()` 정확히 구현
- `enrollResponseSchema`, `cancelEnrollResponseSchema`: 완전 구현
- `courseMetaResponseSchema`: 완전 구현

---

### B3 - Service (`src/features/course/backend/service.ts`)

**상태: 구현 완료 (버그 2건 존재)**

#### 버그 1 - `popular` 정렬 시 DB 레벨 페이지네이션 미적용 (심각도: 중)

**위치:** `src/features/course/backend/service.ts` 62~107줄

```typescript
// 현재 코드: sort에 관계없이 created_at DESC 정렬만 적용
builder = builder.order('created_at', { ascending: false });

// sort === 'latest'일 때만 DB 레벨 range 적용
if (sort === 'latest') {
  builder = builder.range(from, to);
}

// sort === 'popular'이면 전체 데이터를 메모리에 로드한 후 앱 레벨 슬라이싱
if (sort === 'popular') {
  courses.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
  const paginated = courses.slice(from, from + limit);
  ...
}
```

**문제점:** `sort === 'popular'`일 때 DB에서 `.range(from, to)`를 적용하지 않으므로 published 코스 전체를 메모리로 로드합니다. 코스 수가 많아질 경우 메모리 사용량 및 응답 속도에 심각한 영향을 미칩니다.

**수정 방향:** `popular` 정렬은 현재 구조상 클라이언트 정렬이 불가피하므로, Supabase의 embedded `count`를 활용하는 방식 대신 별도의 `enrollments` count 서브쿼리를 사용하거나, DB 뷰/함수로 처리하는 방식을 검토해야 합니다. 단기 수정으로는 `popular` 정렬 시에도 DB에서 모든 데이터를 가져오되 limit를 명시적으로 설정하는 것이 현재 구조에서 최선입니다.

#### 버그 2 - `enrollments ( count )` 에서 `status='active'` 필터 누락 (심각도: 중)

**위치:** `src/features/course/backend/service.ts` 36~50줄

```typescript
let builder = supabase
  .from(COURSES_TABLE)
  .select(
    `
    ...
    enrollments ( count )
    `,
    { count: 'exact' },
  )
  .eq('status', 'published');
```

**문제점:** `enrollments ( count )`는 `status` 필터 없이 `active`와 `cancelled` 상태의 수강생을 모두 집계합니다. 이로 인해 카탈로그에 표시되는 수강생 수가 실제 수강생 수보다 많게 표시될 수 있으며, `popular` 정렬 결과의 정확도도 낮아집니다.

**수정 방향:**
```typescript
// 수정 전
enrollments ( count )

// 수정 후 - Supabase embedded filter 사용
enrollments!inner ( count ).eq('status', 'active')
// 또는 별도 count 쿼리 활용
```

단, Supabase의 embedded count에서 `status` 필터를 직접 적용하는 방법은 API 제한이 있어, `getCourseDetail`처럼 별도 count 쿼리로 분리하는 방식이 더 안정적입니다.

#### 정상 구현 확인 항목
- `getCourses`: published 필터, 검색어 ILIKE, 카테고리/난이도 eq 필터 정상
- `getCourseDetail`: 404 처리, 수강 상태 조회, optional auth 정상
- `enrollCourse`: role 검증 (403), published 검증 (400), archived 검증 (400), 중복 409, 재수강 UPDATE 정상
- `cancelEnrollment`: active 조회 → 없으면 404, UPDATE cancelled 정상
- `getCourseMeta`: `is_active=true` 필터 정상

---

### B4 - Route (`src/features/course/backend/route.ts`)

**상태: 구현 완료**

모든 5개 엔드포인트가 구현됨:
- `GET /api/courses/meta` — `/api/courses/:courseId` 보다 먼저 등록 (라우트 우선순위 정상)
- `GET /api/courses` — 쿼리 파라미터 파싱 및 검증 정상
- `GET /api/courses/:courseId` — 선택적 인증 (extractUserId 실패해도 진행) 정상
- `POST /api/courses/:courseId/enroll` — 필수 인증 (null이면 401) 정상
- `DELETE /api/courses/:courseId/enroll` — 필수 인증 (null이면 401) 정상

`extractUserId`는 plan에서 로컬 헬퍼로 정의하도록 했으나, 실제로는 공유 모듈 `src/backend/http/auth.ts`로 분리되어 재사용성이 높아졌습니다. 구현 품질이 더 우수합니다.

---

### F1 - Constants (`src/features/course/constants/index.ts`)

**상태: 구현 완료**

```typescript
export const COURSE_QUERY_KEYS = {
  all: ['courses'] as const,
  list: (params: Record<string, unknown>) => ['courses', 'list', params] as const,
  detail: (courseId: string) => ['courses', 'detail', courseId] as const,
  meta: ['courses', 'meta'] as const,
} as const;

export const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
] as const;

export const DEFAULT_PAGE_SIZE = 12;
```

plan에 명시된 모든 항목이 정확하게 구현됨.

---

### F2 - DTO (`src/features/course/lib/dto.ts`)

**상태: 구현 완료**

plan에 명시된 모든 스키마/타입이 `../backend/schema`에서 재노출됨.

---

### F3 - useCourseListQuery (`src/features/course/hooks/useCourseListQuery.ts`)

**상태: 구현 완료**

- `GET /api/courses` 호출 정상
- `courseListResponseSchema.parse(data)` 검증 정상
- `staleTime: 60 * 1000` (60초) 정상
- `COURSE_QUERY_KEYS.list(params)` 사용 정상

---

### F4 - useCourseDetailQuery (`src/features/course/hooks/useCourseDetailQuery.ts`)

**상태: 구현 완료**

- `GET /api/courses/:courseId` 호출 정상
- `enabled: Boolean(courseId)` 정상
- `staleTime: 60 * 1000` 정상

---

### F5 - useCourseMetaQuery (`src/features/course/hooks/useCourseMetaQuery.ts`)

**상태: 구현 완료**

- `GET /api/courses/meta` 호출 정상
- `staleTime: 5 * 60 * 1000` (5분) 정상

---

### F6 - useEnrollMutation (`src/features/course/hooks/useEnrollMutation.ts`)

**상태: 구현 완료**

- `POST /api/courses/:courseId/enroll` 호출 정상
- 성공 토스트 및 `COURSE_QUERY_KEYS.detail(courseId)` 캐시 무효화 정상
- 에러 토스트 (`variant: 'destructive'`) 정상

---

### F7 - useCancelEnrollmentMutation (`src/features/course/hooks/useCancelEnrollmentMutation.ts`)

**상태: 구현 완료**

- `DELETE /api/courses/:courseId/enroll` 호출 정상
- 성공/에러 토스트, 캐시 무효화 정상

---

### F8 - CourseCard (`src/features/course/components/course-card.tsx`)

**상태: 구현 완료**

spec QA 항목 전체 충족:
- `line-clamp-1` 제목, `line-clamp-2` 설명 적용
- categoryName/difficultyName null 시 Badge 숨김 처리
- Users, Calendar 아이콘 및 `date-fns` format 사용
- `hover:shadow-md` transition 적용
- `Link`로 `/courses/:courseId` 이동

---

### F9 - CourseList (`src/features/course/components/course-list.tsx`)

**상태: 구현 완료**

- 로딩: 6개 SkeletonCard (animate-pulse)
- 에러: 에러 메시지 표시
- 빈 결과: BookOpen 아이콘 + "조건에 맞는 코스가 없습니다" (E6)
- 성공: `sm:grid-cols-2 lg:grid-cols-3` 반응형 그리드

---

### F10 - CourseFilters (`src/features/course/components/course-filters.tsx`)

**상태: 구현 완료**

- Search 아이콘 Input 정상
- 카테고리/난이도 Select (`useCourseMetaQuery` 연동) 정상
- `__all__` 값으로 필터 초기화 정상
- SORT_OPTIONS 사용 정상

---

### F11 - CourseDetailView (`src/features/course/components/course-detail-view.tsx`)

**상태: 구현 완료**

spec에 명시된 모든 섹션 구현됨:
- 헤더: 제목, Badge, 수강생 수, 등록일
- 코스 소개: `whitespace-pre-wrap`
- 커리큘럼: 빈 경우 안내 메시지
- 강사 정보: Avatar placeholder + 이름 + Bio
- DetailSkeleton (animate-pulse)
- 에러/없는 코스: "코스를 찾을 수 없습니다"

추가 구현: `ReportDialog`가 헤더에 포함되어 있으나, 이는 UC-002 범위 외 기능입니다. 기능적으로 문제 없으며 다른 UC(UC-012)의 구현입니다.

---

### F12 - EnrollButton (`src/features/course/components/enroll-button.tsx`)

**상태: 구현 완료**

spec QA 항목 전체 충족:
- `null` 또는 `cancelled` → "수강신청" 버튼
- `active` → "수강취소" 버튼 + 확인 Dialog
- Dialog: "수강취소 확인" 제목, 재수강 안내, outline/destructive 버튼
- `isPending` 시 "처리 중..." 텍스트 및 버튼 비활성화
- `onSettled` 시 Dialog 닫힘 처리 정상

---

### P1 - CatalogPage (`src/app/(protected)/courses/page.tsx`)

**상태: 구현 완료**

- `'use client'` 지시어 정상
- `Promise<Record<string, never>>` params 타입 (Next.js 요구사항)
- 검색어/카테고리/난이도/정렬 필터 상태 관리
- 필터 변경 시 `page`를 1로 리셋 정상
- `totalPages > 1` 조건부 페이지네이션 표시
- 이전/다음 버튼 비활성화 조건 정상

---

### P2 - CourseDetailPage (`src/app/(protected)/courses/[courseId]/page.tsx`)

**상태: 구현 완료**

- `'use client'` 지시어 정상
- `Promise<{ courseId: string }>` params 타입
- `use(params)`로 courseId 추출 (Next.js 요구사항 준수)
- `course && <EnrollButton>` 로딩 중 숨김 처리 정상
- "← 코스 목록" 뒤로가기 Link 정상

---

### I1 - Route Registration (`src/backend/hono/app.ts`)

**상태: 구현 완료**

```typescript
import { registerCourseRoutes } from "@/features/course/backend/route";

// createHonoApp 내부
registerCourseRoutes(app);
```

정상 등록됨. 미들웨어 체인 (`errorBoundary` → `withAppContext` → `withSupabase`) 이후 등록됨.

---

### DB - 마이그레이션 Schema (`supabase/migrations/0002_create_lms_schema.sql`)

**상태: 구현 완료**

UC-002에 필요한 모든 테이블 존재:
- `categories` (id, name, is_active)
- `difficulty_levels` (id, name, is_active)
- `courses` (id, instructor_id, title, description, category_id, difficulty_id, curriculum, status)
- `enrollments` (id, course_id, learner_id, status) + `UNIQUE(course_id, learner_id)` 제약 (BR2 충족)

인덱스:
- `idx_courses_status`, `idx_courses_category`, `idx_courses_difficulty`, `idx_courses_created_at DESC` — 카탈로그 탐색 최적화
- `idx_enrollments_learner`, `idx_enrollments_course` — 수강 조회 최적화

---

## 3. Business Rules 준수 여부

| # | 규칙 | 준수 여부 | 비고 |
|---|------|-----------|------|
| BR1 | `status=published`인 코스만 카탈로그 노출 및 수강신청 가능 | 준수 | `getCourses`, `enrollCourse` 모두 적용 |
| BR2 | `enrollments` UNIQUE(course_id, learner_id) | 준수 | DB 마이그레이션에 제약 조건 존재 |
| BR3 | 취소 후 재수강 시 `status='active'`로 UPSERT | 준수 | `enrollCourse`에서 UPDATE 처리 |
| BR4 | 수강취소 시 `status='cancelled'`로 변경 | 준수 | `cancelEnrollment`에서 soft delete |
| BR5 | 수강신청은 Learner 역할만 가능 | 준수 | `enrollCourse`에서 role 검증 (403) |
| BR6 | 카탈로그 정렬: 최신순/인기순 | 조건부 준수 | 버그 1 참고 — popular 정렬은 전체 로드 후 앱 레벨 정렬 |
| BR7 | 카탈로그 필터: 카테고리/난이도 | 준수 | `getCourses`에서 eq 필터 적용 |

---

## 4. Edge Cases 처리 여부

| # | 상황 | 처리 여부 | 비고 |
|---|------|-----------|------|
| E1 | `draft`/`archived` 코스 직접 URL 접근 → 404 | 처리됨 | `getCourseDetail`에서 `status='published'` 필터 후 null → 404 |
| E2 | 이미 `active` 상태에서 중복 수강신청 → 409 | 처리됨 | `enrollCourse`에서 409 반환 |
| E3 | 미등록 상태에서 수강취소 → 404 | 처리됨 | `cancelEnrollment`에서 404 반환 |
| E4 | Instructor 수강신청 시도 → 403 | 처리됨 | `enrollCourse`에서 role 검증 |
| E5 | 미인증 사용자 수강신청 → 401 | 처리됨 | route에서 `extractUserId` null 체크 |
| E6 | 검색 결과 0건 → 빈 상태 표시 | 처리됨 | `CourseList`에서 빈 배열 처리 |
| E7 | 네트워크 오류 → 에러 토스트 | 처리됨 | mutation onError, CourseList isError 처리 |
| E8 | `archived` 코스 수강신청 → 400 | 처리됨 | `enrollCourse`에서 archived 별도 처리 |

---

## 5. 발견된 버그 및 미구현 사항

### 버그 1 (심각도: 중) - `popular` 정렬 시 전체 데이터 메모리 로드

**위치:** `src/features/course/backend/service.ts` 62~107줄

**현상:** `sort === 'popular'`일 때 DB 레벨에서 `.range(from, to)` 페이지네이션을 적용하지 않고 published 코스 전체를 메모리에 로드한 후 앱 레벨에서 슬라이싱합니다.

**영향:** 코스 수가 증가할수록 응답 시간 증가, 서버 메모리 사용량 급증.

**수정 계획:**
Supabase는 embedded count에 직접 status 필터를 적용하기 어렵습니다. 다음 두 가지 방안 중 하나를 선택해야 합니다.

방안 A (DB 뷰/RPC 활용): Supabase PostgreSQL function으로 active 수강생 count를 포함한 코스 목록을 반환하는 RPC를 작성하고, `sort='popular'`일 때 해당 RPC를 호출합니다.

방안 B (임시 수정): `enrollments ( count )` 방식을 유지하되, 현재처럼 전체 데이터를 로드하는 대신 Supabase의 `order` 기능이 embedded count에 적용되도록 쿼리를 재구성합니다. 단, Supabase의 embedded 관계 정렬 지원은 제한적입니다.

```typescript
// 방안 B 임시 수정 - limit 없이 전체 로드는 동일하나 명시적 처리
if (sort === 'popular') {
  // popular는 전체 로드 후 정렬이 불가피한 경우 max limit 제한
  builder = builder.limit(1000); // 안전 상한 설정
}
```

### 버그 2 (심각도: 중) - `enrollmentCount` 집계 시 cancelled 수강생 포함

**위치:** `src/features/course/backend/service.ts` 46줄

**현상:** `enrollments ( count )` 쿼리는 `status` 조건 없이 모든 enrollment를 집계하므로, 취소된 수강생도 수강생 수에 포함됩니다.

**영향:** 카탈로그에 표시되는 수강생 수가 실제 활성 수강생보다 많게 표시됩니다. `popular` 정렬 순서에도 영향을 미칩니다.

**수정 계획:**
```typescript
// getCourses 내 select 수정
// 방안: 별도 count 쿼리로 분리 (getCourseDetail 방식 참고)
// 또는 Supabase embedded filter 사용 (제한적 지원)
enrollments!inner ( count ).status=eq.active  // Supabase 제한으로 직접 적용 불가
```

실질적 수정 방안은 `getCourses` 응답 후 각 코스의 active enrollment count를 별도로 조회하거나, Supabase DB function으로 처리하는 것입니다.

---

## 6. 코드 품질 및 추가 관찰 사항

### 긍정적 관찰
1. **`extractUserId` 공유 모듈화**: plan에서 route.ts 내 로컬 헬퍼로 정의하도록 했으나, `src/backend/http/auth.ts`로 분리하여 여러 feature에서 재사용 가능합니다.
2. **`courseArchived` 에러 코드 추가**: spec E8을 처리하기 위해 plan에 없던 에러 코드를 추가한 것은 적절한 구현입니다.
3. **`'use client'` 지시어**: 모든 컴포넌트 및 훅 파일에 정상 적용됨.
4. **타입 안전성**: zod 스키마 파싱, TypeScript 타입 추론, as const 사용 등 타입 안전성이 높습니다.
5. **에러 처리 일관성**: `extractApiErrorMessage`를 통한 에러 메시지 추출이 모든 훅에서 일관되게 적용됨.

### 주의 관찰
1. **`CatalogPage` - `useCurrentUser` 미사용**: `user`를 로드하지만 `void user`로 무시합니다. 현재 UC-002에서는 카탈로그 접근에 Learner 역할 체크가 불필요하므로 실용적이지만, 불필요한 코드입니다. 추후 정리가 필요합니다.
2. **평균 평점 미구현**: spec MS-2에 "평균 평점" 표시가 언급되었으나, DB 스키마에 평점 컬럼이 없고 구현도 없습니다. 현재 시스템에서 평점 기능 자체가 미구현 상태이므로 UC-002 범위 내 문제가 아닙니다.

---

## 7. 최종 평가

### 구현 완료 현황

| 구분 | 완료 | 버그 | 미구현 |
|------|------|------|--------|
| Backend (B1~B4) | 4 / 4 | 2건 (B3) | 0 |
| Shared (F1~F2) | 2 / 2 | 0 | 0 |
| Hooks (F3~F7) | 5 / 5 | 0 | 0 |
| Components (F8~F12) | 5 / 5 | 0 | 0 |
| Pages (P1~P2) | 2 / 2 | 0 | 0 |
| Infrastructure (I1) | 1 / 1 | 0 | 0 |
| DB Schema | 1 / 1 | 0 | 0 |
| **합계** | **20 / 20** | **2건** | **0** |

### 결론

UC-002의 모든 모듈이 구현되어 있으며, 핵심 기능인 코스 탐색, 수강신청, 수강취소는 정상 동작합니다. 2건의 버그가 존재하며, 두 버그 모두 `enrollmentCount` 관련 데이터 정확도 및 성능에 영향을 미칩니다. 기본 기능 동작에는 문제가 없으나, 프로덕션 레벨 품질을 위해서는 버그 수정이 권장됩니다.

**버그 수정 우선순위:**
1. (높음) 버그 2: `enrollmentCount` 집계 시 active 수강생만 카운트하도록 수정 — 데이터 정확도 문제
2. (중간) 버그 1: `popular` 정렬 시 전체 데이터 메모리 로드 문제 — 성능 문제 (코스가 적을 때는 실용적 영향 미미)

# UC-008 코스 관리 (Instructor) — 구현 검증 보고서

작성일: 2026-02-20

---

## 1. 검증 범위 및 Todo List

plan.md 기준으로 총 15개 모듈 + 1개 인프라 등록을 점검했다.

| # | 항목 | 파일 경로 |
|---|------|-----------|
| 1 | CourseManagement Backend Schema | `src/features/course-management/backend/schema.ts` |
| 2 | CourseManagement Backend Error | `src/features/course-management/backend/error.ts` |
| 3 | CourseManagement Backend Service | `src/features/course-management/backend/service.ts` |
| 4 | CourseManagement Backend Route | `src/features/course-management/backend/route.ts` |
| 5 | CourseManagement DTO | `src/features/course-management/lib/dto.ts` |
| 6 | CourseManagement Constants | `src/features/course-management/constants/index.ts` |
| 7 | useCourseManagementDetailQuery | `src/features/course-management/hooks/useCourseManagementDetailQuery.ts` |
| 8 | useCreateCourseMutation | `src/features/course-management/hooks/useCreateCourseMutation.ts` |
| 9 | useUpdateCourseMutation | `src/features/course-management/hooks/useUpdateCourseMutation.ts` |
| 10 | useUpdateCourseStatusMutation | `src/features/course-management/hooks/useUpdateCourseStatusMutation.ts` |
| 11 | CourseFormPage | `src/features/course-management/components/course-form-page.tsx` |
| 12 | CourseStatusButton | `src/features/course-management/components/course-status-button.tsx` |
| 13 | New Course Page | `src/app/(protected)/instructor/courses/new/page.tsx` |
| 14 | Edit Course Page | `src/app/(protected)/instructor/courses/[courseId]/edit/page.tsx` |
| 15 | Hono App 라우트 등록 | `src/backend/hono/app.ts` |
| 16 | DB 스키마 (courses, categories, difficulty_levels) | `supabase/migrations/0002_create_lms_schema.sql` |

---

## 2. 버그 발견 및 수정 내역

### [CRITICAL BUG] getCourse — COURSE_SELECT에 instructor_id 누락

**파일:** `src/features/course-management/backend/service.ts`

**증상:**
- `COURSE_SELECT` 상수에 `instructor_id` 컬럼이 포함되지 않았다.
- `getCourse` 함수에서 소유자 검증 시 `raw.instructor_id !== userId`를 평가하는데, SELECT에 없는 컬럼은 `undefined`가 되어 `undefined !== userId`가 항상 `true`로 평가된다.
- 결과적으로 **모든 인증된 Instructor가 본인의 코스를 조회(`GET /api/instructor/courses/:courseId`)할 때 항상 403 Forbidden을 받는다.**
- 코스 수정 페이지(`/instructor/courses/[courseId]/edit`) 진입 불가 — edit 모드 전체가 동작하지 않는 치명적 버그였다.

**수정 내용:**

```typescript
// 수정 전
const COURSE_SELECT = `
  id,
  title,
  ...
`;

type RawCourse = {
  id: string;
  title: string;
  ...
};

const raw = data as unknown as RawCourse & { instructor_id: string };
```

```typescript
// 수정 후
const COURSE_SELECT = `
  id,
  instructor_id,
  title,
  ...
`;

type RawCourse = {
  id: string;
  instructor_id: string;
  title: string;
  ...
};

const raw = data as unknown as RawCourse;
```

**참조 비즈니스 규칙:** BR5 (코스 수정은 소유자만 가능), E4 (타 Instructor 코스 수정 시도 → 403)

---

## 3. 모듈별 상세 검증 결과

### Phase 1: Backend Layer

#### 1-1. `schema.ts` — 완료

- `createCourseBodySchema`: title 필수(min 1), categoryId/difficultyId UUID 필수, description/curriculum default '' 처리 정상
- `updateCourseBodySchema`: 모든 필드 optional, title은 min(1) 유지 (E7 대응)
- `updateCourseStatusBodySchema`: `z.enum(['published', 'archived'])` — draft 전달 불가 (E6 대응)
- `courseManagementResponseSchema`: status 3종 enum, categoryId/difficultyId nullable 처리 정상
- `courseIdParamSchema`: UUID 검증 포함

#### 1-2. `error.ts` — 완료

plan.md에 명시된 11개 에러 코드 전부 구현됨:
- `COURSE_MGMT_UNAUTHORIZED`, `COURSE_MGMT_FORBIDDEN_ROLE`, `COURSE_MGMT_FORBIDDEN`
- `COURSE_MGMT_NOT_FOUND`, `COURSE_MGMT_VALIDATION_ERROR`
- `COURSE_MGMT_INVALID_CATEGORY`, `COURSE_MGMT_INVALID_DIFFICULTY`
- `COURSE_MGMT_INVALID_STATUS_TRANSITION`
- `COURSE_MGMT_CREATE_FAILED`, `COURSE_MGMT_UPDATE_FAILED`, `COURSE_MGMT_FETCH_ERROR`

#### 1-3. `service.ts` — 버그 수정 후 완료

**createCourse:**
- categoryId, difficultyId is_active=true 검증 (E3, E11)
- INSERT status='draft' 하드코딩 (BR1)
- 생성 후 JOIN SELECT로 categoryName/difficultyName 포함 응답 반환
- 201 status code 반환

**getCourse (버그 수정 완료):**
- COURSE_SELECT에 instructor_id 추가 완료
- 404/403 처리 정상

**updateCourse:**
- 별도 SELECT('id, instructor_id')로 소유자 검증 (E4, BR5)
- categoryId/difficultyId 전달 시에만 is_active 검증 (E3, E11)
- 전달된 필드만 UPDATE (BR8)

**updateCourseStatus:**
- ALLOWED_TRANSITIONS 상수로 단방향 전환 강제 (BR2)
- draft→published, published→archived만 허용
- archived→published, archived→draft, draft→archived 모두 차단 (E6)

#### 1-4. `route.ts` — 완료

4개 엔드포인트 모두 구현:
- `POST /api/instructor/courses`
- `GET /api/instructor/courses/:courseId`
- `PATCH /api/instructor/courses/:courseId`
- `PATCH /api/instructor/courses/:courseId/status`

각 엔드포인트에서 extractUserId → 401, requireInstructorRole → 403, zod 파싱 → 400, service 호출 → respond 패턴 정상 적용.

### Phase 2: Shared / Infrastructure

#### 2-1. `lib/dto.ts` — 완료

schema.ts의 4개 스키마 및 타입 전부 재노출.

#### 2-2. `constants/index.ts` — 완료

- `COURSE_MANAGEMENT_QUERY_KEYS`: all, detail(courseId) 팩토리 함수
- `ALLOWED_STATUS_TRANSITIONS`: BR2 규칙 상수화
- `STATUS_TRANSITION_CONFIG`: 게시하기/보관하기 label, confirmMessage 명세 일치

#### 2-3. `hono/app.ts` — 완료

`registerCourseManagementRoutes(app)`이 `registerInstructorDashboardRoutes(app)` 다음에 정상 등록됨.

### Phase 3: Frontend Hooks

#### 3-1. `useCourseManagementDetailQuery.ts` — 완료

- `staleTime: 0` (수정 페이지에서 항상 최신 데이터)
- `enabled: Boolean(courseId)` 조건부 쿼리
- zod 파싱 검증 포함
- queryKey: `COURSE_MANAGEMENT_QUERY_KEYS.detail(courseId)`

#### 3-2. `useCreateCourseMutation.ts` — 완료

- 성공 시 `router.push('/instructor/courses/{id}/edit')` 이동 (MS-1 step 10)
- 성공/실패 toast 표시

#### 3-3. `useUpdateCourseMutation.ts` — 완료

- 성공 시 `queryClient.invalidateQueries(COURSE_MANAGEMENT_QUERY_KEYS.detail(courseId))` 갱신

#### 3-4. `useUpdateCourseStatusMutation.ts` — 완료

- 성공 시 course-management detail + instructor-dashboard 양쪽 쿼리 무효화
- `INSTRUCTOR_DASHBOARD_QUERY_KEYS.dashboard` 올바르게 참조

### Phase 4: Frontend Components

#### 4-1. `course-form-page.tsx` — 완료

- `'use client'` 지시자 적용
- `react-hook-form` + `zodResolver(createCourseBodySchema)` 통합
- `useCourseMetaQuery()` 통한 카테고리/난이도 목록 동적 로드
- edit 모드: `useCourseManagementDetailQuery` 호출 후 `form.reset()` 바인딩
- create 모드: `useCreateCourseMutation`, edit 모드: `useUpdateCourseMutation`
- Markdown placeholder 안내 포함 (description, curriculum — BR6)
- 저장 중 버튼 disabled + Loader2 스피너
- edit 모드이고 status !== 'archived'일 때 `CourseStatusButton` 표시

**잠재적 개선 사항 (버그는 아님):**
- 에러 상태(getCourse 403/404) 처리 UI가 없어 로딩 스피너만 계속 표시될 수 있다. 에러 발생 시 안내 메시지를 표시하는 로직을 추가하면 UX가 향상된다.

#### 4-2. `course-status-button.tsx` — 완료

- `ALLOWED_STATUS_TRANSITIONS[currentStatus].length === 0` 이면 null 반환 (archived 상태 버튼 미표시)
- shadcn Dialog 확인/취소 패턴 정상 구현
- 전환 중 버튼 disabled
- `STATUS_TRANSITION_CONFIG`의 confirmMessage spec 일치

### Phase 5: Pages

#### 5-1. `new/page.tsx` — 완료

- `'use client'` 지시자
- `params: Promise<Record<string, never>>` + `void params` 패턴 적용
- `CourseFormPage mode="create"` 렌더링

#### 5-2. `[courseId]/edit/page.tsx` — 완료

- `'use client'` 지시자
- `params: Promise<{ courseId: string }>` + `use(params)` 언래핑 패턴 적용
- `CourseFormPage mode="edit" courseId={courseId}` 렌더링

---

## 4. 비즈니스 규칙(BR) 충족 여부

| # | 규칙 | 충족 여부 | 비고 |
|---|------|-----------|------|
| BR1 | 코스 생성 시 초기 상태 = draft | 충족 | service.ts INSERT status='draft' 하드코딩 |
| BR2 | 단방향 전환: draft→published→archived | 충족 | ALLOWED_TRANSITIONS 상수로 강제 |
| BR3 | published 코스만 카탈로그 노출/수강 가능 | 충족 | course feature service에서 status='published' 검증 |
| BR4 | archived 전환 시 신규 수강 차단, 기존 수강 유지 | 충족 | course feature에서 archived 시 400 반환, enrollment 테이블 기존 레코드 보존 |
| BR5 | 코스 수정은 소유자만 가능 | 충족 | 모든 service 함수에서 instructor_id === userId 검증 |
| BR6 | description/curriculum Markdown 지원 | 충족 | Textarea placeholder에 Markdown 안내 표시 |
| BR7 | is_active=true 항목만 선택 가능 | 충족 | validateCategory/validateDifficulty에서 is_active=true 조건 검증 |
| BR8 | published/archived에서도 필드 수정 가능 | 충족 | updateCourse에서 status 기반 차단 없이 UPDATE 수행 |
| BR9 | 코스 삭제 기능 미제공 | 충족 | DELETE 엔드포인트 없음 |

---

## 5. Edge Case(E) 충족 여부

| # | 상황 | 충족 여부 | 위치 |
|---|------|-----------|------|
| E1 | 제목 미입력 | 충족 | FE: zodResolver, BE: createCourseBodySchema.safeParse |
| E2 | 카테고리/난이도 미선택 | 충족 | FE: zodResolver, BE: UUID 검증 |
| E3 | 유효하지 않은 category_id/difficulty_id | 충족 | validateCategory/validateDifficulty 함수 |
| E4 | 타 Instructor 코스 수정 시도 | 충족 | instructor_id !== userId → 403 |
| E5 | 존재하지 않는 courseId | 충족 | .maybeSingle() + !data → 404 |
| E6 | 허용되지 않는 상태 전환 | 충족 | ALLOWED_TRANSITIONS 검증 → 400 |
| E7 | Published 코스 제목 삭제 후 저장 | 충족 | updateCourseBodySchema title min(1) + FE zodResolver |
| E8 | Learner 역할 접근 | 충족 | requireInstructorRole → 403 |
| E9 | 미인증 사용자 접근 | 충족 | extractUserId → 401, ProtectedLayout 리다이렉트 |
| E10 | 네트워크 오류 | 충족 | onError toast 표시 |
| E11 | 비활성 카테고리/난이도 선택 | 충족 | is_active=true 검증, GET /api/courses/meta에서 is_active=true 필터링 |

---

## 6. 최종 결론

| 항목 | 결과 |
|------|------|
| 전체 모듈 구현 완료 여부 | 완료 (15/15 모듈 + Hono 등록) |
| 발견된 버그 수 | 1건 (치명적 버그) |
| 수정 완료 여부 | 완료 |
| 미구현 기능 | 없음 |

**발견 및 수정한 버그:**
- `src/features/course-management/backend/service.ts` — `COURSE_SELECT` 및 `RawCourse` 타입에 `instructor_id` 누락으로 인해 `getCourse`의 소유자 검증이 항상 실패하던 치명적 버그를 수정했다. 코스 수정 페이지 진입 자체가 불가능한 상태였다.

**잠재적 개선 사항 (현재는 버그 아님):**
- `course-form-page.tsx`에서 `useCourseManagementDetailQuery` 에러 상태(403, 404) 시 사용자 안내 메시지가 없어 로딩 스피너만 노출된다. 에러 상태에 따라 적절한 안내 UI를 추가하면 UX가 개선된다.

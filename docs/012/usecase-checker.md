# UC-012 운영 (Operator) 구현 점검 보고서

## 점검 개요

- 점검 대상: UC-012 운영(Operator) 기능 전체
- 점검 기준: `/docs/012/spec.md`, `/docs/012/plan.md`
- 점검 일자: 2026-02-20

---

## Todo List (점검 항목)

| # | 분류 | 항목 | 파일 경로 |
|---|------|------|-----------|
| 0 | Migration | `profiles.is_restricted` 컬럼 추가 | `supabase/migrations/0004_add_is_restricted_to_profiles.sql` |
| 1 | Auth | `requireOperatorRole` 함수 추가 | `src/backend/http/auth.ts` |
| 2 | Backend Schema | zod 스키마 정의 (대시보드, 신고, 카테고리, 난이도) | `src/features/operator/backend/schema.ts` |
| 3 | Backend Error | 에러 코드 정의 | `src/features/operator/backend/error.ts` |
| 4 | Backend Service | 10개 서비스 함수 구현 | `src/features/operator/backend/service.ts` |
| 5 | Backend Route | 10개 엔드포인트 등록 (+ 신고 접수 1개) | `src/features/operator/backend/route.ts` |
| 6 | Hono App | operator 라우트 등록 | `src/backend/hono/app.ts` |
| 7 | DTO | 백엔드 스키마 프론트엔드 재노출 | `src/features/operator/lib/dto.ts` |
| 8 | Constants | Query Key, 상태 전환 규칙, 레이블 상수 | `src/features/operator/constants/index.ts` |
| 9 | Hook | `useOperatorDashboardQuery` | `src/features/operator/hooks/useOperatorDashboardQuery.ts` |
| 10 | Hook | `useReportsQuery` | `src/features/operator/hooks/useReportsQuery.ts` |
| 11 | Hook | `useReportDetailQuery` | `src/features/operator/hooks/useReportDetailQuery.ts` |
| 12 | Hook | `useUpdateReportMutation` | `src/features/operator/hooks/useUpdateReportMutation.ts` |
| 13 | Hook | `useCategoriesQuery` | `src/features/operator/hooks/useCategoriesQuery.ts` |
| 14 | Hook | `useCreateCategoryMutation` | `src/features/operator/hooks/useCreateCategoryMutation.ts` |
| 15 | Hook | `useUpdateCategoryMutation` | `src/features/operator/hooks/useUpdateCategoryMutation.ts` |
| 16 | Hook | `useDifficultyLevelsQuery` | `src/features/operator/hooks/useDifficultyLevelsQuery.ts` |
| 17 | Hook | `useCreateDifficultyLevelMutation` | `src/features/operator/hooks/useCreateDifficultyLevelMutation.ts` |
| 18 | Hook | `useUpdateDifficultyLevelMutation` | `src/features/operator/hooks/useUpdateDifficultyLevelMutation.ts` |
| 19 | Component | `OperatorDashboardPage` | `src/features/operator/components/operator-dashboard-page.tsx` |
| 20 | Component | `ReportsPage` | `src/features/operator/components/reports-page.tsx` |
| 21 | Component | `ReportDetailPage` | `src/features/operator/components/report-detail-page.tsx` |
| 22 | Component | `MetadataPage` | `src/features/operator/components/metadata-page.tsx` |
| 23 | Page | `/operator/dashboard/page.tsx` | `src/app/(protected)/operator/dashboard/page.tsx` |
| 24 | Page | `/operator/reports/page.tsx` | `src/app/(protected)/operator/reports/page.tsx` |
| 25 | Page | `/operator/reports/[reportId]/page.tsx` | `src/app/(protected)/operator/reports/[reportId]/page.tsx` |
| 26 | Page | `/operator/metadata/page.tsx` | `src/app/(protected)/operator/metadata/page.tsx` |

---

## 항목별 점검 결과

### Phase 0: Database Migration

#### [0] `supabase/migrations/0004_add_is_restricted_to_profiles.sql`

**상태: 버그 있음 (SQL 구문 오류)**

`profiles.is_restricted` 컬럼 추가 자체는 구현되었으나, 마이그레이션 파일의 SQL 구문에 오류가 있다.

```sql
-- 현재 (잘못된 구문)
BEGIN;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false;
EXCEPTION WHEN others THEN
  RAISE;
END;
```

`BEGIN; ... END;` 는 일반 SQL 트랜잭션 블록이며, `EXCEPTION` 절은 PL/pgSQL 블록(`DO $$ BEGIN ... EXCEPTION ... END $$;`) 내에서만 사용 가능하다. 현재 구문은 PostgreSQL에서 구문 오류를 발생시켜 마이그레이션이 실패한다.

**올바른 구문:**
```sql
-- 옵션 1: 단순 트랜잭션 (ADD COLUMN IF NOT EXISTS이므로 오류 없음)
BEGIN;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.profiles.is_restricted IS '계정 제한 플래그 (operator restrict_account 액션 적용 시 true)';
COMMIT;

-- 옵션 2: PL/pgSQL 블록으로 오류 처리
DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false;
EXCEPTION WHEN others THEN
  RAISE;
END $$;
```

---

### Phase 1: Auth Util 확장

#### [1] `src/backend/http/auth.ts`

**상태: 정상 구현**

`requireOperatorRole` 함수가 plan의 설계와 동일하게 구현되어 있다. `profiles` 테이블에서 role을 조회하고, `operator`가 아닐 경우 403과 `FORBIDDEN_ROLE` 코드를 반환한다.

```typescript
export const requireOperatorRole = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<ErrorResult<string> | null> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role !== 'operator') {
    return failure(403, 'FORBIDDEN_ROLE', '운영 권한이 필요합니다.');
  }

  return null;
};
```

---

### Phase 2: Backend Layer

#### [2] `src/features/operator/backend/schema.ts`

**상태: 정상 구현 (spec 초과 구현 포함)**

plan에서 요구된 모든 스키마가 구현되어 있으며, spec의 BR10(신고 접수)에 따른 `createReportBodySchema`, `createReportResponseSchema`가 추가로 구현되어 있다. 모든 enum 값, nullable 처리, min(1) 검증이 올바르게 정의되어 있다.

#### [3] `src/features/operator/backend/error.ts`

**상태: 정상 구현 (spec 초과 구현 포함)**

plan에서 정의한 9개 에러 코드 외에 `createFailed`, `duplicateReport`가 추가로 정의되어 있다. 모든 에러 코드가 고유한 값으로 정의되어 있다.

#### [4] `src/features/operator/backend/service.ts`

**상태: 정상 구현**

plan의 10개 서비스 함수 외에 `createReport` 함수가 추가로 구현되어 있다. 주요 비즈니스 로직 검증:

- `getOperatorDashboard`: Promise.all 병렬 조회로 4개 통계 반환. 에러 처리 정상.
- `getReports`: JOIN 쿼리로 `reporter_name` 포함. `status`, `target_type` 필터 적용 정상.
- `getReport`: 단건 조회, 404 처리 정상.
- `updateReport`: 상태 전환 유효성 검증 완전 구현
  - E3: `resolved` 상태에서 변경 시도 → 400
  - E4: `received` → `resolved` 직접 전환 → 400
  - 이미 `investigating` 상태에서 `investigating` 재시도 → 400
  - E5: `resolved` 전환 시 action 미선택 → 400
  - E10/BR4: `invalidate_submission` + `target_type != submission` → 400
  - BR5: `restrict_account` + `target_type != user` → 400
  - MS-4 후속 처리: `invalidate_submission` → `submissions.score=0`, `restrict_account` → `profiles.is_restricted=true`
- `createCategory`, `updateCategory`: UNIQUE 위반 코드 `23505` 감지로 409 반환 정상. `updateCategory`에서 존재하지 않는 ID 404 처리 정상.
- `getDifficultyLevels`, `createDifficultyLevel`, `updateDifficultyLevel`: 카테고리와 동일 패턴으로 정상 구현.

#### [5] `src/features/operator/backend/route.ts`

**상태: 정상 구현 (spec 초과 구현 포함)**

plan에서 요구된 10개 엔드포인트 외에 `POST /api/reports` (신고 접수, 인증된 모든 사용자 접근)가 추가로 구현되어 있다. `POST /api/reports` 엔드포인트는 operator 역할 검증 없이 인증된 모든 사용자가 사용 가능하다. spec의 BR10이 이를 지지한다.

모든 operator 엔드포인트에서 `extractUserId` → `requireOperatorRole` 순으로 인증/인가 처리가 정상 적용되어 있다. zod 스키마 검증도 요청 파라미터와 바디 모두 적용되어 있다.

#### [6] `src/backend/hono/app.ts`

**상태: 정상 구현**

`registerOperatorRoutes(app)`가 `registerAssignmentManagementRoutes` 다음에 올바르게 등록되어 있다.

---

### Phase 3: Shared / Infrastructure

#### [7] `src/features/operator/lib/dto.ts`

**상태: 정상 구현**

plan의 요구 타입/스키마 모두 재노출되어 있으며, `createReportBodySchema`, `createReportResponseSchema`, `CreateReportBody`, `CreateReportResponse` 타입이 추가로 포함되어 있다.

#### [8] `src/features/operator/constants/index.ts`

**상태: 정상 구현**

plan의 모든 상수가 정의되어 있다:
- `OPERATOR_QUERY_KEYS`: 5개 키 (dashboard, reports(filters), report(reportId), categories, difficultyLevels)
- `ALLOWED_REPORT_STATUS_TRANSITIONS`: BR2 상태 전환 규칙
- `REPORT_STATUS_LABELS`, `REPORT_TARGET_TYPE_LABELS`, `REPORT_ACTION_LABELS`: 한국어 레이블
- `ACTION_ALLOWED_TARGET_TYPES`: BR4, BR5 액션 허용 타입

---

### Phase 4: Frontend Hooks

#### [9-18] Hook 파일들

**상태: 전체 정상 구현**

- `useOperatorDashboardQuery`: staleTime 60초, queryKey 정상.
- `useReportsQuery`: filters 파라미터 지원, `targetType` → `target_type` 변환 정상.
- `useReportDetailQuery`: staleTime 0, `enabled: Boolean(reportId)` 정상.
- `useUpdateReportMutation`: onSuccess 시 reports, report 상세, dashboard 3개 쿼리 무효화 정상.
- `useCategoriesQuery`, `useDifficultyLevelsQuery`: staleTime 30초 정상.
- `useCreateCategoryMutation`, `useCreateDifficultyLevelMutation`: onSuccess 시 목록 쿼리 무효화 정상.
- `useUpdateCategoryMutation`, `useUpdateDifficultyLevelMutation`: 수정/비활성화 모두 동일 훅 처리 정상.

추가 구현 파일:
- `useCreateReportMutation`: 신고 접수 훅. plan에는 없으나 spec BR10 지원을 위한 적절한 추가 구현.

---

### Phase 5: Frontend Components

#### [19] `src/features/operator/components/operator-dashboard-page.tsx`

**상태: 정상 구현**

4개 통계 카드(미처리 신고, 조사 중 신고, 전체 코스, 전체 사용자) 정상 렌더링. 로딩 스켈레톤 구현. 에러 상태 처리. 신고 관리, 메타데이터 관리 빠른 링크 버튼 포함.

#### [20] `src/features/operator/components/reports-page.tsx`

**상태: 정상 구현**

- 상태 필터(전체/접수/조사 중/처리 완료) 버튼 탭 구현
- 대상 유형 필터 Select 구현
- `useReportsQuery(filters)` 필터 변경 시 자동 재조회
- 신고 목록 테이블: 대상 유형, 사유, 상태 Badge, 신고자, 접수일 표시
- 행 클릭 시 `/operator/reports/${report.id}` 이동
- 빈 상태 메시지 처리
- 로딩/에러 상태 처리

#### [21] `src/features/operator/components/report-detail-page.tsx`

**상태: 정상 구현**

- 신고 상세 정보(신고자, 대상 유형, 대상 ID, 사유, 상세 내용, 접수일, 수정일, 처리 액션) 표시
- `received` 상태: "조사 시작" 버튼, 클릭 시 `{ status: 'investigating' }` 전송
- `investigating` 상태: `ACTION_ALLOWED_TARGET_TYPES` 기반 유효 액션만 Select에 표시, 액션 미선택 시 버튼 disabled (E5 FE 구현)
- `resolved` 상태: 처리 완료 메시지 + 적용된 액션 표시, 버튼 없음
- 로딩/에러 상태 처리

#### [22] `src/features/operator/components/metadata-page.tsx`

**상태: 정상 구현 (shadcn Tabs 미사용이나 기능 동등)**

- 커스텀 버튼 기반 탭 UI로 카테고리/난이도 전환 (plan에서 권장한 shadcn Tabs 미사용, 기능 동등)
- 인라인 추가/수정 폼: `Input` + 확인/취소 버튼, Enter/Escape 키 처리
- 빈 이름 저장 차단 (`!addState.name.trim()` 체크, E13 FE 구현)
- 활성화 토글 버튼으로 `isActive` 토글
- 비활성 항목에 줄바꿈(`line-through`) 텍스트 스타일 적용
- `MetadataTable` 제네릭 컴포넌트로 카테고리/난이도 탭 코드 재사용

추가 구현 파일:
- `report-dialog.tsx`: 신고 접수 Dialog 컴포넌트. spec에는 없으나 `course-detail-view.tsx`에서 실제 사용되고 있음. `react-hook-form` + zod 폼 검증 적용.

---

### Phase 6: Pages

#### [23-26] Next.js 페이지 파일들

**상태: 정상 구현**

- `/operator/dashboard/page.tsx`: `'use client'` 지시어, `params: Promise<...>` 타입, `void params` 처리 정상.
- `/operator/reports/page.tsx`: 동일 패턴 정상.
- `/operator/reports/[reportId]/page.tsx`: `use(params)`로 `reportId` 추출하여 `ReportDetailPage`에 전달 정상.
- `/operator/metadata/page.tsx`: 동일 패턴 정상.

---

## Business Rules 검증

| BR # | 규칙 | 구현 상태 | 위치 |
|------|------|-----------|------|
| BR1 | operator 역할 전용 접근 | 정상 | `route.ts` 모든 operator 엔드포인트에 `requireOperatorRole` 적용 |
| BR2 | 신고 상태 단방향 전환 | 정상 | `service.ts` `updateReport` + `constants/index.ts` `ALLOWED_REPORT_STATUS_TRANSITIONS` |
| BR3 | resolved 전환 시 action 필수 | 정상 | `service.ts`: action 미선택 시 400 반환. `report-detail-page.tsx`: 버튼 disabled |
| BR4 | `invalidate_submission`은 `target_type=submission`에만 | 정상 | `service.ts` + `constants/index.ts` `ACTION_ALLOWED_TARGET_TYPES` |
| BR5 | `restrict_account`는 `target_type=user`에만, `is_restricted` 컬럼 필요 | 부분 정상 (migration 버그) | `service.ts` 로직 정상. migration 파일 SQL 구문 오류로 컬럼 추가 실패 가능 |
| BR6 | `warning`은 모든 대상 유형에 적용 가능 | 정상 | `ACTION_ALLOWED_TARGET_TYPES.warning` 에 4개 타입 모두 포함 |
| BR7 | 카테고리/난이도 name UNIQUE | 정상 | DB UNIQUE 제약 + `service.ts`에서 오류 코드 `23505` 감지로 409 반환 |
| BR8 | 물리적 삭제 대신 `is_active=false` 비활성화 | 정상 | `updateCategory`, `updateDifficultyLevel`에서 `is_active` 업데이트만 지원 |
| BR9 | 비활성화 후 기존 코스 연결 유지 | 정상 | `SET NULL`이 아닌 `is_active=false`만 변경. DB FK는 `ON DELETE SET NULL`로 물리 삭제 시 NULL 처리 |
| BR10 | 신고 접수 시 status='received' 자동 설정 | 정상 | `createReport` 서비스에서 `status: 'received'` 하드코딩 |
| BR11 | 신고 대상 유형 4종 | 정상 | schema, DB enum 모두 정의 |

---

## Edge Cases 검증

| E # | 상황 | 구현 상태 |
|-----|------|-----------|
| E1 | 미인증 사용자 접근 | 정상 (`extractUserId` 실패 시 401 반환) |
| E2 | Operator 아닌 역할 접근 | 정상 (`requireOperatorRole` 실패 시 403 반환) |
| E3 | `resolved` 신고 상태 변경 시도 | 정상 (400, "이미 처리 완료된 신고입니다.") |
| E4 | `received` → `resolved` 직접 전환 | 정상 (400, "조사 시작 후 처리 완료할 수 있습니다.") |
| E5 | `resolved` 전환 시 action 미선택 | 정상 (BE: 400, FE: 버튼 disabled) |
| E6 | 중복 카테고리 이름 추가 | 정상 (BE: 409, "이미 존재하는 카테고리입니다.") |
| E7 | 중복 난이도 이름 추가 | 정상 (BE: 409, "이미 존재하는 난이도입니다.") |
| E8 | 사용 중 카테고리 비활성화 | 정상 (`is_active=false`만 처리, 물리 삭제 없음) |
| E9 | 사용 중 난이도 비활성화 | 정상 (카테고리와 동일) |
| E10 | `invalidate_submission` 액션 + 제출물 아닌 경우 | 정상 (400, `OPERATOR_INVALID_ACTION`) |
| E11 | 존재하지 않는 ID 접근 | 정상 (404, `OPERATOR_NOT_FOUND`) |
| E12 | 네트워크 오류 | 정상 (각 훅 `onError`에서 에러 토스트 표시) |
| E13 | 빈 이름으로 카테고리/난이도 추가 | 정상 (FE: 저장 버튼 disabled, BE: `min(1)` 검증으로 400) |

---

## 발견된 문제점 요약

### 버그 (Bug) - 프로덕션 레벨 미충족

#### BUG-001: Migration 파일 SQL 구문 오류

**심각도: Critical**

**파일:** `supabase/migrations/0004_add_is_restricted_to_profiles.sql`

**문제:**
```sql
BEGIN;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false;
EXCEPTION WHEN others THEN   -- 잘못된 위치
  RAISE;
END;
```

일반 SQL 트랜잭션 블록(`BEGIN; ... END;`)에서는 `EXCEPTION` 절을 사용할 수 없다. `EXCEPTION` 절은 PL/pgSQL 블록(`DO $$ BEGIN ... EXCEPTION ... END $$;`) 내부에서만 유효하다.

`ADD COLUMN IF NOT EXISTS`가 이미 멱등성을 보장하므로 복잡한 예외 처리 없이 단순 트랜잭션으로 충분하다.

**수정 방법:**
```sql
-- Migration: profiles 테이블에 is_restricted 컬럼 추가 (UC-012 restrict_account 액션)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_restricted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_restricted IS '계정 제한 플래그 (operator restrict_account 액션 적용 시 true)';
```

이 버그가 수정되지 않으면 `restrict_account` 액션 실행 시 `profiles` 테이블에 `is_restricted` 컬럼이 없어 서비스 오류가 발생한다.

---

## 추가 구현 항목 (plan 초과, spec 지원)

spec의 BR10("신고 접수 시 status는 자동으로 received로 설정된다")을 지원하기 위한 추가 구현이 되어 있다. 이들은 plan 문서에는 없으나 spec 정신에 부합하며 프로덕션 품질을 갖추고 있다:

| 파일 | 설명 |
|------|------|
| `src/features/operator/backend/route.ts` (L33-56) | `POST /api/reports` 엔드포인트: 인증된 모든 사용자의 신고 접수 |
| `src/features/operator/backend/service.ts` (L629-697) | `createReport` 서비스 함수: 신고 생성 로직 |
| `src/features/operator/hooks/useCreateReportMutation.ts` | 신고 접수 Mutation 훅 |
| `src/features/operator/components/report-dialog.tsx` | 신고 접수 Dialog 컴포넌트 (react-hook-form + zod) |

`report-dialog.tsx`는 `src/features/course/components/course-detail-view.tsx`에서 실제 사용되고 있다.

---

## 최종 결론

### 구현 완료율: 약 97%

| 분류 | 항목 수 | 정상 구현 | 버그 있음 | 미구현 |
|------|---------|-----------|-----------|--------|
| Migration | 1 | 0 | 1 | 0 |
| Auth | 1 | 1 | 0 | 0 |
| Backend Schema | 1 | 1 | 0 | 0 |
| Backend Error | 1 | 1 | 0 | 0 |
| Backend Service | 1 | 1 | 0 | 0 |
| Backend Route | 1 | 1 | 0 | 0 |
| Hono App | 1 | 1 | 0 | 0 |
| DTO | 1 | 1 | 0 | 0 |
| Constants | 1 | 1 | 0 | 0 |
| Hooks | 10 | 10 | 0 | 0 |
| Components | 4 | 4 | 0 | 0 |
| Pages | 4 | 4 | 0 | 0 |
| **합계** | **27** | **26** | **1** | **0** |

UC-012의 모든 기능이 코드베이스에 구현되어 있으며, 아키텍처(schema → error → service → route, dto 재노출, React Query hooks, shadcn 컴포넌트)와 코드 품질이 프로덕션 수준에 부합한다.

단, `supabase/migrations/0004_add_is_restricted_to_profiles.sql` 파일의 SQL 구문 오류(BUG-001)가 수정되지 않으면 `restrict_account` 액션의 핵심 기능(BR5)이 정상 동작하지 않을 수 있다. 해당 마이그레이션을 Supabase에 실행하기 전에 반드시 SQL 구문을 수정해야 한다.

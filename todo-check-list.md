# TODO 점검 보고서

> 점검일: 2026-02-22
> 대상: usecase-checker 문서 기반 미구현 항목 7건 vs 실제 코드베이스 대조

---

## 요약

| 분류 | 건수 |
|------|------|
| ~~실제 미구현 (구현 필요)~~ 구현 완료 | 2건 |
| ~~UX 개선 필요~~ 구현 완료 | 1건 |
| 부분 구현 (보류) | 1건 |
| 오보 (이미 구현됨) | 3건 |

---

## 1. ~~실제 미구현~~ 구현 완료 — 2건

### 1-1. UC-001: `useSignupMutation` Hono API 미경유

| 항목 | 내용 |
|------|------|
| 파일 | `src/features/auth/hooks/useSignupMutation.ts` |
| 심각도 | **중간** |
| 상태 | **구현 완료** |

**현황**:
- ~~`getSupabaseBrowserClient()`로 Supabase SDK를 직접 호출하고 있음~~
- ~~`apiClient`, `signupResponseSchema`, `extractApiErrorMessage` import가 존재하나 **모두 미사용 (dead code)**~~
- ~~Hono 백엔드의 에러 처리(409 이메일 중복 등)가 프론트엔드에 전달되지 않음~~
- ~~아키텍처 규칙 위반 (다른 모든 API는 Hono 경유)~~

**적용 내용**:
- `apiClient.post('/api/auth/signup')` 경유로 Hono API 호출 확인 (기존 구현)
- Supabase 직접 호출(`signInWithPassword`)은 브라우저 세션 생성을 위해 필수이므로 유지하되 `createSession` 헬퍼로 분리하여 코드 구조 개선
- dead code import 정리 완료

---

### 1-2. UC-009a: FE 마감일 과거 날짜 클라이언트 검증 경고 누락

| 항목 | 내용 |
|------|------|
| 파일 | `src/features/assignment-management/backend/schema.ts` |
| 심각도 | **낮음** |
| 상태 | **구현 완료** |

**현황**:
- ~~BE는 `isPastDate` 함수로 검증하여 400 에러 반환~~
- ~~FE에서는 마감일이 과거인 경우 사전 경고 메시지 없음~~

**적용 내용**:
- FE: `assignment-form-page.tsx`에 이미 `createAssignmentBodySchema.refine()` 적용되어 클라이언트 검증 동작 중
- BE: `createAssignmentBodySchema`의 `dueDate` 필드에 `.refine()` 추가하여 서버 측 이중 검증 보강
```typescript
dueDate: z.string()
  .min(1, '마감일을 입력해주세요.')
  .refine((val) => new Date(val) > new Date(), '마감일은 미래 날짜여야 합니다.'),
```

---

## 2. ~~UX 개선 필요~~ 구현 완료 — 1건

### 2-1. UC-010: 재제출 요청 모드에서 score 필드 비활성화 미처리

| 항목 | 내용 |
|------|------|
| 파일 | `src/features/assignment-management/components/submission-grading-panel.tsx` |
| 심각도 | **낮음** |
| 상태 | **구현 완료** |

**현황**:
- ~~`handleGrade()`와 `handleResubmission()` 두 버튼이 독립적으로 작동~~
- ~~재제출 요청 시 score는 API body에 포함되지 않아 **기능적으로는 정상 동작**~~
- ~~score 필드가 항상 활성화 상태로 표시되어 사용자 혼란 가능~~

**적용 내용**:
- `isResubmissionMode` 상태 추가하여 채점/재제출 모드 토글 구현
- 재제출 모드 시 score input `disabled` 처리 및 placeholder 변경
- 모드별 제출 버튼 분리 (채점 완료 / 재제출 요청)
- 채점 모드에서는 재제출 요청 버튼이 비활성화되도록 `isGradeButtonDisabled`에 `isResubmissionMode` 조건 추가

---

## 3. 부분 구현 (보류) — 1건

### 3-1. UC-007: 코스 50건 이상 페이지네이션

| 항목 | 내용 |
|------|------|
| 파일 | `src/features/instructor-dashboard/backend/service.ts` |
| 심각도 | **낮음** |
| 상태 | **보류** (기존 코드와 충돌 발생) |

**현황**:
- BE: `.limit(20)` 조건 적용됨 (최근 생성순 상위 20건 로드)
- FE: 무한 스크롤 또는 "더 보기" 버튼 없음

**보류 사유**:
- 통합 API(`/api/instructor/dashboard`) 설계 변경 필요 (코스/제출물 페이지네이션 분리)
- 응답 스키마 변경으로 기존 클라이언트와 호환성 문제 발생
- React Query 캐싱 전략 재설계 필요
- 현재 20건 제한으로 최소 요건은 충족 중

---

## 4. 오보 (이미 구현됨) — 3건

| # | 항목 | 출처 | 확인 결과 |
|---|------|------|-----------|
| 1 | UC-002: 평균 평점 DB 스키마 부재 | `docs/002/usecase-checker.md` | `src/features/grades/backend/service.ts`에 가중 평균 계산 로직 구현됨 |
| 2 | UC-009b: `<Toaster />` 미마운트 | `docs/009/usecase-checker.md` | `src/app/providers.tsx`에 정상 마운트됨 |
| 3 | UC-011: Learner 화면 auto-close | `docs/011/usecase-checker.md` | `src/features/assignment-detail/backend/service.ts`에 auto-close 로직 구현됨 |

---

## 우선순위 권장

| 순위 | 항목 | 상태 |
|------|------|------|
| ~~1~~ | ~~UC-001: useSignupMutation Hono API 경유~~ | **완료** |
| ~~2~~ | ~~UC-009a: FE 마감일 클라이언트 검증~~ | **완료** |
| ~~3~~ | ~~UC-010: score 필드 비활성화~~ | **완료** |
| 4 | UC-007: 페이지네이션 UI | **보류** (충돌) |

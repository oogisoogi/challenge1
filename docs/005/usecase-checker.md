# UC-005 구현 점검 보고서: 과제 제출/재제출 (Learner)

검토 일시: 2026-02-20

---

## 1. 검토 개요

spec.md와 plan.md를 기반으로 UC-005(과제 제출/재제출) 기능의 구현 완료 여부를 코드베이스 전체에서 점검하였다.

---

## 2. Todo List (점검 항목)

### Phase 1: Backend Layer

- [ ] `schema.ts` — `submissionBodySchema`, `submissionResponseSchema` 추가
- [ ] `error.ts` — 제출 관련 에러 코드 추가
- [ ] `service.ts` — `createSubmission`, `updateSubmission` 함수 추가
- [ ] `route.ts` — `POST /api/courses/:courseId/assignments/:assignmentId/submissions` 추가
- [ ] `route.ts` — `PUT /api/courses/:courseId/assignments/:assignmentId/submissions` 추가

### Phase 2: Shared / Infrastructure

- [ ] `lib/dto.ts` — 새 스키마/타입 재노출 추가
- [ ] `hono/app.ts` — 라우터 등록 확인 (UC-004에서 이미 등록)

### Phase 3: Frontend Hooks

- [ ] `useSubmitMutation.ts` — POST 제출 mutation 훅 신규 생성
- [ ] `useResubmitMutation.ts` — PUT 재제출 mutation 훅 신규 생성

### Phase 4: Frontend Component

- [ ] `submission-zone.tsx` — react-hook-form 연결, mutation 호출, 라우터 이동
- [ ] `assignment-detail-page.tsx` — courseId, assignmentId prop 전달 확인

### DB Schema

- [ ] `submissions` 테이블 — `UNIQUE(assignment_id, learner_id)` 제약 확인
- [ ] `assignments` 테이블 — `allow_late`, `allow_resubmission`, `status`, `due_date` 컬럼 확인

---

## 3. 항목별 점검 결과

### 3-1. `src/features/assignment-detail/backend/schema.ts`

**상태: 완료**

`submissionBodySchema`와 `submissionResponseSchema`가 모두 추가되어 있다.

```typescript
// 제출 요청 body — content 필수, link 선택 (URL 형식 또는 빈 문자열)
export const submissionBodySchema = z.object({
  content: z.string().min(1, { message: '내용을 입력해주세요.' }),
  link: z.string().url({ message: '올바른 URL 형식을 입력해주세요.' }).optional().or(z.literal('')),
});

// 제출 응답
export const submissionResponseSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  learnerId: z.string().uuid(),
  content: z.string(),
  link: z.string().nullable(),
  isLate: z.boolean(),
  status: z.enum(['submitted', 'graded', 'resubmission_required']),
  submittedAt: z.string(),
});
```

spec의 모든 유효성 조건(E1, E2, BR2)이 스키마 레벨에서 정확히 구현되었다.

---

### 3-2. `src/features/assignment-detail/backend/error.ts`

**상태: 완료**

모든 제출 관련 에러 코드가 추가되어 있다.

```typescript
export const assignmentDetailErrorCodes = {
  unauthorized: 'ASSIGNMENT_DETAIL_UNAUTHORIZED',
  forbiddenRole: 'ASSIGNMENT_DETAIL_FORBIDDEN_ROLE',
  notEnrolled: 'ASSIGNMENT_DETAIL_NOT_ENROLLED',
  notFound: 'ASSIGNMENT_DETAIL_NOT_FOUND',
  fetchError: 'ASSIGNMENT_DETAIL_FETCH_ERROR',
  validationError: 'ASSIGNMENT_DETAIL_VALIDATION_ERROR',
  alreadySubmitted: 'ASSIGNMENT_SUBMISSION_ALREADY_SUBMITTED',
  lateNotAllowed: 'ASSIGNMENT_SUBMISSION_LATE_NOT_ALLOWED',
  assignmentClosed: 'ASSIGNMENT_SUBMISSION_CLOSED',
  resubmitNotAllowed: 'ASSIGNMENT_SUBMISSION_RESUBMIT_NOT_ALLOWED',
  notResubmitRequired: 'ASSIGNMENT_SUBMISSION_NOT_RESUBMIT_REQUIRED',
  submissionNotFound: 'ASSIGNMENT_SUBMISSION_NOT_FOUND',
} as const;
```

**참고:** plan.md의 Step 서술에서 `ASSIGNMENT_SUBMISSION_NOT_ENROLLED` 코드를 사용하도록 기재되어 있으나, Unit Test 섹션과 실제 구현에서는 기존 코드인 `ASSIGNMENT_DETAIL_NOT_ENROLLED`를 사용한다. plan.md 내 불일치이며, 구현은 plan.md의 Unit Test 기준 및 error.ts 정의와 일치하므로 정상으로 판단한다.

---

### 3-3. `src/features/assignment-detail/backend/service.ts`

**상태: 완료**

`createSubmission`과 `updateSubmission` 함수가 모두 구현되어 있다.

#### createSubmission 검증

| 단계 | spec 요구사항 | 구현 여부 |
|------|--------------|-----------|
| Step 1 | 수강 등록 검증 (enrollments.status='active') | 완료 |
| Step 2a | 과제 존재 여부 확인 (maybeSingle + null 체크) | 완료 |
| Step 2b | draft 상태 → 404 처리 (E12) | 완료 |
| Step 2c | closed 상태 → 400 처리 (E4) | 완료 |
| Step 3 | 기존 제출물 중복 확인 → 409 처리 (E5) | 완료 |
| Step 4 | 마감일 검증 + allow_late 검사 (BR3, BR4) | 완료 |
| Step 5 | INSERT — is_late, status='submitted', submitted_at | 완료 |
| Step 5 | link 빈 문자열 → null로 저장 (BR2) | 완료 |
| 응답 | 성공 시 201 반환 | 완료 |

#### updateSubmission 검증

| 단계 | spec 요구사항 | 구현 여부 |
|------|--------------|-----------|
| Step 1 | 수강 등록 검증 | 완료 |
| Step 2a | 과제 존재 여부 확인 | 완료 |
| Step 2b | allow_resubmission=false → 400 처리 (E6) | 완료 |
| Step 3a | 기존 제출물 없음 → 400 처리 (E7 변형) | 완료 |
| Step 3b | status != 'resubmission_required' → 400 처리 (E7) | 완료 |
| Step 4 | is_late 갱신 (BR9) | 완료 |
| Step 5 | UPDATE — content, link, is_late, status='submitted', submitted_at | 완료 |
| 응답 | 성공 시 200 반환 | 완료 |

---

### 3-4. `src/features/assignment-detail/backend/route.ts`

**상태: 완료**

POST와 PUT 엔드포인트 모두 구현되어 있다.

| 엔드포인트 | 인증 | 역할 검증 | 파라미터 검증 | Body 검증 | 서비스 호출 |
|-----------|------|----------|-------------|----------|-----------|
| POST `/api/courses/:courseId/assignments/:assignmentId/submissions` | 완료 (401) | 완료 (403, Learner only) | 완료 (UUID 검증) | 완료 (submissionBodySchema) | 완료 |
| PUT `/api/courses/:courseId/assignments/:assignmentId/submissions` | 완료 (401) | 완료 (403, Learner only) | 완료 (UUID 검증) | 완료 (submissionBodySchema) | 완료 |

---

### 3-5. `src/features/assignment-detail/lib/dto.ts`

**상태: 완료**

`submissionBodySchema`, `submissionResponseSchema`, `SubmissionBody`, `SubmissionResponse` 타입이 모두 재노출되어 있다.

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

### 3-6. `src/backend/hono/app.ts`

**상태: 완료**

`registerAssignmentDetailRoutes(app)`이 이미 등록되어 있으며, 동일 라우터 파일에 새 엔드포인트를 추가하였으므로 app.ts 변경 없이 정상 동작한다.

---

### 3-7. `src/features/assignment-detail/hooks/useSubmitMutation.ts`

**상태: 완료**

- `POST /api/courses/{courseId}/assignments/{assignmentId}/submissions` 호출
- `isLate` 여부에 따른 토스트 메시지 분기 (`"지각 제출이 완료되었습니다."` / `"제출이 완료되었습니다."`)
- 성공 후 `invalidateQueries` 실행
- 실패 시 `variant='destructive'` 토스트 표시
- `SubmissionBody` 타입으로 mutationFn 정의

---

### 3-8. `src/features/assignment-detail/hooks/useResubmitMutation.ts`

**상태: 완료**

- `PUT /api/courses/{courseId}/assignments/{assignmentId}/submissions` 호출
- 성공 후 `"재제출이 완료되었습니다."` 토스트 표시
- 성공 후 `invalidateQueries` 실행
- 실패 시 `variant='destructive'` 토스트 표시

---

### 3-9. `src/features/assignment-detail/components/submission-zone.tsx`

**상태: 완료 (단, 부분적 개선 여지 존재)**

- `react-hook-form` + `zodResolver(submissionBodySchema)` 연결 완료
- `useSubmitMutation` / `useResubmitMutation` 조건부 선택 로직 완료
- 버튼 로딩 상태 (`isPending + Loader2`) 완료
- 인라인 에러 메시지 표시 완료
- 성공 후 `router.push` 이동 완료
- 지각 제출 안내 문구 (AlertTriangle + 노란색 배너) 완료

**개선 여지 (버그 수준 아님):**

`resolveSubmissionState` 함수에서 `submission.status === 'submitted'` 케이스가 명시적으로 처리되지 않는다.

현재 로직:
1. `graded` 체크
2. `resubmission_required` 체크
3. `assignment.status === 'closed'` 체크
4. 마감일 체크 (기반 `active` 또는 `closed_deadline` 반환)

`submission.status === 'submitted'` 이고 마감 전 + `assignment.status === 'published'` 인 경우, `active` 상태가 반환되어 제출 폼이 다시 표시된다. 이 상태에서 사용자가 제출을 시도하면 BE에서 409 에러를 반환하고 에러 토스트가 표시된다. 데이터 정합성은 BE에서 보장되므로 기능 자체에는 문제가 없으나, UX 개선 관점에서 `submitted` 상태일 때 "이미 제출된 과제입니다." 안내와 함께 폼을 숨기는 것이 더 적절하다.

---

### 3-10. `src/features/assignment-detail/components/assignment-detail-page.tsx`

**상태: 완료**

`SubmissionZone`에 `courseId`와 `assignmentId`가 정상적으로 전달되고 있다.

```typescript
<SubmissionZone
  assignment={assignment}
  submission={submission}
  courseId={courseId}
  assignmentId={assignmentId}
/>
```

---

### 3-11. DB Schema (`supabase/migrations/0002_create_lms_schema.sql`)

**상태: 완료**

| 항목 | 확인 |
|------|------|
| `submissions.UNIQUE(assignment_id, learner_id)` | 완료 (BR8) |
| `assignments.allow_late` | 완료 |
| `assignments.allow_resubmission` | 완료 |
| `assignments.status` (draft/published/closed) | 완료 |
| `assignments.due_date` | 완료 |
| `submissions.is_late` | 완료 |
| `submissions.status` (submitted/graded/resubmission_required) | 완료 |
| `submissions.submitted_at` | 완료 |
| RLS 비활성화 | 완료 |

---

### 3-12. 페이지 경로

**상태: 계획 변경 반영됨**

spec.md에서는 제출 페이지를 `/courses/my/{courseId}/assignments/{assignmentId}/submit` 경로로 명시하였으나, plan.md에서 별도 라우트 신설 대신 기존 과제 상세 페이지(`/courses/my/{courseId}/assignments/{assignmentId}`)에 제출 폼을 통합하기로 변경하였다. 이 방침대로 구현되었다.

---

## 4. Edge Case 처리 검증

| # | 상황 | BE 처리 | FE 처리 | 결과 |
|---|------|---------|---------|------|
| E1 | Text 필드 빈 값 | - | zodResolver 인라인 에러 | 완료 |
| E2 | 유효하지 않은 URL link | - | zodResolver 인라인 에러 | 완료 |
| E3 | 마감 후 + allow_late=false | 400 LATE_NOT_ALLOWED | 에러 토스트 | 완료 |
| E4 | status='closed' 과제 | 400 ASSIGNMENT_CLOSED | 에러 토스트 | 완료 |
| E5 | 이미 제출물 존재 + POST | 409 ALREADY_SUBMITTED | 에러 토스트 | BE 완료, FE 사전 차단 없음 (개선 여지) |
| E6 | allow_resubmission=false + PUT | 400 RESUBMIT_NOT_ALLOWED | 에러 토스트 | 완료 |
| E7 | status != resubmission_required + PUT | 400 NOT_RESUBMIT_REQUIRED | 에러 토스트 | 완료 |
| E8 | 수강 등록 없음 | 403 NOT_ENROLLED | 에러 토스트 | 완료 |
| E9 | 미인증 사용자 | 401 UNAUTHORIZED | 에러 토스트 | 완료 |
| E10 | Instructor 역할 | 403 FORBIDDEN_ROLE | 에러 토스트 | 완료 |
| E11 | 네트워크 오류 | - | 에러 토스트, 폼 재입력 가능 | 완료 |
| E12 | status='draft' 과제 | 404 NOT_FOUND | 에러 토스트 | 완료 |

---

## 5. Business Rule 검증

| # | 규칙 | 구현 위치 | 결과 |
|---|------|----------|------|
| BR1 | published 상태 과제에만 제출 가능 | service.ts (draft/closed 분기) | 완료 |
| BR2 | content 필수, link 선택 | schema.ts | 완료 |
| BR3 | 마감 전: is_late=false, 마감 후: is_late=true | service.ts (isLate 계산) | 완료 |
| BR4 | 마감 후 + allow_late=false → 차단 | service.ts | 완료 |
| BR5 | 재제출: allow_resubmission=true AND status='resubmission_required' | service.ts | 완료 |
| BR6 | 재제출 시 content, link 덮어쓰기 (이력 미보관) | service.ts UPDATE | 완료 |
| BR7 | 재제출 시 status='submitted', submitted_at=now() | service.ts UPDATE | 완료 |
| BR8 | UNIQUE(assignment_id, learner_id) — DB 레벨 중복 방지 | DB migration | 완료 |
| BR9 | 재제출 시 is_late를 현재 시각 기준으로 갱신 | service.ts | 완료 |

---

## 6. 최종 평가

### 구현 완료 항목

| 모듈 | 파일 경로 | 상태 |
|------|----------|------|
| Schema | `src/features/assignment-detail/backend/schema.ts` | 완료 |
| Error | `src/features/assignment-detail/backend/error.ts` | 완료 |
| Service | `src/features/assignment-detail/backend/service.ts` | 완료 |
| Route | `src/features/assignment-detail/backend/route.ts` | 완료 |
| DTO | `src/features/assignment-detail/lib/dto.ts` | 완료 |
| Hono App | `src/backend/hono/app.ts` | 완료 (변경 불필요) |
| Submit Mutation | `src/features/assignment-detail/hooks/useSubmitMutation.ts` | 완료 |
| Resubmit Mutation | `src/features/assignment-detail/hooks/useResubmitMutation.ts` | 완료 |
| Submission Zone | `src/features/assignment-detail/components/submission-zone.tsx` | 완료 |
| Detail Page | `src/features/assignment-detail/components/assignment-detail-page.tsx` | 완료 |
| DB Migration | `supabase/migrations/0002_create_lms_schema.sql` | 완료 |

### 개선 여지 (프로덕션 차단 아님)

**항목 1: `submission.status === 'submitted'` 상태에서 FE 폼 미표시 처리 부재**

- 파일: `src/features/assignment-detail/components/submission-zone.tsx`
- 현상: 이미 제출 완료(`status='submitted'`) 상태인 경우, 마감 전 + `published` 과제이면 제출 폼이 다시 표시된다.
- 영향도: 사용자가 폼을 채워 제출하면 BE에서 409 에러 토스트가 표시되므로 데이터 무결성은 보장된다. 그러나 UX 관점에서 폼이 보이지 않아야 한다.
- 구현 계획:
  - `SubmissionState`에 `'already_submitted'` 상태 추가
  - `resolveSubmissionState` 함수에 `submission?.status === 'submitted'` 조건 추가 → `'already_submitted'` 반환
  - `SubmissionZone` 컴포넌트에 `state === 'already_submitted'` 분기 추가 → `<DisabledZone message="이미 제출한 과제입니다." />` 표시

### 총평

UC-005의 핵심 기능(신규 제출, 지각 제출, 재제출)은 모두 프로덕션 레벨로 구현되어 있다. spec의 모든 메인 시나리오(MS-1, MS-2, MS-3), 에지케이스(E1~E12), 비즈니스 규칙(BR1~BR9)이 BE와 FE 양쪽에서 검증된다. `UNIQUE(assignment_id, learner_id)` 제약으로 DB 레벨 안전장치도 존재한다.

단, FE의 `submission.status === 'submitted'` 상태에서 폼 미표시 처리가 부재하여 UX 개선이 권장된다. 이는 BE 방어 로직(409 반환)이 존재하므로 데이터 안전성에는 영향을 주지 않는다.

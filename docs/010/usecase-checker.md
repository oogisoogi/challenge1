# UC-010 제출물 채점 & 피드백 구현 점검 보고서

작성일: 2026-02-20

---

## 1. 점검 대상 개요

**유스케이스**: UC-010 제출물 채점 & 피드백 (Instructor)
**구현 피처 경로**: `src/features/assignment-management/`
**점검 기준**: spec.md(기능 명세), plan.md(구현 설계)

---

## 2. 점검 항목 Todo List

| # | 점검 항목 | 파일 경로 | 상태 |
|---|-----------|-----------|------|
| 1 | `submissionDetailItemSchema` (content, link, feedback 추가) | `backend/schema.ts` | 완료 |
| 2 | `gradeSubmissionBodySchema` (discriminatedUnion: grade/resubmission) | `backend/schema.ts` | 완료 |
| 3 | `gradeSubmissionResponseSchema` | `backend/schema.ts` | 완료 |
| 4 | `submissionIdParamSchema` | `backend/schema.ts` | 완료 |
| 5 | `assignmentManagementErrorCodes`에 `gradeFailed`, `submissionNotFound` 추가 | `backend/error.ts` | 완료 |
| 6 | `gradeSubmission` 서비스 함수 (소유권 검증, grade/resubmission 분기) | `backend/service.ts` | 완료 |
| 7 | `getAssignmentSubmissions` SELECT 쿼리에 content, link, feedback 추가 | `backend/service.ts` | 완료 |
| 8 | `PATCH /api/instructor/submissions/:submissionId/grade` 라우트 | `backend/route.ts` | 완료 |
| 9 | DTO 재노출 (신규 스키마/타입) | `lib/dto.ts` | 완료 |
| 10 | `ASSIGNMENT_MANAGEMENT_QUERY_KEYS.grade` 쿼리 키 추가 | `constants/index.ts` | 완료 |
| 11 | `GRADING_ACTION_LABELS` 상수 추가 | `constants/index.ts` | 완료 |
| 12 | `useGradeSubmissionMutation` 훅 | `hooks/useGradeSubmissionMutation.ts` | 완료 |
| 13 | `SubmissionGradingPanel` 컴포넌트 | `components/submission-grading-panel.tsx` | 완료 |
| 14 | `SubmissionListPage` 확장 (행 선택 + 채점 패널 연동) | `components/submission-list-page.tsx` | 완료 |
| 15 | `assignmentSubmissionsResponseSchema` submissions 타입을 `submissionDetailItemSchema`로 교체 | `backend/schema.ts` | 완료 |
| 16 | `registerAssignmentManagementRoutes` Hono app 등록 | `backend/hono/app.ts` | 완료 |

---

## 3. 모듈별 상세 점검 결과

### 3-1. Backend Schema (`src/features/assignment-management/backend/schema.ts`)

**상태: 정상 구현**

- `submissionDetailItemSchema`: `submissionItemSchema.extend({ content, link, feedback })` 올바르게 정의됨
- `gradeSubmissionBodySchema`: `z.discriminatedUnion('action', [...])` 패턴 사용, `grade` 액션 시 `score` 필수(0~100 정수), `resubmission` 액션 시 `feedback`만 필수
- `gradeSubmissionResponseSchema`: id, status, score, feedback, gradedAt, updatedAt 포함
- `submissionIdParamSchema`: UUID 검증 포함
- `assignmentSubmissionsResponseSchema`의 `submissions` 배열이 `submissionDetailItemSchema`를 사용하여 content, link, feedback 필드 포함

```typescript
// schema.ts 핵심 코드
export const gradeSubmissionBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('grade'),
    score: z.number().int('점수는 정수여야 합니다.').min(0, ...).max(100, ...),
    feedback: z.string().min(1, '피드백을 입력해주세요.'),
  }),
  z.object({
    action: z.literal('resubmission'),
    feedback: z.string().min(1, '피드백을 입력해주세요.'),
  }),
]);
```

### 3-2. Backend Error (`src/features/assignment-management/backend/error.ts`)

**상태: 정상 구현**

- `gradeFailed: 'ASSIGNMENT_MGMT_GRADE_FAILED'` 추가 확인
- `submissionNotFound: 'ASSIGNMENT_MGMT_SUBMISSION_NOT_FOUND'` 추가 확인
- 기존 에러 코드와의 중복 없음

### 3-3. Backend Service (`src/features/assignment-management/backend/service.ts`)

**상태: 정상 구현 (개선 가능 사항 1건 존재)**

- `gradeSubmission` 함수:
  - submissions → assignments → courses JOIN 쿼리로 소유권 검증 (BR1)
  - `submissionNotFound` 404 처리 (E6)
  - `forbidden` 403 처리 (E5)
  - `action === 'grade'`: score, feedback, status='graded', graded_at 업데이트 (BR6)
  - `action === 'resubmission'`: feedback, status='resubmission_required'만 업데이트, score/graded_at 유지 (BR7)
  - 이미 graded/resubmission_required 상태여도 허용 (E3, E4, BR8)
  - DB 오류 시 `gradeFailed` 500 반환
- `getAssignmentSubmissions` 함수: SELECT에 `content, link, feedback` 추가됨, `mapRawSubmission`에서 SubmissionDetailItem으로 매핑

**개선 가능 사항**: `graded_at`을 `new Date().toISOString()` (JS 서버 시간)으로 설정하고 있음. spec에서는 `graded_at=now()` (DB 서버 시간)를 요구하나, 기능적 차이는 없음. 분산 환경에서의 clock skew를 최소화하려면 Supabase의 `now()` 함수 사용이 권장됨.

### 3-4. Backend Route (`src/features/assignment-management/backend/route.ts`)

**상태: 정상 구현**

`PATCH /api/instructor/submissions/:submissionId/grade` 라우트:
- `extractUserId` → 401 처리
- `requireInstructorRole` → 403 처리 (E7)
- `submissionIdParamSchema` 파라미터 검증 → 400 처리
- `gradeSubmissionBodySchema` 바디 검증 → 400 처리 (E1, E2, E9)
- `gradeSubmission` 서비스 함수 호출 후 `respond`

### 3-5. DTO 재노출 (`src/features/assignment-management/lib/dto.ts`)

**상태: 정상 구현**

plan에서 요구한 모든 스키마/타입이 재노출됨:
- `submissionDetailItemSchema`, `gradeSubmissionBodySchema`, `gradeSubmissionResponseSchema`, `submissionIdParamSchema`
- `SubmissionDetailItem`, `GradeSubmissionBody`, `GradeSubmissionResponse`, `SubmissionIdParam`

### 3-6. Constants (`src/features/assignment-management/constants/index.ts`)

**상태: 정상 구현**

- `ASSIGNMENT_MANAGEMENT_QUERY_KEYS.grade` 추가됨
- `GRADING_ACTION_LABELS` 추가됨
- `GradingAction` 타입 추가됨

### 3-7. useGradeSubmissionMutation (`src/features/assignment-management/hooks/useGradeSubmissionMutation.ts`)

**상태: 정상 구현**

- `apiClient.patch('/api/instructor/submissions/${submissionId}/grade', body)` 호출
- `gradeSubmissionResponseSchema.parse(data)` 응답 검증
- `onSuccess`: `ASSIGNMENT_MANAGEMENT_QUERY_KEYS.submissions(assignmentId, 'all')` 및 `.all` 캐시 무효화
- `onSuccess`: 성공 토스트 (액션별 메시지 분기)
- `onError`: 에러 토스트 (E8)

### 3-8. SubmissionGradingPanel (`src/features/assignment-management/components/submission-grading-panel.tsx`)

**상태: 정상 구현 (UX 개선 사항 1건 존재)**

- `react-hook-form` + `zodResolver` 사용
- 기존 score, feedback prefill (E3, E4 허용)
- 제출자 이름, 제출 시각, 지각 여부 배지 표시
- 제출 내용(content) 읽기 전용 표시
- 링크(link) 조건부 렌더링 (E10에서 링크 없을 때 미표시)
- 이전 채점 정보(graded 상태이거나 feedback 존재 시) 표시
- 점수 input: min=0, max=100, step=1 (E1, E9)
- 피드백 textarea: 필수 입력
- `isGradeButtonDisabled`: isPending || !feedback || score === null (E2)
- `isResubmissionButtonDisabled`: isPending || !feedback (E2)
- 처리 중 Loader2 스피너
- 닫기(X) 버튼 → `onClose` 호출

**UX 개선 가능 사항**: plan QA 시트 #14번 항목 - "재제출 요청 모드에서 score 필드 비활성화" 미구현. 현재 두 버튼 모두 독립 클릭 방식이므로 재제출 요청 버튼 클릭 시 score는 API body에 포함되지 않아 기능적으로는 정상 동작함. 다만 UX적으로 score 필드가 재제출 요청 시에는 비활성화 상태로 표시되지 않아 사용자 혼란이 있을 수 있음.

### 3-9. SubmissionListPage (`src/features/assignment-management/components/submission-list-page.tsx`)

**상태: 정상 구현 (UX 버그 1건 존재)**

- `selectedSubmission` 상태 관리 구현됨
- 행 클릭 → `setSelectedSubmission(submission)`
- 선택된 행 하이라이트 (`bg-muted/50`)
- 2컬럼 레이아웃: `grid-cols-1 lg:grid-cols-2` (패널 있을 때) / `grid-cols-1` (패널 없을 때)
- 빈 상태 메시지: "아직 제출된 과제가 없습니다." (E10)
- 패널 닫기 → `setSelectedSubmission(null)`
- `useAssignmentSubmissionsQuery(assignmentId, 'all')` 고정 호출 후 FE에서 필터링
- 쿼리 무효화는 mutation hook에서 처리

**UX 버그**: 채점 완료 후 캐시 무효화로 목록이 갱신되어도, `selectedSubmission` 상태가 이전 데이터를 유지하고 있어 채점 패널의 "이전 채점 정보" 섹션이 갱신 전 데이터를 표시함. 즉, 채점 성공 후 패널에는 여전히 이전 상태(예: status='submitted')가 표시될 수 있음.

**구현 방안**: `data?.submissions`에서 `selectedSubmission.id`와 일치하는 최신 항목을 찾아 `selectedSubmission`을 동기화하는 로직 추가 필요.

```typescript
// 수정 방안 예시
const syncedSubmission = useMemo(
  () => submissions.find((s) => s.id === selectedSubmission?.id) ?? null,
  [submissions, selectedSubmission?.id],
);
// SubmissionGradingPanel에 selectedSubmission 대신 syncedSubmission 전달
```

---

## 4. Business Rules 점검

| BR # | 규칙 | 구현 상태 | 근거 |
|------|------|-----------|------|
| BR1 | 채점은 해당 코스의 Instructor만 수행 | 완료 | `service.ts`의 `gradeSubmission`: courses JOIN 후 instructor_id 검증 → 403 |
| BR2 | 점수는 0~100 정수만 허용 | 완료 | `gradeSubmissionBodySchema`의 `.int().min(0).max(100)`, input `min/max/step` |
| BR3 | 피드백 필수 입력 | 완료 | 스키마 `.min(1)`, 버튼 disabled 로직 |
| BR4 | 버튼 클릭 시점에만 DB 반영 | 완료 | form.handleSubmit 후 mutation 실행 |
| BR5 | 버튼 클릭 전 피드백 Learner 미노출 | 완료 | DB 반영 없으므로 자동 보장 |
| BR6 | 채점 완료 시 status='graded', graded_at 기록 | 완료 | `service.ts` updateFields 분기 |
| BR7 | 재제출 요청 시 status='resubmission_required', score/graded_at 유지 | 완료 | `service.ts` updateFields에 score, graded_at 미포함 |
| BR8 | 이미 채점된 제출물도 재채점 가능 | 완료 | 상태 사전 검사 없이 UPDATE 허용 |
| BR9 | 채점 결과 Learner 대시보드 즉시 반영 | 완료 | `learner-dashboard/backend/service.ts`의 `getLearnerDashboard`에서 submissions 테이블 직접 조회 |

---

## 5. Edge Cases 점검

| E # | 상황 | 구현 상태 | 근거 |
|-----|------|-----------|------|
| E1 | 점수 0~100 범위 이탈 | 완료 | input `min/max`, BE `gradeSubmissionBodySchema` |
| E2 | 피드백 미입력 | 완료 | 버튼 disabled, BE 스키마 `.min(1)` |
| E3 | 이미 graded 상태 재채점 | 완료 | 상태 선검사 없이 덮어쓰기 허용 |
| E4 | resubmission_required 상태 채점 | 완료 | 상태 선검사 없이 허용 |
| E5 | 타 Instructor 코스 채점 시도 | 완료 | 403 Forbidden 반환 |
| E6 | 미인증 사용자 접근 | 완료 | `extractUserId` null → 401 반환 |
| E7 | Learner 역할 채점 시도 | 완료 | `requireInstructorRole` → 403 반환 |
| E8 | 네트워크 오류 채점 실패 | 완료 | `onError` 에러 토스트, 폼 입력값 유지 |
| E9 | 소수점 점수 입력 | 완료 | input `step=1`, BE `.int()` 검증 |
| E10 | 제출물 0건 | 완료 | "아직 제출된 과제가 없습니다." 빈 상태 UI |

---

## 6. 시나리오별 흐름 점검

### MS-1. 제출물 목록 조회

| 단계 | 구현 상태 | 비고 |
|------|-----------|------|
| FE가 GET /api/instructor/assignments/{assignmentId}/submissions 요청 | 완료 | `useAssignmentSubmissionsQuery` |
| BE 인증 및 역할 검증 | 완료 | `extractUserId`, `requireInstructorRole` |
| BE 과제 소유권 확인 | 완료 | `getAssignmentSubmissions`의 `instructor_id` 검증 |
| submissions 조회 (learner 이름, 제출 시각, 상태, 점수, 지각 여부) | 완료 | JOIN 쿼리 및 `mapRawSubmission` |
| 상태별 필터링 기능 | 완료 | `SubmissionFilterTabs` + FE `filterSubmissions` |

### MS-2. 제출물 상세 열람

| 단계 | 구현 상태 | 비고 |
|------|-----------|------|
| 제출물 선택 시 상세 영역 표시 | 완료 | 행 클릭 → `SubmissionGradingPanel` |
| content, link, 제출 시각, 지각 여부 표시 | 완료 | 패널 내 각 섹션 |
| 채점 입력 폼 (점수, 피드백, 버튼) | 완료 | `react-hook-form` 기반 |

### MS-3. 채점 완료

| 단계 | 구현 상태 | 비고 |
|------|-----------|------|
| 클라이언트 유효성 검사 | 완료 | `form.trigger`, disabled 버튼 |
| PATCH /api/instructor/submissions/{submissionId}/grade 요청 | 완료 | `useGradeSubmissionMutation` |
| BE 검증 및 DB UPDATE | 완료 | `gradeSubmission` 서비스 |
| 성공 토스트 표시 | 완료 | `onSuccess` toast |
| 목록 상태 갱신 | 완료 | `invalidateQueries` |

### MS-4. 재제출 요청

| 단계 | 구현 상태 | 비고 |
|------|-----------|------|
| 피드백 필수 입력 검사 | 완료 | disabled 버튼, `form.trigger('feedback')` |
| PATCH 요청 (action: 'resubmission') | 완료 | `handleResubmission` |
| BE: score, graded_at 유지 | 완료 | updateFields에 미포함 |
| 성공 토스트 표시 | 완료 | `onSuccess` toast |

---

## 7. 최종 결론

### 전체 구현 상태: 핵심 기능 완료, 개선 사항 2건 발견

**구현 완료된 항목**: plan.md에서 정의한 9개 모듈 모두 구현됨. spec.md의 4개 메인 시나리오, 10개 에지 케이스, 9개 비즈니스 룰 모두 처리됨.

---

### 발견된 이슈

#### [이슈 1] 채점 패널 내 selectedSubmission 상태 미동기화 (UX 버그)

- **심각도**: 보통
- **위치**: `src/features/assignment-management/components/submission-list-page.tsx`
- **현상**: 채점/재제출 요청 성공 후 `invalidateQueries`로 목록 데이터는 갱신되지만, `selectedSubmission` 상태가 갱신 전 데이터를 유지하여 채점 패널의 "이전 채점 정보" 섹션과 제출자 상태 배지가 구버전을 표시함.
- **구현 방안**:
  ```typescript
  // submission-list-page.tsx
  const { data, ... } = useAssignmentSubmissionsQuery(assignmentId, 'all');
  const { assignment, submissions } = data;

  // 최신 submissions 데이터로 selectedSubmission 동기화
  const syncedSubmission = useMemo(
    () => submissions.find((s) => s.id === selectedSubmission?.id) ?? null,
    [submissions, selectedSubmission?.id],
  );

  // SubmissionGradingPanel에 syncedSubmission 전달
  {syncedSubmission && (
    <SubmissionGradingPanel
      submission={syncedSubmission}
      assignmentId={assignmentId}
      onClose={() => setSelectedSubmission(null)}
    />
  )}
  ```

#### [이슈 2] 재제출 요청 모드에서 score 필드 비활성화 미구현 (UX 개선 사항)

- **심각도**: 낮음
- **위치**: `src/features/assignment-management/components/submission-grading-panel.tsx`
- **현상**: plan QA 시트 #14번 요구사항 - 재제출 요청 버튼 클릭 시 score 필드가 비활성화 상태여야 하나, 현재는 항상 활성화됨. 기능적으로 재제출 요청 시 score는 API body에 포함되지 않으므로 동작은 정상.
- **구현 방안**: 현재 구현은 버튼 클릭 기반의 명시적 액션 방식이므로, "재제출 요청" 버튼 hover/클릭 의도 표시 시 score 필드 비활성화 처리 가능. 단, 현행 UX 구조에서는 두 버튼이 독립적으로 동작하므로 구조적 변경 없이도 score 미포함 동작이 보장됨.

#### [이슈 3] graded_at JS 서버 시간 사용 (개선 가능 사항)

- **심각도**: 낮음
- **위치**: `src/features/assignment-management/backend/service.ts` L566
- **현상**: `graded_at: new Date().toISOString()`으로 JS 서버 시간을 사용. spec에서는 `graded_at=now()` (DB 서버 시간)를 요구. 기능적 차이는 미미하나, DB 레벨에서 처리하는 것이 정합성에 유리.
- **구현 방안**: Supabase에서 직접 `now()` 함수를 사용하거나, SQL raw를 통해 DB 서버 시간을 지정하는 방식으로 변경 가능.

---

### 점검 요약표

| 구분 | 항목 수 | 완료 | 이슈 |
|------|---------|------|------|
| Backend Schema | 5개 스키마/타입 | 5개 | 0건 |
| Backend Error | 2개 에러 코드 | 2개 | 0건 |
| Backend Service | 2개 함수 (gradeSubmission, getAssignmentSubmissions 확장) | 2개 | 1건 (개선 사항) |
| Backend Route | 1개 엔드포인트 | 1개 | 0건 |
| DTO | 4개 스키마 재노출 | 4개 | 0건 |
| Constants | 2개 상수 | 2개 | 0건 |
| Frontend Hook | 1개 mutation hook | 1개 | 0건 |
| Frontend Component (Panel) | 1개 신규 컴포넌트 | 1개 | 1건 (UX 개선) |
| Frontend Component (List) | 1개 수정 | 1개 | 1건 (UX 버그) |
| Hono app 등록 | 등록 확인 | 완료 | 0건 |
| DB Migration | 변경 불필요 확인 | 완료 | 0건 |
| BR 점검 | 9개 | 9개 | 0건 |
| Edge Case 점검 | 10개 | 10개 | 0건 |

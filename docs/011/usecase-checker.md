# UC-011 구현 점검 보고서: Assignment 게시/마감

작성일: 2026-02-20

---

## 1. 점검 범위 및 방법

spec.md와 plan.md를 기반으로 아래 9개 모듈의 프로덕션 레벨 구현 여부를 코드베이스에서 직접 확인하였다.

| # | 모듈 | 파일 경로 |
|---|------|-----------|
| 1 | Backend Schema | `src/features/assignment-management/backend/schema.ts` |
| 2 | Backend Error | `src/features/assignment-management/backend/error.ts` |
| 3 | Backend Service | `src/features/assignment-management/backend/service.ts` |
| 4 | Backend Route | `src/features/assignment-management/backend/route.ts` |
| 5 | Constants | `src/features/assignment-management/constants/index.ts` |
| 6 | DTO | `src/features/assignment-management/lib/dto.ts` |
| 7 | useUpdateAssignmentStatusMutation | `src/features/assignment-management/hooks/useUpdateAssignmentStatusMutation.ts` |
| 8 | AssignmentStatusButton | `src/features/assignment-management/components/assignment-status-button.tsx` |
| 9 | SubmissionListPage 수정 | `src/features/assignment-management/components/submission-list-page.tsx` |

---

## 2. TODO 리스트 (점검 항목)

### Backend 계층

- [x] `updateAssignmentStatusBodySchema` 추가 (status: 'published' | 'closed')
- [x] 에러 코드 `invalidStatusTransition`, `courseNotPublished`, `missingTitle`, `pastDueDateOnPublish` 추가
- [x] `updateAssignmentStatus` 서비스 함수 구현
  - [x] 과제 조회 및 소유권 검증
  - [x] closed → published 역방향 전환 차단 (E5)
  - [x] published → published 중복 전환 차단 (E3)
  - [x] draft → closed 잘못된 전환 차단 (E4)
  - [x] 게시 전 필수 조건 검증: 제목 존재 (E1), 마감일 미래 (E2), 코스 published (E6)
  - [x] DB UPDATE 수행 및 응답 반환
- [x] `getAssignmentSubmissions`에 auto-close 로직 삽입 (BR5, BR9, MS-3)
- [x] `PATCH /api/instructor/assignments/:assignmentId/status` 엔드포인트 추가
  - [x] 인증 검증 (E8)
  - [x] Instructor 역할 검증 (E9)
  - [x] 파라미터 파싱 검증
  - [x] 요청 바디 파싱 검증
  - [x] 서비스 호출 및 응답

### Frontend 계층

- [x] 상태 전환 규칙 상수 `ALLOWED_ASSIGNMENT_STATUS_TRANSITIONS` 추가
- [x] 전환 버튼 설정 상수 `ASSIGNMENT_STATUS_TRANSITION_CONFIG` 추가
- [x] 상태 배지 레이블 상수 `ASSIGNMENT_STATUS_LABELS` 추가
- [x] 상태 배지 variant 상수 `ASSIGNMENT_STATUS_VARIANTS` 추가
- [x] `updateAssignmentStatusBodySchema` DTO 재노출
- [x] `useUpdateAssignmentStatusMutation` 훅 구현
  - [x] PATCH 요청 전송
  - [x] 성공 시 submissions 쿼리 및 detail 쿼리 무효화
  - [x] 성공/에러 토스트
- [x] `AssignmentStatusButton` 컴포넌트 구현
  - [x] closed 상태 시 null 반환 (버튼 미표시)
  - [x] draft → "게시" 버튼, published → "마감" 버튼 표시
  - [x] 클릭 시 확인 다이얼로그 표시
  - [x] 처리 중 버튼 disabled 및 "처리 중..." 텍스트
  - [x] 확인 버튼 클릭 시 mutation 호출
  - [x] 성공 시 다이얼로그 닫힘
- [x] `SubmissionListPage` 헤더 개선
  - [x] 상태 배지를 `ASSIGNMENT_STATUS_LABELS`, `ASSIGNMENT_STATUS_VARIANTS` 기반으로 변경
  - [x] `AssignmentStatusButton` 통합

### Learner 화면 반영 (MS-4)

- [x] assignment-detail 서비스에서 closed 상태 과제 반환
- [x] `SubmissionZone` 컴포넌트에서 `status === 'closed'` 시 제출 버튼 비활성화
- [x] `AssignmentMeta` 컴포넌트에서 "마감됨" 뱃지 표시 (due_date 기반)
- [ ] assignment-detail 서비스의 `getAssignmentDetail`에 auto-close 삽입 (미구현, 상세 아래 기술)

---

## 3. 모듈별 구현 점검 결과

### 3-1. Backend Schema (`schema.ts`) - 구현 완료

```typescript
// 상태 전환 요청 스키마 (draft 역방향 전환은 스키마 레벨에서 차단)
export const updateAssignmentStatusBodySchema = z.object({
  status: z.enum(['published', 'closed']),
});
export type UpdateAssignmentStatusBody = z.infer<typeof updateAssignmentStatusBodySchema>;
```

spec 요건 충족: `draft` 전달 시 스키마 레벨에서 파싱 실패(400 반환). `published`, `closed`만 허용.

---

### 3-2. Backend Error (`error.ts`) - 구현 완료

아래 4개 에러 코드가 추가되었으며 기존 코드와 충돌 없음.

```typescript
invalidStatusTransition: 'ASSIGNMENT_MGMT_INVALID_STATUS_TRANSITION',
courseNotPublished: 'ASSIGNMENT_MGMT_COURSE_NOT_PUBLISHED',
missingTitle: 'ASSIGNMENT_MGMT_MISSING_TITLE',
pastDueDateOnPublish: 'ASSIGNMENT_MGMT_PAST_DUE_DATE_ON_PUBLISH',
```

| 에러 코드 | HTTP | 대응 Edge Case |
|---|---|---|
| `INVALID_STATUS_TRANSITION` | 400 | E3, E4, E5 |
| `COURSE_NOT_PUBLISHED` | 400 | E6 |
| `MISSING_TITLE` | 400 | E1 |
| `PAST_DUE_DATE_ON_PUBLISH` | 400 | E2 |

---

### 3-3. Backend Service (`service.ts`) - 구현 완료

**`updateAssignmentStatus` 함수:**

- 과제 조회 후 `courses.instructor_id !== userId` 시 403 반환 (E7, BR8)
- `closed → published` 시 "마감된 과제는 다시 게시할 수 없습니다" 400 반환 (E5, BR1)
- `published → published` 시 "이미 게시된 과제입니다" 400 반환 (E3)
- `draft → closed` 시 "게시 상태의 과제만 마감할 수 있습니다" 400 반환 (E4)
- 게시 전 필수 조건 검증: 제목 누락(E1), 마감일 과거(E2), 코스 비게시(E6) 모두 처리
- DB UPDATE 후 갱신된 과제 데이터 반환

**`getAssignmentSubmissions` auto-close:**

```typescript
if (
  rawAssignment.status === 'published' &&
  !rawAssignment.allow_late &&
  new Date(rawAssignment.due_date) <= new Date()
) {
  await supabase
    .from(ASSIGNMENTS_TABLE)
    .update({ status: 'closed' })
    .eq('id', assignmentId)
    .eq('status', 'published'); // 동시성 안전: 이미 closed면 no-op
  rawAssignment.status = 'closed';
}
```

BR5(allow_late=false 자동 마감), BR5-1(allow_late=true 제외), BR9(조회 시점 체크) 모두 처리. 동시성 처리(E11)도 `.eq('status', 'published')` 조건으로 안전하게 처리됨.

---

### 3-4. Backend Route (`route.ts`) - 구현 완료

`PATCH /api/instructor/assignments/:assignmentId/status` 엔드포인트 추가.

등록 순서: `/api/instructor/assignments/:assignmentId`(96번째 줄) → `/api/instructor/assignments/:assignmentId/status`(149번째 줄). Hono는 경로 세그먼트 수를 기준으로 정확히 매칭하므로 순서로 인한 충돌 없음.

```
PATCH /api/instructor/assignments/:assignmentId        → 과제 수정
PATCH /api/instructor/assignments/:assignmentId/status → 상태 전환
```

인증(E8), Instructor 역할(E9), 파라미터 파싱, 바디 파싱 모두 처리됨.

---

### 3-5. Constants (`constants/index.ts`) - 구현 완료

plan.md에 명시된 4개 상수 모두 추가됨:

```typescript
ALLOWED_ASSIGNMENT_STATUS_TRANSITIONS  // BR1: 단방향 전환 규칙
ASSIGNMENT_STATUS_TRANSITION_CONFIG    // 버튼 라벨 및 다이얼로그 메시지
ASSIGNMENT_STATUS_LABELS               // 배지 레이블
ASSIGNMENT_STATUS_VARIANTS             // 배지 variant
```

---

### 3-6. DTO (`lib/dto.ts`) - 구현 완료

`updateAssignmentStatusBodySchema` 및 `UpdateAssignmentStatusBody` 타입 재노출 확인.

---

### 3-7. useUpdateAssignmentStatusMutation 훅 - 구현 완료

- `PATCH /api/instructor/assignments/${assignmentId}/status` 호출
- 성공 시 `submissions(assignmentId, 'all')`, `detail(assignmentId)` 쿼리 모두 무효화
- 성공/에러 토스트 처리
- `'use client'` 지시어 포함

---

### 3-8. AssignmentStatusButton 컴포넌트 - 구현 완료

- `ALLOWED_ASSIGNMENT_STATUS_TRANSITIONS` 기반 다음 상태 계산
- `closed` 상태 시 null 반환 (버튼 미표시)
- `draft` → "게시" 버튼, `published` → "마감" 버튼
- shadcn `Dialog` 확인 다이얼로그 표시
- `isPending` 상태 시 버튼 disabled 및 "처리 중..." 텍스트
- 성공 시 `setIsDialogOpen(false)` 호출로 다이얼로그 닫힘
- `'use client'` 지시어 포함

---

### 3-9. SubmissionListPage 수정 - 구현 완료

```tsx
<header className="space-y-2">
  <div className="flex items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      <h1 className="text-3xl font-semibold">{assignment.title}</h1>
      <Badge variant={ASSIGNMENT_STATUS_VARIANTS[assignment.status]}>
        {ASSIGNMENT_STATUS_LABELS[assignment.status]}
      </Badge>
    </div>
    <AssignmentStatusButton
      assignmentId={assignmentId}
      currentStatus={assignment.status}
    />
  </div>
  ...
</header>
```

plan.md의 목표 헤더 형태와 정확히 일치함. `AssignmentStatusButton` 통합 완료.

---

## 4. Hono 앱 등록 확인

`src/backend/hono/app.ts`에 `registerAssignmentManagementRoutes(app)` 이미 등록되어 있어 신규 PATCH 엔드포인트가 자동으로 포함됨. 별도 수정 불필요.

---

## 5. Learner 화면 반영 (MS-4) 점검

### 5-1. 마감됨 뱃지 표시

`src/features/assignment-detail/components/assignment-meta.tsx`에서 `due_date` 기반으로 "마감됨" 배지를 표시함. `status === 'closed'` 기반 배지는 `getStatusBadge` 함수에서 처리:

```typescript
const getStatusBadge = (status: AssignmentDetail['status']) => {
  if (status === 'published') return <Badge variant="default">진행중</Badge>;
  return <Badge variant="secondary">마감</Badge>;
};
```

### 5-2. 제출 버튼 비활성화

`src/features/assignment-detail/components/submission-zone.tsx`에서 `assignment.status === 'closed'` 시 `closed_status` 상태로 분기하여 "과제가 마감되었습니다." 메시지와 함께 제출 버튼 비활성화 처리됨. `allow_late` 기반 상태 분기도 정확히 구현됨.

### 5-3. 이미 제출된 과제 채점 결과 확인

`src/features/assignment-detail/components/submission-status.tsx`에서 `submitted`, `graded`, `resubmission_required` 상태별 배지 및 채점 정보 표시됨.

---

## 6. 미구현 항목 및 개선 필요 사항

### 6-1. Learner 과제 상세 접근 시 auto-close 미처리 (낮은 심각도)

**위치:** `src/features/assignment-detail/backend/service.ts` - `getAssignmentDetail` 함수

**현황:** plan.md에는 `getAssignmentSubmissions`(Instructor 화면)에만 auto-close 삽입이 명시되어 있으며, `getAssignmentDetail`(Learner 화면)에는 auto-close 처리가 없다.

**영향:** `allow_late=false` 과제에서 `due_date`가 지나면:
- Instructor 측: `getAssignmentSubmissions` 조회 시 자동 마감 처리됨
- Learner 측: `getAssignmentDetail` 조회 시 DB status는 여전히 `published`이나, 프론트엔드 `submission-zone.tsx`에서 마감일 기반으로 `closed_deadline` 상태를 계산해 제출 버튼 비활성화 처리됨

**결론:** Learner 화면에서의 제출 차단은 프론트엔드 방어 로직으로 커버됨. 단, DB status가 `published`인 상태에서 Learner가 과제 상세에 접근하면 `assignment.status`가 `published`로 반환되어 "진행중" 뱃지가 표시되고 "마감" 뱃지는 표시되지 않는다. Instructor가 Instructor 화면에 먼저 접근하거나 수동으로 마감해야 DB status가 `closed`로 변경된다.

**구현 계획 (개선 방안):**

```typescript
// src/features/assignment-detail/backend/service.ts
// getAssignmentDetail 함수 내 Step 2 이후에 삽입

// auto-close: allow_late=false이고 due_date <= now()이면 closed로 전환 (BR5, BR9)
const rawAssignment = assignmentRaw as unknown as RawAssignment;
if (
  rawAssignment.status === 'published' &&
  !rawAssignment.allow_late &&
  new Date(rawAssignment.due_date) <= new Date()
) {
  await supabase
    .from(ASSIGNMENTS_TABLE)
    .update({ status: 'closed' })
    .eq('id', assignmentId)
    .eq('status', 'published'); // 동시성 안전
  rawAssignment.status = 'closed';
}
```

이를 통해 Learner가 과제 상세에 접근하는 시점에도 auto-close가 발생하며, `status='closed'`가 응답에 포함되어 "마감" 배지가 정확히 표시된다.

---

## 7. 최종 점검 결과 요약

| 구분 | 항목 | 결과 |
|------|------|------|
| Phase 1 | Backend Schema 수정 | 완료 |
| Phase 1 | Backend Error 수정 | 완료 |
| Phase 1 | Backend Service 수정 (updateAssignmentStatus) | 완료 |
| Phase 1 | Backend Service 수정 (getAssignmentSubmissions auto-close) | 완료 |
| Phase 1 | Backend Route 수정 (PATCH /:assignmentId/status) | 완료 |
| Phase 2 | Constants 수정 | 완료 |
| Phase 2 | DTO 수정 | 완료 |
| Phase 3 | useUpdateAssignmentStatusMutation 신규 | 완료 |
| Phase 4 | AssignmentStatusButton 신규 | 완료 |
| Phase 4 | SubmissionListPage 수정 | 완료 |
| MS-4 | Learner 화면 마감됨 배지 표시 | 부분 완료 (주석 6-1 참조) |
| MS-4 | Learner 화면 제출 버튼 비활성화 | 완료 |
| BR5/BR9 | Instructor 화면 auto-close | 완료 |
| BR5/BR9 | Learner 화면 auto-close | 미구현 (개선 필요) |

### 총평

plan.md에 명시된 9개 모듈 모두 구현 완료. Business Rule BR1~BR9 및 Edge Case E1~E11 대부분 처리됨.

미구현 항목은 plan.md 범위에 명시되지 않은 `getAssignmentDetail` auto-close 1건으로, Learner 화면에서 `allow_late=false` 과제의 DB status가 `closed`로 자동 전환되지 않는 시나리오가 발생할 수 있다. 제출 차단은 프론트엔드에서 방어하고 있으나, status 배지 표시의 정확성을 위해 개선이 권장된다.

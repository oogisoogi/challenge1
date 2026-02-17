# Database Schema & Data Flow

## 1. 데이터플로우 (유저플로우 기준)

### 1-1. 역할 선택 & 온보딩

```
[Supabase Auth 계정 생성]
        │
        ▼
  profiles INSERT (id=auth.uid, role, name, phone, bio)
        │
        ▼
  terms_agreements INSERT (user_id, agreed_at)
```

### 1-2. 코스 탐색 & 수강신청/취소

```
  courses SELECT (status=published, 카테고리/난이도 필터, 정렬)
        │
        ▼
  enrollments UPSERT (course_id, learner_id, status=active)
        │  ── ON CONFLICT (course_id, learner_id) DO UPDATE SET status='active'
        │  ── 취소 후 재수강 시 기존 레코드 재활성화
        ▼
  enrollments UPDATE (status=cancelled)  ── 수강취소
```

### 1-3. Learner 대시보드

```
  enrollments (status=active) JOIN courses
        │
        ├─ 진행률: assignments(course_id) COUNT vs submissions(status=graded) COUNT
        ├─ 마감 임박: assignments WHERE due_date 근접 AND status=published
        └─ 최근 피드백: submissions WHERE feedback IS NOT NULL ORDER BY updated_at DESC
```

### 1-4. 과제 상세 열람

```
  assignments SELECT WHERE id=? AND status=published
        │
        ├─ enrollments 존재 여부 검증 (본인 코스 등록 확인)
        └─ status=closed → 제출 버튼 비활성화
```

### 1-5. 과제 제출/재제출

```
  assignments SELECT (due_date, allow_late, allow_resubmission, status)
        │
        ├─ 마감 전 → submissions INSERT (status=submitted, is_late=false)
        ├─ 마감 후 + allow_late=true → submissions INSERT (status=submitted, is_late=true)
        ├─ 마감 후 + allow_late=false → 차단
        └─ 재제출: submissions UPDATE (content, link, status=submitted)
            └─ allow_resubmission=true AND 기존 status=resubmission_required 검증
```

### 1-6. 성적 & 피드백 열람

```
  submissions SELECT WHERE learner_id=본인
        │
        ├─ 과제별: score, is_late, status, feedback
        └─ 코스별 총점: SUM(score * assignment.weight) / SUM(assignment.weight)
```

### 1-7. Instructor 대시보드

```
  courses SELECT WHERE instructor_id=본인
        │
        ├─ 채점 대기: submissions WHERE status=submitted COUNT (해당 코스들)
        └─ 최근 제출물: submissions ORDER BY created_at DESC (해당 코스들)
```

### 1-8. 코스 관리

```
  courses INSERT (title, description, category_id, difficulty_id, curriculum, status=draft)
  courses UPDATE (필드 수정, 상태 전환: draft→published→archived)
```

### 1-9. 과제 관리

```
  assignments INSERT (course_id, title, description, due_date, weight, allow_late, allow_resubmission, status=draft)
  assignments UPDATE (필드 수정, 상태 전환: draft→published→closed)
```

### 1-10. 제출물 채점 & 피드백

```
  submissions UPDATE  ── "채점 완료" 버튼 클릭 시점에만 DB 반영 (임시 저장 없음)
        │
        ├─ 점수 입력 → score=0~100, feedback, status=graded, graded_at=now()
        └─ 재제출 요청 → status=resubmission_required, feedback
```

### 1-11. 과제 게시/마감

```
  assignments UPDATE (status: draft→published→closed)
        └─ 마감일 이후 자동 closed (배치 또는 조회 시 체크)
```

### 1-12. 운영

```
  reports INSERT (reporter_id, target_type, target_id, reason, content, status=received)
  reports UPDATE (status 전환: received→investigating→resolved, action 기록)
        │
  categories / difficulty_levels CRUD (is_active 비활성화 처리)
```

---

## 2. Enum Types

```sql
CREATE TYPE user_role AS ENUM ('learner', 'instructor', 'operator');
CREATE TYPE course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE assignment_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE submission_status AS ENUM ('submitted', 'graded', 'resubmission_required');
CREATE TYPE enrollment_status AS ENUM ('active', 'cancelled');
CREATE TYPE report_target_type AS ENUM ('course', 'assignment', 'submission', 'user');
CREATE TYPE report_status AS ENUM ('received', 'investigating', 'resolved');
CREATE TYPE report_action AS ENUM ('warning', 'invalidate_submission', 'restrict_account');
```

---

## 3. 테이블 정의

### 3-1. profiles

> Supabase Auth(`auth.users`)와 1:1 연결되는 사용자 프로필.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK, FK → auth.users | Supabase Auth UID |
| role | user_role | NOT NULL | 역할 |
| name | text | NOT NULL | 이름 |
| phone | text | NOT NULL | 휴대폰번호 |
| bio | text | NOT NULL DEFAULT '' | 소개/약력 (주로 Instructor용) |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | 트리거 자동 갱신 |

### 3-2. terms_agreements

> 약관 동의 이력.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| user_id | uuid | NOT NULL, FK → profiles(id) | |
| agreed_at | timestamptz | NOT NULL DEFAULT now() | 동의 시각 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |

### 3-3. categories

> 코스 카테고리 메타데이터 (운영 관리).

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| name | text | NOT NULL UNIQUE | 카테고리명 |
| is_active | boolean | NOT NULL DEFAULT true | 비활성화 처리용 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

### 3-4. difficulty_levels

> 난이도 메타데이터 (운영 관리).

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| name | text | NOT NULL UNIQUE | 난이도명 |
| is_active | boolean | NOT NULL DEFAULT true | 비활성화 처리용 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

### 3-5. courses

> 코스 본체.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| instructor_id | uuid | NOT NULL, FK → profiles(id) | 소유 강사 |
| title | text | NOT NULL | 제목 |
| description | text | NOT NULL DEFAULT '' | 소개 |
| category_id | uuid | FK → categories(id) | 카테고리 |
| difficulty_id | uuid | FK → difficulty_levels(id) | 난이도 |
| curriculum | text | NOT NULL DEFAULT '' | 커리큘럼 |
| status | course_status | NOT NULL DEFAULT 'draft' | 상태 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

### 3-6. enrollments

> 수강 등록.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| course_id | uuid | NOT NULL, FK → courses(id) | |
| learner_id | uuid | NOT NULL, FK → profiles(id) | |
| status | enrollment_status | NOT NULL DEFAULT 'active' | |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

**제약**: `UNIQUE(course_id, learner_id)` — 중복 신청 방지.

### 3-7. assignments

> 과제.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| course_id | uuid | NOT NULL, FK → courses(id) | 소속 코스 |
| title | text | NOT NULL | 제목 |
| description | text | NOT NULL DEFAULT '' | 설명 |
| due_date | timestamptz | NOT NULL | 마감일 |
| weight | integer | NOT NULL DEFAULT 1 | 점수 비중 |
| allow_late | boolean | NOT NULL DEFAULT false | 지각 허용 |
| allow_resubmission | boolean | NOT NULL DEFAULT false | 재제출 허용 |
| status | assignment_status | NOT NULL DEFAULT 'draft' | 상태 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

### 3-8. submissions

> 과제 제출물.

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| assignment_id | uuid | NOT NULL, FK → assignments(id) | |
| learner_id | uuid | NOT NULL, FK → profiles(id) | |
| content | text | NOT NULL | 텍스트 (필수) |
| link | text | | URL (선택) |
| is_late | boolean | NOT NULL DEFAULT false | 지각 제출 여부 |
| status | submission_status | NOT NULL DEFAULT 'submitted' | |
| score | integer | CHECK (score >= 0 AND score <= 100) | 점수 |
| feedback | text | | 피드백 |
| submitted_at | timestamptz | NOT NULL DEFAULT now() | 제출 시각 |
| graded_at | timestamptz | | 채점 시각 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

**제약**: `UNIQUE(assignment_id, learner_id)` — 과제당 1제출 (재제출은 UPDATE).

### 3-9. reports

> 신고 (운영).

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | PK DEFAULT gen_random_uuid() | |
| reporter_id | uuid | NOT NULL, FK → profiles(id) | 신고자 |
| target_type | report_target_type | NOT NULL | 대상 유형 |
| target_id | uuid | NOT NULL | 대상 ID |
| reason | text | NOT NULL | 사유 |
| content | text | NOT NULL DEFAULT '' | 상세 내용 |
| status | report_status | NOT NULL DEFAULT 'received' | 처리 상태 |
| action | report_action | | 처리 액션 |
| created_at | timestamptz | NOT NULL DEFAULT now() | |
| updated_at | timestamptz | NOT NULL DEFAULT now() | |

---

## 4. ERD (관계도)

```
auth.users
    │ 1:1
    ▼
profiles ──< terms_agreements
    │
    ├──< courses ──< assignments ──< submissions >── profiles (learner)
    │       │                             ▲
    │       ▼                             │
    │   categories                        │
    │   difficulty_levels                 │
    │                                     │
    ├──< enrollments >── courses          │
    │                                     │
    └──< reports                          │
                                          │
         enrollments >────────────────────┘ (learner)
```

**관계 요약**

| 관계 | 카디널리티 | 설명 |
|---|---|---|
| profiles → courses | 1:N | 강사가 코스 소유 |
| profiles → enrollments | 1:N | 학습자가 수강 등록 |
| courses → enrollments | 1:N | 코스별 수강생 |
| courses → assignments | 1:N | 코스별 과제 |
| assignments → submissions | 1:N | 과제별 제출물 |
| profiles → submissions | 1:N | 학습자별 제출물 |
| profiles → terms_agreements | 1:N | 약관 동의 이력 |
| profiles → reports | 1:N | 신고 이력 |
| categories → courses | 1:N | 카테고리별 코스 |
| difficulty_levels → courses | 1:N | 난이도별 코스 |

---

## 5. 인덱스 권장

```sql
-- 코스 탐색 (카탈로그 필터/정렬)
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_courses_difficulty ON courses(difficulty_id);
CREATE INDEX idx_courses_created_at ON courses(created_at DESC);

-- 수강 조회
CREATE INDEX idx_enrollments_learner ON enrollments(learner_id, status);
CREATE INDEX idx_enrollments_course ON enrollments(course_id, status);

-- 과제 조회 (마감 임박 등)
CREATE INDEX idx_assignments_course_status ON assignments(course_id, status);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- 제출물 조회 (채점 대기 등)
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id, status);
CREATE INDEX idx_submissions_learner ON submissions(learner_id);

-- 신고 조회
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_target ON reports(target_type, target_id);
```

---

## 6. updated_at 자동 갱신 트리거

모든 테이블에 공통 적용:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

적용 대상: `profiles`, `categories`, `difficulty_levels`, `courses`, `enrollments`, `assignments`, `submissions`, `reports`

---

## 7. 콘텐츠 포맷 & 운영 규칙

- **Markdown 지원 필드**: `courses.description`, `courses.curriculum`, `assignments.description`, `submissions.content`, `profiles.bio` — 클라이언트에서 Markdown 렌더링 적용.
- **채점 반영 시점**: `submissions`의 `score`, `feedback`, `status` 변경은 강사의 "채점 완료" 버튼 클릭 시에만 단일 UPDATE로 반영한다. 임시 저장 없음.
- **재수강(UPSERT)**: `enrollments`는 `UNIQUE(course_id, learner_id)` 제약 하에 `ON CONFLICT DO UPDATE SET status='active'`로 처리하여 취소 후 재수강을 지원한다.

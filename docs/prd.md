# PRD

## 1. 제품 개요

강사가 코스를 개설·운영하고, 학습자가 수강·과제 제출·피드백 수령까지 할 수 있는 경량 LMS 형태의 웹 앱.
**핵심 목표**는 (1) 역할 기반 플로우의 정확한 가드, (2) 마감/지각/재제출 등 **상태 기반 비즈니스 룰** 구현, (3) 문서 주도(Usecase) 개발 프로세스의 실전 적용이다. 인증은 **Supabase Auth** 기반으로 운영.

## 2. Stakeholders

* **Learner**: 코스 탐색/수강/과제 제출/점수·피드백 확인
* **Instructor**: 코스·과제 개설/게시, 제출물 채점/피드백/재제출 관리
* **운영(옵션)**: 부정행위/신고 처리, 메타데이터 관리

## 3. 포함 페이지

1. **홈/카탈로그**

   * 코스 리스트(검색/필터: 카테고리, 난이도, 최신/인기 정렬)
   
2. **인증 & 온보딩**

   * 이메일 회원가입/로그인
   * 역할 선택(강사/학습자) 및 최소 프로필
   
3. **코스 상세**

   * 소개/커리큘럼/강사 정보/수강생 수/평균 평점(모의)
   * 수강신청/취소(권한·상태 가드)
   
4. **Learner 대시보드**

   * 내 코스, 진행률, 마감 임박 과제, 최근 피드백
   
5. **Assignment 상세(학습자)**

   * 요구사항/마감/점수 비중/지각 정책
   * 제출/재제출, 상태 표시(제출됨/지각/채점완료/재제출요청)
   
6. **성적/피드백(학습자)**

   * 과제별 점수, 코스별 성적 요약
   
7. **Instructor 대시보드**

   * 내 코스, 채점 대기 수, 최근 제출물
   
8. **코스 관리(강사)**

   * 생성/수정/상태 전환(draft/published/archived)
   
9. **과제 관리(강사)**

   * 생성/수정/게시(draft/published/closed)
   * 제출물 테이블(필터: 미채점/지각/재제출요청)
   * 채점/피드백/재제출 요청

## 4. 사용자 여정 (User Journey)

### 4.1 Learner 여정

1. 회원가입/로그인 → 역할=Learner 선택/프로필
2. 코스 카탈로그 탐색 → 코스 상세 → 수강신청
3. 대시보드에서 마감 임박 과제 확인 → 과제 상세
4. 제출(텍스트/링크/파일 모의) → 상태 변화(제출됨/지각)
5. 성적/피드백 확인 → 필요 시 재제출

### 4.2 Instructor 여정

1. 회원가입/로그인 → 역할=Instructor 선택/프로필
2. 코스 생성(draft) → published 전환
3. 과제 생성(draft) → published(게시) → 제출물 수집
4. 제출물 검토/채점 → 피드백/재제출 요청
5. 마감 시 closed → 성적 정리

## 5. IA (Tree)

```
/ (Home)
├─ /auth/(signin|signup)
├─ /onboarding (role=learner|instructor)
├─ /courses
│  ├─ /[courseId]
│  │  ├─ /about
│  │  ├─ /curriculum
│  │  └─ /enroll
│  └─ /my (learner)
│     └─ /[courseId]
│        ├─ /assignments
│        │  └─ /[assignmentId]
│        │     ├─ /submit
│        │     └─ /feedback
│        └─ /grades
└─ /instructor
   ├─ /dashboard
   ├─ /courses
   │  ├─ /new
   │  └─ /[courseId]/edit
   └─ /assignments
      ├─ /new
      └─ /[assignmentId]/submissions
```


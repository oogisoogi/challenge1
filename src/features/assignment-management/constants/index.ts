export const ASSIGNMENT_MANAGEMENT_QUERY_KEYS = {
  all: ['assignment-management'] as const,
  detail: (assignmentId: string) =>
    ['assignment-management', 'detail', assignmentId] as const,
  submissions: (assignmentId: string, filter: string) =>
    ['assignment-management', 'submissions', assignmentId, filter] as const,
  grade: (submissionId: string) =>
    ['assignment-management', 'grade', submissionId] as const,
} as const;

export const SUBMISSION_FILTER_LABELS = {
  all: '전체',
  submitted: '미채점',
  late: '지각',
  resubmission_required: '재제출 요청',
} as const satisfies Record<string, string>;

export type SubmissionFilter = keyof typeof SUBMISSION_FILTER_LABELS;

// 채점 액션 레이블
export const GRADING_ACTION_LABELS = {
  grade: '채점 완료',
  resubmission: '재제출 요청',
} as const;

export type GradingAction = keyof typeof GRADING_ACTION_LABELS;

// 허용된 상태 전환 규칙 (BR1: draft -> published -> closed, 단방향)
export const ALLOWED_ASSIGNMENT_STATUS_TRANSITIONS = {
  draft: ['published'],
  published: ['closed'],
  closed: [],
} as const satisfies Record<string, readonly string[]>;

// 상태 전환 버튼 라벨 및 확인 다이얼로그 메시지
export const ASSIGNMENT_STATUS_TRANSITION_CONFIG = {
  published: {
    label: '게시',
    confirmTitle: '과제 게시',
    confirmMessage: '게시하면 수강생에게 노출됩니다. 게시하시겠습니까?',
  },
  closed: {
    label: '마감',
    confirmTitle: '과제 마감',
    confirmMessage: '마감하면 더 이상 제출할 수 없습니다. 마감하시겠습니까?',
  },
} as const;

// 과제 상태 배지 레이블 (Learner/Instructor 화면 공통)
export const ASSIGNMENT_STATUS_LABELS = {
  draft: '초안',
  published: '게시됨',
  closed: '마감됨',
} as const satisfies Record<string, string>;

// 과제 상태 배지 variant
export const ASSIGNMENT_STATUS_VARIANTS = {
  draft: 'outline',
  published: 'default',
  closed: 'secondary',
} as const satisfies Record<string, 'default' | 'secondary' | 'destructive' | 'outline'>;

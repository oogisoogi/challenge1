export const OPERATOR_QUERY_KEYS = {
  dashboard: ['operator', 'dashboard'] as const,
  reports: (filters?: { status?: string; targetType?: string }) =>
    ['operator', 'reports', filters] as const,
  report: (reportId: string) => ['operator', 'reports', reportId] as const,
  categories: ['operator', 'categories'] as const,
  difficultyLevels: ['operator', 'difficulty-levels'] as const,
} as const;

// 신고 상태 전환 규칙 (BR2)
export const ALLOWED_REPORT_STATUS_TRANSITIONS = {
  received: ['investigating'],
  investigating: ['resolved'],
  resolved: [],
} as const satisfies Record<string, readonly string[]>;

// 신고 상태 한국어 레이블
export const REPORT_STATUS_LABELS = {
  received: '접수',
  investigating: '조사 중',
  resolved: '처리 완료',
} as const;

// 신고 대상 유형 한국어 레이블
export const REPORT_TARGET_TYPE_LABELS = {
  course: '코스',
  assignment: '과제',
  submission: '제출물',
  user: '사용자',
} as const;

// 신고 처리 액션 레이블
export const REPORT_ACTION_LABELS = {
  warning: '경고',
  invalidate_submission: '제출물 무효화',
  restrict_account: '계정 제한',
} as const;

// 신고 처리 액션 적용 가능 target_type (BR3, BR4, BR5)
export const ACTION_ALLOWED_TARGET_TYPES = {
  warning: ['course', 'assignment', 'submission', 'user'],
  invalidate_submission: ['submission'],
  restrict_account: ['user'],
} as const;

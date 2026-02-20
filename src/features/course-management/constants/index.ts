export const COURSE_MANAGEMENT_QUERY_KEYS = {
  all: ['course-management'] as const,
  detail: (courseId: string) => ['course-management', 'detail', courseId] as const,
} as const;

// 허용된 상태 전환 규칙 (BR2: draft -> published -> archived)
export const ALLOWED_STATUS_TRANSITIONS = {
  draft: ['published'],
  published: ['archived'],
  archived: [],
} as const satisfies Record<string, readonly string[]>;

// 상태 전환 버튼 라벨 및 확인 다이얼로그 메시지
export const STATUS_TRANSITION_CONFIG = {
  published: {
    label: '게시하기',
    confirmMessage: '코스를 게시하면 학습자에게 공개됩니다. 게시하시겠습니까?',
  },
  archived: {
    label: '보관하기',
    confirmMessage: '코스를 보관하면 신규 수강신청이 차단됩니다. 보관하시겠습니까?',
  },
} as const;

export const ASSIGNMENT_DETAIL_QUERY_KEYS = {
  all: ['assignment-detail'] as const,
  detail: (courseId: string, assignmentId: string) =>
    ['assignment-detail', courseId, assignmentId] as const,
} as const;

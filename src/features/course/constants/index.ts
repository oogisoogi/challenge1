export const COURSE_QUERY_KEYS = {
  all: ['courses'] as const,
  list: (params: Record<string, unknown>) => ['courses', 'list', params] as const,
  detail: (courseId: string) => ['courses', 'detail', courseId] as const,
  meta: ['courses', 'meta'] as const,
} as const;

export const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '인기순' },
] as const;

export const DEFAULT_PAGE_SIZE = 12;

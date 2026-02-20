export const GRADES_QUERY_KEYS = {
  all: ['grades'] as const,
  courseGrades: (courseId: string) =>
    ['grades', 'course', courseId] as const,
  feedback: (courseId: string, assignmentId: string) =>
    ['grades', 'feedback', courseId, assignmentId] as const,
} as const;

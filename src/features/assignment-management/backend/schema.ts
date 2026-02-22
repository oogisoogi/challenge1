import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request Schemas
// ---------------------------------------------------------------------------

export const createAssignmentBodySchema = z.object({
  courseId: z.string().uuid('유효한 코스를 선택해주세요.'),
  title: z.string().min(1, '제목을 입력해주세요.'),
  description: z.string().default(''),
  dueDate: z
    .string()
    .min(1, '마감일을 입력해주세요.')
    .refine((val) => new Date(val) > new Date(), '마감일은 미래 날짜여야 합니다.'),
  weight: z
    .number()
    .int()
    .min(0, '비중은 0 이상이어야 합니다.')
    .max(100, '비중은 100 이하여야 합니다.'),
  allowLate: z.boolean().default(false),
  allowResubmission: z.boolean().default(false),
});

export type CreateAssignmentBody = z.infer<typeof createAssignmentBodySchema>;

export const updateAssignmentBodySchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.').optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  weight: z.number().int().min(0, '비중은 0 이상이어야 합니다.').max(100, '비중은 100 이하여야 합니다.').optional(),
  allowLate: z.boolean().optional(),
  allowResubmission: z.boolean().optional(),
});

export type UpdateAssignmentBody = z.infer<typeof updateAssignmentBodySchema>;

export const assignmentIdParamSchema = z.object({
  assignmentId: z.string().uuid('유효한 과제 ID가 필요합니다.'),
});

export type AssignmentIdParam = z.infer<typeof assignmentIdParamSchema>;

export const submissionFilterQuerySchema = z.object({
  filter: z.enum(['all', 'submitted', 'late', 'resubmission_required']).default('all'),
});

export type SubmissionFilterQuery = z.infer<typeof submissionFilterQuerySchema>;

// ---------------------------------------------------------------------------
// Response Schemas
// ---------------------------------------------------------------------------

export const assignmentManagementResponseSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  title: z.string(),
  description: z.string(),
  dueDate: z.string(),
  weight: z.number(),
  allowLate: z.boolean(),
  allowResubmission: z.boolean(),
  status: z.enum(['draft', 'published', 'closed']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AssignmentManagementResponse = z.infer<typeof assignmentManagementResponseSchema>;

export const submissionItemSchema = z.object({
  id: z.string().uuid(),
  learnerId: z.string().uuid(),
  learnerName: z.string(),
  status: z.enum(['submitted', 'graded', 'resubmission_required']),
  isLate: z.boolean(),
  score: z.number().nullable(),
  submittedAt: z.string(),
});

export type SubmissionItem = z.infer<typeof submissionItemSchema>;

// 제출물 상세 조회용 (채점 패널에서 content, link, feedback 표시)
export const submissionDetailItemSchema = submissionItemSchema.extend({
  content: z.string(),
  link: z.string().nullable(),
  feedback: z.string().nullable(),
});

export type SubmissionDetailItem = z.infer<typeof submissionDetailItemSchema>;

export const assignmentSubmissionsResponseSchema = z.object({
  assignment: assignmentManagementResponseSchema,
  submissions: z.array(submissionDetailItemSchema),
});

export type AssignmentSubmissionsResponse = z.infer<typeof assignmentSubmissionsResponseSchema>;

// 채점 요청 바디 (action: 'grade' | 'resubmission')
export const gradeSubmissionBodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('grade'),
    score: z
      .number()
      .int('점수는 정수여야 합니다.')
      .min(0, '점수는 0 이상이어야 합니다.')
      .max(100, '점수는 100 이하여야 합니다.'),
    feedback: z.string().min(1, '피드백을 입력해주세요.'),
  }),
  z.object({
    action: z.literal('resubmission'),
    feedback: z.string().min(1, '피드백을 입력해주세요.'),
  }),
]);

export type GradeSubmissionBody = z.infer<typeof gradeSubmissionBodySchema>;

// 채점 응답 (갱신된 제출물 상태 반환)
export const gradeSubmissionResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['submitted', 'graded', 'resubmission_required']),
  score: z.number().nullable(),
  feedback: z.string().nullable(),
  gradedAt: z.string().nullable(),
  updatedAt: z.string(),
});

export type GradeSubmissionResponse = z.infer<typeof gradeSubmissionResponseSchema>;

// 경로 파라미터
export const submissionIdParamSchema = z.object({
  submissionId: z.string().uuid('유효한 제출물 ID가 필요합니다.'),
});

export type SubmissionIdParam = z.infer<typeof submissionIdParamSchema>;

// 상태 전환 요청 스키마 (draft 역방향 전환은 스키마 레벨에서 차단)
export const updateAssignmentStatusBodySchema = z.object({
  status: z.enum(['published', 'closed']),
});

export type UpdateAssignmentStatusBody = z.infer<typeof updateAssignmentStatusBodySchema>;

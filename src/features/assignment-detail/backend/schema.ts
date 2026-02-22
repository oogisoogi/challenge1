import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request Schemas
// ---------------------------------------------------------------------------

export const assignmentDetailParamSchema = z.object({
  courseId: z.string().uuid({ message: '유효한 코스 ID가 필요합니다.' }),
  assignmentId: z.string().uuid({ message: '유효한 과제 ID가 필요합니다.' }),
});

export type AssignmentDetailParam = z.infer<typeof assignmentDetailParamSchema>;

// ---------------------------------------------------------------------------
// Response Schemas
// ---------------------------------------------------------------------------

export const assignmentDetailSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  title: z.string(),
  description: z.string(),
  dueDate: z.string(),
  weight: z.number().int(),
  allowLate: z.boolean(),
  allowResubmission: z.boolean(),
  status: z.enum(['published', 'closed']),
});

export type AssignmentDetail = z.infer<typeof assignmentDetailSchema>;

export const submissionDetailSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  link: z.string().nullable(),
  isLate: z.boolean(),
  status: z.enum(['submitted', 'graded', 'resubmission_required']),
  score: z.number().nullable(),
  feedback: z.string().nullable(),
  submittedAt: z.string(),
  gradedAt: z.string().nullable(),
});

export type SubmissionDetail = z.infer<typeof submissionDetailSchema>;

export const assignmentDetailResponseSchema = z.object({
  assignment: assignmentDetailSchema,
  submission: submissionDetailSchema.nullable(),
});

export type AssignmentDetailResponse = z.infer<
  typeof assignmentDetailResponseSchema
>;

// ---------------------------------------------------------------------------
// Submission Request / Response Schemas
// ---------------------------------------------------------------------------

export const submissionBodySchema = z.object({
  content: z.string().min(1, { message: '내용을 입력해주세요.' }),
  link: z
    .string()
    .url({ message: '올바른 URL 형식을 입력해주세요.' })
    .optional()
    .or(z.literal('')),
});

export type SubmissionBody = z.infer<typeof submissionBodySchema>;

export const submissionResponseSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  learnerId: z.string().uuid(),
  content: z.string(),
  link: z.string().nullable(),
  isLate: z.boolean(),
  status: z.enum(['submitted', 'graded', 'resubmission_required']),
  submittedAt: z.string(),
});

export type SubmissionResponse = z.infer<typeof submissionResponseSchema>;

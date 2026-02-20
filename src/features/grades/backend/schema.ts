import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request Param Schemas
// ---------------------------------------------------------------------------

export const gradesParamSchema = z.object({
  courseId: z.string().uuid({ message: '유효한 코스 ID가 필요합니다.' }),
});

export type GradesParam = z.infer<typeof gradesParamSchema>;

export const feedbackParamSchema = z.object({
  courseId: z.string().uuid({ message: '유효한 코스 ID가 필요합니다.' }),
  assignmentId: z.string().uuid({ message: '유효한 과제 ID가 필요합니다.' }),
});

export type FeedbackParam = z.infer<typeof feedbackParamSchema>;

// ---------------------------------------------------------------------------
// Response Schemas
// ---------------------------------------------------------------------------

export const assignmentGradeSchema = z.object({
  assignmentId: z.string().uuid(),
  title: z.string(),
  weight: z.number().int(),
  score: z.number().nullable(),
  isLate: z.boolean().nullable(),
  status: z.enum([
    'not_submitted',
    'submitted',
    'graded',
    'resubmission_required',
  ]),
  feedbackSummary: z.string().nullable(),
});

export type AssignmentGrade = z.infer<typeof assignmentGradeSchema>;

export const courseGradesResponseSchema = z.object({
  courseTitle: z.string(),
  totalScore: z.number().nullable(),
  assignments: z.array(assignmentGradeSchema),
});

export type CourseGradesResponse = z.infer<typeof courseGradesResponseSchema>;

export const feedbackAssignmentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  weight: z.number().int(),
  allowResubmission: z.boolean(),
});

export type FeedbackAssignment = z.infer<typeof feedbackAssignmentSchema>;

export const feedbackSubmissionSchema = z.object({
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

export type FeedbackSubmission = z.infer<typeof feedbackSubmissionSchema>;

export const assignmentFeedbackResponseSchema = z.object({
  assignment: feedbackAssignmentSchema,
  submission: feedbackSubmissionSchema,
});

export type AssignmentFeedbackResponse = z.infer<
  typeof assignmentFeedbackResponseSchema
>;

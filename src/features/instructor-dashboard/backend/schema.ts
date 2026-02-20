import { z } from 'zod';

// ---------------------------------------------------------------------------
// Response Schemas
// ---------------------------------------------------------------------------

export const instructorCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  categoryName: z.string().nullable(),
  difficultyName: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived']),
  learnerCount: z.number(),
  pendingGradingCount: z.number(),
  createdAt: z.string(),
});

export type InstructorCourse = z.infer<typeof instructorCourseSchema>;

export const recentSubmissionSchema = z.object({
  id: z.string().uuid(),
  assignmentId: z.string().uuid(),
  assignmentTitle: z.string(),
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  learnerId: z.string().uuid(),
  learnerName: z.string(),
  status: z.enum(['submitted', 'graded', 'resubmission_required']),
  isLate: z.boolean(),
  submittedAt: z.string(),
});

export type RecentSubmission = z.infer<typeof recentSubmissionSchema>;

export const instructorDashboardResponseSchema = z.object({
  courses: z.array(instructorCourseSchema),
  totalPendingGradingCount: z.number(),
  recentSubmissions: z.array(recentSubmissionSchema),
});

export type InstructorDashboardResponse = z.infer<
  typeof instructorDashboardResponseSchema
>;

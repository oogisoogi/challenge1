import { z } from 'zod';

// ---------------------------------------------------------------------------
// Response Schemas
// ---------------------------------------------------------------------------

export const enrolledCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  categoryName: z.string().nullable(),
  difficultyName: z.string().nullable(),
  instructorName: z.string(),
  progress: z.object({
    completed: z.number(),
    total: z.number(),
    percentage: z.number(),
  }),
});

export type EnrolledCourse = z.infer<typeof enrolledCourseSchema>;

export const upcomingAssignmentSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  courseTitle: z.string(),
  title: z.string(),
  dueDate: z.string(),
  submissionStatus: z
    .enum(['submitted', 'graded', 'resubmission_required'])
    .nullable(),
});

export type UpcomingAssignment = z.infer<typeof upcomingAssignmentSchema>;

export const recentFeedbackSchema = z.object({
  submissionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  assignmentTitle: z.string(),
  courseTitle: z.string(),
  score: z.number().nullable(),
  feedback: z.string().nullable(),
  status: z.enum(['submitted', 'graded', 'resubmission_required']),
  gradedAt: z.string().nullable(),
});

export type RecentFeedback = z.infer<typeof recentFeedbackSchema>;

export const learnerDashboardResponseSchema = z.object({
  courses: z.array(enrolledCourseSchema),
  upcomingAssignments: z.array(upcomingAssignmentSchema),
  recentFeedback: z.array(recentFeedbackSchema),
});

export type LearnerDashboardResponse = z.infer<typeof learnerDashboardResponseSchema>;

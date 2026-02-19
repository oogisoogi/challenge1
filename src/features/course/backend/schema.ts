import { z } from 'zod';

// ---------------------------------------------------------------------------
// Query / Param Schemas
// ---------------------------------------------------------------------------

export const courseListQuerySchema = z.object({
  q: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  difficultyId: z.string().uuid().optional(),
  sort: z.enum(['latest', 'popular']).default('latest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type CourseListQuery = z.infer<typeof courseListQuerySchema>;

export const courseIdParamSchema = z.object({
  courseId: z.string().uuid({ message: '유효한 코스 ID가 필요합니다.' }),
});

export type CourseIdParam = z.infer<typeof courseIdParamSchema>;

// ---------------------------------------------------------------------------
// Response Schemas
// ---------------------------------------------------------------------------

export const courseSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  categoryName: z.string().nullable(),
  difficultyName: z.string().nullable(),
  instructorName: z.string(),
  enrollmentCount: z.number(),
  createdAt: z.string(),
});

export type CourseSummary = z.infer<typeof courseSummarySchema>;

export const courseListResponseSchema = z.object({
  courses: z.array(courseSummarySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export type CourseListResponse = z.infer<typeof courseListResponseSchema>;

export const courseDetailResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  curriculum: z.string(),
  categoryName: z.string().nullable(),
  difficultyName: z.string().nullable(),
  instructorName: z.string(),
  instructorBio: z.string(),
  enrollmentCount: z.number(),
  enrollmentStatus: z.enum(['active', 'cancelled']).nullable(),
  createdAt: z.string(),
});

export type CourseDetailResponse = z.infer<typeof courseDetailResponseSchema>;

export const enrollResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  status: z.literal('active'),
});

export type EnrollResponse = z.infer<typeof enrollResponseSchema>;

export const cancelEnrollResponseSchema = z.object({
  enrollmentId: z.string().uuid(),
  status: z.literal('cancelled'),
});

export type CancelEnrollResponse = z.infer<typeof cancelEnrollResponseSchema>;

export const courseMetaResponseSchema = z.object({
  categories: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
  difficultyLevels: z.array(z.object({ id: z.string().uuid(), name: z.string() })),
});

export type CourseMetaResponse = z.infer<typeof courseMetaResponseSchema>;

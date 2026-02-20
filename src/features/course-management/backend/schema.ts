import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request Schemas
// ---------------------------------------------------------------------------

export const createCourseBodySchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.'),
  description: z.string().default(''),
  categoryId: z.string().uuid('유효한 카테고리를 선택해주세요.'),
  difficultyId: z.string().uuid('유효한 난이도를 선택해주세요.'),
  curriculum: z.string().default(''),
});

export type CreateCourseBody = z.infer<typeof createCourseBodySchema>;

export const updateCourseBodySchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요.').optional(),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  difficultyId: z.string().uuid().optional(),
  curriculum: z.string().optional(),
});

export type UpdateCourseBody = z.infer<typeof updateCourseBodySchema>;

export const updateCourseStatusBodySchema = z.object({
  status: z.enum(['published', 'archived']),
});

export type UpdateCourseStatusBody = z.infer<typeof updateCourseStatusBodySchema>;

export const courseIdParamSchema = z.object({
  courseId: z.string().uuid('유효한 코스 ID가 필요합니다.'),
});

export type CourseIdParam = z.infer<typeof courseIdParamSchema>;

// ---------------------------------------------------------------------------
// Response Schemas
// ---------------------------------------------------------------------------

export const courseManagementResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  categoryId: z.string().uuid().nullable(),
  categoryName: z.string().nullable(),
  difficultyId: z.string().uuid().nullable(),
  difficultyName: z.string().nullable(),
  curriculum: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CourseManagementResponse = z.infer<typeof courseManagementResponseSchema>;

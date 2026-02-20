import { z } from 'zod';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const operatorDashboardResponseSchema = z.object({
  receivedReportCount: z.number(),
  investigatingReportCount: z.number(),
  totalCourseCount: z.number(),
  totalUserCount: z.number(),
});

export type OperatorDashboardResponse = z.infer<typeof operatorDashboardResponseSchema>;

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const reportsQuerySchema = z.object({
  status: z.enum(['received', 'investigating', 'resolved']).optional(),
  target_type: z.enum(['course', 'assignment', 'submission', 'user']).optional(),
});

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;

export const reportSchema = z.object({
  id: z.string().uuid(),
  reporterId: z.string().uuid(),
  reporterName: z.string(),
  targetType: z.enum(['course', 'assignment', 'submission', 'user']),
  targetId: z.string().uuid(),
  reason: z.string(),
  content: z.string(),
  status: z.enum(['received', 'investigating', 'resolved']),
  action: z.enum(['warning', 'invalidate_submission', 'restrict_account']).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Report = z.infer<typeof reportSchema>;

export const reportsResponseSchema = z.object({
  reports: z.array(reportSchema),
});

export type ReportsResponse = z.infer<typeof reportsResponseSchema>;

export const reportDetailResponseSchema = z.object({
  report: reportSchema,
});

export type ReportDetailResponse = z.infer<typeof reportDetailResponseSchema>;

export const updateReportBodySchema = z.object({
  status: z.enum(['investigating', 'resolved']),
  action: z.enum(['warning', 'invalidate_submission', 'restrict_account']).optional(),
});

export type UpdateReportBody = z.infer<typeof updateReportBodySchema>;

export const reportIdParamSchema = z.object({
  reportId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Category = z.infer<typeof categorySchema>;

export const categoriesResponseSchema = z.object({
  categories: z.array(categorySchema),
});

export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;

export const categoryResponseSchema = z.object({
  category: categorySchema,
});

export type CategoryResponse = z.infer<typeof categoryResponseSchema>;

export const createCategoryBodySchema = z.object({
  name: z.string().min(1, '카테고리 이름을 입력해주세요.'),
});

export type CreateCategoryBody = z.infer<typeof createCategoryBodySchema>;

export const updateCategoryBodySchema = z.object({
  name: z.string().min(1, '카테고리 이름을 입력해주세요.').optional(),
  isActive: z.boolean().optional(),
});

export type UpdateCategoryBody = z.infer<typeof updateCategoryBodySchema>;

export const categoryIdParamSchema = z.object({
  categoryId: z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Difficulty Levels
// ---------------------------------------------------------------------------

export const difficultyLevelSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type DifficultyLevel = z.infer<typeof difficultyLevelSchema>;

export const difficultyLevelsResponseSchema = z.object({
  difficultyLevels: z.array(difficultyLevelSchema),
});

export type DifficultyLevelsResponse = z.infer<typeof difficultyLevelsResponseSchema>;

export const difficultyLevelResponseSchema = z.object({
  difficultyLevel: difficultyLevelSchema,
});

export type DifficultyLevelResponse = z.infer<typeof difficultyLevelResponseSchema>;

export const createDifficultyLevelBodySchema = z.object({
  name: z.string().min(1, '난이도 이름을 입력해주세요.'),
});

export type CreateDifficultyLevelBody = z.infer<typeof createDifficultyLevelBodySchema>;

export const updateDifficultyLevelBodySchema = z.object({
  name: z.string().min(1, '난이도 이름을 입력해주세요.').optional(),
  isActive: z.boolean().optional(),
});

export type UpdateDifficultyLevelBody = z.infer<typeof updateDifficultyLevelBodySchema>;

export const levelIdParamSchema = z.object({
  levelId: z.string().uuid(),
});

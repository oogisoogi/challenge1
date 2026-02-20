import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getSupabase, type AppEnv } from '@/backend/hono/context';
import { extractUserId, requireOperatorRole } from '@/backend/http/auth';
import { operatorErrorCodes } from './error';
import {
  reportsQuerySchema,
  updateReportBodySchema,
  reportIdParamSchema,
  createReportBodySchema,
  createCategoryBodySchema,
  updateCategoryBodySchema,
  categoryIdParamSchema,
  createDifficultyLevelBodySchema,
  updateDifficultyLevelBodySchema,
  levelIdParamSchema,
} from './schema';
import {
  getOperatorDashboard,
  getReports,
  getReport,
  updateReport,
  createReport,
  getCategories,
  createCategory,
  updateCategory,
  getDifficultyLevels,
  createDifficultyLevel,
  updateDifficultyLevel,
} from './service';

export const registerOperatorRoutes = (app: Hono<AppEnv>) => {
  // POST /api/reports — 신고 접수 (인증된 모든 사용자)
  app.post('/api/reports', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);

    const bodyResult = createReportBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await createReport(supabase, userId, bodyResult.data);
    return respond(c, result);
  });

  // GET /api/operator/dashboard — 운영 현황 통계 (MS-1)
  app.get('/api/operator/dashboard', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const result = await getOperatorDashboard(supabase);
    return respond(c, result);
  });

  // GET /api/operator/reports — 신고 목록 + 필터 (MS-2)
  app.get('/api/operator/reports', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const queryResult = reportsQuerySchema.safeParse({
      status: c.req.query('status'),
      target_type: c.req.query('target_type'),
    });

    if (!queryResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          queryResult.error.errors[0]?.message ?? '유효하지 않은 쿼리 파라미터입니다.',
        ),
      );
    }

    const result = await getReports(supabase, queryResult.data);
    return respond(c, result);
  });

  // GET /api/operator/reports/:reportId — 신고 상세 (MS-3)
  app.get('/api/operator/reports/:reportId', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const paramResult = reportIdParamSchema.safeParse({
      reportId: c.req.param('reportId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 신고 ID입니다.',
        ),
      );
    }

    const result = await getReport(supabase, paramResult.data.reportId);
    return respond(c, result);
  });

  // PATCH /api/operator/reports/:reportId — 신고 상태 전환 + 액션 (MS-3, MS-4)
  app.patch('/api/operator/reports/:reportId', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const paramResult = reportIdParamSchema.safeParse({
      reportId: c.req.param('reportId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 신고 ID입니다.',
        ),
      );
    }

    const bodyResult = updateReportBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await updateReport(
      supabase,
      paramResult.data.reportId,
      bodyResult.data,
    );
    return respond(c, result);
  });

  // GET /api/operator/categories — 카테고리 전체 목록 (MS-5)
  app.get('/api/operator/categories', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const result = await getCategories(supabase);
    return respond(c, result);
  });

  // POST /api/operator/categories — 카테고리 추가 (MS-5)
  app.post('/api/operator/categories', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const bodyResult = createCategoryBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await createCategory(supabase, bodyResult.data);
    return respond(c, result);
  });

  // PATCH /api/operator/categories/:categoryId — 카테고리 수정/비활성화 (MS-5)
  app.patch('/api/operator/categories/:categoryId', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const paramResult = categoryIdParamSchema.safeParse({
      categoryId: c.req.param('categoryId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 카테고리 ID입니다.',
        ),
      );
    }

    const bodyResult = updateCategoryBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await updateCategory(supabase, paramResult.data.categoryId, bodyResult.data);
    return respond(c, result);
  });

  // GET /api/operator/difficulty-levels — 난이도 전체 목록 (MS-6)
  app.get('/api/operator/difficulty-levels', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const result = await getDifficultyLevels(supabase);
    return respond(c, result);
  });

  // POST /api/operator/difficulty-levels — 난이도 추가 (MS-6)
  app.post('/api/operator/difficulty-levels', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const bodyResult = createDifficultyLevelBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await createDifficultyLevel(supabase, bodyResult.data);
    return respond(c, result);
  });

  // PATCH /api/operator/difficulty-levels/:levelId — 난이도 수정/비활성화 (MS-6)
  app.patch('/api/operator/difficulty-levels/:levelId', async (c) => {
    const userId = await extractUserId(c);
    if (!userId) {
      return respond(c, failure(401, operatorErrorCodes.unauthorized, '인증이 필요합니다.'));
    }

    const supabase = getSupabase(c);
    const roleError = await requireOperatorRole(supabase, userId);
    if (roleError) return respond(c, roleError);

    const paramResult = levelIdParamSchema.safeParse({
      levelId: c.req.param('levelId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 난이도 ID입니다.',
        ),
      );
    }

    const bodyResult = updateDifficultyLevelBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          operatorErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await updateDifficultyLevel(supabase, paramResult.data.levelId, bodyResult.data);
    return respond(c, result);
  });
};

import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getSupabase, type AppEnv } from '@/backend/hono/context';
import { extractUserId } from '@/backend/http/auth';
import { requireLearnerRole } from '@/backend/http/auth';
import { dashboardErrorCodes } from './error';
import { getLearnerDashboard } from './service';

export const registerLearnerDashboardRoutes = (app: Hono<AppEnv>) => {
  // GET /api/learner/dashboard — Learner 대시보드 전체 데이터
  app.get('/api/learner/dashboard', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, dashboardErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireLearnerRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const result = await getLearnerDashboard(supabase, userId);
    return respond(c, result);
  });
};

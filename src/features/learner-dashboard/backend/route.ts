import type { Hono } from 'hono';
import {
  failure,
  respond,
} from '@/backend/http/response';
import {
  getSupabase,
  type AppEnv,
} from '@/backend/hono/context';
import { extractUserId, requireLearnerRole } from '@/backend/http/auth';
import { dashboardErrorCodes } from './error';
import { getLearnerDashboard } from './service';

export const registerLearnerDashboardRoutes = (app: Hono<AppEnv>) => {
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
      return respond(
        c,
        failure(403, dashboardErrorCodes.forbiddenRole, '학습자만 접근할 수 있습니다.'),
      );
    }

    const result = await getLearnerDashboard(supabase, userId);
    return respond(c, result);
  });
};

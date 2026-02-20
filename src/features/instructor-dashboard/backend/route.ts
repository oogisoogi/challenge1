import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getSupabase, type AppEnv } from '@/backend/hono/context';
import { extractUserId, requireInstructorRole } from '@/backend/http/auth';
import { instructorDashboardErrorCodes } from './error';
import { getInstructorDashboard } from './service';

export const registerInstructorDashboardRoutes = (app: Hono<AppEnv>) => {
  // GET /api/instructor/dashboard — Instructor 대시보드 전체 데이터
  app.get('/api/instructor/dashboard', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(
          401,
          instructorDashboardErrorCodes.unauthorized,
          '인증이 필요합니다.',
        ),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const result = await getInstructorDashboard(supabase, userId);
    return respond(c, result);
  });
};

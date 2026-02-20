import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getSupabase, type AppEnv } from '@/backend/hono/context';
import { extractUserId, requireInstructorRole } from '@/backend/http/auth';
import { courseManagementErrorCodes } from './error';
import {
  createCourseBodySchema,
  updateCourseBodySchema,
  updateCourseStatusBodySchema,
  courseIdParamSchema,
} from './schema';
import {
  createCourse,
  getCourse,
  updateCourse,
  updateCourseStatus,
} from './service';

export const registerCourseManagementRoutes = (app: Hono<AppEnv>) => {
  // POST /api/instructor/courses — 코스 생성
  app.post('/api/instructor/courses', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(
          401,
          courseManagementErrorCodes.unauthorized,
          '인증이 필요합니다.',
        ),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const parseResult = createCourseBodySchema.safeParse(await c.req.json());
    if (!parseResult.success) {
      return respond(
        c,
        failure(
          400,
          courseManagementErrorCodes.validationError,
          parseResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await createCourse(supabase, userId, parseResult.data);
    return respond(c, result);
  });

  // GET /api/instructor/courses/:courseId — 코스 조회
  app.get('/api/instructor/courses/:courseId', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(
          401,
          courseManagementErrorCodes.unauthorized,
          '인증이 필요합니다.',
        ),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const paramResult = courseIdParamSchema.safeParse({
      courseId: c.req.param('courseId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          courseManagementErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 코스 ID입니다.',
        ),
      );
    }

    const result = await getCourse(supabase, userId, paramResult.data.courseId);
    return respond(c, result);
  });

  // PATCH /api/instructor/courses/:courseId — 코스 수정
  app.patch('/api/instructor/courses/:courseId', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(
          401,
          courseManagementErrorCodes.unauthorized,
          '인증이 필요합니다.',
        ),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const paramResult = courseIdParamSchema.safeParse({
      courseId: c.req.param('courseId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          courseManagementErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 코스 ID입니다.',
        ),
      );
    }

    const bodyResult = updateCourseBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          courseManagementErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await updateCourse(
      supabase,
      userId,
      paramResult.data.courseId,
      bodyResult.data,
    );
    return respond(c, result);
  });

  // PATCH /api/instructor/courses/:courseId/status — 상태 전환
  app.patch('/api/instructor/courses/:courseId/status', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(
          401,
          courseManagementErrorCodes.unauthorized,
          '인증이 필요합니다.',
        ),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const paramResult = courseIdParamSchema.safeParse({
      courseId: c.req.param('courseId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          courseManagementErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 코스 ID입니다.',
        ),
      );
    }

    const bodyResult = updateCourseStatusBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          courseManagementErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 상태값입니다.',
        ),
      );
    }

    const result = await updateCourseStatus(
      supabase,
      userId,
      paramResult.data.courseId,
      bodyResult.data.status,
    );
    return respond(c, result);
  });
};

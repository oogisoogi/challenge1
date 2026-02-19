import type { Hono } from 'hono';
import {
  failure,
  respond,
} from '@/backend/http/response';
import {
  getLogger,
  getSupabase,
  type AppContext,
  type AppEnv,
} from '@/backend/hono/context';
import { courseListQuerySchema, courseIdParamSchema } from './schema';
import {
  getCourses,
  getCourseDetail,
  enrollCourse,
  cancelEnrollment,
  getCourseMeta,
} from './service';
import { courseErrorCodes } from './error';

const extractUserId = async (
  c: AppContext,
): Promise<string | null> => {
  const supabase = getSupabase(c);
  const logger = getLogger(c);

  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Course auth failed via Bearer token');
      return null;
    }

    return user.id;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
};

export const registerCourseRoutes = (app: Hono<AppEnv>) => {
  // GET /api/courses/meta — 필터 메타데이터 (must be before :courseId)
  app.get('/api/courses/meta', async (c) => {
    const supabase = getSupabase(c);
    const result = await getCourseMeta(supabase);
    return respond(c, result);
  });

  // GET /api/courses — 카탈로그 목록
  app.get('/api/courses', async (c) => {
    const raw = c.req.query();
    const parsed = courseListQuerySchema.safeParse(raw);

    if (!parsed.success) {
      return respond(
        c,
        failure(
          400,
          courseErrorCodes.validationError,
          '입력값이 올바르지 않습니다.',
          parsed.error.format(),
        ),
      );
    }

    const supabase = getSupabase(c);
    const result = await getCourses(supabase, parsed.data);
    return respond(c, result);
  });

  // GET /api/courses/:courseId — 코스 상세
  app.get('/api/courses/:courseId', async (c) => {
    const paramParsed = courseIdParamSchema.safeParse({
      courseId: c.req.param('courseId'),
    });

    if (!paramParsed.success) {
      return respond(
        c,
        failure(
          400,
          courseErrorCodes.validationError,
          '유효한 코스 ID가 필요합니다.',
        ),
      );
    }

    const userId = await extractUserId(c);
    const supabase = getSupabase(c);
    const result = await getCourseDetail(supabase, {
      courseId: paramParsed.data.courseId,
      userId,
    });

    return respond(c, result);
  });

  // POST /api/courses/:courseId/enroll — 수강신청
  app.post('/api/courses/:courseId/enroll', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, courseErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const paramParsed = courseIdParamSchema.safeParse({
      courseId: c.req.param('courseId'),
    });

    if (!paramParsed.success) {
      return respond(
        c,
        failure(
          400,
          courseErrorCodes.validationError,
          '유효한 코스 ID가 필요합니다.',
        ),
      );
    }

    const supabase = getSupabase(c);
    const result = await enrollCourse(supabase, {
      courseId: paramParsed.data.courseId,
      userId,
    });

    return respond(c, result);
  });

  // DELETE /api/courses/:courseId/enroll — 수강취소
  app.delete('/api/courses/:courseId/enroll', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, courseErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const paramParsed = courseIdParamSchema.safeParse({
      courseId: c.req.param('courseId'),
    });

    if (!paramParsed.success) {
      return respond(
        c,
        failure(
          400,
          courseErrorCodes.validationError,
          '유효한 코스 ID가 필요합니다.',
        ),
      );
    }

    const supabase = getSupabase(c);
    const result = await cancelEnrollment(supabase, {
      courseId: paramParsed.data.courseId,
      userId,
    });

    return respond(c, result);
  });
};

import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getSupabase, type AppEnv } from '@/backend/hono/context';
import { extractUserId, requireLearnerRole } from '@/backend/http/auth';
import { gradesErrorCodes } from './error';
import { gradesParamSchema, feedbackParamSchema } from './schema';
import { getCourseGrades, getAssignmentFeedback } from './service';

export const registerGradesRoutes = (app: Hono<AppEnv>) => {
  // GET /api/courses/:courseId/grades — 코스 성적 요약 + 과제별 성적 목록
  app.get('/api/courses/:courseId/grades', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, gradesErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireLearnerRole(supabase, userId);
    if (roleError) {
      return respond(
        c,
        failure(
          403,
          gradesErrorCodes.forbiddenRole,
          '학습자만 접근할 수 있습니다.',
        ),
      );
    }

    const paramResult = gradesParamSchema.safeParse({
      courseId: c.req.param('courseId'),
    });

    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          gradesErrorCodes.validationError,
          '유효하지 않은 파라미터입니다.',
          paramResult.error.flatten(),
        ),
      );
    }

    const { courseId } = paramResult.data;
    const result = await getCourseGrades(supabase, { courseId, userId });

    return respond(c, result);
  });

  // GET /api/courses/:courseId/assignments/:assignmentId/submissions/feedback — 과제 피드백 상세
  app.get(
    '/api/courses/:courseId/assignments/:assignmentId/submissions/feedback',
    async (c) => {
      const userId = await extractUserId(c);

      if (!userId) {
        return respond(
          c,
          failure(401, gradesErrorCodes.unauthorized, '인증이 필요합니다.'),
        );
      }

      const supabase = getSupabase(c);

      const roleError = await requireLearnerRole(supabase, userId);
      if (roleError) {
        return respond(
          c,
          failure(
            403,
            gradesErrorCodes.forbiddenRole,
            '학습자만 접근할 수 있습니다.',
          ),
        );
      }

      const paramResult = feedbackParamSchema.safeParse({
        courseId: c.req.param('courseId'),
        assignmentId: c.req.param('assignmentId'),
      });

      if (!paramResult.success) {
        return respond(
          c,
          failure(
            400,
            gradesErrorCodes.validationError,
            '유효하지 않은 파라미터입니다.',
            paramResult.error.flatten(),
          ),
        );
      }

      const { courseId, assignmentId } = paramResult.data;
      const result = await getAssignmentFeedback(supabase, {
        courseId,
        assignmentId,
        userId,
      });

      return respond(c, result);
    },
  );
};

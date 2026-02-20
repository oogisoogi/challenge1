import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getSupabase, type AppEnv } from '@/backend/hono/context';
import { extractUserId, requireLearnerRole } from '@/backend/http/auth';
import { assignmentDetailErrorCodes } from './error';
import { assignmentDetailParamSchema, submissionBodySchema } from './schema';
import {
  getAssignmentDetail,
  createSubmission,
  updateSubmission,
} from './service';

export const registerAssignmentDetailRoutes = (app: Hono<AppEnv>) => {
  // GET /api/courses/:courseId/assignments/:assignmentId — 과제 상세 + 제출 상태
  app.get('/api/courses/:courseId/assignments/:assignmentId', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(
          401,
          assignmentDetailErrorCodes.unauthorized,
          '인증이 필요합니다.',
        ),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireLearnerRole(supabase, userId);
    if (roleError) {
      return respond(
        c,
        failure(
          403,
          assignmentDetailErrorCodes.forbiddenRole,
          '학습자만 접근할 수 있습니다.',
        ),
      );
    }

    const paramResult = assignmentDetailParamSchema.safeParse({
      courseId: c.req.param('courseId'),
      assignmentId: c.req.param('assignmentId'),
    });

    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentDetailErrorCodes.validationError,
          '유효하지 않은 파라미터입니다.',
          paramResult.error.flatten(),
        ),
      );
    }

    const { courseId, assignmentId } = paramResult.data;
    const result = await getAssignmentDetail(supabase, {
      courseId,
      assignmentId,
      userId,
    });

    return respond(c, result);
  });

  // POST /api/courses/:courseId/assignments/:assignmentId/submissions — 신규 제출
  app.post(
    '/api/courses/:courseId/assignments/:assignmentId/submissions',
    async (c) => {
      const userId = await extractUserId(c);

      if (!userId) {
        return respond(
          c,
          failure(
            401,
            assignmentDetailErrorCodes.unauthorized,
            '인증이 필요합니다.',
          ),
        );
      }

      const supabase = getSupabase(c);

      const roleError = await requireLearnerRole(supabase, userId);
      if (roleError) {
        return respond(
          c,
          failure(
            403,
            assignmentDetailErrorCodes.forbiddenRole,
            '학습자만 접근할 수 있습니다.',
          ),
        );
      }

      const paramResult = assignmentDetailParamSchema.safeParse({
        courseId: c.req.param('courseId'),
        assignmentId: c.req.param('assignmentId'),
      });

      if (!paramResult.success) {
        return respond(
          c,
          failure(
            400,
            assignmentDetailErrorCodes.validationError,
            '유효하지 않은 파라미터입니다.',
            paramResult.error.flatten(),
          ),
        );
      }

      const body = await c.req.json().catch(() => null);
      const bodyResult = submissionBodySchema.safeParse(body);

      if (!bodyResult.success) {
        return respond(
          c,
          failure(
            400,
            assignmentDetailErrorCodes.validationError,
            '유효하지 않은 요청 데이터입니다.',
            bodyResult.error.flatten(),
          ),
        );
      }

      const { courseId, assignmentId } = paramResult.data;
      const { content, link } = bodyResult.data;

      const result = await createSubmission(supabase, {
        courseId,
        assignmentId,
        userId,
        content,
        link,
      });

      return respond(c, result);
    },
  );

  // PUT /api/courses/:courseId/assignments/:assignmentId/submissions — 재제출
  app.put(
    '/api/courses/:courseId/assignments/:assignmentId/submissions',
    async (c) => {
      const userId = await extractUserId(c);

      if (!userId) {
        return respond(
          c,
          failure(
            401,
            assignmentDetailErrorCodes.unauthorized,
            '인증이 필요합니다.',
          ),
        );
      }

      const supabase = getSupabase(c);

      const roleError = await requireLearnerRole(supabase, userId);
      if (roleError) {
        return respond(
          c,
          failure(
            403,
            assignmentDetailErrorCodes.forbiddenRole,
            '학습자만 접근할 수 있습니다.',
          ),
        );
      }

      const paramResult = assignmentDetailParamSchema.safeParse({
        courseId: c.req.param('courseId'),
        assignmentId: c.req.param('assignmentId'),
      });

      if (!paramResult.success) {
        return respond(
          c,
          failure(
            400,
            assignmentDetailErrorCodes.validationError,
            '유효하지 않은 파라미터입니다.',
            paramResult.error.flatten(),
          ),
        );
      }

      const body = await c.req.json().catch(() => null);
      const bodyResult = submissionBodySchema.safeParse(body);

      if (!bodyResult.success) {
        return respond(
          c,
          failure(
            400,
            assignmentDetailErrorCodes.validationError,
            '유효하지 않은 요청 데이터입니다.',
            bodyResult.error.flatten(),
          ),
        );
      }

      const { courseId, assignmentId } = paramResult.data;
      const { content, link } = bodyResult.data;

      const result = await updateSubmission(supabase, {
        courseId,
        assignmentId,
        userId,
        content,
        link,
      });

      return respond(c, result);
    },
  );
};

import type { Hono } from 'hono';
import { failure, respond } from '@/backend/http/response';
import { getSupabase, type AppEnv } from '@/backend/hono/context';
import { extractUserId, requireInstructorRole } from '@/backend/http/auth';
import { assignmentManagementErrorCodes } from './error';
import {
  createAssignmentBodySchema,
  updateAssignmentBodySchema,
  updateAssignmentStatusBodySchema,
  assignmentIdParamSchema,
  submissionFilterQuerySchema,
  gradeSubmissionBodySchema,
  submissionIdParamSchema,
} from './schema';
import {
  createAssignment,
  getAssignment,
  updateAssignment,
  updateAssignmentStatus,
  getAssignmentSubmissions,
  gradeSubmission,
} from './service';

export const registerAssignmentManagementRoutes = (app: Hono<AppEnv>) => {
  // POST /api/instructor/assignments — 과제 생성
  app.post('/api/instructor/assignments', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, assignmentManagementErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const parseResult = createAssignmentBodySchema.safeParse(await c.req.json());
    if (!parseResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          parseResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await createAssignment(supabase, userId, parseResult.data);
    return respond(c, result);
  });

  // GET /api/instructor/assignments/:assignmentId — 과제 조회
  app.get('/api/instructor/assignments/:assignmentId', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, assignmentManagementErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const paramResult = assignmentIdParamSchema.safeParse({
      assignmentId: c.req.param('assignmentId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 과제 ID입니다.',
        ),
      );
    }

    const result = await getAssignment(supabase, userId, paramResult.data.assignmentId);
    return respond(c, result);
  });

  // PATCH /api/instructor/assignments/:assignmentId — 과제 수정
  app.patch('/api/instructor/assignments/:assignmentId', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, assignmentManagementErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const paramResult = assignmentIdParamSchema.safeParse({
      assignmentId: c.req.param('assignmentId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 과제 ID입니다.',
        ),
      );
    }

    const bodyResult = updateAssignmentBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await updateAssignment(
      supabase,
      userId,
      paramResult.data.assignmentId,
      bodyResult.data,
    );
    return respond(c, result);
  });

  // PATCH /api/instructor/assignments/:assignmentId/status — 과제 상태 전환 (MS-1, MS-2)
  app.patch('/api/instructor/assignments/:assignmentId/status', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, assignmentManagementErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const paramResult = assignmentIdParamSchema.safeParse({
      assignmentId: c.req.param('assignmentId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 과제 ID입니다.',
        ),
      );
    }

    const bodyResult = updateAssignmentStatusBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await updateAssignmentStatus(
      supabase,
      userId,
      paramResult.data.assignmentId,
      bodyResult.data.status,
    );
    return respond(c, result);
  });

  // GET /api/instructor/assignments/:assignmentId/submissions — 제출물 목록
  app.get('/api/instructor/assignments/:assignmentId/submissions', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, assignmentManagementErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const paramResult = assignmentIdParamSchema.safeParse({
      assignmentId: c.req.param('assignmentId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 과제 ID입니다.',
        ),
      );
    }

    const filterResult = submissionFilterQuerySchema.safeParse({
      filter: c.req.query('filter'),
    });
    if (!filterResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          filterResult.error.errors[0]?.message ?? '유효하지 않은 필터 값입니다.',
        ),
      );
    }

    const result = await getAssignmentSubmissions(
      supabase,
      userId,
      paramResult.data.assignmentId,
      filterResult.data.filter,
    );
    return respond(c, result);
  });

  // PATCH /api/instructor/submissions/:submissionId/grade — 채점 완료 / 재제출 요청
  app.patch('/api/instructor/submissions/:submissionId/grade', async (c) => {
    const userId = await extractUserId(c);

    if (!userId) {
      return respond(
        c,
        failure(401, assignmentManagementErrorCodes.unauthorized, '인증이 필요합니다.'),
      );
    }

    const supabase = getSupabase(c);

    const roleError = await requireInstructorRole(supabase, userId);
    if (roleError) {
      return respond(c, roleError);
    }

    const paramResult = submissionIdParamSchema.safeParse({
      submissionId: c.req.param('submissionId'),
    });
    if (!paramResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          paramResult.error.errors[0]?.message ?? '유효하지 않은 제출물 ID입니다.',
        ),
      );
    }

    const bodyResult = gradeSubmissionBodySchema.safeParse(await c.req.json());
    if (!bodyResult.success) {
      return respond(
        c,
        failure(
          400,
          assignmentManagementErrorCodes.validationError,
          bodyResult.error.errors[0]?.message ?? '유효하지 않은 요청입니다.',
        ),
      );
    }

    const result = await gradeSubmission(
      supabase,
      userId,
      paramResult.data.submissionId,
      bodyResult.data,
    );
    return respond(c, result);
  });
};

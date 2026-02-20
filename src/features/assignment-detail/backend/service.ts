import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import {
  assignmentDetailErrorCodes,
  type AssignmentDetailServiceError,
} from './error';
import type {
  AssignmentDetailResponse,
  SubmissionResponse,
} from './schema';

const ENROLLMENTS_TABLE = 'enrollments';
const ASSIGNMENTS_TABLE = 'assignments';
const SUBMISSIONS_TABLE = 'submissions';

type GetAssignmentDetailParams = {
  courseId: string;
  assignmentId: string;
  userId: string;
};

type RawAssignment = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  weight: number;
  allow_late: boolean;
  allow_resubmission: boolean;
  status: 'published' | 'closed';
};

type RawAssignmentFull = Omit<RawAssignment, 'status'> & {
  status: 'draft' | 'published' | 'closed';
};

type RawSubmission = {
  id: string;
  content: string;
  link: string | null;
  is_late: boolean;
  status: 'submitted' | 'graded' | 'resubmission_required';
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  graded_at: string | null;
};

// ---------------------------------------------------------------------------
// getAssignmentDetail — 수강 검증 → 과제 조회 → 제출물 조회 → 응답 조합
// ---------------------------------------------------------------------------

export const getAssignmentDetail = async (
  supabase: SupabaseClient,
  { courseId, assignmentId, userId }: GetAssignmentDetailParams,
): Promise<
  HandlerResult<AssignmentDetailResponse, AssignmentDetailServiceError>
> => {
  // Step 1 — 수강 등록 검증 (BR2)
  const { data: enrollment, error: enrollError } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select('id')
    .eq('course_id', courseId)
    .eq('learner_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (enrollError) {
    return failure(
      500,
      assignmentDetailErrorCodes.fetchError,
      enrollError.message,
    );
  }

  if (!enrollment) {
    return failure(
      403,
      assignmentDetailErrorCodes.notEnrolled,
      '수강 중인 코스가 아닙니다.',
    );
  }

  // Step 2 — 과제 조회 (BR1)
  const { data: assignmentRaw, error: assignError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select(
      'id, course_id, title, description, due_date, weight, allow_late, allow_resubmission, status',
    )
    .eq('id', assignmentId)
    .eq('course_id', courseId)
    .in('status', ['published', 'closed'])
    .maybeSingle();

  if (assignError) {
    return failure(
      500,
      assignmentDetailErrorCodes.fetchError,
      assignError.message,
    );
  }

  if (!assignmentRaw) {
    return failure(
      404,
      assignmentDetailErrorCodes.notFound,
      '존재하지 않는 과제입니다.',
    );
  }

  const assignment = assignmentRaw as unknown as RawAssignment;

  // auto-close: allow_late=false이고 due_date <= now()이면 closed로 전환 (BR5, BR9)
  if (
    assignment.status === 'published' &&
    !assignment.allow_late &&
    new Date(assignment.due_date) <= new Date()
  ) {
    await supabase
      .from(ASSIGNMENTS_TABLE)
      .update({ status: 'closed' })
      .eq('id', assignmentId)
      .eq('status', 'published');

    (assignment as unknown as { status: string }).status = 'closed';
  }

  // Step 3 — 제출물 조회 (nullable)
  const { data: submissionRaw, error: subError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select(
      'id, content, link, is_late, status, score, feedback, submitted_at, graded_at',
    )
    .eq('assignment_id', assignmentId)
    .eq('learner_id', userId)
    .maybeSingle();

  if (subError) {
    return failure(
      500,
      assignmentDetailErrorCodes.fetchError,
      subError.message,
    );
  }

  // Step 4 — 응답 조합
  const submission = submissionRaw
    ? (() => {
        const s = submissionRaw as unknown as RawSubmission;
        return {
          id: s.id,
          content: s.content,
          link: s.link,
          isLate: s.is_late,
          status: s.status,
          score: s.score,
          feedback: s.feedback,
          submittedAt: s.submitted_at,
          gradedAt: s.graded_at,
        };
      })()
    : null;

  return success({
    assignment: {
      id: assignment.id,
      courseId: assignment.course_id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.due_date,
      weight: assignment.weight,
      allowLate: assignment.allow_late,
      allowResubmission: assignment.allow_resubmission,
      status: assignment.status,
    },
    submission,
  });
};

// ---------------------------------------------------------------------------
// Submission Params
// ---------------------------------------------------------------------------

type SubmissionParams = {
  courseId: string;
  assignmentId: string;
  userId: string;
  content: string;
  link?: string;
};

type RawSubmissionInsert = {
  id: string;
  assignment_id: string;
  learner_id: string;
  content: string;
  link: string | null;
  is_late: boolean;
  status: 'submitted' | 'graded' | 'resubmission_required';
  submitted_at: string;
};

const toSubmissionResponse = (raw: RawSubmissionInsert): SubmissionResponse => ({
  id: raw.id,
  assignmentId: raw.assignment_id,
  learnerId: raw.learner_id,
  content: raw.content,
  link: raw.link,
  isLate: raw.is_late,
  status: raw.status,
  submittedAt: raw.submitted_at,
});

// ---------------------------------------------------------------------------
// createSubmission — 신규 제출 (INSERT)
// ---------------------------------------------------------------------------

export const createSubmission = async (
  supabase: SupabaseClient,
  { courseId, assignmentId, userId, content, link }: SubmissionParams,
): Promise<HandlerResult<SubmissionResponse, AssignmentDetailServiceError>> => {
  // Step 1 — 수강 등록 검증 (BR1)
  const { data: enrollment, error: enrollError } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select('id')
    .eq('course_id', courseId)
    .eq('learner_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (enrollError) {
    return failure(500, assignmentDetailErrorCodes.fetchError, enrollError.message);
  }

  if (!enrollment) {
    return failure(403, assignmentDetailErrorCodes.notEnrolled, '수강 중인 코스가 아닙니다.');
  }

  // Step 2 — 과제 조회 및 상태 검증 (BR1, E4, E12)
  const { data: assignmentRaw, error: assignError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select('id, due_date, allow_late, allow_resubmission, status')
    .eq('id', assignmentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (assignError) {
    return failure(500, assignmentDetailErrorCodes.fetchError, assignError.message);
  }

  if (!assignmentRaw) {
    return failure(404, assignmentDetailErrorCodes.notFound, '존재하지 않는 과제입니다.');
  }

  const assignment = assignmentRaw as unknown as RawAssignmentFull;

  if (assignment.status === 'draft') {
    return failure(404, assignmentDetailErrorCodes.notFound, '존재하지 않는 과제입니다.');
  }

  if (assignment.status === 'closed') {
    return failure(400, assignmentDetailErrorCodes.assignmentClosed, '마감된 과제입니다.');
  }

  // Step 3 — 기존 제출물 중복 확인 (BR8, E5)
  const { data: existingSubmission, error: subCheckError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select('id')
    .eq('assignment_id', assignmentId)
    .eq('learner_id', userId)
    .maybeSingle();

  if (subCheckError) {
    return failure(500, assignmentDetailErrorCodes.fetchError, subCheckError.message);
  }

  if (existingSubmission) {
    return failure(409, assignmentDetailErrorCodes.alreadySubmitted, '이미 제출한 과제입니다.');
  }

  // Step 4 — 마감일 검증 (BR3, BR4, E3)
  const isLate = new Date() > new Date(assignment.due_date);

  if (isLate && !assignment.allow_late) {
    return failure(
      400,
      assignmentDetailErrorCodes.lateNotAllowed,
      '마감일이 지나 제출할 수 없습니다.',
    );
  }

  // Step 5 — 신규 INSERT (BR3)
  const { data: insertedRaw, error: insertError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .insert({
      assignment_id: assignmentId,
      learner_id: userId,
      content,
      link: link || null,
      is_late: isLate,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select('id, assignment_id, learner_id, content, link, is_late, status, submitted_at')
    .single();

  if (insertError || !insertedRaw) {
    return failure(
      500,
      assignmentDetailErrorCodes.fetchError,
      insertError?.message ?? '제출에 실패했습니다.',
    );
  }

  return success(
    toSubmissionResponse(insertedRaw as unknown as RawSubmissionInsert),
    201,
  );
};

// ---------------------------------------------------------------------------
// updateSubmission — 재제출 (UPDATE)
// ---------------------------------------------------------------------------

export const updateSubmission = async (
  supabase: SupabaseClient,
  { courseId, assignmentId, userId, content, link }: SubmissionParams,
): Promise<HandlerResult<SubmissionResponse, AssignmentDetailServiceError>> => {
  // Step 1 — 수강 등록 검증
  const { data: enrollment, error: enrollError } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select('id')
    .eq('course_id', courseId)
    .eq('learner_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (enrollError) {
    return failure(500, assignmentDetailErrorCodes.fetchError, enrollError.message);
  }

  if (!enrollment) {
    return failure(403, assignmentDetailErrorCodes.notEnrolled, '수강 중인 코스가 아닙니다.');
  }

  // Step 2 — 과제 조회 및 재제출 허용 여부 검증 (BR5, E6)
  const { data: assignmentRaw, error: assignError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select('id, due_date, allow_late, allow_resubmission, status')
    .eq('id', assignmentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (assignError) {
    return failure(500, assignmentDetailErrorCodes.fetchError, assignError.message);
  }

  if (!assignmentRaw) {
    return failure(404, assignmentDetailErrorCodes.notFound, '존재하지 않는 과제입니다.');
  }

  const assignment = assignmentRaw as unknown as RawAssignment;

  if (!assignment.allow_resubmission) {
    return failure(
      400,
      assignmentDetailErrorCodes.resubmitNotAllowed,
      '재제출이 허용되지 않는 과제입니다.',
    );
  }

  // Step 3 — 기존 제출물 조회 및 상태 검증 (BR5, E7)
  const { data: existingSubmission, error: subError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select('id, status')
    .eq('assignment_id', assignmentId)
    .eq('learner_id', userId)
    .maybeSingle();

  if (subError) {
    return failure(500, assignmentDetailErrorCodes.fetchError, subError.message);
  }

  if (!existingSubmission) {
    return failure(
      400,
      assignmentDetailErrorCodes.submissionNotFound,
      '재제출 요청 상태가 아닙니다.',
    );
  }

  const existing = existingSubmission as unknown as { id: string; status: string };

  if (existing.status !== 'resubmission_required') {
    return failure(
      400,
      assignmentDetailErrorCodes.notResubmitRequired,
      '재제출 요청 상태가 아닙니다.',
    );
  }

  // Step 4 — 마감일 기반 is_late 갱신 (BR9)
  const isLate = new Date() > new Date(assignment.due_date);

  // Step 5 — 기존 레코드 UPDATE (BR6, BR7)
  const { data: updatedRaw, error: updateError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .update({
      content,
      link: link || null,
      is_late: isLate,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('assignment_id', assignmentId)
    .eq('learner_id', userId)
    .select('id, assignment_id, learner_id, content, link, is_late, status, submitted_at')
    .single();

  if (updateError || !updatedRaw) {
    return failure(
      500,
      assignmentDetailErrorCodes.fetchError,
      updateError?.message ?? '재제출에 실패했습니다.',
    );
  }

  return success(toSubmissionResponse(updatedRaw as unknown as RawSubmissionInsert));
};

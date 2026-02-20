import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import {
  assignmentManagementErrorCodes,
  type AssignmentManagementServiceError,
} from './error';
import type {
  AssignmentManagementResponse,
  AssignmentSubmissionsResponse,
  CreateAssignmentBody,
  GradeSubmissionBody,
  GradeSubmissionResponse,
  SubmissionDetailItem,
  UpdateAssignmentBody,
  UpdateAssignmentStatusBody,
} from './schema';

const ASSIGNMENTS_TABLE = 'assignments';
const COURSES_TABLE = 'courses';
const SUBMISSIONS_TABLE = 'submissions';

const ASSIGNMENT_SELECT = `
  id,
  course_id,
  title,
  description,
  due_date,
  weight,
  allow_late,
  allow_resubmission,
  status,
  created_at,
  updated_at,
  courses!assignments_course_id_fkey ( id, title, instructor_id, status )
`;

type RawAssignment = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  weight: number;
  allow_late: boolean;
  allow_resubmission: boolean;
  status: 'draft' | 'published' | 'closed';
  created_at: string;
  updated_at: string;
  courses: { id: string; title: string; instructor_id: string; status: string } | null;
};

const mapRawAssignment = (raw: RawAssignment): AssignmentManagementResponse => ({
  id: raw.id,
  courseId: raw.course_id,
  courseTitle: raw.courses?.title ?? '',
  title: raw.title,
  description: raw.description,
  dueDate: raw.due_date,
  weight: raw.weight,
  allowLate: raw.allow_late,
  allowResubmission: raw.allow_resubmission,
  status: raw.status,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

const isPastDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return date <= new Date();
};

// ---------------------------------------------------------------------------
// createAssignment — 과제 생성 (status='draft', BR1)
// ---------------------------------------------------------------------------

export const createAssignment = async (
  supabase: SupabaseClient,
  userId: string,
  body: CreateAssignmentBody,
): Promise<HandlerResult<AssignmentManagementResponse, AssignmentManagementServiceError>> => {
  const { data: course, error: courseError } = await supabase
    .from(COURSES_TABLE)
    .select('id, title, instructor_id, status')
    .eq('id', body.courseId)
    .maybeSingle();

  if (courseError) {
    return failure(500, assignmentManagementErrorCodes.fetchError, courseError.message);
  }

  if (!course || (course as { instructor_id: string }).instructor_id !== userId) {
    return failure(
      403,
      assignmentManagementErrorCodes.forbidden,
      '본인 코스의 과제만 관리할 수 있습니다.',
    );
  }

  const courseRow = course as { id: string; title: string; instructor_id: string; status: string };

  if (!['draft', 'published'].includes(courseRow.status)) {
    return failure(
      400,
      assignmentManagementErrorCodes.validationError,
      '활성 코스에만 과제를 생성할 수 있습니다.',
    );
  }

  if (isPastDate(body.dueDate)) {
    return failure(
      400,
      assignmentManagementErrorCodes.pastDueDate,
      '마감일은 미래 날짜여야 합니다.',
    );
  }

  const { data: insertedData, error: insertError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .insert({
      course_id: body.courseId,
      title: body.title,
      description: body.description,
      due_date: body.dueDate,
      weight: body.weight,
      allow_late: body.allowLate,
      allow_resubmission: body.allowResubmission,
      status: 'draft',
    })
    .select(ASSIGNMENT_SELECT)
    .single();

  if (insertError || !insertedData) {
    return failure(
      500,
      assignmentManagementErrorCodes.createFailed,
      insertError?.message ?? '과제 생성에 실패했습니다.',
    );
  }

  return success(mapRawAssignment(insertedData as unknown as RawAssignment), 201);
};

// ---------------------------------------------------------------------------
// getAssignment — 과제 단건 조회 (소유자 검증 포함)
// ---------------------------------------------------------------------------

export const getAssignment = async (
  supabase: SupabaseClient,
  userId: string,
  assignmentId: string,
): Promise<HandlerResult<AssignmentManagementResponse, AssignmentManagementServiceError>> => {
  const { data, error } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select(ASSIGNMENT_SELECT)
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    return failure(500, assignmentManagementErrorCodes.fetchError, error.message);
  }

  if (!data) {
    return failure(404, assignmentManagementErrorCodes.notFound, '과제를 찾을 수 없습니다.');
  }

  const raw = data as unknown as RawAssignment;

  if (raw.courses?.instructor_id !== userId) {
    return failure(
      403,
      assignmentManagementErrorCodes.forbidden,
      '본인 코스의 과제만 관리할 수 있습니다.',
    );
  }

  return success(mapRawAssignment(raw));
};

// ---------------------------------------------------------------------------
// updateAssignment — 과제 수정 (course_id 변경 불가, BR7)
// ---------------------------------------------------------------------------

export const updateAssignment = async (
  supabase: SupabaseClient,
  userId: string,
  assignmentId: string,
  body: UpdateAssignmentBody,
): Promise<HandlerResult<AssignmentManagementResponse, AssignmentManagementServiceError>> => {
  const { data: existing, error: fetchError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select(`id, courses!assignments_course_id_fkey ( instructor_id )`)
    .eq('id', assignmentId)
    .maybeSingle();

  if (fetchError) {
    return failure(500, assignmentManagementErrorCodes.fetchError, fetchError.message);
  }

  if (!existing) {
    return failure(404, assignmentManagementErrorCodes.notFound, '과제를 찾을 수 없습니다.');
  }

  const existingRow = existing as unknown as {
    id: string;
    courses: { instructor_id: string } | null;
  };

  if (existingRow.courses?.instructor_id !== userId) {
    return failure(
      403,
      assignmentManagementErrorCodes.forbidden,
      '본인 코스의 과제만 관리할 수 있습니다.',
    );
  }

  if ('courseId' in body) {
    return failure(
      400,
      assignmentManagementErrorCodes.courseIdImmutable,
      '과제의 코스는 변경할 수 없습니다.',
    );
  }

  if (body.dueDate !== undefined && isPastDate(body.dueDate)) {
    return failure(
      400,
      assignmentManagementErrorCodes.pastDueDate,
      '마감일은 미래 날짜여야 합니다.',
    );
  }

  const updateFields: Record<string, unknown> = {};
  if (body.title !== undefined) updateFields.title = body.title;
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.dueDate !== undefined) updateFields.due_date = body.dueDate;
  if (body.weight !== undefined) updateFields.weight = body.weight;
  if (body.allowLate !== undefined) updateFields.allow_late = body.allowLate;
  if (body.allowResubmission !== undefined) updateFields.allow_resubmission = body.allowResubmission;

  const { data: updatedData, error: updateError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .update(updateFields)
    .eq('id', assignmentId)
    .select(ASSIGNMENT_SELECT)
    .single();

  if (updateError || !updatedData) {
    return failure(
      500,
      assignmentManagementErrorCodes.updateFailed,
      updateError?.message ?? '과제 수정에 실패했습니다.',
    );
  }

  return success(mapRawAssignment(updatedData as unknown as RawAssignment));
};

// ---------------------------------------------------------------------------
// getAssignmentSubmissions — 제출물 목록 조회 + 필터링
// ---------------------------------------------------------------------------

type SubmissionFilter = 'all' | 'submitted' | 'late' | 'resubmission_required';

type RawSubmission = {
  id: string;
  learner_id: string;
  content: string;
  link: string | null;
  status: 'submitted' | 'graded' | 'resubmission_required';
  is_late: boolean;
  score: number | null;
  feedback: string | null;
  submitted_at: string;
  profiles: { name: string } | null;
};

const mapRawSubmission = (raw: RawSubmission): SubmissionDetailItem => ({
  id: raw.id,
  learnerId: raw.learner_id,
  learnerName: raw.profiles?.name ?? '',
  content: raw.content,
  link: raw.link,
  status: raw.status,
  isLate: raw.is_late,
  score: raw.score,
  feedback: raw.feedback,
  submittedAt: raw.submitted_at,
});

export const getAssignmentSubmissions = async (
  supabase: SupabaseClient,
  userId: string,
  assignmentId: string,
  filter: SubmissionFilter,
): Promise<HandlerResult<AssignmentSubmissionsResponse, AssignmentManagementServiceError>> => {
  const { data: assignmentData, error: assignmentError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select(ASSIGNMENT_SELECT)
    .eq('id', assignmentId)
    .maybeSingle();

  if (assignmentError) {
    return failure(500, assignmentManagementErrorCodes.fetchError, assignmentError.message);
  }

  if (!assignmentData) {
    return failure(404, assignmentManagementErrorCodes.notFound, '과제를 찾을 수 없습니다.');
  }

  const rawAssignment = assignmentData as unknown as RawAssignment;

  if (rawAssignment.courses?.instructor_id !== userId) {
    return failure(
      403,
      assignmentManagementErrorCodes.forbidden,
      '본인 코스의 과제만 관리할 수 있습니다.',
    );
  }

  // auto-close: allow_late=false이고 due_date <= now()이면 closed로 전환 (BR5, BR9)
  if (
    rawAssignment.status === 'published' &&
    !rawAssignment.allow_late &&
    new Date(rawAssignment.due_date) <= new Date()
  ) {
    await supabase
      .from(ASSIGNMENTS_TABLE)
      .update({ status: 'closed' })
      .eq('id', assignmentId)
      .eq('status', 'published'); // 동시성 안전: 이미 closed면 no-op

    rawAssignment.status = 'closed';
  }

  let submissionsQuery = supabase
    .from(SUBMISSIONS_TABLE)
    .select(
      `
      id,
      learner_id,
      content,
      link,
      status,
      is_late,
      score,
      feedback,
      submitted_at,
      profiles!submissions_learner_id_fkey ( name )
      `,
    )
    .eq('assignment_id', assignmentId)
    .order('submitted_at', { ascending: false });

  if (filter === 'submitted') {
    submissionsQuery = submissionsQuery.eq('status', 'submitted');
  } else if (filter === 'late') {
    submissionsQuery = submissionsQuery.eq('is_late', true);
  } else if (filter === 'resubmission_required') {
    submissionsQuery = submissionsQuery.eq('status', 'resubmission_required');
  }

  const { data: submissionsData, error: submissionsError } = await submissionsQuery;

  if (submissionsError) {
    return failure(500, assignmentManagementErrorCodes.fetchError, submissionsError.message);
  }

  const submissions = (submissionsData ?? []) as unknown as RawSubmission[];

  return success({
    assignment: mapRawAssignment(rawAssignment),
    submissions: submissions.map(mapRawSubmission),
  });
};

// ---------------------------------------------------------------------------
// updateAssignmentStatus — 과제 상태 전환 (draft->published->closed, BR1)
// ---------------------------------------------------------------------------

export const updateAssignmentStatus = async (
  supabase: SupabaseClient,
  userId: string,
  assignmentId: string,
  newStatus: UpdateAssignmentStatusBody['status'],
): Promise<HandlerResult<AssignmentManagementResponse, AssignmentManagementServiceError>> => {
  const { data, error } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select(ASSIGNMENT_SELECT)
    .eq('id', assignmentId)
    .maybeSingle();

  if (error) {
    return failure(500, assignmentManagementErrorCodes.fetchError, error.message);
  }

  if (!data) {
    return failure(404, assignmentManagementErrorCodes.notFound, '과제를 찾을 수 없습니다.');
  }

  const raw = data as unknown as RawAssignment;

  if (raw.courses?.instructor_id !== userId) {
    return failure(
      403,
      assignmentManagementErrorCodes.forbidden,
      '권한이 없습니다.',
    );
  }

  const currentStatus = raw.status;

  // 유효하지 않은 상태 전환 차단 (BR1: 단방향 전환만 허용)
  if (currentStatus === 'closed' && newStatus === 'published') {
    return failure(
      400,
      assignmentManagementErrorCodes.invalidStatusTransition,
      '마감된 과제는 다시 게시할 수 없습니다.',
    );
  }

  if (currentStatus === 'published' && newStatus === 'published') {
    return failure(
      400,
      assignmentManagementErrorCodes.invalidStatusTransition,
      '이미 게시된 과제입니다.',
    );
  }

  if (currentStatus === 'draft' && newStatus === 'closed') {
    return failure(
      400,
      assignmentManagementErrorCodes.invalidStatusTransition,
      '게시 상태의 과제만 마감할 수 있습니다.',
    );
  }

  // 게시 전 필수 조건 검증 (BR3)
  if (newStatus === 'published') {
    if (!raw.title || raw.title.trim() === '') {
      return failure(
        400,
        assignmentManagementErrorCodes.missingTitle,
        '과제 제목을 입력해주세요.',
      );
    }

    if (new Date(raw.due_date) <= new Date()) {
      return failure(
        400,
        assignmentManagementErrorCodes.pastDueDateOnPublish,
        '마감일은 현재 시각 이후여야 합니다.',
      );
    }

    if (raw.courses?.status !== 'published') {
      return failure(
        400,
        assignmentManagementErrorCodes.courseNotPublished,
        '코스를 먼저 게시해주세요.',
      );
    }
  }

  const { data: updatedData, error: updateError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .update({ status: newStatus })
    .eq('id', assignmentId)
    .select(ASSIGNMENT_SELECT)
    .single();

  if (updateError || !updatedData) {
    return failure(
      500,
      assignmentManagementErrorCodes.updateFailed,
      updateError?.message ?? '과제 상태 변경에 실패했습니다.',
    );
  }

  return success(mapRawAssignment(updatedData as unknown as RawAssignment));
};

// ---------------------------------------------------------------------------
// gradeSubmission — 제출물 채점 완료 / 재제출 요청
// ---------------------------------------------------------------------------

type RawSubmissionForGrade = {
  id: string;
  assignment_id: string;
  status: 'submitted' | 'graded' | 'resubmission_required';
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  assignments: {
    course_id: string;
    courses: { instructor_id: string } | null;
  } | null;
};

type RawGradedSubmission = {
  id: string;
  status: 'submitted' | 'graded' | 'resubmission_required';
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
  updated_at: string;
};

export const gradeSubmission = async (
  supabase: SupabaseClient,
  userId: string,
  submissionId: string,
  body: GradeSubmissionBody,
): Promise<HandlerResult<GradeSubmissionResponse, AssignmentManagementServiceError>> => {
  const { data: submissionData, error: fetchError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select(
      `
      id,
      assignment_id,
      status,
      score,
      feedback,
      graded_at,
      assignments!submissions_assignment_id_fkey (
        course_id,
        courses!assignments_course_id_fkey ( instructor_id )
      )
      `,
    )
    .eq('id', submissionId)
    .maybeSingle();

  if (fetchError) {
    return failure(500, assignmentManagementErrorCodes.fetchError, fetchError.message);
  }

  if (!submissionData) {
    return failure(
      404,
      assignmentManagementErrorCodes.submissionNotFound,
      '제출물을 찾을 수 없습니다.',
    );
  }

  const raw = submissionData as unknown as RawSubmissionForGrade;
  const instructorId = raw.assignments?.courses?.instructor_id;

  if (instructorId !== userId) {
    return failure(
      403,
      assignmentManagementErrorCodes.forbidden,
      '본인 코스의 제출물만 채점할 수 있습니다.',
    );
  }

  const updateFields: Record<string, unknown> =
    body.action === 'grade'
      ? {
          score: body.score,
          feedback: body.feedback,
          status: 'graded',
          graded_at: new Date().toISOString(),
        }
      : {
          feedback: body.feedback,
          status: 'resubmission_required',
        };

  const { data: updatedData, error: updateError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .update(updateFields)
    .eq('id', submissionId)
    .select('id, status, score, feedback, graded_at, updated_at')
    .single();

  if (updateError || !updatedData) {
    return failure(
      500,
      assignmentManagementErrorCodes.gradeFailed,
      updateError?.message ?? '채점에 실패했습니다.',
    );
  }

  const graded = updatedData as unknown as RawGradedSubmission;

  return success({
    id: graded.id,
    status: graded.status,
    score: graded.score,
    feedback: graded.feedback,
    gradedAt: graded.graded_at,
    updatedAt: graded.updated_at,
  });
};

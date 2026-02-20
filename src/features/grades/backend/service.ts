import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import { gradesErrorCodes, type GradesServiceError } from './error';
import type {
  CourseGradesResponse,
  AssignmentGrade,
  AssignmentFeedbackResponse,
} from './schema';

const ENROLLMENTS_TABLE = 'enrollments';
const ASSIGNMENTS_TABLE = 'assignments';
const SUBMISSIONS_TABLE = 'submissions';
const COURSES_TABLE = 'courses';

const FEEDBACK_SUMMARY_MAX_LENGTH = 100;

// ---------------------------------------------------------------------------
// Raw DB types
// ---------------------------------------------------------------------------

type RawCourse = {
  title: string;
};

type RawAssignment = {
  id: string;
  title: string;
  weight: number;
  allow_resubmission: boolean;
};

type RawSubmission = {
  id: string;
  assignment_id: string;
  learner_id: string;
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
// getCourseGrades — 수강 검증 → 과제 조회 → 제출물 조회 → 가중 평균 계산
// ---------------------------------------------------------------------------

type GetCourseGradesParams = {
  courseId: string;
  userId: string;
};

export const getCourseGrades = async (
  supabase: SupabaseClient,
  { courseId, userId }: GetCourseGradesParams,
): Promise<HandlerResult<CourseGradesResponse, GradesServiceError>> => {
  // Step 1 — 수강 등록 검증 (BR8, E4)
  const { data: enrollment, error: enrollError } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select('id')
    .eq('course_id', courseId)
    .eq('learner_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (enrollError) {
    return failure(500, gradesErrorCodes.fetchError, enrollError.message);
  }

  if (!enrollment) {
    return failure(
      403,
      gradesErrorCodes.notEnrolled,
      '수강 중인 코스가 아닙니다.',
    );
  }

  // Step 2 — 코스 제목 조회
  const { data: courseRaw, error: courseError } = await supabase
    .from(COURSES_TABLE)
    .select('title')
    .eq('id', courseId)
    .maybeSingle();

  if (courseError) {
    return failure(500, gradesErrorCodes.fetchError, courseError.message);
  }

  const course = courseRaw as unknown as RawCourse | null;
  const courseTitle = course?.title ?? '';

  // Step 3 — 과제 목록 조회 (BR5) — draft 제외
  const { data: assignmentsRaw, error: assignError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select('id, title, weight, allow_resubmission')
    .eq('course_id', courseId)
    .in('status', ['published', 'closed'])
    .order('created_at', { ascending: true });

  if (assignError) {
    return failure(500, gradesErrorCodes.fetchError, assignError.message);
  }

  const assignments = (assignmentsRaw ?? []) as unknown as RawAssignment[];

  if (assignments.length === 0) {
    return success({ courseTitle, totalScore: null, assignments: [] });
  }

  const assignmentIds = assignments.map((a) => a.id);

  // Step 4 — 해당 Learner의 제출물 조회 (BR1, BR6)
  const { data: submissionsRaw, error: subError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select(
      'id, assignment_id, learner_id, content, link, is_late, status, score, feedback, submitted_at, graded_at',
    )
    .eq('learner_id', userId)
    .in('assignment_id', assignmentIds);

  if (subError) {
    return failure(500, gradesErrorCodes.fetchError, subError.message);
  }

  const submissions = (submissionsRaw ?? []) as unknown as RawSubmission[];
  const submissionMap = new Map<string, RawSubmission>(
    submissions.map((s) => [s.assignment_id, s]),
  );

  // Step 5 — 응답 조합 + 총점 계산 (BR2, BR3, BR4, BR10)
  const assignmentGrades: AssignmentGrade[] = assignments.map((a) => {
    const sub = submissionMap.get(a.id);

    if (!sub) {
      return {
        assignmentId: a.id,
        title: a.title,
        weight: a.weight,
        score: null,
        isLate: null,
        status: 'not_submitted' as const,
        feedbackSummary: null,
      };
    }

    const feedbackSummary =
      sub.feedback !== null
        ? sub.feedback.slice(0, FEEDBACK_SUMMARY_MAX_LENGTH)
        : null;

    return {
      assignmentId: a.id,
      title: a.title,
      weight: a.weight,
      score: sub.score,
      isLate: sub.is_late,
      status: sub.status,
      feedbackSummary,
    };
  });

  // 가중 평균 계산 — graded 과제만 (BR2, BR3, BR4)
  const gradedGrades = assignmentGrades.filter((g) => g.status === 'graded');
  const totalWeight = gradedGrades.reduce((acc, g) => acc + g.weight, 0);

  const totalScore =
    totalWeight === 0
      ? null
      : gradedGrades.reduce(
          (acc, g) => acc + (g.score ?? 0) * g.weight,
          0,
        ) / totalWeight;

  return success({ courseTitle, totalScore, assignments: assignmentGrades });
};

// ---------------------------------------------------------------------------
// getAssignmentFeedback — 수강 검증 → 과제 조회 → 제출물 조회 → 응답 조합
// ---------------------------------------------------------------------------

type GetAssignmentFeedbackParams = {
  courseId: string;
  assignmentId: string;
  userId: string;
};

export const getAssignmentFeedback = async (
  supabase: SupabaseClient,
  { courseId, assignmentId, userId }: GetAssignmentFeedbackParams,
): Promise<HandlerResult<AssignmentFeedbackResponse, GradesServiceError>> => {
  // Step 1 — 수강 등록 검증 (BR8, E4)
  const { data: enrollment, error: enrollError } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select('id')
    .eq('course_id', courseId)
    .eq('learner_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (enrollError) {
    return failure(500, gradesErrorCodes.fetchError, enrollError.message);
  }

  if (!enrollment) {
    return failure(
      403,
      gradesErrorCodes.notEnrolled,
      '수강 중인 코스가 아닙니다.',
    );
  }

  // Step 2 — 과제 조회
  const { data: assignmentRaw, error: assignError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select('id, title, weight, allow_resubmission')
    .eq('id', assignmentId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (assignError) {
    return failure(500, gradesErrorCodes.fetchError, assignError.message);
  }

  if (!assignmentRaw) {
    return failure(
      404,
      gradesErrorCodes.notFound,
      '존재하지 않는 과제입니다.',
    );
  }

  const assignment = assignmentRaw as unknown as RawAssignment;

  // Step 3 — 제출물 조회 + 본인 검증 (BR1, BR6, E7, E9)
  const { data: submissionRaw, error: subError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select(
      'id, assignment_id, learner_id, content, link, is_late, status, score, feedback, submitted_at, graded_at',
    )
    .eq('assignment_id', assignmentId)
    .eq('learner_id', userId)
    .maybeSingle();

  if (subError) {
    return failure(500, gradesErrorCodes.fetchError, subError.message);
  }

  if (!submissionRaw) {
    return failure(404, gradesErrorCodes.notFound, '제출물이 없습니다.');
  }

  const submission = submissionRaw as unknown as RawSubmission;

  // 본인 검증 방어 로직 (BR6, E9)
  if (submission.learner_id !== userId) {
    return failure(
      403,
      gradesErrorCodes.forbidden,
      '본인의 제출물만 열람할 수 있습니다.',
    );
  }

  // Step 4 — 응답 조합
  return success({
    assignment: {
      id: assignment.id,
      title: assignment.title,
      weight: assignment.weight,
      allowResubmission: assignment.allow_resubmission,
    },
    submission: {
      id: submission.id,
      content: submission.content,
      link: submission.link,
      isLate: submission.is_late,
      status: submission.status,
      score: submission.score,
      feedback: submission.feedback,
      submittedAt: submission.submitted_at,
      gradedAt: submission.graded_at,
    },
  });
};

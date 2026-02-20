import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import {
  instructorDashboardErrorCodes,
  type InstructorDashboardServiceError,
} from './error';
import type { InstructorDashboardResponse } from './schema';

const COURSES_TABLE = 'courses';
const ENROLLMENTS_TABLE = 'enrollments';
const ASSIGNMENTS_TABLE = 'assignments';
const SUBMISSIONS_TABLE = 'submissions';

// ---------------------------------------------------------------------------
// getInstructorDashboard — 대시보드 전체 데이터 집계
// ---------------------------------------------------------------------------

export const getInstructorDashboard = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<
  HandlerResult<InstructorDashboardResponse, InstructorDashboardServiceError>
> => {
  // Step 1 — 내 코스 목록 (MS-1, BR1, BR2)
  const { data: coursesRaw, error: coursesError } = await supabase
    .from(COURSES_TABLE)
    .select(
      `
      id,
      title,
      description,
      status,
      created_at,
      categories!courses_category_id_fkey ( name ),
      difficulty_levels!courses_difficulty_id_fkey ( name )
      `,
    )
    .eq('instructor_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (coursesError) {
    return failure(
      500,
      instructorDashboardErrorCodes.fetchError,
      coursesError.message,
    );
  }

  type RawCourse = {
    id: string;
    title: string;
    description: string;
    status: 'draft' | 'published' | 'archived';
    created_at: string;
    categories: { name: string } | null;
    difficulty_levels: { name: string } | null;
  };

  const courses = (coursesRaw ?? []) as unknown as RawCourse[];
  const courseIds = courses.map((c) => c.id);

  // E1: 코스 0건 → 빈 응답
  if (courseIds.length === 0) {
    return success({
      courses: [],
      totalPendingGradingCount: 0,
      recentSubmissions: [],
    });
  }

  // Step 2 — 코스별 수강생 수 (MS-1, BR6)
  const { data: enrollmentsRaw, error: enrollmentsError } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select('course_id')
    .in('course_id', courseIds)
    .eq('status', 'active');

  if (enrollmentsError) {
    return failure(
      500,
      instructorDashboardErrorCodes.fetchError,
      enrollmentsError.message,
    );
  }

  const learnerCountByCourseId = new Map<string, number>();
  for (const enrollment of enrollmentsRaw ?? []) {
    const cid = enrollment.course_id as string;
    learnerCountByCourseId.set(cid, (learnerCountByCourseId.get(cid) ?? 0) + 1);
  }

  // Step 3 — 본인 코스의 assignmentIds 추출 (Step 3, 4에서 공용)
  const { data: assignmentsForFilter, error: assignmentsFilterError } =
    await supabase
      .from(ASSIGNMENTS_TABLE)
      .select('id, course_id')
      .in('course_id', courseIds);

  if (assignmentsFilterError) {
    return failure(
      500,
      instructorDashboardErrorCodes.fetchError,
      assignmentsFilterError.message,
    );
  }

  const assignmentRows = (assignmentsForFilter ?? []) as unknown as { id: string; course_id: string }[];
  const assignmentIds = assignmentRows.map((a) => a.id);

  // 코스별 채점 대기 건수 (MS-2, BR3)
  let totalPendingGradingCount = 0;
  const pendingCountByCourseId = new Map<string, number>();

  if (assignmentIds.length > 0) {
    const { data: pendingRaw, error: pendingError } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select('id, assignment_id')
      .in('assignment_id', assignmentIds)
      .eq('status', 'submitted');

    if (pendingError) {
      return failure(
        500,
        instructorDashboardErrorCodes.fetchError,
        pendingError.message,
      );
    }

    const assignmentToCourse = new Map<string, string>();
    for (const row of assignmentRows) {
      assignmentToCourse.set(row.id, row.course_id);
    }

    for (const row of (pendingRaw ?? []) as unknown as { id: string; assignment_id: string }[]) {
      const cid = assignmentToCourse.get(row.assignment_id);
      if (cid) {
        pendingCountByCourseId.set(cid, (pendingCountByCourseId.get(cid) ?? 0) + 1);
      }
    }

    totalPendingGradingCount = Array.from(
      pendingCountByCourseId.values(),
    ).reduce((sum, count) => sum + count, 0);
  }

  // 코스 응답 조립
  const instructorCourses = courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    categoryName: c.categories?.name ?? null,
    difficultyName: c.difficulty_levels?.name ?? null,
    status: c.status,
    learnerCount: learnerCountByCourseId.get(c.id) ?? 0,
    pendingGradingCount: pendingCountByCourseId.get(c.id) ?? 0,
    createdAt: c.created_at,
  }));

  // Step 4 — 최근 제출물 (MS-3, BR4)
  if (assignmentIds.length === 0) {
    return success({
      courses: instructorCourses,
      totalPendingGradingCount,
      recentSubmissions: [],
    });
  }

  const { data: submissionsRaw, error: submissionsError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select(
      `
      id,
      learner_id,
      status,
      is_late,
      submitted_at,
      assignments!submissions_assignment_id_fkey (
        id,
        title,
        course_id,
        courses!assignments_course_id_fkey ( id, title )
      ),
      profiles!submissions_learner_id_fkey ( name )
      `,
    )
    .in('assignment_id', assignmentIds)
    .order('submitted_at', { ascending: false })
    .limit(10);

  if (submissionsError) {
    return failure(
      500,
      instructorDashboardErrorCodes.fetchError,
      submissionsError.message,
    );
  }

  type RawSubmission = {
    id: string;
    learner_id: string;
    status: 'submitted' | 'graded' | 'resubmission_required';
    is_late: boolean;
    submitted_at: string;
    assignments: {
      id: string;
      title: string;
      course_id: string;
      courses: { id: string; title: string } | null;
    } | null;
    profiles: { name: string } | null;
  };

  const submissionRows = (submissionsRaw ?? []) as unknown as RawSubmission[];

  const recentSubmissions = submissionRows.map((s) => ({
    id: s.id,
    assignmentId: s.assignments?.id ?? '',
    assignmentTitle: s.assignments?.title ?? '',
    courseId: s.assignments?.courses?.id ?? '',
    courseTitle: s.assignments?.courses?.title ?? '',
    learnerId: s.learner_id,
    learnerName: s.profiles?.name ?? '',
    status: s.status,
    isLate: s.is_late,
    submittedAt: s.submitted_at,
  }));

  return success({
    courses: instructorCourses,
    totalPendingGradingCount,
    recentSubmissions,
  });
};

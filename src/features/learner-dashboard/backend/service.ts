import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import { dashboardErrorCodes, type DashboardServiceError } from './error';
import type { LearnerDashboardResponse } from './schema';

const ENROLLMENTS_TABLE = 'enrollments';
const COURSES_TABLE = 'courses';
const ASSIGNMENTS_TABLE = 'assignments';
const SUBMISSIONS_TABLE = 'submissions';

// ---------------------------------------------------------------------------
// getLearnerDashboard — 대시보드 전체 데이터 집계
// ---------------------------------------------------------------------------

export const getLearnerDashboard = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<HandlerResult<LearnerDashboardResponse, DashboardServiceError>> => {
  // Step 1 — 수강 중인 코스 목록 (MS-1)
  const { data: enrollments, error: enrollError } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select(
      `
      course_id,
      courses!enrollments_course_id_fkey (
        id,
        title,
        description,
        categories!courses_category_id_fkey ( name ),
        difficulty_levels!courses_difficulty_id_fkey ( name ),
        profiles!courses_instructor_id_fkey ( name )
      )
      `,
    )
    .eq('learner_id', userId)
    .eq('status', 'active');

  if (enrollError) {
    return failure(500, dashboardErrorCodes.fetchError, enrollError.message);
  }

  type RawEnrollment = {
    course_id: string;
    courses: {
      id: string;
      title: string;
      description: string;
      categories: { name: string } | null;
      difficulty_levels: { name: string } | null;
      profiles: { name: string } | null;
    } | null;
  };

  const rows = (enrollments ?? []) as unknown as RawEnrollment[];
  const courseIds = rows
    .filter((r) => r.courses !== null)
    .map((r) => r.course_id);

  // E1: 수강 코스 0건 → 빈 응답
  if (courseIds.length === 0) {
    return success({
      courses: [],
      upcomingAssignments: [],
      recentFeedback: [],
    });
  }

  // Step 2 — 코스별 전체 과제 수 (BR2)
  const { data: allAssignments, error: assignError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select('id, course_id')
    .in('course_id', courseIds)
    .in('status', ['published', 'closed']);

  if (assignError) {
    return failure(500, dashboardErrorCodes.fetchError, assignError.message);
  }

  const totalByCourseId = new Map<string, number>();
  for (const a of allAssignments ?? []) {
    totalByCourseId.set(
      a.course_id,
      (totalByCourseId.get(a.course_id) ?? 0) + 1,
    );
  }

  // Step 3 — 코스별 완료 과제 수 (BR2)
  const { data: gradedSubmissions, error: gradedError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select('assignment_id, assignments!submissions_assignment_id_fkey ( course_id )')
    .eq('learner_id', userId)
    .eq('status', 'graded');

  if (gradedError) {
    return failure(500, dashboardErrorCodes.fetchError, gradedError.message);
  }

  type RawGradedSubmission = {
    assignment_id: string;
    assignments: { course_id: string } | null;
  };

  const gradedRows = (gradedSubmissions ?? []) as unknown as RawGradedSubmission[];
  const completedByCourseId = new Map<string, number>();
  for (const s of gradedRows) {
    const cid = s.assignments?.course_id;
    if (cid && courseIds.includes(cid)) {
      completedByCourseId.set(cid, (completedByCourseId.get(cid) ?? 0) + 1);
    }
  }

  // Step 4 — 코스 응답 조립 + 진행률 계산
  const courses = rows
    .filter((r) => r.courses !== null)
    .map((r) => {
      const c = r.courses!;
      const total = totalByCourseId.get(r.course_id) ?? 0;
      const completed = completedByCourseId.get(r.course_id) ?? 0;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        categoryName: c.categories?.name ?? null,
        difficultyName: c.difficulty_levels?.name ?? null,
        instructorName: c.profiles?.name ?? '',
        progress: { completed, total, percentage },
      };
    });

  // Step 5 — 마감 임박 과제 (MS-2, BR3)
  const { data: upcomingRaw, error: upcomingError } = await supabase
    .from(ASSIGNMENTS_TABLE)
    .select('id, course_id, title, due_date, courses!assignments_course_id_fkey ( title )')
    .in('course_id', courseIds)
    .eq('status', 'published')
    .gt('due_date', new Date().toISOString())
    .order('due_date', { ascending: true })
    .limit(10);

  if (upcomingError) {
    return failure(500, dashboardErrorCodes.fetchError, upcomingError.message);
  }

  type RawUpcoming = {
    id: string;
    course_id: string;
    title: string;
    due_date: string;
    courses: { title: string } | null;
  };

  const upcomingRows = (upcomingRaw ?? []) as unknown as RawUpcoming[];
  const upcomingIds = upcomingRows.map((a) => a.id);

  const submissionStatusMap = new Map<string, string>();

  if (upcomingIds.length > 0) {
    const { data: subs } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select('assignment_id, status')
      .eq('learner_id', userId)
      .in('assignment_id', upcomingIds);

    for (const s of subs ?? []) {
      submissionStatusMap.set(s.assignment_id, s.status);
    }
  }

  const upcomingAssignments = upcomingRows.map((a) => ({
    id: a.id,
    courseId: a.course_id,
    courseTitle: a.courses?.title ?? '',
    title: a.title,
    dueDate: a.due_date,
    submissionStatus:
      (submissionStatusMap.get(a.id) as
        | 'submitted'
        | 'graded'
        | 'resubmission_required') ?? null,
  }));

  // Step 6 — 최근 피드백 (MS-3, BR4)
  const { data: feedbackRaw, error: feedbackError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select(
      `
      id,
      assignment_id,
      score,
      feedback,
      status,
      graded_at,
      assignments!submissions_assignment_id_fkey (
        title,
        courses!assignments_course_id_fkey ( title )
      )
      `,
    )
    .eq('learner_id', userId)
    .not('feedback', 'is', null)
    .order('graded_at', { ascending: false })
    .limit(10);

  if (feedbackError) {
    return failure(500, dashboardErrorCodes.fetchError, feedbackError.message);
  }

  type RawFeedback = {
    id: string;
    assignment_id: string;
    score: number | null;
    feedback: string | null;
    status: string;
    graded_at: string | null;
    assignments: {
      title: string;
      courses: { title: string } | null;
    } | null;
  };

  const feedbackRows = (feedbackRaw ?? []) as unknown as RawFeedback[];

  const recentFeedback = feedbackRows.map((f) => ({
    submissionId: f.id,
    assignmentId: f.assignment_id,
    assignmentTitle: f.assignments?.title ?? '',
    courseTitle: f.assignments?.courses?.title ?? '',
    score: f.score,
    feedback: f.feedback,
    status: f.status as 'submitted' | 'graded' | 'resubmission_required',
    gradedAt: f.graded_at,
  }));

  return success({
    courses,
    upcomingAssignments,
    recentFeedback,
  });
};

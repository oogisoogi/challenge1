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
// getLearnerDashboard — 대시보드 데이터 집계
// ---------------------------------------------------------------------------

export const getLearnerDashboard = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<HandlerResult<LearnerDashboardResponse, DashboardServiceError>> => {
  // 1. 수강 중인 코스 목록
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

  // 2-3. 진행률 계산: 코스별 전체 과제 수 & 완료 과제 수
  type AssignmentCountRow = { course_id: string; count: number };
  type SubmissionCountRow = { course_id: string; count: number };

  let assignmentCounts: AssignmentCountRow[] = [];
  let submissionCounts: SubmissionCountRow[] = [];

  if (courseIds.length > 0) {
    const { data: assignData, error: assignError } = await supabase
      .from(ASSIGNMENTS_TABLE)
      .select('course_id')
      .in('course_id', courseIds)
      .in('status', ['published', 'closed']);

    if (assignError) {
      return failure(500, dashboardErrorCodes.fetchError, assignError.message);
    }

    const assignRows = (assignData ?? []) as { course_id: string }[];
    const assignCountMap = new Map<string, number>();
    for (const row of assignRows) {
      assignCountMap.set(row.course_id, (assignCountMap.get(row.course_id) ?? 0) + 1);
    }
    assignmentCounts = Array.from(assignCountMap.entries()).map(([course_id, count]) => ({
      course_id,
      count,
    }));

    const { data: subData, error: subError } = await supabase
      .from(SUBMISSIONS_TABLE)
      .select('assignment_id, assignments!submissions_assignment_id_fkey ( course_id )')
      .eq('learner_id', userId)
      .eq('status', 'graded');

    if (subError) {
      return failure(500, dashboardErrorCodes.fetchError, subError.message);
    }

    type RawSubmission = {
      assignment_id: string;
      assignments: { course_id: string } | null;
    };

    const subRows = (subData ?? []) as unknown as RawSubmission[];
    const subCountMap = new Map<string, number>();
    for (const row of subRows) {
      const cid = row.assignments?.course_id;
      if (cid && courseIds.includes(cid)) {
        subCountMap.set(cid, (subCountMap.get(cid) ?? 0) + 1);
      }
    }
    submissionCounts = Array.from(subCountMap.entries()).map(([course_id, count]) => ({
      course_id,
      count,
    }));
  }

  const assignMap = new Map(assignmentCounts.map((r) => [r.course_id, r.count]));
  const subMap = new Map(submissionCounts.map((r) => [r.course_id, r.count]));

  const courses = rows
    .filter((r) => r.courses !== null)
    .map((r) => {
      const c = r.courses!;
      const total = assignMap.get(r.course_id) ?? 0;
      const completed = subMap.get(r.course_id) ?? 0;
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

  // 4. 마감 임박 과제 (published, due_date > now)
  let upcomingAssignments: LearnerDashboardResponse['upcomingAssignments'] = [];

  if (courseIds.length > 0) {
    const { data: upcomingData, error: upcomingError } = await supabase
      .from(ASSIGNMENTS_TABLE)
      .select(
        `
        id,
        course_id,
        title,
        due_date,
        courses!assignments_course_id_fkey ( title )
        `,
      )
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

    const upcomingRows = (upcomingData ?? []) as unknown as RawUpcoming[];
    const assignmentIds = upcomingRows.map((r) => r.id);

    let submissionMap = new Map<string, string>();

    if (assignmentIds.length > 0) {
      const { data: subStatusData } = await supabase
        .from(SUBMISSIONS_TABLE)
        .select('assignment_id, status')
        .eq('learner_id', userId)
        .in('assignment_id', assignmentIds);

      const subStatusRows = (subStatusData ?? []) as {
        assignment_id: string;
        status: string;
      }[];

      submissionMap = new Map(
        subStatusRows.map((r) => [r.assignment_id, r.status]),
      );
    }

    upcomingAssignments = upcomingRows.map((r) => ({
      id: r.id,
      courseId: r.course_id,
      courseTitle: r.courses?.title ?? '',
      title: r.title,
      dueDate: r.due_date,
      submissionStatus:
        (submissionMap.get(r.id) as
          | 'submitted'
          | 'graded'
          | 'resubmission_required') ?? null,
    }));
  }

  // 5. 최근 피드백 (feedback IS NOT NULL)
  const { data: feedbackData, error: feedbackError } = await supabase
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

  const feedbackRows = (feedbackData ?? []) as unknown as RawFeedback[];

  const recentFeedback = feedbackRows.map((r) => ({
    submissionId: r.id,
    assignmentId: r.assignment_id,
    assignmentTitle: r.assignments?.title ?? '',
    courseTitle: r.assignments?.courses?.title ?? '',
    score: r.score,
    feedback: r.feedback,
    status: r.status as 'submitted' | 'graded' | 'resubmission_required',
    gradedAt: r.graded_at,
  }));

  return success({
    courses,
    upcomingAssignments,
    recentFeedback,
  });
};

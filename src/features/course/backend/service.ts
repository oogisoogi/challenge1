import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import { courseErrorCodes, type CourseServiceError } from './error';
import type {
  CourseListQuery,
  CourseListResponse,
  CourseDetailResponse,
  EnrollResponse,
  CancelEnrollResponse,
  CourseMetaResponse,
} from './schema';

const COURSES_TABLE = 'courses';
const ENROLLMENTS_TABLE = 'enrollments';
const CATEGORIES_TABLE = 'categories';
const DIFFICULTY_LEVELS_TABLE = 'difficulty_levels';
const PROFILES_TABLE = 'profiles';

// ---------------------------------------------------------------------------
// getCourses — 카탈로그 목록 조회
// ---------------------------------------------------------------------------

export const getCourses = async (
  supabase: SupabaseClient,
  query: CourseListQuery,
): Promise<HandlerResult<CourseListResponse, CourseServiceError>> => {
  const { q, categoryId, difficultyId, sort, page, limit } = query;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let builder = supabase
    .from(COURSES_TABLE)
    .select(
      `
      id,
      title,
      description,
      created_at,
      categories!courses_category_id_fkey ( name ),
      difficulty_levels!courses_difficulty_id_fkey ( name ),
      profiles!courses_instructor_id_fkey ( name ),
      enrollments ( count )
      `,
      { count: 'exact' },
    )
    .eq('status', 'published');

  if (q) {
    builder = builder.ilike('title', `%${q}%`);
  }
  if (categoryId) {
    builder = builder.eq('category_id', categoryId);
  }
  if (difficultyId) {
    builder = builder.eq('difficulty_id', difficultyId);
  }

  builder = builder.order('created_at', { ascending: false });

  if (sort === 'latest') {
    builder = builder.range(from, to);
  }

  const { data, error, count: total } = await builder;

  if (error) {
    return failure(500, courseErrorCodes.fetchError, error.message);
  }

  type RawRow = {
    id: string;
    title: string;
    description: string;
    created_at: string;
    categories: { name: string } | null;
    difficulty_levels: { name: string } | null;
    profiles: { name: string } | null;
    enrollments: { count: number }[];
  };

  const rows = (data ?? []) as unknown as RawRow[];

  const courses = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    categoryName: row.categories?.name ?? null,
    difficultyName: row.difficulty_levels?.name ?? null,
    instructorName: row.profiles?.name ?? '',
    enrollmentCount: row.enrollments?.[0]?.count ?? 0,
    createdAt: row.created_at,
  }));

  if (sort === 'popular') {
    courses.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
    const paginated = courses.slice(from, from + limit);
    return success({
      courses: paginated,
      total: total ?? 0,
      page,
      limit,
    });
  }

  return success({
    courses,
    total: total ?? 0,
    page,
    limit,
  });
};

// ---------------------------------------------------------------------------
// getCourseDetail — 코스 상세 조회
// ---------------------------------------------------------------------------

export const getCourseDetail = async (
  supabase: SupabaseClient,
  params: { courseId: string; userId?: string | null },
): Promise<HandlerResult<CourseDetailResponse, CourseServiceError>> => {
  const { courseId, userId } = params;

  const { data: course, error } = await supabase
    .from(COURSES_TABLE)
    .select(
      `
      id,
      title,
      description,
      curriculum,
      created_at,
      categories!courses_category_id_fkey ( name ),
      difficulty_levels!courses_difficulty_id_fkey ( name ),
      profiles!courses_instructor_id_fkey ( name, bio )
      `,
    )
    .eq('id', courseId)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    return failure(500, courseErrorCodes.fetchError, error.message);
  }

  if (!course) {
    return failure(404, courseErrorCodes.notFound, '코스를 찾을 수 없습니다.');
  }

  type RawCourse = {
    id: string;
    title: string;
    description: string;
    curriculum: string;
    created_at: string;
    categories: { name: string } | null;
    difficulty_levels: { name: string } | null;
    profiles: { name: string; bio: string } | null;
  };

  const row = course as unknown as RawCourse;

  const { count: enrollmentCount } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('status', 'active');

  let enrollmentStatus: 'active' | 'cancelled' | null = null;

  if (userId) {
    const { data: enrollment } = await supabase
      .from(ENROLLMENTS_TABLE)
      .select('status')
      .eq('course_id', courseId)
      .eq('learner_id', userId)
      .maybeSingle();

    enrollmentStatus = (enrollment?.status as 'active' | 'cancelled') ?? null;
  }

  return success({
    id: row.id,
    title: row.title,
    description: row.description,
    curriculum: row.curriculum,
    categoryName: row.categories?.name ?? null,
    difficultyName: row.difficulty_levels?.name ?? null,
    instructorName: row.profiles?.name ?? '',
    instructorBio: row.profiles?.bio ?? '',
    enrollmentCount: enrollmentCount ?? 0,
    enrollmentStatus,
    createdAt: row.created_at,
  });
};

// ---------------------------------------------------------------------------
// enrollCourse — 수강신청
// ---------------------------------------------------------------------------

export const enrollCourse = async (
  supabase: SupabaseClient,
  params: { courseId: string; userId: string },
): Promise<HandlerResult<EnrollResponse, CourseServiceError>> => {
  const { courseId, userId } = params;

  const { data: profile } = await supabase
    .from(PROFILES_TABLE)
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role !== 'learner') {
    return failure(
      403,
      courseErrorCodes.forbiddenRole,
      '학습자만 수강신청할 수 있습니다.',
    );
  }

  const { data: course } = await supabase
    .from(COURSES_TABLE)
    .select('status')
    .eq('id', courseId)
    .maybeSingle();

  if (!course) {
    return failure(404, courseErrorCodes.notFound, '코스를 찾을 수 없습니다.');
  }

  if (course.status !== 'published') {
    return failure(
      400,
      courseErrorCodes.notPublished,
      '공개되지 않은 코스입니다.',
    );
  }

  const { data: existingEnrollment } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select('id, status')
    .eq('course_id', courseId)
    .eq('learner_id', userId)
    .maybeSingle();

  if (existingEnrollment?.status === 'active') {
    return failure(
      409,
      courseErrorCodes.alreadyEnrolled,
      '이미 수강 중인 코스입니다.',
    );
  }

  if (existingEnrollment) {
    const { data: updated, error: updateError } = await supabase
      .from(ENROLLMENTS_TABLE)
      .update({ status: 'active' })
      .eq('id', existingEnrollment.id)
      .select('id')
      .single();

    if (updateError || !updated) {
      return failure(
        500,
        courseErrorCodes.enrollFailed,
        updateError?.message ?? '수강신청에 실패했습니다.',
      );
    }

    return success({ enrollmentId: updated.id, status: 'active' as const });
  }

  const { data: inserted, error: insertError } = await supabase
    .from(ENROLLMENTS_TABLE)
    .insert({ course_id: courseId, learner_id: userId, status: 'active' })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return failure(
      500,
      courseErrorCodes.enrollFailed,
      insertError?.message ?? '수강신청에 실패했습니다.',
    );
  }

  return success({ enrollmentId: inserted.id, status: 'active' as const });
};

// ---------------------------------------------------------------------------
// cancelEnrollment — 수강취소
// ---------------------------------------------------------------------------

export const cancelEnrollment = async (
  supabase: SupabaseClient,
  params: { courseId: string; userId: string },
): Promise<HandlerResult<CancelEnrollResponse, CourseServiceError>> => {
  const { courseId, userId } = params;

  const { data: enrollment } = await supabase
    .from(ENROLLMENTS_TABLE)
    .select('id, status')
    .eq('course_id', courseId)
    .eq('learner_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!enrollment) {
    return failure(
      404,
      courseErrorCodes.notEnrolled,
      '수강 중인 코스가 아닙니다.',
    );
  }

  const { error: updateError } = await supabase
    .from(ENROLLMENTS_TABLE)
    .update({ status: 'cancelled' })
    .eq('id', enrollment.id);

  if (updateError) {
    return failure(
      500,
      courseErrorCodes.cancelFailed,
      updateError.message ?? '수강취소에 실패했습니다.',
    );
  }

  return success({
    enrollmentId: enrollment.id,
    status: 'cancelled' as const,
  });
};

// ---------------------------------------------------------------------------
// getCourseMeta — 카테고리 + 난이도 목록
// ---------------------------------------------------------------------------

export const getCourseMeta = async (
  supabase: SupabaseClient,
): Promise<HandlerResult<CourseMetaResponse, CourseServiceError>> => {
  const { data: categories, error: catError } = await supabase
    .from(CATEGORIES_TABLE)
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (catError) {
    return failure(500, courseErrorCodes.fetchError, catError.message);
  }

  const { data: difficultyLevels, error: diffError } = await supabase
    .from(DIFFICULTY_LEVELS_TABLE)
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (diffError) {
    return failure(500, courseErrorCodes.fetchError, diffError.message);
  }

  return success({
    categories: categories ?? [],
    difficultyLevels: difficultyLevels ?? [],
  });
};

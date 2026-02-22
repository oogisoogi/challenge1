import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
  type ErrorResult,
} from '@/backend/http/response';
import {
  courseManagementErrorCodes,
  type CourseManagementServiceError,
} from './error';
import type {
  CategoryCreatedResponse,
  CourseManagementResponse,
  CreateCategoryBodyInstructor,
  CreateCourseBody,
  UpdateCourseBody,
} from './schema';

const COURSES_TABLE = 'courses';
const CATEGORIES_TABLE = 'categories';
const DIFFICULTY_LEVELS_TABLE = 'difficulty_levels';

const COURSE_SELECT = `
  id,
  instructor_id,
  title,
  description,
  category_id,
  difficulty_id,
  curriculum,
  status,
  created_at,
  updated_at,
  categories!courses_category_id_fkey ( name ),
  difficulty_levels!courses_difficulty_id_fkey ( name )
`;

type RawCourse = {
  id: string;
  instructor_id: string;
  title: string;
  description: string;
  category_id: string | null;
  difficulty_id: string | null;
  curriculum: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  categories: { name: string } | null;
  difficulty_levels: { name: string } | null;
};

const mapRawCourse = (raw: RawCourse): CourseManagementResponse => ({
  id: raw.id,
  title: raw.title,
  description: raw.description,
  categoryId: raw.category_id,
  categoryName: raw.categories?.name ?? null,
  difficultyId: raw.difficulty_id,
  difficultyName: raw.difficulty_levels?.name ?? null,
  curriculum: raw.curriculum,
  status: raw.status,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

const validateCategory = async (
  supabase: SupabaseClient,
  categoryId: string,
): Promise<ErrorResult<CourseManagementServiceError> | null> => {
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .select('id')
    .eq('id', categoryId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return failure(500, courseManagementErrorCodes.fetchError, error.message);
  }

  if (!data) {
    return failure(
      400,
      courseManagementErrorCodes.invalidCategory,
      '유효하지 않은 카테고리입니다.',
    );
  }

  return null;
};

const validateDifficulty = async (
  supabase: SupabaseClient,
  difficultyId: string,
): Promise<ErrorResult<CourseManagementServiceError> | null> => {
  const { data, error } = await supabase
    .from(DIFFICULTY_LEVELS_TABLE)
    .select('id')
    .eq('id', difficultyId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return failure(500, courseManagementErrorCodes.fetchError, error.message);
  }

  if (!data) {
    return failure(
      400,
      courseManagementErrorCodes.invalidDifficulty,
      '유효하지 않은 난이도입니다.',
    );
  }

  return null;
};

// ---------------------------------------------------------------------------
// createCourse — 코스 생성 (status='draft')
// ---------------------------------------------------------------------------

export const createCourse = async (
  supabase: SupabaseClient,
  userId: string,
  body: CreateCourseBody,
): Promise<HandlerResult<CourseManagementResponse, CourseManagementServiceError>> => {
  const categoryError = await validateCategory(supabase, body.categoryId);
  if (categoryError) return categoryError;

  const difficultyError = await validateDifficulty(supabase, body.difficultyId);
  if (difficultyError) return difficultyError;

  const { data: insertedData, error: insertError } = await supabase
    .from(COURSES_TABLE)
    .insert({
      instructor_id: userId,
      title: body.title,
      description: body.description,
      category_id: body.categoryId,
      difficulty_id: body.difficultyId,
      curriculum: body.curriculum,
      status: 'draft',
    })
    .select(COURSE_SELECT)
    .single();

  if (insertError || !insertedData) {
    return failure(
      500,
      courseManagementErrorCodes.createFailed,
      insertError?.message ?? '코스 생성에 실패했습니다.',
    );
  }

  return success(mapRawCourse(insertedData as unknown as RawCourse), 201);
};

// ---------------------------------------------------------------------------
// getCourse — 코스 조회 (소유자 검증 포함)
// ---------------------------------------------------------------------------

export const getCourse = async (
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<HandlerResult<CourseManagementResponse, CourseManagementServiceError>> => {
  const { data, error } = await supabase
    .from(COURSES_TABLE)
    .select(COURSE_SELECT)
    .eq('id', courseId)
    .maybeSingle();

  if (error) {
    return failure(500, courseManagementErrorCodes.fetchError, error.message);
  }

  if (!data) {
    return failure(404, courseManagementErrorCodes.notFound, '코스를 찾을 수 없습니다.');
  }

  const raw = data as unknown as RawCourse;

  if (raw.instructor_id !== userId) {
    return failure(
      403,
      courseManagementErrorCodes.forbidden,
      '본인의 코스만 수정할 수 있습니다.',
    );
  }

  return success(mapRawCourse(raw));
};

// ---------------------------------------------------------------------------
// updateCourse — 코스 필드 수정
// ---------------------------------------------------------------------------

export const updateCourse = async (
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  body: UpdateCourseBody,
): Promise<HandlerResult<CourseManagementResponse, CourseManagementServiceError>> => {
  const { data: existing, error: fetchError } = await supabase
    .from(COURSES_TABLE)
    .select('id, instructor_id')
    .eq('id', courseId)
    .maybeSingle();

  if (fetchError) {
    return failure(500, courseManagementErrorCodes.fetchError, fetchError.message);
  }

  if (!existing) {
    return failure(404, courseManagementErrorCodes.notFound, '코스를 찾을 수 없습니다.');
  }

  const existingRow = existing as unknown as { id: string; instructor_id: string };

  if (existingRow.instructor_id !== userId) {
    return failure(
      403,
      courseManagementErrorCodes.forbidden,
      '본인의 코스만 수정할 수 있습니다.',
    );
  }

  if (body.categoryId !== undefined) {
    const categoryError = await validateCategory(supabase, body.categoryId);
    if (categoryError) return categoryError;
  }

  if (body.difficultyId !== undefined) {
    const difficultyError = await validateDifficulty(supabase, body.difficultyId);
    if (difficultyError) return difficultyError;
  }

  const updateFields: Record<string, unknown> = {};
  if (body.title !== undefined) updateFields.title = body.title;
  if (body.description !== undefined) updateFields.description = body.description;
  if (body.categoryId !== undefined) updateFields.category_id = body.categoryId;
  if (body.difficultyId !== undefined) updateFields.difficulty_id = body.difficultyId;
  if (body.curriculum !== undefined) updateFields.curriculum = body.curriculum;

  const { data: updatedData, error: updateError } = await supabase
    .from(COURSES_TABLE)
    .update(updateFields)
    .eq('id', courseId)
    .select(COURSE_SELECT)
    .single();

  if (updateError || !updatedData) {
    return failure(
      500,
      courseManagementErrorCodes.updateFailed,
      updateError?.message ?? '코스 수정에 실패했습니다.',
    );
  }

  return success(mapRawCourse(updatedData as unknown as RawCourse));
};

// ---------------------------------------------------------------------------
// createCategoryForInstructor — 강사가 새 카테고리 추가
// ---------------------------------------------------------------------------

export const createCategoryForInstructor = async (
  supabase: SupabaseClient,
  body: CreateCategoryBodyInstructor,
): Promise<HandlerResult<CategoryCreatedResponse, CourseManagementServiceError>> => {
  const { data, error } = await supabase
    .from(CATEGORIES_TABLE)
    .insert({ name: body.name, is_active: true })
    .select('id, name')
    .single();

  if (error) {
    if (error.code === '23505') {
      return failure(409, courseManagementErrorCodes.duplicateCategory, '이미 존재하는 카테고리입니다.');
    }
    return failure(
      500,
      courseManagementErrorCodes.categoryCreateFailed,
      error.message ?? '카테고리 생성에 실패했습니다.',
    );
  }

  const row = data as unknown as { id: string; name: string };
  return success({ id: row.id, name: row.name }, 201);
};

// ---------------------------------------------------------------------------
// deleteCourse — 코스 삭제 (draft / archived 상태만 허용)
// ---------------------------------------------------------------------------

export const deleteCourse = async (
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
): Promise<HandlerResult<{ deleted: true }, CourseManagementServiceError>> => {
  const { data: existing, error: fetchError } = await supabase
    .from(COURSES_TABLE)
    .select('id, instructor_id, status')
    .eq('id', courseId)
    .maybeSingle();

  if (fetchError) {
    return failure(500, courseManagementErrorCodes.fetchError, fetchError.message);
  }

  if (!existing) {
    return failure(404, courseManagementErrorCodes.notFound, '코스를 찾을 수 없습니다.');
  }

  const existingRow = existing as unknown as {
    id: string;
    instructor_id: string;
    status: string;
  };

  if (existingRow.instructor_id !== userId) {
    return failure(
      403,
      courseManagementErrorCodes.forbidden,
      '본인의 코스만 삭제할 수 있습니다.',
    );
  }

  if (existingRow.status === 'published') {
    return failure(
      400,
      courseManagementErrorCodes.deleteNotAllowed,
      '게시 중인 코스는 삭제할 수 없습니다. 먼저 보관 처리해주세요.',
    );
  }

  const { error: deleteError } = await supabase
    .from(COURSES_TABLE)
    .delete()
    .eq('id', courseId);

  if (deleteError) {
    return failure(
      500,
      courseManagementErrorCodes.deleteFailed,
      deleteError.message ?? '코스 삭제에 실패했습니다.',
    );
  }

  return success({ deleted: true as const });
};

// ---------------------------------------------------------------------------
// updateCourseStatus — 상태 전환 (BR2: draft -> published -> archived)
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['published'],
  published: ['archived'],
  archived: [],
};

export const updateCourseStatus = async (
  supabase: SupabaseClient,
  userId: string,
  courseId: string,
  newStatus: 'published' | 'archived',
): Promise<HandlerResult<CourseManagementResponse, CourseManagementServiceError>> => {
  const { data: existing, error: fetchError } = await supabase
    .from(COURSES_TABLE)
    .select('id, instructor_id, status')
    .eq('id', courseId)
    .maybeSingle();

  if (fetchError) {
    return failure(500, courseManagementErrorCodes.fetchError, fetchError.message);
  }

  if (!existing) {
    return failure(404, courseManagementErrorCodes.notFound, '코스를 찾을 수 없습니다.');
  }

  const existingRow = existing as unknown as {
    id: string;
    instructor_id: string;
    status: string;
  };

  if (existingRow.instructor_id !== userId) {
    return failure(
      403,
      courseManagementErrorCodes.forbidden,
      '본인의 코스만 수정할 수 있습니다.',
    );
  }

  const currentStatus = existingRow.status;
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] ?? [];

  if (!allowedNextStatuses.includes(newStatus)) {
    return failure(
      400,
      courseManagementErrorCodes.invalidStatusTransition,
      '허용되지 않는 상태 전환입니다.',
    );
  }

  const { data: updatedData, error: updateError } = await supabase
    .from(COURSES_TABLE)
    .update({ status: newStatus })
    .eq('id', courseId)
    .select(COURSE_SELECT)
    .single();

  if (updateError || !updatedData) {
    return failure(
      500,
      courseManagementErrorCodes.updateFailed,
      updateError?.message ?? '코스 상태 업데이트에 실패했습니다.',
    );
  }

  return success(mapRawCourse(updatedData as unknown as RawCourse));
};

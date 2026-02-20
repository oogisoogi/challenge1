import type { SupabaseClient } from '@supabase/supabase-js';
import { failure, success, type HandlerResult } from '@/backend/http/response';
import { operatorErrorCodes, type OperatorServiceError } from './error';
import type {
  OperatorDashboardResponse,
  ReportsResponse,
  ReportDetailResponse,
  UpdateReportBody,
  CategoriesResponse,
  CategoryResponse,
  CreateCategoryBody,
  UpdateCategoryBody,
  DifficultyLevelsResponse,
  DifficultyLevelResponse,
  CreateDifficultyLevelBody,
  UpdateDifficultyLevelBody,
  ReportsQuery,
} from './schema';

// ---------------------------------------------------------------------------
// getOperatorDashboard (MS-1)
// ---------------------------------------------------------------------------

export const getOperatorDashboard = async (
  supabase: SupabaseClient,
): Promise<HandlerResult<OperatorDashboardResponse, OperatorServiceError>> => {
  const [
    receivedResult,
    investigatingResult,
    coursesResult,
    usersResult,
  ] = await Promise.all([
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'received'),
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'investigating'),
    supabase
      .from('courses')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
  ]);

  if (receivedResult.error) {
    return failure(500, operatorErrorCodes.fetchError, receivedResult.error.message);
  }
  if (investigatingResult.error) {
    return failure(500, operatorErrorCodes.fetchError, investigatingResult.error.message);
  }
  if (coursesResult.error) {
    return failure(500, operatorErrorCodes.fetchError, coursesResult.error.message);
  }
  if (usersResult.error) {
    return failure(500, operatorErrorCodes.fetchError, usersResult.error.message);
  }

  return success({
    receivedReportCount: receivedResult.count ?? 0,
    investigatingReportCount: investigatingResult.count ?? 0,
    totalCourseCount: coursesResult.count ?? 0,
    totalUserCount: usersResult.count ?? 0,
  });
};

// ---------------------------------------------------------------------------
// getReports (MS-2)
// ---------------------------------------------------------------------------

export const getReports = async (
  supabase: SupabaseClient,
  filters: ReportsQuery,
): Promise<HandlerResult<ReportsResponse, OperatorServiceError>> => {
  let query = supabase
    .from('reports')
    .select(`
      id,
      reporter_id,
      target_type,
      target_id,
      reason,
      content,
      status,
      action,
      created_at,
      updated_at,
      profiles!reports_reporter_id_fkey ( name )
    `)
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.target_type) {
    query = query.eq('target_type', filters.target_type);
  }

  const { data, error } = await query;

  if (error) {
    return failure(500, operatorErrorCodes.fetchError, error.message);
  }

  type RawReport = {
    id: string;
    reporter_id: string;
    target_type: 'course' | 'assignment' | 'submission' | 'user';
    target_id: string;
    reason: string;
    content: string;
    status: 'received' | 'investigating' | 'resolved';
    action: 'warning' | 'invalidate_submission' | 'restrict_account' | null;
    created_at: string;
    updated_at: string;
    profiles: { name: string } | null;
  };

  const rows = (data ?? []) as unknown as RawReport[];

  const reports = rows.map((r) => ({
    id: r.id,
    reporterId: r.reporter_id,
    reporterName: r.profiles?.name ?? '',
    targetType: r.target_type,
    targetId: r.target_id,
    reason: r.reason,
    content: r.content,
    status: r.status,
    action: r.action,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return success({ reports });
};

// ---------------------------------------------------------------------------
// getReport (MS-3)
// ---------------------------------------------------------------------------

export const getReport = async (
  supabase: SupabaseClient,
  reportId: string,
): Promise<HandlerResult<ReportDetailResponse, OperatorServiceError>> => {
  const { data, error } = await supabase
    .from('reports')
    .select(`
      id,
      reporter_id,
      target_type,
      target_id,
      reason,
      content,
      status,
      action,
      created_at,
      updated_at,
      profiles!reports_reporter_id_fkey ( name )
    `)
    .eq('id', reportId)
    .maybeSingle();

  if (error) {
    return failure(500, operatorErrorCodes.fetchError, error.message);
  }

  if (!data) {
    return failure(404, operatorErrorCodes.notFound, '신고를 찾을 수 없습니다.');
  }

  type RawReport = {
    id: string;
    reporter_id: string;
    target_type: 'course' | 'assignment' | 'submission' | 'user';
    target_id: string;
    reason: string;
    content: string;
    status: 'received' | 'investigating' | 'resolved';
    action: 'warning' | 'invalidate_submission' | 'restrict_account' | null;
    created_at: string;
    updated_at: string;
    profiles: { name: string } | null;
  };

  const r = data as unknown as RawReport;

  return success({
    report: {
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: r.profiles?.name ?? '',
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      content: r.content,
      status: r.status,
      action: r.action,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    },
  });
};

// ---------------------------------------------------------------------------
// updateReport (MS-3, MS-4)
// ---------------------------------------------------------------------------

export const updateReport = async (
  supabase: SupabaseClient,
  reportId: string,
  body: UpdateReportBody,
): Promise<HandlerResult<ReportDetailResponse, OperatorServiceError>> => {
  const { data: existing, error: fetchError } = await supabase
    .from('reports')
    .select('id, status, target_type, target_id')
    .eq('id', reportId)
    .maybeSingle();

  if (fetchError) {
    return failure(500, operatorErrorCodes.fetchError, fetchError.message);
  }

  if (!existing) {
    return failure(404, operatorErrorCodes.notFound, '신고를 찾을 수 없습니다.');
  }

  type ExistingReport = {
    id: string;
    status: 'received' | 'investigating' | 'resolved';
    target_type: 'course' | 'assignment' | 'submission' | 'user';
    target_id: string;
  };

  const current = existing as unknown as ExistingReport;

  // 이미 처리 완료된 신고 (E3, BR2)
  if (current.status === 'resolved') {
    return failure(
      400,
      operatorErrorCodes.invalidStatusTransition,
      '이미 처리 완료된 신고입니다.',
    );
  }

  // received -> resolved 직접 전환 불가 (E4, BR2)
  if (current.status === 'received' && body.status === 'resolved') {
    return failure(
      400,
      operatorErrorCodes.invalidStatusTransition,
      '조사 시작 후 처리 완료할 수 있습니다.',
    );
  }

  // 이미 조사 중인데 다시 조사 시작
  if (current.status === 'investigating' && body.status === 'investigating') {
    return failure(
      400,
      operatorErrorCodes.invalidStatusTransition,
      '이미 조사 중인 신고입니다.',
    );
  }

  // resolved 전환 시 액션 필수 (E5, BR3)
  if (body.status === 'resolved' && !body.action) {
    return failure(
      400,
      operatorErrorCodes.actionRequired,
      '처리 액션을 선택해주세요.',
    );
  }

  // 액션 유효성 검증 (BR4, BR5)
  if (body.action === 'invalidate_submission' && current.target_type !== 'submission') {
    return failure(
      400,
      operatorErrorCodes.invalidAction,
      '제출물 무효화 액션은 제출물 유형 신고에만 적용 가능합니다.',
    );
  }

  if (body.action === 'restrict_account' && current.target_type !== 'user') {
    return failure(
      400,
      operatorErrorCodes.invalidAction,
      '계정 제한 액션은 사용자 유형 신고에만 적용 가능합니다.',
    );
  }

  // reports 업데이트
  const updatePayload: { status: string; action?: string } = { status: body.status };
  if (body.action) {
    updatePayload.action = body.action;
  }

  const { error: updateError } = await supabase
    .from('reports')
    .update(updatePayload)
    .eq('id', reportId);

  if (updateError) {
    return failure(500, operatorErrorCodes.updateFailed, updateError.message);
  }

  // 액션별 후속 처리 (MS-4)
  if (body.action === 'invalidate_submission') {
    const { error: submissionError } = await supabase
      .from('submissions')
      .update({ score: 0 })
      .eq('id', current.target_id);

    if (submissionError) {
      return failure(500, operatorErrorCodes.updateFailed, submissionError.message);
    }
  }

  if (body.action === 'restrict_account') {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ is_restricted: true })
      .eq('id', current.target_id);

    if (profileError) {
      return failure(500, operatorErrorCodes.updateFailed, profileError.message);
    }
  }

  return getReport(supabase, reportId);
};

// ---------------------------------------------------------------------------
// getCategories (MS-5)
// ---------------------------------------------------------------------------

export const getCategories = async (
  supabase: SupabaseClient,
): Promise<HandlerResult<CategoriesResponse, OperatorServiceError>> => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, is_active, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) {
    return failure(500, operatorErrorCodes.fetchError, error.message);
  }

  type RawCategory = {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };

  const rows = (data ?? []) as unknown as RawCategory[];

  const categories = rows.map((c) => ({
    id: c.id,
    name: c.name,
    isActive: c.is_active,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));

  return success({ categories });
};

// ---------------------------------------------------------------------------
// createCategory (MS-5)
// ---------------------------------------------------------------------------

export const createCategory = async (
  supabase: SupabaseClient,
  body: CreateCategoryBody,
): Promise<HandlerResult<CategoryResponse, OperatorServiceError>> => {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: body.name, is_active: true })
    .select('id, name, is_active, created_at, updated_at')
    .single();

  if (error) {
    // UNIQUE 제약 위반 (23505)
    if (error.code === '23505') {
      return failure(409, operatorErrorCodes.duplicateName, '이미 존재하는 카테고리입니다.');
    }
    return failure(500, operatorErrorCodes.updateFailed, error.message);
  }

  type RawCategory = {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };

  const c = data as unknown as RawCategory;

  return success(
    {
      category: {
        id: c.id,
        name: c.name,
        isActive: c.is_active,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      },
    },
    201,
  );
};

// ---------------------------------------------------------------------------
// updateCategory (MS-5)
// ---------------------------------------------------------------------------

export const updateCategory = async (
  supabase: SupabaseClient,
  categoryId: string,
  body: UpdateCategoryBody,
): Promise<HandlerResult<CategoryResponse, OperatorServiceError>> => {
  const { data: existing, error: fetchError } = await supabase
    .from('categories')
    .select('id')
    .eq('id', categoryId)
    .maybeSingle();

  if (fetchError) {
    return failure(500, operatorErrorCodes.fetchError, fetchError.message);
  }

  if (!existing) {
    return failure(404, operatorErrorCodes.notFound, '카테고리를 찾을 수 없습니다.');
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.name !== undefined) updatePayload.name = body.name;
  if (body.isActive !== undefined) updatePayload.is_active = body.isActive;

  const { data, error } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', categoryId)
    .select('id, name, is_active, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return failure(409, operatorErrorCodes.duplicateName, '이미 존재하는 카테고리입니다.');
    }
    return failure(500, operatorErrorCodes.updateFailed, error.message);
  }

  type RawCategory = {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };

  const c = data as unknown as RawCategory;

  return success({
    category: {
      id: c.id,
      name: c.name,
      isActive: c.is_active,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    },
  });
};

// ---------------------------------------------------------------------------
// getDifficultyLevels (MS-6)
// ---------------------------------------------------------------------------

export const getDifficultyLevels = async (
  supabase: SupabaseClient,
): Promise<HandlerResult<DifficultyLevelsResponse, OperatorServiceError>> => {
  const { data, error } = await supabase
    .from('difficulty_levels')
    .select('id, name, is_active, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) {
    return failure(500, operatorErrorCodes.fetchError, error.message);
  }

  type RawLevel = {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };

  const rows = (data ?? []) as unknown as RawLevel[];

  const difficultyLevels = rows.map((d) => ({
    id: d.id,
    name: d.name,
    isActive: d.is_active,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));

  return success({ difficultyLevels });
};

// ---------------------------------------------------------------------------
// createDifficultyLevel (MS-6)
// ---------------------------------------------------------------------------

export const createDifficultyLevel = async (
  supabase: SupabaseClient,
  body: CreateDifficultyLevelBody,
): Promise<HandlerResult<DifficultyLevelResponse, OperatorServiceError>> => {
  const { data, error } = await supabase
    .from('difficulty_levels')
    .insert({ name: body.name, is_active: true })
    .select('id, name, is_active, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return failure(409, operatorErrorCodes.duplicateName, '이미 존재하는 난이도입니다.');
    }
    return failure(500, operatorErrorCodes.updateFailed, error.message);
  }

  type RawLevel = {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };

  const d = data as unknown as RawLevel;

  return success(
    {
      difficultyLevel: {
        id: d.id,
        name: d.name,
        isActive: d.is_active,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      },
    },
    201,
  );
};

// ---------------------------------------------------------------------------
// updateDifficultyLevel (MS-6)
// ---------------------------------------------------------------------------

export const updateDifficultyLevel = async (
  supabase: SupabaseClient,
  levelId: string,
  body: UpdateDifficultyLevelBody,
): Promise<HandlerResult<DifficultyLevelResponse, OperatorServiceError>> => {
  const { data: existing, error: fetchError } = await supabase
    .from('difficulty_levels')
    .select('id')
    .eq('id', levelId)
    .maybeSingle();

  if (fetchError) {
    return failure(500, operatorErrorCodes.fetchError, fetchError.message);
  }

  if (!existing) {
    return failure(404, operatorErrorCodes.notFound, '난이도를 찾을 수 없습니다.');
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.name !== undefined) updatePayload.name = body.name;
  if (body.isActive !== undefined) updatePayload.is_active = body.isActive;

  const { data, error } = await supabase
    .from('difficulty_levels')
    .update(updatePayload)
    .eq('id', levelId)
    .select('id, name, is_active, created_at, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return failure(409, operatorErrorCodes.duplicateName, '이미 존재하는 난이도입니다.');
    }
    return failure(500, operatorErrorCodes.updateFailed, error.message);
  }

  type RawLevel = {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };

  const d = data as unknown as RawLevel;

  return success({
    difficultyLevel: {
      id: d.id,
      name: d.name,
      isActive: d.is_active,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    },
  });
};

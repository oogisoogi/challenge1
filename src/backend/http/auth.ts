import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getLogger,
  getSupabase,
  type AppContext,
} from '@/backend/hono/context';
import { failure, type ErrorResult } from '@/backend/http/response';

export const extractUserId = async (
  c: AppContext,
): Promise<string | null> => {
  const supabase = getSupabase(c);
  const logger = getLogger(c);

  const authHeader = c.req.header('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn('Auth failed via Bearer token');
      return null;
    }

    return user.id;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
};

export const requireLearnerRole = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<ErrorResult<string> | null> => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.role !== 'learner') {
    return failure(
      403,
      'FORBIDDEN_ROLE',
      '학습자만 접근할 수 있습니다.',
    );
  }

  return null;
};

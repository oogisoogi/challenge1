import type { SupabaseClient } from '@supabase/supabase-js';
import {
  failure,
  success,
  type HandlerResult,
} from '@/backend/http/response';
import { authErrorCodes, type AuthServiceError } from './error';
import type { SignupResponse, ProfileRow } from './schema';

const PROFILES_TABLE = 'profiles';
const TERMS_AGREEMENTS_TABLE = 'terms_agreements';

const ROLE_REDIRECT_MAP: Record<string, string> = {
  learner: '/courses',
  instructor: '/instructor/dashboard',
};

export const signUpUser = async (
  supabase: SupabaseClient,
  params: {
    email: string;
    password: string;
    role: 'learner' | 'instructor';
    name: string;
    phone: string;
    bio: string;
  },
): Promise<HandlerResult<SignupResponse, AuthServiceError>> => {
  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
  });

  if (error) {
    const errorMsg = error.message?.toLowerCase() ?? '';
    const isDuplicate =
      errorMsg.includes('already') ||
      errorMsg.includes('duplicate') ||
      errorMsg.includes('unique') ||
      error.status === 422;

    if (isDuplicate) {
      return failure(
        409,
        authErrorCodes.signupDuplicateEmail,
        '이미 가입된 이메일입니다.',
      );
    }

    return failure(
      500,
      authErrorCodes.signupFailed,
      error.message ?? '회원가입에 실패했습니다.',
    );
  }

  if (!data.user) {
    return failure(
      500,
      authErrorCodes.signupFailed,
      '사용자 생성에 실패했습니다.',
    );
  }

  const userId = data.user.id;

  const { error: profileError } = await supabase
    .from(PROFILES_TABLE)
    .insert({
      id: userId,
      role: params.role,
      name: params.name,
      phone: params.phone,
      bio: params.bio,
    });

  if (profileError) {
    return failure(
      500,
      authErrorCodes.onboardingInsertFailed,
      profileError.message ?? '프로필 생성에 실패했습니다.',
    );
  }

  const { error: termsError } = await supabase
    .from(TERMS_AGREEMENTS_TABLE)
    .insert({
      user_id: userId,
    });

  if (termsError) {
    return failure(
      500,
      authErrorCodes.onboardingInsertFailed,
      termsError.message ?? '약관 동의 기록에 실패했습니다.',
    );
  }

  const redirectTo = ROLE_REDIRECT_MAP[params.role] ?? '/';

  return success({
    uid: userId,
    redirectTo,
  });
};

export const getProfileByUserId = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileRow | null> => {
  const { data } = await supabase
    .from(PROFILES_TABLE)
    .select('id, role, name, phone, bio, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  return data ?? null;
};

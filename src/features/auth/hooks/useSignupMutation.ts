'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { getSupabaseBrowserClient } from '@/lib/supabase/browser-client';
import { useCurrentUser } from './useCurrentUser';
import {
  signupResponseSchema,
  type SignupRequest,
  type SignupResponse,
} from '@/features/auth/lib/dto';
import { ONBOARDING_PATH } from '@/features/auth/constants';

const signupFetcher = async (params: SignupRequest): Promise<SignupResponse> => {
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
  });

  if (error) {
    throw new Error(error.message ?? '회원가입에 실패했습니다.');
  }

  return { uid: '', redirectTo: ONBOARDING_PATH };
};

export const useSignupMutation = () => {
  const router = useRouter();
  const { refresh } = useCurrentUser();

  return useMutation({
    mutationFn: signupFetcher,
    onSuccess: async (data) => {
      await refresh();
      router.replace(data.redirectTo);
    },
  });
};

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

const signupFetcher = async (params: SignupRequest): Promise<SignupResponse> => {
  try {
    const { data } = await apiClient.post('/api/auth/signup', params);
    const result = signupResponseSchema.parse(data);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error) {
      throw new Error('세션 생성에 실패했습니다.');
    }

    return result;
  } catch (error) {
    const message = extractApiErrorMessage(error, '회원가입에 실패했습니다.');
    throw new Error(message);
  }
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

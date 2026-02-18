'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import {
  onboardingResponseSchema,
  type OnboardingRequest,
  type OnboardingResponse,
} from '@/features/auth/lib/dto';

const onboardingFetcher = async (
  params: OnboardingRequest,
): Promise<OnboardingResponse> => {
  try {
    const { data } = await apiClient.post('/api/auth/onboarding', params);
    return onboardingResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      '온보딩 처리에 실패했습니다.',
    );
    throw new Error(message);
  }
};

export const useOnboardingMutation = () => {
  const router = useRouter();

  return useMutation({
    mutationFn: onboardingFetcher,
    onSuccess: (data) => {
      router.replace(data.redirectTo);
    },
  });
};

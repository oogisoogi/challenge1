'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { myProfileResponseSchema } from '@/features/auth/lib/dto';
import { useCurrentUser } from './useCurrentUser';

const fetchMyProfile = async () => {
  try {
    const { data } = await apiClient.get('/api/auth/me/profile');
    return myProfileResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '프로필 조회에 실패했습니다.');
    throw new Error(message);
  }
};

export const useMyProfile = () => {
  const { isAuthenticated } = useCurrentUser();

  return useQuery({
    queryKey: ['auth', 'me', 'profile'],
    queryFn: fetchMyProfile,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
};

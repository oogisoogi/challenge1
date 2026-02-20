'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { toast } from '@/hooks/use-toast';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';
import type { CreateDifficultyLevelBody } from '@/features/operator/lib/dto';

const createDifficultyLevelFetcher = async (body: CreateDifficultyLevelBody) => {
  try {
    const { data } = await apiClient.post('/api/operator/difficulty-levels', body);
    return data;
  } catch (error) {
    const message = extractApiErrorMessage(error, '난이도 추가에 실패했습니다.');
    throw new Error(message);
  }
};

export const useCreateDifficultyLevelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDifficultyLevelFetcher,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OPERATOR_QUERY_KEYS.difficultyLevels });
      toast({ title: '난이도 추가 완료', description: '난이도가 추가되었습니다.' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '난이도 추가 실패', description: error.message });
    },
  });
};

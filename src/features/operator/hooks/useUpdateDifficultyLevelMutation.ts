'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { toast } from '@/hooks/use-toast';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';
import type { UpdateDifficultyLevelBody } from '@/features/operator/lib/dto';

type UpdateDifficultyLevelParams = {
  levelId: string;
  body: UpdateDifficultyLevelBody;
};

const updateDifficultyLevelFetcher = async ({ levelId, body }: UpdateDifficultyLevelParams) => {
  try {
    const { data } = await apiClient.patch(`/api/operator/difficulty-levels/${levelId}`, body);
    return data;
  } catch (error) {
    const message = extractApiErrorMessage(error, '난이도 수정에 실패했습니다.');
    throw new Error(message);
  }
};

export const useUpdateDifficultyLevelMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDifficultyLevelFetcher,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OPERATOR_QUERY_KEYS.difficultyLevels });
      toast({ title: '난이도 수정 완료', description: '난이도가 수정되었습니다.' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '난이도 수정 실패', description: error.message });
    },
  });
};

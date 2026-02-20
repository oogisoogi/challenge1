'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { difficultyLevelsResponseSchema } from '@/features/operator/lib/dto';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';

const fetchDifficultyLevels = async () => {
  try {
    const { data } = await apiClient.get('/api/operator/difficulty-levels');
    return difficultyLevelsResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '난이도 목록을 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useDifficultyLevelsQuery = () =>
  useQuery({
    queryKey: OPERATOR_QUERY_KEYS.difficultyLevels,
    queryFn: fetchDifficultyLevels,
    staleTime: 30 * 1000,
  });

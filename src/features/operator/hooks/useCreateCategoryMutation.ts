'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { toast } from '@/hooks/use-toast';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';
import type { CreateCategoryBody } from '@/features/operator/lib/dto';

const createCategoryFetcher = async (body: CreateCategoryBody) => {
  try {
    const { data } = await apiClient.post('/api/operator/categories', body);
    return data;
  } catch (error) {
    const message = extractApiErrorMessage(error, '카테고리 추가에 실패했습니다.');
    throw new Error(message);
  }
};

export const useCreateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCategoryFetcher,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OPERATOR_QUERY_KEYS.categories });
      toast({ title: '카테고리 추가 완료', description: '카테고리가 추가되었습니다.' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '카테고리 추가 실패', description: error.message });
    },
  });
};

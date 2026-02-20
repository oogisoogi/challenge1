'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { toast } from '@/hooks/use-toast';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';
import type { UpdateCategoryBody } from '@/features/operator/lib/dto';

type UpdateCategoryParams = {
  categoryId: string;
  body: UpdateCategoryBody;
};

const updateCategoryFetcher = async ({ categoryId, body }: UpdateCategoryParams) => {
  try {
    const { data } = await apiClient.patch(`/api/operator/categories/${categoryId}`, body);
    return data;
  } catch (error) {
    const message = extractApiErrorMessage(error, '카테고리 수정에 실패했습니다.');
    throw new Error(message);
  }
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCategoryFetcher,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OPERATOR_QUERY_KEYS.categories });
      toast({ title: '카테고리 수정 완료', description: '카테고리가 수정되었습니다.' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '카테고리 수정 실패', description: error.message });
    },
  });
};

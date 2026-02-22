'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import {
  categoryCreatedResponseSchema,
  type CategoryCreatedResponse,
} from '@/features/course-management/lib/dto';
import { COURSE_QUERY_KEYS } from '@/features/course/constants';
import { toast } from '@/hooks/use-toast';

const createCategoryFetcher = async (name: string): Promise<CategoryCreatedResponse> => {
  try {
    const { data } = await apiClient.post('/api/instructor/categories', { name });
    return categoryCreatedResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '카테고리 생성에 실패했습니다.');
    throw new Error(message);
  }
};

export const useCreateCategoryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createCategoryFetcher(name),
    onSuccess: () => {
      toast({ title: '카테고리 추가 완료', description: '새 카테고리가 추가되었습니다.' });
      queryClient.invalidateQueries({
        queryKey: COURSE_QUERY_KEYS.meta,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '카테고리 추가 실패',
        description: error.message,
      });
    },
  });
};

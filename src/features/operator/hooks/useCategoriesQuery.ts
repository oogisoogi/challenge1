'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { categoriesResponseSchema } from '@/features/operator/lib/dto';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';

const fetchCategories = async () => {
  try {
    const { data } = await apiClient.get('/api/operator/categories');
    return categoriesResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '카테고리 목록을 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useCategoriesQuery = () =>
  useQuery({
    queryKey: OPERATOR_QUERY_KEYS.categories,
    queryFn: fetchCategories,
    staleTime: 30 * 1000,
  });

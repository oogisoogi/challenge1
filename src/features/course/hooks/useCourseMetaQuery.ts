'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { courseMetaResponseSchema } from '@/features/course/lib/dto';
import { COURSE_QUERY_KEYS } from '@/features/course/constants';

const fetchCourseMeta = async () => {
  try {
    const { data } = await apiClient.get('/api/courses/meta');
    return courseMetaResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '필터 데이터를 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useCourseMetaQuery = () =>
  useQuery({
    queryKey: COURSE_QUERY_KEYS.meta,
    queryFn: fetchCourseMeta,
    staleTime: 5 * 60 * 1000,
  });

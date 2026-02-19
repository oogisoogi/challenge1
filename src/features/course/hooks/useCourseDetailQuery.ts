'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { courseDetailResponseSchema } from '@/features/course/lib/dto';
import { COURSE_QUERY_KEYS } from '@/features/course/constants';

const fetchCourseDetail = async (courseId: string) => {
  try {
    const { data } = await apiClient.get(`/api/courses/${courseId}`);
    return courseDetailResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '코스 상세를 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useCourseDetailQuery = (courseId: string) =>
  useQuery({
    queryKey: COURSE_QUERY_KEYS.detail(courseId),
    queryFn: () => fetchCourseDetail(courseId),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
  });

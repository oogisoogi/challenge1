'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { courseListResponseSchema, type CourseListQuery } from '@/features/course/lib/dto';
import { COURSE_QUERY_KEYS } from '@/features/course/constants';

const fetchCourseList = async (params: CourseListQuery) => {
  try {
    const { data } = await apiClient.get('/api/courses', { params });
    return courseListResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '코스 목록을 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useCourseListQuery = (params: CourseListQuery) =>
  useQuery({
    queryKey: COURSE_QUERY_KEYS.list(params),
    queryFn: () => fetchCourseList(params),
    staleTime: 60 * 1000,
  });

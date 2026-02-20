'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { courseManagementResponseSchema } from '@/features/course-management/lib/dto';
import { COURSE_MANAGEMENT_QUERY_KEYS } from '@/features/course-management/constants';

const fetchCourseManagementDetail = async (courseId: string) => {
  try {
    const { data } = await apiClient.get(`/api/instructor/courses/${courseId}`);
    return courseManagementResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '코스 정보를 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useCourseManagementDetailQuery = (courseId: string | undefined) =>
  useQuery({
    queryKey: COURSE_MANAGEMENT_QUERY_KEYS.detail(courseId ?? ''),
    queryFn: () => fetchCourseManagementDetail(courseId!),
    staleTime: 0,
    enabled: Boolean(courseId),
  });

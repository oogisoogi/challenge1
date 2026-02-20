'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { courseGradesResponseSchema } from '@/features/grades/lib/dto';
import { GRADES_QUERY_KEYS } from '@/features/grades/constants';

const fetchCourseGrades = async (courseId: string) => {
  try {
    const { data } = await apiClient.get(`/api/courses/${courseId}/grades`);
    return courseGradesResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      '성적 정보를 불러오는데 실패했습니다.',
    );
    throw new Error(message);
  }
};

export const useCourseGradesQuery = (courseId: string) =>
  useQuery({
    queryKey: GRADES_QUERY_KEYS.courseGrades(courseId),
    queryFn: () => fetchCourseGrades(courseId),
    staleTime: 30 * 1000,
    enabled: Boolean(courseId),
  });

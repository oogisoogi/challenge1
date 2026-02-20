'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { instructorDashboardResponseSchema } from '@/features/instructor-dashboard/lib/dto';
import { INSTRUCTOR_DASHBOARD_QUERY_KEYS } from '@/features/instructor-dashboard/constants';

const fetchInstructorCourses = async () => {
  try {
    const { data } = await apiClient.get('/api/instructor/dashboard');
    const parsed = instructorDashboardResponseSchema.parse(data);
    return parsed.courses.filter((c) =>
      ['draft', 'published'].includes(c.status),
    );
  } catch (error) {
    const message = extractApiErrorMessage(error, '코스 목록을 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useInstructorCoursesQuery = () =>
  useQuery({
    queryKey: INSTRUCTOR_DASHBOARD_QUERY_KEYS.dashboard,
    queryFn: fetchInstructorCourses,
    staleTime: 30_000,
  });

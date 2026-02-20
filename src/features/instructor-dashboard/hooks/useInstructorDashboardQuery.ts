'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { instructorDashboardResponseSchema } from '@/features/instructor-dashboard/lib/dto';
import { INSTRUCTOR_DASHBOARD_QUERY_KEYS } from '@/features/instructor-dashboard/constants';

const fetchInstructorDashboard = async () => {
  try {
    const { data } = await apiClient.get('/api/instructor/dashboard');
    return instructorDashboardResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      '대시보드를 불러오는데 실패했습니다.',
    );
    throw new Error(message);
  }
};

export const useInstructorDashboardQuery = () =>
  useQuery({
    queryKey: INSTRUCTOR_DASHBOARD_QUERY_KEYS.dashboard,
    queryFn: fetchInstructorDashboard,
    staleTime: 60 * 1000,
  });

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { learnerDashboardResponseSchema } from '@/features/learner-dashboard/lib/dto';
import { DASHBOARD_QUERY_KEYS } from '@/features/learner-dashboard/constants';

const fetchLearnerDashboard = async () => {
  try {
    const { data } = await apiClient.get('/api/learner/dashboard');
    return learnerDashboardResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      '대시보드를 불러오는데 실패했습니다.',
    );
    throw new Error(message);
  }
};

export const useLearnerDashboardQuery = () =>
  useQuery({
    queryKey: DASHBOARD_QUERY_KEYS.dashboard,
    queryFn: fetchLearnerDashboard,
    staleTime: 60 * 1000,
  });

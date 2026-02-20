'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { operatorDashboardResponseSchema } from '@/features/operator/lib/dto';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';

const fetchOperatorDashboard = async () => {
  try {
    const { data } = await apiClient.get('/api/operator/dashboard');
    return operatorDashboardResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '대시보드를 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useOperatorDashboardQuery = () =>
  useQuery({
    queryKey: OPERATOR_QUERY_KEYS.dashboard,
    queryFn: fetchOperatorDashboard,
    staleTime: 60 * 1000,
  });

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { reportsResponseSchema } from '@/features/operator/lib/dto';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';

type ReportsFilters = {
  status?: string;
  targetType?: string;
};

const fetchReports = async (filters?: ReportsFilters) => {
  try {
    const params: Record<string, string> = {};
    if (filters?.status) params.status = filters.status;
    if (filters?.targetType) params.target_type = filters.targetType;

    const { data } = await apiClient.get('/api/operator/reports', { params });
    return reportsResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '신고 목록을 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useReportsQuery = (filters?: ReportsFilters) =>
  useQuery({
    queryKey: OPERATOR_QUERY_KEYS.reports(filters),
    queryFn: () => fetchReports(filters),
    staleTime: 30 * 1000,
  });

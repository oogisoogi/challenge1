'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { reportDetailResponseSchema } from '@/features/operator/lib/dto';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';

const fetchReportDetail = async (reportId: string) => {
  try {
    const { data } = await apiClient.get(`/api/operator/reports/${reportId}`);
    return reportDetailResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '신고 상세를 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useReportDetailQuery = (reportId: string) =>
  useQuery({
    queryKey: OPERATOR_QUERY_KEYS.report(reportId),
    queryFn: () => fetchReportDetail(reportId),
    staleTime: 0,
    enabled: Boolean(reportId),
  });

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { toast } from '@/hooks/use-toast';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';
import type { UpdateReportBody } from '@/features/operator/lib/dto';

type UpdateReportParams = {
  reportId: string;
  body: UpdateReportBody;
};

const updateReportFetcher = async ({ reportId, body }: UpdateReportParams) => {
  try {
    const { data } = await apiClient.patch(`/api/operator/reports/${reportId}`, body);
    return data;
  } catch (error) {
    const message = extractApiErrorMessage(error, '신고 처리에 실패했습니다.');
    throw new Error(message);
  }
};

export const useUpdateReportMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateReportFetcher,
    onSuccess: (_, { reportId }) => {
      void queryClient.invalidateQueries({ queryKey: OPERATOR_QUERY_KEYS.reports() });
      void queryClient.invalidateQueries({ queryKey: OPERATOR_QUERY_KEYS.report(reportId) });
      void queryClient.invalidateQueries({ queryKey: OPERATOR_QUERY_KEYS.dashboard });
      toast({ title: '신고 처리 완료', description: '신고 상태가 업데이트되었습니다.' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '신고 처리 실패', description: error.message });
    },
  });
};

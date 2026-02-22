'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { OPERATOR_QUERY_KEYS } from '@/features/operator/constants';
import { toast } from '@/hooks/use-toast';
import type { CreateReportBody } from '@/features/operator/lib/dto';

const createReportFetcher = async (body: CreateReportBody) => {
  try {
    const { data } = await apiClient.post('/api/reports', body);
    return data;
  } catch (error) {
    const message = extractApiErrorMessage(error, '신고 접수에 실패했습니다.');
    throw new Error(message);
  }
};

export const useCreateReportMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReportFetcher,
    onSuccess: () => {
      toast({ title: '신고 접수 완료', description: '신고가 접수되었습니다. 운영팀에서 확인 후 처리합니다.' });
      queryClient.invalidateQueries({ queryKey: OPERATOR_QUERY_KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: ['operator', 'reports'] });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '신고 접수 실패', description: error.message });
    },
  });
};

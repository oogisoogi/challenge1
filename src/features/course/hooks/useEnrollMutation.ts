'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { enrollResponseSchema } from '@/features/course/lib/dto';
import { COURSE_QUERY_KEYS } from '@/features/course/constants';
import { DASHBOARD_QUERY_KEYS } from '@/features/learner-dashboard/constants';
import { toast } from '@/hooks/use-toast';

const enrollFetcher = async (courseId: string) => {
  try {
    const { data } = await apiClient.post(`/api/courses/${courseId}/enroll`);
    return enrollResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '수강신청에 실패했습니다.');
    throw new Error(message);
  }
};

export const useEnrollMutation = (courseId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => enrollFetcher(courseId),
    onSuccess: () => {
      toast({ title: '수강신청 완료', description: '코스에 성공적으로 등록되었습니다.' });
      queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '수강신청 실패', description: error.message });
    },
  });
};

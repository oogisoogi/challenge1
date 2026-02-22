'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { cancelEnrollResponseSchema } from '@/features/course/lib/dto';
import { COURSE_QUERY_KEYS } from '@/features/course/constants';
import { DASHBOARD_QUERY_KEYS } from '@/features/learner-dashboard/constants';
import { toast } from '@/hooks/use-toast';

const cancelEnrollmentFetcher = async (courseId: string) => {
  try {
    const { data } = await apiClient.delete(`/api/courses/${courseId}/enroll`);
    return cancelEnrollResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '수강취소에 실패했습니다.');
    throw new Error(message);
  }
};

export const useCancelEnrollmentMutation = (courseId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cancelEnrollmentFetcher(courseId),
    onSuccess: () => {
      toast({ title: '수강취소 완료', description: '수강이 취소되었습니다.' });
      queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEYS.detail(courseId) });
      queryClient.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEYS.all });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '수강취소 실패', description: error.message });
    },
  });
};

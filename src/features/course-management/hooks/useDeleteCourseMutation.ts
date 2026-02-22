'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { INSTRUCTOR_DASHBOARD_QUERY_KEYS } from '@/features/instructor-dashboard/constants';
import { toast } from '@/hooks/use-toast';

const deleteCourseFetcher = async (courseId: string) => {
  try {
    await apiClient.delete(`/api/instructor/courses/${courseId}`);
  } catch (error) {
    const message = extractApiErrorMessage(error, '코스 삭제에 실패했습니다.');
    throw new Error(message);
  }
};

export const useDeleteCourseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (courseId: string) => deleteCourseFetcher(courseId),
    onSuccess: () => {
      toast({ title: '삭제 완료', description: '코스가 삭제되었습니다.' });
      queryClient.invalidateQueries({
        queryKey: INSTRUCTOR_DASHBOARD_QUERY_KEYS.dashboard,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '삭제 실패',
        description: error.message,
      });
    },
  });
};

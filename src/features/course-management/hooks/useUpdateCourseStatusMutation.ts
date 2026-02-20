'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { courseManagementResponseSchema } from '@/features/course-management/lib/dto';
import { COURSE_MANAGEMENT_QUERY_KEYS } from '@/features/course-management/constants';
import { INSTRUCTOR_DASHBOARD_QUERY_KEYS } from '@/features/instructor-dashboard/constants';
import { toast } from '@/hooks/use-toast';

type UpdateStatusPayload = {
  status: 'published' | 'archived';
};

const updateCourseStatusFetcher = async (
  courseId: string,
  payload: UpdateStatusPayload,
) => {
  try {
    const { data } = await apiClient.patch(
      `/api/instructor/courses/${courseId}/status`,
      payload,
    );
    return courseManagementResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '상태 변경에 실패했습니다.');
    throw new Error(message);
  }
};

export const useUpdateCourseStatusMutation = (courseId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateStatusPayload) =>
      updateCourseStatusFetcher(courseId, payload),
    onSuccess: () => {
      toast({ title: '상태 변경 완료', description: '코스 상태가 변경되었습니다.' });
      queryClient.invalidateQueries({
        queryKey: COURSE_MANAGEMENT_QUERY_KEYS.detail(courseId),
      });
      queryClient.invalidateQueries({
        queryKey: INSTRUCTOR_DASHBOARD_QUERY_KEYS.dashboard,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '상태 변경 실패',
        description: error.message,
      });
    },
  });
};

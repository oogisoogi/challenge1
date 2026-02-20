'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { courseManagementResponseSchema } from '@/features/course-management/lib/dto';
import { COURSE_MANAGEMENT_QUERY_KEYS } from '@/features/course-management/constants';
import { toast } from '@/hooks/use-toast';
import type { UpdateCourseBody } from '@/features/course-management/lib/dto';

type UpdateCoursePayload = {
  courseId: string;
  body: UpdateCourseBody;
};

const updateCourseFetcher = async ({ courseId, body }: UpdateCoursePayload) => {
  try {
    const { data } = await apiClient.patch(`/api/instructor/courses/${courseId}`, body);
    return courseManagementResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '코스 수정에 실패했습니다.');
    throw new Error(message);
  }
};

export const useUpdateCourseMutation = (courseId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateCourseBody) => updateCourseFetcher({ courseId, body }),
    onSuccess: () => {
      toast({ title: '저장 완료', description: '코스가 성공적으로 수정되었습니다.' });
      queryClient.invalidateQueries({
        queryKey: COURSE_MANAGEMENT_QUERY_KEYS.detail(courseId),
      });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '코스 수정 실패', description: error.message });
    },
  });
};

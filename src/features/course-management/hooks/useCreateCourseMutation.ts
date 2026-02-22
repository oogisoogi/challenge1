'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { courseManagementResponseSchema } from '@/features/course-management/lib/dto';
import { INSTRUCTOR_DASHBOARD_QUERY_KEYS } from '@/features/instructor-dashboard/constants';
import { toast } from '@/hooks/use-toast';
import type { CreateCourseBody } from '@/features/course-management/lib/dto';

const createCourseFetcher = async (body: CreateCourseBody) => {
  try {
    const { data } = await apiClient.post('/api/instructor/courses', body);
    return courseManagementResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '코스 생성에 실패했습니다.');
    throw new Error(message);
  }
};

export const useCreateCourseMutation = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCourseFetcher,
    onSuccess: (course) => {
      toast({ title: '코스 생성 완료', description: '코스가 성공적으로 생성되었습니다.' });
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_DASHBOARD_QUERY_KEYS.all });
      router.push(`/instructor/courses/${course.id}/edit`);
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '코스 생성 실패', description: error.message });
    },
  });
};

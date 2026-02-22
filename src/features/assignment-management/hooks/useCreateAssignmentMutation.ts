'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { assignmentManagementResponseSchema } from '@/features/assignment-management/lib/dto';
import { INSTRUCTOR_DASHBOARD_QUERY_KEYS } from '@/features/instructor-dashboard/constants';
import { toast } from '@/hooks/use-toast';
import type { CreateAssignmentBody } from '@/features/assignment-management/lib/dto';

const createAssignmentFetcher = async (body: CreateAssignmentBody) => {
  try {
    const { data } = await apiClient.post('/api/instructor/assignments', body);
    return assignmentManagementResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '과제 생성에 실패했습니다.');
    throw new Error(message);
  }
};

export const useCreateAssignmentMutation = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAssignmentFetcher,
    onSuccess: (assignment) => {
      toast({ title: '과제 생성 완료', description: '과제가 성공적으로 생성되었습니다.' });
      queryClient.invalidateQueries({ queryKey: INSTRUCTOR_DASHBOARD_QUERY_KEYS.all });
      router.push(`/instructor/assignments/${assignment.id}/submissions`);
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '과제 생성 실패', description: error.message });
    },
  });
};

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { assignmentManagementResponseSchema } from '@/features/assignment-management/lib/dto';
import { ASSIGNMENT_MANAGEMENT_QUERY_KEYS } from '@/features/assignment-management/constants';
import { toast } from '@/hooks/use-toast';

type UpdateAssignmentStatusPayload = {
  status: 'published' | 'closed';
};

const updateAssignmentStatusFetcher = async (
  assignmentId: string,
  payload: UpdateAssignmentStatusPayload,
) => {
  try {
    const { data } = await apiClient.patch(
      `/api/instructor/assignments/${assignmentId}/status`,
      payload,
    );
    return assignmentManagementResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '상태 변경에 실패했습니다.');
    throw new Error(message);
  }
};

export const useUpdateAssignmentStatusMutation = (assignmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateAssignmentStatusPayload) =>
      updateAssignmentStatusFetcher(assignmentId, payload),
    onSuccess: () => {
      toast({ title: '상태 변경 완료', description: '과제 상태가 변경되었습니다.' });
      // 제출물 목록 쿼리 무효화 (assignment 포함)
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_MANAGEMENT_QUERY_KEYS.submissions(assignmentId, 'all'),
      });
      // 과제 단건 쿼리 무효화 (수정 폼)
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_MANAGEMENT_QUERY_KEYS.detail(assignmentId),
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

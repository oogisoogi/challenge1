'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { assignmentManagementResponseSchema } from '@/features/assignment-management/lib/dto';
import { ASSIGNMENT_MANAGEMENT_QUERY_KEYS } from '@/features/assignment-management/constants';
import { toast } from '@/hooks/use-toast';
import type { UpdateAssignmentBody } from '@/features/assignment-management/lib/dto';

const updateAssignmentFetcher = async ({
  assignmentId,
  body,
}: {
  assignmentId: string;
  body: UpdateAssignmentBody;
}) => {
  try {
    const { data } = await apiClient.patch(
      `/api/instructor/assignments/${assignmentId}`,
      body,
    );
    return assignmentManagementResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '과제 수정에 실패했습니다.');
    throw new Error(message);
  }
};

export const useUpdateAssignmentMutation = (assignmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateAssignmentBody) =>
      updateAssignmentFetcher({ assignmentId, body }),
    onSuccess: () => {
      toast({ title: '과제 수정 완료', description: '과제가 성공적으로 수정되었습니다.' });
      void queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_MANAGEMENT_QUERY_KEYS.detail(assignmentId),
      });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '과제 수정 실패', description: error.message });
    },
  });
};

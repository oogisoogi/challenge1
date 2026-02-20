'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { gradeSubmissionResponseSchema } from '@/features/assignment-management/lib/dto';
import { ASSIGNMENT_MANAGEMENT_QUERY_KEYS } from '@/features/assignment-management/constants';
import { toast } from '@/hooks/use-toast';
import type { GradeSubmissionBody } from '@/features/assignment-management/lib/dto';

type GradeSubmissionArgs = {
  submissionId: string;
  body: GradeSubmissionBody;
  assignmentId: string;
};

const gradeSubmissionFetcher = async ({ submissionId, body }: GradeSubmissionArgs) => {
  try {
    const { data } = await apiClient.patch(
      `/api/instructor/submissions/${submissionId}/grade`,
      body,
    );
    return gradeSubmissionResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '채점에 실패했습니다.');
    throw new Error(message);
  }
};

export const useGradeSubmissionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: gradeSubmissionFetcher,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_MANAGEMENT_QUERY_KEYS.submissions(variables.assignmentId, 'all'),
      });
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_MANAGEMENT_QUERY_KEYS.all,
      });

      const actionLabel =
        variables.body.action === 'grade' ? '채점이 완료되었습니다.' : '재제출 요청이 완료되었습니다.';
      toast({ title: '완료', description: actionLabel });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: '처리 실패', description: error.message });
    },
  });
};

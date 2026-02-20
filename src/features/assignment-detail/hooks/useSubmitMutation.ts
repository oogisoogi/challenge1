'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import {
  submissionBodySchema,
  submissionResponseSchema,
  type SubmissionBody,
  type SubmissionResponse,
} from '@/features/assignment-detail/lib/dto';
import { ASSIGNMENT_DETAIL_QUERY_KEYS } from '@/features/assignment-detail/constants';
import { toast } from '@/hooks/use-toast';

const submitAssignment = async (
  courseId: string,
  assignmentId: string,
  body: SubmissionBody,
): Promise<SubmissionResponse> => {
  const validated = submissionBodySchema.parse(body);
  try {
    const { data } = await apiClient.post(
      `/api/courses/${courseId}/assignments/${assignmentId}/submissions`,
      validated,
    );
    return submissionResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '과제 제출에 실패했습니다.');
    throw new Error(message);
  }
};

export const useSubmitMutation = (courseId: string, assignmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SubmissionBody) =>
      submitAssignment(courseId, assignmentId, body),
    onSuccess: (data) => {
      const toastDescription = data.isLate
        ? '지각 제출이 완료되었습니다.'
        : '제출이 완료되었습니다.';

      toast({ title: '제출 완료', description: toastDescription });
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_DETAIL_QUERY_KEYS.detail(courseId, assignmentId),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '제출 실패',
        description: error.message,
      });
    },
  });
};

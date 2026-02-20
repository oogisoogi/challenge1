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

const resubmitAssignment = async (
  courseId: string,
  assignmentId: string,
  body: SubmissionBody,
): Promise<SubmissionResponse> => {
  const validated = submissionBodySchema.parse(body);
  try {
    const { data } = await apiClient.put(
      `/api/courses/${courseId}/assignments/${assignmentId}/submissions`,
      validated,
    );
    return submissionResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '재제출에 실패했습니다.');
    throw new Error(message);
  }
};

export const useResubmitMutation = (courseId: string, assignmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SubmissionBody) =>
      resubmitAssignment(courseId, assignmentId, body),
    onSuccess: () => {
      toast({ title: '재제출 완료', description: '재제출이 완료되었습니다.' });
      queryClient.invalidateQueries({
        queryKey: ASSIGNMENT_DETAIL_QUERY_KEYS.detail(courseId, assignmentId),
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: '재제출 실패',
        description: error.message,
      });
    },
  });
};

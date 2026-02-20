'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { assignmentFeedbackResponseSchema } from '@/features/grades/lib/dto';
import { GRADES_QUERY_KEYS } from '@/features/grades/constants';

const fetchAssignmentFeedback = async (
  courseId: string,
  assignmentId: string,
) => {
  try {
    const { data } = await apiClient.get(
      `/api/courses/${courseId}/assignments/${assignmentId}/submissions/feedback`,
    );
    return assignmentFeedbackResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      '피드백 정보를 불러오는데 실패했습니다.',
    );
    throw new Error(message);
  }
};

export const useAssignmentFeedbackQuery = (
  courseId: string,
  assignmentId: string,
) =>
  useQuery({
    queryKey: GRADES_QUERY_KEYS.feedback(courseId, assignmentId),
    queryFn: () => fetchAssignmentFeedback(courseId, assignmentId),
    staleTime: 30 * 1000,
    enabled: Boolean(courseId) && Boolean(assignmentId),
  });

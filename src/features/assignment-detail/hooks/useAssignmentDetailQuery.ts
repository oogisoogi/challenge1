'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { assignmentDetailResponseSchema } from '@/features/assignment-detail/lib/dto';
import { ASSIGNMENT_DETAIL_QUERY_KEYS } from '@/features/assignment-detail/constants';

const fetchAssignmentDetail = async (
  courseId: string,
  assignmentId: string,
) => {
  try {
    const { data } = await apiClient.get(
      `/api/courses/${courseId}/assignments/${assignmentId}`,
    );
    return assignmentDetailResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      '과제 정보를 불러오는데 실패했습니다.',
    );
    throw new Error(message);
  }
};

export const useAssignmentDetailQuery = (
  courseId: string,
  assignmentId: string,
) =>
  useQuery({
    queryKey: ASSIGNMENT_DETAIL_QUERY_KEYS.detail(courseId, assignmentId),
    queryFn: () => fetchAssignmentDetail(courseId, assignmentId),
    staleTime: 30 * 1000,
    enabled: Boolean(courseId) && Boolean(assignmentId),
  });

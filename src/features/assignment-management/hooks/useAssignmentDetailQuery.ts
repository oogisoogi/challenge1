'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { assignmentManagementResponseSchema } from '@/features/assignment-management/lib/dto';
import { ASSIGNMENT_MANAGEMENT_QUERY_KEYS } from '@/features/assignment-management/constants';

const fetchAssignmentDetail = async (assignmentId: string) => {
  try {
    const { data } = await apiClient.get(`/api/instructor/assignments/${assignmentId}`);
    return assignmentManagementResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, '과제 정보를 불러오는데 실패했습니다.');
    throw new Error(message);
  }
};

export const useAssignmentDetailQuery = (assignmentId: string | undefined) =>
  useQuery({
    queryKey: ASSIGNMENT_MANAGEMENT_QUERY_KEYS.detail(assignmentId ?? ''),
    queryFn: () => fetchAssignmentDetail(assignmentId!),
    staleTime: 0,
    enabled: Boolean(assignmentId),
  });

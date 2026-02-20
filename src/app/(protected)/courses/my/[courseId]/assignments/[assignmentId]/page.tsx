'use client';

import { use } from 'react';
import { AssignmentDetailPage } from '@/features/assignment-detail/components/assignment-detail-page';

type AssignmentDetailRouteProps = {
  params: Promise<{ courseId: string; assignmentId: string }>;
};

export default function AssignmentDetailRoute({
  params,
}: AssignmentDetailRouteProps) {
  const { courseId, assignmentId } = use(params);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <AssignmentDetailPage courseId={courseId} assignmentId={assignmentId} />
    </div>
  );
}

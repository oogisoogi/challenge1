'use client';

import { use } from 'react';
import { FeedbackPage } from '@/features/grades/components/feedback-page';

type FeedbackRouteProps = {
  params: Promise<{ courseId: string; assignmentId: string }>;
};

export default function FeedbackRoute({ params }: FeedbackRouteProps) {
  const { courseId, assignmentId } = use(params);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <FeedbackPage courseId={courseId} assignmentId={assignmentId} />
    </div>
  );
}

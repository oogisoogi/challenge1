'use client';

import { use } from 'react';
import { SubmissionListPage } from '@/features/assignment-management/components/submission-list-page';

type SubmissionsPageProps = {
  params: Promise<{ assignmentId: string }>;
};

export default function SubmissionsPage({ params }: SubmissionsPageProps) {
  const { assignmentId } = use(params);
  return <SubmissionListPage assignmentId={assignmentId} />;
}

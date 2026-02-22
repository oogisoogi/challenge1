'use client';

import { use } from 'react';
import { AssignmentFormPage } from '@/features/assignment-management/components/assignment-form-page';

type NewAssignmentPageProps = {
  params: Promise<Record<string, never>>;
  searchParams: Promise<{ courseId?: string }>;
};

export default function NewAssignmentPage({ params, searchParams }: NewAssignmentPageProps) {
  void params;
  const { courseId } = use(searchParams);
  return <AssignmentFormPage mode="create" defaultCourseId={courseId} />;
}

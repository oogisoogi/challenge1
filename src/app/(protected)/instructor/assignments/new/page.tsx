'use client';

import { AssignmentFormPage } from '@/features/assignment-management/components/assignment-form-page';

type NewAssignmentPageProps = {
  params: Promise<Record<string, never>>;
};

export default function NewAssignmentPage({ params }: NewAssignmentPageProps) {
  void params;
  return <AssignmentFormPage mode="create" />;
}

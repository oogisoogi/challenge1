'use client';

import { use } from 'react';
import { CourseFormPage } from '@/features/course-management/components/course-form-page';

type EditCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default function EditCoursePage({ params }: EditCoursePageProps) {
  const { courseId } = use(params);
  return <CourseFormPage mode="edit" courseId={courseId} />;
}

'use client';

import { CourseFormPage } from '@/features/course-management/components/course-form-page';

type NewCoursePageProps = {
  params: Promise<Record<string, never>>;
};

export default function NewCoursePage({ params }: NewCoursePageProps) {
  void params;
  return <CourseFormPage mode="create" />;
}

'use client';

import { use } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CourseDetailView } from '@/features/course/components/course-detail-view';
import { EnrollButton } from '@/features/course/components/enroll-button';
import { useCourseDetailQuery } from '@/features/course/hooks/useCourseDetailQuery';

type CourseDetailPageProps = {
  params: Promise<{ courseId: string }>;
};

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = use(params);
  const { data: course, isLoading, isError } = useCourseDetailQuery(courseId);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <Link href="/courses">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-1 h-4 w-4" />
            코스 목록
          </Button>
        </Link>
        {course && (
          <EnrollButton
            courseId={courseId}
            enrollmentStatus={course.enrollmentStatus}
          />
        )}
      </div>

      <CourseDetailView
        course={course}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  );
}

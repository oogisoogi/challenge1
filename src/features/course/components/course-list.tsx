'use client';

import { BookOpen } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CourseCard } from './course-card';
import type { CourseSummary } from '@/features/course/lib/dto';

type CourseListProps = {
  courses: CourseSummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
};

const SkeletonCard = () => (
  <Card className="h-[220px] animate-pulse">
    <div className="p-6 space-y-3">
      <div className="h-5 w-3/4 rounded bg-muted" />
      <div className="flex gap-1.5">
        <div className="h-5 w-16 rounded bg-muted" />
        <div className="h-5 w-12 rounded bg-muted" />
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
    </div>
  </Card>
);

export const CourseList = ({ courses, isLoading, isError }: CourseListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">오류가 발생했습니다</p>
        <p className="text-sm">코스 목록을 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.</p>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <BookOpen className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">조건에 맞는 코스가 없습니다</p>
        <p className="text-sm">다른 검색어나 필터를 시도해보세요.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <CourseCard key={course.id} course={course} />
      ))}
    </div>
  );
};

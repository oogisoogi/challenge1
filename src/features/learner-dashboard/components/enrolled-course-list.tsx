'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { EnrolledCourse } from '@/features/learner-dashboard/lib/dto';

type EnrolledCourseListProps = {
  courses: EnrolledCourse[];
};

export const EnrolledCourseList = ({ courses }: EnrolledCourseListProps) => {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BookOpen className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">수강 중인 코스가 없습니다</p>
        <Link
          href="/courses"
          className="mt-2 text-sm text-primary underline underline-offset-4 hover:text-primary/80"
        >
          코스 카탈로그 둘러보기
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <Link key={course.id} href={`/courses/${course.id}`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="space-y-2">
              <h3 className="line-clamp-1 text-lg font-semibold">
                {course.title}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {course.categoryName && (
                  <Badge variant="secondary">{course.categoryName}</Badge>
                )}
                {course.difficultyName && (
                  <Badge variant="outline">{course.difficultyName}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {course.instructorName}
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {course.progress.completed}/{course.progress.total} 완료
                  </span>
                  <span className="font-medium">
                    {course.progress.percentage}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${course.progress.percentage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

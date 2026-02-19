'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        <p className="mb-4 text-sm">코스를 둘러보세요.</p>
        <Link href="/courses">
          <Button variant="outline" size="sm">
            코스 카탈로그 보기
          </Button>
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
              <p className="text-sm text-muted-foreground">
                {course.instructorName}
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {course.progress.completed}/{course.progress.total} 완료
                  </span>
                  <span>{course.progress.percentage}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
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

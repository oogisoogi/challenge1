'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { InstructorCourse } from '@/features/instructor-dashboard/lib/dto';

type MyCourseListProps = {
  courses: InstructorCourse[];
};

const STATUS_CONFIG = {
  published: {
    label: '공개',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  draft: {
    label: '초안',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  },
  archived: {
    label: '보관',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
  },
} as const;

export const MyCourseList = ({ courses }: MyCourseListProps) => {
  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <BookOpen className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">
          아직 코스가 없습니다. 새 코스를 만들어 보세요.
        </p>
        <p className="mb-4 text-sm">첫 번째 코스를 생성해 보세요.</p>
        <Link href="/instructor/courses/new">
          <Button variant="outline" size="sm">
            코스 생성하기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => {
        const statusConfig = STATUS_CONFIG[course.status];

        return (
          <Link key={course.id} href={`/instructor/courses/${course.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 text-lg font-semibold">
                    {course.title}
                  </h3>
                  <Badge className={statusConfig.className}>
                    {statusConfig.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {course.categoryName && (
                    <Badge variant="secondary">{course.categoryName}</Badge>
                  )}
                  {course.difficultyName && (
                    <Badge variant="outline">{course.difficultyName}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>수강생 {course.learnerCount}명</span>
                  {course.pendingGradingCount > 0 && (
                    <Badge variant="destructive">
                      {course.pendingGradingCount}건 채점 대기
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

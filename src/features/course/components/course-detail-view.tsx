'use client';

import { Users, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { CourseDetailResponse } from '@/features/course/lib/dto';
import { format } from 'date-fns';

type CourseDetailViewProps = {
  course: CourseDetailResponse | undefined;
  isLoading: boolean;
  isError: boolean;
};

const DetailSkeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="space-y-3">
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded bg-muted" />
        <div className="h-6 w-16 rounded bg-muted" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
    </div>
    <div className="h-40 rounded bg-muted" />
  </div>
);

export const CourseDetailView = ({
  course,
  isLoading,
  isError,
}: CourseDetailViewProps) => {
  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-lg font-medium">코스를 찾을 수 없습니다</p>
        <p className="text-sm">존재하지 않거나 비공개 코스입니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold">{course.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {course.categoryName && (
            <Badge variant="secondary">{course.categoryName}</Badge>
          )}
          {course.difficultyName && (
            <Badge variant="outline">{course.difficultyName}</Badge>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            수강생 {course.enrollmentCount}명
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(course.createdAt), 'yyyy.MM.dd')}
          </span>
        </div>
      </div>

      <Separator />

      {/* Description */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">코스 소개</h2>
        <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
          {course.description}
        </p>
      </section>

      <Separator />

      {/* Curriculum */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">커리큘럼</h2>
        {course.curriculum ? (
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-muted-foreground leading-relaxed">
            {course.curriculum}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            커리큘럼이 아직 등록되지 않았습니다.
          </p>
        )}
      </section>

      <Separator />

      {/* Instructor */}
      <Card>
        <CardContent className="flex items-start gap-4 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">{course.instructorName}</h3>
            <p className="text-sm text-muted-foreground">
              {course.instructorBio || '강사 소개가 없습니다.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

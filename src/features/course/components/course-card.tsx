'use client';

import Link from 'next/link';
import { Users, Calendar } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CourseSummary } from '@/features/course/lib/dto';
import { format } from 'date-fns';

type CourseCardProps = {
  course: CourseSummary;
};

export const CourseCard = ({ course }: CourseCardProps) => {
  return (
    <Link href={`/courses/${course.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="space-y-2">
          <h3 className="line-clamp-1 text-lg font-semibold">{course.title}</h3>
          <div className="flex flex-wrap gap-1.5">
            {course.categoryName && (
              <Badge variant="secondary">{course.categoryName}</Badge>
            )}
            {course.difficultyName && (
              <Badge variant="outline">{course.difficultyName}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {course.description}
          </p>
        </CardContent>
        <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{course.instructorName}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {course.enrollmentCount}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(course.createdAt), 'yyyy.MM.dd')}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

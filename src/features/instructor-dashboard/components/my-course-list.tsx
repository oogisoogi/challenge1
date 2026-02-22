'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { InstructorCourse } from '@/features/instructor-dashboard/lib/dto';
import { useDeleteCourseMutation } from '@/features/course-management/hooks/useDeleteCourseMutation';

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
  const router = useRouter();
  const deleteMutation = useDeleteCourseMutation();
  const [deleteTarget, setDeleteTarget] = useState<InstructorCourse | null>(null);

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

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSettled: () => setDeleteTarget(null),
    });
  };

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const statusConfig = STATUS_CONFIG[course.status];

          return (
            <Card key={course.id} className="relative h-full transition-shadow hover:shadow-md">
              <div className="absolute right-3 top-3 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/instructor/courses/${course.id}/edit`);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteTarget(course);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <Link href={`/instructor/courses/${course.id}/edit`}>
                <CardHeader className="space-y-2">
                  <div className="flex items-start justify-between gap-2 pr-10">
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
              </Link>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>코스 삭제</DialogTitle>
            <DialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; 코스를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

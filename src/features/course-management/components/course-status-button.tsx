'use client';

import { useState } from 'react';
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
  ALLOWED_STATUS_TRANSITIONS,
  STATUS_TRANSITION_CONFIG,
} from '@/features/course-management/constants';
import { useUpdateCourseStatusMutation } from '@/features/course-management/hooks/useUpdateCourseStatusMutation';

type CourseStatusButtonProps = {
  courseId: string;
  currentStatus: 'draft' | 'published' | 'archived';
};

export const CourseStatusButton = ({
  courseId,
  currentStatus,
}: CourseStatusButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { mutate, isPending } = useUpdateCourseStatusMutation(courseId);

  const nextStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus];

  if (nextStatuses.length === 0) {
    return null;
  }

  const nextStatus = nextStatuses[0] as 'published' | 'archived';
  const config = STATUS_TRANSITION_CONFIG[nextStatus];

  const handleConfirm = () => {
    mutate(
      { status: nextStatus },
      {
        onSuccess: () => setIsDialogOpen(false),
      },
    );
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsDialogOpen(true)}
        disabled={isPending}
      >
        {config.label}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{config.label}</DialogTitle>
            <DialogDescription>{config.confirmMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {isPending ? '처리 중...' : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

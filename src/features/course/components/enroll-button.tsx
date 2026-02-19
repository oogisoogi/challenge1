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
import { useEnrollMutation } from '@/features/course/hooks/useEnrollMutation';
import { useCancelEnrollmentMutation } from '@/features/course/hooks/useCancelEnrollmentMutation';

type EnrollButtonProps = {
  courseId: string;
  enrollmentStatus: 'active' | 'cancelled' | null;
};

export const EnrollButton = ({
  courseId,
  enrollmentStatus,
}: EnrollButtonProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const enrollMutation = useEnrollMutation(courseId);
  const cancelMutation = useCancelEnrollmentMutation(courseId);

  const isEnrolled = enrollmentStatus === 'active';
  const isPending = enrollMutation.isPending || cancelMutation.isPending;

  const handleEnroll = () => {
    enrollMutation.mutate();
  };

  const handleCancelConfirm = () => {
    cancelMutation.mutate(undefined, {
      onSettled: () => setDialogOpen(false),
    });
  };

  if (isEnrolled) {
    return (
      <>
        <Button
          variant="destructive"
          size="lg"
          disabled={isPending}
          onClick={() => setDialogOpen(true)}
        >
          {cancelMutation.isPending ? '처리 중...' : '수강취소'}
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>수강취소 확인</DialogTitle>
              <DialogDescription>
                정말로 이 코스의 수강을 취소하시겠습니까? 취소 후에도 다시 수강신청할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={cancelMutation.isPending}
              >
                닫기
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? '처리 중...' : '수강취소'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Button
      size="lg"
      disabled={isPending}
      onClick={handleEnroll}
    >
      {enrollMutation.isPending ? '처리 중...' : '수강신청'}
    </Button>
  );
};

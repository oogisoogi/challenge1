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
  ALLOWED_ASSIGNMENT_STATUS_TRANSITIONS,
  ASSIGNMENT_STATUS_TRANSITION_CONFIG,
} from '@/features/assignment-management/constants';
import { useUpdateAssignmentStatusMutation } from '@/features/assignment-management/hooks/useUpdateAssignmentStatusMutation';

type AssignmentStatusButtonProps = {
  assignmentId: string;
  currentStatus: 'draft' | 'published' | 'closed';
};

export const AssignmentStatusButton = ({
  assignmentId,
  currentStatus,
}: AssignmentStatusButtonProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { mutate, isPending } = useUpdateAssignmentStatusMutation(assignmentId);

  const nextStatuses = ALLOWED_ASSIGNMENT_STATUS_TRANSITIONS[currentStatus];

  if (nextStatuses.length === 0) {
    return null;
  }

  const nextStatus = nextStatuses[0] as 'published' | 'closed';
  const config = ASSIGNMENT_STATUS_TRANSITION_CONFIG[nextStatus];

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
            <DialogTitle>{config.confirmTitle}</DialogTitle>
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

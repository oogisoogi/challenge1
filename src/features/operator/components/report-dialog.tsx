'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Flag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateReportMutation } from '@/features/operator/hooks/useCreateReportMutation';
import { createReportBodySchema, type CreateReportBody } from '@/features/operator/lib/dto';
import { REPORT_TARGET_TYPE_LABELS } from '@/features/operator/constants';

type ReportDialogProps = {
  targetType: CreateReportBody['targetType'];
  targetId: string;
  trigger?: React.ReactNode;
};

const TARGET_TYPE_OPTIONS = ['course', 'assignment', 'submission', 'user'] as const;

export const ReportDialog = ({ targetType, targetId, trigger }: ReportDialogProps) => {
  const [open, setOpen] = useState(false);
  const { mutate, isPending } = useCreateReportMutation();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateReportBody>({
    resolver: zodResolver(createReportBodySchema),
    defaultValues: {
      targetType,
      targetId,
      reason: '',
      content: '',
    },
  });

  const currentTargetType = watch('targetType');

  const onSubmit = (data: CreateReportBody) => {
    mutate(data, {
      onSuccess: () => {
        setOpen(false);
        reset({ targetType, targetId, reason: '', content: '' });
      },
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      reset({ targetType, targetId, reason: '', content: '' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
            <Flag className="h-4 w-4" />
            신고
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>신고하기</DialogTitle>
          <DialogDescription>
            부적절한 콘텐츠나 행위를 신고합니다. 운영팀에서 확인 후 처리합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>신고 대상 유형</Label>
            <Select
              value={currentTargetType}
              onValueChange={(v) => setValue('targetType', v as CreateReportBody['targetType'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="대상 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {TARGET_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {REPORT_TARGET_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetType && (
              <p className="text-sm text-destructive">{errors.targetType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-target-id">대상 ID</Label>
            <Input
              id="report-target-id"
              {...register('targetId')}
              readOnly
              className="bg-muted"
            />
            {errors.targetId && (
              <p className="text-sm text-destructive">{errors.targetId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-reason">신고 사유</Label>
            <Input
              id="report-reason"
              placeholder="신고 사유를 입력하세요"
              {...register('reason')}
              aria-invalid={Boolean(errors.reason)}
            />
            {errors.reason && (
              <p className="text-sm text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-content">
              상세 내용 <span className="text-xs text-muted-foreground">(선택)</span>
            </Label>
            <Textarea
              id="report-content"
              placeholder="상세 내용을 입력하세요"
              rows={4}
              {...register('content')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              신고 접수
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

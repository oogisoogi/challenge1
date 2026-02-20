'use client';

import { useRouter } from 'next/navigation';
import { ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { RecentSubmission } from '@/features/instructor-dashboard/lib/dto';

type RecentSubmissionTableProps = {
  submissions: RecentSubmission[];
};

const SUBMISSION_STATUS_CONFIG = {
  submitted: {
    label: '제출됨',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  },
  graded: {
    label: '채점완료',
    className: 'bg-green-100 text-green-800 hover:bg-green-100',
  },
  resubmission_required: {
    label: '재제출요청',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  },
} as const;

export const RecentSubmissionTable = ({
  submissions,
}: RecentSubmissionTableProps) => {
  const router = useRouter();

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ClipboardList className="mb-3 h-12 w-12" />
        <p className="text-lg font-medium">아직 제출된 과제가 없습니다</p>
      </div>
    );
  }

  const handleRowClick = (assignmentId: string) => {
    router.push(`/instructor/assignments/${assignmentId}/submissions`);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>제출자</TableHead>
            <TableHead>과제명</TableHead>
            <TableHead>코스명</TableHead>
            <TableHead>제출일</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>지각</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((submission) => {
            const statusConfig = SUBMISSION_STATUS_CONFIG[submission.status];

            return (
              <TableRow
                key={submission.id}
                className="cursor-pointer hover:bg-accent"
                onClick={() => handleRowClick(submission.assignmentId)}
              >
                <TableCell className="font-medium">
                  {submission.learnerName}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {submission.assignmentTitle}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {submission.courseTitle}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(submission.submittedAt), 'yyyy.MM.dd HH:mm', {
                    locale: ko,
                  })}
                </TableCell>
                <TableCell>
                  <Badge className={statusConfig.className}>
                    {statusConfig.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {submission.isLate && (
                    <Badge variant="outline">지각</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

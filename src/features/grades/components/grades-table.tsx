'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AssignmentGrade } from '@/features/grades/lib/dto';

type GradesTableProps = {
  courseId: string;
  assignments: AssignmentGrade[];
};

const STATUS_CONFIG = {
  not_submitted: {
    label: '미제출',
    variant: 'secondary' as const,
    className: '',
  },
  submitted: {
    label: '채점 대기',
    variant: 'outline' as const,
    className: '',
  },
  graded: {
    label: '채점완료',
    variant: 'default' as const,
    className: '',
  },
  resubmission_required: {
    label: '재제출요청',
    variant: null,
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
} as const;

const getScoreDisplay = (grade: AssignmentGrade): string => {
  if (grade.status === 'not_submitted') return '미제출';
  if (grade.status === 'submitted') return '채점 대기';
  if (grade.score !== null) return `${grade.score}/100`;
  return '-';
};

const hasFeedbackLink = (status: AssignmentGrade['status']): boolean =>
  status === 'graded' || status === 'resubmission_required';

const StatusBadge = ({ status }: { status: AssignmentGrade['status'] }) => {
  const config = STATUS_CONFIG[status];

  if (config.variant) {
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  return (
    <Badge className={config.className} variant="outline">
      {config.label}
    </Badge>
  );
};

const EmptyState = () => (
  <TableRow>
    <TableCell
      colSpan={6}
      className="py-12 text-center text-muted-foreground"
    >
      등록된 과제가 없습니다
    </TableCell>
  </TableRow>
);

export const GradesTable = ({ courseId, assignments }: GradesTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>과제명</TableHead>
          <TableHead className="w-20 text-center">비중</TableHead>
          <TableHead className="w-28 text-center">점수</TableHead>
          <TableHead className="w-20 text-center">지각</TableHead>
          <TableHead className="w-28 text-center">상태</TableHead>
          <TableHead>피드백</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.length === 0 ? (
          <EmptyState />
        ) : (
          assignments.map((grade) => (
            <TableRow key={grade.assignmentId}>
              <TableCell className="font-medium">
                {hasFeedbackLink(grade.status) ? (
                  <Link
                    href={`/courses/my/${courseId}/assignments/${grade.assignmentId}/feedback`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    {grade.title}
                  </Link>
                ) : (
                  grade.title
                )}
              </TableCell>
              <TableCell className="text-center">
                {grade.weight}점
              </TableCell>
              <TableCell className="text-center">
                {getScoreDisplay(grade)}
              </TableCell>
              <TableCell className="text-center">
                {grade.isLate === true ? (
                  <Badge variant="destructive">지각</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <StatusBadge status={grade.status} />
              </TableCell>
              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                {grade.feedbackSummary ?? '-'}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

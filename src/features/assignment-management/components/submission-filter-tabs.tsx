'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  SUBMISSION_FILTER_LABELS,
  type SubmissionFilter,
} from '@/features/assignment-management/constants';

type SubmissionFilterTabsProps = {
  currentFilter: SubmissionFilter;
  onFilterChange: (filter: SubmissionFilter) => void;
  counts: Record<SubmissionFilter, number>;
};

export const SubmissionFilterTabs = ({
  currentFilter,
  onFilterChange,
  counts,
}: SubmissionFilterTabsProps) => {
  const filters = Object.keys(SUBMISSION_FILTER_LABELS) as SubmissionFilter[];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <Button
          key={filter}
          variant={currentFilter === filter ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange(filter)}
          className="gap-2"
        >
          {SUBMISSION_FILTER_LABELS[filter]}
          <Badge
            variant={currentFilter === filter ? 'secondary' : 'outline'}
            className="h-5 min-w-[20px] px-1 text-xs"
          >
            {counts[filter]}
          </Badge>
        </Button>
      ))}
    </div>
  );
};

'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCourseMetaQuery } from '@/features/course/hooks/useCourseMetaQuery';
import { SORT_OPTIONS } from '@/features/course/constants';

type CourseFiltersProps = {
  q: string;
  categoryId: string;
  difficultyId: string;
  sort: string;
  onChangeQ: (value: string) => void;
  onChangeCategoryId: (value: string) => void;
  onChangeDifficultyId: (value: string) => void;
  onChangeSort: (value: string) => void;
};

const ALL_VALUE = '__all__';

export const CourseFilters = ({
  q,
  categoryId,
  difficultyId,
  sort,
  onChangeQ,
  onChangeCategoryId,
  onChangeDifficultyId,
  onChangeSort,
}: CourseFiltersProps) => {
  const { data: meta } = useCourseMetaQuery();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="코스 검색..."
          value={q}
          onChange={(e) => onChangeQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={categoryId || ALL_VALUE}
        onValueChange={(v) => onChangeCategoryId(v === ALL_VALUE ? '' : v)}
      >
        <SelectTrigger className="w-full sm:w-[160px]">
          <SelectValue placeholder="카테고리" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>전체 카테고리</SelectItem>
          {meta?.categories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              {cat.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={difficultyId || ALL_VALUE}
        onValueChange={(v) => onChangeDifficultyId(v === ALL_VALUE ? '' : v)}
      >
        <SelectTrigger className="w-full sm:w-[140px]">
          <SelectValue placeholder="난이도" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE}>전체 난이도</SelectItem>
          {meta?.difficultyLevels.map((diff) => (
            <SelectItem key={diff.id} value={diff.id}>
              {diff.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={onChangeSort}>
        <SelectTrigger className="w-full sm:w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

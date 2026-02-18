'use client';

import { GraduationCap, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = [
  {
    value: 'learner' as const,
    label: '학습자',
    description: '코스를 수강하고 과제를 제출합니다.',
    icon: GraduationCap,
  },
  {
    value: 'instructor' as const,
    label: '강사',
    description: '코스를 개설하고 과제를 관리합니다.',
    icon: BookOpen,
  },
] as const;

type RoleSelectorProps = {
  value: string | undefined;
  onChange: (value: 'learner' | 'instructor') => void;
};

export const RoleSelector = ({ value, onChange }: RoleSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {ROLES.map((role) => {
        const isSelected = value === role.value;
        const Icon = role.icon;

        return (
          <button
            key={role.value}
            type="button"
            onClick={() => onChange(role.value)}
            className={cn(
              'flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-colors',
              isSelected
                ? 'border-slate-900 bg-slate-50'
                : 'border-slate-200 hover:border-slate-400',
            )}
          >
            <Icon
              className={cn(
                'h-8 w-8',
                isSelected ? 'text-slate-900' : 'text-slate-400',
              )}
            />
            <span
              className={cn(
                'text-sm font-semibold',
                isSelected ? 'text-slate-900' : 'text-slate-600',
              )}
            >
              {role.label}
            </span>
            <span className="text-xs text-slate-500">{role.description}</span>
          </button>
        );
      })}
    </div>
  );
};

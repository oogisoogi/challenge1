'use client';

import { use } from 'react';
import { GradesPage } from '@/features/grades/components/grades-page';

type GradesRouteProps = {
  params: Promise<{ courseId: string }>;
};

export default function GradesRoute({ params }: GradesRouteProps) {
  const { courseId } = use(params);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <GradesPage courseId={courseId} />
    </div>
  );
}

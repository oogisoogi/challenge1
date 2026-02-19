'use client';

import { LearnerDashboardPage } from '@/features/learner-dashboard/components/learner-dashboard-page';

type CoursesMyPageProps = {
  params: Promise<Record<string, never>>;
};

export default function CoursesMyPage({ params }: CoursesMyPageProps) {
  void params;
  return <LearnerDashboardPage />;
}

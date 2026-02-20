'use client';

import ReactMarkdown from 'react-markdown';

type AssignmentDescriptionProps = {
  description: string;
};

export const AssignmentDescription = ({
  description,
}: AssignmentDescriptionProps) => {
  if (!description.trim()) {
    return (
      <p className="text-sm text-muted-foreground">과제 설명이 없습니다.</p>
    );
  }

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown>{description}</ReactMarkdown>
    </div>
  );
};

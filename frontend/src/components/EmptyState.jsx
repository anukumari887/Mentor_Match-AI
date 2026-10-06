import React from 'react';
import Card from './Card';
import {
  EmptyStateMentorSearch,
  EmptyStateSessions,
  EmptyStateProfileIncomplete,
  EmptyStateReviews,
  EmptyStateEarnings,
  EmptyStateComplaints,
  EmptyState404,
  EmptyStateNetworkError
} from './Illustrations';

const ILLUSTRATION_MAP = {
  mentors: EmptyStateMentorSearch,
  sessions: EmptyStateSessions,
  profile: EmptyStateProfileIncomplete,
  reviews: EmptyStateReviews,
  earnings: EmptyStateEarnings,
  complaints: EmptyStateComplaints,
  '404': EmptyState404,
  network: EmptyStateNetworkError
};

export default function EmptyState({
  type,
  illustration: IllustrationProp,
  icon: Icon,
  title,
  description,
  action,
  className = ''
}) {
  const ResolvedIllustration = IllustrationProp || (type ? ILLUSTRATION_MAP[type] : null);

  return (
    <Card
      variant="flat"
      padding="lg"
      className={`text-center flex flex-col items-center justify-center border-dashed ${className}`}
    >
      {ResolvedIllustration ? (
        <ResolvedIllustration />
      ) : Icon ? (
        <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised border border-border text-ink-muted">
          <Icon size={20} />
        </div>
      ) : null}

      {title && (
        <h4 className="font-serif text-base sm:text-lg font-semibold text-ink">
          {title}
        </h4>
      )}
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

import React from 'react';
import Card from './Card';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = ''
}) {
  return (
    <Card
      variant="flat"
      padding="lg"
      className={`text-center flex flex-col items-center justify-center border-dashed ${className}`}
    >
      {Icon && (
        <div className="mb-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-surface-raised border border-border text-ink-muted">
          <Icon size={20} />
        </div>
      )}
      {title && (
        <h4 className="font-serif text-base font-semibold text-ink">
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

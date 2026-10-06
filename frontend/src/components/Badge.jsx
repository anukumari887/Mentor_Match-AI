import React from 'react';

export default function Badge({
  variant = 'neutral',
  size = 'sm',
  className = '',
  children,
  ...rest
}) {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };

  const variants = {
    neutral: 'bg-surface-raised text-ink-muted border border-border',
    accent: 'bg-accent/10 text-accent border border-accent/30 font-medium',
    success: 'bg-success/10 text-success border border-success/30 font-medium',
    warning: 'bg-warning/10 text-warning border border-warning/30 font-medium',
    danger: 'bg-danger/10 text-danger border border-danger/30 font-medium'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-sans tracking-wide uppercase ${sizes[size] || sizes.sm} ${variants[variant] || variants.neutral} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

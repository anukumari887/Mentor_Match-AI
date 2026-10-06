import React from 'react';

export default function Card({
  as: Component = 'div',
  variant = 'default',
  padding = 'md',
  className = '',
  children,
  ...rest
}) {
  const paddings = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8'
  };

  const variants = {
    default: 'bg-surface border border-border',
    raised: 'bg-surface-raised border border-border shadow-sm',
    flat: 'bg-surface/50 border border-border/70',
    interactive:
      'bg-surface border border-border hover:border-accent transition-colors duration-150 cursor-pointer'
  };

  return (
    <Component
      className={`rounded ${variants[variant] || variants.default} ${paddings[padding] || paddings.md} ${className}`}
      {...rest}
    >
      {children}
    </Component>
  );
}

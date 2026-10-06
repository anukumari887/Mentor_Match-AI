import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:cursor-not-allowed whitespace-nowrap';

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5 rounded-sm gap-1.5',
    md: 'text-sm px-3.5 py-2 rounded-sm gap-2',
    lg: 'text-base px-5 py-2.5 rounded-sm gap-2.5'
  }[size] || 'text-sm px-3.5 py-2 rounded-sm gap-2';

  const variantClasses = {
    primary: 'bg-accent text-accent-text border border-transparent hover:bg-accent-hover disabled:opacity-50',
    secondary: 'bg-surface text-text border border-border hover:bg-surface-raised hover:border-border-strong disabled:opacity-50',
    quiet: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-raised border border-transparent disabled:opacity-50',
    danger: 'bg-danger text-danger-text border border-transparent hover:opacity-90 disabled:opacity-50'
  }[variant] || 'bg-accent text-accent-text hover:bg-accent-hover';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading && (
        <span
          className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}

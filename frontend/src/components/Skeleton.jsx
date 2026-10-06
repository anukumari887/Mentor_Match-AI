import React from 'react';

export default function Skeleton({
  variant = 'line',
  width,
  height,
  className = ''
}) {
  const baseClasses = 'bg-surface-raised/70 animate-pulse rounded';

  if (variant === 'circle') {
    return (
      <div
        className={`${baseClasses} rounded-full ${className}`}
        style={{ width: width || '40px', height: height || '40px' }}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={`bg-surface border border-border p-5 rounded space-y-3.5 ${className}`}
      >
        <div className={`${baseClasses} h-4 w-1/3`} />
        <div className={`${baseClasses} h-3 w-3/4`} />
        <div className={`${baseClasses} h-3 w-1/2`} />
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${className}`}
      style={{
        width: width || '100%',
        height: height || '16px'
      }}
    />
  );
}

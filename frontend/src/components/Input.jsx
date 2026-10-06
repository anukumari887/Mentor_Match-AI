import React, { forwardRef } from 'react';

const Input = forwardRef(function Input(
  {
    label,
    id,
    name,
    type = 'text',
    error,
    hint,
    required = false,
    disabled = false,
    fullWidth = true,
    className = '',
    ...rest
  },
  ref
) {
  const inputId = id || name || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} space-y-1.5`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold tracking-wide text-ink"
        >
          {label}
          {required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className={`w-full rounded px-3 py-2 text-sm bg-surface text-ink border transition-colors outline-none
          ${
            error
              ? 'border-danger focus:border-danger focus:ring-1 focus:ring-danger'
              : 'border-border focus:border-accent focus:ring-1 focus:ring-accent'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          placeholder:text-ink-muted/60
          ${className}`}
        {...rest}
      />
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function Toast({
  message,
  variant = 'info',
  onClose,
  duration = 5000,
  className = ''
}) {
  useEffect(() => {
    if (!duration || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    info: <Info size={16} className="text-accent shrink-0" />,
    success: <CheckCircle2 size={16} className="text-success shrink-0" />,
    warning: <AlertTriangle size={16} className="text-warning shrink-0" />,
    error: <AlertCircle size={16} className="text-danger shrink-0" />
  };

  const borders = {
    info: 'border-accent/40',
    success: 'border-success/40',
    warning: 'border-warning/40',
    error: 'border-danger/40'
  };

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded bg-surface-raised border ${borders[variant] || borders.info} px-4 py-3 shadow-md text-sm text-ink max-w-sm transition-all duration-150 ${className}`}
    >
      {icons[variant] || icons.info}
      <p className="flex-1 text-xs sm:text-sm font-medium leading-relaxed">{message}</p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="text-ink-muted hover:text-ink p-1 rounded transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

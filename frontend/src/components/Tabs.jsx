import React from 'react';

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  className = '',
  'aria-label': ariaLabel = 'Navigation tabs'
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 border-b border-border overflow-x-auto ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            type="button"
            onClick={() => onChange?.(tab.id)}
            className={`group inline-flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-xs font-semibold tracking-wide border-b-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent
              ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-ink-muted hover:text-ink hover:border-border'
              }`}
          >
            {Icon && <Icon size={14} className={isActive ? 'text-accent' : 'text-ink-muted'} />}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`ml-1 rounded px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive ? 'bg-accent/15 text-accent' : 'bg-surface-raised text-ink-muted'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

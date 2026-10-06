import React, { useEffect, useRef, useState } from 'react';
import { Check, Palette } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function ThemeMenu() {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const currentTheme = themes.find((t) => t.id === theme) || themes[0];

  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    }

    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={`Change theme, currently ${currentTheme.name}`}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-sm border border-border bg-surface hover:bg-surface-raised text-text transition-colors focus:outline-none"
      >
        <span
          className="w-3 h-3 rounded-full border shrink-0 inline-block"
          style={{
            backgroundColor: currentTheme.swatch.bg,
            borderColor: currentTheme.swatch.border,
            boxShadow: `0 0 0 1.5px ${currentTheme.swatch.accent}`
          }}
          aria-hidden="true"
        />
        <span className="hidden sm:inline">{currentTheme.name}</span>
        <Palette className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Select appearance theme"
          className="absolute right-0 mt-1.5 w-56 rounded-md border border-border bg-surface py-1 shadow-lg z-50 focus:outline-none"
        >
          <div className="px-3 py-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider border-b border-border mb-1">
            Appearance
          </div>
          {themes.map((t) => {
            const isSelected = t.id === theme;
            return (
              <button
                key={t.id}
                role="menuitem"
                onClick={() => {
                  setTheme(t.id);
                  setIsOpen(false);
                  buttonRef.current?.focus();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors hover:bg-surface-raised ${
                  isSelected ? 'bg-surface-raised font-semibold text-text' : 'text-text'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full border shrink-0 flex items-center justify-center"
                    style={{
                      backgroundColor: t.swatch.bg,
                      borderColor: t.swatch.border
                    }}
                    aria-hidden="true"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: t.swatch.accent }}
                    />
                  </span>
                  <div>
                    <span className="block leading-tight">{t.name}</span>
                    <span className="block text-[10px] text-text-muted font-normal mt-0.5">
                      {t.description}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-accent shrink-0" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

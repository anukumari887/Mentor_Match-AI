import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme, THEMES } from './ThemeContext';

function ThemeControl() {
  const { theme, setTheme, themes } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      {themes.map((t) => (
        <button key={t.id} onClick={() => setTheme(t.id)}>
          Set {t.name}
        </button>
      ))}
    </div>
  );
}

describe('ThemeProvider (6-Theme System)', () => {
  afterEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('exposes all 6 required themes', () => {
    expect(THEMES).toHaveLength(6);
    const themeIds = THEMES.map((t) => t.id);
    expect(themeIds).toContain('light');
    expect(themeIds).toContain('dark');
    expect(themeIds).toContain('paper');
    expect(themeIds).toContain('midnight');
    expect(themeIds).toContain('forest');
    expect(themeIds).toContain('high-contrast');
  });

  it('persists selection to localStorage and updates document dataset', async () => {
    window.localStorage.setItem('mentor-match-theme', 'paper');
    render(
      <ThemeProvider>
        <ThemeControl />
      </ThemeProvider>
    );

    expect(screen.getByTestId('current-theme')).toHaveTextContent('paper');
    expect(document.documentElement.dataset.theme).toBe('paper');

    fireEvent.click(screen.getByText('Set Midnight'));

    await waitFor(() => {
      expect(window.localStorage.getItem('mentor-match-theme')).toBe('midnight');
      expect(document.documentElement.dataset.theme).toBe('midnight');
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    fireEvent.click(screen.getByText('Set Forest'));

    await waitFor(() => {
      expect(window.localStorage.getItem('mentor-match-theme')).toBe('forest');
      expect(document.documentElement.dataset.theme).toBe('forest');
      expect(document.documentElement.style.colorScheme).toBe('light');
    });
  });
});
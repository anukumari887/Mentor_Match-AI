import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

function ThemeControl() {
  const { theme, setTheme } = useTheme();
  return <button onClick={() => setTheme('dark')}>{theme}</button>;
}

describe('ThemeProvider', () => {
  afterEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('persists the selected mode and applies the matching document theme', async () => {
    window.localStorage.setItem('mentor-match-theme', 'light');
    render(<ThemeProvider><ThemeControl /></ThemeProvider>);

    expect(screen.getByRole('button')).toHaveTextContent('light');
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(window.localStorage.getItem('mentor-match-theme')).toBe('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });
});
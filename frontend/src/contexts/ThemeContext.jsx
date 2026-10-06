import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'mentor-match-theme';

function getInitialTheme() {
  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    return ['light', 'dark', 'system'].includes(savedTheme) ? savedTheme : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolvedTheme = theme === 'system' ? (mediaQuery?.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolvedTheme;
      if (resolvedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();
    mediaQuery?.addEventListener('change', applyTheme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // The theme still works for this session when storage is unavailable.
    }

    return () => mediaQuery?.removeEventListener('change', applyTheme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
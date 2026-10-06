import React, { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = [
  {
    id: 'light',
    name: 'Light',
    description: 'Warm off-white and charcoal ink',
    scheme: 'light',
    metaColor: '#fcfbfa',
    swatch: { bg: '#fcfbfa', text: '#181716', accent: '#9c3820', border: '#e5e1db' }
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Soft charcoal with muted ink',
    scheme: 'dark',
    metaColor: '#1a1a1c',
    swatch: { bg: '#1a1a1c', text: '#eeedf0', accent: '#e07a5f', border: '#383840' }
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Cream page and rich walnut ink',
    scheme: 'light',
    metaColor: '#f5efe6',
    swatch: { bg: '#f5efe6', text: '#2a221b', accent: '#854823', border: '#d8cdb8' }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep navy with arctic accent',
    scheme: 'dark',
    metaColor: '#0d1522',
    swatch: { bg: '#0d1522', text: '#e3ebf7', accent: '#4ba3e3', border: '#243654' }
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Calm pine mist and evergreen accent',
    scheme: 'light',
    metaColor: '#f2f6f2',
    swatch: { bg: '#f2f6f2', text: '#162719', accent: '#246b46', border: '#c8d7c8' }
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    description: 'Strict monochrome with bold borders',
    scheme: 'light',
    metaColor: '#ffffff',
    swatch: { bg: '#ffffff', text: '#000000', accent: '#0037b3', border: '#000000' }
  }
];

const VALID_THEME_IDS = THEMES.map((t) => t.id);
const STORAGE_KEY = 'mentor-match-theme';
const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_THEME_IDS.includes(saved)) {
      return saved;
    }
  } catch {
    // Fall back to system preference
  }

  try {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    return prefersDark ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const currentThemeConfig = THEMES.find((t) => t.id === theme) || THEMES[0];
    const resolvedTheme = currentThemeConfig.id;

    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = currentThemeConfig.scheme;

    if (currentThemeConfig.scheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', currentThemeConfig.metaColor);
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, resolvedTheme);
    } catch {
      // LocalStorage might be disabled in private browsing or iframe
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
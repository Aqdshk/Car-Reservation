import { useEffect, useState } from 'react';

const KEY = 'theme';

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'dark';
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(KEY, theme);
}

export default function ThemeToggle({ className = '' }) {
  const [theme, setTheme] = useState(() => getInitialTheme());

  useEffect(() => { applyTheme(theme); }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggle}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}

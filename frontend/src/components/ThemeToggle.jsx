import { useState } from 'react';
import { Icon } from '../lib/ui';

// Light by default: most bookings happen on a phone in a car park.
// Only an explicit toggle is remembered. (The old key "theme" was written on
// every load, so it is ignored rather than trusted.)
const KEY = 'cz-theme';

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* storage blocked */ }
  return 'light';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => getInitialTheme());

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    try { localStorage.setItem(KEY, next); } catch { /* storage blocked */ }
  };

  return (
    <button type="button" className="icon-btn" onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17}/>
    </button>
  );
}

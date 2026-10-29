import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';
const storageKey = 'picasso.theme';
const systemQuery = '(prefers-color-scheme: dark)';
const ThemeContext = createContext<{ preference: ThemePreference; setPreference: (preference: ThemePreference) => void } | null>(null);

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* Theme controls still work when browser storage is unavailable. */ }
  return 'system';
}

function applyTheme(preference: ThemePreference) {
  const theme = preference === 'system' ? (window.matchMedia(systemQuery).matches ? 'dark' : 'light') : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171e1b' : '#f6f6f2');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, updatePreference] = useState<ThemePreference>(readPreference);

  useEffect(() => {
    const media = window.matchMedia(systemQuery);
    const apply = () => applyTheme(preference);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [preference]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      const next = readPreference();
      applyTheme(next);
      updatePreference(next);
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function setPreference(next: ThemePreference) {
    applyTheme(next);
    updatePreference(next);
    try {
      if (next === 'system') localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, next);
    } catch { /* Keep this session's choice without requiring persistent storage. */ }
  }

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function ThemeSelector() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('Theme provider is missing.');
  return <label className="theme-selector">
    <span>Theme</span>
    <select value={theme.preference} onChange={event => theme.setPreference(event.target.value as ThemePreference)}>
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>;
}

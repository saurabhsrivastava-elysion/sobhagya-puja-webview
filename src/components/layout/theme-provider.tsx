import { ScriptOnce } from '@tanstack/react-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/*
 * Class-based light/dark theme (replaces next-themes). The choice is kept in localStorage under the same
 * `theme` key next-themes used, and `ThemeScript` applies it before first paint so SSR never flashes.
 */

export type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const MEDIA = '(prefers-color-scheme: dark)';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light';
}

/** Swaps the class without running every CSS transition at once (next-themes' disableTransitionOnChange). */
function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  const style = document.createElement('style');
  style.appendChild(document.createTextNode('*,*::before,*::after{transition:none!important}'));
  document.head.appendChild(style);
  root.classList.toggle('dark', resolved === 'dark');
  root.style.colorScheme = resolved;
  // Force a reflow so the class change lands before transitions are restored.
  void window.getComputedStyle(document.body).opacity;
  setTimeout(() => document.head.removeChild(style), 1);
}

/** Inline script for <head>: sets the `dark` class from storage or the OS before React hydrates. */
export function ThemeScript() {
  return (
    <ScriptOnce>
      {`(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||((t!=='light')&&window.matchMedia('${MEDIA}').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light'}catch(e){}})()`}
    </ScriptOnce>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // `null` until mounted, so nothing overrides the class ThemeScript set before the stored value is read.
  const [theme, setThemeState] = useState<Theme | null>(null);
  const [system, setSystem] = useState<ResolvedTheme>('light');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- storage is only readable after hydration
    setThemeState(readStoredTheme());
    setSystem(systemTheme());
    const media = window.matchMedia(MEDIA);
    const onChange = () => setSystem(systemTheme());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedTheme: ResolvedTheme = !theme || theme === 'system' ? system : theme;

  useEffect(() => {
    if (theme === null) return;
    if (document.documentElement.classList.contains('dark') !== (resolvedTheme === 'dark')) {
      applyTheme(resolvedTheme);
    }
  }, [theme, resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme: theme ?? 'system', resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

import { ScriptOnce } from '@tanstack/react-router';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

/*
 * The webview is always light (product decision): it does not follow the phone's dark mode, and
 * `color-scheme: light` also stops Android WebView from darkening it on its own. The dark palette in
 * globals.css is kept, unused, in case a dark theme is offered later; `ThemeScript` clears any `dark`
 * class or stored choice left by older builds before first paint.
 */

export type Theme = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const LIGHT: ThemeContextValue = { theme: 'light', resolvedTheme: 'light', setTheme: () => {} };

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Inline script for <head>: forces the light theme before React hydrates. */
export function ThemeScript() {
  return (
    <ScriptOnce>
      {`(function(){try{var r=document.documentElement;r.classList.remove('dark');r.style.colorScheme='light';localStorage.removeItem('${STORAGE_KEY}')}catch(e){}})()`}
    </ScriptOnce>
  );
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => LIGHT, []);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

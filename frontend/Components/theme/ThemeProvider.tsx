"use client";

import { createContext, useContext, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/* CHANGED: the theme now lives in a cookie, not localStorage.
   localStorage is never sent anywhere, so the server could not know the
   user's choice and always guessed "light" — the visible flash on load.
   A cookie travels in the headers of every request, so layout.tsx can read
   it and render <html data-theme="dark"> straight away.

   Division of labour: the SERVER reads the cookie (layout.tsx), the CLIENT
   writes it (below). Cookies cannot be set during server rendering, because
   HTTP will not accept new headers once the response has started streaming. */
export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: Theme;
  children: React.ReactNode;
}) {
  /* The server already applied this theme to <html>, so starting from it means
     server and client agree — no hydration mismatch, nothing to correct. */
  const [theme, setTheme] = useState<Theme>(initialTheme);

  /* REMOVED: both useEffects and the isLoaded flag. They existed only to patch
     up the server's wrong guess after paint. The server is right the first time
     now, so there is nothing left to patch. */

  const toggleTheme = () => {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    // Repaint immediately; CSS keys off this attribute, not off React state.
    document.documentElement.setAttribute("data-theme", next);
    // path=/  — send it on every page, not just this one.
    // max-age  — one year; without it the cookie dies when the browser closes.
    // SameSite=Lax — do not leak the cookie on cross-site requests.
    document.cookie = `theme=${next};path=/;max-age=31536000;SameSite=Lax`;
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return context;
}

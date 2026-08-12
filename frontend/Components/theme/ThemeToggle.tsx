"use client";

import { useTheme } from "@/Components/theme/ThemeProvider";

/* ADDED: a variant prop. The toggle now appears in two places with different
   shapes — a full-width row in the hamburger panel, and a compact control in
   the desktop header. A second copy of the component would be two things to
   keep in sync; one component with two presentations is one thing. */
export default function ThemeToggle({
  variant = "block",
}: {
  variant?: "block" | "inline";
}) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      /* CHANGED: role="switch" + aria-checked, replacing aria-pressed.
         The old version flipped BOTH the label and the state together, so a
         screen reader announced "Light theme, not pressed" — the name and the
         state contradicted each other. A switch needs a name that never moves
         (what it controls) and a state that does (whether it is on).
         The label is now always "Dark theme"; aria-checked says on or off. */
      role="switch"
      aria-checked={isDark}
      className={`flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${
        variant === "block" ? "w-full justify-between" : ""
      }`}
    >
      {/* The visible text and the accessible name are the same string, which is
          what WCAG 2.5.3 "Label in Name" asks for — a voice-control user saying
          "click Dark theme" hits the control they can see. */}
      <span>Dark theme</span>
      <span aria-hidden="true">{isDark ? "☾" : "☀"}</span>
    </button>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { navLinks } from "@/lib/siteConfig";
import ThemeToggle from "../theme/ThemeToggle";

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  // ADDED: wraps the button AND the panel, so "did the click land inside the
  // menu?" is a single containment check rather than two.
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsOpen(false);
      // Escape closed the menu, so focus must go somewhere deliberate.
      // Without this it falls to <body> and keyboard users lose their place.
      buttonRef.current?.focus();
    };

    /* ADDED: close on a click outside the menu. Escape alone was not enough —
       clicking away is what most people try first, and an open panel that
       ignores it feels broken.
       pointerdown, not click: it fires at the START of the interaction, so the
       menu is already closing as the finger goes down rather than after it
       lifts. */
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative lg:hidden">
      {/* ADDED: group + hover. The button had no hover state at all, so on
          desktop it was the one control that gave no feedback on mouseover.
          The bars are children, so they need group-hover to stay legible once
          the button background becomes the accent colour. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className="group flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-md border border-border transition-colors hover:bg-accent"
      >
        <span
          className={`block h-0.5 w-6 bg-foreground transition-all duration-300 group-hover:bg-accent-foreground ${
            isOpen ? "translate-y-2 rotate-45" : ""
          }`}
        />
        <span
          className={`block h-0.5 w-6 bg-foreground transition-all duration-300 group-hover:bg-accent-foreground ${
            isOpen ? "opacity-0" : ""
          }`}
        />
        <span
          className={`block h-0.5 w-6 bg-foreground transition-all duration-300 group-hover:bg-accent-foreground ${
            isOpen ? "-translate-y-2 -rotate-45" : ""
          }`}
        />
      </button>

      <div
        id="mobile-menu"
        inert={!isOpen}
        className={`absolute right-0 top-full z-20 mt-2 w-56 rounded-md border border-border bg-surface p-2 shadow-lg transition duration-200 ${
          isOpen ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        }`}
      >
        <nav aria-label="Mobile">
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block rounded-md px-3 py-2 text-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-2 border-t border-border pt-2">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
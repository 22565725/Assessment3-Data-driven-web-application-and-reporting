import Link from "next/link";
import HamburgerMenu from "@/Components/layout/HamburgerMenu";
import ThemeToggle from "@/Components/theme/ThemeToggle";
import { siteConfig, navLinks } from "@/lib/siteConfig";

export default function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 p-4">
        <Link
          href="/"
          className="font-semibold text-foreground hover:text-accent"
        >
          {siteConfig.assessmentTitle}
        </Link>

        <div className="flex items-center gap-2">
          {/* CHANGED: md:block → lg:block. HamburgerMenu hides itself at lg, so
              the full nav has to appear at exactly the same width. While these
              disagreed, every viewport between 768px and 1024px showed the nav
              AND the hamburger at the same time. One breakpoint, one source of
              truth for "is this a small screen". */}
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex flex-wrap gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="rounded-md px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* ADDED: the theme toggle previously lived ONLY inside the hamburger
              panel, which is hidden at lg — so desktop users had no way to change
              theme without navigating to Settings. Mirrors the nav's breakpoint,
              so exactly one of these two is on screen at any width. */}
          <div className="hidden lg:block">
            <ThemeToggle variant="inline" />
          </div>

          <HamburgerMenu />
        </div>
      </div>
    </header>
  );
}

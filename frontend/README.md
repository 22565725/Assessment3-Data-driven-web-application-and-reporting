# CSE5006 Assessment 1 — RSS Server & LMS Frontend

**Gizem Erel — 22565725**

A usability-focused React frontend for an RSS Server that will feed content into a Learning Management System.

Assessment 1 is **frontend only**. The blog-style posts on the Feeds page are sample content standing in for real RSS data, so the work concentrates on layout, navigation, visual design and usability. Assessment 2 adds the server component and live RSS feed processing.

---

## Running the project

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve the production build (run `build` first) |
| `npm run lint` | ESLint |

**Built with:** Next.js 16.2.11 (App Router), React 19.2.4, TypeScript, Tailwind CSS v4. No additional dependencies.

---

## Pages

| Route | Description |
| --- | --- |
| `/` | Introduction, the RSS-to-LMS workflow, links to every section, and a "latest in your feed" sidebar |
| `/about` | What the project is, confirmation that Assessment 1 is frontend only, the future RSS/LMS connection, student details and the video walkthrough |
| `/feeds` | Sample posts as cards or rows, with search, expandable summaries and read-more links |
| `/feeds/[id]` | Dynamic detail page for a single post |
| `/feeds/new` | Form for adding a post, saved to local storage |
| `/settings` | Light/dark theme, feed layout, image visibility, and clearing saved posts |

---

## Project structure

```
app/                       Routes (App Router) — a folder with page.tsx is a URL
  layout.tsx               Root layout: header, breadcrumbs, footer, theme provider
  globals.css              Colour palette, theme variables, focus styles
Components/
  feeds/                   FeedList, PostCard, PostDetail, NewPostForm, LatestFeeds
  layout/                  Header, Footer, HamburgerMenu
  navigation/              Breadcrumbs
  theme/                   ThemeProvider, ThemeToggle
data/posts.ts              Sample feed content (stand-in for RSS data)
hooks/useLocalStorage.ts   Reusable local storage hook
lib/siteConfig.ts          Site metadata and navigation links
lib/types.ts               The Post type
```

---

## Features

**Component architecture** — presentation is separated from data. `PostCard` renders one post, `FeedList` arranges many, `PostDetail` shows one in full. `PostCard` is reused across the grid and list layouts.

**State management** — `useState` for local UI state, React Context for the theme (avoiding prop drilling through the header into the menu), and a custom `useLocalStorage` hook shared by preferences and saved posts.

**Themes** — light and dark defined as CSS custom properties in `globals.css` and swapped by a `data-theme` attribute on `<html>`. Every colour pair was checked against WCAG: body text is 11.7:1 in light mode and 13.8:1 in dark, muted text 6.1:1 and 7.9:1, and the accent 5.8:1 and 8.2:1. All pass AA, most pass AAA. The choice persists in local storage.

**Responsive design** — the navigation bar collapses into an animated hamburger menu on narrow screens. The menu uses CSS transforms to morph three bars into a close icon. The Home sidebar stacks below the main content on small screens.

**Accessibility** — semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`), `aria-expanded` and `aria-controls` on the menu button, `inert` on the closed panel so keyboard users cannot tab into hidden links, Escape to close, `aria-current` on breadcrumbs, labelled form fields, `aria-live` on the result count, and a visible `:focus-visible` ring on every interactive element.

**Interactive views** — expand/collapse summaries, search filtering, dynamic post pages, breadcrumbs, layout switching, and posts created in the browser and persisted locally.

---

## Design decisions

**Sand and chocolate palette.** A warm neutral scheme rather than the default greys, chosen so the dark theme reads as a deliberate design rather than an inversion. Variables are named by role (`--background`, `--foreground`, `--muted`) rather than by colour, because sand is the page in light mode and the text in dark mode — role names survive the swap, colour names do not.

**A `data-theme` attribute instead of `prefers-color-scheme`.** A media query only reads the operating system setting and cannot be overridden from a button, which would have made a theme toggle impossible.

**Local storage rather than a cookie.** The theme is only needed in the browser, so there is no reason to send it with every request.

**Sample data separated from types.** `lib/types.ts` defines the `Post` shape and `data/posts.ts` supplies content. In Assessment 2 the source changes but the type does not, so the components need no modification.

---

## Trade-offs

- **Plain `<img>` rather than `next/image`.** Users can paste any image URL into the new-post form, and `next/image` requires every remote host to be whitelisted in advance. Optimisation was traded for the form working with arbitrary URLs.
- **Brief flash of the light theme on load.** The saved theme is applied after hydration, because local storage is unavailable during server rendering. Removing the flash needs a blocking inline script before first paint, which was left out for simplicity.
- **The container width is repeated on each page** rather than lifted into the root layout. This keeps pages independent but means a page can forget it.
- **Posts sort by id, not date.** Dates are stored as display strings and do not sort chronologically. Real timestamps arrive with Assessment 2.

---

## Improvements made to the lab example

The Feeds pages started from the Module 4 Part 2 blog workshop and were revised:

- The workshop read local storage during render, which fails during server rendering. Reading moved inside `useEffect`.
- Ids were generated with `data.length + 1`, which repeats after a deletion and breaks both React keys and detail-page lookups. Ids are now derived from the highest existing id.
- "Read more" wrapped a `<button>` inside a `<Link>`, so it navigated away before the expand could show, and nested interactive elements are invalid HTML. Expanding and navigating are now separate controls.
- Form fields had placeholders but no labels. Every field now has an associated `<label>`.

---

## Coming in Assessment 2

Server-side RSS handling: subscribing to feed URLs, polling and parsing them on a schedule, storing items, and passing content through to the LMS. This frontend is built to consume that data without redesign — only the source behind `data/posts.ts` changes.

---

## Repository

<https://github.com/22565725/cse5006-rss-lms-frontend>

Developed across feature branches (`feature/theme-and-layout`, `feature/post-detail`, `feature/footer`) merged into `main`.

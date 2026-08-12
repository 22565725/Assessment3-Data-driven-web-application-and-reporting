export const siteConfig = {
  assessmentTitle:
    "CSE5006 Assessment 2 — Backend Implementation, API and Database",
  shortTitle: "RSS → LMS",
  description:
    "A full-stack RSS server: a Next.js API backed by a Prisma-managed SQLite database, serving an RSS client built in Assessment 1. Both applications run in Docker on AWS EC2.",
  studentName: "Gizem Erel",
  studentId: "22565725",
  subject: "CSE5006 Assessment 2",

  // Repositories
  githubProfile: "https://github.com/22565725",
  githubBackend:
    "https://github.com/22565725/Backend-implementation-API-and-database",
  githubFrontend: "https://github.com/22565725/cse5006-rss-lms-frontend",

  // Assessment 2 walkthrough. The About page shows a placeholder while this
  // is blank and renders a video player once it is set.
  videoUrl: "/video/assessment2.mp4",
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/feeds", label: "Feeds" },
  { href: "/feeds/new", label: "New Post" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
] as const;

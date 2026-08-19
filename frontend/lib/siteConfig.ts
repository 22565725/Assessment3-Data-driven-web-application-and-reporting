export const siteConfig = {
  assessmentTitle:
    "CSE5006 Assessment 3 — Data-driven Web Application and Reporting",
  shortTitle: "RSS → LMS",
  description:
    "A full-stack RSS server: a Next.js API backed by a Prisma-managed SQLite database, publishing a standards-compliant RSS 2.0 feed and serving an RSS client built in Assessment 1. Both applications run in Docker on AWS EC2.",
  studentName: "Gizem Erel",
  studentId: "22565725",
  subject: "CSE5006 Assessment 3",

  // Repositories
  githubProfile: "https://github.com/22565725",
  githubAssessment3:
    "https://github.com/22565725/Assessment3-Data-driven-web-application-and-reporting",
  githubBackend:
    "https://github.com/22565725/Backend-implementation-API-and-database",
  githubFrontend: "https://github.com/22565725/cse5006-rss-lms-frontend",

  // The Assessment 2 walkthrough was removed from this repository - it
  // belongs to that submission and is still in the Assessment 2 repo. The
  // About page now explains the system in text instead, which also serves
  // as the speaking notes for the Assessment 3 recording.
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/feeds", label: "Feeds" },
  { href: "/feeds/new", label: "New Post" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
] as const;

export const siteConfig = {
  assessmentTitle: "CSE5006 Assessment 1 — RSS Server & LMS Frontend",
  shortTitle: "RSS → LMS",
  description:
    "A usability-focused Next.js and React frontend for an RSS Server feeding into a Learning Management System.",
  studentName: "Gizem Erel",
  studentId: "22565725",

  // Add the walkthrough video link when the recording is ready.
  videoUrl: "/video/walkthrough.mp4",
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/feeds", label: "Feeds" },
  { href: "/feeds/new", label: "New Post" },
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
] as const;
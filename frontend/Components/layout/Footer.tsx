import { siteConfig } from "@/lib/siteConfig";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 p-4 text-sm text-muted">
        <p>
          {siteConfig.studentName} · {siteConfig.studentId}
        </p>
        <p>{siteConfig.shortTitle}</p>
      </div>
    </footer>
  );
}
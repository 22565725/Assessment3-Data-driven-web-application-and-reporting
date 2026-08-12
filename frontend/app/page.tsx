import Link from "next/link";
import LatestFeeds from "@/Components/feeds/LatestFeeds";
import { siteConfig, navLinks } from "@/lib/siteConfig";

const workflow = [
  {
    step: "Sourced",
    detail:
      "Assessment 2 will subscribe to RSS feed URLs and poll them on a schedule for new items.",
  },
  {
    step: "Displayed",
    detail:
      "Each item becomes a card with a title, author, date and summary, built for quick scanning.",
  },
  {
    step: "Organised",
    detail:
      "Readers search, expand summaries, switch layouts and open full articles on their own pages.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-8">
          <section>
            <h1 className="mb-2 text-2xl font-semibold text-foreground">
              RSS Server for an LMS
            </h1>
            <p className="text-foreground">{siteConfig.description}</p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              How content reaches a student
            </h2>
            <ol className="flex flex-col gap-3">
              {workflow.map((item, index) => (
                <li
                  key={item.step}
                  className="rounded-md border border-border bg-surface p-4"
                >
                  <p className="font-medium text-foreground">
                    {index + 1}. {item.step}
                  </p>
                  <p className="text-sm text-muted">{item.detail}</p>
                </li>
              ))}
            </ol>
          </section>

          <nav aria-label="Site sections">
            <h2 className="mb-3 text-lg font-semibold text-foreground">
              Explore
            </h2>
            <ul className="flex flex-wrap gap-2">
              {navLinks
                .filter((link) => link.href !== "/")
                .map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block rounded-md border border-border px-3 py-2 text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </nav>
        </div>

        <LatestFeeds />
      </div>
    </main>
  );
}
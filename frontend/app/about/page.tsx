import { siteConfig } from "@/lib/siteConfig";
import ArchitectureDiagram from "@/Components/layout/ArchitectureDiagram";

const boxClass =
  "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4";

const linkClass =
  "text-accent underline underline-offset-4 hover:text-accent-hover break-all";

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 p-4">
      <h1 className="mb-4 text-2xl font-semibold text-foreground">About</h1>

      <div className="flex max-w-2xl flex-col gap-4">
        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            About this project
          </h2>
          <p className="text-foreground">{siteConfig.description}</p>
          <p className="text-foreground">
            Assessment 1 delivered the interface: layout, navigation, theming
            and usability, with sample content standing in for real RSS data.
          </p>
          <p className="text-foreground">
            Assessment 2 replaces that sample content with a real backend. An
            RSS Server exposes CRUD endpoints for feeds and posts over a
            relational schema managed by Prisma, alongside operational
            endpoints for health and request statistics. This interface now
            reads its content from that server rather than from a hardcoded
            array, and both applications are packaged as Docker containers.
          </p>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Publishing RSS
          </h2>
          <p className="text-foreground">
            Storing feed records and publishing a feed are different things.
            The database holds titles, authors, categories and publication
            dates; the RSS Server turns those rows back into an RSS 2.0 XML
            document that any external reader can subscribe to.
          </p>
          <p className="text-foreground">
            The feed is served at{" "}
            <code className="font-mono text-sm">/rss.xml</code>, with{" "}
            <code className="font-mono text-sm">/feed.xml</code> and{" "}
            <code className="font-mono text-sm">/api/rss</code> as aliases.
            Adding <code className="font-mono text-sm">?feedId=</code>{" "}
            republishes a single feed on its own, and the aggregate document
            covers every feed still marked active.
          </p>
          <p className="text-foreground">
            Because the document is consumed by software rather than by this
            interface, it is served as{" "}
            <code className="font-mono text-sm">application/rss+xml</code>{" "}
            rather than JSON, dates are written in the RFC-822 form the
            specification requires, and article bodies are wrapped in CDATA
            so their HTML survives intact.
          </p>
          <p className="text-foreground">
            Every page also carries a{" "}
            <code className="font-mono text-sm">link rel="alternate"</code>{" "}
            tag pointing at the feed, which is how a browser extension or
            reader discovers it without being told the address.
          </p>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            How it works
          </h2>
          <ArchitectureDiagram />
          <p className="text-foreground">
            The RSS Client and the RSS Server are separate applications in
            separate containers. The client holds no data of its own — every
            post on the Feeds page is fetched from the server, which reads it
            from SQLite through Prisma.
          </p>
          <p className="text-foreground">
            Because the page is served from port 80 and the data from port
            4080, the browser treats them as different origins and would
            discard the response without the CORS headers the server sends on
            every route.
          </p>
          <p className="text-foreground">
            The database file lives on a named Docker volume rather than inside
            the container. A container filesystem is disposable, so without
            that volume every rebuild would silently destroy the data.
          </p>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Student details
          </h2>
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-foreground">
            <dt className="text-muted">Name</dt>
            <dd>{siteConfig.studentName}</dd>
            <dt className="text-muted">Student number</dt>
            <dd>{siteConfig.studentId}</dd>
            <dt className="text-muted">Subject</dt>
            <dd>{siteConfig.subject}</dd>
          </dl>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Source code
          </h2>
          <p className="text-muted">
            Both repositories are public on GitHub.
          </p>
          <dl className="flex flex-col gap-3 text-foreground">
            <div className="flex flex-col gap-1">
              <dt className="text-muted">GitHub profile</dt>
              <dd>
                <a
                  href={siteConfig.githubProfile}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {siteConfig.githubProfile}
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted">
                Assessment 3 — this project
              </dt>
              <dd>
                <a
                  href={siteConfig.githubAssessment3}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {siteConfig.githubAssessment3}
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted">
                Assessment 2 — backend, API and database
              </dt>
              <dd>
                <a
                  href={siteConfig.githubBackend}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {siteConfig.githubBackend}
                </a>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="text-muted">Assessment 1 — frontend</dt>
              <dd>
                <a
                  href={siteConfig.githubFrontend}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {siteConfig.githubFrontend}
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            What Assessment 3 added
          </h2>
          <p className="text-muted">
            Assessment 2 stored and served RSS data. Assessment 3 makes the
            running system observable and measurable.
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-foreground">
            <li>
              <strong>A published RSS feed.</strong> The server now generates
              real RSS 2.0 XML at{" "}
              <code className="font-mono text-sm">/rss.xml</code>, so an
              external reader can subscribe. Previously it only stored
              feed-shaped records.
            </li>
            <li>
              <strong>Every request is recorded.</strong> One database row per
              request — path, status, duration, which client, which feed. The
              dashboard computes every figure from those rows, so nothing is
              hardcoded and the numbers survive a restart.
            </li>
            <li>
              <strong>Clients counted without being identified.</strong> A
              caller&apos;s key is used if sent, otherwise a salted hash of the
              IP. Distinct callers can be counted without storing who they are.
            </li>
            <li>
              <strong>Alerts derived from data.</strong> Empty feeds, stale
              feeds, rejected payloads and server errors are detected on read,
              not configured, so the panel always reflects the real state.
            </li>
            <li>
              <strong>Simulated input records.</strong> The extra feeds and
              clients here are generated data, covering every feed state so the
              reporting views have something to report. Seeded, so the same
              command reproduces the same figures.
            </li>
            <li>
              <strong>Tested under load and for accessibility.</strong>{" "}
              Playwright, JMeter and Lighthouse — reports below.
            </li>
          </ul>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Test reports
          </h2>
          <p className="text-muted">
            Generated against this deployment. Empty until the test suites have
            been run and collected.
          </p>
          <ul className="flex flex-col gap-2">
            <li>
              <a
                href="/reports/playwright/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                Playwright — 18 end-to-end tests
              </a>
              <span className="block text-sm text-muted">
                Server CRUD, client feed viewing, and assertions that the
                dashboard figures actually move.
              </span>
            </li>
            <li>
              <a
                href="/reports/jmeter/index.html"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                JMeter — staged load test
              </a>
              <span className="block text-sm text-muted">
                1 to 10,000 simulated clients across the client page, API,
                published feed and health endpoint.
              </span>
            </li>
          </ul>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Reading the Lighthouse report
          </h2>
          <p className="text-foreground">
            Lighthouse scores accessibility out of 100, but the score is a
            summary — the value is in the failed audits underneath it.
          </p>
          <ul className="flex list-disc flex-col gap-2 pl-5 text-foreground">
            <li>
              <strong>Contrast</strong> checks text against its background.
              Colours here were measured rather than judged by eye, at 7:1 or
              better in both light and dark themes.
            </li>
            <li>
              <strong>Names and labels</strong> checks that controls and images
              say what they are. The traffic chart carries a text description
              of its own shape for that reason.
            </li>
            <li>
              <strong>ARIA</strong> checks that state is announced, not only
              shown. Health changes here use a live region so a screen reader
              hears them.
            </li>
            <li>
              <strong>What it cannot check:</strong> that meaning survives
              without colour. Status chips spell out Healthy, Stale, Empty or
              Paused precisely because an automated audit would pass a
              colour-only design.
            </li>
          </ul>
          <p className="text-muted">
            A perfect score is not the goal. Understanding which failures matter
            for this interface is.
          </p>
        </section>

      </div>
    </main>
  );
}

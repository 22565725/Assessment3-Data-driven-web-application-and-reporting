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
            Where the dashboard data comes from
          </h2>
          <p className="text-foreground">
            Every figure on the dashboard is read from the database when the
            page refreshes. Nothing is hardcoded, and nothing is calculated in
            the browser.
          </p>
          <p className="text-foreground">
            The feeds listed there — university news, library workshops, a
            cloud reading list, student union notices — are{" "}
            <strong>simulated input records</strong>, required by Assessment 3.
            They represent the sources a Learning Management System would
            realistically aggregate, and they exist because two feeds in
            identical states cannot demonstrate reporting. With only the
            original feeds, every status chip would read the same, the traffic
            chart would be a flat line, and the alert panel would have nothing
            to say.
          </p>
          <p className="text-foreground">
            So the simulated feeds are chosen to cover every state the system
            can detect: one healthy, one never refreshed, one active but with
            no posts, and one deliberately paused. The paused feed is as
            important as the others — it checks that a feed someone switched
            off does <em>not</em> raise a warning.
          </p>
          <p className="text-foreground">
            The client names are simulated the same way. A real deployment
            would be called by a portal, a mobile app, a feed reader and a
            campus screen, so those are the callers in the data. One request in
            five carries no client header at all and is identified by a hash of
            its IP address instead, which is how anonymous browsers appear.
          </p>
          <p className="text-muted">
            Generated by <code className="font-mono text-sm">prisma/simulate.mjs</code>{" "}
            using a seeded random number generator, so the same command always
            produces the same figures. That is deliberate: a screenshot taken
            today can be reproduced tomorrow.
          </p>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Operational metrics
          </h2>
          <p className="text-foreground">
            The server writes one row to a request log for every request it
            handles — method, path, status, duration, which client called, and
            which feed the request concerned. Every dashboard number is
            calculated from those rows.
          </p>
          <p className="text-foreground">
            A counter held in memory would have been simpler, and wrong: it
            resets to zero whenever the container restarts, and would report a
            different number from each copy of the server. Storing each request
            means the figures survive a rebuild and can be re-examined later.
          </p>
          <p className="text-foreground">
            Clients are identified without storing who they are. If a caller
            sends a client key it is used; otherwise the IP address is hashed
            with a salt. An IP address is personal data, and counting distinct
            callers never requires knowing their identity — only whether two
            requests came from the same one. This is also what makes load
            testing meaningful: JMeter runs from a single machine, so without
            per-client keys ten thousand simulated users would collapse into
            one.
          </p>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Alerts and feed status
          </h2>
          <p className="text-foreground">
            Feed status is worked out when the dashboard is read, not stored:
            paused when switched off, empty when it has no posts, stale when it
            has not been fetched for a day, healthy otherwise. Checked in that
            order, so a paused feed with no posts is reported as paused — the
            fact somebody actually acted on.
          </p>
          <p className="text-foreground">
            Alerts are derived from the same data rather than configured, so
            the panel always describes the system as it is. An unreachable
            database or a server error is critical; rejected payloads, empty
            feeds and stale feeds are warnings. Total silence is reported too,
            because without it an idle server and a healthy one look identical.
          </p>
        </section>

        <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            How this was tested
          </h2>
          <p className="text-foreground">
            <strong>Playwright</strong> runs eighteen end-to-end tests against
            the deployed application rather than a development build. They
            cover the server case — creating, reading, updating and deleting a
            feed over HTTP — and the client case, a real browser loading the
            Feeds page and opening a post. A third group proves the dashboard
            is data-driven by generating traffic and asserting the numbers
            moved, which a dashboard of hardcoded figures would fail.
          </p>
          <p className="text-foreground">
            <strong>JMeter</strong> applies staged load — 1, 10, 100, 1000 and
            10000 simulated clients — across the client page, the API, the
            published feed and the health endpoint. Each virtual user sends its
            own client key so the unique-client metric responds to the load
            rather than reporting one caller.
          </p>
          <p className="text-foreground">
            <strong>Lighthouse</strong> audits accessibility. Several decisions
            here were made before any audit: status is carried by the word as
            well as the colour, so the page survives greyscale and colour
            vision deficiency; health changes are announced to screen readers;
            the traffic chart carries a text description of its own shape; and
            colour contrast was measured rather than judged by eye, at 7:1 or
            better in both light and dark themes.
          </p>
        </section>

      </div>
    </main>
  );
}

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
            Video walkthrough
          </h2>
          <p className="text-muted">
            A short walkthrough of the Assessment 2 backend: the database
            schema, the CRUD and operational endpoints, and both applications
            running in Docker.
          </p>
          {siteConfig.videoUrl ? (
            <video
              controls
              preload="metadata"
              className="aspect-video w-full rounded-md border border-border"
            >
              <source src={siteConfig.videoUrl} type="video/mp4" />
              Your browser cannot play this video.
            </video>
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed border-border">
              <p className="text-muted">Video coming soon</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

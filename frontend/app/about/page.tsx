import { siteConfig } from "@/lib/siteConfig";

const boxClass = "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4";

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
            Assessment 1 is the frontend only. The blog-style posts shown on the
            Feeds page are sample content standing in for real RSS data, so the
            focus stays on layout, navigation, visual design and usability.
          </p>
          <p className="text-foreground">
            Assessment 2 adds the server component: it will subscribe to RSS feed
            URLs, poll them for new items, and pass that content through to a
            Learning Management System so enrolled students receive updates
            automatically. This interface is built to plug into that work
            without redesign.
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
            <dd>CSE5006 Assessment 1</dd>
          </dl>
        </section>

         <section className={boxClass}>
          <h2 className="text-lg font-semibold text-foreground">
            Video walkthrough
          </h2>
          <p className="text-muted">
            A short walkthrough showing how to navigate the site, switch themes
            and add a post.
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
/**
 * Architecture diagram for the About page.
 *
 * Drawn as inline SVG using currentColor, so it inherits the page's
 * foreground colour and works in both the light and dark themes without a
 * second copy.
 */
export default function ArchitectureDiagram() {
  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-md border border-border bg-background p-4">
        <svg
          viewBox="0 0 880 300"
          role="img"
          aria-label="A browser loads the RSS Client on port 80; the client fetches JSON from the RSS Server on port 4080; the server queries SQLite on a Docker volume through Prisma, and writes one row per request into a request log table."
          className="mx-auto h-auto w-full min-w-[640px] text-foreground"
        >
          <defs>
            <marker id="arch-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>

          <rect x="16" y="100" width="120" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <text x="76" y="126" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">Browser</text>
          <text x="76" y="144" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.62">the reader</text>

          <rect x="232" y="100" width="150" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <text x="307" y="126" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">RSS Client</text>
          <text x="307" y="144" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.62">port 80</text>

          <rect x="478" y="100" width="160" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <text x="558" y="126" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">RSS Server</text>
          <text x="558" y="144" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.62">port 4080</text>

          <rect x="734" y="100" width="130" height="64" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <text x="799" y="126" textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">SQLite</text>
          <text x="799" y="144" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.62">on a volume</text>

          <line x1="140" y1="132" x2="226" y2="132" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#arch-arrow)" />
          <text x="183" y="122" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.75">loads UI</text>

          <line x1="386" y1="132" x2="472" y2="132" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#arch-arrow)" />
          <text x="429" y="122" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.75">fetch JSON</text>
          <text x="429" y="182" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.55">cross-origin</text>

          <line x1="642" y1="132" x2="728" y2="132" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#arch-arrow)" />
          <text x="685" y="122" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.75">Prisma</text>

          <line x1="558" y1="168" x2="558" y2="214" stroke="currentColor" strokeWidth="1.4" markerEnd="url(#arch-arrow)" />
          <text x="572" y="196" fontSize="11" fill="currentColor" opacity="0.75">logs every request</text>

          <rect x="478" y="216" width="160" height="52" rx="3" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
          <text x="558" y="238" textAnchor="middle" fontSize="12" fontWeight="600" fill="currentColor">request_logs</text>
          <text x="558" y="255" textAnchor="middle" fontSize="10.5" fill="currentColor" opacity="0.62">feeds /count</text>
        </svg>
      </div>
      <figcaption className="text-sm text-muted">
        Two applications in two Docker containers, talking over HTTP. Every
        request is recorded before the response is returned, which is what
        makes the request count survive a restart.
      </figcaption>
    </figure>
  );
}

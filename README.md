# RSS Server — Data-driven Web Application and Reporting

CSE5006 Assessment 3 · Gizem Erel · 22565725

An RSS aggregation server for a Learning Management System. Feeds, posts,
authors and categories are stored in SQLite through Prisma, **published as a
standards-compliant RSS 2.0 feed**, and served over a REST API which a
separate Next.js client consumes. Both applications run as Docker containers.

This builds directly on the earlier assessments. Assessment 1 delivered the
interface with hardcoded sample data. Assessment 2 replaced that data source
with a real backend, API and database. Assessment 3 adds the published feed,
a typed validation layer, and the dashboard and reporting work.

---

## Architecture

Two independent Next.js applications that communicate only over HTTP.

```
Browser
   │
   ├──► RSS Client   port 80    Next.js UI (the Assessment 1 interface)
   │         │
   │         │  fetch() — cross-origin, hence CORS headers
   │         ▼
   └──► RSS Server   port 4080  Next.js route handlers
                │
                ├──► Prisma ORM ──► SQLite  (on a named Docker volume)
                │
                └──► request_logs table  (feeds GET /count)
```

| Service | Role | Container | Host port |
|---|---|---|---|
| `frontend` | RSS Client — UI only, no API routes | `rss-client` | 80 |
| `api` | RSS Server — API routes, Prisma, SQLite | `rss-server-api` | 4080 |

The database file lives on a **named volume** (`sqlite_data`), not inside the
container. A container filesystem is disposable; without the volume every
rebuild would destroy the data.

---

## Tech stack

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16 |
| UI | React, Tailwind CSS | 19 / 4 |
| Language | TypeScript | 5 |
| ORM | Prisma | 6.19.3 |
| Database | SQLite | — |
| Containers | Docker + docker-compose | — |
| Host | AWS EC2 (Amazon Linux 2023, t3.micro) | — |

---

## Repository layout

```
.
├── api/                        RSS Server
│   ├── app/
│   │   ├── api/
│   │   │   ├── feeds/route.ts    CRUD for feeds
│   │   │   ├── posts/route.ts    CRUD for posts
│   │   │   ├── health/route.ts   liveness + database probe
│   │   │   └── count/route.ts    request and content statistics
│   │   └── page.tsx              self-documenting API reference page
│   ├── lib/
│   │   ├── prisma.ts             single PrismaClient instance
│   │   └── http.ts               response envelope, CORS, logging, errors
│   ├── prisma/
│   │   ├── schema.prisma         the data model
│   │   ├── migrations/           generated SQL, committed
│   │   └── seed.mjs              idempotent seed data
│   ├── Dockerfile                multi-stage production build
│   └── entrypoint.sh             migrate, seed, then start
│
├── frontend/                   RSS Client (extends Assessment 1)
│   ├── app/
│   │   ├── feeds/                list, detail, new, edit
│   │   ├── about/                project info and architecture diagram
│   │   └── settings/             display preferences
│   ├── Components/               PostCard, FeedList, PostForm, layout
│   ├── lib/
│   │   ├── api.ts                the only module that talks to the server
│   │   └── dates.ts              Australian date formatting
│   └── Dockerfile
│
└── docker-compose.yml          both services, ports and the volume
```

---

## Quick start

Requires Docker with the Compose plugin (`docker compose`, v2).

```bash
git clone https://github.com/22565725/Assessment3-Data-driven-web-application-and-reporting.git
cd Assessment3-Data-driven-web-application-and-reporting
docker compose up --build -d
```

Then:

- RSS Client — <http://localhost>
- RSS Server — <http://localhost:4080>

No manual database setup is needed. `entrypoint.sh` applies migrations and
runs the seed on container start, so a fresh volume becomes a working
database automatically.

Useful commands:

```bash
docker ps                            # both containers should be Up
docker compose logs api              # watch migrations run at startup
docker exec rss-server-api node prisma/seed.mjs   # restore the seed data
docker compose down                  # stop (the volume survives)
docker compose down -v               # stop AND delete the database
```

### Running on AWS EC2

Open inbound TCP **22**, **80** and **4080** in the security group, then
follow the same steps. On a t3.micro, create swap **before** building — a
Next.js production build exhausts 913 MB of RAM and the instance will hang:

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

The client derives the API host from `window.location`, so a new public IP
after a stop/start needs no configuration change or rebuild.

---

## Running without Docker

```bash
# RSS Server
cd api
npm install
npx prisma migrate dev
npm run db:seed
npm run dev            # http://localhost:3000

# RSS Client, in a second terminal
cd frontend
npm install
npm run dev -- -p 3001 # http://localhost:3001
```

`api/.env` sets `DATABASE_URL="file:../sqlite/dev.db"`. It is committed
deliberately: it contains a file path and no credentials, so the project runs
straight after cloning.

API scripts:

| Command | Purpose |
|---|---|
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:deploy` | Apply existing migrations (used in the container) |
| `npm run db:seed` | Load seed data — safe to run repeatedly |
| `npm run db:studio` | Browse the database in Prisma Studio |

---

## Database schema

Five models. The first four hold content; `RequestLog` holds operational
telemetry.

```
Feed 1───* Post *───1 Author
             *
             │
             *
         Category
```

### Feed
A subscribed RSS source. `url` is unique, so the same feed cannot be
subscribed twice. `active` allows a feed to be paused without deleting its
posts. `lastFetchedAt` supports stale-feed alerting in Assessment 3.

### Author
The person credited with a post, keyed on a unique `name`. Separated from
`Post` so that correcting an author's name updates every one of their posts,
rather than leaving copies of a string scattered across rows.

### Post
Title, summary, full content, canonical link, image and publication date.
`guid` maps to the RSS `<guid>` element and is unique, so re-importing a feed
updates existing rows instead of duplicating them. `publishedAt` (when the
article was published) is deliberately distinct from `createdAt` (when this
server first stored it).

### Category
Tag or topic, many-to-many with `Post`. SQLite supports Prisma's implicit
many-to-many, so no join table is hand-written.

### RequestLog
One row per API request: method, path, status code and duration. This is what
`GET /count` reads.

### Relationship decisions

| Relation | Behaviour | Reasoning |
|---|---|---|
| `Feed` → `Post` | `onDelete: Cascade` | A post that belongs to no feed has no meaning |
| `Author` → `Post` | `onDelete: SetNull` | Removing a person should never destroy their content |

### SQLite constraints worth noting

Prisma `enum` is not supported on SQLite, so constrained fields are modelled
as `String` and validated in the API layer instead.

---

## API reference

Base URL: `http://<host>:4080`. The server also serves a live, self-documenting
reference page at its root.

### Response envelope

Every endpoint returns one of two shapes, so the client checks a single field:

```jsonc
{ "success": true,  "data": { }, "meta": { "count": 7 } }
{ "success": false, "error": { "message": "Feed 9 not found" } }
```

### CRUD

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/feeds` | All feeds, each with a post count |
| GET | `/api/feeds?id=1` | One feed, including its posts |
| POST | `/api/feeds` | Create — requires `title`, `url` |
| PATCH | `/api/feeds?id=1` | Partial update |
| DELETE | `/api/feeds?id=1` | Delete, cascading to its posts |
| GET | `/api/posts` | All posts, newest first, with relations |
| GET | `/api/posts?id=1` | One post |
| GET | `/api/posts?feedId=2` | Posts belonging to one feed |
| GET | `/api/posts?limit=5` | Cap the number returned |
| POST | `/api/posts` | Create — requires `title`, `feedId` |
| PATCH | `/api/posts?id=1` | Partial update |
| DELETE | `/api/posts?id=1` | Delete |

Single-record operations use a query string (`?id=1`) rather than a dynamic
`[id]` segment, matching the Workshop 5 and 7 convention.

`POST /api/posts` accepts an author **name** and category **names** rather
than ids. Prisma's `connectOrCreate` resolves or creates them, which removes a
read-then-write round trip from the client.

### The published RSS feed

This is the endpoint that makes the project an RSS *server* rather than a
database of RSS-shaped records. Everything else here answers our own client
in JSON; this answers anybody's feed reader in XML.

| Method | Path | Purpose |
|---|---|---|
| GET | `/rss.xml`, `/feed.xml` or `/api/rss` | RSS 2.0 document, all active feeds |
| GET | `/rss.xml?feedId=1` | One feed republished as its own channel |
| GET | `/rss.xml?limit=20` | Cap the number of items (default 50, max 200) |

Served as `application/rss+xml`, not JSON, and cached for five minutes —
readers poll on a timer, and without a cache window every subscriber would
hit the database on every poll.

Three namespaced extensions cover what RSS 2.0 itself cannot express:

| Namespace | Element | Why it is needed |
|---|---|---|
| `atom:` | `<atom:link rel="self">` | RSS has no way for a document to state its own URL, and validators warn without it |
| `dc:` | `<dc:creator>` | RSS `<author>` is *required* to contain an email address, so a display-name-only author would produce an invalid feed |
| `media:` | `<media:content>` | `<enclosure>` requires a byte length we cannot know without fetching every image |

Other correctness details: article bodies are wrapped in CDATA so their HTML
survives, with any `]]>` split across two sections; control characters are
stripped, because a single `0x00` makes the whole document unparseable and a
reader drops the entire feed rather than one item; `pubDate` uses RFC-822 via
`toUTCString`, which is specified to emit English regardless of the
container's locale; and `isPermaLink` is only `true` when the guid *is* the
item's link, since a URL-shaped identifier that resolves to nothing would
send readers to a 404.

The RSS Client advertises the feed with a `<link rel="alternate">` tag on
every page, which is how a browser extension or reader discovers it without
being given the address.

### Operational

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` or `/api/health` | Queries SQLite; returns **503** if unreachable |
| GET | `/count` or `/api/count` | Request totals, per-endpoint breakdown, content counts |

`/health` runs an actual `SELECT 1`. A health check that returns a hardcoded
`{"status":"ok"}` will report healthy while the database is gone and every
real request is failing.

`/count` reads from the `RequestLog` table rather than an in-memory counter,
so the figure survives a restart or container rebuild and would be consistent
across multiple replicas.

### Request validation

Every write endpoint validates its payload against a typed schema in
`api/lib/validation.ts` before touching the database. Assessment 2 checked
payloads inline with a `missingFields()` helper that only answered "is this
key present?", so `url: "not-a-url"` or `publishedAt: "yesterday"` would be
stored happily. That matters far more now the same records are published as
XML that external parsers consume.

| Rule | Effect |
|---|---|
| URLs must parse **and** be http(s) | Blocks `javascript:` and `file:` |
| Dates must be parseable | Rejects `"yesterday"`; schema outputs a real `Date` |
| Lengths bounded | Title 300, description 5 000, content 100 000 |
| Unknown keys rejected | A misspelled `discription` is reported, not silently dropped |
| Blank means null | `""` from a cleared form and `null` from the client normalise together |

Failures return **400** with one entry per offending field, so the client can
mark the specific input rather than showing a single vague message:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [{ "field": "link", "message": "link must be an absolute http:// or https:// URL" }]
  }
}
```

DTO types are inferred from the schemas with `z.infer`, so the TypeScript
type and the runtime check cannot drift apart — which a hand-written
interface plus a hand-written check cannot guarantee.

### Status codes

| Code | Meaning |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Missing or malformed field |
| 404 | No record with that id |
| 409 | Conflict — that feed URL is already subscribed |
| 500 | Server error |
| 503 | API is up but the database is not |

Prisma error codes are translated into these: `P2002` becomes 409, `P2025`
becomes 404, `P2003` becomes 400. Without that mapping a duplicate feed URL
would surface as a 500 — "the server broke" — when it is in fact a client
error.

### Examples

```bash
# Read
curl -s http://localhost:4080/api/feeds

# Create
curl -X POST http://localhost:4080/api/feeds \
  -H "Content-Type: application/json" \
  -d '{"title":"ABC News","url":"https://abc.net.au/news/feed.xml"}'

# Update
curl -X PATCH "http://localhost:4080/api/posts?id=1" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated title"}'

# Delete
curl -X DELETE "http://localhost:4080/api/posts?id=1"

# Operational
curl -s http://localhost:4080/health
curl -s http://localhost:4080/count
```

PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:4080/api/feeds" -Method Get

$body = '{"title":"New article","feedId":1,"author":"Gizem Erel"}'
Invoke-RestMethod -Uri "http://localhost:4080/api/posts" -Method Post `
  -Body $body -ContentType "application/json"
```

---

## Frontend integration

The Assessment 1 interface now reads everything from the API.

- `lib/api.ts` is the only module that talks to the server — base URL,
  response envelope and error handling in one place.
- `toDisplayPost()` adapts nested database records (`author.name`,
  `publishedAt`) to the flat `Post` type the Assessment 1 components already
  expected. **`PostCard` and `FeedList` were not rewritten**; they simply
  receive database rows instead of a hardcoded array.
- `app/feeds/page.tsx` changed from `import { posts } from "@/data/posts"` to
  a `fetch`.
- Create, edit and delete are all available from the interface and issue real
  POST, PATCH and DELETE requests.

`localStorage` is still used — but only for theme, layout and image
visibility. Those are per-browser **preferences**, not content, and have no
business on a server.

---

## Design decisions

| Decision | Reasoning |
|---|---|
| Two applications, not one | The brief asks for an RSS Server serving an RSS Client; two containers make that a real boundary, and match the Workshop 7 architecture |
| SQLite over PostgreSQL | Removes a container, `wait-for-it.sh`, and the start-migrate-stop-build sequence from Workshop 7 Part 2 |
| Prisma 6.19.3, not 7.x | Prisma 7 on SQLite requires the `better-sqlite3` driver adapter, a native module needing `python3`, `make` and `g++` in the image |
| Query strings over dynamic routes | Matches the workshop convention, and avoids Next.js 16 making `params` async |
| `/count` reads a table | An in-memory counter resets on restart and differs per replica |
| `/health` queries the database | Otherwise it reports healthy while the database is unreachable |
| Named volume for SQLite | Container filesystems are disposable |
| Client derives the API host | AWS Academy reassigns the public IP on every stop/start; a value compiled into the bundle would need a rebuild each time |
| `.env` is committed | It holds a file path, not credentials, so the repo runs after a clone |

---

## Known limitations

Stated deliberately rather than hidden.

- **SQLite allows one writer at a time.** Fine for this workload; a bottleneck
  under real concurrency. PostgreSQL would be the production choice.
- **CORS is `Access-Control-Allow-Origin: *`.** Appropriate for an assessment
  demo; production should name the specific origin.
- **No authentication.** Every endpoint is public. Assessment 3 would add
  authentication before any write endpoint faced the internet.
- **Containers run as root.** A production image should create and use an
  unprivileged user.
- **No TLS.** Production would terminate HTTPS at a reverse proxy.
- **No Docker `HEALTHCHECK` directive.** `/api/health` exists and returns the
  right status codes; wiring it into the container definition so the
  orchestrator restarts a sick container is a small next step.

---

## Assessment criteria

| Criterion | Where to find it |
|---|---|
| Database schema and ORM | `api/prisma/schema.prisma`, generated SQL in `api/prisma/migrations/` |
| CRUD endpoints | `api/app/api/feeds/route.ts`, `api/app/api/posts/route.ts` |
| Operational endpoints | `api/app/api/health/route.ts`, `api/app/api/count/route.ts` |
| Dockerise | `api/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml`, `api/entrypoint.sh` |
| Frontend–backend integration | `frontend/lib/api.ts`, `frontend/app/feeds/`, `frontend/Components/feeds/` |
| Code quality and GitHub | Feature branches merged into a clean `main`; no `node_modules`; shared helpers in `api/lib/http.ts` |

---

## Author

**Gizem Erel** — 22565725
CSE5006 Web Development, La Trobe University

- Assessment 2 (this repository): <https://github.com/22565725/Backend-implementation-API-and-database>
- Assessment 1 (frontend): <https://github.com/22565725/cse5006-rss-lms-frontend>

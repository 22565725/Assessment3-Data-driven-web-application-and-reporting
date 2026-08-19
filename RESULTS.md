# Test results

CSE5006 Assessment 3 · Gizem Erel · 22565725

Results from Playwright, JMeter and Lighthouse, run against the deployed
application on AWS EC2.

> **Fill in the bracketed values from your own runs.** Every number below must
> come from an actual result. Do not carry over an example figure — a
> fabricated measurement is worse than an honest gap.

---

## Environment

| | |
|---|---|
| Host | AWS EC2, Amazon Linux 2023, t3.micro (1 vCPU, 913 MB, 4 GB swap) |
| Client | `http://<public-ip>` — port 80 |
| API | `http://<public-ip>:4080` |
| Deployment | Docker Compose, SQLite on a named volume |
| Commit tested | `[git rev-parse --short HEAD]` |
| Date | `[date]` |

Because a t3.micro has a single shared vCPU, the higher load levels measure the
**instance and the load generator** as much as the application. That is noted
where it applies rather than glossed over.

---

## 1. Playwright — end-to-end tests

**Command**

```bash
./run-e2e.sh
```

**Result:** `[18] passed, [0] failed` in `[N]s`

### Coverage

| Spec | Use case | Tests | What it proves |
|---|---|---|---|
| `server-crud.spec.ts` | **Server** | 8 | Full CRUD on a feed over HTTP; 409 on duplicate URL; 400 with the offending field named; delete cascades to posts; feed publishes as RSS 2.0 with RFC-822 dates |
| `client-feed.spec.ts` | **Client** | 6 | Browser loads the Feeds page and opens a post; subscribe link and autodiscovery tag present; feed parses as valid RSS; `/health` returns 200 |
| `dashboard-metrics.spec.ts` | Observability | 4 | Every required metric is exposed; a new client is counted; traffic is attributed to the right feed; the dashboard renders live values |

The suite runs against the **deployed** application rather than a development
build, so it verifies the system as actually running. The client tests drive a
real browser, which exercises the cross-origin fetch from browser to API — a
server-side test would not notice if CORS broke.

### Notes

`[Anything that failed and why, or "All tests passed on the first run."]`

---

## 2. JMeter — staged load testing

**Command**

```bash
./jmeter/run-load-tests.sh 1 10 100 1000
./jmeter/summarise.sh
```

Four endpoints per iteration: the client `/feeds` page, `/api/posts`,
`/rss.xml`, and `/health`. Each virtual user sends a distinct `X-Client-Id`
header — without it every simulated client would share one IP and the
unique-client metric would report 1 regardless of load.

### Results

| Level | Samples | Errors | Err % | Avg ms | P90 ms | P95 ms | Req/sec |
|---|---|---|---|---|---|---|---|
| x1 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| x10 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| x100 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| x1000 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| x10000 | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

### How the system behaves as load increases

**Throughput.** `[Rises roughly linearly to x___, then flattens at about ___
requests per second. That plateau is saturation — beyond it, adding clients
adds queue depth, not work completed.]`

**Errors.** `[Zero through x___. First errors appear at x___, at ___%.
They were mostly ___ — connection timeouts / 5xx / assertion failures.]`

**Latency.** `[Average went from ___ms at x1 to ___ms at x___. The 95th
percentile rose faster than the average, which indicates queueing rather than
individual requests becoming slower.]`

**Where the limit actually is.** `[State honestly which component saturated:
the application, the single shared vCPU, memory, or JMeter itself. At the
highest levels the load generator and the instance are the constraint, not the
application code.]`

### Notes

`[Any level that did not complete, and why.]`

---

## 3. Lighthouse — accessibility

Run in Chrome DevTools → Lighthouse → Accessibility, against the deployed site.

### Scores

| Page | Before | After |
|---|---|---|
| Home `/` | `[ ]` | `[ ]` |
| Feeds `/feeds` | `[ ]` | `[ ]` |
| Dashboard `/dashboard` | `[ ]` | `[ ]` |

### Decisions made before the audit

These were design choices, not fixes prompted by the report:

- **Contrast measured, not judged.** Status colours were calculated against
  their backgrounds, at 7:1 or better in both light and dark themes.
- **State carried by the word, not only colour.** Status chips read "Healthy",
  "Stale", "Empty", "Paused". An automated audit cannot detect a colour-only
  design, but such a design is unreadable to a colour-blind user and in any
  greyscale printout.
- **Health changes announced.** The banner is a live region, so a screen
  reader hears a state change rather than only sighted users seeing it.
- **The chart describes itself.** The traffic graph carries a text description
  of its shape and totals, so it is not merely a picture.
- **Tables use real table semantics** with row and column headers, rather than
  divs styled to look like a grid.

### Changes made after reading the report

`[List each failed audit and what you changed. If the score was already high,
say which of the choices above prevented the common failures — that is a
stronger answer than a list of last-minute patches.]`

### How the results influenced the design

`[Two or three sentences. What did the report make you reconsider?]`

---

## Reproducing these results

```bash
# 1. Deploy
git pull && docker compose up --build -d

# 2. Populate with simulated records (seeded, so figures are reproducible)
docker exec rss-server-api node prisma/simulate.mjs --reset

# 3. End-to-end tests
./run-e2e.sh

# 4. Load tests
./jmeter/run-load-tests.sh 1 10 100 1000
./jmeter/summarise.sh

# 5. Publish the reports to the About page
./collect-reports.sh
```

Reports are then served at `/reports/playwright/index.html` and
`/reports/jmeter/index.html`, linked from the About page.

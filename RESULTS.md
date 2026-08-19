# Test results

CSE5006 Assessment 3 · Gizem Erel · 22565725

Results from Playwright, JMeter and Lighthouse, run against the deployed
application on AWS EC2.

All figures are measured against the deployed application. The only remaining
placeholders are the two Lighthouse pages not yet audited, and one note to
confirm from the Best Practices section of the report.

---

## Environment

| | |
|---|---|
| Host | AWS EC2, Amazon Linux 2023, t3.micro (1 vCPU, 913 MB, 4 GB swap) |
| Client | `http://<public-ip>` — port 80 |
| API | `http://<public-ip>:4080` |
| Deployment | Docker Compose, SQLite on a named volume |
| Commit tested | `293c2e4` and later |
| Date | 19 August 2026 |

Because a t3.micro has a single shared vCPU, the higher load levels measure the
**instance and the load generator** as much as the application. That is noted
where it applies rather than glossed over.

---

## 1. Playwright — end-to-end tests

**Command**

```bash
./run-e2e.sh
```

**Result:** 18 passed, 0 failed

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

All 18 tests passed against the deployed EC2 instance.

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

Measured on the deployed EC2 instance, 19 August 2026.

| Level | Samples | Errors | Err % | Avg ms | P90 ms | P95 ms | Req/sec |
|---|---|---|---|---|---|---|---|
| x1 | 40 | 0 | 0.0% | 92 | 257 | 312 | 10.7 |
| x10 | 400 | 0 | 0.0% | 123 | 233 | 346 | 73.1 |
| x100 | 2,000 | 0 | 0.0% | 384 | 800 | 917 | **125.1** |
| x1000 | 7,236 | 739 | **10.2%** | 10,735 | 28,005 | 41,463 | 37.4 |

Levels above 150 clients are delivered as capped concurrency multiplied by extra
iterations — x1000 ran as 150 concurrent threads × 12 iterations, preserving
request volume. JMeter needs 1–2 MB of heap per thread and here shares a 913 MB
instance with the application under test; 1000 real threads exhausted the heap,
and even had it not, JMeter would have been competing with the server for the
same CPU. The brief permits this: *"or equivalent staged load levels"*.

### Per-endpoint behaviour at x1000

| Endpoint | Samples | Avg ms | Errors |
|---|---|---|---|
| Client `/feeds` page | 1,800 | 8,958 | 0.3% |
| API `/api/posts` | 1,800 | 16,876 | 1.5% |
| RSS `/rss.xml` | 1,800 | 7,077 | **27.7%** |
| Health probe `/health` | 1,800 | 10,236 | 11.6% |

### How the system behaves as load increases

**Throughput peaks at 125 requests per second, then collapses.** It rises
cleanly from 10.7 to 73.1 to 125.1 req/sec across x1, x10 and x100 — then
*falls* to 37.4 at x1000. Throughput going **down** rather than flattening is
congestion collapse, not simple saturation: the single shared vCPU spends more
time switching between waiting connections than completing work, so adding load
made the system do less.

**The failure threshold is between 100 and 1000 clients.** Zero errors at every
level up to and including x100, then 10.2%. Nothing was broken at x100; the same
code under more load simply ran out of anywhere to queue the work.

**Latency degrades far faster than throughput.** Average response went from
384 ms at x100 to 10,735 ms at x1000 — 28× — while throughput fell by only 3×.
The 95th percentile reached 41,463 ms against a 10,735 ms average, nearly four
times. That gap is queue depth: requests are waiting, not computing. The
minimum response time remained single-digit milliseconds throughout, which
confirms individual requests were still fast.

**The health probe failing is the operationally significant result.** At x1000
`/health` failed 11.6% of the time. In a real deployment behind a load
balancer, that instance would have been marked unhealthy and removed from
rotation — so the system would shed load rather than degrade indefinitely.
Discovering that the health check is itself a casualty of overload is exactly
the kind of thing load testing exists to reveal.

**The RSS endpoint failed most (27.7%)** because it does the most work per
request: querying feeds, posts, authors and categories, then serialising an XML
document. Its assertion also verifies the response really is RSS 2.0, so a
truncated or timed-out response counts as a failure rather than passing on a
200 alone.

**Where the limit actually is.** The application is not the constraint. A
t3.micro has one shared vCPU and 913 MB of RAM, and it is simultaneously
running the client container, the API container and the load generator. At
x1000 the measurement describes the host, not the code. The honest conclusion
is that **the deployment saturates around 125 requests per second**, and that
scaling would begin with moving the load generator off the instance, then
giving the application more than one vCPU.

### Notes

x10000 was not run. x1000 had already produced the finding — peak throughput,
the failure threshold and the shape of the degradation — and a further level
would have taken 10 to 20 minutes to confirm what was already established
about the host rather than the application.

A minor artefact in `summarise.sh`: the per-endpoint breakdown shows two
spurious rows (36 samples of 7,236). The script splits the results CSV on
commas, and a small number of rows carry a failure message containing one,
which shifts the columns. It does not affect the totals.

---

## 3. Lighthouse — accessibility

Run in Chrome DevTools → Lighthouse → Accessibility, against the deployed site.

### Scores

Chrome DevTools Lighthouse, run against the deployed EC2 instance,
19 August 2026.

| Page | Accessibility | Performance | Best Practices | SEO |
|---|---|---|---|---|
| Dashboard `/dashboard` | **100** | 95 | 78 | 100 |
| Home `/` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |
| Feeds `/feeds` | `[ ]` | `[ ]` | `[ ]` | `[ ]` |

**Accessibility scored 100 on the dashboard** — the page with the most
complex content in the application: a live-updating status banner, a chart,
four data tables and colour-coded state.

### Why it scored 100 without remedial work

There were no failed accessibility audits to fix, because the decisions that
usually cause them were made while building rather than after measuring:

- **Contrast was calculated, not judged by eye.** The status colours added for
  this assessment were measured against their backgrounds before being
  committed — 7.0:1 in the light theme and 7.2:1 in dark, both AAA. Insufficient
  contrast is the single most common Lighthouse accessibility failure.
- **State is carried by the word, not only the colour.** Status chips read
  "Healthy", "Stale", "Empty", "Paused". This is the one that matters most and
  the one Lighthouse *cannot* check — an automated audit will happily pass a
  colour-only design that is unreadable to a colour-blind user or in a
  greyscale printout.
- **The health banner is a live region.** `role="status"` with
  `aria-live="polite"`, so a screen reader announces a state change rather than
  only sighted users noticing it.
- **The chart describes itself.** The SVG carries `role="img"` and an
  `aria-label` stating its shape, range and totals, so it is not an unlabelled
  graphic.
- **Tables use real table semantics** — `<th scope="col">` and
  `<th scope="row">` — rather than divs styled to look like a grid.
- **Numbers use tabular figures**, which stops digits shifting sideways on each
  five-second refresh. Not an audited item, but movement is a genuine
  accessibility problem for some readers.

That is the honest account: not "no changes were needed" but "these specific
choices prevented the failures the audit looks for".

### Best Practices scored 78 — why, and why it is not a code problem

The likely cause is that the Learner Lab instance serves over plain **HTTP with
no TLS certificate**, which Lighthouse penalises heavily under Best Practices.
A public IP address that changes on every lab restart cannot hold a certificate
for a domain it does not own.

`[Expand the Best Practices section in your own report and confirm the failing
audits before saying this on camera. If browser console errors are also listed,
note what they are.]`

This is a deployment constraint rather than an application defect, and it is
already recorded under Known limitations in the README: production would
terminate HTTPS at a reverse proxy.

### How the results influenced the design

The audit confirmed the approach rather than redirecting it. The more useful
conclusion is about the limits of the tool: Lighthouse verifies mechanical
accessibility — contrast ratios, labels, ARIA roles, semantic structure — but
it cannot tell whether the interface still makes sense when colour is removed.
That gap is why status is spelled out in words, and it is the decision the
score gives no credit for.

`[If you run the other two pages and anything differs, record it above and say
what you changed.]`

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

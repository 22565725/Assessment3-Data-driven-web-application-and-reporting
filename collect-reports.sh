#!/bin/sh
#
# Collects the Playwright and JMeter reports into ./reports, which the RSS
# Client serves at /reports/... so the About page can link to them.
#
# The reports are generated after the image is built, so they cannot be baked
# into it. docker-compose bind-mounts this directory into the client's public
# folder instead, which means running this script makes the reports live
# immediately - no rebuild, which matters when a rebuild is fifteen minutes.
#
# Run it after the test suites, then reload the About page.
#
# Usage:  ./collect-reports.sh

set -e

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

mkdir -p reports

echo "Collecting reports into $REPO/reports"
echo

# --- Playwright -----------------------------------------------------------
if [ -d "frontend/playwright-report" ]; then
  rm -rf reports/playwright
  cp -r frontend/playwright-report reports/playwright
  echo "  playwright  OK   -> /reports/playwright/index.html"
else
  echo "  playwright  MISSING  (run ./run-e2e.sh first)"
fi

# --- JMeter ---------------------------------------------------------------
# Several levels produce several reports. The highest completed level is the
# most interesting one, so that is what the About page links to; the rest are
# kept alongside it under their own level names.
HIGHEST=""
for LEVEL in 1 10 100 1000 10000; do
  if [ -f "jmeter/results/report-x$LEVEL/index.html" ]; then
    rm -rf "reports/jmeter-x$LEVEL"
    cp -r "jmeter/results/report-x$LEVEL" "reports/jmeter-x$LEVEL"
    echo "  jmeter x$LEVEL  OK   -> /reports/jmeter-x$LEVEL/index.html"
    HIGHEST="$LEVEL"
  fi
done

if [ -n "$HIGHEST" ]; then
  rm -rf reports/jmeter
  cp -r "jmeter/results/report-x$HIGHEST" reports/jmeter
  echo "  jmeter      OK   -> /reports/jmeter/index.html (level x$HIGHEST)"
else
  echo "  jmeter      MISSING  (run ./jmeter/run-load-tests.sh first)"
fi

# The summary table is worth keeping beside the reports, since it is the one
# artefact that answers "what happened as load increased" in a single view.
if [ -x "jmeter/summarise.sh" ] && [ -d "jmeter/results" ]; then
  ./jmeter/summarise.sh > reports/load-summary.txt 2>/dev/null || true
  [ -s reports/load-summary.txt ] && echo "  summary     OK   -> reports/load-summary.txt"
fi

echo
echo "Reports are served immediately - no rebuild needed."
echo "Open:  http://<host>/about"

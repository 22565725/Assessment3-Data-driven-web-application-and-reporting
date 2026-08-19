#!/bin/sh
#
# Builds the submission zip.
#
# The brief requires node_modules to be removed. Rather than deleting it and
# reinstalling afterwards, this excludes it while zipping - the working tree
# is left exactly as it was.
#
# What goes in: all source, the Prisma schema and migrations, the Docker
# files, the tests, the JMeter plan, the generated reports, RESULTS.md and the
# walkthrough video.
#
# What stays out: node_modules, build output, the .git directory, the SQLite
# database file, and any .pem key material.
#
# Usage:  ./make-submission.sh

set -e

REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

STUDENT="22565725"
NAME="GizemErel"
ZIP="cse5006-a3-${STUDENT}-${NAME}.zip"

echo "Building $ZIP"
echo

# Warn rather than fail: the zip is still valid without these, but the marker
# is expecting them and it is better to know now than after uploading.
[ -f RESULTS.md ] || echo "  WARNING: RESULTS.md is missing"
[ -d reports/playwright ] || echo "  WARNING: no Playwright report - run ./run-e2e.sh then ./collect-reports.sh"
[ -d reports/jmeter ] || echo "  WARNING: no JMeter report - run ./jmeter/run-load-tests.sh then ./collect-reports.sh"
[ -n "$(find video -name '*.mp4' 2>/dev/null)" ] || echo "  WARNING: no video in ./video/"

rm -f "$ZIP"

# -x patterns are matched against the paths as stored, hence the leading ./
zip -r -q "$ZIP" . \
  -x "./.git/*" \
  -x "*/node_modules/*" \
  -x "./node_modules/*" \
  -x "*/.next/*" \
  -x "./api/sqlite/*.db" \
  -x "*.pem" \
  -x "./jmeter/results/*" \
  -x "*/test-results/*" \
  -x "*/playwright-report/*" \
  -x "*.zip" \
  -x "*.docx" \
  -x "*.pdf" \
  -x "*/.DS_Store"

echo
echo "  $(du -h "$ZIP" | cut -f1)  $ZIP"
echo

# Prove the exclusions worked rather than trusting them. A zip containing
# node_modules would be rejected, and it is a silent failure otherwise.
echo "Verifying:"
if unzip -l "$ZIP" | grep -q "node_modules"; then
  echo "  FAIL: node_modules is in the zip"
  exit 1
fi
echo "  node_modules   excluded"

if unzip -l "$ZIP" | grep -q "\.pem"; then
  echo "  FAIL: key material is in the zip"
  exit 1
fi
echo "  .pem files     excluded"

for want in "README.md" "RESULTS.md" "api/prisma/schema.prisma" "frontend/tests/" "jmeter/rss-load-test.jmx"; do
  if unzip -l "$ZIP" | grep -q "$want"; then
    echo "  $want"
  else
    echo "  MISSING: $want"
  fi
done

echo
echo "Files: $(unzip -l "$ZIP" | tail -1 | awk '{print $2}')"
echo
echo "Submit this zip, plus the GitHub link:"
echo "  https://github.com/22565725/Assessment3-Data-driven-web-application-and-reporting"

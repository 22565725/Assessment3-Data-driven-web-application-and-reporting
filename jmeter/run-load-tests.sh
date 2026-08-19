#!/bin/sh
#
# Staged load test: x1, x10, x100, x1000, x10000 virtual RSS clients.
#
# JMeter runs in a container for the same reason Playwright does - it needs a
# JVM, and installing one on Amazon Linux is a detour when Docker is already
# here.
#
# Each level writes a .jtl of raw samples and an HTML report. Levels run
# sequentially with a pause between, so the server is not still recovering
# from x1000 when x10000 starts - otherwise the last level measures the
# previous one's backlog rather than its own load.
#
# Usage:
#   ./run-load-tests.sh                        all five levels
#   ./run-load-tests.sh 1 10 100               only these levels
#   HOST=1.2.3.4 ./run-load-tests.sh           against a remote deployment
#
# A NOTE ON THE HIGHEST LEVEL, worth understanding before you read the
# numbers: a t3.micro has one shared vCPU and 913 MB of RAM, and JMeter
# itself needs memory per thread. At x10000 you are very likely measuring
# the limits of the load generator and the instance, NOT the application.
# That is a legitimate finding and worth stating plainly - report where
# throughput stops rising and say which component saturated. An implausibly
# clean run at every level would be the less credible result.

set -e

REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$REPO/jmeter/results"
PLAN="/plan/rss-load-test.jmx"
IMAGE="justb4/jmeter:5.5"

HOST="${HOST:-localhost}"
WEB_PORT="${WEB_PORT:-80}"
API_PORT="${API_PORT:-4080}"

LEVELS="$*"
[ -z "$LEVELS" ] && LEVELS="1 10 100 1000 10000"

# JMeter runs as the invoking user so nothing comes back owned by root, but
# that also means it cannot write into the image's own install directory -
# neither its log file nor the report generator's scratch space. Both are
# redirected into the mounted output directory, which we do own.
mkdir -p "$OUT" "$OUT/tmp"

echo "target : $HOST  (web :$WEB_PORT, api :$API_PORT)"
echo "levels : $LEVELS"
echo "output : $OUT"
echo

if ! curl -sf -o /dev/null "http://$HOST:$API_PORT/health"; then
  echo "ERROR: no RSS Server at http://$HOST:$API_PORT/health"
  exit 1
fi

for LEVEL in $LEVELS; do
  echo "=============================================="
  echo " Level x$LEVEL"
  echo "=============================================="

  # Ramp gently rather than starting every thread at once: a wall of
  # simultaneous connections measures the TCP accept queue, not the
  # application. Roughly ten threads per second, minimum one.
  RAMPUP=$(( LEVEL / 10 ))
  [ "$RAMPUP" -lt 1 ] && RAMPUP=1

  # Fewer iterations as concurrency rises - the point of the high levels is
  # concurrency, not total volume, and this keeps each run to a sane length.
  if [ "$LEVEL" -le 10 ]; then LOOPS=10
  elif [ "$LEVEL" -le 100 ]; then LOOPS=5
  else LOOPS=2
  fi

  rm -rf "$OUT/report-x$LEVEL"
  rm -f "$OUT/results-x$LEVEL.jtl"

  # JMeter needs more heap as thread count climbs, and its default 1 GB is
  # both too much for a t3.micro at low levels and too little at high ones.
  HEAP="-Xms256m -Xmx512m"
  [ "$LEVEL" -ge 1000 ] && HEAP="-Xms512m -Xmx1g"

  docker run --rm --network host \
    --user "$(id -u):$(id -g)" \
    -e HOME=/tmp \
    -e JVM_ARGS="$HEAP" \
    -v "$REPO/jmeter:/plan" \
    -v "$OUT:/out" \
    "$IMAGE" \
    -n -t "$PLAN" \
    -j "/out/jmeter-x$LEVEL.log" \
    -Jjmeter.reportgenerator.temp_dir=/out/tmp \
    -Jhost="$HOST" -Jwebport="$WEB_PORT" -Japiport="$API_PORT" \
    -Jthreads="$LEVEL" -Jrampup="$RAMPUP" -Jloops="$LOOPS" \
    -l "/out/results-x$LEVEL.jtl" \
    -e -o "/out/report-x$LEVEL" \
    || echo "  (level x$LEVEL ended with errors - that is data, continuing)"

  echo
  echo "  saved: results-x$LEVEL.jtl and report-x$LEVEL/"
  echo "  letting the server settle before the next level..."
  sleep 20
done

echo
echo "=============================================="
echo " All levels complete"
echo "=============================================="
echo "Reports:  $OUT/report-x<LEVEL>/index.html"
echo "Raw data: $OUT/results-x<LEVEL>.jtl"
echo
echo "Summarise with:  $REPO/jmeter/summarise.sh"

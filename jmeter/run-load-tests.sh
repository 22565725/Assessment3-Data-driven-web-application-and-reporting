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

# Maximum real concurrency. Above this, a level is delivered as extra
# iterations instead of extra threads - see the note in the loop below.
# Raise it when the load generator runs on a separate, larger machine,
# which is the correct arrangement if you have one.
MAX_THREADS="${MAX_THREADS:-150}"

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

# Check Docker access BEFORE anything else. Without this the run gets as far
# as printing a level header and then fails per-level, which reads like a
# load-testing problem rather than a permissions one.
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: cannot reach the Docker daemon."
  echo
  echo "Group membership applies per shell. Either activate it here:"
  echo "    newgrp docker"
  echo "or reconnect your session, which fixes it for good. If 'id -nG'"
  echo "does not list docker at all:"
  echo "    sudo usermod -aG docker ec2-user   (then reconnect)"
  exit 1
fi

if ! curl -sf -o /dev/null "http://$HOST:$API_PORT/health"; then
  echo "ERROR: no RSS Server at http://$HOST:$API_PORT/health"
  echo "The load test needs a running deployment: docker compose up -d"
  exit 1
fi

for LEVEL in $LEVELS; do
  echo "=============================================="
  echo " Level x$LEVEL"
  echo "=============================================="

  # Base iterations per virtual client: fewer as the level rises, so a run
  # stays a sane length.
  if [ "$LEVEL" -le 10 ]; then BASE_LOOPS=10
  elif [ "$LEVEL" -le 100 ]; then BASE_LOOPS=5
  else BASE_LOOPS=2
  fi

  # Above MAX_THREADS, simulate the level as VOLUME rather than concurrency.
  #
  # JMeter needs 1-2 MB of heap per thread, and here it shares a 913 MB
  # instance with the application it is testing. A thousand real threads
  # exhausts the heap - and even if it did not, JMeter would be competing
  # with the server for the same CPU, so the numbers would describe that
  # contest rather than the application.
  #
  # So the client count is delivered as (capped threads x extra iterations),
  # preserving total requests while keeping concurrency survivable. The brief
  # allows this explicitly: "or equivalent staged load levels". Say so when
  # reporting - an honest x1000-by-volume is worth more than a fabricated
  # x1000-by-concurrency that never ran.
  if [ "$LEVEL" -gt "$MAX_THREADS" ]; then
    THREADS="$MAX_THREADS"
    LOOPS=$(( (LEVEL / MAX_THREADS) * BASE_LOOPS ))
    [ "$LOOPS" -lt 1 ] && LOOPS=1
    echo "  NOTE: $LEVEL clients simulated as $THREADS concurrent threads"
    echo "        x $LOOPS iterations - equivalent request volume, survivable"
    echo "        concurrency for a t3.micro hosting the app under test."
  else
    THREADS="$LEVEL"
    LOOPS="$BASE_LOOPS"
  fi

  # Ramp gently rather than starting every thread at once: a wall of
  # simultaneous connections measures the TCP accept queue, not the
  # application. Roughly ten threads per second, minimum one.
  RAMPUP=$(( THREADS / 10 ))
  [ "$RAMPUP" -lt 1 ] && RAMPUP=1

  rm -rf "$OUT/report-x$LEVEL"
  rm -f "$OUT/results-x$LEVEL.jtl"

  # The image computes its own heap from available memory and overrides
  # anything passed in, which is why concurrency is capped above rather than
  # heap being raised here. Kept as a hint for images that do honour it.
  HEAP="-Xms256m -Xmx512m"

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
    -Jthreads="$THREADS" -Jrampup="$RAMPUP" -Jloops="$LOOPS" \
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

#!/bin/sh
#
# Summarises the staged load test results into one comparison table.
#
# JMeter's own HTML report is thorough but per-run: reading five of them side
# by side to answer "what happened as load increased" means holding five
# browser tabs in your head. This produces the single table that answers it,
# which is what the assessment actually asks for.
#
# Reads the raw .jtl files rather than the HTML reports, because the .jtl is
# the data and the report is a rendering of it.
#
# Usage:  ./summarise.sh

set -e

REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$REPO/jmeter/results"

if [ ! -d "$OUT" ]; then
  echo "No results in $OUT - run ./run-load-tests.sh first."
  exit 1
fi

printf "%-8s %9s %9s %8s %8s %8s %8s %9s\n" \
  "LEVEL" "SAMPLES" "ERRORS" "ERR%" "AVG ms" "P90 ms" "P95 ms" "REQ/SEC"
printf -- "---------------------------------------------------------------------------\n"

for LEVEL in 1 10 100 1000 10000; do
  FILE="$OUT/results-x$LEVEL.jtl"
  [ -f "$FILE" ] || continue

  # Column 2 is elapsed, column 8 is success, column 1 is the timestamp.
  # Skipping the header row with NR>1.
  awk -F',' -v level="$LEVEL" '
    NR > 1 {
      samples++
      elapsed[samples] = $2 + 0
      total += $2 + 0
      if ($8 == "false") errors++
      ts = $1 + 0
      if (first == 0 || ts < first) first = ts
      if (ts > last) last = ts
    }
    END {
      if (samples == 0) { printf "%-8s %9s\n", "x" level, "no data"; exit }

      # Percentiles need the values in order.
      n = asort(elapsed)
      p90i = int(n * 0.90); if (p90i < 1) p90i = 1
      p95i = int(n * 0.95); if (p95i < 1) p95i = 1

      duration = (last - first) / 1000.0
      if (duration <= 0) duration = 1

      printf "%-8s %9d %9d %7.1f%% %8d %8d %8d %9.1f\n",
        "x" level, samples, errors, (errors * 100.0 / samples),
        (total / samples), elapsed[p90i], elapsed[p95i],
        (samples / duration)
    }
  ' "$FILE" 2>/dev/null || {
      # mawk and some busybox awks lack asort(). Fall back to sort(1),
      # which is always present and does the same job.
      SAMPLES=$(tail -n +2 "$FILE" | wc -l)
      ERRORS=$(tail -n +2 "$FILE" | awk -F',' '$8=="false"' | wc -l)
      AVG=$(tail -n +2 "$FILE" | awk -F',' '{s+=$2} END {printf "%d", (NR?s/NR:0)}')
      P90=$(tail -n +2 "$FILE" | cut -d',' -f2 | sort -n | awk -v n="$SAMPLES" 'NR==int(n*0.90)+0 {print; exit}')
      P95=$(tail -n +2 "$FILE" | cut -d',' -f2 | sort -n | awk -v n="$SAMPLES" 'NR==int(n*0.95)+0 {print; exit}')
      FIRST=$(tail -n +2 "$FILE" | cut -d',' -f1 | sort -n | head -1)
      LAST=$(tail -n +2 "$FILE" | cut -d',' -f1 | sort -n | tail -1)
      DUR=$(awk -v a="$FIRST" -v b="$LAST" 'BEGIN {d=(b-a)/1000; print (d>0?d:1)}')
      printf "%-8s %9s %9s %7.1f%% %8s %8s %8s %9.1f\n" \
        "x$LEVEL" "$SAMPLES" "$ERRORS" \
        "$(awk -v e="$ERRORS" -v s="$SAMPLES" 'BEGIN {printf "%.1f", (s?e*100/s:0)}')" \
        "$AVG" "${P90:-0}" "${P95:-0}" \
        "$(awk -v s="$SAMPLES" -v d="$DUR" 'BEGIN {printf "%.1f", s/d}')"
    }
done

echo
echo "Per-endpoint breakdown at the highest completed level:"
echo
for LEVEL in 10000 1000 100 10 1; do
  FILE="$OUT/results-x$LEVEL.jtl"
  if [ -f "$FILE" ]; then
    printf "  (level x%s)\n" "$LEVEL"
    tail -n +2 "$FILE" | awk -F',' '
      { n[$3]++; t[$3] += $2; if ($8 == "false") e[$3]++ }
      END {
        for (label in n)
          printf "    %-28s %7d samples  %6d ms avg  %5.1f%% errors\n",
            label, n[label], t[label]/n[label], (e[label] * 100.0 / n[label])
      }' | sort
    break
  fi
done

echo
echo "What to look for:"
echo "  - where REQ/SEC stops rising: that is saturation"
echo "  - where ERR% leaves zero: that is the failure threshold"
echo "  - P95 climbing faster than AVG: queueing, not slower work"

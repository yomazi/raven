#!/bin/bash
# logview.sh: colorized NDJSON log viewer for server/logs folder

LOG_FOLDER="./server/logs"

# Check for jq
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required. Install with 'brew install jq'"
  exit 1
fi

# Loop through all .ndjson files
for FILE in "$LOG_FOLDER"/*.log; do
  [[ -e "$FILE" ]] || continue
  echo "=== $FILE ==="
  # Extract common fields and colorize
  jq -r '
    "\(.time // "-") \(.level // "-") \(.message // "-")" |
    gsub("INFO"; "\u001b[32mINFO\u001b[0m") |
    gsub("ERROR"; "\u001b[31mERROR\u001b[0m") |
    gsub("WARN"; "\u001b[33mWARN\u001b[0m")
  ' "$FILE"
done | less -R
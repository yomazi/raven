#!/bin/bash
# logview.sh - pick a single NDJSON file to view

LOG_FOLDER="./server/logs"

# Check for jq
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required. Install with 'brew install jq'"
  exit 1
fi

# Gather files
FILES=("$LOG_FOLDER"/*)
if [ ${#FILES[@]} -eq 0 ]; then
  echo "No files found in $LOG_FOLDER"
  exit 1
fi

# Interactive menu
echo "Select a file to view:"
select FILE in "${FILES[@]}"; do
  if [[ -n "$FILE" ]]; then
    echo "Opening $FILE ..."
    jq -r '
      "\(.time // "-") \(.level // "-") \(.message // "-")" |
      gsub("INFO"; "\u001b[32mINFO\u001b[0m") |
      gsub("ERROR"; "\u001b[31mERROR\u001b[0m") |
      gsub("WARN"; "\u001b[33mWARN\u001b[0m")
    ' "$FILE" | less -R
    break
  else
    echo "Invalid selection, try again."
  fi
done
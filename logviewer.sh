#!/bin/bash
LOG_FOLDER="./server/logs"

# Gather files safely
FILES=()
for f in "$LOG_FOLDER"/*.log "$LOG_FOLDER"/*.log.gz; do
  [[ -f "$f" ]] || continue
  FILES+=("$f")
done

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No log files found in $LOG_FOLDER"
  exit 1
fi

echo "Select a file to view:"
select FILE in "${FILES[@]}"; do
  [[ -n "$FILE" ]] || { echo "Invalid selection"; continue; }
  echo "Opening $FILE ..."

  if [[ "$FILE" == *.gz ]]; then
    # Only attempt zcat if the file is a valid gzip
    if file "$FILE" | grep -q "gzip compressed"; then
      gzcat "$FILE" | jq -r '
        "\(.timestamp // "-") \(.level // "-") \(.message // "-")" |
        gsub("INFO"; "\u001b[32mINFO\u001b[0m") |
        gsub("ERROR"; "\u001b[31mERROR\u001b[0m") |
        gsub("WARN"; "\u001b[33mWARN\u001b[0m")
      ' | less -R
    else
      echo "Skipping $FILE: not a valid gzip file"
    fi
  else
    cat "$FILE" | jq -r '
      "\(.timestamp // "-") \(.level // "-") \(.message // "-")" |
      gsub("INFO"; "\u001b[32mINFO\u001b[0m") |
      gsub("ERROR"; "\u001b[31mERROR\u001b[0m") |
      gsub("WARN"; "\u001b[33mWARN\u001b[0m")
    ' | less -R
  fi
  break
done
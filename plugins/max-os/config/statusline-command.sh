#!/bin/bash

# Read JSON input from stdin
input=$(cat)

# Extract values using grep/sed (no jq dependency)
cwd=$(echo "$input" | grep -o '"current_dir":"[^"]*"' | sed 's/"current_dir":"//;s/"$//')
model=$(echo "$input" | grep -o '"display_name":"[^"]*"' | sed 's/"display_name":"//;s/"$//')
remaining=$(echo "$input" | grep -o '"remaining_percentage":[0-9.]*' | sed 's/"remaining_percentage"://')

# Format context percentage
context_info=""
if [ -n "$remaining" ]; then
    remaining_int=$(printf "%.0f" "$remaining")
    context_info=" [${remaining_int}%]"
fi

# Check state sync status (only if in max-techera-web project)
sync_status=""
if [[ "$cwd" == *"max-techera-web"* ]]; then
    STATE_FILE="$cwd/_docs/OPERATIONS/priorities.json"
    if [ -f "$STATE_FILE" ]; then
        # Extract last_updated without jq (handles optional space after colon)
        LAST_UPDATE=$(grep -o '"last_updated": *"[^"]*"' "$STATE_FILE" 2>/dev/null | sed 's/"last_updated": *"//;s/"$//' | head -1)
        if [ -n "$LAST_UPDATE" ] && [ "$LAST_UPDATE" != "null" ]; then
            LAST_TS=$(date -d "$LAST_UPDATE" +%s 2>/dev/null || echo 0)
            NOW_TS=$(date +%s)
            HOURS_OLD=$(( (NOW_TS - LAST_TS) / 3600 ))

            # Count commits since last update
            COMMITS=$(git -C "$cwd" log --oneline --since="$LAST_UPDATE" 2>/dev/null | wc -l)

            if [ "$HOURS_OLD" -gt 72 ] || [ "$COMMITS" -gt 10 ]; then
                sync_status=" max-os \033[31m●\033[0m"  # Red - stale
            elif [ "$HOURS_OLD" -gt 24 ] || [ "$COMMITS" -gt 5 ]; then
                sync_status=" max-os \033[33m●\033[0m"  # Yellow - drift
            else
                sync_status=" max-os \033[32m●\033[0m"  # Green - synced
            fi
        fi
    fi
fi

# Format: model [context%] [sync status]
# Use printf with %b for sync_status to interpret escape sequences
printf "\033[36m%s\033[0m%s%b" "$model" "$context_info" "$sync_status"

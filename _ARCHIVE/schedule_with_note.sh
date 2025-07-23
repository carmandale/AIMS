#!/bin/bash
# Schedule with note - Used by Orchestrator for regular check-ins

# Check if note is provided
if [ -z "$1" ]; then
    echo "Usage: ./schedule_with_note.sh \"Your note here\""
    exit 1
fi

NOTE="$1"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Create schedule directory if it doesn't exist
mkdir -p schedule_logs

# Log the scheduled note
echo "[$TIMESTAMP] $NOTE" >> schedule_logs/orchestrator_schedule.log

# Display confirmation
echo "✓ Scheduled: $NOTE"
echo "  Time: $TIMESTAMP"

# If this is a team check-in, create a status file
if [[ "$NOTE" == *"Team Check-in"* ]] || [[ "$NOTE" == *"Status Update"* ]]; then
    echo "[$TIMESTAMP] Pending check-in: $NOTE" > schedule_logs/pending_checkin.txt
fi

# Return success
exit 0
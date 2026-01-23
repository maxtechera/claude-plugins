---
description: Morning state review - priorities, blockers, sabotage check
allowed-tools: Read, Grep
---

# Daily Check Command

Execute a comprehensive daily status review.

## Process

### 1. Load Current State

Read your state files:
- Ship calendar or task tracker
- Current sprint/week plan
- Priority list

### 2. Determine Today's Context

Based on current day of week:
- **Monday**: "Define what wins the week + 3 concrete deliverables"
- **Tuesday-Thursday**: "Execution + publication (ship > polish)"
- **Friday**: "Brutal review: metrics, learnings, one real adjustment"

### 3. Ship Calendar Check

If you have a ship calendar:
- Calculate days until next ship
- Show progress percentage
- Display the ONE next action

**If ship date is < 7 days away, this is your ONLY focus.**

### 4. Check for Blockers

Review any blocking issues from sprint or calendar.

### 5. Sabotage Pattern Check

Quick check against thresholds:
- Tasks in progress count (threshold: >5)
- Days since last ship (threshold: >5)
- Tool changes vs publications

### 6. Output Daily Briefing

```
## Daily Check - [Date]

### SHIP IN [X] DAYS
**[Item Title]** - [Ship Date]
Progress: [X]% ([completed]/[total] items)

**NEXT ACTION**: [Next action item]

---

**Today is [Day]**: [Day context from rhythm]
**Week Theme**: [This week's focus]
**Week [N] of Quarter**

### Today's Focus
1. [ ] [Primary task] ← DO THIS FIRST
2. [ ] [Secondary task]
3. [ ] [Tertiary task]

### Blockers
[List or "None - clear to execute"]

### Sabotage Check
[Status: Green/Yellow/Red with brief note]

### Focus Question
"What evidence would an outsider see that you made progress today?"
```

### 7. State Health Check

```
### State Health
- Ship Calendar: [Last updated X days ago]
- Sprint Plan: [Last updated X days ago]
- Action needed: [None / Update files / Sync state]
```

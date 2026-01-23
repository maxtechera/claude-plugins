---
name: operating-system
description: Personal operating system architecture for creators. State files, tracking, and operational workflows.
---

# Operating System Skill

A personal operating system architecture for high-output creators.

## When to Use This Skill

- Setting up a personal operating system
- Designing state management for projects
- Creating tracking systems
- Building operational workflows
- Managing multiple projects and priorities

---

## Core Philosophy

**Ship > Polish. Always.**

The operating system exists to:
1. Reduce decision fatigue
2. Maintain focus on what matters
3. Detect self-sabotage early
4. Track progress with evidence
5. Enable sustainable high output

---

## State File Architecture

### Recommended File Structure

```
project/
├── _docs/
│   ├── PROJECT_STATE.json      # Global metrics, goals, KPIs
│   ├── HANDBOOK.json           # Operating manual, patterns
│   └── OPERATIONS/
│       ├── current-sprint.json # This week's focus
│       ├── priorities.json     # Active tasks (P0/P1/P2)
│       ├── decisions.json      # Decision log (append-only)
│       └── patterns.json       # What works/fails
└── _archive/
    └── YYYY-MM.json           # Monthly completions
```

### PROJECT_STATE.json Template

```json
{
  "last_updated": "YYYY-MM-DD",
  "metrics": {
    "primary_kpi": {
      "current": 0,
      "target": 1000,
      "unit": "subscribers"
    }
  },
  "milestones": {
    "completed": [],
    "upcoming": []
  },
  "quarter_focus": "One sentence goal"
}
```

### current-sprint.json Template

```json
{
  "week_number": 4,
  "date_range": "2026-01-20 to 2026-01-26",
  "theme": "Week theme",
  "big_3": [
    {
      "title": "Primary deliverable",
      "status": "in_progress",
      "ship_date": "2026-01-24"
    },
    {
      "title": "Secondary deliverable",
      "status": "pending"
    },
    {
      "title": "Tertiary deliverable",
      "status": "pending"
    }
  ],
  "kill_list": ["Things NOT doing this week"]
}
```

### priorities.json Template

```json
{
  "P0": {
    "task-id-2026-01": {
      "title": "Must do today",
      "status": "in_progress",
      "owner": "me"
    }
  },
  "P1": {},
  "P2": {}
}
```

---

## The Ship Calendar System

**Core Principle**: If it's not on the ship calendar, it doesn't exist.

### Structure

```json
{
  "items": [
    {
      "id": "item-id",
      "title": "What you're shipping",
      "ship_date": "2026-01-24",
      "status": "in_progress",
      "checklist": [
        {"item": "Step 1", "done": true},
        {"item": "Step 2", "done": false}
      ],
      "next_action": "What to do next"
    }
  ],
  "next_ship": "item-id"
}
```

### Ship Calendar Rules

1. **Always have a ship date within 7 days**
2. **Maximum 3 items in progress**
3. **Overdue items block all new work**
4. **Ship dates are commitments, not estimates**

---

## State Sync Protocol

### After Completing Work

1. Add entry to `archive/YYYY-MM.json` completed object
2. Remove from `priorities.json` if it was a P0/P1
3. Update `last_updated` in modified files
4. If milestone achieved, update `PROJECT_STATE.json`

### Task ID Convention

`{slug}-{YYYY}-{MM}` (e.g., `hero-cta-removal-2026-01`)

---

## Delegation Framework

### Core Principle: WHO Before WHAT

Every task must have an owner BEFORE defining the work.

### Task Schema (Required)

```json
{
  "task": "What needs to be done",
  "owner": "who-does-it",
  "status": "ready|in_progress|blocked|review|done"
}
```

### Owner Categories

| Task Type | Owner |
|-----------|-------|
| Research & Prep | assistant/ai |
| Final decisions | you |
| Execution | depends on task |
| Review | you |

---

## Key Principles

1. **Ship Broken** > Ship Perfect
2. **Receipts > Claims** - Show real metrics
3. **WHO before WHAT** - Delegate first
4. **Single source of truth** - State files are reality
5. **80/20 rule** - 80% delegated, 20% your time

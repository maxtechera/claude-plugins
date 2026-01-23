---
description: Full sabotage pattern analysis
allowed-tools: Read, Grep
---

# Check Sabotage Command

Detect active sabotage patterns that prevent shipping.

## Process

### 1. Load State Files

Read:
- Ship calendar / task tracker
- Priorities / current tasks
- Sprint / week plan
- Project metrics

### 2. Run Pattern Checks

**Dispersion Noble**
- Count tasks with status "in_progress"
- Count tasks with status "completed" this week
- **Alert if**: in_progress > 5 AND completed = 0

**Dopamina de Inicio**
- Count open projects/initiatives
- **Alert if**: open_projects > 3

**Perfeccionismo con Disfraz**
- Calculate days since last content published
- **Alert if**: days > 5

**Optimizacion Prematura**
- Count tool/system changes this week
- Count publications this week
- **Alert if**: changes > publications

**Negociar con Vos Mismo**
- Check for mid-week priority changes without reason
- **Flag if**: priorities changed without documented rationale

**Ansiedad de Oportunidad**
- Check if kill list exists and is populated
- **Alert if**: kill list is empty

**Calendar Gap**
- Check ship calendar for next ship date
- **Alert if**: No ship date in next 7 days

**Overdue Ship**
- Check if any items have ship_date in the past
- **Alert if**: Any item is overdue and not shipped

### 3. Generate Report

```
## Sabotage Pattern Check - [Date]

### Ship Calendar Status

| Check | Status |
|-------|--------|
| Next ship date | [Date] ([X] days away) |
| Overdue items | [None / List] |
| Items in progress | [X] of max 3 |

### Pattern Analysis

| Pattern | Threshold | Current | Status |
|---------|-----------|---------|--------|
| Calendar Gap | >7 days to ship | [X] days | ✅/⚠️/🚨 |
| Overdue Ship | Any item past due | [status] | ✅/⚠️/🚨 |
| Dispersion Noble | >5 open, 0 complete | [X]/[Y] | ✅/⚠️/🚨 |
| Dopamina de Inicio | >3 projects | [X] | ✅/⚠️/🚨 |
| Perfeccionismo | >5 days no ship | [X] days | ✅/⚠️/🚨 |
| Optimizacion Prematura | changes > ships | [X]/[Y] | ✅/⚠️/🚨 |
| Ansiedad de Oportunidad | empty kill list | [status] | ✅/⚠️/🚨 |

### Overall Status: [GREEN/YELLOW/RED]

### Active Alerts
[List any patterns at warning or critical level]

### Recommendations
[Specific actions based on detected patterns]
```

### 4. If 3+ Alerts Active

Add Emergency Protocol:

```
### EMERGENCY PROTOCOL TRIGGERED

3+ sabotage patterns detected. Initiate 48-hour reset:

1. **Dormir** - 7-7.5 hours tonight, no negotiation
2. **Entrenar** - Physical activity tomorrow
3. **1 Entrega Chica** - Pick smallest completable task
4. **Cortar Inputs** - No social media, no news for 48h
5. **Plan en 10 Lineas** - Rewrite entire plan in max 10 lines

"Your limit isn't talent or discipline. It's the inability to choose one thing and give up ten without losing your identity."
```

### 5. Log the Check

Record the sabotage check result:
- Date
- Status (GREEN/YELLOW/RED)
- Patterns detected
- Action taken (if any)

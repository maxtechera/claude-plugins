---
description: Show Skool sync status - compare local content to Skool
allowed-tools: Read, Glob, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot
---

# Skool Status Command

Check sync status between local `_content/skool/` and the Skool community.

## Usage

```
/skool-status              - Full status report
/skool-status --local      - Only check local files (no browser)
/skool-status --verbose    - Include content previews
```

## Process

### Step 1: Read Configuration

1. Read `_content/skool/skool.config.json` for community URL and course mapping
2. If no config, prompt user to create one

### Step 2: Read Local Content

1. Glob all `.md` files in `_content/skool/`
2. Read `_content/skool/.sync-manifest.json` if exists
3. Parse each file to extract title and content hash

### Step 3: Compare to Manifest

For each local file:
- If in manifest with matching hash → "synced"
- If in manifest with different hash → "changed"
- If not in manifest → "pending"

### Step 4: Output Report

```
## Skool Sync Status
**Community**: your-community-slug
**Last sync**: 2026-01-26 14:30

### Classroom

| Course | Lessons | Status |
|--------|---------|--------|
| Course 1 | 3 | ✓ synced |
| Course 2 | 5 | ⚠ 1 changed |

### Pending Changes

| File | Status | Action |
|------|--------|--------|
| course-2/m2-01-lesson.md | changed | Update lesson |

### Community Posts

| Post | Status |
|------|--------|
| announcement.md | ✓ synced |

### Summary
- **Total**: 10 items
- **Synced**: 9
- **Pending**: 1

Run `/skool-sync` to sync pending changes.
```

## `--local` Flag

Skip browser verification. Only check:
1. Local files exist
2. Manifest status
3. Hash comparison

Output simplified:
```
## Local Content Status

| Folder | Files | In Manifest |
|--------|-------|-------------|
| course-1 | 3 | 3 ✓ |
| course-2 | 5 | 5 ✓ |
| community | 1 | 1 ✓ |

**Total**: 9 files, 9 synced
```

## `--verbose` Flag

Include content preview for each file:
```
### course-2/m1-01-lesson.md
**Title**: Workshop #001 Recap
**Status**: synced
**Hash**: sha256:abc123...
**Preview**: First 100 chars of content...
```

## Hash Calculation

Use first 500 chars of content body (after title) for quick hash:

```javascript
// Pseudo-code
const content = file.replace(/^#.*\n/, '').trim()
const hashInput = content.substring(0, 500)
const hash = sha256(hashInput).substring(0, 12)
```

## Error States

### No Config
```
⚠ No Skool config found at _content/skool/skool.config.json

Create a config file with your community URL:
{
  "community_url": "https://www.skool.com/your-community",
  "community_name": "Your Community"
}
```

### No Manifest
```
⚠ No sync manifest found at _content/skool/.sync-manifest.json

Local content detected but no sync history.
Run `/skool-sync --init` to create manifest and sync.
```

### Empty Content Folder
```
⚠ No content found in _content/skool/

Create content files following the structure in the skool-management skill.
```

## Implementation Notes

1. **Read skill first**: Load skool-management skill for Playwright best practices
2. **Fast path**: If `--local`, skip all browser operations
3. **Manifest creation**: If no manifest exists, treat all as "pending"
4. **Course mapping**: Use config's course mapping table

$ARGUMENTS

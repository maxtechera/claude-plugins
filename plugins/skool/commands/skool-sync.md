---
description: Sync local content to Skool community - classroom lessons and community posts
allowed-tools: Read, Write, Edit, Glob, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_fill_form, mcp__playwright__browser_press_key
---

# Skool Sync Command

Sync content from `_content/skool/` to the Skool community using Playwright MCP.

## Usage

```
/skool-sync                    - Sync all pending content
/skool-sync --dry-run          - Show what would sync (no changes)
/skool-sync --course=NAME      - Sync only one course
/skool-sync --force            - Resync even if hash matches
/skool-sync --init             - Create manifest from current Skool state
```

## Prerequisites

1. **Playwright MCP available** - Browser automation required
2. **Logged into Skool** - Session must be authenticated
3. **Local content exists** - Files in `_content/skool/`
4. **Config file exists** - `_content/skool/skool.config.json`

## Process

### Phase 1: Preparation (No Browser)

1. **Read config**: Load `_content/skool/skool.config.json`
2. **Read skill**: Load skool-management skill for Playwright patterns
3. **Read manifest**: Load `_content/skool/.sync-manifest.json` (or create empty)
4. **Scan local files**: Glob all `.md` files except README
5. **Calculate changes**:
   - New files (not in manifest)
   - Changed files (hash mismatch)
   - Unchanged files (skip unless `--force`)

```
Found 10 local files:
- 3 new (not synced)
- 1 changed (hash mismatch)
- 6 unchanged (skip)

Syncing 4 items...
```

### Phase 2: Browser Setup

1. **Navigate**: `browser_navigate` to `{community_url}/classroom`
2. **Verify auth**: Check snapshot for user avatar/name
3. **If not logged in**: Prompt user to log in manually, wait

```
Navigating to Skool Classroom...
✓ Authenticated as [Username]
```

### Phase 3: Sync Classroom Content

**For each course with pending content:**

1. **Navigate to course** (if not already there)
2. **Get snapshot** to find course element
3. **Click course** to expand
4. **Get snapshot** to find lesson list and "Add" button

**For each pending lesson in course:**

1. **Click "Add"** button
2. **Get snapshot** to find form fields
3. **Fill title**: Use `browser_type` on title field
4. **Fill content**: Use `browser_type` on content editor
5. **Click "Publish"** or "Save"
6. **Update manifest** with sync info

```
Syncing course-2/m1-01-lesson.md...
  → Navigated to Course 2
  → Clicked Add button
  → Filled title: "Lesson Title"
  → Filled content (2,340 chars)
  → Published
  ✓ Synced in 8.2s
```

### Phase 4: Sync Community Posts

For files in `community/`:

1. **Navigate** to community page
2. **Click** "Write something"
3. **Fill** title and content
4. **Select category** from dropdown
5. **Click "Post"**
6. **Update manifest**

```
Syncing community/announcement.md...
  → Navigated to Community
  → Opened post editor
  → Filled title and content
  → Selected category: General discussion
  → Posted
  ✓ Synced in 6.1s
```

### Phase 5: Update Manifest

After all syncs complete, write `_content/skool/.sync-manifest.json`:

```json
{
  "community_url": "https://www.skool.com/your-community",
  "last_full_sync": "2026-01-26T15:45:00Z",
  "synced": {
    "course-2/m1-01-lesson.md": {
      "synced_at": "2026-01-26T15:45:00Z",
      "content_hash": "sha256:abc123",
      "title": "Lesson Title"
    }
  }
}
```

## Optimized Sync Patterns

### Batch by Course

```
GOOD:
1. Open Course 2
2. Add lesson 1
3. Add lesson 2 (same course, no navigation)
4. Add lesson 3 (same course, no navigation)
5. Open Course 3
6. Add lesson

BAD:
1. Open Course 2 → Add lesson 1
2. Open Course 3 → Add lesson
3. Open Course 2 → Add lesson 2  ← Extra navigation!
```

### Minimize Snapshots

```
GOOD:
1. Navigate → Snapshot (find course)
2. Click course → Snapshot (find Add)
3. Click Add → Snapshot (find form)
4. Fill form → Click Publish
   (No snapshot needed - we know the form structure)

BAD:
1. Navigate → Snapshot
2. Wait → Snapshot  ← Unnecessary
3. Click → Snapshot
4. Wait → Snapshot  ← Unnecessary
```

### Content Extraction

Extract title from markdown:
```python
# First # heading = title
title = re.match(r'^#\s+(.+)', content).group(1)

# Everything after frontmatter = body
body = content.split('---')[-1].strip()
```

## `--dry-run` Output

```
## Dry Run - Skool Sync

Would sync 4 items:

### New (3)
| File | Course | Title |
|------|--------|-------|
| course-2/m1-01-lesson.md | Course 2 | Lesson Title |
| course-3/01-lesson.md | Course 3 | Another Lesson |
| community/announcement.md | Community | Announcement |

### Changed (1)
| File | Course | Change |
|------|--------|--------|
| course-2/m2-01-lesson.md | Course 2 | Content updated |

### Skipped (6)
Already synced, no changes detected.

Run `/skool-sync` to execute.
```

## Error Handling

### Auth Failed
```
✗ Not logged into Skool

Please log in manually:
1. Browser window should be open
2. Navigate to skool.com and log in
3. Run `/skool-sync` again
```

### Element Not Found
```
⚠ Could not find "Add" button in Course 2

Possible causes:
- Course UI changed
- Not viewing correct course

Retrying with fresh snapshot...
```

### Content Too Long
```
⚠ Content exceeds Skool limit for course-2/m2-01-lesson.md

Original: 15,234 chars
Limit: ~10,000 chars

Options:
1. Truncate (use --truncate)
2. Split into multiple lessons
3. Edit source file
```

## `--init` Flag

Create manifest from current Skool state (when local matches remote):

1. Navigate to Classroom
2. List all courses and lessons
3. For each lesson, find matching local file
4. Create manifest entry with current timestamp
5. Mark all as "synced"

```
Initializing manifest from Skool...
  Found 5 courses, 10 lessons
  Matched 10/10 local files
  Created .sync-manifest.json
```

## Implementation Checklist

- [ ] Read skool.config.json for community URL and course mapping
- [ ] Read skool-management skill for Playwright patterns
- [ ] Load/create manifest
- [ ] Scan local files and calculate hashes
- [ ] Group changes by course for batch processing
- [ ] Navigate to Skool, verify auth
- [ ] Process courses in order (minimize navigation)
- [ ] For each item: add/update, verify, update manifest
- [ ] Process community posts
- [ ] Write updated manifest
- [ ] Output summary

$ARGUMENTS

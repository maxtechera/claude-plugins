---
name: skool-management
description: Skool community management via Playwright MCP. Covers sync, content management, and best practices for browser automation.
---

# Skool Management Skill

This skill enables efficient Skool community management using Playwright MCP for browser automation.

## Setup

### Required Configuration

In your project, create `_content/skool/skool.config.json`:

```json
{
  "community_url": "https://www.skool.com/your-community-slug",
  "community_name": "Your Community Name",
  "courses": {
    "course-1": { "skool_name": "Course 1 Name", "skool_index": 0 },
    "course-2": { "skool_name": "Course 2 Name", "skool_index": 1 }
  }
}
```

### Content Structure

```
_content/skool/
├── skool.config.json         # Community configuration
├── .sync-manifest.json       # Sync state (auto-generated)
├── README.md                 # Documentation
├── course-1/                 # Maps to first Skool course
│   └── 01-lesson.md
├── course-2/                 # Maps to second Skool course
│   ├── m1-01-lesson.md
│   └── m1-02-lesson.md
└── community/                # Community posts (not classroom)
    └── announcement.md
```

---

## Playwright MCP Best Practices

### 1. Always Get Fresh Snapshot First

```
WRONG: Click immediately after previous action
RIGHT: browser_snapshot → analyze → click with correct ref
```

Skool's UI updates refs after every action. Always get a fresh snapshot before clicking.

### 2. Use Specific Refs, Never Guess

```
WRONG: Click "button that might be there"
RIGHT: Find exact ref in snapshot, use that ref
```

### 3. Minimize Actions Per Operation

**Adding a Lesson (Optimized - 6 actions):**
1. `browser_navigate` → classroom URL
2. `browser_snapshot` → find course
3. `browser_click` → course to expand
4. `browser_snapshot` → find "Add" button
5. `browser_click` → "Add" button
6. `browser_fill_form` → fill title + content + save

**NOT: Click, wait, snapshot, click, wait, snapshot, click...**

### 4. Use `browser_type` with `submit: true` for Forms

```json
{
  "ref": "input-ref",
  "text": "content here",
  "submit": true
}
```

This avoids needing to find and click a separate submit button.

### 5. Use `browser_fill_form` for Multiple Fields

```json
{
  "fields": [
    {"name": "Title", "type": "textbox", "ref": "e1234", "value": "Lesson Title"},
    {"name": "Content", "type": "textbox", "ref": "e5678", "value": "Lesson content..."}
  ]
}
```

### 6. Wait Strategically, Not Excessively

Skool is slow but predictable:
- Page load: Use `browser_snapshot` to confirm loaded (look for expected elements)
- After click: 1-2 second wait max, then snapshot
- Don't use `browser_wait_for` unless waiting for specific text

### 7. Batch Similar Operations

When syncing multiple lessons to one course:
1. Navigate to course ONCE
2. Add all lessons in sequence
3. Don't re-navigate between lessons

---

## Common Skool UI Patterns

### Classroom Navigation

1. Go to `https://www.skool.com/{community-slug}/classroom`
2. Snapshot shows list of courses
3. Click course name to expand
4. Look for "Add" or "+" button in expanded view

### Lesson Editor

After clicking "Add":
- Title field: usually `textbox "Title"`
- Content area: look for rich text editor (contenteditable or textarea)
- Save button: "Publish" or "Save" button at bottom

### Community Post Flow

1. Go to `https://www.skool.com/{community-slug}`
2. Click "Write something" area
3. Fill title, content
4. Select category from dropdown
5. Click "Post"

### Element Reference Patterns

Common patterns in Skool snapshots:
- `textbox "Title"` → Title input
- `button "Post"` → Submit post
- `button "Publish"` → Publish lesson
- `generic [ref=eXXXX]` → Rich text editor area
- `link "Course Name"` → Course in list

---

## Sync Manifest Format

`_content/skool/.sync-manifest.json`:

```json
{
  "community_url": "https://www.skool.com/your-community",
  "last_full_sync": "2026-01-26T14:30:00Z",
  "synced": {
    "course-1/01-lesson.md": {
      "skool_url": "/your-community/classroom/...",
      "synced_at": "2026-01-26T14:25:00Z",
      "content_hash": "sha256:abc123...",
      "title": "Lesson Title"
    }
  },
  "community_posts": {
    "community/announcement.md": {
      "skool_url": "/your-community/post-slug",
      "synced_at": "2026-01-26T14:30:00Z",
      "pinned": false,
      "category": "General discussion"
    }
  }
}
```

---

## Content File Format

Each markdown file should have:

```markdown
# Lesson Title

**Type**: Lesson | Community Post

---

[Content here - plain text or markdown]
```

The title from the first `# ` heading becomes the Skool lesson/post title.

For community posts, optionally include:
```markdown
**Category**: General discussion | Ayuda | WINS
**Pin**: true
```

---

## Error Recovery

### Stale Element Error
**Symptom**: Click fails with "element not found"
**Fix**: Get fresh `browser_snapshot`, find new ref, retry

### Auth Expired
**Symptom**: Redirected to login page
**Fix**: Navigate to login, wait for manual auth, continue

### Wrong Element Clicked
**Symptom**: Unexpected UI state
**Fix**: `browser_navigate_back` or navigate to known URL, retry with correct ref

### Form Not Submitting
**Symptom**: Content not saved
**Fix**: Check for validation errors in snapshot, ensure all required fields filled

---

## Performance Tips

1. **Parallel reads**: Read all local files first, then batch UI operations
2. **Single course context**: Stay in one course view while adding multiple lessons
3. **Skip unchanged**: Compare content hashes before syncing
4. **Minimize snapshots**: Only snapshot when needed (after navigation, before unfamiliar click)

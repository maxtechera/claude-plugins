# Skool Plugin

Manage Skool communities via Playwright MCP browser automation.

## Features

- **Sync local content** to Skool classroom and community
- **Track sync state** with manifest file
- **Batch operations** for efficient content management
- **Optimized Playwright patterns** for fast, reliable automation

## Commands

| Command | Description |
|---------|-------------|
| `/skool-status` | Check sync status (local vs Skool) |
| `/skool-sync` | Sync all pending content to Skool |
| `/skool-add` | Add single lesson or community post |

## Requirements

- **Playwright MCP server** must be configured
- **Skool account** with access to your community
- **Content folder** at `_content/skool/` in your project

## Setup

### 1. Create Content Folder

```bash
mkdir -p _content/skool/{course-1,course-2,community}
```

### 2. Create Configuration

`_content/skool/skool.config.json`:

```json
{
  "community_url": "https://www.skool.com/your-community-slug",
  "community_name": "Your Community Name",
  "courses": {
    "course-1": {
      "skool_name": "Getting Started",
      "skool_index": 0
    },
    "course-2": {
      "skool_name": "Advanced Topics",
      "skool_index": 1
    }
  }
}
```

### 3. Create Content Files

`_content/skool/course-1/01-welcome.md`:

```markdown
# Welcome to the Course

**Type**: Lesson

---

Your lesson content here...
```

### 4. First Sync

```bash
# Check what would sync
/skool-sync --dry-run

# Sync content
/skool-sync
```

## Content Structure

```
_content/skool/
├── skool.config.json         # Community config (required)
├── .sync-manifest.json       # Sync state (auto-generated)
├── README.md                 # Optional documentation
├── course-1/                 # Maps to Skool course
│   ├── 01-welcome.md
│   └── 02-getting-started.md
├── course-2/
│   ├── m1-01-intro.md        # Module 1, Lesson 1
│   └── m1-02-basics.md
└── community/                # Community posts
    └── announcement.md
```

## File Format

### Lessons

```markdown
# Lesson Title

**Type**: Lesson

---

Content after the `---` becomes the lesson body.

Supports:
- Bullet points
- **Bold** and *italic*
- Links
- Code blocks
```

### Community Posts

```markdown
# Post Title

**Type**: Community Post
**Category**: General discussion
**Pin**: false

---

Post content here.
```

## Workflow

### Initial Setup

1. Set up your Skool community with course structure
2. Create local content matching the structure
3. Run `/skool-sync --init` to create manifest

### Adding Content

```bash
# Add from file
/skool-add lesson "Course Name" course-1/03-new-lesson.md

# Add interactively
/skool-add lesson "Course Name" "New Lesson Title"

# Add community post
/skool-add post community/update.md
```

### Checking Status

```bash
# Full status
/skool-status

# Quick local check (no browser)
/skool-status --local
```

### Syncing Changes

```bash
# Preview changes
/skool-sync --dry-run

# Sync everything
/skool-sync

# Sync one course
/skool-sync --course="Course Name"

# Force resync all
/skool-sync --force
```

## Playwright MCP Tips

The plugin includes optimized patterns for Skool automation:

1. **Always get fresh snapshots** before clicking (refs change after every action)
2. **Batch by course** - add all lessons to one course before navigating
3. **Use `browser_fill_form`** for multiple fields
4. **Minimize snapshots** - only after navigation or before unfamiliar UI

See `skills/skool-management.md` for detailed patterns.

## Troubleshooting

### Not Logged In

If you see auth errors, the Playwright session needs login:
1. The browser window should open
2. Manually log in to Skool
3. Re-run the command

### Element Not Found

Skool UI may have changed. Try:
1. Get a fresh snapshot to see current UI
2. Check the element ref matches what's expected
3. Report issue if persistent

### Content Not Saving

Check:
1. Content length (Skool has limits)
2. All required fields are filled
3. No validation errors in snapshot

## Author

Max Techera (max@maxtechera.dev)

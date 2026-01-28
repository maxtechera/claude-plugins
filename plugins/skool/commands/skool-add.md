---
description: Add single lesson or post to Skool - quick content additions
allowed-tools: Read, Write, Edit, mcp__playwright__browser_navigate, mcp__playwright__browser_snapshot, mcp__playwright__browser_click, mcp__playwright__browser_type, mcp__playwright__browser_fill_form, mcp__playwright__browser_press_key
---

# Skool Add Command

Quickly add a single lesson or community post to Skool.

## Usage

```
/skool-add lesson <course> <file>    - Add lesson from file
/skool-add lesson <course> "<title>" - Add lesson interactively
/skool-add post <file>               - Add community post from file
/skool-add post "<title>"            - Add community post interactively
```

## Examples

```
/skool-add lesson "Course Name" course-2/m4-01-new-lesson.md
/skool-add lesson 2 course-2/new-lesson.md
/skool-add post community/announcement.md
/skool-add post "Quick Update"
```

## Process: Add Lesson

### From File

1. **Read config** from `_content/skool/skool.config.json`
2. **Read file** from `_content/skool/` path
3. **Extract title** (first `# ` heading)
4. **Extract content** (everything after `---`)
5. **Navigate** to classroom
6. **Find course** and expand
7. **Click Add** button
8. **Fill form** with title and content
9. **Publish**
10. **Update manifest**

### Interactive (No File)

1. **Prompt** for lesson content
2. **Create temp content** or ask user to type
3. Same browser flow as above
4. **Offer to save** as local file after

## Process: Add Community Post

### From File

1. **Read config** for community URL
2. **Read file** from `_content/skool/community/` path
3. **Extract title** and content
4. **Check for metadata** (category, pin status)
5. **Navigate** to community page
6. **Click** write area
7. **Fill** title and content
8. **Select category** (default: General discussion)
9. **Post**
10. **Update manifest**

### Interactive

1. **Prompt** for title
2. **Prompt** for content (or open editor)
3. **Ask** for category
4. Same browser flow as above

## Optimized Browser Flow

### Lesson Addition (6 Steps)

```
Step 1: Navigate
  browser_navigate → {community_url}/classroom

Step 2: Find Course
  browser_snapshot → Look for course name in list

Step 3: Expand Course
  browser_click → ref of course link/button

Step 4: Open Add Dialog
  browser_snapshot → Find "Add" or "+" button
  browser_click → ref of add button

Step 5: Fill Form
  browser_snapshot → Find title input and content area
  browser_type → title field (ref from snapshot)
  browser_type → content area (ref from snapshot)

Step 6: Publish
  browser_snapshot → Find publish/save button
  browser_click → ref of publish button
```

### Community Post (5 Steps)

```
Step 1: Navigate
  browser_navigate → {community_url}

Step 2: Open Post Editor
  browser_snapshot → Find "Write something" area
  browser_click → ref of write area

Step 3: Fill Content
  browser_snapshot → Find title input and content area
  browser_type → title field
  browser_type → content area

Step 4: Select Category
  browser_snapshot → Find category dropdown
  browser_click → "Select a category" button
  browser_snapshot → Find category option
  browser_click → category option (e.g., "General discussion")

Step 5: Post
  browser_snapshot → Find Post button
  browser_click → Post button
```

## Course Name Matching

The `<course>` argument can be:
- **Full name**: "Claude Code Mastery"
- **Partial match**: "claude-code", "mastery"
- **Index number**: 1, 2, 3 (matches skool_index in config)
- **Folder name**: "course-2"

Match is case-insensitive and uses fuzzy matching against `skool.config.json`.

## Content Format

### Lesson File

```markdown
# Lesson Title

**Type**: Lesson

---

Lesson content here. Can include:

- Bullet points
- **Bold text**
- Links

Everything after the `---` is the lesson body.
```

### Community Post File

```markdown
# Post Title

**Type**: Community Post
**Category**: General discussion
**Pin**: true

---

Post content here.

Can include polls:
## POLL
- Option 1
- Option 2
```

## Output

### Success

```
## Added: Lesson Title

**Course**: Course Name
**Position**: Lesson 6
**URL**: https://www.skool.com/community/classroom/...

Manifest updated.
```

### Failure

```
✗ Failed to add lesson

**Error**: Could not find content area in lesson editor
**Snapshot**: [reference to debug snapshot]

Try:
1. Check Skool UI hasn't changed
2. Ensure you're logged in
3. Run with --debug for verbose output
```

## Flags

### `--no-manifest`

Don't update the sync manifest after adding.

### `--debug`

Output each step with snapshot details:

```
[DEBUG] Step 1: Navigate
  URL: https://www.skool.com/community/classroom
  Status: OK

[DEBUG] Step 2: Find Course
  Looking for: "Course Name"
  Found: ref=e4521

[DEBUG] Step 3: Expand Course
  Clicking: ref=e4521
  Result: OK

...
```

### `--category=NAME`

For posts, specify category directly:

```
/skool-add post file.md --category="WINS"
```

### `--pin`

For posts, pin to top of community:

```
/skool-add post file.md --pin
```

## Error Recovery

### Element Not Found

If a click target isn't found:
1. Get fresh snapshot
2. Search for alternative selectors
3. If still not found, output debug info

### Form Submission Failed

If content doesn't save:
1. Check for validation errors in snapshot
2. Verify content length is within limits
3. Retry once with fresh form

### Auth Required

If redirected to login:
1. Pause and notify user
2. Wait for manual login
3. Resume from last step

## Local File Creation

After interactive add, offer:

```
Lesson published successfully.

Save to local file?
  1. Yes, save to _content/skool/course-2/m4-01-new-lesson.md
  2. No, don't save locally
  3. Custom path
```

This keeps local content in sync with Skool.

$ARGUMENTS

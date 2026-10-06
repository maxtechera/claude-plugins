#!/usr/bin/env python3
"""Generate TASKS.md from tasks/*.md headers. Stdlib only.

Usage:
  tasks-index.py [root]              write <root>/TASKS.md
  tasks-index.py [root] --board      print full table, no write
  tasks-index.py [root] --session ID print that session's 8-column reply table
  tasks-index.py --selftest
Exit 0 with no output if there is no tasks/ dir.
"""
import os, re, subprocess, sys, time, tempfile

FIELDS = ("status", "owner", "session", "linear", "about")


def find_root(arg):
    if arg:
        return os.path.abspath(arg)
    try:
        out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, timeout=5)
        if out.returncode == 0 and out.stdout.strip():
            return out.stdout.strip()
    except Exception:
        pass
    return os.getcwd()


def parse(path):
    try:
        text = open(path, encoding="utf-8", errors="replace").read()
    except Exception:
        return None
    tid = os.path.splitext(os.path.basename(path))[0]
    t = {"id": tid, "title": "", "about": "", "status": "", "owner": "", "session": "",
         "linear": "", "activity": "", "summary": "", "next": "",
         "mtime": os.path.getmtime(path)}
    section = None
    last = None
    for line in text.splitlines():
        m = re.match(r"#\s+(.+?)\s+[—–-]+\s+(.*)$", line)
        if m and not t["title"] and not line.startswith("##"):
            t["id"], t["title"] = m.group(1).strip(), m.group(2).strip()
            continue
        if line.startswith("## "):
            section = line[3:].strip().lower()
            continue
        if section is None:
            m = re.match(r"([A-Za-z ]+):\s*(.*)$", line)
            if m:
                k = m.group(1).strip().lower()
                if k in FIELDS:
                    t[k] = m.group(2).strip()
        elif section.startswith("progress"):
            s = line.strip()
            if s and not s.startswith("<!--") and not s.startswith("-->"):
                last = s
    if last:
        last = last.lstrip("-* ").strip()
        m = re.match(r"(\d{1,2}:\d{2})\s+(.*)$", last)
        if m:
            t["activity"], rest = m.group(1), m.group(2)
        else:
            rest = last
        parts = [p.strip() for p in rest.split("|")]
        # parts: who | what | next | blocker
        if len(parts) >= 2:
            t["summary"] = parts[1]
        else:
            t["summary"] = rest
        if len(parts) >= 3:
            t["next"] = parts[2]
        if len(parts) >= 4 and parts[3] and parts[3].lower() not in ("none", "-", "—"):
            t["next"] = (t["next"] + " (blocked: " + parts[3] + ")").strip()
    if not t["activity"]:
        t["activity"] = time.strftime("%m-%d", time.localtime(t["mtime"]))
    return t


def load(root, sub="tasks"):
    d = os.path.join(root, sub)
    if not os.path.isdir(d):
        return None
    out = []
    for f in sorted(os.listdir(d)):
        if f.endswith(".md") and not f.startswith("_"):
            t = parse(os.path.join(d, f))
            if t:
                out.append(t)
    return out


def cell(s):
    return (s or "—").replace("|", "\\|").replace("\n", " ")


def _tmux(args):
    try:
        r = subprocess.run(["tmux"] + args, capture_output=True, text=True, timeout=1)
        return r.stdout if r.returncode == 0 else None
    except Exception:
        return None


def tmux_last_line(name):
    if _tmux(["has-session", "-t", name]) is None:
        return None
    out = _tmux(["capture-pane", "-p", "-t", name, "-S", "-40"])
    if not out:
        return None
    for line in reversed(out.splitlines()):
        line = re.sub(r"[\u2500-\u257f\u2580-\u259f>\u203a\u276f$#]+", " ", line)
        line = re.sub(r"\s+", " ", line).strip()
        if line:
            return line
    return None


def last_message(t, now=None):
    """Cheap 'last message': tmux pane line for live agents, else latest Progress 'what'."""
    status = (t.get("status") or "").lower()
    name = (re.split(r"[\s\u2192]+|->", t.get("owner", "").strip()) or [""])[0]
    if name and (status.startswith("doing") or status.startswith("review")):
        line = tmux_last_line(name)
        if line:
            return line[:80]
    msg = (t.get("summary") or "")[:80]
    m = re.match(r"(\d{1,2}):(\d{2})$", t.get("activity", ""))
    if msg and m and (status.startswith("doing") or status.startswith("review")):
        n = now or time.localtime()
        mins = (n.tm_hour * 60 + n.tm_min) - (int(m.group(1)) * 60 + int(m.group(2)))
        if mins > 15:
            msg = "quiet %dm \u00b7 %s" % (mins, msg)
    return msg


def what(t):
    return t.get("about") or t["title"]


def coord(t):
    return (t["session"].strip()[:8]) or "\u2014"


def board_table(tasks):
    rows = ["| ID | Title | Status | Owner | Coordinator | Linear | Last activity | Summary | Last message | Next |",
            "|---|---|---|---|---|---|---|---|---|---|"]
    for t in tasks:
        rows.append("| " + " | ".join(cell(coord(t) if k == "session" else what(t) if k == "title" else t[k]) for k in
                    ("id", "title", "status", "owner", "session", "linear",
                     "activity", "summary")) + " | " + cell(last_message(t)) +
                    " | " + cell(t["next"]) + " |")
    return "\n".join(rows)


def session_table(tasks, sid):
    mine = [t for t in tasks if sid and t["session"].strip() == sid]
    if not mine:
        return ""
    rows = ["| ID | Task | Agent | Coordinator | Last activity | Summary | Last message | Next |",
            "|---|---|---|---|---|---|---|---|"]
    for t in mine:
        rows.append("| " + " | ".join(cell(coord(t) if k == "session" else what(t) if k == "title" else t[k]) for k in
                    ("id", "title", "owner", "session", "activity", "summary")) + " | " +
                    cell(last_message(t)) + " | " + cell(t["next"]) + " |")
    return "\n".join(rows)


def done_list(root):
    done = load(root, os.path.join("tasks", "done")) or []
    cutoff = time.time() - 7 * 86400
    recent = [t for t in done if t["mtime"] >= cutoff]
    if not recent:
        return "_none_"
    return "\n".join("- %s — %s (%s)" % (t["id"], t["title"] or "untitled",
                                         t["status"] or "done") for t in recent)


def render(root, tasks):
    return ("<!-- Generated by tasks-index.py — do not edit -->\n"
            "# TASKS\n\nGenerated by tasks-index.py — do not edit. "
            "Source: tasks/*.md headers.\n\n" + board_table(tasks) +
            "\n\n## Done (last 7 days)\n\n" + done_list(root) + "\n")


def main(argv):
    if "--selftest" in argv:
        return selftest()
    board = "--board" in argv
    sid = None
    pos = []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--session":
            sid = argv[i + 1] if i + 1 < len(argv) else ""
            i += 1
        elif not a.startswith("--"):
            pos.append(a)
        i += 1
    root = find_root(pos[0] if pos else None)
    tasks = load(root)
    if tasks is None:
        return 0
    if sid is not None:
        out = session_table(tasks, sid)
        if out:
            print(out)
        return 0
    if board:
        print(board_table(tasks))
        return 0
    with open(os.path.join(root, "TASKS.md"), "w", encoding="utf-8") as f:
        f.write(render(root, tasks))
    return 0


def selftest():
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(os.path.join(d, "tasks", "done"))
        open(os.path.join(d, "tasks", "Q1.md"), "w").write(
            "# Q1 — Fix hints\nAbout: Make hints work\n\nStatus: doing\nOwner: luna\nSession: s-abc\nLinear: ENG-1\n"
            "May edit: a/**\n\n## Goal\nx\n\n## Progress\n<!-- c -->\n"
            "10:00 luna | started | write test | none\n"
            "10:20 luna | test written | run it | waiting on CI\n")
        open(os.path.join(d, "tasks", "L2.md"), "w").write(
            "# L2 — Payment\n\nStatus: todo\nOwner: sonnet\nSession: s-xyz\n\n## Progress\n")
        open(os.path.join(d, "tasks", "done", "Q0.md"), "w").write(
            "# Q0 — Old\n\nStatus: done(abc123)\n\n## Progress\n09:00 x | y | z |\n")
        assert main([d]) == 0
        txt = open(os.path.join(d, "TASKS.md")).read()
        assert "do not edit" in txt
        assert "| Q1 | Make hints work | doing | luna | s-abc | ENG-1 | 10:20 | test written | " in txt, txt
        assert "| run it (blocked: waiting on CI) |" in txt, txt
        assert "| L2 | Payment | todo | sonnet | s-xyz | — | " in txt, txt
        assert "Q0 — Old" in txt
        ts = load(d)
        st = session_table(ts, "s-abc")
        assert st.splitlines()[2].startswith("| Q1 | Make hints work | luna | s-abc | 10:20 |"), st
        assert "L2" not in st
        assert session_table(ts, "nope") == ""
        q = [t for t in ts if t["id"] == "Q1"][0]
        q["owner"] = "zz-no-such-tmux-session \u2192 x"
        old = time.strptime("2026-01-01 10:45", "%Y-%m-%d %H:%M")
        assert last_message(q, old).startswith("quiet 25m"), last_message(q, old)
        assert "test written" in last_message(q, old)
        fresh = time.strptime("2026-01-01 10:25", "%Y-%m-%d %H:%M")
        assert last_message(q, fresh) == "test written", last_message(q, fresh)
        assert "a \\| b" in cell("a | b")
        e = tempfile.mkdtemp()
        assert load(e) is None
        os.rmdir(e)
    print("selftest ok")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except AssertionError:
        raise
    except Exception:
        sys.exit(0)

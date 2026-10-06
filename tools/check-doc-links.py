#!/usr/bin/env python3
"""Check that every relative Markdown link in the repository resolves.

The documentation is the project's source of truth (AGENTS.md §0), so a broken
cross-reference is a real defect, not a cosmetic one. External (http/https) links
are intentionally NOT checked: network flakiness must never turn CI red.

Usage:
    python3 tools/check-doc-links.py [root]

Exit code 0 when every relative link resolves, 1 otherwise.
"""

from __future__ import annotations

import os
import re
import sys

LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")
SKIPPED_SCHEMES = ("http://", "https://", "mailto:", "tel:", "#")
SKIPPED_DIRS = {".git", "node_modules", ".turbo", "dist", "build"}


def iter_markdown_files(root: str):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIPPED_DIRS]
        for filename in sorted(filenames):
            if filename.endswith(".md"):
                yield os.path.join(dirpath, filename)


def check(root: str) -> int:
    checked = 0
    broken: list[str] = []

    for path in iter_markdown_files(root):
        relative_path = os.path.relpath(path, root)
        with open(path, encoding="utf-8") as handle:
            text = handle.read()

        for match in LINK_RE.finditer(text):
            target = match.group(2).strip()
            if target.startswith(SKIPPED_SCHEMES):
                continue

            file_part = target.split("#", 1)[0]
            if not file_part:
                continue

            checked += 1
            resolved = os.path.normpath(os.path.join(os.path.dirname(path), file_part))
            if not os.path.exists(resolved):
                line = text[: match.start()].count("\n") + 1
                broken.append(f"{relative_path}:{line}  [{match.group(1)}]({target})")

    print(f"relative links checked: {checked}")
    print(f"broken links:           {len(broken)}")
    for entry in broken:
        print(f"  {entry}")

    return 1 if broken else 0


if __name__ == "__main__":
    sys.exit(check(sys.argv[1] if len(sys.argv) > 1 else "."))

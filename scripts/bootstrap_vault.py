#!/usr/bin/env python3
"""Copy markdown notes into a vault area and inject baseline learning front matter."""

from __future__ import annotations

import argparse
from pathlib import Path


DEFAULTS = {
    "lernstatus": "neu",
    "lerntyp": "theorie",
    "modul_id": "UNSORTIERT",
    "pruefungsrelevanz": "mittel",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bootstrap markdown notes for obsidian-ausbildung-plugins.")
    parser.add_argument("--source", required=True, help="Folder with source markdown files.")
    parser.add_argument("--target", required=True, help="Target folder inside the destination vault.")
    parser.add_argument("--lernstatus", default=DEFAULTS["lernstatus"])
    parser.add_argument("--lerntyp", default=DEFAULTS["lerntyp"])
    parser.add_argument("--modul-id", default=DEFAULTS["modul_id"])
    parser.add_argument("--pruefungsrelevanz", default=DEFAULTS["pruefungsrelevanz"])
    parser.add_argument("--ausbildungsjahr", default="")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        return {}, text

    lines = text.splitlines()
    frontmatter: dict[str, str] = {}
    end_index = None
    for index, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end_index = index
            break
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        frontmatter[key.strip()] = value.strip().strip("\"'")

    if end_index is None:
        return {}, text

    body = "\n".join(lines[end_index + 1 :]).lstrip("\n")
    return frontmatter, body


def render_frontmatter(frontmatter: dict[str, str]) -> str:
    ordered_keys = [
        "lernstatus",
        "lerntyp",
        "modul_id",
        "pruefungsrelevanz",
        "ausbildungsjahr",
    ]
    lines = ["---"]
    for key in ordered_keys:
        value = frontmatter.get(key, "")
        if value:
            lines.append(f'{key}: "{value}"')
    lines.append("---")
    return "\n".join(lines)


def inject_defaults(text: str, defaults: dict[str, str]) -> str:
    existing, body = parse_frontmatter(text)
    merged = dict(existing)
    for key, value in defaults.items():
        if value and not merged.get(key):
            merged[key] = value
    frontmatter = render_frontmatter(merged)
    if body:
        return f"{frontmatter}\n\n{body.rstrip()}\n"
    return f"{frontmatter}\n"


def main() -> int:
    args = parse_args()
    source = Path(args.source).expanduser().resolve()
    target = Path(args.target).expanduser().resolve()

    if not source.exists():
        raise SystemExit(f"Source folder does not exist: {source}")
    if not source.is_dir():
        raise SystemExit(f"Source path is not a folder: {source}")
    if target.exists() and not target.is_dir():
        raise SystemExit(f"Target path is not a folder: {target}")
    if target == source or target in source.parents:
        raise SystemExit("Target folder must not be the same as or a parent of source.")
    if source in target.parents:
        raise SystemExit("Target folder must not live inside the source folder.")

    defaults = {
        "lernstatus": args.lernstatus,
        "lerntyp": args.lerntyp,
        "modul_id": args.modul_id,
        "pruefungsrelevanz": args.pruefungsrelevanz,
        "ausbildungsjahr": args.ausbildungsjahr,
    }

    markdown_files = sorted(source.rglob("*.md"))
    if not markdown_files:
        raise SystemExit("No markdown files found in source.")

    for source_file in markdown_files:
        relative_path = source_file.relative_to(source)
        target_file = target / relative_path
        new_text = inject_defaults(source_file.read_text(encoding="utf-8"), defaults)
        print(f"{source_file} -> {target_file}")
        if args.dry_run:
            continue
        target_file.parent.mkdir(parents=True, exist_ok=True)
        target_file.write_text(new_text, encoding="utf-8")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

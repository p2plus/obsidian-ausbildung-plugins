#!/usr/bin/env python3
"""Install one built plugin from this monorepo into an Obsidian vault."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


RUNTIME_FILES = ("main.js", "manifest.json", "styles.css")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Copy one built plugin into a target Obsidian vault."
    )
    parser.add_argument("--plugin", required=True, help="Plugin folder name, e.g. lernfortschritt-dashboard")
    parser.add_argument("--vault", required=True, help="Path to the target Obsidian vault")
    parser.add_argument("--repo", default=Path(__file__).resolve().parents[1], help="Path to the repo root")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without copying files")
    return parser.parse_args()


def ensure_runtime_exists(plugin_dir: Path) -> list[Path]:
    files: list[Path] = []
    missing: list[str] = []
    for name in RUNTIME_FILES:
        file_path = plugin_dir / name
        if file_path.exists():
            files.append(file_path)
        elif name != "styles.css":
            missing.append(name)
    if missing:
        raise SystemExit(
            f"Plugin runtime is incomplete in {plugin_dir}. Missing: {', '.join(missing)}. Run npm run build first."
        )
    return files


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo).expanduser().resolve()
    vault_root = Path(args.vault).expanduser().resolve()
    plugin_dir = repo_root / "plugins" / args.plugin
    target_dir = vault_root / ".obsidian" / "plugins" / args.plugin

    if not plugin_dir.is_dir():
        raise SystemExit(f"Unknown plugin directory: {plugin_dir}")
    if not vault_root.is_dir():
        raise SystemExit(f"Vault path is not a folder: {vault_root}")

    runtime_files = ensure_runtime_exists(plugin_dir)

    print(f"Installing {args.plugin}")
    print(f"  from: {plugin_dir}")
    print(f"  to:   {target_dir}")

    if args.dry_run:
        for file_path in runtime_files:
            print(f"  would copy: {file_path.name}")
        return 0

    target_dir.mkdir(parents=True, exist_ok=True)
    for file_path in runtime_files:
        shutil.copy2(file_path, target_dir / file_path.name)
        print(f"  copied: {file_path.name}")

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

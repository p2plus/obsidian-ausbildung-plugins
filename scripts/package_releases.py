#!/usr/bin/env python3
"""Package built plugins into per-plugin release folders and zip archives."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


RUNTIME_FILES = ("main.js", "manifest.json", "styles.css", "README.md")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create release folders and zip archives for built plugins."
    )
    parser.add_argument("--repo", default=Path(__file__).resolve().parents[1], help="Path to the repo root")
    parser.add_argument("--output", default="dist/releases", help="Output folder relative to repo root or absolute")
    return parser.parse_args()


def plugin_version(plugin_dir: Path) -> str:
    manifest = json.loads((plugin_dir / "manifest.json").read_text(encoding="utf-8"))
    return manifest["version"]


def built_plugins(plugins_root: Path) -> list[Path]:
    plugins: list[Path] = []
    for plugin_dir in sorted(plugins_root.iterdir()):
        if not plugin_dir.is_dir():
            continue
        if not (plugin_dir / "manifest.json").exists():
            continue
        if not (plugin_dir / "main.js").exists():
            raise SystemExit(f"Plugin is missing build output: {plugin_dir / 'main.js'}")
        plugins.append(plugin_dir)
    if not plugins:
        raise SystemExit("No built plugins found.")
    return plugins


def copy_runtime(plugin_dir: Path, release_dir: Path) -> None:
    release_dir.mkdir(parents=True, exist_ok=True)
    for name in RUNTIME_FILES:
        source = plugin_dir / name
        if source.exists():
            shutil.copy2(source, release_dir / name)


def write_zip(source_dir: Path, zip_path: Path) -> None:
    with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as archive:
        for file_path in sorted(source_dir.rglob("*")):
            if file_path.is_dir():
                continue
            archive.write(file_path, arcname=file_path.relative_to(source_dir.parent))


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo).expanduser().resolve()
    output_root = Path(args.output).expanduser()
    if not output_root.is_absolute():
        output_root = repo_root / output_root

    plugins_root = repo_root / "plugins"
    output_root.mkdir(parents=True, exist_ok=True)

    for plugin_dir in built_plugins(plugins_root):
        version = plugin_version(plugin_dir)
        plugin_id = plugin_dir.name
        release_parent = output_root / plugin_id
        release_dir = release_parent / f"{plugin_id}-{version}"
        if release_dir.exists():
            shutil.rmtree(release_dir)
        release_parent.mkdir(parents=True, exist_ok=True)
        copy_runtime(plugin_dir, release_dir)
        zip_path = release_parent / f"{plugin_id}-{version}.zip"
        if zip_path.exists():
            zip_path.unlink()
        write_zip(release_dir, zip_path)
        print(f"Packaged {plugin_id} {version}")
        print(f"  folder: {release_dir}")
        print(f"  zip:    {zip_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

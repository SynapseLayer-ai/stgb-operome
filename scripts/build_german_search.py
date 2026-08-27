#!/usr/bin/env python3
"""Build the German discovery index from the pinned official StGB XML package."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CORPUS = ROOT / "corpus" / "corpus.json"
DEFAULT_MANIFEST = ROOT / "source" / "german" / "2026-08-27" / "manifest.json"
DEFAULT_OUTPUT = ROOT / "corpus" / "german-search.json"


def read_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def collapse_text(element: ET.Element | None) -> str:
    if element is None:
        return ""
    return re.sub(r"\s+", " ", " ".join(element.itertext())).strip()


def section_numbers(reference: str) -> list[str]:
    return [number.lower() for number in re.findall(r"§\s*(\d+[a-z]?)", reference, re.I)]


def build(corpus_path: Path, manifest_path: Path) -> dict:
    corpus = read_json(corpus_path)
    manifest = read_json(manifest_path)
    artifact = manifest_path.parent / manifest["artifact"]
    actual_hash = sha256(artifact)
    if actual_hash != manifest["artifact_sha256"]:
        raise ValueError(
            f"German source checksum mismatch: expected {manifest['artifact_sha256']}, got {actual_hash}"
        )

    with zipfile.ZipFile(artifact) as archive:
        members = archive.namelist()
        if members != [manifest["xml_member"]]:
            raise ValueError(f"Unexpected XML package members: {members}")
        root = ET.fromstring(archive.read(manifest["xml_member"]))

    if root.attrib.get("builddate") != manifest["xml_builddate"]:
        raise ValueError("Official XML build timestamp does not match the manifest")

    stand_comments = [
        collapse_text(node) for node in root.findall("./norm/metadaten/standangabe/standkommentar")
    ]
    if manifest["standkommentar"] not in stand_comments:
        raise ValueError("Official consolidation statement does not match the manifest")

    official: dict[str, dict[str, str]] = {}
    for norm in root.findall("norm"):
        metadata = norm.find("metadaten")
        if metadata is None:
            continue
        reference = collapse_text(metadata.find("enbez"))
        match = re.fullmatch(r"§\s*(\d+[a-z]?)", reference, re.I)
        if not match:
            continue
        number = match.group(1).lower()
        official[number] = {
            "title_de": collapse_text(metadata.find("titel")),
            "text_de": collapse_text(norm.find("./textdaten/text/Content")),
            "source_url": f"https://www.gesetze-im-internet.de/stgb/__{number}.html",
        }

    sections: dict[str, dict] = {}
    for section in corpus["sections"]:
        numbers = section_numbers(section["ref"])
        if not numbers:
            raise ValueError(f"{section['id']}: no StGB section number in {section['ref']!r}")
        missing = [number for number in numbers if number not in official]
        if missing:
            raise ValueError(f"{section['id']}: German source missing {', '.join(missing)}")
        records = [official[number] for number in numbers]
        sections[section["id"]] = {
            "title_de": " / ".join(record["title_de"] for record in records),
            "text_de": " ".join(record["text_de"] for record in records),
            "source_urls": [record["source_url"] for record in records],
        }

    if len(sections) != len(corpus["sections"]):
        raise ValueError("German discovery index does not cover every corpus scope")

    return {
        "version": corpus["version"],
        "source": manifest["official_landing_url"],
        "retrieved": manifest["retrieved"],
        "source_artifact": {
            "url": manifest["official_artifact_url"],
            "path": artifact.relative_to(ROOT).as_posix(),
            "sha256": manifest["artifact_sha256"],
            "consolidation_date": manifest["consolidation_date"],
            "xml_builddate": manifest["xml_builddate"],
        },
        "sections": sections,
    }


def serialise(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--verify", action="store_true")
    args = parser.parse_args()

    generated = serialise(build(args.corpus, args.manifest))
    if args.verify:
        if not args.output.exists() or args.output.read_text(encoding="utf-8") != generated:
            print(f"{args.output} does not match the pinned German source", file=sys.stderr)
            return 1
        print(f"{args.output} matches the pinned German source")
        return 0

    args.output.write_text(generated, encoding="utf-8", newline="\n")
    print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

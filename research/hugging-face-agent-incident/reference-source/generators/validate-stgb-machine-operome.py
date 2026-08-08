#!/usr/bin/env python3
"""Package-specific source/XSD/reconstruction synchronization checks (R0-R5)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from lxml import etree
from lxml import html as lhtml


def local(node, name: str):
    return node.xpath(".//*[local-name()=$name]", name=name)


def source_facts(path: Path):
    root = lhtml.parse(str(path)).getroot()
    sections = root.xpath(
        "//section[contains(concat(' ', normalize-space(@class), ' '), ' secblock ')]"
    )
    scopes = {}
    rules = {}
    profiles = {}
    for section in sections:
        scope_id = section.get("id")
        scopes[scope_id] = {
            "condition": section.get("data-condition", ""),
            "variables": section.get("data-vars", "").split(),
            "description": section.get("data-description", ""),
        }
        for rule in section.xpath(".//span[@data-rule]"):
            rules[rule.get("data-rule")] = {
                "scope": scope_id,
                "kind": rule.get("data-kind", ""),
                "actor": rule.get("data-actor", ""),
                "body": rule.get("data-expression", ""),
            }
        if section.get("data-section-id"):
            profiles[section.get("data-section-id")] = {
                "scope": scope_id,
                "stgbRef": section.get("data-stgb-ref", ""),
                "capabilities": section.get("data-capabilities", ""),
                "materialisation": section.get("data-materialisation", ""),
                "rationale": section.get("data-rationale", ""),
                "subjective": section.get("data-subjective-elements", "").split(),
            }
    return scopes, rules, profiles


def xsd_facts(path: Path):
    root = etree.parse(str(path)).getroot()
    scopes = {}
    rules = {}
    profiles = {}
    for scope in local(root, "Scope"):
        scope_id = scope.get("id") or scope.get("name")
        conditions = local(scope, "Condition")
        descriptions = local(scope, "Description")
        scopes[scope_id] = {
            "condition": (conditions[0].text or "").strip(),
            "variables": [(item.text or "").strip() for item in local(scope, "Variable")],
            "description": (descriptions[0].text or "").strip(),
        }
    for rule in local(root, "Rule"):
        rules[rule.get("id")] = {
            "scope": rule.get("scope", ""),
            "kind": rule.get("kind", ""),
            "actor": rule.get("actor", ""),
            "body": (rule.text or "").strip(),
        }
    for profile in local(root, "MachineProfile"):
        section_id = profile.get("sectionId")
        rationales = local(profile, "Rationale")
        profiles[section_id] = {
            "scope": profile.get("scope", ""),
            "stgbRef": profile.get("stgbRef", ""),
            "capabilities": profile.get("capabilities", ""),
            "materialisation": profile.get("materialisation", ""),
            "rationale": (rationales[0].text or "").strip(),
            "subjective": [item.get("name", "") for item in local(profile, "SubjectiveElement")],
        }
    return scopes, rules, profiles


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_html", type=Path)
    parser.add_argument("xsd", type=Path)
    parser.add_argument("reconstruction_html", type=Path)
    parser.add_argument("reconstruction_json", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    source_scopes, source_rules, source_profiles = source_facts(args.source_html)
    xsd_scopes, xsd_rules, xsd_profiles = xsd_facts(args.xsd)
    metadata = json.loads(args.reconstruction_json.read_text(encoding="utf-8"))
    reconstruction = lhtml.parse(str(args.reconstruction_html)).getroot()
    reconstructed = {
        section.get("data-scope"): section
        for section in reconstruction.xpath("//section[@data-scope]")
    }

    checks = {
        "R0 XSD-only isolation": metadata.get("generator_inputs") == ["xsd", "renderer-version"],
        "R1 resolution": metadata.get("generation_status") == "pass" and not metadata.get("findings"),
        "R2 ownership": set(source_scopes) == set(xsd_scopes) == set(reconstructed),
        "R3 semantic coverage": source_scopes == xsd_scopes and source_rules == xsd_rules and source_profiles == xsd_profiles,
        "R4 logical fidelity": all(
            (section.xpath(".//pre")[0].text or "").strip() == source_scopes[scope_id]["condition"]
            for scope_id, section in reconstructed.items()
        ),
        "R5 readable clause": len(reconstructed) == len(source_scopes)
        and all(" ".join(section.xpath(".//*[contains(@class, 'reconstructed-clause')]//text()" )).strip() for section in reconstructed.values()),
    }
    for name, passed in checks.items():
        print(f"{'PASS' if passed else 'FAIL'} {name}")
    print(
        f"scopes={len(source_scopes)} rules={len(source_rules)} profiles={len(source_profiles)} "
        f"missing_atoms={0 if checks['R3 semantic coverage'] else 1} "
        f"extra_atoms={0 if checks['R3 semantic coverage'] else 1}"
    )
    if args.output is not None:
        passed = sum(1 for value in checks.values() if value)
        args.output.write_text(
            json.dumps(
                {
                    "status": "pass" if passed == len(checks) else "fail",
                    "passed": passed,
                    "failed": len(checks) - passed,
                    "missing_atoms": 0 if checks["R3 semantic coverage"] else 1,
                    "extra_atoms": 0 if checks["R3 semantic coverage"] else 1,
                    "checks": checks,
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
    return 0 if all(checks.values()) else 1


if __name__ == "__main__":
    raise SystemExit(main())

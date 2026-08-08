#!/usr/bin/env python3
"""Derive the StGB machine-enforcement XSD and review HTML from source markup."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

from lxml import etree
from lxml import html as lhtml


NS = "https://synapselayer.ai/operome/v1"


def words(value: str | None) -> list[str]:
    return [item for item in (value or "").split() if item]


def required(node, attribute: str) -> str:
    value = node.get(attribute)
    if not value:
        raise ValueError(f"{node.tag} is missing {attribute}")
    return value


def indented(lines: list[str], depth: int, value: str) -> None:
    lines.append("  " * depth + value)


def derive_xsd(source_html: Path, output_xsd: Path) -> dict[str, int]:
    document = lhtml.parse(str(source_html))
    root = document.getroot()
    sections = root.xpath(
        "//section[contains(concat(' ', normalize-space(@class), ' '), ' secblock ')]"
    )
    registers = root.xpath("//*[@id='substrate-register']//tr[@data-element]")
    enum_rows = root.xpath("//*[@id='enum-register']//tr[@data-enum]")

    if not sections or not registers or not enum_rows:
        raise ValueError("source parser returned a zero count for sections, elements, or enums")

    scopes: list[dict[str, object]] = []
    rules: list[dict[str, str]] = []
    profiles: list[dict[str, str]] = []
    seen_rules: set[str] = set()

    for section in sections:
        scope_id = required(section, "id")
        title = required(section, "data-title")
        condition = required(section, "data-condition")
        variables = words(required(section, "data-vars"))
        description = required(section, "data-description")
        scopes.append(
            {
                "id": scope_id,
                "title": title,
                "condition": condition,
                "variables": variables,
                "description": description,
            }
        )
        for rule in section.xpath(
            ".//span[contains(concat(' ', normalize-space(@class), ' '), ' r ') and @data-rule]"
        ):
            rule_id = required(rule, "data-rule")
            if rule_id in seen_rules:
                raise ValueError(f"duplicate rule id: {rule_id}")
            seen_rules.add(rule_id)
            rules.append(
                {
                    "id": rule_id,
                    "scope": scope_id,
                    "kind": required(rule, "data-kind"),
                    "actor": required(rule, "data-actor"),
                    "body": required(rule, "data-expression"),
                }
            )
        if section.get("data-section-id"):
            profiles.append(
                {
                    "scope": scope_id,
                    "sectionId": required(section, "data-section-id"),
                    "stgbRef": required(section, "data-stgb-ref"),
                    "title": title,
                    "capabilities": required(section, "data-capabilities"),
                    "materialisation": required(section, "data-materialisation"),
                    "rationale": required(section, "data-rationale"),
                    "subjective": section.get("data-subjective-elements", ""),
                }
            )

    if len(profiles) != 40:
        raise ValueError(f"expected 40 machine profiles, found {len(profiles)}")

    elements: list[dict[str, str]] = []
    seen_elements: set[str] = set()
    for row in registers:
        name = required(row, "data-element")
        if name in seen_elements:
            raise ValueError(f"duplicate element: {name}")
        seen_elements.add(name)
        elements.append(
            {
                "name": name,
                "type": required(row, "data-type"),
                "cascade": required(row, "data-cascade"),
                "input": required(row, "data-input"),
                "prompt": required(row, "data-prompt"),
                "surface": required(row, "data-surface"),
                "negated": row.get("data-negated-surface", ""),
                "default": row.get("data-default", ""),
                "definition": row.get("data-definition", ""),
                "boundary": row.get("data-external-boundary", ""),
            }
        )

    declared = {element["name"] for element in elements}
    for scope in scopes:
        missing = set(scope["variables"]) - declared
        if missing:
            raise ValueError(f"scope {scope['id']} references undeclared variables: {sorted(missing)}")

    lines: list[str] = []
    lines.append('<?xml version="1.0" encoding="UTF-8"?>')
    lines.append(
        f'<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" '
        f'xmlns="{NS}" xmlns:op="{NS}" targetNamespace="{NS}" '
        'elementFormDefault="qualified">'
    )
    indented(lines, 1, "<xs:annotation>")
    indented(
        lines,
        2,
        "<xs:documentation>Operome: StGB Machine Enforcement Overlay v1 | "
        "Policy source: SynapseLayer machine-enforcement policy 2026-08-08 | "
        "External legal substrate: stgb-operome-2026-06-10 | Governing language: English</xs:documentation>",
    )
    indented(lines, 1, "</xs:annotation>")

    for row in enum_rows:
        enum_name = required(row, "data-enum")
        values = words(required(row, "data-values"))
        indented(lines, 1, f"<xs:simpleType name={quoteattr(enum_name)}>")
        indented(lines, 2, '<xs:restriction base="xs:string">')
        for value in values:
            indented(lines, 3, f"<xs:enumeration value={quoteattr(value)}/>")
        indented(lines, 2, "</xs:restriction>")
        indented(lines, 1, "</xs:simpleType>")

    indented(lines, 1, '<xs:element name="OperomeStGBMachineEnforcement">')
    indented(lines, 2, "<xs:annotation>")
    indented(lines, 3, "<xs:appinfo>")
    indented(
        lines,
        4,
        '<ExternalCorpus id="stgb-operome-2026-06-10" role="source-derived-legal-substrate" '
        'actorTreatment="machine-is-not-a-natural-person"/>',
    )
    indented(lines, 4, "<SectionScopes>")
    for scope in scopes:
        indented(
            lines,
            5,
            f"<Scope id={quoteattr(str(scope['id']))} section={quoteattr(str(scope['title']))}>",
        )
        indented(lines, 6, f"<Condition>{escape(str(scope['condition']))}</Condition>")
        indented(lines, 6, f"<Description>{escape(str(scope['description']))}</Description>")
        indented(lines, 6, "<Variables>")
        for variable in scope["variables"]:
            indented(lines, 7, f"<Variable>{escape(str(variable))}</Variable>")
        indented(lines, 6, "</Variables>")
        indented(lines, 5, "</Scope>")
    indented(lines, 4, "</SectionScopes>")

    indented(lines, 4, "<MachineProfiles>")
    for profile in profiles:
        indented(
            lines,
            5,
            f"<MachineProfile scope={quoteattr(profile['scope'])} "
            f"sectionId={quoteattr(profile['sectionId'])} stgbRef={quoteattr(profile['stgbRef'])} "
            f"capabilities={quoteattr(profile['capabilities'])} "
            f"materialisation={quoteattr(profile['materialisation'])}>",
        )
        indented(lines, 6, f"<Rationale>{escape(profile['rationale'])}</Rationale>")
        for subjective in words(profile["subjective"]):
            indented(lines, 6, f"<SubjectiveElement name={quoteattr(subjective)} status=\"not_assessed_for_machine\"/>")
        indented(lines, 5, "</MachineProfile>")
    indented(lines, 4, "</MachineProfiles>")

    indented(lines, 4, "<BusinessRules>")
    for rule in rules:
        indented(
            lines,
            5,
            f"<Rule id={quoteattr(rule['id'])} scope={quoteattr(rule['scope'])} "
            f"kind={quoteattr(rule['kind'])} actor={quoteattr(rule['actor'])}>"
            f"{escape(rule['body'])}</Rule>",
        )
    indented(lines, 4, "</BusinessRules>")
    indented(lines, 3, "</xs:appinfo>")
    indented(lines, 2, "</xs:annotation>")
    indented(lines, 2, "<xs:complexType>")
    indented(lines, 3, "<xs:sequence>")

    builtin = {"xs:string", "xs:boolean", "xs:integer", "xs:decimal"}
    for element in elements:
        type_name = element["type"] if element["type"] in builtin else f"op:{element['type']}"
        default_attr = f" default={quoteattr(element['default'])}" if element["default"] else ""
        indented(
            lines,
            4,
            f"<xs:element name={quoteattr(element['name'])} type={quoteattr(type_name)} "
            f"minOccurs=\"0\"{default_attr}>",
        )
        indented(lines, 5, "<xs:annotation>")
        documentation = (
            f"Layer: Core | Cascade: {element['cascade']} | Prompt: {element['prompt']} | "
            f"Input: {element['input']}"
        )
        indented(lines, 6, f"<xs:documentation>{escape(documentation)}</xs:documentation>")
        indented(lines, 6, "<xs:appinfo>")
        indented(lines, 7, f"<SurfaceForm>{escape(element['surface'])}</SurfaceForm>")
        if element["negated"]:
            indented(lines, 7, f"<NegatedSurfaceForm>{escape(element['negated'])}</NegatedSurfaceForm>")
        if element["boundary"]:
            indented(lines, 7, f"<ExternalBoundary source={quoteattr(element['boundary'])}/>")
        if element["definition"]:
            indented(
                lines,
                7,
                f"<Computable name={quoteattr(element['name'])} dataType=\"Boolean\">",
            )
            indented(lines, 8, f"<Definition>{escape(element['definition'])}</Definition>")
            indented(lines, 7, "</Computable>")
        indented(lines, 6, "</xs:appinfo>")
        indented(lines, 5, "</xs:annotation>")
        indented(lines, 4, "</xs:element>")

    indented(lines, 3, "</xs:sequence>")
    indented(lines, 2, "</xs:complexType>")
    indented(lines, 1, "</xs:element>")
    lines.append("</xs:schema>")
    output_xsd.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return {
        "sections": len(scopes),
        "profiles": len(profiles),
        "elements": len(elements),
        "rules": len(rules),
    }


def build_review(
    source_html: Path,
    output_html: Path,
    reconstruction: Path | None,
    comparison_json: Path | None,
) -> None:
    document = lhtml.parse(str(source_html))
    root = document.getroot()
    annex = root.get_element_by_id("reconstruction-annex")
    annex.clear()
    annex.set("class", "annex")
    annex.set("id", "reconstruction-annex")
    heading = etree.SubElement(annex, "h2")
    heading.text = "Reconstruction from the substrate"
    note = etree.SubElement(annex, "p")
    note.set("class", "note")
    note.text = "Generated from the XSD alone; the source columns were not inputs to reconstruction."
    if reconstruction is None:
        pending = etree.SubElement(annex, "p")
        pending.text = "Reconstruction pending."
    else:
        fragment_text = reconstruction.read_text(encoding="utf-8")
        fragments = lhtml.fragments_fromstring(fragment_text)
        for fragment in fragments:
            if isinstance(fragment, str):
                span = etree.SubElement(annex, "span")
                span.text = fragment
            else:
                annex.append(fragment)
    if comparison_json is not None:
        comparison = json.loads(comparison_json.read_text(encoding="utf-8"))
        summary = etree.SubElement(annex, "p")
        summary.set("class", "reconstruction-comparison")
        summary.set("data-status", comparison["status"])
        summary.text = (
            f"Source comparison: {comparison['status']}; R0-R5: {comparison['passed']}/6 pass; "
            f"missing atoms: {comparison['missing_atoms']}; extra atoms: {comparison['extra_atoms']}."
        )
    output_html.write_text(
        lhtml.tostring(root, encoding="unicode", doctype="<!doctype html>") + "\n",
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_html", type=Path)
    parser.add_argument("output_xsd", type=Path)
    parser.add_argument("output_html", type=Path)
    parser.add_argument("--reconstruction", type=Path)
    parser.add_argument("--comparison-json", type=Path)
    args = parser.parse_args()
    counts = derive_xsd(args.source_html, args.output_xsd)
    build_review(
        args.source_html,
        args.output_html,
        args.reconstruction,
        args.comparison_json,
    )
    print(" | ".join(f"{name}={value}" for name, value in counts.items()))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

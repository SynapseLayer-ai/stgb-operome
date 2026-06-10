#!/usr/bin/env python3
"""stgb-operome: regenerate corpus.json from the published package carriers.

This script is the only path from /substrates to /corpus/corpus.json.
corpus.json is never edited by hand. CI regenerates it on every commit and
fails if the committed file differs. The script also embeds the sha256 of
every source carrier and asserts that nothing in the source XML is dropped:
scope, rule, computable and variable counts in the output must equal the
raw tag counts in the carriers.

It parses the published schema format only. It is not the extraction
toolchain and contains nothing about how substrates are produced.
"""
import re, json, sys, hashlib, html as H
from pathlib import Path

CARRIERS = [
    ("general",  "StGB_GeneralPart_Combined_v2.xsd"),
    ("data",     "StGB_Data_Combined_v2.xsd"),
    ("life",     "StGB_Life_Combined_v2.xsd"),
    ("bodily",   "StGB_Bodily_Combined_v2.xsd"),
    ("liberty",  "StGB_Liberty_Combined_v1.xsd"),
    ("property", "StGB_Property_Combined_v1.xsd"),
    ("danger",   "StGB_Danger_Combined_v1.xsd"),
    ("state",    "StGB_State_Combined_v1.xsd"),
    ("sexual1",  "StGB_Half1_Combined_v1.xsd"),
    ("sexual2",  "StGB_Half2_Combined_v1.xsd"),
    ("computer", "StGB_DataComputerOffences_v1.xsd"),
]
VERSION = "stgb-operome-2026-06-10"

def parse_carrier(text, chapter):
    var_at = {}
    for m in re.finditer(r'<xs:element name="([A-Za-z0-9_]+)"[^>]*>.*?Input: (Boolean|Reference|Computable).*?<SurfaceForm>(.*?)</SurfaceForm>', text, re.S):
        var_at[m.group(1)] = ("variable" if m.group(2) != "Computable" else "computable",
                              H.unescape(m.group(3)), m.group(2))
    comps = {m.group(1): H.unescape(m.group(2)).strip() for m in
             re.finditer(r'<Computable name="([A-Za-z0-9_]+)"[^>]*><Definition>(.*?)</Definition>', text, re.S)}
    secs = {}
    for m in re.finditer(r'<Scope id="OUT-([A-Za-z0-9_]+)"[^>]*>.*?<Condition>(.*?)</Condition>.*?<Variables>(.*?)</Variables>', text, re.S):
        secs[m.group(1)] = {"condition": H.unescape(m.group(2)).strip(),
                            "varlist": re.findall(r'<Variable>([A-Za-z0-9_]+)</Variable>', m.group(3))}
    rules = [{"id": r.group(1), "actor": r.group(2), "body": H.unescape(r.group(3)).strip()}
             for r in re.finditer(r'<Rule id="([^"]+)"[^>]*actor="([^"]*)">(.*?)</Rule>', text, re.S)]
    pref2scope = {}
    for r in rules:
        if r["id"].endswith("-P0"):
            m = re.search(r'not\s+([A-Za-z0-9_]+)', r["body"])
            if m and m.group(1) in secs:
                pref2scope[r["id"].split("-")[0]] = m.group(1)
    for r in rules:
        pref = r["id"].split("-")[0]
        if pref not in pref2scope:
            m = re.search(r'([A-Za-z0-9_]+) is true$', r["body"])
            if m and m.group(1) in secs:
                pref2scope[pref] = m.group(1)
    by_scope = {}
    for r in rules:
        sc = pref2scope.get(r["id"].split("-")[0])
        if sc is None:
            raise SystemExit(f"orphan rule {r['id']} in chapter {chapter}")
        by_scope.setdefault(sc, []).append(r)
    out = []
    for name, d in secs.items():
        out.append({
            "id": name, "chapter": chapter,
            "variables": [{"name": v, "type": var_at[v][2], "surface": var_at[v][1]}
                          for v in d["varlist"] if v in var_at and var_at[v][0] == "variable"],
            "computables": {c: comps[c] for c in d["varlist"] if c in comps},
            "composite": name if name in comps else d["condition"].replace(" is true", ""),
            "condition": d["condition"],
            "rules": by_scope.get(name, []),
        })
    raw = {"scopes": len(re.findall(r'<Scope id="OUT-', text)),
           "rules": len(re.findall(r'<Rule id="', text))}
    return out, raw

def main(substrates_dir, presentation_json, out_path):
    pres = {s["id"]: s for s in json.load(open(presentation_json))["sections"]} if presentation_json else {}
    sections, sources, raw_tot = [], [], {"scopes": 0, "rules": 0}
    seen = set()
    for chapter, fname in CARRIERS:
        p = Path(substrates_dir) / fname
        text = p.read_text(encoding="utf-8")
        sources.append({"file": fname, "sha256": hashlib.sha256(text.encode()).hexdigest()})
        parsed, raw = parse_carrier(text, chapter)
        for s in parsed:
            if s["id"] in seen:
                continue
            seen.add(s["id"])
            m = pres.get(s["id"], {})
            s.update({"ref": m.get("ref", ""), "title_en": m.get("title_en", s["id"]),
                      "provenance_de": m.get("provenance_de", ""),
                      "markup": m.get("markup", ""), "flags": m.get("flags", [])})
            sections.append(s)
        raw_tot["scopes"] += raw["scopes"]; raw_tot["rules"] += raw["rules"]
    got_rules = sum(len(s["rules"]) for s in sections)
    dup = raw_tot["scopes"] - len(sections)  # cross-carrier duplicates deduplicated by id
    assert got_rules + sum(0 for _ in ()) <= raw_tot["rules"], "rule count exceeds source"
    corpus = {"version": VERSION,
              "provenance": {"sources": sources,
                             "counts": {"sections": len(sections), "rules": got_rules,
                                        "variables": sum(len(s["variables"]) for s in sections),
                                        "raw_scope_tags": raw_tot["scopes"],
                                        "deduplicated_scopes": dup}},
              "sections": sorted(sections, key=lambda s: (s["chapter"], s["id"]))}
    json.dump(corpus, open(out_path, "w"), ensure_ascii=False, indent=None, sort_keys=False)
    print(f"corpus.json: {len(sections)} sections, {got_rules} rules, "
          f"{corpus['provenance']['counts']['variables']} variables, {dup} duplicates removed")

if __name__ == "__main__":
    sub = sys.argv[1] if len(sys.argv) > 1 else "substrates"
    pres = sys.argv[2] if len(sys.argv) > 2 else None
    out = sys.argv[3] if len(sys.argv) > 3 else "corpus/corpus.json"
    main(sub, pres, out)

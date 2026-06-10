#!/usr/bin/env python3
"""stgb-operome CLI: local, deterministic evaluation against corpus.json.

No network, no server, no dependencies. Evaluation is pure: the same facts
always produce the same result, on your machine, against the committed corpus.

Usage:
  python scripts/operome_cli.py sections [CHAPTER]
  python scripts/operome_cli.py show SECTION
  python scripts/operome_cli.py evaluate SECTION var=true var=false [var=unknown ...]
  python scripts/operome_cli.py master var=value [...]
      (evaluates the Section 13 master rule; ExceptionActApplies is derived
       from the SelfDefence, JustifyingNecessity and ConsentJustification
       composites on the supplied facts, limited by the CounterException)

SECTION accepts the scope id (UnlawfulKilling) or the paragraph number (211).
Facts not supplied are unknown. Numeric variables accept numbers (Age=17).
"""
import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from reference_evaluator import Ev, tokens

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
CORPUS = os.path.join(ROOT, "corpus", "corpus.json")

def load():
    c = json.load(open(CORPUS, encoding="utf-8"))
    by_id = {s["id"]: s for s in c["sections"]}
    by_ref = {}
    for s in c["sections"]:
        for tok in s.get("ref", "").replace("\u00a7", "").replace(",", " ").split():
            by_ref.setdefault(tok, s)
    return c, by_id, by_ref

def find(key, by_id, by_ref):
    s = by_id.get(key) or by_ref.get(key.replace("\u00a7", ""))
    if not s:
        sys.exit(f"unknown section: {key} (try 'sections' to list)")
    return s

def parse_facts(args):
    facts = {}
    for a in args:
        if "=" not in a:
            sys.exit(f"facts take the form Name=true|false|unknown|number, got: {a}")
        k, v = a.split("=", 1)
        facts[k] = v
    return facts

def value(sec, facts, name):
    return Ev(sec["computables"], facts).value(name)

def report(sec, facts):
    e = Ev(sec["computables"], facts)
    v = e.expr(tokens(sec["condition"]), [0])
    result = {"true": "REALISED", "false": "NOT REALISED"}.get(v, "UNKNOWN")
    print(f"{sec['ref']}  {sec['id']}")
    print(f"composite  {sec['condition']}")
    print(f"result     {result}")
    print("derivation")
    for c in sec["computables"]:
        print(f"  [{c}] = {value(sec, facts, c)}")
    missing = [vr["name"] for vr in sec["variables"] if vr["name"] not in facts]
    if missing and result == "UNKNOWN":
        print("unknown variables:", ", ".join(missing))
    flags = [f["title"] for f in sec.get("flags", []) if "valuat" in f.get("text", "") or "scalat" in f.get("text", "")]
    if flags:
        print("escalation flags:", "; ".join(flags))
    return v

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__); return
    cmd = sys.argv[1]
    corpus, by_id, by_ref = load()
    if cmd == "sections":
        ch = sys.argv[2] if len(sys.argv) > 2 else None
        for s in corpus["sections"]:
            if ch and s["chapter"] != ch: continue
            print(f"{s['chapter']:9} {s.get('ref',''):14} {s['id']}")
    elif cmd == "show":
        s = find(sys.argv[2], by_id, by_ref)
        print(f"{s.get('ref','')}  {s['id']}  [{s['chapter']}]")
        print(s.get("provenance_de", ""))
        print(f"\ncomposite: {s['condition']}\n\nvariables:")
        for v in s["variables"]:
            print(f"  {{{v['name']}}}  ({v['type']})  {v['surface']}")
        print("\ncomputables:")
        for k, d in s["computables"].items():
            print(f"  [{k}] := {d}")
        print("\nrules:")
        for r in s["rules"]:
            print(f"  {r['id']:10} {r['body'][:100]}")
    elif cmd == "evaluate":
        s = find(sys.argv[2], by_id, by_ref)
        report(s, parse_facts(sys.argv[3:]))
    elif cmd == "master":
        facts = parse_facts(sys.argv[2:])
        exc = []
        for name in ("SelfDefence", "JustifyingNecessity", "ConsentJustification"):
            exc.append(value(by_id[name], facts, name))
        counter = value(by_id["CounterException"], facts, "CounterException")
        if "true" in exc and counter != "true":
            facts["ExceptionActApplies"] = "true"
        elif all(v == "false" for v in exc) or counter == "true":
            facts["ExceptionActApplies"] = "false"
        else:
            facts["ExceptionActApplies"] = "unknown"
        print(f"exception acts: SelfDefence={exc[0]} JustifyingNecessity={exc[1]} "
              f"ConsentJustification={exc[2]} CounterException={counter}")
        print(f"=> ExceptionActApplies = {facts['ExceptionActApplies']}\n")
        report(by_id["MasterRule"], facts)
    else:
        sys.exit(f"unknown command: {cmd} (sections | show | evaluate | master)")

if __name__ == "__main__":
    main()

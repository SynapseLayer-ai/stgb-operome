#!/usr/bin/env python3
"""stgb-operome: reference evaluator and golden-vector verifier.

Implements the rule-expression dialect over Kleene three-valued logic:
  expr := term (("and"|"or") term)*
  term := ["not"] (comparison | ident ["is true"|"is false"] | "(" expr ")")
  comparison := operand ("<"|"<="|">"|">="|"="|"!=") operand
'X' alone means 'X is true'. 'X is false' over unknown is unknown.
Comparisons over unknown or non-numeric operands evaluate to unknown.
Identifiers resolve to the section's computables first, then to facts;
anything unresolved is unknown. Pure and deterministic by construction.

Usage: reference_evaluator.py corpus.json tests.json
Exits non-zero if any golden vector disagrees.
"""
import re, json, sys

TOK = re.compile(r'\s*(\(|\)|<=|>=|!=|<|>|=|and\b|or\b|not\b|is true\b|is false\b|[A-Za-z0-9_]+)')
NUM = re.compile(r'^\d+$')

def tokens(e):
    out, i = [], 0
    while i < len(e):
        m = TOK.match(e, i)
        if not m: raise ValueError(f"cannot tokenise: {e[i:i+30]!r}")
        out.append(m.group(1)); i = m.end()
    return out

class Ev:
    def __init__(self, comps, facts):
        self.c, self.f, self.stack = comps, facts, set()
    def value(self, n):
        if NUM.match(n): return n
        if n in self.c:
            if n in self.stack: raise ValueError("cycle at " + n)
            self.stack.add(n); v = self.expr(tokens(self.c[n]), [0]); self.stack.discard(n)
            return v
        return self.f.get(n, "unknown")
    def expr(self, t, p):
        v = self.term(t, p)
        while p[0] < len(t) and t[p[0]] == "or":
            p[0] += 1; r = self.term(t, p)
            v = "true" if "true" in (v, r) else ("unknown" if "unknown" in (v, r) else "false")
        return v
    def term(self, t, p):
        v = self.fact(t, p)
        while p[0] < len(t) and t[p[0]] == "and":
            p[0] += 1; r = self.fact(t, p)
            v = "false" if "false" in (v, r) else ("unknown" if "unknown" in (v, r) else "true")
        return v
    def fact(self, t, p):
        if t[p[0]] == "not":
            p[0] += 1; v = self.fact(t, p)
            return {"true": "false", "false": "true"}.get(v, "unknown")
        if t[p[0]] == "(":
            p[0] += 1; v = self.expr(t, p); assert t[p[0]] == ")"; p[0] += 1
        else:
            n = t[p[0]]; p[0] += 1; v = self.value(n)
        if p[0] < len(t) and t[p[0]] in ("<", "<=", ">", ">=", "=", "!="):
            op = t[p[0]]; p[0] += 1; rv = self.value(t[p[0]]); p[0] += 1
            try: a, b = float(v), float(rv)
            except (ValueError, TypeError): return "unknown"
            v = "true" if {"<": a < b, "<=": a <= b, ">": a > b, ">=": a >= b,
                           "=": a == b, "!=": a != b}[op] else "false"
        if p[0] < len(t) and t[p[0]] in ("is true", "is false"):
            op = t[p[0]]; p[0] += 1
            if v == "unknown": return "unknown"
            v = "true" if v == ("true" if op == "is true" else "false") else "false"
        return v

def evaluate(section, facts):
    v = Ev(section["computables"], facts).expr(tokens(section["condition"]), [0])
    return {"true": "realised", "false": "not_realised"}.get(v, "unknown")

def main(corpus_path, tests_path):
    corpus = {s["id"]: s for s in json.load(open(corpus_path))["sections"]}
    tests = json.load(open(tests_path))["tests"]
    fails = 0
    for t in tests:
        got = evaluate(corpus[t["section"]], t["facts"])
        if got != t["expected"]:
            fails += 1
            if fails <= 10:
                print(f"FAIL {t['section']} {t['label']}: expected {t['expected']}, got {got}")
    print(f"{len(tests)} vectors, {fails} failures")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])

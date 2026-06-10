# stgb-operome

**The German Criminal Code, compiled into an open, deterministic rule layer any AI agent can query.**

This repository contains the first criminal code released as an executable, provenance-complete
constraint layer for AI agents: 105 section scopes and 1,381 business rules compiled from the
objective elements of the Strafgesetzbuch (StGB) into deterministic, auditable structure, with the
code's own exceptions carried as conditional structure and every evaluative or interpretive element
flagged for escalation rather than pretended resolved.

This is not the penal code encoded into a robot, and it does not make any agent "criminally
compliant". It is a set of authoritative, jurisdiction-grounded definitions of prohibited conduct,
expressed in a form a machine can check before it acts, with every decision traceable to the
provision that produced it.

## Read this before anything else

1. **The German text governs.** The English layer throughout this repository is an unofficial
   machine translation maintained for accessibility and open for correction.
2. **Provenance.** The source is the consolidated text of the Strafgesetzbuch at
   [gesetze-im-internet.de](https://www.gesetze-im-internet.de/stgb/).
   Consolidation date pinned at release: **20.3.2026**.
3. **This is not a restatement of German law.** Selections, deletions and a small number of
   deliberate transformations were made under published principles; every deletion is visible as
   struck text in the review documents and every transformation is disclosed by name in
   [ENCODING_PRINCIPLES.md](ENCODING_PRINCIPLES.md).
4. **This is not legal advice.** Nothing in this corpus determines criminal liability, which
   remains a judicial question on the full offence, including the elements deliberately not
   compiled here.

## What is in the repository

| Path | Content |
| --- | --- |
| `substrates/` | The ten package carriers (XSD), the authoritative machine layer |
| `corpus/corpus.json` | The same content in the serving format, generated only by `scripts/xsd_to_json.py` |
| `corpus/tests.json` | 3,033 golden vectors with expected outcomes; any implementation passing them implements the dialect correctly |
| `corpus/SCHEMA.md` | The JSON shape, the expression grammar and the three-valued semantics |
| `review/` | Ten section-by-section review documents: source text beside the markup, every strike visible |
| `scripts/` | The XSD-to-JSON generator and the reference evaluator |
| `.github/workflows/` | CI that regenerates `corpus.json` from `substrates/` on every commit and fails on any difference |

Corpus statistics: 105 scopes across ten chapters, 1,381 rules, 1,359 variables. The
`provenance` block of `corpus.json` embeds the sha256 of every source carrier and the count
arithmetic, so nothing can be dropped silently.

## Quick start

Verify the corpus yourself:

```
python scripts/reference_evaluator.py corpus/corpus.json corpus/tests.json
python scripts/xsd_to_json.py substrates corpus/corpus.json /tmp/regenerated.json
```

MCP server: the corpus is queryable at **operome.dev** (endpoint and configuration blocks for
Claude Code and Codex are published there). The server exposes section retrieval, schema retrieval,
deterministic evaluation of fact patterns with full derivation traces, and the master-rule check.

## Status

This is a first discussion draft. We invite scrutiny: contest the encodings, find the loopholes,
correct the translation, extend the coverage. See [CONTRIBUTING.md](CONTRIBUTING.md) for the three
issue templates. The constraint layer for AI should be argued over in public, against its sources,
by people who disagree.

Released by [SynapseLayer](https://synapselayer.ai). Contact: rk@synapselayer.ai

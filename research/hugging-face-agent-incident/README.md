# StGB machine enforcement and controlled incident replay

This directory publishes the machine-enforcement overlay and the safe local evidence package used
to examine incident-derived decision points from the July 2026 OpenAI and Hugging Face incident.

The package is research evidence, not a reproduction of the intrusion. It made no model calls,
network calls or process executions, used no real credentials or exploit payloads, and addressed
only `mock://` targets. It does not establish criminal liability, predict model behaviour or prove
production containment.

## Read the evidence

- [Article](ARTICLE.md)
- [Reader-facing v2 replay report](replay/StGB_HuggingFace_Chokepoint_Replay_v2.report.html)
- [Machine-readable v2 evidence](replay/StGB_HuggingFace_Chokepoint_Replay_v2.evidence.json)
- [V2 scenario and policy pack](replay/StGB_HuggingFace_Chokepoint_Replay_v2.scenarios.json)
- [Human-readable v3 protocol](preregistration/StGB_Heldout_Generalisation_v3.md)
- [Machine-readable v3 protocol](preregistration/StGB_Heldout_Generalisation_v3.preregistration.json)
- [V3 registration receipt](preregistration/StGB_Heldout_Generalisation_v3.registration-receipt.json)
- [Machine overlay review HTML](machine-overlay/StGB_Machine_Enforcement_v1.html)
- [Machine overlay XSD](machine-overlay/StGB_Machine_Enforcement_v1.xsd)
- [Validation record](machine-overlay/StGB_Machine_Enforcement_v1.validation.json)

## What the completed replay found

Version 2 compares the same ten fixed-fact scenarios against three progressively stronger
baselines:

| Baseline | Operome changes |
| --- | ---: |
| Endpoint and operation ACL | 5 |
| Exact object capabilities | 3 |
| Fitted contextual policy | 0 |

The contextual policy was authored after the incident and with the scenarios visible. The zero is
therefore a fitted decision-equivalence control, not a prospective generalisation result. It is
published rather than discarded.

The reference monitor made six mock blocks, one mock escalation and three mock dispatches. The
first boundary crossing was stopped by ordinary destination allowlisting. The report distinguishes
that capability result from agreement or classification supplied by the Operome.

## What the sealed protocol does not show

Version 3 is a design for a possible prospective held-out study. Its protocol hash is:

`72b4acdee82a4c64a6b08db4f37604467eb9ff2fd7045dc643bb67a42257ed8c`

Zero held-out scenarios have been executed and no comparative result exists. The programme is
paused. The protocol's empirical publication gate remains on hold. If the study is resumed, its
independent construction, German-law review and frozen-input requirements must be satisfied before
any result claim is published.

## Frozen inputs

The root `corpus/corpus.json` is the current public corpus. It is not byte-identical to the corpus
snapshot used by the replay. The exact frozen snapshot is preserved at
`frozen-inputs/corpus.json`; substituting the current corpus would invalidate the v3 receipt.

The `reference-source/` directory preserves the exact application runtime, tests and generators
whose hashes appear in the evidence records. Those TypeScript sources are an archival snapshot and
retain their original application imports. They are not presented as a standalone package in this
repository.

## Verify it

From the repository root:

```text
python scripts/verify_machine_research_package.py
```

The verifier checks:

- every file listed in `SHA256SUMS.txt`;
- the canonical v2 scenario-pack hash and every audit-chain record;
- the v3 canonical protocol hash, audit chain and zero-execution state;
- all six frozen-file receipts and three frozen canonical policy objects;
- the hashes recorded by the machine-overlay validation report.

## Legal and technical status

The German statutory text governs. The English descriptions and machine mappings are unofficial
and legally unreviewed. Structural validation is not German-law approval. In particular, historical
scenario `IR2-004` is quarantined from section 202c coverage claims because selecting a general
programme for a prohibited current use does not establish the programme's objective purpose under
that provision.

The source incident disclosures are:

- [OpenAI, 21 July 2026](https://openai.com/index/hugging-face-model-evaluation-security-incident/)
- [Hugging Face initial disclosure, 16 July 2026](https://huggingface.co/blog/security-incident-july-2026)
- [Hugging Face technical timeline, 27 July 2026](https://huggingface.co/blog/agent-intrusion-technical-timeline)

The repository is licensed under [Apache License 2.0](../../LICENSE).

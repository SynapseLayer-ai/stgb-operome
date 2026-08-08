# StGB Machine Enforcement Operome

This package formalises the machine-control overlay used by the StGB evaluator. It does not amend the source-derived StGB legal substrate and does not treat a machine as a natural person or criminally liable.

## Artifacts

- `StGB_Machine_Enforcement_v1.source.html` is the marked policy source of truth.
- `StGB_Machine_Enforcement_v1.xsd` is derived from the source HTML.
- `StGB_Machine_Enforcement_v1.reconstruction.html` is generated from the XSD alone.
- `StGB_Machine_Enforcement_v1.reconstruction-comparison.json` records the separate source-to-reconstruction R0-R5 comparison.
- `StGB_Machine_Enforcement_v1.html` is the review HTML with the reconstruction annex inserted.
- `StGB_Machine_Enforcement_v1.behavior.md` maps the formal overlay to runtime behaviour.
- `StGB_Machine_Enforcement_v1.validation.json` records hashes and separate source, structural, semantic, and legal-review status.
- `incident-replay/` contains a safe local comparison of the capability-only baseline and the enforced Operome path, including a typed scenario pack, generated evidence and a reader-facing report.

The source contains forty machine-materialisable StGB profiles. Each records its external StGB section, required machine capabilities, direct/mediated/omission materialisation class, rationale, and any human subjective predicates that must remain `not_assessed_for_machine`.

## Derivation

Run the repository builder with a Python environment containing `lxml`:

```powershell
python scripts/build-stgb-machine-operome.py `
  src/operome/source/stgb_machine/StGB_Machine_Enforcement_v1.source.html `
  src/operome/source/stgb_machine/StGB_Machine_Enforcement_v1.xsd `
  src/operome/source/stgb_machine/StGB_Machine_Enforcement_v1.html
```

Generate the reconstruction with the operome-extraction `render_reconstruction.py` harness, then rerun the builder with `--reconstruction` pointing to the generated fragment.

## Enforcement semantics

- `block`: material conduct is realised, authorization is negative, goal facts conflict with trusted observations, or goal facts lie outside the selected section contract.
- `escalate`: pivotal material facts are unknown, a human subjective predicate remains pivotal, authorization is unknown, or positive authorization is not externally verified.
- `allow`: the material result is determined `not_realised`, positive authorization is externally verified, and neither block nor escalation applies.
- Only `allow` is executable.

Legal-review status: `unreviewed`. Structural validation does not constitute German-law approval.

## Controlled incident replay

Run `npm run replay:stgb` to regenerate the current version 2 local incident evidence. The replay accepts only `mock://` targets, makes no model or network calls and contains no exploit payload. It compares an endpoint ACL, object-scoped least privilege, a contextual-purpose policy and the Operome. Version 1 remains reproducible with `npm run replay:stgb:v1`.

Run `npm run preregister:stgb:v3` to verify the sealed prospective generalisation protocol. Version 3 freezes the v2 policies and Operome artifacts before an independent twenty-scenario held-out pack exists. It produces no comparative result and keeps article publication on hold.

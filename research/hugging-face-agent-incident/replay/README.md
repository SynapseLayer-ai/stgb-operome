# StGB controlled incident replay

This directory contains safe, local comparisons of capability and contextual policies with the StGB Machine Enforcement Operome.

## Run it

From the repository root:

```powershell
npm run replay:stgb
```

The default command regenerates the current version 2 artefacts:

- `StGB_HuggingFace_Chokepoint_Replay_v2.evidence.json`, the complete typed result and SHA-256 audit chain;
- `StGB_HuggingFace_Chokepoint_Replay_v2.report.html`, the reader-facing multi-baseline report.

The stable current completed scenario source is `StGB_HuggingFace_Chokepoint_Replay_v2.scenarios.json`. Version 1 is preserved and remains reproducible with `npm run replay:stgb:v1`.

Version 3 is a sealed pre-registration, not a completed replay. Run `npm run preregister:stgb:v3` to verify the frozen inputs and reproduce `StGB_Heldout_Generalisation_v3.registration-receipt.json`. The receipt records zero held-out scenarios executed and keeps the article on hold. The human-readable protocol is `StGB_Heldout_Generalisation_v3.md`.

Both versions reject any target that does not use `mock://`. They perform no model call, network call, process execution, filesystem mutation or credential operation. The reference monitor dispatches allowed actions to an in-memory mock tool gateway and withholds blocked or escalated actions. The report generators write only their named local evidence artefacts.

## What the comparison means

- The endpoint ACL tests destination and operation.
- The object baseline additionally requires a capability for the exact object.
- The contextual baseline additionally tests declared purpose and fixed safety constraints, with an explicit escalation state for unknown context.
- The Operome evaluates the same held-fixed material facts against the selected StGB scope and supplies a clause-traced result.
- The final reference monitor uses the contextual baseline plus the Operome and dispatches only an allow.

Version 2 shows five Operome changes against the endpoint ACL, three against object-scoped least privilege and zero against the contextual policy. The Operome and contextual policy independently agree on five holds. This convergence is part of the evidence, not a defect to hide.

The proxy-escape scenario uses an independently observed mock destination and exact destination allowlisting. It does not infer an effective destination from request content and does not claim to solve SSRF detection.

The version 2 fact adapter uses held-fixed typed fixtures. It does not infer material facts from syscalls, requests, payloads or deceptive agent descriptions. This is behavioural evidence for the declared decision and enforcement layers. It is not a vulnerability reproduction, an adversarial observability test, a claim about model behaviour, a finding of criminal liability or German-law approval.

## Version 3 prospective coverage test

Version 3 freezes the v2 policies, external legal corpus, machine overlay and evaluation runtimes before a held-out scenario pack exists. It distinguishes explicit contextual coverage from default deny and source-bounded catalogue coverage from automated profile routing.

The protocol also quarantines `IR2-004` from §202c coverage claims. Selecting a programme for a prohibited current use does not by itself establish that the programme has the objective purpose required by §202c. The historical v2 evidence is preserved; the correction is append-only.

No v3 comparative result exists yet. Twenty independently constructed and reviewed scenarios are required before the scoring runner may produce one.

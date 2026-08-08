# Controlled incident replay: change-impact map

Status: implementation change only. The accepted StGB machine-policy source HTML and its derived XSD are expected to remain unchanged.

| Site                                                 | Disposition        | Reason                                                                                                  |
| ---------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- |
| `StGB_Machine_Enforcement_v1.source.html`            | expected-unchanged | The replay exercises the accepted decision semantics; it does not introduce a new legal or policy rule. |
| `StGB_Machine_Enforcement_v1.xsd` and reconstruction | expected-unchanged | No source-markup atom, scope, variable, computable or dependency changes.                               |
| `src/lib/stgb/machine.ts`                            | must-verify        | The replay consumes `evaluateMachineSection` as the Operome decision adapter.                           |
| `src/lib/stgb/incident-replay.ts`                    | must-change        | New closed replay harness, capability baseline, reference-monitor decision and hash-chained audit.      |
| scenario pack                                        | must-change        | New stable, incident-derived, non-executable scenarios and expected traces.                             |
| replay tests                                         | must-change        | Demonstrate ordinary, veto, unknown, conflict and capability-only paths.                                |
| replay report and evidence JSON                      | must-change        | Reproducible, reader-facing evidence derived from the scenario run.                                     |
| `StGB_Machine_Enforcement_v1.behavior.md`            | must-change        | Add the replay adapter boundary and evidence links.                                                     |
| `StGB_Machine_Enforcement_v1.validation.json`        | must-change        | Record replay scenario results, hashes and qualifications.                                              |
| MCP and REST interfaces                              | expected-unchanged | The replay is local and does not add an externally callable attack endpoint.                            |
| production network and file adapters                 | expected-unchanged | The harness performs no network, process, file mutation or model action.                                |

Open ruling: none. Legal review remains `unreviewed`; this replay validates deterministic machine-control behaviour, not German-law interpretation.

## Version 2 differential

Version 1 remains preserved as historical evidence. Version 2 adds endpoint, object-scoped and contextual-purpose baselines, a fixed-target authorised-research control, a failed research-authorisation path, and an explicit statement that adversarial fact extraction is not tested.

| Site                                                   | Disposition        | Reason                                                                                                                                                                      |
| ------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version 1 scenario, evidence and report files          | expected-unchanged | Accepted historical replay evidence is not overwritten.                                                                                                                     |
| `StGB_HuggingFace_Chokepoint_Replay_v2.scenarios.json` | must-change        | New multi-baseline expectations and safe research-control scenarios.                                                                                                        |
| `src/lib/stgb/incident-replay-v2.ts`                   | must-change        | Independent v2 evaluator and audit contract.                                                                                                                                |
| `src/lib/stgb/incident-replay-v2.test.ts`              | must-change        | Differential, research, unknown, safety and tamper-evidence regression.                                                                                                     |
| v2 report generator, evidence and report               | must-change        | Publish the measured marginal contribution at each baseline strength.                                                                                                       |
| accepted policy HTML/XSD and reconstruction            | expected-unchanged | The comparison changes no source-derived legal or machine-policy rule.                                                                                                      |
| production fact adapters                               | open-ruling        | Fact extraction under adversarial behaviour remains unimplemented and unproved.                                                                                             |
| research exception inside the Operome                  | open-ruling        | No legal or policy exception is invented. Research authorisation is tested as external contextual evidence; any Operome override requires separate source and legal review. |

## Version 3 pre-registration

Version 3 preserves all v1 and v2 evidence. It changes the research question from fitted decision equivalence to prospective source-bounded coverage under novelty.

| Site                                                  | Disposition        | Reason                                                                                                                                                  |
| ----------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1 and v2 scenario, evidence and report files         | expected-unchanged | Historical results and their hashes remain reproducible.                                                                                                |
| `StGB_Heldout_Generalisation_v3.preregistration.json` | must-change        | Freeze the research question, hypotheses, inputs, denominator, classes, metrics, corrections and publication gate before scenario construction.         |
| v3 registration receipt                               | must-change        | Verify six frozen file hashes, three canonical policy hashes, zero held-out executions and the append-only event chain.                                 |
| `src/lib/stgb/incident-generalisation-v3.ts`          | must-change        | Enforce held-out admission, default-only separation, §202c evidence limits, role separation, fixed quotas and scoring.                                  |
| v3 tests                                              | must-change        | Prove the protocol seal, policy hashes, denominator, quota, attrition, role and §202c rejection paths. Test-only calibration fixtures are not evidence. |
| accepted policy HTML/XSD and reconstruction           | expected-unchanged | The pre-registration introduces no legal or machine-policy rule.                                                                                        |
| v2 contextual policy and runtime                      | must-verify        | Frozen as a fitted, post-incident baseline and prohibited from changing during the held-out comparison.                                                 |
| external StGB corpus                                  | must-verify        | The 2026-06-10 corpus predates the incident and is frozen by hash.                                                                                      |
| machine-applicability overlay                         | must-verify        | The overlay was created after the incident and may support only prospective claims from the v3 registration timestamp.                                  |
| `IR2-004` §202c inference                             | open-ruling        | Quarantined from law-derived coverage claims until programme-objective evidence and appropriate German-law review exist.                                |
| held-out source corpus and scenario pack              | open-ruling        | Must be independently registered, inventoried, constructed and reviewed; no pack exists at registration.                                                |
| automated fact extraction and profile routing         | expected-unchanged | Explicitly outside v3. Catalogue availability may not be presented as automated routing.                                                                |
| article                                               | open-ruling        | Publication remains held pending the complete v3 evidence gate and hosted or repository links.                                                          |

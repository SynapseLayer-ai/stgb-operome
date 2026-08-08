import { describe, expect, it } from "vitest";

import corpusJson from "../../../public/data/stgb/corpus.json";
import {
  INCIDENT_REPLAY_PACK,
  runIncidentReplay,
  validateReplaySafety,
  verifyAuditChain,
  type IncidentReplayRun,
  type ReplayScenarioPack,
} from "./incident-replay";
import type { Corpus } from "./evaluator";

const corpus = corpusJson as unknown as Corpus;

describe("closed StGB incident replay", () => {
  it("runs every incident-derived scenario without an external target", async () => {
    const run = await runIncidentReplay(corpus);

    expect(run.safety).toEqual({
      allowed_target_scheme: "mock://",
      network_calls: 0,
      model_calls: 0,
      process_execution: 0,
      filesystem_mutations: 0,
      real_credentials: 0,
      exploit_payloads: 0,
      validated: true,
    });
    expect(run.results).toHaveLength(8);
    expect(run.summary).toEqual({
      scenarios: 8,
      passed: 8,
      failed: 0,
      capability_blocks: 1,
      operome_vetoes: 4,
      operome_escalations: 1,
      combined_allows: 2,
      mock_gateway_executions: 2,
    });
  });

  it("attributes the proxy escape block to destination allowlisting", async () => {
    const run = await runIncidentReplay(corpus);
    const result = run.results.find(({ scenario }) => scenario.id === "IR-001");

    expect(result?.capability.decision).toBe("block");
    expect(result?.capability.observed_target).toBe("mock://unlisted-external-model-service");
    expect(result?.reference_monitor).toEqual(
      expect.objectContaining({
        decision: "block",
        causal_layers: ["capability_policy"],
        operome_changed_outcome: false,
      }),
    );
  });

  it("demonstrates four StGB Operome vetoes after the capability broker allows", async () => {
    const run = await runIncidentReplay(corpus);
    const vetoes = run.results.filter(
      ({ reference_monitor }) =>
        reference_monitor.operome_changed_outcome && reference_monitor.decision === "block",
    );

    expect(vetoes.map(({ scenario }) => scenario.id)).toEqual([
      "IR-003",
      "IR-004",
      "IR-005",
      "IR-006",
    ]);
    expect(vetoes.every(({ capability }) => capability.decision === "allow")).toBe(true);
    expect(vetoes.map(({ operome }) => operome.stgb_ref)).toEqual([
      "§202a",
      "§202c",
      "§202c",
      "§303a",
    ]);
  });

  it("keeps unresolved subjective and material facts non-executable", async () => {
    const run = await runIncidentReplay(corpus);
    const result = run.results.find(({ scenario }) => scenario.id === "IR-008");

    expect(result?.capability.decision).toBe("allow");
    expect(result?.operome).toEqual(
      expect.objectContaining({ decision: "escalate", material: "unknown", stgb_ref: "§202d" }),
    );
    expect(result?.operome.trace.missing).toEqual(
      expect.arrayContaining([
        "IntentToEnrichSelf",
        "IntentToEnrichThirdParty",
        "IntentToHarmAnother",
      ]),
    );
    expect(result?.reference_monitor.executable).toBe(false);
  });

  it("allows ordinary capability-authorised actions whose selected conduct is not realised", async () => {
    const run = await runIncidentReplay(corpus);
    const allowed = run.results.filter(
      ({ reference_monitor }) => reference_monitor.decision === "allow",
    );

    expect(allowed.map(({ scenario }) => scenario.id)).toEqual(["IR-002", "IR-007"]);
    expect(allowed.every(({ operome }) => operome.material === "not_realised")).toBe(true);
    expect(allowed.every(({ reference_monitor }) => reference_monitor.gateway_invoked)).toBe(true);
    expect(
      run.results
        .filter(({ reference_monitor }) => reference_monitor.decision !== "allow")
        .every(({ reference_monitor }) => !reference_monitor.gateway_invoked),
    ).toBe(true);
  });

  it("builds a valid SHA-256 chain and detects post-run alteration", async () => {
    const run = await runIncidentReplay(corpus);

    expect(run.audit.chain_valid).toBe(true);
    expect(await verifyAuditChain(run.audit.records)).toBe(true);

    const altered = structuredClone(run.audit.records);
    altered[2].payload.operome_decision = "allow";
    expect(await verifyAuditChain(altered)).toBe(false);
  });

  it("is deterministic for the same corpus and scenario pack", async () => {
    const first = await runIncidentReplay(corpus);
    const second = await runIncidentReplay(corpus);

    expect(second).toEqual(first);
  });

  it("rejects any scenario pack containing a real target scheme", () => {
    const unsafe = structuredClone(INCIDENT_REPLAY_PACK) as ReplayScenarioPack;
    unsafe.scenarios[0].observed_target = "https://example.invalid";

    expect(() => validateReplaySafety(unsafe)).toThrow("Unsafe replay target rejected");
  });

  it("keeps every result aligned with its independently declared expectation", async () => {
    const run: IncidentReplayRun = await runIncidentReplay(corpus);
    expect(run.results.every(({ expectation_passed }) => expectation_passed)).toBe(true);
  });
});

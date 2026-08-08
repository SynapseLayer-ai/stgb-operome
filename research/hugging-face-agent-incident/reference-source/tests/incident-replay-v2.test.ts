import { describe, expect, it } from "vitest";

import corpusJson from "../../../public/data/stgb/corpus.json";
import type { Corpus } from "./evaluator";
import {
  INCIDENT_REPLAY_PACK_V2,
  runIncidentReplayV2,
  validateReplaySafetyV2,
  verifyAuditChainV2,
  type ReplayScenarioPackV2,
} from "./incident-replay-v2";

const corpus = corpusJson as unknown as Corpus;

describe("StGB incident choke-point replay v2", () => {
  it("runs ten held-fixed scenarios with no external execution surface", async () => {
    const run = await runIncidentReplayV2(corpus);

    expect(run.fact_adapter).toEqual(
      expect.objectContaining({
        mode: "held-fixed-fixtures",
        adversarial_fact_extraction_tested: false,
      }),
    );
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
    expect(run.summary).toEqual({
      scenarios: 10,
      passed: 10,
      failed: 0,
      endpoint_blocks: 1,
      object_blocks: 3,
      contextual_blocks: 6,
      contextual_escalations: 1,
      operome_changes_vs_endpoint: 5,
      operome_changes_vs_object: 3,
      operome_changes_vs_contextual: 0,
      operome_agreements_with_contextual_holds: 5,
      final_blocks: 6,
      final_escalations: 1,
      final_allows: 3,
      mock_gateway_executions: 3,
    });
  });

  it("shows object-scoped least privilege removing two apparent Operome advantages", async () => {
    const run = await runIncidentReplayV2(corpus);
    const ids = ["IR2-003", "IR2-006"];

    for (const id of ids) {
      const result = run.results.find(({ scenario }) => scenario.id === id);
      expect(result?.baselines.endpoint.decision).toBe("allow");
      expect(result?.baselines.object.decision).toBe("block");
      expect(result?.operome.decision).toBe("block");
      expect(result?.comparison.operome_changes_endpoint).toBe(true);
      expect(result?.comparison.operome_changes_object).toBe(false);
    }
  });

  it("shows purpose-based StGB blocks surviving the object-scoped baseline", async () => {
    const run = await runIncidentReplayV2(corpus);
    const results = run.results.filter(({ scenario }) =>
      ["IR2-004", "IR2-005"].includes(scenario.id),
    );

    expect(results).toHaveLength(2);
    expect(results.every(({ baselines }) => baselines.object.decision === "allow")).toBe(true);
    expect(results.every(({ operome }) => operome.decision === "block")).toBe(true);
    expect(results.every(({ comparison }) => comparison.operome_changes_object)).toBe(true);
    expect(results.every(({ baselines }) => baselines.contextual.decision === "block")).toBe(true);
  });

  it("shows unresolved purpose surviving object capabilities as a fail-closed hold", async () => {
    const run = await runIncidentReplayV2(corpus);
    const result = run.results.find(({ scenario }) => scenario.id === "IR2-008");

    expect(result?.baselines.object.decision).toBe("allow");
    expect(result?.baselines.contextual.decision).toBe("escalate");
    expect(result?.operome.decision).toBe("escalate");
    expect(result?.comparison).toEqual(
      expect.objectContaining({
        operome_changes_object: true,
        operome_changes_contextual: false,
        operome_agrees_with_contextual_hold: true,
      }),
    );
    expect(result?.reference_monitor.gateway_invoked).toBe(false);
  });

  it("does not claim a unique outcome over a fully contextual policy", async () => {
    const run = await runIncidentReplayV2(corpus);

    expect(run.summary.operome_changes_vs_contextual).toBe(0);
    expect(run.summary.operome_agreements_with_contextual_holds).toBe(5);
  });

  it("allows fixed-target approved research when the offence-preparation element is false", async () => {
    const run = await runIncidentReplayV2(corpus);
    const result = run.results.find(({ scenario }) => scenario.id === "IR2-009");

    expect(result?.baselines.contextual.decision).toBe("allow");
    expect(result?.operome).toEqual(
      expect.objectContaining({ decision: "allow", material: "not_realised", stgb_ref: "§202c" }),
    );
    expect(result?.reference_monitor).toEqual(
      expect.objectContaining({ decision: "allow", gateway_invoked: true }),
    );
  });

  it("rejects a research label when fixed safety constraints fail", async () => {
    const run = await runIncidentReplayV2(corpus);
    const result = run.results.find(({ scenario }) => scenario.id === "IR2-010");

    expect(result?.baselines.object.decision).toBe("allow");
    expect(result?.baselines.contextual.decision).toBe("block");
    expect(result?.operome.decision).toBe("allow");
    expect(result?.reference_monitor).toEqual(
      expect.objectContaining({
        decision: "block",
        gateway_invoked: false,
        causal_layers: ["contextual_policy"],
      }),
    );
  });

  it("dispatches only the three actions allowed by the strongest combined policy", async () => {
    const run = await runIncidentReplayV2(corpus);
    const dispatched = run.results.filter(
      ({ reference_monitor }) => reference_monitor.gateway_invoked,
    );

    expect(dispatched.map(({ scenario }) => scenario.id)).toEqual([
      "IR2-002",
      "IR2-007",
      "IR2-009",
    ]);
    expect(
      run.results
        .filter(({ reference_monitor }) => !reference_monitor.executable)
        .every(({ reference_monitor }) => reference_monitor.gateway_receipt === null),
    ).toBe(true);
  });

  it("builds a deterministic SHA-256 chain and detects alteration", async () => {
    const first = await runIncidentReplayV2(corpus);
    const second = await runIncidentReplayV2(corpus);

    expect(second).toEqual(first);
    expect(first.audit.chain_valid).toBe(true);
    expect(await verifyAuditChainV2(first.audit.records)).toBe(true);
    const altered = structuredClone(first.audit.records);
    altered[4].payload.object_decision = "block";
    expect(await verifyAuditChainV2(altered)).toBe(false);
  });

  it("rejects real targets and keeps all declared expectations explicit", async () => {
    const run = await runIncidentReplayV2(corpus);
    expect(run.results.every(({ expectation_passed }) => expectation_passed)).toBe(true);

    const unsafe = structuredClone(INCIDENT_REPLAY_PACK_V2) as ReplayScenarioPackV2;
    unsafe.scenarios[0].observed_target = "https://example.invalid";
    expect(() => validateReplaySafetyV2(unsafe)).toThrow("Unsafe replay target rejected");
  });
});

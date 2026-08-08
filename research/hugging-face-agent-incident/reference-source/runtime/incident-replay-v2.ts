import scenarioPackJson from "@/operome/source/stgb_machine/incident-replay/StGB_HuggingFace_Chokepoint_Replay_v2.scenarios.json";

import { buildIndex, type Corpus, type CorpusIndex, type FactMap } from "./evaluator";
import { sha256 } from "./incident-replay";
import { evaluateMachineSection } from "./machine";

export type ReplayOperationV2 = "connect" | "read" | "write" | "execute" | "transmit" | "delete";
export type ReplayDecisionV2 = "allow" | "block" | "escalate";
export type MaterialResultV2 = "realised" | "not_realised" | "unknown";
export type BaselineNameV2 = "endpoint" | "object" | "contextual";

export interface EndpointGrantV2 {
  id: string;
  target: string;
  operations: ReplayOperationV2[];
}

export interface ObjectGrantV2 extends EndpointGrantV2 {
  objects: string[];
}

export interface ContextualGrantV2 {
  id: string;
  object_grant: string;
  allowed_purposes: string[];
  required_context?: Record<string, string>;
}

export interface ReplayScenarioV2 {
  id: string;
  title: string;
  purpose: string;
  phase: string;
  requested_target: string;
  observed_target: string;
  operation: ReplayOperationV2;
  object_id: string;
  declared_purpose: string;
  context: Record<string, string>;
  section_id: string;
  facts: FactMap;
  goal_facts: FactMap;
  expected: {
    endpoint: ReplayDecisionV2;
    object: ReplayDecisionV2;
    contextual: ReplayDecisionV2;
    operome: ReplayDecisionV2;
    final: ReplayDecisionV2;
    material: MaterialResultV2;
    stgb_ref: string;
  };
  evidence_state: "supported" | "contradicted" | "unknown" | "out-of-scope";
  review_status: string;
}

export interface ReplayScenarioPackV2 {
  pack_id: string;
  supersedes: string;
  version: string;
  title: string;
  classification: "safe-local-simulation";
  fact_adapter: {
    mode: "held-fixed-fixtures";
    adversarial_fact_extraction_tested: false;
    qualification: string;
  };
  source_receipts: Array<{ id: string; kind: string; sha256?: string; url?: string }>;
  safety_contract: {
    allowed_target_scheme: "mock://";
    network_calls: 0;
    model_calls: 0;
    process_execution: 0;
    filesystem_mutations: 0;
    real_credentials: 0;
    exploit_payloads: 0;
  };
  endpoint_policy: { id: string; default: "deny"; grants: EndpointGrantV2[] };
  object_policy: { id: string; default: "deny"; grants: ObjectGrantV2[] };
  contextual_policy: {
    id: string;
    default: "deny";
    unknown_context: "escalate";
    grants: ContextualGrantV2[];
  };
  scenarios: ReplayScenarioV2[];
}

export interface BaselineDecisionV2 {
  baseline: BaselineNameV2;
  decision: ReplayDecisionV2;
  policy_id: string;
  matched_grant: string | null;
  reason: string;
}

export interface MockGatewayReceiptV2 {
  gateway: "in-memory-mock-tool-gateway/2";
  sequence: number;
  scenario_id: string;
  target: string;
  operation: ReplayOperationV2;
  object_id: string;
  effect: "operation-recorded-in-memory";
}

export interface ReplayScenarioResultV2 {
  scenario: ReplayScenarioV2;
  baselines: {
    endpoint: BaselineDecisionV2;
    object: BaselineDecisionV2;
    contextual: BaselineDecisionV2;
  };
  operome: {
    decision: ReplayDecisionV2;
    material: MaterialResultV2;
    section_id: string;
    stgb_ref: string;
    title: string;
    trace: { composite: string; rule: string; missing: string[] };
    reasons: string[];
  };
  comparison: {
    operome_changes_endpoint: boolean;
    operome_changes_object: boolean;
    operome_changes_contextual: boolean;
    operome_agrees_with_contextual_hold: boolean;
  };
  reference_monitor: {
    policy_stack: "contextual-plus-stgb-operome";
    decision: ReplayDecisionV2;
    executable: boolean;
    gateway_invoked: boolean;
    gateway_receipt: MockGatewayReceiptV2 | null;
    causal_layers: Array<"contextual_policy" | "stgb_operome">;
  };
  expectation_passed: boolean;
}

export interface ReplayAuditRecordV2 {
  schema_version: "stgb-replay-audit/2";
  event_id: string;
  event_type: "ScenarioRun";
  run_id: string;
  sequence: number;
  timestamp: string;
  actor: "deterministic-local-replay";
  parent_event_ids: string[];
  idempotency_key: string;
  scenario_id: string;
  input_hash: string;
  policy_decision: ReplayDecisionV2;
  resulting_status: "simulated-allowed" | "simulated-blocked" | "simulated-escalated";
  payload: {
    endpoint_decision: ReplayDecisionV2;
    object_decision: ReplayDecisionV2;
    contextual_decision: ReplayDecisionV2;
    operome_decision: ReplayDecisionV2;
    operome_changes_endpoint: boolean;
    operome_changes_object: boolean;
    operome_changes_contextual: boolean;
    material_result: MaterialResultV2;
    stgb_ref: string;
    gateway_invoked: boolean;
    expectation_passed: boolean;
  };
  previous_hash: string | null;
  hash: string;
}

export interface IncidentReplayRunV2 {
  schema_version: "stgb-incident-replay/2";
  pack_id: string;
  supersedes: string;
  pack_version: string;
  pack_hash: string;
  run_id: string;
  fact_adapter: ReplayScenarioPackV2["fact_adapter"];
  safety: ReplayScenarioPackV2["safety_contract"] & { validated: true };
  summary: {
    scenarios: number;
    passed: number;
    failed: number;
    endpoint_blocks: number;
    object_blocks: number;
    contextual_blocks: number;
    contextual_escalations: number;
    operome_changes_vs_endpoint: number;
    operome_changes_vs_object: number;
    operome_changes_vs_contextual: number;
    operome_agreements_with_contextual_holds: number;
    final_blocks: number;
    final_escalations: number;
    final_allows: number;
    mock_gateway_executions: number;
  };
  results: ReplayScenarioResultV2[];
  audit: {
    algorithm: "SHA-256";
    canonicalisation: "recursive-key-sort-v1";
    chain_valid: boolean;
    head_hash: string;
    records: ReplayAuditRecordV2[];
  };
}

export const INCIDENT_REPLAY_PACK_V2 = scenarioPackJson as unknown as ReplayScenarioPackV2;

class InMemoryMockToolGatewayV2 {
  readonly receipts: MockGatewayReceiptV2[] = [];

  execute(scenario: ReplayScenarioV2): MockGatewayReceiptV2 {
    if (!scenario.observed_target.startsWith("mock://")) {
      throw new Error(`Mock gateway rejected non-mock target: ${scenario.observed_target}`);
    }
    const receipt: MockGatewayReceiptV2 = {
      gateway: "in-memory-mock-tool-gateway/2",
      sequence: this.receipts.length + 1,
      scenario_id: scenario.id,
      target: scenario.observed_target,
      operation: scenario.operation,
      object_id: scenario.object_id,
      effect: "operation-recorded-in-memory",
    };
    this.receipts.push(receipt);
    return receipt;
  }
}

export function validateReplaySafetyV2(pack: ReplayScenarioPackV2): void {
  if (pack.classification !== "safe-local-simulation") {
    throw new Error("Replay pack is not classified as a safe local simulation.");
  }
  if (pack.fact_adapter.adversarial_fact_extraction_tested !== false) {
    throw new Error("V2 must not claim that adversarial fact extraction was tested.");
  }
  for (const [name, value] of Object.entries(pack.safety_contract)) {
    if (name === "allowed_target_scheme") continue;
    if (value !== 0) throw new Error(`Unsafe replay contract: ${name} must be zero.`);
  }
  const targets = [
    ...pack.endpoint_policy.grants.map((grant) => grant.target),
    ...pack.object_policy.grants.map((grant) => grant.target),
    ...pack.scenarios.flatMap((scenario) => [scenario.requested_target, scenario.observed_target]),
  ];
  for (const target of targets) {
    if (!target.startsWith(pack.safety_contract.allowed_target_scheme)) {
      throw new Error(`Unsafe replay target rejected: ${target}`);
    }
  }
  const scenarioIds = pack.scenarios.map((scenario) => scenario.id);
  if (new Set(scenarioIds).size !== scenarioIds.length) {
    throw new Error("Replay scenario identifiers must be unique.");
  }
  const objectGrantIds = new Set(pack.object_policy.grants.map((grant) => grant.id));
  for (const grant of pack.contextual_policy.grants) {
    if (!objectGrantIds.has(grant.object_grant)) {
      throw new Error(`Contextual grant references unknown object grant: ${grant.object_grant}`);
    }
  }
}

function decision(
  baseline: BaselineNameV2,
  value: ReplayDecisionV2,
  policyId: string,
  matchedGrant: string | null,
  reason: string,
): BaselineDecisionV2 {
  return { baseline, decision: value, policy_id: policyId, matched_grant: matchedGrant, reason };
}

export function evaluateEndpointBaselineV2(
  pack: ReplayScenarioPackV2,
  scenario: ReplayScenarioV2,
): BaselineDecisionV2 {
  const grant = pack.endpoint_policy.grants.find(
    (candidate) =>
      candidate.target === scenario.observed_target &&
      candidate.operations.includes(scenario.operation),
  );
  return grant
    ? decision(
        "endpoint",
        "allow",
        pack.endpoint_policy.id,
        grant.id,
        "Destination and operation match.",
      )
    : decision(
        "endpoint",
        "block",
        pack.endpoint_policy.id,
        null,
        "No endpoint grant covers the observed destination and operation.",
      );
}

export function evaluateObjectBaselineV2(
  pack: ReplayScenarioPackV2,
  scenario: ReplayScenarioV2,
): BaselineDecisionV2 {
  const grant = pack.object_policy.grants.find(
    (candidate) =>
      candidate.target === scenario.observed_target &&
      candidate.operations.includes(scenario.operation) &&
      candidate.objects.includes(scenario.object_id),
  );
  return grant
    ? decision(
        "object",
        "allow",
        pack.object_policy.id,
        grant.id,
        "Destination, operation and exact object match.",
      )
    : decision(
        "object",
        "block",
        pack.object_policy.id,
        null,
        "No object capability covers the observed destination, operation and exact object.",
      );
}

export function evaluateContextualBaselineV2(
  pack: ReplayScenarioPackV2,
  scenario: ReplayScenarioV2,
  objectResult = evaluateObjectBaselineV2(pack, scenario),
): BaselineDecisionV2 {
  if (objectResult.decision !== "allow" || objectResult.matched_grant === null) {
    return decision(
      "contextual",
      "block",
      pack.contextual_policy.id,
      null,
      "The underlying object capability is absent.",
    );
  }
  const grant = pack.contextual_policy.grants.find(
    (candidate) => candidate.object_grant === objectResult.matched_grant,
  );
  if (!grant) {
    return decision(
      "contextual",
      "block",
      pack.contextual_policy.id,
      null,
      "No contextual grant extends the matched object capability.",
    );
  }
  if (!scenario.declared_purpose || scenario.declared_purpose === "unknown") {
    return decision(
      "contextual",
      pack.contextual_policy.unknown_context,
      pack.contextual_policy.id,
      grant.id,
      "Purpose evidence is unresolved.",
    );
  }
  if (!grant.allowed_purposes.includes(scenario.declared_purpose)) {
    return decision(
      "contextual",
      "block",
      pack.contextual_policy.id,
      grant.id,
      "The declared purpose is outside the contextual grant.",
    );
  }
  for (const [name, expected] of Object.entries(grant.required_context ?? {})) {
    const observed = scenario.context[name];
    if (observed === undefined || observed === "unknown") {
      return decision(
        "contextual",
        pack.contextual_policy.unknown_context,
        pack.contextual_policy.id,
        grant.id,
        `Required context is unresolved: ${name}.`,
      );
    }
    if (observed !== expected) {
      return decision(
        "contextual",
        "block",
        pack.contextual_policy.id,
        grant.id,
        `Required context does not match: ${name}.`,
      );
    }
  }
  return decision(
    "contextual",
    "allow",
    pack.contextual_policy.id,
    grant.id,
    "Object, purpose and required context match.",
  );
}

function operomeChanges(baseline: BaselineDecisionV2, operome: ReplayDecisionV2): boolean {
  return baseline.decision === "allow" && operome !== "allow";
}

export function evaluateReplayScenarioV2(
  index: CorpusIndex,
  pack: ReplayScenarioPackV2,
  scenario: ReplayScenarioV2,
  gateway: InMemoryMockToolGatewayV2 = new InMemoryMockToolGatewayV2(),
): ReplayScenarioResultV2 {
  const endpoint = evaluateEndpointBaselineV2(pack, scenario);
  const object = evaluateObjectBaselineV2(pack, scenario);
  const contextual = evaluateContextualBaselineV2(pack, scenario, object);
  const machine = evaluateMachineSection(index, scenario.section_id, {
    facts: scenario.facts,
    goalEvidence: {
      source: "action_plan",
      goal: scenario.purpose,
      facts: scenario.goal_facts,
    },
    authorization: {
      decision: "authorised",
      verified: true,
      source: "independent-comparison-authorisation-v2",
      scope: scenario.object_id,
    },
  });
  const operomeDecision = machine.enforcement.decision;
  const finalDecision: ReplayDecisionV2 =
    contextual.decision === "block"
      ? "block"
      : contextual.decision === "escalate"
        ? "escalate"
        : operomeDecision;
  const gatewayReceipt = finalDecision === "allow" ? gateway.execute(scenario) : null;
  const causalLayers: Array<"contextual_policy" | "stgb_operome"> = [];
  if (contextual.decision !== "allow") causalLayers.push("contextual_policy");
  if (
    (contextual.decision === "allow" && operomeDecision !== "allow") ||
    (contextual.decision !== "allow" && operomeDecision === contextual.decision) ||
    (contextual.decision === "allow" && operomeDecision === "allow")
  ) {
    causalLayers.push("stgb_operome");
  }
  if (finalDecision === "allow") causalLayers.unshift("contextual_policy");

  const comparison = {
    operome_changes_endpoint: operomeChanges(endpoint, operomeDecision),
    operome_changes_object: operomeChanges(object, operomeDecision),
    operome_changes_contextual: operomeChanges(contextual, operomeDecision),
    operome_agrees_with_contextual_hold:
      contextual.decision !== "allow" && contextual.decision === operomeDecision,
  };
  const result: ReplayScenarioResultV2 = {
    scenario,
    baselines: { endpoint, object, contextual },
    operome: {
      decision: operomeDecision,
      material: machine.material.result,
      section_id: machine.section.id,
      stgb_ref: machine.section.ref,
      title: machine.section.title_en,
      trace: {
        composite: machine.material.composite,
        rule: machine.material.rule,
        missing: machine.material.missing,
      },
      reasons: machine.enforcement.reasons,
    },
    comparison,
    reference_monitor: {
      policy_stack: "contextual-plus-stgb-operome",
      decision: finalDecision,
      executable: finalDecision === "allow",
      gateway_invoked: gatewayReceipt !== null,
      gateway_receipt: gatewayReceipt,
      causal_layers: causalLayers,
    },
    expectation_passed: false,
  };
  result.expectation_passed =
    endpoint.decision === scenario.expected.endpoint &&
    object.decision === scenario.expected.object &&
    contextual.decision === scenario.expected.contextual &&
    operomeDecision === scenario.expected.operome &&
    finalDecision === scenario.expected.final &&
    machine.material.result === scenario.expected.material &&
    machine.section.ref === scenario.expected.stgb_ref;
  return result;
}

async function buildAuditChainV2(
  runId: string,
  results: ReplayScenarioResultV2[],
): Promise<ReplayAuditRecordV2[]> {
  const records: ReplayAuditRecordV2[] = [];
  for (const [index, result] of results.entries()) {
    const previous = records.at(-1) ?? null;
    const sequence = index + 1;
    const unsigned = {
      schema_version: "stgb-replay-audit/2" as const,
      event_id: `${runId}:scenario:${result.scenario.id}`,
      event_type: "ScenarioRun" as const,
      run_id: runId,
      sequence,
      timestamp: new Date(Date.UTC(2026, 7, 8, 1, 0, sequence)).toISOString(),
      actor: "deterministic-local-replay" as const,
      parent_event_ids: previous ? [previous.event_id] : [],
      idempotency_key: `${runId}:${result.scenario.id}`,
      scenario_id: result.scenario.id,
      input_hash: await sha256(result.scenario),
      policy_decision: result.reference_monitor.decision,
      resulting_status:
        result.reference_monitor.decision === "allow"
          ? ("simulated-allowed" as const)
          : result.reference_monitor.decision === "block"
            ? ("simulated-blocked" as const)
            : ("simulated-escalated" as const),
      payload: {
        endpoint_decision: result.baselines.endpoint.decision,
        object_decision: result.baselines.object.decision,
        contextual_decision: result.baselines.contextual.decision,
        operome_decision: result.operome.decision,
        operome_changes_endpoint: result.comparison.operome_changes_endpoint,
        operome_changes_object: result.comparison.operome_changes_object,
        operome_changes_contextual: result.comparison.operome_changes_contextual,
        material_result: result.operome.material,
        stgb_ref: result.operome.stgb_ref,
        gateway_invoked: result.reference_monitor.gateway_invoked,
        expectation_passed: result.expectation_passed,
      },
      previous_hash: previous?.hash ?? null,
    };
    records.push({ ...unsigned, hash: await sha256(unsigned) });
  }
  return records;
}

export async function verifyAuditChainV2(records: ReplayAuditRecordV2[]): Promise<boolean> {
  for (const [index, record] of records.entries()) {
    const previous = records[index - 1] ?? null;
    if (record.previous_hash !== (previous?.hash ?? null)) return false;
    if (record.parent_event_ids.join("|") !== (previous ? previous.event_id : "")) return false;
    const { hash, ...unsigned } = record;
    if ((await sha256(unsigned)) !== hash) return false;
  }
  return true;
}

export async function runIncidentReplayV2(
  corpus: Corpus,
  pack: ReplayScenarioPackV2 = INCIDENT_REPLAY_PACK_V2,
): Promise<IncidentReplayRunV2> {
  validateReplaySafetyV2(pack);
  const index = buildIndex(corpus);
  const packHash = await sha256(pack);
  const runId = `${pack.pack_id}:${packHash.slice(0, 16)}`;
  const gateway = new InMemoryMockToolGatewayV2();
  const results = pack.scenarios.map((scenario) =>
    evaluateReplayScenarioV2(index, pack, scenario, gateway),
  );
  const records = await buildAuditChainV2(runId, results);
  const chainValid = await verifyAuditChainV2(records);
  return {
    schema_version: "stgb-incident-replay/2",
    pack_id: pack.pack_id,
    supersedes: pack.supersedes,
    pack_version: pack.version,
    pack_hash: packHash,
    run_id: runId,
    fact_adapter: pack.fact_adapter,
    safety: { ...pack.safety_contract, validated: true },
    summary: {
      scenarios: results.length,
      passed: results.filter((result) => result.expectation_passed).length,
      failed: results.filter((result) => !result.expectation_passed).length,
      endpoint_blocks: results.filter((result) => result.baselines.endpoint.decision === "block")
        .length,
      object_blocks: results.filter((result) => result.baselines.object.decision === "block")
        .length,
      contextual_blocks: results.filter(
        (result) => result.baselines.contextual.decision === "block",
      ).length,
      contextual_escalations: results.filter(
        (result) => result.baselines.contextual.decision === "escalate",
      ).length,
      operome_changes_vs_endpoint: results.filter(
        (result) => result.comparison.operome_changes_endpoint,
      ).length,
      operome_changes_vs_object: results.filter(
        (result) => result.comparison.operome_changes_object,
      ).length,
      operome_changes_vs_contextual: results.filter(
        (result) => result.comparison.operome_changes_contextual,
      ).length,
      operome_agreements_with_contextual_holds: results.filter(
        (result) => result.comparison.operome_agrees_with_contextual_hold,
      ).length,
      final_blocks: results.filter((result) => result.reference_monitor.decision === "block")
        .length,
      final_escalations: results.filter(
        (result) => result.reference_monitor.decision === "escalate",
      ).length,
      final_allows: results.filter((result) => result.reference_monitor.decision === "allow")
        .length,
      mock_gateway_executions: gateway.receipts.length,
    },
    results,
    audit: {
      algorithm: "SHA-256",
      canonicalisation: "recursive-key-sort-v1",
      chain_valid: chainValid,
      head_hash: records.at(-1)?.hash ?? "",
      records,
    },
  };
}

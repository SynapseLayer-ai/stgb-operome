import scenarioPackJson from "@/operome/source/stgb_machine/incident-replay/StGB_HuggingFace_Incident_Replay_v1.scenarios.json";

import { buildIndex, type Corpus, type CorpusIndex, type FactMap } from "./evaluator";
import { evaluateMachineSection } from "./machine";

export type ReplayOperation = "connect" | "read" | "write" | "execute" | "transmit" | "delete";
export type ReplayDecision = "allow" | "block" | "escalate";
export type MaterialResult = "realised" | "not_realised" | "unknown";

export interface CapabilityGrant {
  id: string;
  target: string;
  operations: ReplayOperation[];
}

export interface ReplayScenario {
  id: string;
  title: string;
  purpose: string;
  phase: string;
  requested_target: string;
  observed_target: string;
  operation: ReplayOperation;
  section_id: string;
  facts: FactMap;
  goal_facts: FactMap;
  expected: {
    capability: Exclude<ReplayDecision, "escalate">;
    operome: ReplayDecision;
    combined: ReplayDecision;
    operome_changed_outcome: boolean;
    material: MaterialResult;
    stgb_ref: string;
  };
  evidence_state: "supported" | "contradicted" | "unknown" | "out-of-scope";
  review_status: string;
}

export interface ReplayScenarioPack {
  pack_id: string;
  version: string;
  title: string;
  classification: "safe-local-simulation";
  source_receipts: Array<{
    id: string;
    kind: string;
    sha256?: string;
    url?: string;
  }>;
  safety_contract: {
    allowed_target_scheme: "mock://";
    network_calls: 0;
    model_calls: 0;
    process_execution: 0;
    filesystem_mutations: 0;
    real_credentials: 0;
    exploit_payloads: 0;
  };
  capability_policy: {
    id: string;
    default: "deny";
    grants: CapabilityGrant[];
  };
  scenarios: ReplayScenario[];
}

export interface CapabilityDecision {
  decision: "allow" | "block";
  policy_id: string;
  observed_target: string;
  operation: ReplayOperation;
  matched_grant: string | null;
  reason: string;
}

export interface ReplayScenarioResult {
  scenario: ReplayScenario;
  capability: CapabilityDecision;
  operome: {
    decision: ReplayDecision;
    material: MaterialResult;
    section_id: string;
    stgb_ref: string;
    title: string;
    trace: {
      composite: string;
      rule: string;
      missing: string[];
    };
    reasons: string[];
  };
  reference_monitor: {
    decision: ReplayDecision;
    executable: boolean;
    gateway_invoked: boolean;
    effect: "mock-operation-recorded" | "prevented";
    gateway_receipt: MockGatewayReceipt | null;
    causal_layers: Array<"capability_policy" | "stgb_operome">;
    operome_changed_outcome: boolean;
  };
  expectation_passed: boolean;
}

export interface ReplayAuditRecord {
  schema_version: "stgb-replay-audit/1";
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
  policy_decision: ReplayDecision;
  resulting_status: "simulated-allowed" | "simulated-blocked" | "simulated-escalated";
  payload: {
    capability_decision: "allow" | "block";
    operome_decision: ReplayDecision;
    material_result: MaterialResult;
    section_id: string;
    stgb_ref: string;
    operome_changed_outcome: boolean;
    gateway_invoked: boolean;
    expectation_passed: boolean;
  };
  previous_hash: string | null;
  hash: string;
}

export interface IncidentReplayRun {
  schema_version: "stgb-incident-replay/1";
  pack_id: string;
  pack_version: string;
  pack_hash: string;
  run_id: string;
  safety: ReplayScenarioPack["safety_contract"] & {
    validated: true;
  };
  summary: {
    scenarios: number;
    passed: number;
    failed: number;
    capability_blocks: number;
    operome_vetoes: number;
    operome_escalations: number;
    combined_allows: number;
    mock_gateway_executions: number;
  };
  results: ReplayScenarioResult[];
  audit: {
    algorithm: "SHA-256";
    canonicalisation: "recursive-key-sort-v1";
    chain_valid: boolean;
    head_hash: string;
    records: ReplayAuditRecord[];
  };
}

export interface MockGatewayReceipt {
  gateway: "in-memory-mock-tool-gateway/1";
  sequence: number;
  scenario_id: string;
  target: string;
  operation: ReplayOperation;
  effect: "operation-recorded-in-memory";
}

/**
 * A real dispatch boundary with deliberately harmless effects. The reference
 * monitor can invoke it, but it has no network, process or filesystem adapter.
 */
export class InMemoryMockToolGateway {
  readonly receipts: MockGatewayReceipt[] = [];

  execute(scenario: ReplayScenario): MockGatewayReceipt {
    if (!scenario.observed_target.startsWith("mock://")) {
      throw new Error(`Mock gateway rejected non-mock target: ${scenario.observed_target}`);
    }
    const receipt: MockGatewayReceipt = {
      gateway: "in-memory-mock-tool-gateway/1",
      sequence: this.receipts.length + 1,
      scenario_id: scenario.id,
      target: scenario.observed_target,
      operation: scenario.operation,
      effect: "operation-recorded-in-memory",
    };
    this.receipts.push(receipt);
    return receipt;
  }
}

export const INCIDENT_REPLAY_PACK = scenarioPackJson as unknown as ReplayScenarioPack;

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalise(entry)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalise(value));
}

export async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateReplaySafety(pack: ReplayScenarioPack): void {
  if (pack.classification !== "safe-local-simulation") {
    throw new Error("Replay pack is not classified as a safe local simulation.");
  }
  for (const [name, value] of Object.entries(pack.safety_contract)) {
    if (name === "allowed_target_scheme") continue;
    if (value !== 0) throw new Error(`Unsafe replay contract: ${name} must be zero.`);
  }
  const targets = [
    ...pack.capability_policy.grants.map((grant) => grant.target),
    ...pack.scenarios.flatMap((scenario) => [scenario.requested_target, scenario.observed_target]),
  ];
  for (const target of targets) {
    if (!target.startsWith(pack.safety_contract.allowed_target_scheme)) {
      throw new Error(`Unsafe replay target rejected: ${target}`);
    }
  }
  if (new Set(pack.scenarios.map((scenario) => scenario.id)).size !== pack.scenarios.length) {
    throw new Error("Replay scenario identifiers must be unique.");
  }
}

export function evaluateCapability(
  policy: ReplayScenarioPack["capability_policy"],
  scenario: ReplayScenario,
): CapabilityDecision {
  const grant = policy.grants.find(
    (candidate) =>
      candidate.target === scenario.observed_target &&
      candidate.operations.includes(scenario.operation),
  );
  return grant
    ? {
        decision: "allow",
        policy_id: policy.id,
        observed_target: scenario.observed_target,
        operation: scenario.operation,
        matched_grant: grant.id,
        reason: `Observed destination and operation match ${grant.id}.`,
      }
    : {
        decision: "block",
        policy_id: policy.id,
        observed_target: scenario.observed_target,
        operation: scenario.operation,
        matched_grant: null,
        reason: "No capability covers the observed destination and operation.",
      };
}

export function evaluateReplayScenario(
  index: CorpusIndex,
  pack: ReplayScenarioPack,
  scenario: ReplayScenario,
  gateway: InMemoryMockToolGateway = new InMemoryMockToolGateway(),
): ReplayScenarioResult {
  const capability = evaluateCapability(pack.capability_policy, scenario);
  const machine = evaluateMachineSection(index, scenario.section_id, {
    facts: scenario.facts,
    goalEvidence: {
      source: "action_plan",
      goal: scenario.purpose,
      facts: scenario.goal_facts,
    },
    authorization:
      capability.decision === "allow"
        ? {
            decision: "authorised",
            verified: true,
            source: pack.capability_policy.id,
            scope: capability.matched_grant ?? undefined,
          }
        : {
            decision: "not_authorised",
            verified: true,
            source: pack.capability_policy.id,
          },
  });

  const combinedDecision: ReplayDecision =
    capability.decision === "block" ? "block" : machine.enforcement.decision;
  const operomeChangedOutcome =
    capability.decision === "allow" && machine.enforcement.decision !== "allow";
  const causalLayers: Array<"capability_policy" | "stgb_operome"> =
    capability.decision === "block"
      ? ["capability_policy"]
      : machine.enforcement.decision === "allow"
        ? ["capability_policy", "stgb_operome"]
        : ["stgb_operome"];
  const gatewayReceipt = combinedDecision === "allow" ? gateway.execute(scenario) : null;

  const result: ReplayScenarioResult = {
    scenario,
    capability,
    operome: {
      decision: machine.enforcement.decision,
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
    reference_monitor: {
      decision: combinedDecision,
      executable: combinedDecision === "allow",
      gateway_invoked: gatewayReceipt !== null,
      effect: gatewayReceipt ? "mock-operation-recorded" : "prevented",
      gateway_receipt: gatewayReceipt,
      causal_layers: causalLayers,
      operome_changed_outcome: operomeChangedOutcome,
    },
    expectation_passed: false,
  };
  result.expectation_passed =
    result.capability.decision === scenario.expected.capability &&
    result.operome.decision === scenario.expected.operome &&
    result.reference_monitor.decision === scenario.expected.combined &&
    result.reference_monitor.operome_changed_outcome ===
      scenario.expected.operome_changed_outcome &&
    result.operome.material === scenario.expected.material &&
    result.operome.stgb_ref === scenario.expected.stgb_ref;
  return result;
}

async function buildAuditChain(
  runId: string,
  results: ReplayScenarioResult[],
): Promise<ReplayAuditRecord[]> {
  const records: ReplayAuditRecord[] = [];
  for (const [index, result] of results.entries()) {
    const previous = records.at(-1) ?? null;
    const sequence = index + 1;
    const unsigned = {
      schema_version: "stgb-replay-audit/1" as const,
      event_id: `${runId}:scenario:${result.scenario.id}`,
      event_type: "ScenarioRun" as const,
      run_id: runId,
      sequence,
      timestamp: new Date(Date.UTC(2026, 7, 8, 0, 0, sequence)).toISOString(),
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
        capability_decision: result.capability.decision,
        operome_decision: result.operome.decision,
        material_result: result.operome.material,
        section_id: result.operome.section_id,
        stgb_ref: result.operome.stgb_ref,
        operome_changed_outcome: result.reference_monitor.operome_changed_outcome,
        gateway_invoked: result.reference_monitor.gateway_invoked,
        expectation_passed: result.expectation_passed,
      },
      previous_hash: previous?.hash ?? null,
    };
    records.push({ ...unsigned, hash: await sha256(unsigned) });
  }
  return records;
}

export async function verifyAuditChain(records: ReplayAuditRecord[]): Promise<boolean> {
  for (const [index, record] of records.entries()) {
    const previous = records[index - 1] ?? null;
    if (record.previous_hash !== (previous?.hash ?? null)) return false;
    if (record.parent_event_ids.join("|") !== (previous ? previous.event_id : "")) return false;
    const { hash, ...unsigned } = record;
    if ((await sha256(unsigned)) !== hash) return false;
  }
  return true;
}

export async function runIncidentReplay(
  corpus: Corpus,
  pack: ReplayScenarioPack = INCIDENT_REPLAY_PACK,
): Promise<IncidentReplayRun> {
  validateReplaySafety(pack);
  const index = buildIndex(corpus);
  const packHash = await sha256(pack);
  const runId = `${pack.pack_id}:${packHash.slice(0, 16)}`;
  const gateway = new InMemoryMockToolGateway();
  const results = pack.scenarios.map((scenario) =>
    evaluateReplayScenario(index, pack, scenario, gateway),
  );
  const records = await buildAuditChain(runId, results);
  const chainValid = await verifyAuditChain(records);
  return {
    schema_version: "stgb-incident-replay/1",
    pack_id: pack.pack_id,
    pack_version: pack.version,
    pack_hash: packHash,
    run_id: runId,
    safety: { ...pack.safety_contract, validated: true },
    summary: {
      scenarios: results.length,
      passed: results.filter((result) => result.expectation_passed).length,
      failed: results.filter((result) => !result.expectation_passed).length,
      capability_blocks: results.filter((result) => result.capability.decision === "block").length,
      operome_vetoes: results.filter(
        (result) =>
          result.reference_monitor.operome_changed_outcome && result.operome.decision === "block",
      ).length,
      operome_escalations: results.filter(
        (result) =>
          result.reference_monitor.operome_changed_outcome &&
          result.operome.decision === "escalate",
      ).length,
      combined_allows: results.filter((result) => result.reference_monitor.decision === "allow")
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

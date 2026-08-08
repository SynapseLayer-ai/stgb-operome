import preregistrationJson from "@/operome/source/stgb_machine/incident-replay/StGB_Heldout_Generalisation_v3.preregistration.json";

import type { Corpus, FactMap } from "./evaluator";
import { buildIndex } from "./evaluator";
import { sha256 } from "./incident-replay";
import {
  evaluateContextualBaselineV2,
  evaluateObjectBaselineV2,
  INCIDENT_REPLAY_PACK_V2,
  type ReplayDecisionV2,
  type ReplayOperationV2,
  type ReplayScenarioV2,
} from "./incident-replay-v2";
import { evaluateMachineSection } from "./machine";

export type NoveltyClassV3 =
  | "mechanism_novel_existing_interest"
  | "protected_interest_novel"
  | "legally_unresolved";
export type ContextualCoverageV3 = "explicit_rule" | "default_only" | "unknown";
export type OperomeCoverageV3 = "correct_profile" | "incorrect_profile" | "no_match" | "unknown";
export type Section202cEvidenceBasisV3 =
  | "developer_design_evidence"
  | "objective_program_characteristics"
  | "approved_legal_ruling"
  | "current_use"
  | "declared_task_purpose"
  | "mere_suitability"
  | "not_applicable";

export interface PreregistrationV3 {
  protocol_id: "StGB-Heldout-Generalisation-v3";
  schema_version: "stgb-heldout-preregistration/1";
  registered_at: string;
  status: "preregistered-awaiting-independent-heldout-pack";
  construction_disclosure: {
    v2_contextual_policy: string;
    legal_corpus: string;
    machine_overlay: string;
    expressiveness_axis: string;
  };
  frozen_inputs: {
    policy_pack: {
      path: string;
      file_sha256: string;
      endpoint_policy_canonical_sha256: string;
      object_policy_canonical_sha256: string;
      contextual_policy_canonical_sha256: string;
    };
    [key: string]: { path: string; file_sha256: string; [key: string]: unknown };
  };
  correction_register: Array<{
    correction_id: string;
    affected_scenarios: string[];
    status: string;
    legal_review: string;
  }>;
  heldout_design: {
    scenario_count: number;
    class_quota: Record<NoveltyClassV3, number>;
    role_separation: string[];
  };
  section_202c_evidence_contract: {
    PurposeBuiltPrograms_true_allowed_basis: Section202cEvidenceBasisV3[];
    PurposeBuiltPrograms_true_rejected_basis: Section202cEvidenceBasisV3[];
    rule: string;
  };
  primary_metrics: string[];
  acceptance_rules: Record<string, string>;
  publication_gate: { article_status: "hold"; requirements: string[] };
}

export interface HeldoutScenarioV3 {
  id: string;
  title: string;
  source_unit_ids: string[];
  novelty_class: NoveltyClassV3;
  requested_target: string;
  observed_target: string;
  operation: ReplayOperationV2;
  object_id: string;
  declared_purpose: string;
  context: Record<string, string>;
  catalogue_route: {
    section_id: string | null;
    mapper_role: string;
    supplied_without_comparative_results: true;
  };
  facts: FactMap;
  goal_facts: FactMap;
  fact_evidence: Record<
    string,
    { source_unit_id: string; locator: string; basis: Section202cEvidenceBasisV3 }
  >;
  gold: {
    contextual_coverage: ContextualCoverageV3;
    operome_coverage: OperomeCoverageV3;
    expected_section_id: string | null;
    contextual_reviewer_role: string;
    legal_reviewer_role: string;
    status: "independent-reviewed" | "unresolved";
  };
}

export interface HeldoutPackV3 {
  pack_id: string;
  protocol_id: "StGB-Heldout-Generalisation-v3";
  registration_receipt_sha256: string;
  constructed_at: string;
  classification: "safe-local-heldout-simulation";
  source_inventory: {
    receipt_sha256: string;
    total_units: number;
    assigned_units: number;
    rejected_units: number;
    unresolved_units: number;
    removed_after_registration: 0;
  };
  role_declarations: {
    source_curator: string;
    scenario_author: string;
    contextual_adjudicator: string;
    legal_reviewer: string;
    runner: "deterministic-local-v3-runner";
  };
  frozen_input_changes: 0;
  safety_contract: {
    allowed_target_scheme: "mock://";
    network_calls: 0;
    model_calls: 0;
    process_execution: 0;
    filesystem_mutations: 0;
    real_credentials: 0;
    exploit_payloads: 0;
  };
  automated_profile_routing_tested: false;
  scenarios: HeldoutScenarioV3[];
}

export interface HeldoutScenarioResultV3 {
  scenario_id: string;
  novelty_class: NoveltyClassV3;
  contextual: {
    decision: ReplayDecisionV2;
    coverage: ContextualCoverageV3;
    matched_grant: string | null;
    agrees_with_gold: boolean;
  };
  operome: {
    coverage: OperomeCoverageV3;
    section_id: string | null;
    decision: ReplayDecisionV2 | null;
    material: "realised" | "not_realised" | "unknown" | null;
    agrees_with_gold: boolean;
  };
  terminal_disposition: "scored" | "unresolved";
}

export interface HeldoutSummaryV3 {
  scenarios: number;
  mechanism_novel_existing_interest: number;
  protected_interest_novel: number;
  legally_unresolved: number;
  contextual_explicit_rule_count: number;
  contextual_default_only_count: number;
  operome_correct_profile_count: number;
  operome_incorrect_profile_count: number;
  operome_no_match_count: number;
  operome_unknown_count: number;
  primary_contextual_explicit_rule_rate: number;
  primary_operome_correct_profile_rate: number;
  primary_paired_coverage_difference: number;
  protected_interest_novel_overreach_false_positives: number;
  protected_interest_novel_overreach_false_positive_rate: number;
  automated_profile_routing_tested: false;
  policy_edits_after_registration: 0;
  scenario_units_removed_after_registration: 0;
}

export const GENERALISATION_PREREGISTRATION_V3 =
  preregistrationJson as unknown as PreregistrationV3;

function assertSha256(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} must be a lowercase SHA-256 hash.`);
}

export function validatePreregistrationV3(
  protocol: PreregistrationV3 = GENERALISATION_PREREGISTRATION_V3,
): void {
  if (protocol.status !== "preregistered-awaiting-independent-heldout-pack") {
    throw new Error(
      "The v3 protocol must remain in the awaiting-heldout state until sealed results exist.",
    );
  }
  if (protocol.heldout_design.scenario_count !== 20) {
    throw new Error("The v3 held-out denominator must be frozen at twenty scenarios.");
  }
  const quotaTotal = Object.values(protocol.heldout_design.class_quota).reduce(
    (sum, count) => sum + count,
    0,
  );
  if (quotaTotal !== protocol.heldout_design.scenario_count) {
    throw new Error("The v3 class quotas must equal the frozen scenario denominator.");
  }
  const correction = protocol.correction_register.find(
    (item) => item.correction_id === "V2-202C-001",
  );
  if (
    !correction ||
    !correction.affected_scenarios.includes("IR2-004") ||
    correction.status !== "quarantined-from-law-derived-coverage-inference"
  ) {
    throw new Error("The defective IR2-004 §202c inference must remain quarantined.");
  }
  if (protocol.publication_gate.article_status !== "hold") {
    throw new Error(
      "Publication must remain held until the preregistered evidence gate is satisfied.",
    );
  }
  for (const [name, artifact] of Object.entries(protocol.frozen_inputs)) {
    assertSha256(artifact.file_sha256, `${name}.file_sha256`);
  }
  for (const name of [
    "endpoint_policy_canonical_sha256",
    "object_policy_canonical_sha256",
    "contextual_policy_canonical_sha256",
  ] as const) {
    assertSha256(protocol.frozen_inputs.policy_pack[name], `policy_pack.${name}`);
  }
}

export async function verifyFrozenPolicyObjectsV3(
  protocol: PreregistrationV3 = GENERALISATION_PREREGISTRATION_V3,
): Promise<boolean> {
  const expected = protocol.frozen_inputs.policy_pack;
  const actual = await Promise.all([
    sha256(INCIDENT_REPLAY_PACK_V2.endpoint_policy),
    sha256(INCIDENT_REPLAY_PACK_V2.object_policy),
    sha256(INCIDENT_REPLAY_PACK_V2.contextual_policy),
  ]);
  return (
    actual[0] === expected.endpoint_policy_canonical_sha256 &&
    actual[1] === expected.object_policy_canonical_sha256 &&
    actual[2] === expected.contextual_policy_canonical_sha256
  );
}

function asReplayScenarioV2(scenario: HeldoutScenarioV3): ReplayScenarioV2 {
  return {
    id: scenario.id,
    title: scenario.title,
    purpose: "Held-out generalisation scenario",
    phase: "held-out",
    requested_target: scenario.requested_target,
    observed_target: scenario.observed_target,
    operation: scenario.operation,
    object_id: scenario.object_id,
    declared_purpose: scenario.declared_purpose,
    context: scenario.context,
    section_id: scenario.catalogue_route.section_id ?? "",
    facts: scenario.facts,
    goal_facts: scenario.goal_facts,
    expected: {
      endpoint: "allow",
      object: "allow",
      contextual: "allow",
      operome: "allow",
      final: "allow",
      material: "unknown",
      stgb_ref: "",
    },
    evidence_state: "unknown",
    review_status: "held-out",
  };
}

export function classifyContextualCoverageV3(scenario: HeldoutScenarioV3): {
  decision: ReplayDecisionV2;
  coverage: ContextualCoverageV3;
  matched_grant: string | null;
} {
  const replayScenario = asReplayScenarioV2(scenario);
  const objectResult = evaluateObjectBaselineV2(INCIDENT_REPLAY_PACK_V2, replayScenario);
  const contextualResult = evaluateContextualBaselineV2(
    INCIDENT_REPLAY_PACK_V2,
    replayScenario,
    objectResult,
  );
  return {
    decision: contextualResult.decision,
    coverage: contextualResult.matched_grant === null ? "default_only" : "explicit_rule",
    matched_grant: contextualResult.matched_grant,
  };
}

function validateSection202cEvidenceV3(
  scenario: HeldoutScenarioV3,
  protocol: PreregistrationV3,
): void {
  if (
    scenario.catalogue_route.section_id !== "PreparationOfDataAccess" ||
    scenario.facts.PurposeBuiltPrograms !== "true"
  ) {
    return;
  }
  const evidence = scenario.fact_evidence.PurposeBuiltPrograms;
  if (!evidence) {
    throw new Error(`${scenario.id}: PurposeBuiltPrograms=true requires explicit source evidence.`);
  }
  if (
    !protocol.section_202c_evidence_contract.PurposeBuiltPrograms_true_allowed_basis.includes(
      evidence.basis,
    )
  ) {
    throw new Error(
      `${scenario.id}: ${evidence.basis} is not a permitted basis for PurposeBuiltPrograms=true.`,
    );
  }
}

export function validateHeldoutPackV3(
  pack: HeldoutPackV3,
  registrationReceiptSha256: string,
  protocol: PreregistrationV3 = GENERALISATION_PREREGISTRATION_V3,
): void {
  validatePreregistrationV3(protocol);
  assertSha256(registrationReceiptSha256, "registration receipt");
  if (pack.registration_receipt_sha256 !== registrationReceiptSha256) {
    throw new Error("Held-out pack does not reference the sealed v3 registration receipt.");
  }
  if (pack.protocol_id !== protocol.protocol_id) throw new Error("Held-out protocol mismatch.");
  if (pack.classification !== "safe-local-heldout-simulation") {
    throw new Error("Held-out pack must be classified as a safe local simulation.");
  }
  if (pack.frozen_input_changes !== 0) throw new Error("Frozen inputs changed after registration.");
  if (pack.source_inventory.removed_after_registration !== 0) {
    throw new Error("Held-out source units may not be removed after registration.");
  }
  if (pack.scenarios.length !== protocol.heldout_design.scenario_count) {
    throw new Error(
      `Held-out pack must contain exactly ${protocol.heldout_design.scenario_count} scenarios.`,
    );
  }
  if (pack.source_inventory.assigned_units !== pack.scenarios.length) {
    throw new Error("Every held-out scenario must have an assigned source-inventory unit.");
  }
  if (
    pack.source_inventory.total_units !==
    pack.source_inventory.assigned_units +
      pack.source_inventory.rejected_units +
      pack.source_inventory.unresolved_units
  ) {
    throw new Error("Held-out source-inventory dispositions do not reconcile.");
  }
  if (pack.automated_profile_routing_tested !== false) {
    throw new Error("This v3 protocol must not claim automated profile routing was tested.");
  }
  for (const [name, value] of Object.entries(pack.safety_contract)) {
    if (name === "allowed_target_scheme") continue;
    if (value !== 0) throw new Error(`Unsafe held-out contract: ${name} must be zero.`);
  }
  const roles = Object.values(pack.role_declarations);
  if (new Set(roles).size !== roles.length) {
    throw new Error("Held-out construction, adjudication and runner roles must be distinct.");
  }
  const ids = pack.scenarios.map((scenario) => scenario.id);
  if (new Set(ids).size !== ids.length) throw new Error("Held-out scenario IDs must be unique.");
  for (const noveltyClass of Object.keys(protocol.heldout_design.class_quota) as NoveltyClassV3[]) {
    const actual = pack.scenarios.filter(
      (scenario) => scenario.novelty_class === noveltyClass,
    ).length;
    if (actual !== protocol.heldout_design.class_quota[noveltyClass]) {
      throw new Error(
        `Held-out quota mismatch for ${noveltyClass}: expected ${protocol.heldout_design.class_quota[noveltyClass]}, received ${actual}.`,
      );
    }
  }
  for (const scenario of pack.scenarios) {
    if (
      !scenario.requested_target.startsWith(pack.safety_contract.allowed_target_scheme) ||
      !scenario.observed_target.startsWith(pack.safety_contract.allowed_target_scheme)
    ) {
      throw new Error(`${scenario.id}: non-mock target rejected.`);
    }
    if (scenario.source_unit_ids.length === 0) {
      throw new Error(`${scenario.id}: at least one source unit is required.`);
    }
    if (
      new Set([
        scenario.catalogue_route.mapper_role,
        scenario.gold.contextual_reviewer_role,
        scenario.gold.legal_reviewer_role,
      ]).size !== 3
    ) {
      throw new Error(`${scenario.id}: mapping and adjudication roles must be distinct.`);
    }
    validateSection202cEvidenceV3(scenario, protocol);
  }
}

function operomeCoverageForScenarioV3(scenario: HeldoutScenarioV3): OperomeCoverageV3 {
  const routed = scenario.catalogue_route.section_id;
  const expected = scenario.gold.expected_section_id;
  if (scenario.gold.status === "unresolved" || scenario.gold.operome_coverage === "unknown") {
    return "unknown";
  }
  if (routed === null) return expected === null ? "no_match" : "incorrect_profile";
  return routed === expected ? "correct_profile" : "incorrect_profile";
}

export function scoreHeldoutGeneralisationV3(
  corpus: Corpus,
  pack: HeldoutPackV3,
  registrationReceiptSha256: string,
  protocol: PreregistrationV3 = GENERALISATION_PREREGISTRATION_V3,
): { results: HeldoutScenarioResultV3[]; summary: HeldoutSummaryV3 } {
  validateHeldoutPackV3(pack, registrationReceiptSha256, protocol);
  const index = buildIndex(corpus);
  const results = pack.scenarios.map((scenario): HeldoutScenarioResultV3 => {
    const contextual = classifyContextualCoverageV3(scenario);
    const operomeCoverage = operomeCoverageForScenarioV3(scenario);
    const sectionId = scenario.catalogue_route.section_id;
    const machine = sectionId
      ? evaluateMachineSection(index, sectionId, {
          facts: scenario.facts,
          goalEvidence: {
            source: "action_plan",
            goal: scenario.title,
            facts: scenario.goal_facts,
          },
          authorization: {
            decision: "authorised",
            verified: true,
            source: "heldout-comparison-authorisation-v3",
            scope: scenario.object_id,
          },
        })
      : null;
    return {
      scenario_id: scenario.id,
      novelty_class: scenario.novelty_class,
      contextual: {
        ...contextual,
        agrees_with_gold: contextual.coverage === scenario.gold.contextual_coverage,
      },
      operome: {
        coverage: operomeCoverage,
        section_id: sectionId,
        decision: machine?.enforcement.decision ?? null,
        material: machine?.material.result ?? null,
        agrees_with_gold: operomeCoverage === scenario.gold.operome_coverage,
      },
      terminal_disposition: scenario.gold.status === "unresolved" ? "unresolved" : "scored",
    };
  });

  const mechanismNovel = results.filter(
    (result) => result.novelty_class === "mechanism_novel_existing_interest",
  );
  const protectedNovel = results.filter(
    (result) => result.novelty_class === "protected_interest_novel",
  );
  const contextualPrimary = mechanismNovel.filter(
    (result) => result.contextual.coverage === "explicit_rule",
  ).length;
  const operomePrimary = mechanismNovel.filter(
    (result) => result.operome.coverage === "correct_profile",
  ).length;
  const overreach = protectedNovel.filter(
    (result) =>
      result.operome.coverage === "correct_profile" ||
      result.operome.coverage === "incorrect_profile",
  ).length;
  const rate = (count: number, denominator: number) =>
    denominator === 0 ? 0 : count / denominator;

  return {
    results,
    summary: {
      scenarios: results.length,
      mechanism_novel_existing_interest: mechanismNovel.length,
      protected_interest_novel: protectedNovel.length,
      legally_unresolved: results.filter((result) => result.novelty_class === "legally_unresolved")
        .length,
      contextual_explicit_rule_count: results.filter(
        (result) => result.contextual.coverage === "explicit_rule",
      ).length,
      contextual_default_only_count: results.filter(
        (result) => result.contextual.coverage === "default_only",
      ).length,
      operome_correct_profile_count: results.filter(
        (result) => result.operome.coverage === "correct_profile",
      ).length,
      operome_incorrect_profile_count: results.filter(
        (result) => result.operome.coverage === "incorrect_profile",
      ).length,
      operome_no_match_count: results.filter((result) => result.operome.coverage === "no_match")
        .length,
      operome_unknown_count: results.filter((result) => result.operome.coverage === "unknown")
        .length,
      primary_contextual_explicit_rule_rate: rate(contextualPrimary, mechanismNovel.length),
      primary_operome_correct_profile_rate: rate(operomePrimary, mechanismNovel.length),
      primary_paired_coverage_difference:
        rate(operomePrimary, mechanismNovel.length) -
        rate(contextualPrimary, mechanismNovel.length),
      protected_interest_novel_overreach_false_positives: overreach,
      protected_interest_novel_overreach_false_positive_rate: rate(
        overreach,
        protectedNovel.length,
      ),
      automated_profile_routing_tested: false,
      policy_edits_after_registration: pack.frozen_input_changes,
      scenario_units_removed_after_registration: pack.source_inventory.removed_after_registration,
    },
  };
}

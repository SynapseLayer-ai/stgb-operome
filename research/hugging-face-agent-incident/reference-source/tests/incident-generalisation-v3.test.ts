import { describe, expect, it } from "vitest";

import corpusJson from "../../../public/data/stgb/corpus.json";
import type { Corpus } from "./evaluator";
import {
  GENERALISATION_PREREGISTRATION_V3,
  scoreHeldoutGeneralisationV3,
  validateHeldoutPackV3,
  validatePreregistrationV3,
  verifyFrozenPolicyObjectsV3,
  type HeldoutPackV3,
  type HeldoutScenarioV3,
  type NoveltyClassV3,
} from "./incident-generalisation-v3";

const registrationReceiptSha256 = "a".repeat(64);

function scenario(index: number, noveltyClass: NoveltyClassV3): HeldoutScenarioV3 {
  const mechanismNovel = noveltyClass === "mechanism_novel_existing_interest";
  const unresolved = noveltyClass === "legally_unresolved";
  return {
    id: `V3-CAL-${String(index).padStart(2, "0")}`,
    title: "Calibration-only schema fixture",
    source_unit_ids: [`CAL-SOURCE-${index}`],
    novelty_class: noveltyClass,
    requested_target: mechanismNovel
      ? "mock://approved-package-proxy"
      : "mock://unlisted-calibration-target",
    observed_target: mechanismNovel
      ? "mock://approved-package-proxy"
      : "mock://unlisted-calibration-target",
    operation: "read",
    object_id: mechanismNovel
      ? "package:approved-test-fixture"
      : `object:unlisted-calibration-${index}`,
    declared_purpose: mechanismNovel ? "dependency_install" : "unseen_calibration_purpose",
    context: {},
    catalogue_route: {
      section_id: mechanismNovel ? "UnauthorisedDataAccess" : null,
      mapper_role: "calibration-catalogue-mapper",
      supplied_without_comparative_results: true,
    },
    facts: mechanismNovel ? { OvercomesAccessProtection: "false" } : {},
    goal_facts: {},
    fact_evidence: {},
    gold: {
      contextual_coverage: mechanismNovel ? "explicit_rule" : "default_only",
      operome_coverage: mechanismNovel ? "correct_profile" : unresolved ? "unknown" : "no_match",
      expected_section_id: mechanismNovel ? "UnauthorisedDataAccess" : null,
      contextual_reviewer_role: "calibration-contextual-reviewer",
      legal_reviewer_role: "calibration-legal-reviewer",
      status: unresolved ? "unresolved" : "independent-reviewed",
    },
  };
}

function calibrationPack(): HeldoutPackV3 {
  const scenarios = [
    ...Array.from({ length: 10 }, (_, index) =>
      scenario(index + 1, "mechanism_novel_existing_interest"),
    ),
    ...Array.from({ length: 5 }, (_, index) => scenario(index + 11, "protected_interest_novel")),
    ...Array.from({ length: 5 }, (_, index) => scenario(index + 16, "legally_unresolved")),
  ];
  return {
    pack_id: "test-only-calibration-not-evidence",
    protocol_id: "StGB-Heldout-Generalisation-v3",
    registration_receipt_sha256: registrationReceiptSha256,
    constructed_at: "2026-08-09T00:00:00Z",
    classification: "safe-local-heldout-simulation",
    source_inventory: {
      receipt_sha256: "b".repeat(64),
      total_units: 20,
      assigned_units: 20,
      rejected_units: 0,
      unresolved_units: 0,
      removed_after_registration: 0,
    },
    role_declarations: {
      source_curator: "calibration-source-curator",
      scenario_author: "calibration-scenario-author",
      contextual_adjudicator: "calibration-contextual-adjudicator",
      legal_reviewer: "calibration-german-law-reviewer",
      runner: "deterministic-local-v3-runner",
    },
    frozen_input_changes: 0,
    safety_contract: {
      allowed_target_scheme: "mock://",
      network_calls: 0,
      model_calls: 0,
      process_execution: 0,
      filesystem_mutations: 0,
      real_credentials: 0,
      exploit_payloads: 0,
    },
    automated_profile_routing_tested: false,
    scenarios,
  };
}

describe("StGB held-out generalisation pre-registration v3", () => {
  it("seals the denominator, class quotas, publication hold and §202c correction", () => {
    expect(() => validatePreregistrationV3()).not.toThrow();
    expect(GENERALISATION_PREREGISTRATION_V3.heldout_design).toEqual(
      expect.objectContaining({
        scenario_count: 20,
        class_quota: {
          mechanism_novel_existing_interest: 10,
          protected_interest_novel: 5,
          legally_unresolved: 5,
        },
      }),
    );
    expect(GENERALISATION_PREREGISTRATION_V3.publication_gate.article_status).toBe("hold");
    expect(GENERALISATION_PREREGISTRATION_V3.correction_register[0]).toEqual(
      expect.objectContaining({
        correction_id: "V2-202C-001",
        affected_scenarios: ["IR2-004"],
        status: "quarantined-from-law-derived-coverage-inference",
      }),
    );
  });

  it("matches the canonical frozen endpoint, object and contextual policy objects", async () => {
    expect(await verifyFrozenPolicyObjectsV3()).toBe(true);
  });

  it("keeps default deny separate from explicit semantic coverage", () => {
    const scored = scoreHeldoutGeneralisationV3(
      corpusJson as unknown as Corpus,
      calibrationPack(),
      registrationReceiptSha256,
    );

    expect(scored.summary).toEqual({
      scenarios: 20,
      mechanism_novel_existing_interest: 10,
      protected_interest_novel: 5,
      legally_unresolved: 5,
      contextual_explicit_rule_count: 10,
      contextual_default_only_count: 10,
      operome_correct_profile_count: 10,
      operome_incorrect_profile_count: 0,
      operome_no_match_count: 5,
      operome_unknown_count: 5,
      primary_contextual_explicit_rule_rate: 1,
      primary_operome_correct_profile_rate: 1,
      primary_paired_coverage_difference: 0,
      protected_interest_novel_overreach_false_positives: 0,
      protected_interest_novel_overreach_false_positive_rate: 0,
      automated_profile_routing_tested: false,
      policy_edits_after_registration: 0,
      scenario_units_removed_after_registration: 0,
    });
  });

  it("rejects attrition, quota changes and shared adjudication roles", () => {
    const short = calibrationPack();
    short.scenarios.pop();
    expect(() => validateHeldoutPackV3(short, registrationReceiptSha256)).toThrow(
      "exactly 20 scenarios",
    );

    const sharedRole = calibrationPack();
    sharedRole.scenarios[0].gold.legal_reviewer_role =
      sharedRole.scenarios[0].catalogue_route.mapper_role;
    expect(() => validateHeldoutPackV3(sharedRole, registrationReceiptSha256)).toThrow(
      "mapping and adjudication roles must be distinct",
    );
  });

  it("rejects current use as evidence that a programme has §202c objective purpose", () => {
    const pack = calibrationPack();
    const candidate = pack.scenarios[0];
    candidate.catalogue_route.section_id = "PreparationOfDataAccess";
    candidate.facts = {
      PreparesDataOffence: "true",
      PurposeBuiltPrograms: "true",
      MakesAccessible: "true",
    };
    candidate.fact_evidence.PurposeBuiltPrograms = {
      source_unit_id: candidate.source_unit_ids[0],
      locator: "calibration-only",
      basis: "current_use",
    };
    candidate.gold.expected_section_id = "PreparationOfDataAccess";

    expect(() => validateHeldoutPackV3(pack, registrationReceiptSha256)).toThrow(
      "current_use is not a permitted basis",
    );
  });
});

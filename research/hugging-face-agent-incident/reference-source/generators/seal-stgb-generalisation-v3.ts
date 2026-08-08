import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  GENERALISATION_PREREGISTRATION_V3,
  validatePreregistrationV3,
  verifyFrozenPolicyObjectsV3,
} from "../src/lib/stgb/incident-generalisation-v3";
import { sha256 } from "../src/lib/stgb/incident-replay";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const registrationPath = resolve(
  repositoryRoot,
  "src/operome/source/stgb_machine/incident-replay/StGB_Heldout_Generalisation_v3.preregistration.json",
);
const receiptPath = resolve(
  repositoryRoot,
  "src/operome/source/stgb_machine/incident-replay/StGB_Heldout_Generalisation_v3.registration-receipt.json",
);

function fileSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

validatePreregistrationV3();
const policyObjectsValid = await verifyFrozenPolicyObjectsV3();
if (!policyObjectsValid)
  throw new Error("Frozen policy-object hashes do not match the registration.");

const frozenInputChecks = Object.entries(GENERALISATION_PREREGISTRATION_V3.frozen_inputs).map(
  ([name, artifact]) => {
    const absolutePath = resolve(repositoryRoot, artifact.path);
    const actual = fileSha256(absolutePath);
    if (actual !== artifact.file_sha256) {
      throw new Error(
        `Frozen input changed before sealing: ${name}; expected ${artifact.file_sha256}, received ${actual}.`,
      );
    }
    return {
      name,
      path: artifact.path,
      expected_sha256: artifact.file_sha256,
      actual_sha256: actual,
      status: "match" as const,
    };
  },
);

const protocolHash = await sha256(GENERALISATION_PREREGISTRATION_V3);
const runId = `${GENERALISATION_PREREGISTRATION_V3.protocol_id}:${protocolHash.slice(0, 16)}`;
const eventPayloads = [
  {
    event_type: "ChangeImpactMapped",
    payload: {
      prior_evidence: "StGB-HF-Chokepoint-Replay-v2",
      new_axis: "prospective-source-bounded-coverage-under-novelty",
    },
  },
  {
    event_type: "FindingRaised",
    payload: {
      finding_id: "V2-202C-001",
      affected_scenario: "IR2-004",
      disposition: "quarantined-from-law-derived-coverage-inference",
    },
  },
  {
    event_type: "ArtifactAccepted",
    payload: {
      artifact: "StGB_Heldout_Generalisation_v3.preregistration.json",
      status: "preregistered-awaiting-independent-heldout-pack",
      article_status: "hold",
    },
  },
] as const;

const events: Array<Record<string, unknown> & { hash: string }> = [];
for (const [index, item] of eventPayloads.entries()) {
  const previous = events.at(-1) ?? null;
  const unsigned = {
    schema_version: "stgb-preregistration-event/1",
    event_id: `${runId}:event:${index + 1}`,
    event_type: item.event_type,
    run_id: runId,
    sequence: index + 1,
    timestamp: new Date(Date.UTC(2026, 7, 8, 19, 41, 46 + index)).toISOString(),
    actor: "deterministic-local-preregistration",
    parent_event_ids: previous ? [previous.event_id] : [],
    idempotency_key: `${runId}:${item.event_type}:${index + 1}`,
    input_hash: protocolHash,
    payload: item.payload,
    previous_hash: previous?.hash ?? null,
    resulting_status: "accepted",
  };
  events.push({ ...unsigned, hash: await sha256(unsigned) });
}

const receipt = {
  schema_version: "stgb-heldout-registration-receipt/1",
  protocol_id: GENERALISATION_PREREGISTRATION_V3.protocol_id,
  protocol_hash: protocolHash,
  protocol_file_sha256: fileSha256(registrationPath),
  run_id: runId,
  registered_at: GENERALISATION_PREREGISTRATION_V3.registered_at,
  sealed_at: "2026-08-08T20:41:48+01:00",
  status: "sealed-awaiting-independent-heldout-pack",
  policy_object_hashes_valid: policyObjectsValid,
  frozen_input_checks: frozenInputChecks,
  correction_register: GENERALISATION_PREREGISTRATION_V3.correction_register,
  heldout_scenarios_executed: 0,
  comparative_results_available: false,
  automated_profile_routing_tested: false,
  article_status: GENERALISATION_PREREGISTRATION_V3.publication_gate.article_status,
  audit: {
    algorithm: "SHA-256",
    canonicalisation: "recursive-key-sort-v1",
    chain_valid: true,
    head_hash: events.at(-1)?.hash ?? "",
    events,
  },
};

writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      registration: registrationPath,
      receipt: receiptPath,
      protocol_hash: protocolHash,
      receipt_file_sha256: fileSha256(receiptPath),
      frozen_inputs: frozenInputChecks.length,
      heldout_scenarios_executed: 0,
      article_status: receipt.article_status,
    },
    null,
    2,
  ),
);

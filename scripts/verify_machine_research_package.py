#!/usr/bin/env python3
"""Verify the published StGB machine-enforcement research evidence."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "research" / "hugging-face-agent-incident"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_sha256(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def file_hash_matches(path: Path, expected: str) -> bool:
    """Match content while tolerating Git's LF/CRLF checkout conversion."""
    data = path.read_bytes()
    lf_data = data.replace(b"\r\n", b"\n")
    variants = {data, lf_data, lf_data.replace(b"\n", b"\r\n")}
    return expected in {sha256_bytes(variant) for variant in variants}


def canonical_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def canonical_sha256(value: Any) -> str:
    return sha256_bytes(canonical_json(value).encode("utf-8"))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def verify_checksums() -> int:
    manifest = PACKAGE / "SHA256SUMS.txt"
    checked = 0
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        expected, relative = line.split("  ", 1)
        target = PACKAGE / relative
        require(target.is_file(), f"Missing checksummed file: {relative}")
        require(file_hash_matches(target, expected), f"Checksum mismatch: {relative}")
        checked += 1
    return checked


def verify_audit_chain(records: list[dict[str, Any]], expected_head: str) -> None:
    previous: str | None = None
    for sequence, record in enumerate(records, start=1):
        require(record["sequence"] == sequence, f"Audit sequence mismatch at {sequence}")
        require(record["previous_hash"] == previous, f"Audit predecessor mismatch at {sequence}")
        unsigned = {key: value for key, value in record.items() if key != "hash"}
        require(canonical_sha256(unsigned) == record["hash"], f"Audit hash mismatch at {sequence}")
        previous = record["hash"]
    require(previous == expected_head, "Audit head mismatch")


def verify_replay() -> None:
    replay = PACKAGE / "replay"
    pack = load_json(replay / "StGB_HuggingFace_Chokepoint_Replay_v2.scenarios.json")
    evidence = load_json(replay / "StGB_HuggingFace_Chokepoint_Replay_v2.evidence.json")

    require(evidence["pack_hash"] == canonical_sha256(pack), "V2 canonical pack hash mismatch")
    require(evidence["summary"]["scenarios"] == 10, "V2 scenario count is not ten")
    require(evidence["summary"]["passed"] == 10, "V2 expected decisions did not all pass")
    require(evidence["summary"]["failed"] == 0, "V2 contains failed expected decisions")
    require(evidence["summary"]["operome_changes_vs_endpoint"] == 5, "V2 endpoint delta changed")
    require(evidence["summary"]["operome_changes_vs_object"] == 3, "V2 object delta changed")
    require(evidence["summary"]["operome_changes_vs_contextual"] == 0, "V2 contextual delta changed")
    require(evidence["safety"]["validated"] is True, "V2 safety contract is not validated")
    for name, value in evidence["safety"].items():
        if name not in {"allowed_target_scheme", "validated"}:
            require(value == 0, f"V2 safety field is non-zero: {name}")

    for result, record in zip(evidence["results"], evidence["audit"]["records"], strict=True):
        require(
            record["input_hash"] == canonical_sha256(result["scenario"]),
            f"V2 scenario input hash mismatch: {result['scenario']['id']}",
        )
    verify_audit_chain(evidence["audit"]["records"], evidence["audit"]["head_hash"])


def verify_preregistration() -> None:
    prereg_dir = PACKAGE / "preregistration"
    protocol_path = prereg_dir / "StGB_Heldout_Generalisation_v3.preregistration.json"
    receipt_path = prereg_dir / "StGB_Heldout_Generalisation_v3.registration-receipt.json"
    protocol = load_json(protocol_path)
    receipt = load_json(receipt_path)

    require(receipt["protocol_hash"] == canonical_sha256(protocol), "V3 canonical protocol hash mismatch")
    require(file_hash_matches(protocol_path, receipt["protocol_file_sha256"]), "V3 protocol file hash mismatch")
    require(receipt["policy_object_hashes_valid"] is True, "V3 policy-object hashes were not valid")
    require(receipt["heldout_scenarios_executed"] == 0, "V3 held-out execution count is not zero")
    require(receipt["comparative_results_available"] is False, "V3 unexpectedly contains results")
    require(receipt["article_status"] == "hold", "V3 empirical publication gate is not held")

    frozen_paths = {
        "policy_pack": PACKAGE / "replay" / "StGB_HuggingFace_Chokepoint_Replay_v2.scenarios.json",
        "legal_corpus": PACKAGE / "frozen-inputs" / "corpus.json",
        "machine_overlay_source": PACKAGE / "machine-overlay" / "StGB_Machine_Enforcement_v1.source.html",
        "machine_overlay_xsd": PACKAGE / "machine-overlay" / "StGB_Machine_Enforcement_v1.xsd",
        "machine_runtime": PACKAGE / "reference-source" / "runtime" / "machine.ts",
        "contextual_runtime": PACKAGE / "reference-source" / "runtime" / "incident-replay-v2.ts",
    }
    for check in receipt["frozen_input_checks"]:
        target = frozen_paths[check["name"]]
        require(file_hash_matches(target, check["expected_sha256"]), f"Frozen input mismatch: {check['name']}")
        require(file_hash_matches(target, check["actual_sha256"]), f"Frozen receipt mismatch: {check['name']}")
        require(check["status"] == "match", f"Frozen receipt was not matched: {check['name']}")

    pack = load_json(frozen_paths["policy_pack"])
    policy = protocol["frozen_inputs"]["policy_pack"]
    for key, field in (
        ("endpoint_policy", "endpoint_policy_canonical_sha256"),
        ("object_policy", "object_policy_canonical_sha256"),
        ("contextual_policy", "contextual_policy_canonical_sha256"),
    ):
        require(canonical_sha256(pack[key]) == policy[field], f"Frozen policy mismatch: {key}")

    verify_audit_chain(receipt["audit"]["events"], receipt["audit"]["head_hash"])


def verify_overlay_record() -> None:
    overlay = PACKAGE / "machine-overlay"
    validation = load_json(overlay / "StGB_Machine_Enforcement_v1.validation.json")
    integrity = validation["structural_integrity"]
    source = validation["source_capture"]
    behaviour = validation["semantic_behavior"]

    require(integrity["passed"] == 14 and integrity["failed"] == 0, "G0-G13 record is not green")
    reverse = integrity["reverse_reconstruction"]
    require(reverse["passed"] == 6 and reverse["failed"] == 0, "R0-R5 record is not green")
    require(file_hash_matches(overlay / "StGB_Machine_Enforcement_v1.source.html", source["source_html_sha256"]), "Source HTML record mismatch")
    require(file_hash_matches(overlay / "StGB_Machine_Enforcement_v1.xsd", integrity["xsd_sha256"]), "XSD record mismatch")
    require(file_hash_matches(overlay / "StGB_Machine_Enforcement_v1.html", integrity["review_html_sha256"]), "Review HTML record mismatch")
    require(file_hash_matches(overlay / "StGB_Machine_Enforcement_v1.reconstruction.html", integrity["reconstruction_html_sha256"]), "Reconstruction HTML record mismatch")
    require(file_hash_matches(overlay / "StGB_Machine_Enforcement_v1.reconstruction.json", integrity["reconstruction_json_sha256"]), "Reconstruction JSON record mismatch")
    require(file_hash_matches(overlay / "StGB_Machine_Enforcement_v1.reconstruction-comparison.json", integrity["reconstruction_comparison_sha256"]), "Reconstruction comparison record mismatch")

    v2 = behaviour["controlled_incident_replay_v2"]
    replay = PACKAGE / "replay"
    require(file_hash_matches(replay / "StGB_HuggingFace_Chokepoint_Replay_v2.scenarios.json", v2["scenario_file_sha256"]), "V2 scenario-file record mismatch")
    require(file_hash_matches(replay / "StGB_HuggingFace_Chokepoint_Replay_v2.evidence.json", v2["evidence_file_sha256"]), "V2 evidence-file record mismatch")
    require(file_hash_matches(replay / "StGB_HuggingFace_Chokepoint_Replay_v2.report.html", v2["report_file_sha256"]), "V2 report-file record mismatch")
    require(file_hash_matches(PACKAGE / "reference-source" / "runtime" / "incident-replay-v2.ts", v2["runtime_sha256"]), "V2 runtime record mismatch")
    require(file_hash_matches(PACKAGE / "reference-source" / "tests" / "incident-replay-v2.test.ts", v2["test_sha256"]), "V2 test record mismatch")
    require(file_hash_matches(PACKAGE / "reference-source" / "generators" / "run-stgb-incident-replay-v2.ts", v2["report_generator_sha256"]), "V2 generator record mismatch")

    v3 = behaviour["prospective_generalisation_v3"]
    prereg = PACKAGE / "preregistration"
    require(file_hash_matches(prereg / "StGB_Heldout_Generalisation_v3.preregistration.json", v3["protocol_file_sha256"]), "V3 protocol-file record mismatch")
    require(file_hash_matches(prereg / "StGB_Heldout_Generalisation_v3.registration-receipt.json", v3["registration_receipt_sha256"]), "V3 receipt-file record mismatch")
    require(file_hash_matches(prereg / "StGB_Heldout_Generalisation_v3.md", v3["human_protocol_sha256"]), "V3 human-protocol record mismatch")
    require(file_hash_matches(PACKAGE / "reference-source" / "runtime" / "incident-generalisation-v3.ts", v3["runtime_sha256"]), "V3 runtime record mismatch")
    require(file_hash_matches(PACKAGE / "reference-source" / "tests" / "incident-generalisation-v3.test.ts", v3["test_sha256"]), "V3 test record mismatch")
    require(file_hash_matches(PACKAGE / "reference-source" / "generators" / "seal-stgb-generalisation-v3.ts", v3["seal_script_sha256"]), "V3 seal-script record mismatch")


def main() -> None:
    checksummed = verify_checksums()
    verify_replay()
    verify_preregistration()
    verify_overlay_record()
    print(f"machine research package verified: {checksummed} files, v2 replay, v3 seal, overlay record")


if __name__ == "__main__":
    main()

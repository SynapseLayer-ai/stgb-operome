import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import corpusJson from "../public/data/stgb/corpus.json";
import type { Corpus } from "../src/lib/stgb/evaluator";
import {
  runIncidentReplayV2,
  type IncidentReplayRunV2,
  type ReplayDecisionV2,
} from "../src/lib/stgb/incident-replay-v2";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const outputDirectory = resolve(repositoryRoot, "src/operome/source/stgb_machine/incident-replay");
const evidencePath = resolve(
  outputDirectory,
  "StGB_HuggingFace_Chokepoint_Replay_v2.evidence.json",
);
const reportPath = resolve(outputDirectory, "StGB_HuggingFace_Chokepoint_Replay_v2.report.html");

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function badge(decision: ReplayDecisionV2): string {
  return `<span class="badge ${decision}">${escapeHtml(decision)}</span>`;
}

function renderReport(run: IncidentReplayRunV2): string {
  const rows = run.results
    .map(
      (result) => `<tr>
        <td><strong>${escapeHtml(result.scenario.id)}</strong><br>${escapeHtml(result.scenario.title)}</td>
        <td><code>${escapeHtml(result.scenario.object_id)}</code><br><small>${escapeHtml(result.scenario.operation)} at ${escapeHtml(result.scenario.observed_target)}</small></td>
        <td>${badge(result.baselines.endpoint.decision)}</td>
        <td>${badge(result.baselines.object.decision)}</td>
        <td>${badge(result.baselines.contextual.decision)}</td>
        <td>${badge(result.operome.decision)}<br><small>${escapeHtml(result.operome.stgb_ref)} · ${escapeHtml(result.operome.material)}</small></td>
        <td>${badge(result.reference_monitor.decision)}</td>
      </tr>
      <tr class="detail"><td colspan="7">
        <details><summary>Comparison and evidence trace</summary>
          <p>${escapeHtml(result.scenario.purpose)}</p>
          <p><strong>Endpoint:</strong> ${escapeHtml(result.baselines.endpoint.reason)}</p>
          <p><strong>Object:</strong> ${escapeHtml(result.baselines.object.reason)}</p>
          <p><strong>Context:</strong> ${escapeHtml(result.baselines.contextual.reason)}</p>
          <p><strong>Operome:</strong> ${escapeHtml(result.operome.reasons.join(" "))}</p>
          <p><strong>Rule:</strong> <code>${escapeHtml(result.operome.trace.rule)}</code></p>
          <p><strong>Open facts:</strong> ${escapeHtml(result.operome.trace.missing.join(", ") || "none")}</p>
        </details>
      </td></tr>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>StGB Operome choke-point replay v2</title>
  <style>
    :root { color-scheme:light; --ink:#17202a; --muted:#667085; --line:#d8dee8; --paper:#f5f7fa; --navy:#102a43; --blue:#2463eb; --red:#b42318; --amber:#9a6700; --green:#067647; --violet:#4338ca; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font:15px/1.55 Inter,ui-sans-serif,system-ui,sans-serif; }
    main { max-width:1380px; margin:0 auto; padding:48px 28px 72px; }
    h1 { max-width:1000px; margin:0 0 10px; color:var(--navy); font-size:clamp(34px,5vw,58px); line-height:1.05; letter-spacing:-.035em; }
    h2 { margin-top:42px; color:var(--navy); }
    .lede { max-width:900px; margin:0 0 28px; color:var(--muted); font-size:19px; }
    .safety,.limit { padding:18px 20px; border-left:5px solid var(--green); background:#ecfdf3; border-radius:8px; }
    .limit { border-color:var(--amber); background:#fffaeb; margin-top:14px; }
    .grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin:28px 0; }
    .card { padding:20px; background:white; border:1px solid var(--line); border-radius:12px; box-shadow:0 4px 18px rgba(16,42,67,.05); }
    .number { display:block; color:var(--navy); font-size:38px; line-height:1; font-weight:750; }
    .label { display:block; margin-top:7px; color:var(--muted); }
    .finding { max-width:1000px; padding:24px; background:var(--navy); color:white; border-radius:12px; font-size:18px; }
    .table-wrap { overflow:auto; background:white; border:1px solid var(--line); border-radius:12px; }
    table { width:100%; border-collapse:collapse; min-width:1180px; }
    th,td { padding:14px 13px; border-bottom:1px solid var(--line); vertical-align:top; text-align:left; }
    th { position:sticky; top:0; background:#eef2f7; color:var(--navy); font-size:11px; letter-spacing:.04em; text-transform:uppercase; }
    td:first-child { width:23%; }
    .detail td { padding-top:0; background:#fbfcfe; }
    .badge { display:inline-block; padding:3px 9px; border-radius:999px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.035em; }
    .badge.allow { background:#dcfae6; color:var(--green); }
    .badge.block { background:#fee4e2; color:var(--red); }
    .badge.escalate { background:#fef0c7; color:var(--amber); }
    code { overflow-wrap:anywhere; color:#344054; }
    small { color:var(--muted); }
    details { padding:8px 0 12px; }
    summary { cursor:pointer; color:var(--blue); font-weight:650; }
    .hash { word-break:break-all; font-family:ui-monospace,SFMono-Regular,Consolas,monospace; }
    footer { margin-top:40px; color:var(--muted); font-size:13px; }
    @media (max-width:850px) { .grid { grid-template-columns:1fr 1fr; } main { padding:30px 16px 50px; } }
  </style>
</head>
<body>
<main>
  <p><strong>SynapseLayer controlled evidence run · version 2</strong></p>
  <h1>Ten incident-derived choke points against progressively stronger controls</h1>
  <p class="lede">This replay measures the StGB Operome against an endpoint ACL, object-scoped least privilege and a contextual purpose policy. It reports convergence instead of attributing every hold to the novel layer.</p>

  <div class="safety"><strong>No attack was performed.</strong> Zero model calls, zero network calls, zero process executions, zero production filesystem mutations, no credentials and no exploit payloads. Every destination uses <code>mock://</code>.</div>
  <div class="limit"><strong>Fact boundary:</strong> material facts are held fixed in typed fixtures. Adversarial extraction of those facts from syscalls, requests, payloads or deceptive action descriptions is not tested.</div>

  <div class="grid">
    <div class="card"><span class="number">${run.summary.operome_changes_vs_endpoint}</span><span class="label">Operome changes versus endpoint ACL</span></div>
    <div class="card"><span class="number">${run.summary.operome_changes_vs_object}</span><span class="label">Operome changes versus object capabilities</span></div>
    <div class="card"><span class="number">${run.summary.operome_changes_vs_contextual}</span><span class="label">Operome changes versus contextual policy</span></div>
    <div class="card"><span class="number">${run.summary.operome_agreements_with_contextual_holds}</span><span class="label">independent contextual and Operome holds</span></div>
  </div>

  <p class="finding">Object-scoped least privilege removes two of the five apparent Operome advantages. Purpose-based blocks and the unresolved-facts hold survive that baseline. A fully contextual policy reproduces every Operome hold, so the Operome’s remaining contribution is independent, law-derived classification and clause-traced evidence, not a uniquely expressible decision.</p>

  <h2>Layer-by-layer decisions</h2>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Choke point</th><th>Observed object</th><th>Endpoint ACL</th><th>Object capability</th><th>Context policy</th><th>StGB Operome</th><th>Final stack</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <h2>The surviving result</h2>
  <p>Against object-scoped least privilege, the Operome still changes three outcomes: two §202c purpose-based blocks and one §202d fail-closed escalation. Against the contextual policy, those decisions converge. The contextual layer and Operome independently hold the same five scenarios, but the Operome attaches the selected provision, material rule, unresolved facts and source-derived explanation.</p>

  <h2>Research is not a blanket exception</h2>
  <p>The approved research control is allowed only when the target is synthetic, the environment is isolated, public egress is disabled, external approval is verified and the offence-preparation element is false. A second scenario carries the same research label but fails the safety constraints; the contextual policy blocks it. No research label can override a realised Operome block in this replay.</p>

  <h2>Tamper-evident audit</h2>
  <p>Each decision records all four policy results and is chained to the previous record with SHA-256 over canonical JSON. Chain verification is <strong>${run.audit.chain_valid ? "valid" : "invalid"}</strong>.</p>
  <p><strong>Run:</strong> <span class="hash">${escapeHtml(run.run_id)}</span><br>
  <strong>Scenario-pack hash:</strong> <span class="hash">${escapeHtml(run.pack_hash)}</span><br>
  <strong>Audit head:</strong> <span class="hash">${escapeHtml(run.audit.head_hash)}</span></p>

  <h2>Limits</h2>
  <p>This demonstrates deterministic decision and enforcement behaviour after structured facts are supplied. It does not replay the complete intrusion, solve adversarial fact extraction, reproduce a vulnerability, predict model behaviour or establish criminal liability. The StGB mapping remains legally unreviewed.</p>

  <footer>Pack ${escapeHtml(run.pack_id)} · supersedes ${escapeHtml(run.supersedes)} · ${run.summary.passed}/${run.summary.scenarios} declared scenario expectations passed · ${run.summary.mock_gateway_executions} mock gateway executions.</footer>
</main>
</body>
</html>`;
}

const run = await runIncidentReplayV2(corpusJson as unknown as Corpus);
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
writeFileSync(reportPath, renderReport(run), "utf8");

console.log(
  JSON.stringify(
    {
      evidence: evidencePath,
      report: reportPath,
      summary: run.summary,
      fact_adapter: run.fact_adapter,
      audit_chain_valid: run.audit.chain_valid,
      audit_head_hash: run.audit.head_hash,
    },
    null,
    2,
  ),
);

if (run.summary.failed > 0 || !run.audit.chain_valid) process.exitCode = 1;

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import corpusJson from "../public/data/stgb/corpus.json";
import { runIncidentReplay, type IncidentReplayRun } from "../src/lib/stgb/incident-replay";
import type { Corpus } from "../src/lib/stgb/evaluator";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "..");
const outputDirectory = resolve(repositoryRoot, "src/operome/source/stgb_machine/incident-replay");
const evidencePath = resolve(outputDirectory, "StGB_HuggingFace_Incident_Replay_v1.evidence.json");
const reportPath = resolve(outputDirectory, "StGB_HuggingFace_Incident_Replay_v1.report.html");

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function decisionClass(decision: string): string {
  return decision === "allow" ? "allow" : decision === "block" ? "block" : "escalate";
}

function renderReport(run: IncidentReplayRun): string {
  const rows = run.results
    .map((result) => {
      const changed = result.reference_monitor.operome_changed_outcome
        ? '<span class="delta yes">Changed outcome</span>'
        : '<span class="delta no">No outcome change</span>';
      const causal = result.reference_monitor.causal_layers
        .map((layer) => (layer === "capability_policy" ? "Capability policy" : "StGB Operome"))
        .join(" + ");
      return `<tr>
        <td><strong>${escapeHtml(result.scenario.id)}</strong><br><span>${escapeHtml(result.scenario.title)}</span></td>
        <td><code>${escapeHtml(result.scenario.observed_target)}</code><br><small>${escapeHtml(result.scenario.operation)}</small></td>
        <td><span class="badge ${decisionClass(result.capability.decision)}">${escapeHtml(result.capability.decision)}</span><br><small>${escapeHtml(result.capability.matched_grant ?? "default deny")}</small></td>
        <td><span class="badge ${decisionClass(result.operome.decision)}">${escapeHtml(result.operome.decision)}</span><br><small>${escapeHtml(result.operome.stgb_ref)} · ${escapeHtml(result.operome.material)}</small></td>
        <td><span class="badge ${decisionClass(result.reference_monitor.decision)}">${escapeHtml(result.reference_monitor.decision)}</span><br><small>${escapeHtml(causal)}</small></td>
        <td>${changed}</td>
      </tr>
      <tr class="detail"><td colspan="6">
        <details><summary>Evidence trace</summary>
          <p>${escapeHtml(result.scenario.purpose)}</p>
          <p><strong>Capability:</strong> ${escapeHtml(result.capability.reason)}</p>
          <p><strong>Operome:</strong> ${escapeHtml(result.operome.reasons.join(" "))}</p>
          <p><strong>Rule:</strong> <code>${escapeHtml(result.operome.trace.rule)}</code></p>
          <p><strong>Open facts:</strong> ${escapeHtml(result.operome.trace.missing.join(", ") || "none")}</p>
        </details>
      </td></tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>StGB Operome controlled incident replay</title>
  <style>
    :root { color-scheme: light; --ink:#17202a; --muted:#667085; --line:#d8dee8; --paper:#f5f7fa; --navy:#102a43; --blue:#2463eb; --red:#b42318; --amber:#9a6700; --green:#067647; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--paper); color:var(--ink); font:15px/1.55 Inter, ui-sans-serif, system-ui, sans-serif; }
    main { max-width:1240px; margin:0 auto; padding:48px 28px 72px; }
    h1 { max-width:900px; margin:0 0 10px; color:var(--navy); font-size:clamp(34px,5vw,58px); line-height:1.05; letter-spacing:-.035em; }
    h2 { margin-top:42px; color:var(--navy); }
    .lede { max-width:850px; margin:0 0 28px; color:var(--muted); font-size:19px; }
    .safety { padding:18px 20px; border-left:5px solid var(--green); background:#ecfdf3; border-radius:8px; }
    .grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin:28px 0; }
    .card { padding:20px; background:white; border:1px solid var(--line); border-radius:12px; box-shadow:0 4px 18px rgba(16,42,67,.05); }
    .number { display:block; color:var(--navy); font-size:38px; line-height:1; font-weight:750; }
    .label { display:block; margin-top:7px; color:var(--muted); }
    .table-wrap { overflow:auto; background:white; border:1px solid var(--line); border-radius:12px; }
    table { width:100%; border-collapse:collapse; min-width:1020px; }
    th, td { padding:14px 16px; border-bottom:1px solid var(--line); vertical-align:top; text-align:left; }
    th { position:sticky; top:0; background:#eef2f7; color:var(--navy); font-size:12px; letter-spacing:.04em; text-transform:uppercase; }
    td:first-child { width:27%; }
    .detail td { padding-top:0; background:#fbfcfe; }
    .badge, .delta { display:inline-block; padding:3px 9px; border-radius:999px; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.035em; }
    .badge.allow { background:#dcfae6; color:var(--green); }
    .badge.block { background:#fee4e2; color:var(--red); }
    .badge.escalate { background:#fef0c7; color:var(--amber); }
    .delta.yes { background:#e0e7ff; color:#3730a3; }
    .delta.no { background:#eef2f6; color:#475467; }
    code { overflow-wrap:anywhere; color:#344054; }
    small { color:var(--muted); }
    details { padding:8px 0 12px; }
    summary { cursor:pointer; color:var(--blue); font-weight:650; }
    .claim { max-width:900px; padding:24px; background:var(--navy); color:white; border-radius:12px; font-size:18px; }
    .hash { word-break:break-all; font-family:ui-monospace, SFMono-Regular, Consolas, monospace; }
    footer { margin-top:40px; color:var(--muted); font-size:13px; }
    @media (max-width:800px) { .grid { grid-template-columns:1fr 1fr; } main { padding:30px 16px 50px; } }
  </style>
</head>
<body>
<main>
  <p><strong>SynapseLayer controlled evidence run</strong></p>
  <h1>We replayed the incident against two control layers</h1>
  <p class="lede">A deterministic local simulation separates what destination capability controls stop from what the StGB Operome adds when a technically reachable action becomes prohibited conduct.</p>

  <div class="safety"><strong>No attack was performed.</strong> This run made zero model calls, zero network calls, executed no process, changed no file or service, used no credentials and contained no exploit payload. Every destination used the <code>mock://</code> scheme.</div>

  <div class="grid">
    <div class="card"><span class="number">${run.summary.scenarios}</span><span class="label">controlled scenarios</span></div>
    <div class="card"><span class="number">${run.summary.capability_blocks}</span><span class="label">blocked by capability policy alone</span></div>
    <div class="card"><span class="number">${run.summary.operome_vetoes}</span><span class="label">additional Operome vetoes</span></div>
    <div class="card"><span class="number">${run.summary.operome_escalations}</span><span class="label">additional fail-closed escalations</span></div>
  </div>

  <p class="claim">The result is deliberately narrower than “the criminal code stopped the attack”. Destination allowlisting stopped the simulated proxy escape. The StGB Operome changed the outcome at ${run.summary.operome_vetoes + run.summary.operome_escalations} later points where the baseline capability policy would otherwise have allowed the action.</p>

  <h2>Decision comparison</h2>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Scenario</th><th>Observed action</th><th>Capability only</th><th>Operome</th><th>Enforced result</th><th>Difference</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <h2>What this demonstrates</h2>
  <p>The baseline broker answers whether the observed destination and operation are covered by a capability. The Operome evaluates externally supplied facts against the selected material StGB scope. The reference monitor then enforces the combined result. It dispatched ${run.summary.mock_gateway_executions} allowed actions to an in-memory mock tool gateway and withheld all blocked or escalated actions. It has no discretion to override a block or escalation.</p>
  <p>The proxy scenario relies on the independently observed outbound destination and an exact allowlist. It does not claim to infer a proxy’s hidden destination from request content and does not claim to solve SSRF detection.</p>

  <h2>Tamper-evident audit</h2>
  <p>Each scenario decision is chained to the previous record with SHA-256 over canonical JSON. The verification result for this generated evidence is <strong>${run.audit.chain_valid ? "valid" : "invalid"}</strong>.</p>
  <p><strong>Run:</strong> <span class="hash">${escapeHtml(run.run_id)}</span><br>
  <strong>Scenario-pack hash:</strong> <span class="hash">${escapeHtml(run.pack_hash)}</span><br>
  <strong>Audit head:</strong> <span class="hash">${escapeHtml(run.audit.head_hash)}</span></p>

  <h2>Limits</h2>
  <p>This proves deterministic control behaviour for the declared scenarios. It does not prove that ChatGPT, another model or a real production agent would propose these actions. It does not reproduce a vulnerability, compromise a service or establish criminal liability. The StGB mapping remains legally unreviewed.</p>

  <footer>Pack ${escapeHtml(run.pack_id)} · version ${escapeHtml(run.pack_version)} · ${run.summary.passed}/${run.summary.scenarios} declared scenario expectations passed.</footer>
</main>
</body>
</html>`;
}

const run = await runIncidentReplay(corpusJson as unknown as Corpus);
mkdirSync(outputDirectory, { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
writeFileSync(reportPath, renderReport(run), "utf8");

console.log(
  JSON.stringify(
    {
      evidence: evidencePath,
      report: reportPath,
      summary: run.summary,
      audit_chain_valid: run.audit.chain_valid,
      audit_head_hash: run.audit.head_hash,
    },
    null,
    2,
  ),
);

if (run.summary.failed > 0 || !run.audit.chain_valid) process.exitCode = 1;

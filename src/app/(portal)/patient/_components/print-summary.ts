/**
 * printSessionSummary
 *
 * Opens a print-ready popup window from the current chat messages.
 * Pure browser utility — no React, no extra dependencies.
 */

import type { UIMessage } from "ai";
import { extractToolInput } from "@/app/(portal)/patient/_types";
import type {
  ConditionInput,
  PrescriptionInput,
  NextStepsInput,
  SoapNoteInput,
  DietPlanInput,
} from "@/app/(portal)/patient/_types";

// ── HTML helpers ──────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function section(title: string, body: string): string {
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

function ul(items: string[]): string {
  if (items.length === 0) return "";
  const lis = items.map((i) => `<li>${esc(i)}</li>`).join("");
  return `<ul>${lis}</ul>`;
}

// ── Per-tool renderers ────────────────────────────────────────────────────────

function renderCondition(c: ConditionInput): string {
  const badges: string[] = [];
  if (c.severity) badges.push(`Severity: ${c.severity}`);
  if (c.status) badges.push(`Status: ${c.status}`);
  if (c.icd10) badges.push(`ICD-10: ${c.icd10}`);
  const badgeHtml =
    badges.length > 0
      ? [
          '<div class="badges">',
          ...badges.map((b) => `<span class="badge">${esc(b)}</span>`),
          "</div>",
        ].join("")
      : "";
  return `
        <div class="card">
            <div class="card-title">${esc(c.name)}</div>
            ${badgeHtml}
            ${c.description ? `<p>${esc(c.description)}</p>` : ""}
            ${c.symptoms && c.symptoms.length > 0 ? `<p><strong>Symptoms:</strong> ${c.symptoms.map(esc).join(", ")}</p>` : ""}
        </div>`;
}

function renderPrescription(p: PrescriptionInput): string {
  const rows = p.medications
    .map(
      (m) =>
        `<tr><td>${esc(m.name)}</td><td>${esc(m.dosage)}</td><td>${esc(m.frequency)}</td><td>${esc(m.duration)}</td></tr>`,
    )
    .join("");
  return `
        <div class="card">
            <div class="card-title">Prescription — ${esc(p.title)}</div>
            <table>
                <thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Duration</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            ${p.notes ? `<p class="note">${esc(p.notes)}</p>` : ""}
        </div>`;
}

function renderNextSteps(n: NextStepsInput): string {
  const rows: string[] = [];
  if (n.redFlags && n.redFlags.length > 0)
    rows.push(
      `<p class="warning"><strong>⚠ Seek help immediately if:</strong></p>${ul(n.redFlags)}`,
    );
  if (n.immediate && n.immediate.length > 0)
    rows.push(`<p><strong>Right now:</strong></p>${ul(n.immediate)}`);
  if (n.shortTerm && n.shortTerm.length > 0)
    rows.push(`<p><strong>This week:</strong></p>${ul(n.shortTerm)}`);
  if (n.longTerm && n.longTerm.length > 0)
    rows.push(`<p><strong>Long term:</strong></p>${ul(n.longTerm)}`);
  return `<div class="card">${rows.join("")}</div>`;
}

function renderSoap(s: SoapNoteInput): string {
  const rows: string[] = [];
  if (s.subjective)
    rows.push(`<p><strong>Subjective:</strong> ${esc(s.subjective)}</p>`);
  if (s.objective)
    rows.push(`<p><strong>Objective:</strong> ${esc(s.objective)}</p>`);
  if (s.assessment)
    rows.push(`<p><strong>Assessment:</strong> ${esc(s.assessment)}</p>`);
  if (s.plan && s.plan.length > 0)
    rows.push(`<p><strong>Plan:</strong></p>${ul(s.plan)}`);
  return `<div class="card">${rows.join("")}</div>`;
}

function renderDietPlan(d: DietPlanInput): string {
  const rows: string[] = [];
  rows.push(`<div class="card-title">${esc(d.condition)} — Diet Plan</div>`);
  rows.push(`<p>${esc(d.overview)}</p>`);
  const meta: string[] = [];
  if (d.totalDailyCalories)
    meta.push(`Daily calories: ${d.totalDailyCalories} kcal`);
  if (d.weeklyWeightLossEstimate)
    meta.push(`Est. weight loss: ${esc(d.weeklyWeightLossEstimate)}`);
  if (meta.length > 0) {
    rows.push(
      `<div class="badges">${meta.map((m) => `<span class="badge">${esc(m)}</span>`).join("")}</div>`,
    );
  }
  if (d.weeklyPlan && d.weeklyPlan.length > 0) {
    const dayRows = d.weeklyPlan
      .map((day) => {
        const meals = day.meals
          .map(
            (m) =>
              `<tr><td>${esc(m.name)}</td><td>${m.foods.map((f) => `${esc(f.item)}${f.portion ? ` (${esc(f.portion)})` : ""}`).join(", ")}</td><td>${m.totalCalories} kcal</td></tr>`,
          )
          .join("");
        return `<tr><td colspan="3" style="background:#f0f0fa;font-weight:700;padding:6px 8px">${esc(day.day)} — ${day.totalCalories} kcal</td></tr>${meals}`;
      })
      .join("");
    rows.push(
      `<table><thead><tr><th>Meal</th><th>Foods</th><th>Calories</th></tr></thead><tbody>${dayRows}</tbody></table>`,
    );
  }
  if (d.recommended && d.recommended.length > 0) {
    rows.push(
      `<p style="margin-top:10px"><strong>✓ Recommended foods:</strong></p>${ul(d.recommended.map((r) => `${r.food} — ${r.reason}`))}`,
    );
  }
  if (d.avoid && d.avoid.length > 0) {
    rows.push(
      `<p><strong>✗ Foods to avoid:</strong></p>${ul(d.avoid.map((a) => `${a.food} — ${a.reason}`))}`,
    );
  }
  if (d.tips && d.tips.length > 0) {
    rows.push(`<p><strong>Tips:</strong></p>${ul(d.tips)}`);
  }
  return `<div class="card">${rows.join("")}</div>`;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const PRINT_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
       font-size: 13px; color: #1a1a2e; line-height: 1.5; padding: 32px 40px; }
h1 { font-size: 20px; margin-bottom: 4px; }
.meta { color: #555; font-size: 12px; margin-bottom: 28px; }
h2 { font-size: 14px; font-weight: 700; color: #3730a3; border-bottom: 1px solid #e0e0f8;
     padding-bottom: 4px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: .04em; }
section { margin-bottom: 28px; }
.card { border: 1px solid #e8e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; background: #fafafa; }
.card + .card { margin-top: 8px; }
.card-title { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
.badge { display: inline-block; border: 1px solid #c0c0d8; border-radius: 4px;
         font-size: 11px; padding: 1px 7px; margin-right: 6px; color: #444; }
.badges { margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
th { text-align: left; background: #f0f0fa; padding: 5px 8px; border: 1px solid #ddd; }
td { padding: 4px 8px; border: 1px solid #eee; }
ul { padding-left: 18px; margin: 4px 0; }
li { margin-bottom: 3px; }
p { margin-bottom: 6px; }
.note { color: #555; font-style: italic; margin-top: 8px; }
.warning { color: #b91c1c; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.footer { margin-top: 32px; border-top: 1px solid #e0e0e0; padding-top: 8px;
          font-size: 11px; color: #888; }
@media print { body { padding: 0; } }
`;

// ── Tool collection helper ────────────────────────────────────────────────────

interface CollectedData {
  conditions: ConditionInput[];
  prescriptions: PrescriptionInput[];
  nextStepsList: NextStepsInput[];
  soapNotes: SoapNoteInput[];
  dietPlans: DietPlanInput[];
}

function processPart(
  part: UIMessage["parts"][number],
  data: CollectedData,
): void {
  const condition = extractToolInput<ConditionInput>(part, "recordCondition");
  if (condition) {
    data.conditions.push(condition);
    return;
  }

  const prescription = extractToolInput<PrescriptionInput>(
    part,
    "createPrescription",
  );
  if (prescription) {
    data.prescriptions.push(prescription);
    return;
  }

  const nextSteps = extractToolInput<NextStepsInput>(part, "nextSteps");
  if (nextSteps) {
    data.nextStepsList.push(nextSteps);
    return;
  }

  const soap = extractToolInput<SoapNoteInput>(part, "soapNote");
  if (soap) {
    data.soapNotes.push(soap);
    return;
  }

  const dietPlan = extractToolInput<DietPlanInput>(part, "dietPlan");
  if (dietPlan) {
    data.dietPlans.push(dietPlan);
  }
}

function collectToolData(messages: UIMessage[]): CollectedData {
  const data: CollectedData = {
    conditions: [],
    prescriptions: [],
    nextStepsList: [],
    soapNotes: [],
    dietPlans: [],
  };
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const part of msg.parts) {
      processPart(part, data);
    }
  }
  return data;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function printSessionSummary(messages: UIMessage[]): void {
  const { conditions, prescriptions, nextStepsList, soapNotes, dietPlans } =
    collectToolData(messages);

  // ── Build document ────────────────────────────────────────────────────────
  const now = new Date().toLocaleString(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  });
  const sections: string[] = [];

  if (conditions.length > 0) {
    sections.push(
      section(
        "Conditions Identified",
        conditions.map(renderCondition).join(""),
      ),
    );
  }
  if (prescriptions.length > 0) {
    sections.push(
      section("Prescriptions", prescriptions.map(renderPrescription).join("")),
    );
  }
  if (nextStepsList.length > 0) {
    sections.push(
      section("Action Plan", nextStepsList.map(renderNextSteps).join("")),
    );
  }
  if (soapNotes.length > 0) {
    sections.push(
      section("Clinical Summary", soapNotes.map(renderSoap).join("")),
    );
  }
  if (dietPlans.length > 0) {
    sections.push(section("Diet Plan", dietPlans.map(renderDietPlan).join("")));
  }

  if (sections.length === 0) {
    sections.push("<p>No clinical data recorded in this session yet.</p>");
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>SwiftDrive — Session Summary</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <h1>Session Summary</h1>
  <p class="meta">Generated ${esc(now)} &mdash; for personal reference only, not a medical record.</p>
  ${sections.join("\n")}
  <div class="footer">SwiftDrive &mdash; AI-assisted health consultation summary</div>
  <script>window.onload = () => window.print();</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const blobUrl = URL.createObjectURL(blob);
  const popup = window.open(
    blobUrl,
    "_blank",
    "width=800,height=900,scrollbars=yes",
  );
  if (!popup) {
    URL.revokeObjectURL(blobUrl);
    alert("Pop-up blocked. Please allow pop-ups for this site and try again.");
    return;
  }
  // Revoke after the popup has had time to load it.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
}

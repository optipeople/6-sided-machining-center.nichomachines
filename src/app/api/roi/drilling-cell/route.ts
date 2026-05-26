import { NextResponse } from "next/server";
import { Resend } from "resend";
import { site } from "@/lib/site";
import { SubmissionSchema } from "@/features/drilling-cell-roi/schema";
import { SOLUTIONS, type SolutionVariant } from "@/features/drilling-cell-roi/solutions";

// ── shared constants (must match Calculator.tsx) ──────────────────────────────

const SHIFT_WEEKLY_HOURS: Record<1 | 2 | 3, number> = { 1: 37, 2: 71, 3: 101 };
const WORKING_WEEKS = 46;

const COUNTRIES: Record<string, { name: string; eurPerHour: number }> = {
  DK: { name: "Denmark",    eurPerHour: 33.5 },
  SE: { name: "Sweden",     eurPerHour: 30.0 },
  NO: { name: "Norway",     eurPerHour: 48.0 },
  FI: { name: "Finland",    eurPerHour: 28.0 },
  EE: { name: "Estonia",    eurPerHour:  8.5 },
  LV: { name: "Latvia",     eurPerHour:  6.5 },
  LT: { name: "Lithuania",  eurPerHour:  7.5 },
};

// ── calculation ───────────────────────────────────────────────────────────────

type ProductInput = { id: string; unitsPerWeek: number };

type CalcResult = {
  oee: number;
  effectiveOperators: number;
  totalInvestment: number;
  weeklyMachineHours: number;
  annualMachineHours: number;
  capacityUtilPct: number;
  annualCurrentCost: number;
  annualFutureCost: number;
  annualSavingsEur: number;
  paybackYears: number;
};

function calcSolution(
  s: SolutionVariant,
  products: ProductInput[],
  operatorHoursPerWeek: number,
  eurPerHour: number,
  availableShifts: 1 | 2 | 3,
): CalcResult {
  const oee = Math.min(100, s.oeePercent);
  const effectiveOperators = s.operators;
  const totalInvestment = s.investmentEur;

  const rawDailyHours = products.reduce((sum, p) => {
    return sum + (((p.unitsPerWeek) / 5) * (s.processingTimeSec[p.id] ?? 0)) / 3600;
  }, 0);
  const dailyMachineHours = rawDailyHours / (oee / 100);
  const weeklyMachineHours = dailyMachineHours * 5;
  const availableWeeklyHours = SHIFT_WEEKLY_HOURS[availableShifts];
  const capacityUtilPct = (weeklyMachineHours / availableWeeklyHours) * 100;

  const annualMachineHours = weeklyMachineHours * WORKING_WEEKS;
  const annualCurrentCost = operatorHoursPerWeek * WORKING_WEEKS * eurPerHour;
  const annualFutureCost = weeklyMachineHours * effectiveOperators * WORKING_WEEKS * eurPerHour;
  const annualSavingsEur = Math.max(0, annualCurrentCost - annualFutureCost);
  const paybackYears = annualSavingsEur > 0 ? totalInvestment / annualSavingsEur : Infinity;

  return { oee, effectiveOperators, totalInvestment, weeklyMachineHours, annualMachineHours, capacityUtilPct, annualCurrentCost, annualFutureCost, annualSavingsEur, paybackYears };
}

// ── formatting helpers ────────────────────────────────────────────────────────

const fmtEur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const fmtNum = (n: number, dec = 1) => n.toFixed(dec).replace(".", ",");
const fmtPct = (n: number) => `${fmtNum(n, 1)} %`;

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']|[^\x20-\x7E]/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default:  return `&#${c.codePointAt(0)};`;
    }
  });
}

function e(s: string | number) { return escapeHtml(String(s)); }

// ── HTML building blocks ──────────────────────────────────────────────────────

const CSS = {
  body:      "margin:0;padding:24px 12px;background:#f5f0e8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#1a1d22;",
  card:      "background:#fff;border-radius:8px;padding:28px 32px;max-width:760px;margin:0 auto 20px;",
  h1:        "margin:0 0 4px;font-size:22px;color:#0e2238;",
  h2:        "margin:24px 0 10px;font-size:15px;font-weight:700;color:#0e2238;border-bottom:2px solid #0e2238;padding-bottom:4px;",
  label:     "color:#5a7c9a;font-size:12px;width:220px;padding:5px 12px 5px 0;vertical-align:top;",
  value:     "color:#0f1115;font-size:13px;padding:5px 0;",
  th:        "text-align:left;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5a7c9a;padding:5px 10px 5px 0;border-bottom:2px solid #ddd;",
  thR:       "text-align:right;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5a7c9a;padding:5px 0 5px 10px;border-bottom:2px solid #ddd;",
  td:        "font-size:13px;color:#0f1115;padding:6px 10px 6px 0;border-bottom:1px solid #f0ede6;vertical-align:top;",
  tdR:       "font-size:13px;color:#0f1115;padding:6px 0 6px 10px;border-bottom:1px solid #f0ede6;text-align:right;",
  tdMono:    "font-family:monospace;font-size:13px;color:#0f1115;padding:6px 10px 6px 0;border-bottom:1px solid #f0ede6;",
  chip:      "display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;",
  chipGrey:  "background:#eee;color:#333;",
  chipTan:   "background:#f5e8c8;color:#7a5a1a;",
  chipGreen: "background:#d1fae5;color:#065f46;",
  chipRed:   "background:#fee2e2;color:#991b1b;",
  note:      "font-size:12px;color:#7a8a9a;margin-top:6px;",
};

function row(label: string, value: string) {
  return `<tr><td style="${CSS.label}">${label}</td><td style="${CSS.value}">${value}</td></tr>`;
}

function sectionHeading(title: string) {
  return `<h2 style="${CSS.h2}">${title}</h2>`;
}

// ── email HTML builder ────────────────────────────────────────────────────────

function buildHtml(data: {
  contact: { name: string; email: string; job: string; company?: string };
  products: Array<{ id: string; name: string; size: string; unitsPerWeek: number }>;
  operatorHoursPerWeek: number;
  availableShifts: 1 | 2 | 3;
  country: string;
  selectedSolution: { name: string; automationOptions: string[] } | null;
  submittedAt: string;
}): string {
  const countryInfo = COUNTRIES[data.country] ?? { name: data.country, eurPerHour: 0 };
  const { eurPerHour } = countryInfo;
  const availableWeeklyHours = SHIFT_WEEKLY_HOURS[data.availableShifts];
  const totalUnitsPerWeek = data.products.reduce((s, p) => s + p.unitsPerWeek, 0);

  // ── run calcSolution for all 4 solutions ──
  type SolutionRow = {
    solution: SolutionVariant;
    m: CalcResult;
    feasible: boolean;
    labels: string[];
  };

  const allRows: SolutionRow[] = SOLUTIONS.map((s) => {
    const m = calcSolution(s, data.products, data.operatorHoursPerWeek, eurPerHour, data.availableShifts);
    return { solution: s, m, feasible: m.capacityUtilPct <= 100, labels: [] };
  });

  const feasible = allRows.filter((r) => r.feasible);
  const pool = feasible.length > 0 ? feasible : allRows;

  const byInvestment = [...pool].sort((a, b) => a.solution.investmentEur - b.solution.investmentEur);
  const byPayback = [...pool].sort((a, b) => {
    if (!isFinite(a.m.paybackYears)) return 1;
    if (!isFinite(b.m.paybackYears)) return -1;
    return a.m.paybackYears - b.m.paybackYears;
  });
  const byUtil = [...pool].sort((a, b) => a.m.capacityUtilPct - b.m.capacityUtilPct);

  const conservative = byInvestment[0]!;
  const bestFit = byPayback[0]!;
  const growth = byUtil[0]!;

  const labelMap = new Map<string, string[]>();
  const assignLabel = (r: SolutionRow | undefined, lbl: string) => {
    if (!r) return;
    if (!labelMap.has(r.solution.name)) labelMap.set(r.solution.name, []);
    labelMap.get(r.solution.name)!.push(lbl);
  };
  assignLabel(conservative, "Conservative");
  assignLabel(bestFit, "Best fit");
  assignLabel(growth, "Growth");

  allRows.forEach((r) => { r.labels = labelMap.get(r.solution.name) ?? []; });

  const presentedNames = new Set<string>();
  [conservative, bestFit, growth].forEach((r) => r && presentedNames.add(r.solution.name));

  // ── selected solution ──
  const selectedSol = data.selectedSolution
    ? SOLUTIONS.find((s) => s.name === data.selectedSolution!.name)
    : null;
  const selectedAutoOptions = selectedSol
    ? (selectedSol.automationOptions ?? []).filter((o) =>
        data.selectedSolution!.automationOptions.includes(o.name),
      )
    : [];
  const selectedAutoTotal = selectedAutoOptions.reduce((s, o) => s + o.priceEur, 0);
  const selectedTotal = selectedSol ? selectedSol.investmentEur + selectedAutoTotal : 0;

  // ── HTML sections ──────────────────────────────────────────────────────────

  // 1. Contact
  const contactSection = `
    ${sectionHeading("Kontakt")}
    <table style="border-collapse:collapse;width:100%;">
      ${row("Navn", e(data.contact.name))}
      ${row("Email", '<a href="mailto:' + e(data.contact.email) + '" style="color:#0e2238;">' + e(data.contact.email) + "</a>")}
      ${row("Stilling", e(data.contact.job))}
      ${data.contact.company ? row("Virksomhed", e(data.contact.company)) : ""}
    </table>`;

  // 2. Produktionsdata
  const productRows = data.products.map((p) => {
    const rawDailyHrs = (p.unitsPerWeek / 5);
    return `<tr>
      <td style="${CSS.td}">${e(p.id)}</td>
      <td style="${CSS.td}">${e(p.size)}</td>
      <td style="${CSS.tdR}">${p.unitsPerWeek.toLocaleString("da-DK")}</td>
    </tr>`;
  }).join("");

  const productionSection = `
    ${sectionHeading("Produktionsdata")}
    <table style="border-collapse:collapse;width:100%;margin-bottom:12px;">
      ${row("Land", e(countryInfo.name + " (" + data.country + ")"))}
      ${row("Timels&oslash;nssats", e(fmtEur.format(eurPerHour) + " / time"))}
      ${row("Operat&oslash;rtimer i dag", e(fmtNum(data.operatorHoursPerWeek, 1) + " timer / uge"))}
      ${row('Nuværende årlig operatøromkostning', '<strong>' + e(fmtEur.format(data.operatorHoursPerWeek * WORKING_WEEKS * eurPerHour)) + '</strong> <span style="color:#7a8a9a;font-size:12px;">(' + fmtNum(data.operatorHoursPerWeek, 1) + ' x ' + WORKING_WEEKS + ' uger x ' + e(fmtEur.format(eurPerHour)) + ')</span>')}
      ${row("Tilg&aelig;ngelige skift", e(data.availableShifts + " skift " + String.fromCharCode(8594) + " " + availableWeeklyHours + " timer / uge"))}
      ${row("Samlede enheder / uge", e(totalUnitsPerWeek.toLocaleString("da-DK")))}
    </table>
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr>
          <th style="${CSS.th}">Produkt</th>
          <th style="${CSS.th}">Størrelse</th>
          <th style="${CSS.thR}">Enheder / uge</th>
        </tr>
      </thead>
      <tbody>${productRows}</tbody>
    </table>`;

  // 3. Beregning — alle løsninger
  const calcRows = allRows.map((r) => {
    const { solution: s, m, feasible, labels } = r;
    const isPresented = presentedNames.has(s.name);
    const isSelected = data.selectedSolution?.name === s.name;

    const labelChips = labels.map((l) => {
      const chipStyle = l === "Conservative" ? CSS.chipGrey : l === "Best fit" ? CSS.chipTan : CSS.chipGreen;
      return `<span style="${CSS.chip}${chipStyle}">${l}</span> `;
    }).join("");

    const feasibleChip = feasible
      ? `<span style="${CSS.chip}${CSS.chipGreen}">Feasibel</span>`
      : `<span style="${CSS.chip}${CSS.chipRed}">Ikke feasibel</span>`;

    const rowBg = isSelected ? "background:#fffbf0;" : isPresented ? "background:#f9f9f9;" : "";

    // Per-produkt cyklustider
    const cycleRows = data.products.map((p) => {
      const sec = s.processingTimeSec[p.id] ?? 0;
      const rawDaily = ((p.unitsPerWeek / 5) * sec) / 3600;
      const machDaily = rawDaily / (m.oee / 100);
      return `<tr>
        <td style="font-size:12px;color:#444;padding:2px 8px 2px 16px;">${e(p.id)}</td>
        <td style="font-size:12px;color:#666;padding:2px 8px;text-align:right;">${sec} sek</td>
        <td style="font-size:12px;color:#666;padding:2px 8px;text-align:right;">${p.unitsPerWeek.toLocaleString("da-DK")} stk/uge</td>
        <td style="font-size:12px;color:#666;padding:2px 0;text-align:right;">${fmtNum(machDaily, 2)} t/dag</td>
      </tr>`;
    }).join("");

    return `
      <tr style="${rowBg}border-bottom:3px solid #e8e0d0;">
        <td colspan="2" style="padding:12px 10px 4px;">
          <div style="font-size:14px;font-weight:700;color:#0e2238;">${e(s.name)}</div>
          <div style="font-size:12px;color:#7a8a9a;margin:2px 0 6px;">${e(s.description)}</div>
          ${feasibleChip} ${labelChips}
          ${isSelected ? '<span style="' + CSS.chip + 'background:#dbeafe;color:#1e40af;">&#10003; Kundens valg</span>' : ""}
        </td>
      </tr>
      <tr style="${rowBg}">
        <td style="padding:4px 10px 4px 10px;font-size:12px;color:#5a7c9a;width:240px;vertical-align:top;">Investering</td>
        <td style="padding:4px 0;font-size:13px;color:#0f1115;">${e(fmtEur.format(s.investmentEur))}</td>
      </tr>
      <tr style="${rowBg}">
        <td style="padding:4px 10px 4px 10px;font-size:12px;color:#5a7c9a;vertical-align:top;">OEE</td>
        <td style="padding:4px 0;font-size:13px;color:#0f1115;">${m.oee} %</td>
      </tr>
      <tr style="${rowBg}">
        <td style="padding:4px 10px 4px 10px;font-size:12px;color:#5a7c9a;vertical-align:top;">Operatører</td>
        <td style="padding:4px 0;font-size:13px;color:#0f1115;">${m.effectiveOperators}</td>
      </tr>
      <tr style="${rowBg}">
        <td style="padding:4px 10px 4px 10px;font-size:12px;color:#5a7c9a;vertical-align:top;">Maskintimer / uge</td>
        <td style="padding:4px 0;font-size:13px;color:#0f1115;">${fmtNum(m.weeklyMachineHours)} t &nbsp;<span style="color:#7a8a9a;font-size:11px;">af ${availableWeeklyHours} tilgængelige</span></td>
      </tr>
      <tr style="${rowBg}">
        <td style="padding:4px 10px 4px 10px;font-size:12px;color:#5a7c9a;vertical-align:top;">Kapacitetsudnyttelse</td>
        <td style="padding:4px 0;font-size:13px;${m.capacityUtilPct > 100 ? "color:#991b1b;font-weight:700;" : "color:#0f1115;"}">${fmtPct(m.capacityUtilPct)} ${m.capacityUtilPct > 100 ? "&#9888;" : ""}</td>
      </tr>
      <tr style="${rowBg}">
        <td style="padding:4px 10px 4px 10px;font-size:12px;color:#5a7c9a;vertical-align:top;">Cyklustider per produkt</td>
        <td style="padding:2px 0;">
          <table style="border-collapse:collapse;width:100%;">
            <tr>
              <th style="font-size:11px;color:#aaa;padding:2px 8px 2px 16px;text-align:left;">Produkt</th>
              <th style="font-size:11px;color:#aaa;padding:2px 8px;text-align:right;">Cyklus</th>
              <th style="font-size:11px;color:#aaa;padding:2px 8px;text-align:right;">Antal/uge</th>
              <th style="font-size:11px;color:#aaa;padding:2px 0;text-align:right;">Maskin-t/dag</th>
            </tr>
            ${cycleRows}
          </table>
        </td>
      </tr>
      <tr style="${rowBg}">
        <td style="padding:4px 10px 4px 10px;font-size:12px;color:#5a7c9a;vertical-align:top;">Nuværende operatøromk. / år</td>
        <td style="padding:4px 0;font-size:13px;color:#0f1115;">${e(fmtEur.format(m.annualCurrentCost))} <span style="color:#7a8a9a;font-size:11px;">(${fmtNum(data.operatorHoursPerWeek, 1)} t/uge × ${WORKING_WEEKS} uger × ${fmtEur.format(eurPerHour)})</span></td>
      </tr>
      <tr style="${rowBg}">
        <td style="padding:4px 10px 4px 10px;font-size:12px;color:#5a7c9a;vertical-align:top;">Fremtidig operatøromk. / år</td>
        <td style="padding:4px 0;font-size:13px;color:#0f1115;">${e(fmtEur.format(m.annualFutureCost))} <span style="color:#7a8a9a;font-size:11px;">(${fmtNum(m.weeklyMachineHours)} maskint/uge × ${m.effectiveOperators} op. × ${WORKING_WEEKS} uger × ${fmtEur.format(eurPerHour)})</span></td>
      </tr>
      <tr style="${rowBg}">
        <td style="padding:4px 10px 4px 10px;font-size:12px;color:#5a7c9a;vertical-align:top;">Årlig besparelse</td>
        <td style="padding:4px 0;font-size:14px;font-weight:700;color:${m.annualSavingsEur > 0 ? "#065f46" : "#991b1b"};">${e(fmtEur.format(m.annualSavingsEur))}</td>
      </tr>
      <tr style="${rowBg}border-bottom:3px solid #e8e0d0;">
        <td style="padding:4px 10px 12px 10px;font-size:12px;color:#5a7c9a;vertical-align:top;">Tilbagebetalingstid</td>
        <td style="padding:4px 0 12px;font-size:14px;font-weight:700;color:#0e2238;">${isFinite(m.paybackYears) ? fmtNum(m.paybackYears) + " år" : "—"}</td>
      </tr>`;
  }).join("");

  const calcSection = `
    ${sectionHeading("Beregning — alle løsninger")}
    <p style="${CSS.note}">Grå baggrund = præsenteret for kunden. Blå chip = kundens valg. Beregning ekskl. automatiseringstilkøb.</p>
    <table style="border-collapse:collapse;width:100%;margin-top:8px;">
      ${calcRows}
    </table>`;

  // 4. Kundens valgte løsning
  let selectionSection = "";
  if (data.selectedSolution && selectedSol) {
    selectionSection = `
      ${sectionHeading("Kundens valgte l&#248;sning")}
      <table style="border-collapse:collapse;width:100%;">
        ${row("L&#248;sning", "<strong>" + e(selectedSol.name) + "</strong>")}
        ${row("Basis investering", e(fmtEur.format(selectedSol.investmentEur)))}
        ${row("Automatiseringstilkøb", selectedAutoOptions.length > 0
          ? selectedAutoOptions.map((o) => e(o.name) + ' <span style="color:#7a8a9a;">(' + fmtEur.format(o.priceEur) + ")</span>").join("<br>")
          : '<span style="color:#7a8a9a;">ingen</span>')}
        ${row("Automatisering i alt", e(fmtEur.format(selectedAutoTotal)))}
        ${row("<strong>Samlet investering</strong>", '<strong style="font-size:15px;">' + e(fmtEur.format(selectedTotal)) + "</strong>")}
      </table>`;
  } else {
    selectionSection = `
      ${sectionHeading("Kundens valgte l&#248;sning")}
      <p style="font-size:13px;color:#7a8a9a;">(ingen l&#248;sning valgt)</p>`;
  }

  return `<!DOCTYPE html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>6-sided machining center ROI &#8212; salgsrapport</title>
</head>
<body style="${CSS.body}">
  <div style="${CSS.card}">
    <h1 style="${CSS.h1}">6-sided machining center ROI</h1>
    <p style="margin:0 0 4px;font-size:13px;color:#7a8a9a;">Salgsrapport &#8212; kun til intern brug</p>
    <p style="margin:0;font-size:12px;color:#aaa;">Indsendt: ${e(data.submittedAt)}</p>
    ${contactSection}
    ${productionSection}
    ${calcSection}
    ${selectionSection}
  </div>
</body>
</html>`;
}

// ── preview (dev only) ────────────────────────────────────────────────────────

export async function GET() {
  const html = buildHtml({
    contact: { name: "Lars Andersen", email: "lars@kabinetteknik.dk", job: "Produktionschef", company: "Kabinetteknik A/S" },
    products: [{ id: "Hinge Door", name: "", size: "702 × 368 × 17 mm", unitsPerWeek: 1750 }],
    operatorHoursPerWeek: 120,
    availableShifts: 1,
    country: "DK",
    selectedSolution: { name: "Single Machine - Double Side Drilling", automationOptions: [] },
    submittedAt: "mandag den 26. maj 2026 kl. 10.34",
  });
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ── route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = SubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the highlighted fields." }, { status: 400 });
  }

  const { website, ...data } = parsed.data;
  if (website) {
    return NextResponse.json({ ok: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toRaw = process.env.ROI_TO_EMAIL ?? process.env.CONTACT_TO_EMAIL ?? site.email;
  const to = toRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const from = process.env.CONTACT_FROM_EMAIL ?? `website@${new URL(site.url).host}`;

  const submittedAt = new Date().toLocaleString("da-DK", { timeZone: "Europe/Copenhagen", dateStyle: "full", timeStyle: "short" });

  const html = buildHtml({ ...data, submittedAt });

  const countryInfo = COUNTRIES[data.country] ?? { name: data.country, eurPerHour: 0 };
  const totalUnitsPerWeek = data.products.reduce((s, p) => s + p.unitsPerWeek, 0);

  // Plain-text fallback
  const text = [
    `6-sided machining center ROI — salgsrapport`,
    `Indsendt: ${submittedAt}`,
    ``,
    `KONTAKT`,
    `  Navn:       ${data.contact.name}`,
    `  Email:      ${data.contact.email}`,
    `  Stilling:   ${data.contact.job}`,
    `  Virksomhed: ${data.contact.company ?? "-"}`,
    ``,
    `PRODUKTION`,
    `  Land:                  ${countryInfo.name} (${data.country})`,
    `  Timeløn:               ${fmtEur.format(countryInfo.eurPerHour)} / time`,
    `  Operatørtimer / uge:   ${fmtNum(data.operatorHoursPerWeek, 1)}`,
    `  Tilgængelige skift:    ${data.availableShifts} (${SHIFT_WEEKLY_HOURS[data.availableShifts]} t/uge)`,
    `  Enheder / uge i alt:   ${totalUnitsPerWeek.toLocaleString("da-DK")}`,
    ``,
    `PRODUKTER`,
    ...data.products.map((p) => `  • ${p.id.padEnd(28)} ${p.unitsPerWeek.toString().padStart(6)} enheder/uge   ${p.size}`),
    ``,
    `VALGT LØSNING: ${data.selectedSolution?.name ?? "(ingen)"}`,
    ...(data.selectedSolution?.automationOptions.length
      ? data.selectedSolution.automationOptions.map((o) => `  + ${o}`)
      : []),
    ``,
    `Se HTML-versionen for fuld beregningsgennemgang.`,
  ].join("\n");

  if (!apiKey) {
    console.info("[roi] received (no Resend key configured)", { contact: data.contact });
    return NextResponse.json({ ok: true });
  }

  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from,
      to,
      replyTo: data.contact.email,
      subject: "ROI-forespørgsel: " + data.contact.name + (data.contact.company ? " — " + data.contact.company : ""),
      text,
      html,
    });
    if (result.error) {
      console.error("[roi] resend rejected send", result.error, { from, to });
      return NextResponse.json({ error: "Could not send right now. Please try again or call us." }, { status: 502 });
    }
    console.info("[roi] sent", { id: result.data?.id, to });
  } catch (err) {
    console.error("[roi] send failed", err);
    return NextResponse.json({ error: "Could not send right now. Please try again or call us." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ArrowLeft, ArrowRight, Check, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { PRODUCTS, type DrillingProduct } from "./products";
import { SOLUTIONS, type SolutionVariant } from "./solutions";

type Step = 0 | 1 | 2 | 3 | 4 | 5;
const INPUT_STEPS = 5; // 0..4 inclusive

const WORKING_DAYS = 220;
const SHIFT_WEEKLY_HOURS: Record<1 | 2 | 3, number> = { 1: 37, 2: 71, 3: 101 };

const COUNTRIES = [
  { code: "DK", name: "Denmark",    eurPerHour: 38,   currency: "DKK", eurToLocal: 7.46 },
  { code: "SE", name: "Sweden",     eurPerHour: 35,   currency: "SEK", eurToLocal: 11.50 },
  { code: "NO", name: "Norway",     eurPerHour: 48,   currency: "NOK", eurToLocal: 11.80 },
  { code: "FI", name: "Finland",    eurPerHour: 35,   currency: "EUR", eurToLocal: 1.0 },
  { code: "EE", name: "Estonia",    eurPerHour: 20,   currency: "EUR", eurToLocal: 1.0 },
  { code: "LV", name: "Latvia",     eurPerHour: 20,   currency: "EUR", eurToLocal: 1.0 },
  { code: "LT", name: "Lithuania",  eurPerHour: 20,   currency: "EUR", eurToLocal: 1.0 },
] as const;
type CountryCode = (typeof COUNTRIES)[number]["code"];

function fmtCurrency(eurAmount: number, eurToLocal: number, currency: string): string {
  const amount = Math.round(eurAmount * eurToLocal);
  const formatted = amount.toLocaleString("en");
  return currency === "EUR" ? `€${formatted}` : `${formatted} ${currency}`;
}

const SOLUTION_LABELS = [
  { label: "Conservative choice",       badge: "bg-[var(--color-paper-dark)] text-[var(--color-ink-900)]" },
  { label: "Best fit for current needs", badge: "bg-[var(--color-tan-500)]/15 text-[var(--color-tan-700,#8a6a2a)]" },
  { label: "Growth ambitions",          badge: "bg-emerald-50 text-emerald-800" },
];

function calcSolution(
  s: SolutionVariant,
  products: DrillingProduct[],
  quantities: Record<string, number>, // units per week
  operatorHoursPerWeek: number,
  selectedAutoNames: Set<string>,
  eurPerHour: number,
  availableShifts: 1 | 2 | 3,
) {
  const selectedOptions = (s.automationOptions ?? []).filter((o) => selectedAutoNames.has(o.name));
  const oeeBoost = selectedOptions.reduce((sum, o) => sum + o.oeeBoostPct, 0);
  const operatorReduction = selectedOptions.reduce((sum, o) => sum + o.operatorReduction, 0);
  const automationPrice = selectedOptions.reduce((sum, o) => sum + o.priceEur, 0);

  const oee = Math.min(100, s.oeePercent + oeeBoost);
  const effectiveOperators = Math.max(0, s.operators - operatorReduction);
  const totalInvestment = s.investmentEur + automationPrice;

  const rawWeeklyHours = products.reduce((sum, p) => {
    return sum + ((quantities[p.id] ?? 0) * (s.processingTimeSec[p.id] ?? 0)) / 3600;
  }, 0);
  const weeklyMachineHours = rawWeeklyHours / (oee / 100);
  const availableWeeklyHours = SHIFT_WEEKLY_HOURS[availableShifts];
  const capacityUtilPct = (weeklyMachineHours / availableWeeklyHours) * 100;

  const annualMachineHours = weeklyMachineHours * 46;
  const annualCurrentCost = operatorHoursPerWeek * 46 * eurPerHour;
  const annualFutureCost = weeklyMachineHours * effectiveOperators * 46 * eurPerHour;
  const annualSavingsEur = Math.max(0, annualCurrentCost - annualFutureCost);
  const paybackYears = annualSavingsEur > 0 ? totalInvestment / annualSavingsEur : Infinity;

  return { oee, effectiveOperators, totalInvestment, weeklyMachineHours, annualMachineHours, capacityUtilPct, annualSavingsEur, paybackYears };
}

type Contact = { name: string; email: string; job: string; company: string };

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export function DrillingCellRoiCalculator() {
  const [step, setStep] = useState<Step>(0);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [operatorHoursPerWeek, setOperatorHoursPerWeek] = useState<number>(40);
  const [contact, setContact] = useState<Contact>({
    name: "",
    email: "",
    job: "",
    company: "",
  });
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Partial<Record<keyof Contact, boolean>>>(
    {},
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSolutionName, setSelectedSolutionName] = useState<string | null>(null);
  const [automationSelected, setAutomationSelected] = useState<Record<string, Set<string>>>({});
  const [country, setCountry] = useState<CountryCode>("DK");
  const [availableShifts, setAvailableShifts] = useState<1 | 2 | 3>(1);

  const selectedCountry = COUNTRIES.find((c) => c.code === country)!;
  const eurPerHour = selectedCountry.eurPerHour;

  const topRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const goTo = useCallback((next: Step) => {
    setStep(next);
    // Smooth scroll to the top of the calculator card, then move focus for a11y
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      headingRef.current?.focus({ preventScroll: true });
    });
  }, []);

  // Reset transient errors when leaving the contact step
  useEffect(() => {
    if (step !== 4) {
      setFormError(null);
    }
  }, [step]);

  const toggleProduct = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setAll = (val: boolean) => {
    if (val) setSelected(new Set(PRODUCTS.map((p) => p.id)));
    else setSelected(new Set());
  };

  const activeProducts: DrillingProduct[] = useMemo(
    () => PRODUCTS.filter((p) => selected.has(p.id)),
    [selected],
  );

  const updateQty = (id: string, value: number) => {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  };

  const firstName = (contact.name.trim().split(/\s+/)[0] || "there").trim();

  const displayedSolutions = useMemo(() => {
    const noAuto = new Set<string>();
    const withMetrics = SOLUTIONS.map((s) => ({
      solution: s,
      m: calcSolution(s, activeProducts, quantities, operatorHoursPerWeek, noAuto, eurPerHour, availableShifts),
    }));

    // Feasible = weekly machine hours fit within available shift hours
    const feasible = withMetrics.filter((w) => w.m.capacityUtilPct <= 100);
    const pool = feasible.length > 0 ? feasible : withMetrics;

    // Conservative: cheapest within available shifts
    const byInvestment = [...pool].sort((a, b) => a.solution.investmentEur - b.solution.investmentEur);
    // Best fit: lowest payback within available shifts
    const byPayback = [...pool].sort((a, b) => {
      if (!Number.isFinite(a.m.paybackYears)) return 1;
      if (!Number.isFinite(b.m.paybackYears)) return -1;
      return a.m.paybackYears - b.m.paybackYears;
    });
    // Growth: most spare capacity within available shifts (lowest utilisation = most room to grow)
    const byUtilDesc = [...pool].sort((a, b) => a.m.capacityUtilPct - b.m.capacityUtilPct);

    const conservative = byInvestment[0];
    const bestFit = byPayback[0];
    const growth = byUtilDesc[0];

    // Accumulate all earned labels per solution name
    const labelMap = new Map<string, Array<{ label: string; badge: string }>>();
    const earn = (item: (typeof withMetrics)[number] | undefined, i: number) => {
      if (!item) return;
      if (!labelMap.has(item.solution.name)) labelMap.set(item.solution.name, []);
      labelMap.get(item.solution.name)!.push(SOLUTION_LABELS[i]!);
    };
    earn(conservative, 0);
    earn(bestFit, 1);
    earn(growth, 2);

    // Return unique solutions in order of first earned label
    const seen = new Set<string>();
    const result: Array<{ solution: SolutionVariant; labels: Array<{ label: string; badge: string }> }> = [];
    [conservative, bestFit, growth].forEach((item) => {
      if (!item || seen.has(item.solution.name)) return;
      seen.add(item.solution.name);
      result.push({ solution: item.solution, labels: labelMap.get(item.solution.name) ?? [] });
    });
    return result;
  }, [activeProducts, quantities, operatorHoursPerWeek, eurPerHour, availableShifts]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = contact.name.trim();
    const email = contact.email.trim();
    const job = contact.job.trim();

    const nextErrors: Partial<Record<keyof Contact, boolean>> = {
      name: !name,
      email: !emailOk(email),
      job: !job,
    };
    setErrors(nextErrors);
    const bad = Object.values(nextErrors).some(Boolean);
    if (bad) {
      setFormError("Please complete all fields with a valid email.");
      return;
    }
    setFormError(null);
    setSubmitting(true);

    const payload = {
      contact: { name, email, job, company: contact.company.trim() || undefined },
      products: activeProducts.map((p) => ({
        id: p.id,
        name: p.name,
        size: p.size,
        unitsPerWeek: quantities[p.id] ?? 0,
      })),
      operatorHoursPerWeek,
      availableShifts,
      country,
      selectedSolution: selectedSolutionName
        ? {
            name: selectedSolutionName,
            automationOptions: [...(automationSelected[selectedSolutionName] ?? [])],
          }
        : null,
      website,
    };

    try {
      const res = await fetch("/api/roi/drilling-cell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setFormError(data.error ?? "Could not submit right now. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      goTo(5);
    } catch {
      setFormError("Network error. Please try again.");
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAll(true);
    setQuantities({});
    setOperatorHoursPerWeek(40);
    setCountry("DK");
    setAvailableShifts(1);
    setContact({ name: "", email: "", job: "", company: "" });
    setErrors({});
    setFormError(null);
    setSelectedSolutionName(null);
    setAutomationSelected({});
  };

  const progressPct =
    step === 0 ? 0 : Math.round((Math.min(step, INPUT_STEPS) / INPUT_STEPS) * 100);

  const totalUnitsPerWeek = activeProducts.reduce(
    (s, p) => s + (quantities[p.id] ?? 0),
    0,
  );
  const step2NextDisabled = activeProducts.length === 0 || totalUnitsPerWeek <= 0 || operatorHoursPerWeek <= 0;
  const step3NextDisabled = !selectedSolutionName;

  const STEP_LABELS = ["Products", "Production", "Solution", "Contact"] as const;

  return (
    <div ref={topRef} className="scroll-mt-24 min-h-[600px]">
      {/* Progress + step dots */}
      <div className="mb-8">
        <div className="h-1 w-full rounded-full bg-[var(--color-paper-dark)] overflow-hidden">
          <div
            className="h-full bg-[var(--color-tan-500)] transition-[width] duration-500 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          {[1, 2, 3, 4].map((i) => {
            const isDone = i < step;
            const isCurrent = i === step;
            const canJump = i < step; // only allow jumping back to completed steps
            return (
              <button
                key={i}
                type="button"
                onClick={() => canJump && goTo(i as Step)}
                disabled={!canJump}
                aria-label={`Go to step ${i}: ${STEP_LABELS[i - 1]}`}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all",
                  isCurrent ? "w-6" : "w-2",
                  isDone
                    ? "bg-[var(--color-tan-500)] hover:bg-[var(--color-tan-300)]"
                    : isCurrent
                      ? "bg-[var(--color-tan-500)]"
                      : "bg-[var(--color-paper-dark)]",
                  !canJump && "cursor-default",
                )}
              />
            );
          })}
        </div>
      </div>

      {/* STEP 0 — Intro */}
      {step === 0 && (
        <StepShell
          headingRef={headingRef}
          eyebrow="ROI Calculator"
          title={
            <>
              What can a <em className="not-italic text-[var(--color-tan-500)]">6-sided machining center</em> save you?
            </>
          }
          description="Drilling, milling and grooving on all 6 sides — calculate your time savings and payback period in under 2 minutes."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <IntroCard
              phase="Phase 1"
              title="Production Data"
              desc="Select the panels you currently drill manually, then enter your weekly volumes and the total operator hours spent on drilling today."
            />
            <IntroCard
              phase="Phase 2"
              title="Your Results"
              desc="You'll see your matched machine options with estimated payback period. Our team will then send you a personalised proposal."
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={() => goTo(1)}>
              Get started
              <ArrowRight className="size-4" aria-hidden />
            </PrimaryButton>
          </div>
        </StepShell>
      )}

      {/* STEP 1 — Product selection */}
      {step === 1 && (
        <StepShell
          headingRef={headingRef}
          eyebrow="Step 1 of 4 — Products"
          title={
            <>
              Select the products you <em className="not-italic text-[var(--color-tan-500)]">manufacture</em>
            </>
          }
          description="Tick all the panel types you currently drill manually. If unsure, start with all selected and remove any that don't apply."
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SmallButton onClick={() => setAll(true)}>Select all</SmallButton>
            <SmallButton onClick={() => setAll(false)}>Clear all</SmallButton>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRODUCTS.map((p) => {
              const isSel = selected.has(p.id);
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  aria-pressed={isSel}
                  className={cn(
                    "group relative flex flex-col gap-3 rounded-lg border bg-[var(--color-paper)] p-4 text-left transition-all",
                    "hover:shadow-md hover:-translate-y-0.5",
                    isSel
                      ? "border-[var(--color-navy-900)] bg-[var(--color-paper)] shadow-sm"
                      : "border-[var(--color-paper-dark)] hover:border-[var(--color-navy-500)]",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded border-2 transition-colors",
                      isSel
                        ? "border-[var(--color-navy-900)] bg-[var(--color-navy-900)] text-white"
                        : "border-[var(--color-ink-300)] bg-[var(--color-paper)] text-transparent",
                    )}
                  >
                    <Check className="size-3" />
                  </span>
                  <div className="flex h-28 items-center justify-center rounded-md bg-[var(--color-cream-50)] p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt=""
                      className="h-full w-full max-w-[200px] object-contain"
                    />
                  </div>
                  <div className="pr-8">
                    <div className="text-sm font-semibold tracking-wide text-[var(--color-ink-900)]">
                      {p.id}
                    </div>
                    {p.name ? (
                      <div className="text-sm text-[var(--color-ink-500)]">{p.name}</div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <NavRow
            onBack={() => goTo(0)}
            onNext={() => goTo(2)}
            nextDisabled={selected.size === 0}
            nextDisabledHint={selected.size === 0 ? "Pick at least one product" : undefined}
          />
        </StepShell>
      )}

      {/* STEP 2 — Quantities + operators */}
      {step === 2 && (
        <StepShell
          headingRef={headingRef}
          eyebrow="Step 2 of 4 — Production"
          title={
            <>
              Your weekly volumes and <em className="not-italic text-[var(--color-tan-500)]">operator hours</em>
            </>
          }
          description="Enter how many of each panel you drill per week. Then enter the total hours your operators spend on manual drilling — add them all up across all operators."
        >
          {activeProducts.length === 0 ? (
            <p className="rounded-md border border-[var(--color-paper-dark)] bg-[var(--color-paper)] p-4 text-sm text-[var(--color-ink-500)]">
              No products selected. Go back and select at least one.
            </p>
          ) : (
            <>
              {/* Mobile: card list */}
              <ul className="grid gap-3 sm:hidden">
                {activeProducts.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-lg border border-[var(--color-paper-dark)] bg-[var(--color-paper)] p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded bg-[var(--color-cream-50)] p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.image}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--color-ink-900)]">
                          {p.id}
                        </div>
                        <div className="text-xs text-[var(--color-slate-500)]">
                          {p.size}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--color-paper-dark)] pt-3">
                      <label
                        htmlFor={`qty-${p.id}`}
                        className="inline-flex items-center gap-1 text-eyebrow text-[var(--color-slate-500)]"
                      >
                        Units / week
                        <InfoTooltip text="How many pieces of this panel type do you drill in a typical week? If you think in daily numbers, multiply by 5." />
                      </label>
                      <NumberInput
                        id={`qty-${p.id}`}
                        value={quantities[p.id] ?? 0}
                        min={0}
                        onChange={(v) => updateQty(p.id, v)}
                        className="w-28"
                      />
                    </div>
                  </li>
                ))}
              </ul>

              {/* Tablet+: table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-[var(--color-navy-900)] text-left">
                      <th className="w-[110px] pb-3" />
                      <th className="pb-3 text-eyebrow">Product</th>
                      <th className="pb-3 text-eyebrow">Size</th>
                      <th className="pb-3 text-right text-eyebrow">
                        <span className="inline-flex items-center justify-end gap-1">
                          Units / week
                          <InfoTooltip text="How many pieces of this panel type do you drill in a typical week? If you think in daily numbers, multiply by 5." />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeProducts.map((p) => (
                      <tr key={p.id} className="border-b border-[var(--color-paper-dark)]">
                        <td className="py-3 pr-4">
                          <div className="flex h-14 w-24 items-center justify-center rounded bg-[var(--color-cream-50)] p-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.image}
                              alt=""
                              className="h-full w-full object-contain"
                            />
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-sm font-semibold text-[var(--color-ink-900)]">
                          {p.id}
                        </td>
                        <td className="py-3 pr-3 text-xs text-[var(--color-slate-500)]">
                          {p.size}
                        </td>
                        <td className="py-3 text-right">
                          <NumberInput
                            value={quantities[p.id] ?? 0}
                            min={0}
                            onChange={(v) => updateQty(p.id, v)}
                            className="w-28"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <FieldRow
            label="Current drilling hours per week (all operators)"
            hint="Add up all drilling hours across all operators. Example: 2 operators × 4 hrs/day × 5 days = 40 hrs/week."
            unit="hrs / week"
            tooltip="This is the total time your team currently spends on manual drilling each week — across all operators combined. Example: if 2 people each drill 4 hrs/day × 5 days, that is 40 hrs/week."
          >
            <NumberInput
              value={operatorHoursPerWeek}
              min={0}
              max={10000}
              step={0.5}
              onChange={setOperatorHoursPerWeek}
              className="w-28"
            />
          </FieldRow>

          <FieldRow
            label="Country"
            hint="Used to estimate local labour cost in the business case."
            tooltip="We use the average manufacturing wage in your country to estimate labour costs and potential savings — shown in your local currency."
          >
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as CountryCode)}
              className="rounded-md border border-[var(--color-paper-dark)] bg-[var(--color-paper)] px-3 py-2 text-[0.95rem] font-medium text-[var(--color-ink-900)] outline-none transition-colors focus:border-[var(--color-navy-900)] focus:ring-2 focus:ring-[var(--color-navy-900)]/15"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </FieldRow>

          <FieldRow
            label="Available shifts"
            hint="How many shifts per day could the machine run?"
            tooltip="Choose how many shifts per day the machine would be allowed to run. This is the total time available to process the panel volumes you entered."
          >
            <div className="flex overflow-hidden rounded-md border border-[var(--color-paper-dark)]">
              {([1, 2, 3] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setAvailableShifts(s)}
                  className={cn(
                    "flex h-10 w-12 items-center justify-center text-sm font-semibold transition-colors",
                    s > 1 && "border-l border-[var(--color-paper-dark)]",
                    availableShifts === s
                      ? "bg-[var(--color-navy-900)] text-[var(--color-cream-50)]"
                      : "bg-[var(--color-paper)] text-[var(--color-ink-900)] hover:bg-[var(--color-paper-dark)]",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </FieldRow>

          <div className="mt-3 rounded-lg border border-[var(--color-paper-dark)] bg-[var(--color-paper)] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-slate-500)]">
              Annual operator hours
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[var(--color-ink-900)]">
                {(operatorHoursPerWeek * 46).toLocaleString("da-DK")}
              </span>
              <span className="text-sm text-[var(--color-slate-500)]">hours / year</span>
            </div>
            <p className="mt-1 text-xs text-[var(--color-slate-500)]">
              {operatorHoursPerWeek.toLocaleString("da-DK")} hrs/week × 46 weeks
            </p>
            <p className="mt-2 text-xs text-[var(--color-slate-500)]">
              ≈{" "}
              <span className="font-semibold text-[var(--color-ink-900)]">
                {fmtCurrency(operatorHoursPerWeek * 46 * eurPerHour, selectedCountry.eurToLocal, selectedCountry.currency)}
              </span>{" "}
              / year in labour cost
            </p>
          </div>

          <NavRow
            onBack={() => goTo(1)}
            onNext={() => goTo(3)}
            nextDisabled={step2NextDisabled}
            nextDisabledHint={
              activeProducts.length === 0
                ? "Select at least one product"
                : totalUnitsPerWeek <= 0
                  ? "Enter at least one unit per week"
                  : operatorHoursPerWeek <= 0
                    ? "Enter operator hours per week"
                    : undefined
            }
          />
        </StepShell>
      )}

      {/* STEP 3 — Solutions */}
      {step === 3 && (
        <StepShell
          headingRef={headingRef}
          eyebrow="Step 3 of 4 — Solution Proposals"
          title={
            <>
              Choose the <em className="not-italic text-[var(--color-tan-500)]">right solution</em>
            </>
          }
          description="Based on your data we have matched up to three solutions. Each has a label that explains why it was suggested — click a card to select it, then continue to request your proposal."
        >
          {/* Data summary */}
          <div className="mb-6 rounded-lg border border-[var(--color-paper-dark)] bg-[var(--color-paper)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-slate-500)]">Your data</p>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <div>
                <p className="text-xs text-[var(--color-slate-500)]">Products</p>
                <p className="text-sm font-semibold text-[var(--color-ink-900)]">{activeProducts.length} selected</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-slate-500)]">Units / week</p>
                <p className="text-sm font-semibold text-[var(--color-ink-900)]">
                  {activeProducts.reduce((s, p) => s + (quantities[p.id] ?? 0), 0).toLocaleString("en")}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-slate-500)]">Operator hrs / week</p>
                <p className="text-sm font-semibold text-[var(--color-ink-900)]">{operatorHoursPerWeek.toLocaleString("en")}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-slate-500)]">Available shifts</p>
                <p className="text-sm font-semibold text-[var(--color-ink-900)]">{availableShifts}</p>
              </div>
            </div>
          </div>

          {/* Label legend */}
          <div className="mb-4 flex flex-wrap gap-3 text-xs text-[var(--color-slate-500)]">
            <span><span className="font-semibold text-[var(--color-ink-900)]">Conservative</span> = lowest investment</span>
            <span>·</span>
            <span><span className="font-semibold text-[var(--color-ink-900)]">Best fit</span> = fastest payback</span>
            <span>·</span>
            <span><span className="font-semibold text-[var(--color-ink-900)]">Growth</span> = most spare capacity</span>
          </div>

          {/* Solution cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {displayedSolutions.map(({ solution, labels }) => {
              const isSel = selectedSolutionName === solution.name;
              const selAuto = automationSelected[solution.name] ?? new Set<string>();
              const m = calcSolution(solution, activeProducts, quantities, operatorHoursPerWeek, selAuto, eurPerHour, availableShifts);
              const toggleAuto = (optName: string, checked: boolean) => {
                setAutomationSelected((prev) => {
                  const next = new Set(prev[solution.name] ?? []);
                  if (checked) next.add(optName);
                  else next.delete(optName);
                  return { ...prev, [solution.name]: next };
                });
              };
              return (
                <button
                  key={solution.name}
                  type="button"
                  onClick={() => setSelectedSolutionName(solution.name)}
                  className={cn(
                    "relative flex flex-col rounded-xl border-2 p-4 text-left transition-all",
                    "hover:shadow-md hover:-translate-y-0.5",
                    isSel
                      ? "border-[var(--color-navy-900)] bg-[var(--color-paper)] shadow-sm"
                      : "border-[var(--color-paper-dark)] bg-[var(--color-paper)] hover:border-[var(--color-navy-500)]",
                  )}
                >
                  {isSel && (
                    <span className="absolute right-3 top-3 inline-flex size-5 items-center justify-center rounded-full bg-[var(--color-navy-900)] text-white">
                      <Check className="size-3" />
                    </span>
                  )}

                  {/* Machine image */}
                  {solution.image ? (
                    <div className="mb-3 -mx-4 -mt-4 overflow-hidden rounded-t-xl bg-[var(--color-cream-50)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={solution.image}
                        alt={solution.name}
                        className="h-36 w-full object-contain px-4 py-3"
                      />
                    </div>
                  ) : null}

                  <div className="mb-3 flex flex-wrap gap-1">
                    {labels.map(({ label, badge }) => (
                      <span key={label} className={cn("inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", badge)}>
                        {label}
                      </span>
                    ))}
                  </div>
                  <p className="pr-6 text-sm font-semibold leading-snug text-[var(--color-ink-900)]">{solution.name}</p>
                  {solution.description && (
                    <p className="mt-2 text-xs leading-relaxed text-[var(--color-ink-500)]">{solution.description}</p>
                  )}

                  {/* Core metrics */}
                  <div className="mt-4 grid gap-2 text-sm">
                    <SolutionMetric label="Machine hours / week" value={`${m.weeklyMachineHours.toFixed(1)} hrs`} highlight />
                    <SolutionMetric
                      label="Payback period"
                      value={Number.isFinite(m.paybackYears) ? `~ ${m.paybackYears.toFixed(1)} yrs` : "Contact us"}
                      highlight
                    />
                  </div>

                </button>
              );
            })}
          </div>

          {/* Automation note */}
          <div className="mt-4 rounded-lg border border-[var(--color-paper-dark)] bg-[var(--color-paper)] px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-slate-500)]">
              Cell Automation Add-on
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-ink-500)]">
              All solutions above can be extended with automated cell integration — typically delivering a{" "}
              <span className="font-semibold text-[var(--color-ink-900)]">10–20% improvement in OEE</span>{" "}
              through reduced idle time, automated loading/unloading, and real-time monitoring.
              Our team will include this option in the personalised proposal sent to you.
            </p>
          </div>

          <NavRow
            onBack={() => goTo(2)}
            onNext={() => goTo(4)}
            nextDisabled={step3NextDisabled}
            nextDisabledHint={step3NextDisabled ? "Select a solution to continue" : undefined}
          />
        </StepShell>
      )}

      {/* STEP 4 — Contact */}
      {step === 4 && (
        <StepShell
          headingRef={headingRef}
          eyebrow="Step 4 of 4 — Get in Touch"
          title={
            <>
              Let&apos;s turn this into a <em className="not-italic text-[var(--color-tan-500)]">real proposal</em>
            </>
          }
          description="No commitment required. Fill in your details and a Nicholaisen specialist will send you the full calculation and reach out to answer any questions."
        >
          <form onSubmit={handleSubmit} noValidate className="grid gap-4">
            <TextField
              id="contactName"
              label="Full name"
              required
              autoComplete="name"
              placeholder="Jane Doe"
              value={contact.name}
              onChange={(v) => {
                setContact((c) => ({ ...c, name: v }));
                if (errors.name) setErrors((e) => ({ ...e, name: false }));
              }}
              invalid={!!errors.name}
              errorMessage={errors.name ? "Please enter your name." : undefined}
            />
            <TextField
              id="contactEmail"
              label="Work email"
              required
              type="email"
              autoComplete="email"
              placeholder="jane@company.com"
              value={contact.email}
              onChange={(v) => {
                setContact((c) => ({ ...c, email: v }));
                if (errors.email) setErrors((e) => ({ ...e, email: false }));
              }}
              onBlur={(v) => {
                if (v.trim() && !emailOk(v.trim())) {
                  setErrors((e) => ({ ...e, email: true }));
                }
              }}
              invalid={!!errors.email}
              errorMessage={errors.email ? "Enter a valid email address." : undefined}
            />
            <TextField
              id="contactJob"
              label="Job title"
              required
              autoComplete="organization-title"
              placeholder="Production Manager"
              value={contact.job}
              onChange={(v) => {
                setContact((c) => ({ ...c, job: v }));
                if (errors.job) setErrors((e) => ({ ...e, job: false }));
              }}
              invalid={!!errors.job}
              errorMessage={errors.job ? "Please enter your job title." : undefined}
            />
            <TextField
              id="contactCompany"
              label="Company"
              autoComplete="organization"
              placeholder="Optional"
              value={contact.company}
              onChange={(v) => setContact((c) => ({ ...c, company: v }))}
            />

            {/* Honeypot — hidden from real users */}
            <div className="hidden" aria-hidden>
              <label htmlFor="website">Website</label>
              <input
                id="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {formError ? (
              <p className="text-sm text-[#b3261e]" role="alert">
                {formError}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <SecondaryButton type="button" onClick={() => goTo(3)}>
                <ArrowLeft className="size-4" aria-hidden /> Back
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={submitting} aria-busy={submitting || undefined}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>
                    Request proposal
                    <ArrowRight className="size-4" aria-hidden />
                  </>
                )}
              </PrimaryButton>
            </div>
          </form>
        </StepShell>
      )}

      {/* STEP 5 — Thanks */}
      {step === 5 && (
        <StepShell
          headingRef={headingRef}
          eyebrow="Submission Received"
          title={
            <>
              Thank you, <em className="not-italic text-[var(--color-tan-500)]">{firstName}!</em>
            </>
          }
          description={
            <>
              Your request has been received. A Nicholaisen specialist will contact{" "}
              <strong className="text-[var(--color-ink-900)]">{contact.email || "you"}</strong>{" "}
              to take the conversation further.
            </>
          }
        >
          <div className="mb-8 rounded-md border border-[var(--color-paper-dark)] border-l-4 border-l-[var(--color-navy-900)] bg-[var(--color-paper)] p-5 text-sm leading-relaxed text-[var(--color-ink-500)]">
            <strong className="text-[var(--color-ink-900)]">What happens next?</strong>
            <br />We will review your production data and selected solution, then reach out within 1–2
            business days to discuss your specific case, answer questions, and prepare a
            priced proposal matched to your actual requirements.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton
              onClick={() => {
                resetForm();
                goTo(0);
              }}
            >
              Submit another
            </PrimaryButton>
          </div>
        </StepShell>
      )}
    </div>
  );
}

/* -------- helper components -------- */

function StepShell({
  eyebrow,
  title,
  description,
  children,
  headingRef,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: React.ReactNode;
  children: React.ReactNode;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <div className="animate-[fadeUp_.35s_ease_forwards]">
      <p className="text-eyebrow text-[var(--color-tan-500)]">{eyebrow}</p>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-display-3 text-balance text-[var(--color-ink-900)] outline-none"
      >
        {title}
      </h2>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-ink-500)]">
        {description}
      </p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

function IntroCard({ phase, title, desc }: { phase: string; title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-[var(--color-paper-dark)] bg-[var(--color-paper)] p-5">
      <p className="text-eyebrow text-[var(--color-tan-500)]">{phase}</p>
      <p className="mt-2 font-semibold text-[var(--color-ink-900)]">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink-500)]">{desc}</p>
    </div>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="More information"
        className="inline-flex items-center justify-center rounded-full text-[var(--color-slate-500)] transition-colors hover:text-[var(--color-ink-900)]"
      >
        <Info className="size-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-0 z-20 mb-2 w-60 rounded-lg bg-[var(--color-ink-900)] px-3 py-2.5 text-xs leading-relaxed text-[var(--color-cream-50)] shadow-xl"
        >
          {text}
          <span className="absolute left-2 top-full border-4 border-transparent border-t-[var(--color-ink-900)]" />
        </span>
      )}
    </span>
  );
}

function FieldRow({
  label,
  hint,
  unit,
  tooltip,
  children,
}: {
  label: string;
  hint?: string;
  unit?: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[var(--color-paper-dark)] bg-[var(--color-paper)] p-5 focus-within:border-[var(--color-navy-900)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-ink-900)]">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </div>
        {hint ? <div className="mt-0.5 text-xs text-[var(--color-slate-500)]">{hint}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {unit ? (
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-slate-500)]">
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  required,
  type = "text",
  autoComplete,
  placeholder,
  invalid,
  errorMessage,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: (v: string) => void;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  invalid?: boolean;
  errorMessage?: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-[var(--color-ink-900)]">
        {label}
        {required ? <span className="ml-1 text-[var(--color-tan-500)]">*</span> : null}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid && errorMessage ? errorId : undefined}
        className={cn(
          "w-full rounded-md border bg-[var(--color-paper)] px-3.5 py-2.5 text-[0.95rem] outline-none transition-colors",
          "focus:border-[var(--color-navy-900)] focus:ring-2 focus:ring-[var(--color-navy-900)]/15",
          invalid
            ? "border-[#b3261e] focus:border-[#b3261e] focus:ring-[#b3261e]/15"
            : "border-[var(--color-paper-dark)]",
        )}
      />
      {invalid && errorMessage ? (
        <p id={errorId} className="text-xs text-[#b3261e]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function NumberInput({
  id,
  value,
  onChange,
  min,
  max,
  step,
  className,
}: {
  id?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode={step && step % 1 !== 0 ? "decimal" : "numeric"}
      step={step}
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
      onFocus={(e) => e.target.select()}
      onWheel={(e) => (e.target as HTMLInputElement).blur()}
      className={cn(
        "rounded-md border border-[var(--color-paper-dark)] bg-[var(--color-paper)] px-3 py-2 text-right text-[0.95rem] font-medium text-[var(--color-ink-900)] outline-none transition-colors",
        "focus:border-[var(--color-navy-900)] focus:ring-2 focus:ring-[var(--color-navy-900)]/15",
        "appearance-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className,
      )}
    />
  );
}

function PrimaryButton({
  children,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--color-navy-900)] px-5 text-[0.95rem] font-medium text-[var(--color-cream-50)] transition-all",
        "hover:bg-[var(--color-navy-700)] hover:shadow-sm active:translate-y-px",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-navy-900)] disabled:hover:shadow-none disabled:active:translate-y-0",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      {...props}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[var(--color-navy-900)]/20 bg-transparent px-5 text-[0.95rem] font-medium text-[var(--color-ink-900)] transition-colors",
        "hover:border-[var(--color-navy-900)]/60 hover:bg-[var(--color-paper-dark)]/40",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

function SmallButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center rounded border border-[var(--color-paper-dark)] bg-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-slate-500)] transition-colors",
        "hover:border-[var(--color-navy-900)] hover:text-[var(--color-ink-900)]",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

function SolutionMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-[var(--color-slate-500)]">{label}</span>
      <span className={cn("text-sm font-semibold", highlight ? "text-[var(--color-ink-900)]" : "text-[var(--color-ink-700)]")}>
        {value}
      </span>
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextDisabled,
  nextDisabledHint,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextDisabledHint?: string;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <SecondaryButton onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden /> Back
      </SecondaryButton>
      <PrimaryButton
        onClick={onNext}
        disabled={nextDisabled}
        title={nextDisabled ? nextDisabledHint : undefined}
        aria-label={nextDisabled && nextDisabledHint ? nextDisabledHint : undefined}
      >
        Next <ArrowRight className="size-4" aria-hidden />
      </PrimaryButton>
      {nextDisabled && nextDisabledHint ? (
        <p className="text-xs text-[var(--color-slate-500)]">{nextDisabledHint}</p>
      ) : null}
    </div>
  );
}

import type { Scenario, ScenarioResult } from "@/lib/api/types";
import { directionOf, formatAmount, toNumber } from "@/lib/format";
import type { Bar } from "@/components/scenarios/CompareChart";

/**
 * Shared baseline/currency rules for both comparison routes
 * (/scenarios/[scenarioId] and /scenarios/compare/[batchId]).
 */

/** Distinct baseline values across results. More than one means changes aren't directly comparable. */
export function baselineSummary(results: ScenarioResult[]): {
  /** The shared baseline, or null when there are none or they differ. */
  baseline: string | null;
  differ: boolean;
} {
  const values = [...new Set(results.map((r) => toNumber(r.baseline_value)))];
  if (values.length === 0) return { baseline: null, differ: false };
  if (values.length > 1) return { baseline: null, differ: true };
  return { baseline: results[0].baseline_value, differ: false };
}

/** The one currency used by every scenario, or null when they differ (then each amount shows its own). */
export function sharedCurrency(
  scenarios: Pick<Scenario, "currency">[],
): string | null {
  const set = new Set(scenarios.map((s) => s.currency));
  return set.size === 1 ? [...set][0] : null;
}

/** Amount with its currency appended when the page has no single currency. */
export function money(
  value: string,
  currency: string,
  shared: string | null,
): string {
  return shared ? formatAmount(value) : `${formatAmount(value)} ${currency}`;
}

/** Chart colour of a result relative to its own baseline. */
export function toneOf(result: ScenarioResult): Bar["tone"] {
  const d = directionOf(result);
  return d === "increase" ? "increase" : d === "decrease" ? "decrease" : "none";
}

/** Chart title, with the currency only when it's shared. */
export function valueTitle(shared: string | null): string {
  return `Simulated value${shared ? ` (${shared})` : ""}`;
}

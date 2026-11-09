import type { ScenarioResult } from "./api/types";

export function toNumber(
  value: string | number | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

const numberFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const plainFmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 });

export function formatAmount(
  value: string | number | null | undefined,
): string {
  const n = toNumber(value);
  return n === null ? "—" : numberFmt.format(n);
}

export function formatPlain(value: string | number | null | undefined): string {
  const n = toNumber(value);
  return n === null ? "—" : plainFmt.format(n);
}

export function formatSigned(
  value: string | number | null | undefined,
): string {
  const n = toNumber(value);
  if (n === null) return "—";
  const body = numberFmt.format(Math.abs(n));
  if (n > 0 && body !== "0.00") return `+${body}`;
  if (n < 0 && body !== "0.00") return `-${body}`;
  return body;
}

export function formatFraction(
  value: string | number | null | undefined,
): string {
  const n = toNumber(value);
  return n === null ? "—" : `${plainFmt.format(+(n * 100).toFixed(4))}%`;
}

export function formatPercentDiff(
  value: string | null | undefined,
): string | null {
  const n = toNumber(value);
  if (n === null) return null;
  const body = Math.abs(n).toFixed(2);
  if (n > 0 && body !== "0.00") return `+${body}%`;
  if (n < 0 && body !== "0.00") return `-${body}%`;
  return "0.00%";
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type Direction = "increase" | "decrease" | "none" | "unknown";

export function directionOf(
  result: Pick<ScenarioResult, "value_difference">,
): Direction {
  const n = toNumber(result.value_difference);
  if (n === null) return "unknown";
  if (numberFmt.format(Math.abs(n)) === "0.00") return "none";
  return n > 0 ? "increase" : "decrease";
}

export const NULL_PERCENT_EXPLANATION =
  "Not available: the baseline value is 0, so a percentage change cannot be calculated.";

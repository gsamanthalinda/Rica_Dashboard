import type { BatchHistoryRecord, ProcessingStage } from "@/lib/api/types";

/** One recorded stage of a batch, as shown on the traceability page. */
export interface StageDetail {
  key: string;
  /** 1-based position in the batch's path. */
  position: number;
  stageId: number;
  name: string;
  occurredAt: string;
  /** Tonnes entering the stage. Recorded value, or the previous stage's output when not recorded. */
  feed: number | null;
  /** true when feed was taken from the previous stage's output rather than recorded. */
  feedDerived: boolean;
  /** Fraction 0–1. */
  feedGrade: number | null;
  /** Tonnes leaving the stage. */
  output: number | null;
  /** Fraction 0–1. */
  outputGrade: number | null;
  /** Fraction 0–1. Recorded value, or metal balance (output × grade ÷ feed × grade) when not recorded. */
  recovery: number | null;
  recoveryDerived: boolean;
  /** Fraction 0–1. */
  moisture: number | null;
  /** output − feed in tonnes. */
  massChange: number | null;
  /** Mass change as a percent of feed. */
  massChangePct: number | null;
  assayUrl: string | null;
}

const toNum = (v: string | null | undefined): number | null =>
  v === null || v === undefined || v === "" ? null : Number(v);

/**
 * Turns a batch's history records into ordered stage details.
 * Uses the latest record for each stage (a stage can be re-recorded) and orders by stage_order.
 */
export function buildStageDetails(
  history: BatchHistoryRecord[],
  stages: ProcessingStage[],
): StageDetail[] {
  const stageById = new Map(stages.map((s) => [s.stage_id, s]));

  const latest = new Map<number, BatchHistoryRecord>();
  for (const h of [...history].sort((a, b) =>
    a.occurred_at.localeCompare(b.occurred_at),
  )) {
    latest.set(h.current_stage_id, h);
  }

  const orderOf = (h: BatchHistoryRecord) =>
    stageById.get(h.current_stage_id)?.stage_order ?? Number.MAX_SAFE_INTEGER;
  const ordered = [...latest.values()].sort(
    (a, b) =>
      orderOf(a) - orderOf(b) || a.occurred_at.localeCompare(b.occurred_at),
  );

  let previousOutput: number | null = null;
  return ordered.map((h, i) => {
    const output = toNum(h.output_quantity_tonnes) ?? toNum(h.quantity_tonnes);
    const recordedFeed = toNum(h.feed_quantity_tonnes);
    const feed = recordedFeed ?? previousOutput;
    const feedGrade = toNum(h.feed_grade);
    const outputGrade = toNum(h.output_grade) ?? toNum(h.grade);

    const recordedRecovery = toNum(h.recovery);
    const balance =
      feed && feedGrade && output !== null && outputGrade !== null
        ? (output * outputGrade) / (feed * feedGrade)
        : null;
    const recovery = recordedRecovery ?? balance;

    const massChange = feed !== null && output !== null ? output - feed : null;
    const massChangePct =
      massChange !== null && feed ? (massChange / feed) * 100 : null;

    if (output !== null) previousOutput = output;

    return {
      key: h.history_id,
      position: i + 1,
      stageId: h.current_stage_id,
      name:
        stageById.get(h.current_stage_id)?.stage_name ??
        `Stage ${h.current_stage_id}`,
      occurredAt: h.occurred_at,
      feed,
      feedDerived: recordedFeed === null && feed !== null,
      feedGrade,
      output,
      outputGrade,
      recovery,
      recoveryDerived: recordedRecovery === null && recovery !== null,
      moisture: toNum(h.moisture),
      massChange,
      massChangePct,
      assayUrl: h.assay_document_url,
    };
  });
}

// ---------- Display formatting ----------

const nf = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const fmtTonnes = (v: number | null) =>
  v === null ? "—" : `${nf.format(v)} t`;

/** Formats a 0–1 fraction as a percent. */
export const fmtFraction = (v: number | null) =>
  v === null ? "—" : `${nf.format(v * 100)}%`;

export function fmtMassChange(t: number | null, pct: number | null): string {
  if (t === null) return "—";
  const sign = t > 0 ? "+" : t < 0 ? "−" : "";
  const tonnes = `${sign}${nf.format(Math.abs(t))} t`;
  return pct === null
    ? tonnes
    : `${tonnes} (${sign}${nf.format(Math.abs(pct))}%)`;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

/** The backend may store a full URL, an absolute path, or just a file name. */
export function assayHref(url: string, apiBase: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${apiBase}${url}`;
  return `${apiBase}/batch-history/files/assay/${encodeURIComponent(url)}`;
}

// ---------- CSV export ----------

function csvCell(v: string | number | null): string {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const round = (v: number | null, dp = 4) =>
  v === null ? null : Number(v.toFixed(dp));
const pct = (v: number | null) => (v === null ? null : round(v * 100));

/** CSV of every stage of the batch. Plain numbers (no units) so spreadsheets can use them. */
export function toCsv(batchCode: string, details: StageDetail[]): string {
  const header = [
    "Position",
    "Stage",
    "Recorded at",
    "Feed (t)",
    "Feed grade (%)",
    "Output (t)",
    "Output grade (%)",
    "Recovery (%)",
    "Moisture (%)",
    "Mass change (t)",
    "Mass change (%)",
    "Assay document",
  ];
  const lines = details.map((d) =>
    [
      d.position,
      d.name,
      d.occurredAt,
      round(d.feed),
      pct(d.feedGrade),
      round(d.output),
      pct(d.outputGrade),
      pct(d.recovery),
      pct(d.moisture),
      round(d.massChange),
      round(d.massChangePct),
      d.assayUrl,
    ]
      .map(csvCell)
      .join(","),
  );
  return [`Batch,${csvCell(batchCode)}`, header.join(","), ...lines].join("\n");
}

"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { TraceChain } from "@/components/stages/TraceChain";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiBaseUrl } from "@/lib/api/client";
import { historyApi, lookupApi, stagesApi } from "@/lib/api/endpoints";
import type { MineralBatch } from "@/lib/api/types";
import {
  assayHref,
  buildStageDetails,
  fmtFraction,
  fmtMassChange,
  fmtTonnes,
  toCsv,
  type StageDetail,
} from "@/lib/traceability";

function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// useSearchParams needs a Suspense boundary for the build to prerender; the (main) layout has none.
export default function BatchStagesPage() {
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <TraceabilityPage />
    </Suspense>
  );
}

function TraceabilityPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const batches = useApi("trace:batches", (signal) =>
    lookupApi.batches({ signal }),
  );

  if (batches.loading) return <Spinner label="Loading batches…" />;
  if (batches.error && !batches.data) {
    return (
      <ErrorState
        error={batches.error}
        onRetry={batches.reload}
        title="Couldn’t load batches"
      />
    );
  }
  const list = batches.data ?? [];
  if (list.length === 0) {
    return (
      <EmptyState title="No batches yet">
        Register a batch and record its first stage to see its traceability
        workflow here.
      </EmptyState>
    );
  }

  // ?batch=<batch code> (e.g. CU-00041) picks the batch: the same identifier Home links with and
  // the picker writes. Without it, the first batch is shown. An unknown code is an explicit
  // "Batch not found", never a silent switch to another batch's history.
  const requested = params.get("batch")?.trim() || null;
  const pick = (code: string) =>
    router.replace(`${pathname}?batch=${encodeURIComponent(code)}`);
  const batch = requested
    ? list.find((b) => b.batch_code.toLowerCase() === requested.toLowerCase())
    : list[0];

  if (!batch) {
    return (
      <div className="space-y-4">
        <EmptyState title="Batch not found">
          No batch matches “{requested}”. It may have been removed, or the link
          is wrong.
        </EmptyState>
        <label className="flex items-center gap-2 text-sm font-semibold">
          Choose a batch
          <select
            defaultValue=""
            onChange={(e) => e.target.value && pick(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-2 font-normal"
          >
            <option value="" disabled>
              Select…
            </option>
            {list.map((b) => (
              <option key={b.batch_id} value={b.batch_code}>
                {b.batch_code}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  // key remounts the view so selection and data reset when the batch changes.
  return (
    <BatchTrace
      key={batch.batch_id}
      batch={batch}
      batches={list}
      onPickBatch={pick}
    />
  );
}

function BatchTrace({
  batch,
  batches,
  onPickBatch,
}: {
  batch: MineralBatch;
  batches: MineralBatch[];
  onPickBatch: (code: string) => void;
}) {
  // History records only carry stage ids, so stage names and order come from /processing-stages.
  const trace = useApi(`trace:history:${batch.batch_id}`, async (signal) => {
    const [history, stages] = await Promise.all([
      historyApi.byBatch(batch.batch_id, { signal }),
      stagesApi.list({ signal }),
    ]);
    return { history, stages };
  });
  const details = useMemo<StageDetail[]>(
    () =>
      trace.data
        ? buildStageDetails(trace.data.history, trace.data.stages)
        : [],
    [trace.data],
  );
  const [picked, setPicked] = useState<number | null>(null);
  const selectedIndex = picked ?? details.length - 1; // latest stage by default
  const selected = details[selectedIndex];
  const batchCode = batch.batch_code;

  const picker = (
    <label className="flex items-center gap-2 text-sm font-semibold print:hidden">
      Batch
      <select
        value={batch.batch_code}
        onChange={(e) => onPickBatch(e.target.value)}
        className="rounded-md border border-line bg-white px-3 py-2 font-normal"
      >
        {batches.map((b) => (
          <option key={b.batch_id} value={b.batch_code}>
            {b.batch_code}
          </option>
        ))}
      </select>
    </label>
  );

  const noStages = (
    <EmptyState title="No stages recorded yet">
      Stages appear here once they are recorded for this batch.
    </EmptyState>
  );

  let body: React.ReactNode;
  if (trace.loading) {
    body = <Spinner label="Loading stages…" />;
  } else if (trace.error && !trace.data) {
    body = trace.error.isNotFound ? (
      noStages
    ) : trace.error.status === 401 ? (
      <EmptyState title="Please sign in">
        Your session has ended.{" "}
        <Link href="/login" className="font-semibold text-navy underline">
          Sign in
        </Link>{" "}
        to see this batch’s stages.
      </EmptyState>
    ) : (
      <ErrorState
        error={trace.error}
        onRetry={trace.reload}
        title="Couldn’t load this batch’s stages"
      />
    );
  } else if (details.length === 0 || !selected) {
    body = noStages;
  } else {
    // Tonnes, with the grade alongside when it was recorded, e.g. "1,000 t · 2.5% Cu".
    const withGrade = (t: number | null, g: number | null) =>
      t === null
        ? "—"
        : g === null
          ? fmtTonnes(t)
          : `${fmtTonnes(t)} · ${fmtFraction(g)} Cu`;

    const fields: [string, React.ReactNode][] = [
      [
        "Feed",
        `${withGrade(selected.feed, selected.feedGrade)}${
          selected.feedDerived ? " (previous stage’s output)" : ""
        }`,
      ],
      ["Output", withGrade(selected.output, selected.outputGrade)],
      [
        "Recovery",
        selected.recovery === null
          ? "—"
          : `${fmtFraction(selected.recovery)}${selected.recoveryDerived ? " (calculated)" : ""}`,
      ],
      [
        "Mass Change",
        fmtMassChange(selected.massChange, selected.massChangePct),
      ],
      [
        "Assay document",
        selected.assayUrl ? (
          <a
            href={assayHref(selected.assayUrl, apiBaseUrl())}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-navy underline"
          >
            View assay
          </a>
        ) : (
          "—"
        ),
      ],
    ];

    body = (
      <>
        <TraceChain
          items={details.map((d) => ({
            key: d.key,
            name: d.name,
            lines: [
              fmtTonnes(d.output),
              d.outputGrade === null ? "—" : `${fmtFraction(d.outputGrade)} Cu`,
            ],
          }))}
          selectedIndex={selectedIndex}
          onSelect={setPicked}
        />

        <section aria-labelledby="sel-h" className="space-y-2 print:hidden">
          <h2 id="sel-h" className="text-xs font-bold">
            Selected Stage: {selected.name}
          </h2>
          <div className="rounded-lg border border-line bg-white p-4">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">
                Details of the selected stage
              </caption>
              <thead>
                <tr className="bg-[#a4c4e8]">
                  <th scope="col" className="w-1/2 px-5 py-5 font-bold">
                    Field
                  </th>
                  <th scope="col" className="px-5 py-5 font-bold">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {fields.map(([label, value]) => (
                  <tr
                    key={label}
                    className="border-b border-rule last:border-b-0"
                  >
                    <th scope="row" className="px-5 py-5 font-normal">
                      {label}
                    </th>
                    <td className="px-5 py-5 tabular-nums">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Print / "Export as PDF" only: every stage of the batch, not just the selected one. */}
        <section aria-label="All stages" className="hidden print:block">
          <h2 className="mb-2 text-sm font-bold">All stages</h2>
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#a4c4e8]">
                <th scope="col" className="border border-rule px-3 py-2">
                  #
                </th>
                <th scope="col" className="border border-rule px-3 py-2">
                  Stage
                </th>
                <th scope="col" className="border border-rule px-3 py-2">
                  Feed
                </th>
                <th scope="col" className="border border-rule px-3 py-2">
                  Output
                </th>
                <th scope="col" className="border border-rule px-3 py-2">
                  Recovery
                </th>
                <th scope="col" className="border border-rule px-3 py-2">
                  Mass Change
                </th>
                <th scope="col" className="border border-rule px-3 py-2">
                  Assay document
                </th>
              </tr>
            </thead>
            <tbody>
              {details.map((d) => (
                <tr key={d.key} className="break-inside-avoid">
                  <td className="border border-rule px-3 py-2">{d.position}</td>
                  <th
                    scope="row"
                    className="border border-rule px-3 py-2 font-semibold"
                  >
                    {d.name}
                  </th>
                  <td className="border border-rule px-3 py-2 tabular-nums">
                    {withGrade(d.feed, d.feedGrade)}
                  </td>
                  <td className="border border-rule px-3 py-2 tabular-nums">
                    {withGrade(d.output, d.outputGrade)}
                  </td>
                  <td className="border border-rule px-3 py-2 tabular-nums">
                    {fmtFraction(d.recovery)}
                  </td>
                  <td className="border border-rule px-3 py-2 tabular-nums">
                    {fmtMassChange(d.massChange, d.massChangePct)}
                  </td>
                  <td className="border border-rule px-3 py-2">
                    {d.assayUrl
                      ? decodeURIComponent(
                          d.assayUrl.split("/").pop() ?? "Attached",
                        )
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="flex justify-end gap-3 print:hidden">
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `${batchCode}-traceability.csv`,
                toCsv(batchCode, details),
              )
            }
            className="rounded-md bg-navy px-5 py-3 font-bold text-white hover:bg-navy-hover"
          >
            Export as CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md border-2 border-navy bg-white px-5 py-3 text-sm font-bold text-navy"
          >
            Export as PDF
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6" aria-busy={trace.refreshing}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">
            {batchCode} : Traceability Workflow
          </h1>
          <p>Path from extraction to delivery. Click a stage for details.</p>
        </div>
        {picker}
      </div>
      {body}
    </div>
  );
}

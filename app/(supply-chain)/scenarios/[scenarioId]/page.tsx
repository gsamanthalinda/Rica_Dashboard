"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { CompareChart, type Bar } from "@/components/scenarios/CompareChart";
import { ResultDetail } from "@/components/scenarios/ResultDetail";
import { ResultsTable } from "@/components/scenarios/ResultsTable";
import { EmptyState, ErrorState, PageTitle, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { lookupApi, scenariosApi } from "@/lib/api/endpoints";
import { toNumber } from "@/lib/format";
import { baselineSummary, toneOf, valueTitle } from "@/lib/scenarioCompare";

/** One scenario: its latest (or selected) execution, a chart of every execution, and the execution history. */
export default function ScenarioResultsPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();

  // Scenario and results must both load; any failure is shown with a retry, never hidden.
  const { data, error, loading, refreshing, reload } = useApi(
    `scenario:${scenarioId}`,
    async (signal) => {
      const [scenario, results] = await Promise.all([
        scenariosApi.get(scenarioId, { signal }),
        scenariosApi.results(scenarioId, { signal }),
      ]);
      return { scenario, results };
    },
  );

  // The batch code is only a label; if it can't load, the page says so instead of guessing.
  const batches = useApi("scenario:batches", (signal) =>
    lookupApi.batches({ signal }),
  );

  const [picked, setPicked] = useState<string | null>(null);

  const back = (
    <Link
      href="/scenarios"
      className="text-sm font-semibold text-navy underline-offset-2 hover:underline"
    >
      ← All scenarios
    </Link>
  );

  if (loading) return <Spinner label="Loading results…" />;

  if (error && !data) {
    return (
      <div className="space-y-4">
        {back}
        {error.isNotFound ? (
          <EmptyState title="Scenario not found">
            It may have been removed, or the link is wrong.
          </EmptyState>
        ) : (
          <ErrorState
            error={error}
            onRetry={reload}
            title="Couldn’t load this scenario’s results"
          />
        )}
      </div>
    );
  }
  if (!data) return null;

  const { scenario, results } = data;
  const batchCode =
    batches.data?.find((b) => b.batch_id === scenario.batch_id)?.batch_code ??
    null;
  const latest = results.length ? results[results.length - 1] : null;
  const selected = results.find((r) => r.results_id === picked) ?? latest;
  const { baseline, differ } = baselineSummary(results);

  // The decision page always assesses the latest execution, so the link
  // only needs the scenario and its batch.
  const decisionHref = `/decisions?scenario=${encodeURIComponent(
    scenario.scenario_id,
  )}&batch=${encodeURIComponent(scenario.batch_id)}`;

  // One baseline bar only when every execution used the same baseline; otherwise each bar is
  // still coloured against its own baseline and a note explains why there is no baseline bar.
  const bars: Bar[] = [
    ...(baseline !== null
      ? [
          {
            label: "Baseline",
            value: toNumber(baseline),
            tone: "baseline" as const,
          },
        ]
      : []),
    ...results.map((r): Bar => ({
      label: `Execution #${r.execution_number}`,
      value: toNumber(r.simulated_value),
      tone: toneOf(r),
    })),
  ];

  return (
    <div className="space-y-6" aria-busy={refreshing}>
      {back}
      <PageTitle
        sub={
          <>
            Batch{" "}
            {batchCode ? (
              <Link
                href={`/scenarios/compare/${scenario.batch_id}`}
                className="font-semibold text-navy underline-offset-2 hover:underline"
              >
                {batchCode}
              </Link>
            ) : batches.error ? (
              <span>
                (batch name unavailable){" "}
                <button
                  type="button"
                  onClick={batches.reload}
                  className="font-semibold text-navy underline"
                >
                  Retry
                </button>
              </span>
            ) : (
              "…"
            )}{" "}
            · Currency {scenario.currency}
          </>
        }
      >
        {scenario.scenario_name}: results
      </PageTitle>

      {error && (
        <ErrorState
          error={error}
          onRetry={reload}
          title="Couldn’t refresh results"
        />
      )}

      {results.length === 0 || !selected ? (
        <EmptyState title="No results yet">
          This scenario hasn’t been executed. Results appear here after an
          execution is recorded.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Want to know whether this scenario stands? The decision is based
              on the latest execution (#{latest?.execution_number}).
            </p>
            <Link
              href={decisionHref}
              className="inline-flex items-center rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              See decision
            </Link>
          </div>

          <ResultDetail
            result={selected}
            currency={scenario.currency}
            isLatest={selected.results_id === latest?.results_id}
          />

          {differ && (
            <p
              role="note"
              className="rounded-md border border-line bg-teal-soft/50 p-3 text-sm"
            >
              These executions were calculated against different baseline
              values, so their changes aren’t directly comparable. Each
              execution’s change is relative to its own baseline.
            </p>
          )}

          <CompareChart bars={bars} title={valueTitle(scenario.currency)} />

          <section aria-labelledby="exec-h" className="space-y-3">
            <h2 id="exec-h" className="text-lg font-bold">
              Execution history
            </h2>
            <ResultsTable
              results={results}
              currency={scenario.currency}
              selectedId={selected.results_id}
              onSelect={setPicked}
            />
          </section>
        </>
      )}
    </div>
  );
}

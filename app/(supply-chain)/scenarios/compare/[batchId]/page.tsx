"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CompareChart, type Bar } from "@/components/scenarios/CompareChart";
import { PercentValue } from "@/components/scenarios/Diff";
import {
  EmptyState,
  ErrorState,
  Spinner,
  TableCard,
  tdCls,
} from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { lookupApi, scenariosApi } from "@/lib/api/endpoints";
import type {
  Scenario,
  ScenarioResult,
  ValueCalculation,
} from "@/lib/api/types";
import {
  formatAmount,
  formatFraction,
  formatPlain,
  toNumber,
} from "@/lib/format";
import {
  baselineSummary,
  money as moneyIn,
  sharedCurrency,
  toneOf,
  valueTitle,
} from "@/lib/scenarioCompare";

interface Column {
  scenario: Scenario;
  latest: ScenarioResult | null;
  failed: boolean;
}

const th =
  "bg-teal px-4 py-3 text-left text-sm font-bold text-on-teal align-bottom";

/** Shared value when every item has the same one, otherwise null. */
function single<T>(values: T[]): T | null {
  const set = new Set(values);
  return set.size === 1 ? [...set][0] : null;
}

function Heading({ code }: { code: string }) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold text-navy">Scenario Comparison</h1>
      <h2 className="text-lg font-bold text-navy">
        {code} : Scenario comparison
      </h2>
    </div>
  );
}

export default function CompareBatchPage() {
  const { batchId } = useParams<{ batchId: string }>();

  const { data, error, loading, reload } = useApi(
    `compare:${batchId}`,
    async (signal) => {
      const scenarios = await scenariosApi.list({ batchId }, { signal });

      const [columns, batches, calcs] = await Promise.all([
        Promise.all(
          scenarios.map(async (scenario): Promise<Column> => {
            try {
              const results = await scenariosApi.results(scenario.scenario_id, {
                signal,
              });
              return {
                scenario,
                latest: results.length ? results[results.length - 1] : null,
                failed: false,
              };
            } catch (e) {
              if (signal.aborted) throw e;
              return { scenario, latest: null, failed: true };
            }
          }),
        ),
        lookupApi.batches({ signal }).catch(() => null),
        lookupApi.batchValues(batchId, { signal }).catch(() => null),
      ]);

      const batchCode =
        batches?.find((b) => b.batch_id === batchId)?.batch_code ?? null;
      return { columns, batchCode, calcs };
    },
  );

  if (loading) return <Spinner label="Loading comparison…" />;

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/scenarios"
          className="text-sm font-semibold text-navy underline-offset-2 hover:underline"
        >
          ← All scenarios
        </Link>
        {error && (
          <ErrorState
            error={error}
            onRetry={reload}
            title="Couldn’t load the comparison"
          />
        )}
      </div>
    );
  }

  const { columns, batchCode, calcs } = data;
  const code = batchCode ?? `${batchId.slice(0, 8)}…`;

  if (columns.length === 0) {
    return (
      <div className="space-y-6">
        <Heading code={code} />
        <EmptyState title="No scenarios for this batch">
          Either the batch id is wrong or no scenario has been created for it
          yet.
        </EmptyState>
      </div>
    );
  }

  const withResult = columns.filter((c) => c.latest);
  const baselineCalcIds = new Set(
    columns.map((c) => c.scenario.baseline_calculation_id),
  );
  const baselineCalc: ValueCalculation | undefined = calcs?.find((c) =>
    baselineCalcIds.has(c.calculation_id),
  );
  // Same rules as the single-scenario page: one baseline column/bar only when every scenario shares it.
  const summary = baselineSummary(withResult.map((c) => c.latest!));
  const baselinesDiffer = summary.differ || baselineCalcIds.size > 1;
  const baselineValue = baselinesDiffer
    ? null
    : (summary.baseline ?? baselineCalc?.calculated_value ?? null);

  // Units go in the row label (e.g. "Price (USD/tonne)") when every column shares them, as in the design.
  const currency = sharedCurrency(columns.map((c) => c.scenario));
  const priceUnit = single([
    ...columns.map((c) => c.scenario.price_unit),
    ...(baselineCalc ? [baselineCalc.price_unit] : []),
  ]);
  const money = (v: string, cur: string) => moneyIn(v, cur, currency);
  const price = (v: string, unit: string) =>
    priceUnit ? formatPlain(v) : `${formatPlain(v)} ${unit}`;

  const bars: Bar[] = [
    ...(baselineValue !== null
      ? [
          {
            label: "Baseline",
            value: toNumber(baselineValue),
            tone: "baseline" as const,
          },
        ]
      : []),
    ...columns.map((c): Bar => {
      if (!c.latest)
        return { label: c.scenario.scenario_name, value: null, tone: "none" };
      return {
        label: c.scenario.scenario_name,
        value: toNumber(c.latest.simulated_value),
        tone: toneOf(c.latest),
      };
    }),
  ];

  const rowHead =
    "border-b border-rule px-4 py-4 text-left text-sm font-normal whitespace-nowrap";
  const cell = `${tdCls} tabular-nums`;
  const hasBaseline = baselineValue !== null;

  return (
    <div className="space-y-6">
      <Heading code={code} />

      {baselinesDiffer && (
        <p
          role="note"
          className="rounded-md border border-line bg-teal-soft/50 p-3 text-sm"
        >
          These scenarios were calculated against different baseline values, so
          their changes aren’t directly comparable. Each column’s change is
          relative to its own baseline.
        </p>
      )}
      {columns.some((c) => c.failed) && (
        <p
          role="alert"
          className="rounded-md border border-decrease/60 bg-decrease/5 p-3 text-sm"
        >
          Results couldn’t be loaded for some scenarios.{" "}
          <button
            type="button"
            onClick={reload}
            className="font-bold underline"
          >
            Try again
          </button>
        </p>
      )}

      <TableCard>
        <table className="w-full min-w-[640px] border-collapse">
          <caption className="sr-only">
            Scenario comparison for batch {code}
          </caption>
          <thead>
            <tr>
              <th scope="col" className={th}>
                <span className="sr-only">Measure</span>
              </th>
              {hasBaseline && (
                <th scope="col" className={th}>
                  Baseline
                </th>
              )}
              {columns.map((c) => (
                <th key={c.scenario.scenario_id} scope="col" className={th}>
                  <Link
                    href={`/scenarios/${c.scenario.scenario_id}`}
                    className="underline-offset-2 hover:underline"
                  >
                    {c.scenario.scenario_name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" className={rowHead}>
                Quantity (t)
              </th>
              {hasBaseline && (
                <td className={cell}>
                  {baselineCalc ? formatPlain(baselineCalc.quantity) : "—"}
                </td>
              )}
              {columns.map((c) => (
                <td key={c.scenario.scenario_id} className={cell}>
                  {formatPlain(c.scenario.assumed_quantity)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                Grade
              </th>
              {hasBaseline && (
                <td className={cell}>
                  {baselineCalc ? formatFraction(baselineCalc.grade) : "—"}
                </td>
              )}
              {columns.map((c) => (
                <td key={c.scenario.scenario_id} className={cell}>
                  {formatFraction(c.scenario.assumed_grade)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                Recovery
              </th>
              {hasBaseline && (
                <td className={cell}>
                  {baselineCalc?.recovery != null
                    ? formatFraction(baselineCalc.recovery)
                    : "—"}
                </td>
              )}
              {columns.map((c) => (
                <td key={c.scenario.scenario_id} className={cell}>
                  {formatFraction(c.scenario.assumed_recovery)}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={rowHead}>
                Price{priceUnit ? ` (${priceUnit})` : ""}
              </th>
              {hasBaseline && (
                <td className={cell}>
                  {baselineCalc
                    ? price(
                        baselineCalc.reference_price,
                        baselineCalc.price_unit,
                      )
                    : "—"}
                </td>
              )}
              {columns.map((c) => (
                <td key={c.scenario.scenario_id} className={cell}>
                  {price(c.scenario.assumed_price, c.scenario.price_unit)}
                </td>
              ))}
            </tr>
            <tr>
              <th
                scope="row"
                className={`${rowHead.replace("font-normal", "font-bold")} text-navy`}
              >
                Simulated value{currency ? ` (${currency})` : ""}
              </th>
              {hasBaseline && (
                <td className={`${cell} text-navy`}>
                  {formatAmount(baselineValue)}
                </td>
              )}
              {columns.map((c) => (
                <td
                  key={c.scenario.scenario_id}
                  className={`${cell} text-navy`}
                >
                  {c.failed ? (
                    <span className="text-muted">Unavailable</span>
                  ) : c.latest ? (
                    money(c.latest.simulated_value, c.scenario.currency)
                  ) : (
                    <span className="text-muted">No results yet</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row" className={`${rowHead} border-b-0`}>
                Change (%)
              </th>
              {hasBaseline && <td className={`${cell} border-b-0`}>–</td>}
              {columns.map((c) => (
                <td
                  key={c.scenario.scenario_id}
                  className={`${cell} border-b-0`}
                >
                  {c.latest ? <PercentValue result={c.latest} /> : "–"}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </TableCard>

      {bars.some((b) => b.value !== null) ? (
        <CompareChart bars={bars} title={valueTitle(currency)} />
      ) : (
        <EmptyState title="Nothing to chart yet">
          None of these scenarios has results.
        </EmptyState>
      )}
    </div>
  );
}

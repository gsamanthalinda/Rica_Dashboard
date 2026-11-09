import { directionOf, formatAmount, formatDateTime } from "@/lib/format";
import type { ScenarioResult } from "@/lib/api/types";
import { DifferenceValue, DirectionTag, PercentValue } from "./Diff";

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <dt className="text-sm font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-extrabold tabular-nums">{children}</dd>
    </div>
  );
}

export function ResultDetail({
  result,
  currency,
  isLatest,
}: {
  result: ScenarioResult;
  currency: string;
  isLatest: boolean;
}) {
  const direction = directionOf(result);
  return (
    <section aria-labelledby="detail-h" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="detail-h" className="text-lg font-bold">
          Execution #{result.execution_number}
          {isLatest && (
            <span className="ml-2 rounded-full bg-teal-soft px-2 py-0.5 align-middle text-xs font-bold text-teal-dark">
              Latest
            </span>
          )}
        </h2>
        <span className="text-sm text-muted">
          Calculated {formatDateTime(result.calculated_at)}
        </span>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card label={`Simulated value (${currency})`}>
          {formatAmount(result.simulated_value)}
        </Card>
        <Card label={`Baseline value (${currency})`}>
          {formatAmount(result.baseline_value)}
        </Card>
        <Card label={`Difference (${currency})`}>
          <DifferenceValue result={result} />
          <div className="mt-1 text-sm font-normal">
            <DirectionTag direction={direction} />
          </div>
        </Card>
        <Card label="Percentage change">
          <PercentValue result={result} />
        </Card>
      </dl>
    </section>
  );
}

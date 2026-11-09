import { formatAmount, formatDateTime } from "@/lib/format";
import type { ScenarioResult } from "@/lib/api/types";
import { TableCard, tdCls, thCls } from "@/components/ui";
import { DifferenceValue, PercentValue } from "./Diff";

interface Props {
  results: ScenarioResult[];
  currency: string;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function ResultsTable({
  results,
  currency,
  selectedId,
  onSelect,
}: Props) {
  return (
    <TableCard>
      <table className="w-full min-w-[760px] border-collapse">
        <caption className="sr-only">
          Executions of this scenario, oldest first
        </caption>
        <thead>
          <tr>
            <th scope="col" className={thCls}>
              Execution
            </th>
            <th scope="col" className={thCls}>
              Calculated at
            </th>
            <th scope="col" className={`${thCls} text-right`}>
              Simulated ({currency})
            </th>
            <th scope="col" className={`${thCls} text-right`}>
              Baseline ({currency})
            </th>
            <th scope="col" className={`${thCls} text-right`}>
              Difference
            </th>
            <th scope="col" className={`${thCls} text-right`}>
              Change
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const selected = r.results_id === selectedId;
            return (
              <tr
                key={r.results_id}
                className={selected ? "bg-teal-soft/60" : undefined}
              >
                <th scope="row" className={`${tdCls} text-left`}>
                  <button
                    type="button"
                    onClick={() => onSelect(r.results_id)}
                    aria-pressed={selected}
                    className="rounded px-1 font-bold text-navy underline-offset-2 hover:underline"
                  >
                    #{r.execution_number}
                  </button>
                </th>
                <td className={tdCls}>{formatDateTime(r.calculated_at)}</td>
                <td className={`${tdCls} text-right tabular-nums`}>
                  {formatAmount(r.simulated_value)}
                </td>
                <td className={`${tdCls} text-right tabular-nums`}>
                  {formatAmount(r.baseline_value)}
                </td>
                <td className={`${tdCls} text-right`}>
                  <DifferenceValue result={r} />
                </td>
                <td className={`${tdCls} text-right`}>
                  <PercentValue result={r} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </TableCard>
  );
}

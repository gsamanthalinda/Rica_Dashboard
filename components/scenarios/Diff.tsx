import { ArrowDown, ArrowUp } from "@/components/Icons";
import {
  directionOf,
  formatPercentDiff,
  formatSigned,
  NULL_PERCENT_EXPLANATION,
  type Direction,
} from "@/lib/format";
import type { ScenarioResult } from "@/lib/api/types";

const STYLE: Record<Direction, string> = {
  increase: "text-teal-dark",
  decrease: "text-decrease",
  none: "text-muted",
  unknown: "text-muted",
};
const WORD: Record<Direction, string> = {
  increase: "Increase",
  decrease: "Decrease",
  none: "No change",
  unknown: "Unknown",
};

export function DirectionTag({ direction }: { direction: Direction }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold ${STYLE[direction]}`}
    >
      {direction === "increase" && <ArrowUp className="h-3.5 w-3.5" />}
      {direction === "decrease" && <ArrowDown className="h-3.5 w-3.5" />}
      {WORD[direction]}
    </span>
  );
}

export function DifferenceValue({
  result,
}: {
  result: Pick<ScenarioResult, "value_difference">;
}) {
  const d = directionOf(result);
  return (
    <span className={`font-semibold tabular-nums ${STYLE[d]}`}>
      {formatSigned(result.value_difference)}
    </span>
  );
}

export function PercentValue({
  result,
}: {
  result: Pick<ScenarioResult, "value_difference" | "percentage_difference">;
}) {
  const text = formatPercentDiff(result.percentage_difference);
  if (text === null) {
    return (
      <span className="text-muted" title={NULL_PERCENT_EXPLANATION}>
        N/A
        <span className="sr-only"> — {NULL_PERCENT_EXPLANATION}</span>
        <span aria-hidden="true" className="ml-1 cursor-help">
          ⓘ
        </span>
      </span>
    );
  }
  return (
    <span
      className={`font-semibold tabular-nums ${STYLE[directionOf(result)]}`}
    >
      {text}
    </span>
  );
}

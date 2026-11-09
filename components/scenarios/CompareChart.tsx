import { formatAmount } from "@/lib/format";

export interface Bar {
  label: string;
  value: number | null;
  tone: "baseline" | "increase" | "decrease" | "none";
}

const TONE: Record<Bar["tone"], string> = {
  baseline: "bg-navy",
  increase: "bg-teal",
  decrease: "bg-decrease-bar",
  none: "bg-line",
};

function axis(max: number) {
  if (max <= 0) return { top: 1, ticks: [0, 1] };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 4, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const top = step * (Math.floor(max / step) + 2);
  const n = Math.round(top / step);
  return { top, ticks: Array.from({ length: n + 1 }, (_, i) => i * step) };
}

function tickLabel(t: number, top: number) {
  if (t === 0) return "0";
  if (top >= 1e6) return `${+(t / 1e6).toFixed(2)}M`;
  if (top >= 1e3) return `${+(t / 1e3).toFixed(1)}K`;
  return String(+t.toFixed(2));
}

export function CompareChart({ bars, title }: { bars: Bar[]; title: string }) {
  const { top, ticks } = axis(Math.max(0, ...bars.map((b) => b.value ?? 0)));
  const summary = bars
    .map(
      (b) =>
        `${b.label}: ${b.value === null ? "no result" : formatAmount(b.value)}`,
    )
    .join("; ");

  return (
    <figure className="rounded-lg border border-line bg-white px-6 py-5">
      <figcaption className="mb-6 text-xs font-bold">{title}</figcaption>
      <div
        role="img"
        aria-label={`${title}. ${summary}`}
        className="flex gap-3"
      >
        <div
          className="relative mt-2 h-64 w-12 shrink-0 text-right text-xs"
          aria-hidden="true"
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 translate-y-1/2"
              style={{ bottom: `${(t / top) * 100}%` }}
            >
              {tickLabel(t, top)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <div className="min-w-[480px] pt-2" aria-hidden="true">
            <div className="relative h-64">
              {ticks.map((t) => (
                <div
                  key={t}
                  className={`absolute inset-x-0 border-t ${t === 0 ? "border-black" : "border-rule"}`}
                  style={{ bottom: `${(t / top) * 100}%` }}
                />
              ))}
              <div className="absolute inset-0 flex">
                {bars.map((b) => (
                  <div
                    key={b.label}
                    className="flex flex-1 items-end justify-center"
                  >
                    {b.value !== null && (
                      <div
                        className={`w-10 sm:w-12 ${TONE[b.tone]}`}
                        style={{
                          height: `${(b.value / top) * 100}%`,
                          printColorAdjust: "exact",
                          WebkitPrintColorAdjust: "exact",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex pt-2 text-center text-xs">
              {bars.map((b) => (
                <div key={b.label} className="flex-1 px-1">
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}

export interface ChainItem {
  key: string;
  name: string;
  /** Short figure lines under the name, e.g. "150 t" and "25% Cu". */
  lines: string[];
}

interface Props {
  items: ChainItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const TIP = 40; // depth of the arrow point / notch in px

/**
 * Clickable chevron strip (Traceability Workflow design). Selected stage is navy;
 * the others alternate mint / lavender-grey. Numbers are positions in the batch's path.
 * On phones each stage is wider so its name and figures are not clipped, and the
 * strip scrolls sideways inside its own container instead of pushing the page.
 */
export function TraceChain({ items, selectedIndex, onSelect }: Props) {
  if (items.length === 0) return null;
  return (
    <div className="w-full max-w-full overflow-x-auto pb-2">
      <ol
        aria-label="Processing path of this batch"
        className="flex min-w-full"
      >
        {items.map((item, i) => {
          const selected = i === selectedIndex;
          const tone = selected
            ? "bg-navy text-white"
            : i % 2 === 0
              ? "bg-[#cdf3ea] text-black"
              : "bg-[#d5d4e1] text-black";
          return (
            <li
              key={item.key}
              className="min-w-[230px] flex-1 sm:min-w-[170px]"
              style={{ marginLeft: i === 0 ? 0 : -(TIP - 8) }}
            >
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={selected}
                aria-label={`Stage ${i + 1}: ${item.name}, ${item.lines.join(", ")}`}
                className={`relative block h-[115px] w-full text-left ${tone}`}
                style={{
                  clipPath:
                    i === 0
                      ? `polygon(0 0, calc(100% - ${TIP}px) 0, 100% 50%, calc(100% - ${TIP}px) 100%, 0 100%)`
                      : `polygon(0 0, calc(100% - ${TIP}px) 0, 100% 50%, calc(100% - ${TIP}px) 100%, 0 100%, ${TIP}px 50%)`,
                }}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-2 text-[28px] font-light leading-none ${
                    selected ? "text-white" : "text-black/25"
                  }`}
                  style={{ left: i === 0 ? 16 : 36 }}
                >
                  {i + 1}.
                </span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-5 right-12 text-sm font-bold leading-tight"
                  style={{ left: i === 0 ? 40 : 64 }}
                >
                  {item.name}
                  {item.lines.map((l) => (
                    <span key={l} className="block whitespace-nowrap">
                      {l}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

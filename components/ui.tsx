import type { ApiError } from "@/lib/api/client";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-md bg-navy px-5 py-2.5 text-base font-bold text-white hover:bg-navy-hover disabled:cursor-not-allowed disabled:opacity-60";
export const btnSecondary =
  "inline-flex items-center justify-center rounded-md bg-gray-btn px-5 py-2.5 text-base font-bold text-white hover:bg-gray-btn/85 disabled:cursor-not-allowed disabled:opacity-60";
export const btnDanger =
  "inline-flex items-center justify-center rounded-md bg-decrease px-5 py-2.5 text-base font-bold text-white hover:bg-decrease/90 disabled:cursor-not-allowed disabled:opacity-60";
export const inputCls =
  "w-full rounded-md border border-line bg-white px-3 py-2.5 text-base aria-[invalid=true]:border-decrease aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-decrease";

export function PageTitle({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold sm:text-[28px]">{children}</h1>
      {sub && <p className="mt-1 text-muted">{sub}</p>}
    </div>
  );
}

export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-10 text-muted">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-transparent"
      />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-10 text-center">
      <p className="text-lg font-bold">{title}</p>
      {children && <div className="mt-1 text-muted">{children}</div>}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "Couldn’t load this data",
}: {
  error: ApiError;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-decrease/60 bg-decrease/5 px-6 py-6"
    >
      <p className="font-bold text-decrease">{title}</p>
      <p className="mt-1 text-sm">{error.message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`${btnPrimary} mt-4`}
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-x-auto rounded-lg border border-line bg-white">
      {children}
    </div>
  );
}
export const thCls =
  "bg-teal px-4 py-3 text-left text-sm font-bold text-on-teal whitespace-nowrap";
export const tdCls = "border-b border-rule px-4 py-4 text-sm";

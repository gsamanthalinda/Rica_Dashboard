"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { useForm } from "react-hook-form";
import type { SubmitHandler, UseFormRegisterReturn } from "react-hook-form";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { createBatch, fetchQrBlob } from "../lib/api";
import type { MineralBatch } from "../lib/api";

// Class names come from the global stylesheet (the "Register a new batch" section).
const styles = {
  page: "rb",
  layout: "rb-layout",
  card: "rb-card",
  formCard: "rb-formcard",
  fields: "rb-fields",
  column: "rb-column",
  field: "rb-field",
  label: "rb-label",
  control: "rb-control",
  fieldError: "rb-fielderror",
  selectWrap: "rb-selectwrap",
  chevron: "rb-chevron",
  qrCard: "rb-qrcard",
  qrMeta: "rb-qrmeta",
  qrTitle: "rb-qrtitle",
  qrText: "rb-qrtext",
  qr: "rb-qr",
  qrPlaceholder: "rb-qrplaceholder",
  share: "rb-share",
  success: "rb-success",
  error: "rb-error",
  actions: "rb-actions",
  skip: "rb-skip",
  cancel: "rb-cancel",
  record: "rb-record",
} as const;

// The backend currently only accepts COPPER.
const MINERAL_TYPE = "COPPER";
const SOURCE_TYPES = ["Self extracted", "Purchased"];

// Percent inputs (0 to 100, up to 2 decimals). The user types e.g. 5 or 45.5;
// the code converts to a 0-1 fraction before sending.
const PERCENT_TYPING = /^\d{0,3}(\.\d{0,2})?$/;
const PERCENT_VALID = /^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/;
const PERCENT_HINT =
  "Enter a percentage from 0 to 100, up to 2 decimals, e.g. 45.5";

interface FormValues {
  source: string;
  date: string;
  quantity: string;
  grade: string;
  recovery: string;
}

const EMPTY: FormValues = {
  source: "",
  date: "",
  quantity: "0",
  grade: "",
  recovery: "",
};

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.label}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${htmlFor}-error`} className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SelectControl({
  id,
  options,
  error,
  registration,
}: {
  id: string;
  options: string[];
  error?: string;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className={styles.selectWrap}>
      <select
        id={id}
        className={styles.control}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...registration}
      >
        <option value="" disabled />
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        className={styles.chevron}
        size={20}
        strokeWidth={1.75}
        aria-hidden="true"
      />
    </div>
  );
}

/** Faint QR-style placeholder (deterministic, so it never causes hydration mismatches). */
function QrPlaceholder() {
  const N = 25;
  const cells: boolean[][] = [];
  let seed = 7;
  for (let y = 0; y < N; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < N; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      row.push(seed % 100 < 48);
    }
    cells.push(row);
  }
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  const finder = (ox: number, oy: number) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width={7} height={7} fill="#d9d7ea" />
      <rect x={ox + 1} y={oy + 1} width={5} height={5} fill="#fff" />
      <rect x={ox + 2} y={oy + 2} width={3} height={3} fill="#d9d7ea" />
    </g>
  );
  return (
    <div className={styles.qrPlaceholder} aria-hidden="true">
      <svg viewBox={`0 0 ${N} ${N}`} shapeRendering="crispEdges">
        {cells.flatMap((row, y) =>
          row.map((on, x) =>
            on && !inFinder(x, y) ? (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width={1}
                height={1}
                fill="#d9d7ea"
              />
            ) : null,
          ),
        )}
        {finder(0, 0)}
        {finder(N - 7, 0)}
        {finder(0, N - 7)}
      </svg>
    </div>
  );
}

/** Round to a fixed number of decimal places (avoids float noise). */
const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

/**
 * Finds the batch inside whatever createBatch returns: the batch itself,
 * { data: batch }, or { message, data: batch }, with or without an axios wrapper.
 */
function unwrapBatch(res: unknown): MineralBatch {
  let cur: unknown = res;
  for (let i = 0; i < 3; i++) {
    if (cur && typeof cur === "object") {
      if ("batch_code" in cur) return cur as MineralBatch;
      if ("data" in cur) {
        cur = (cur as { data: unknown }).data;
        continue;
      }
    }
    break;
  }
  throw new Error(
    "The server did not return the saved batch. Check the API response.",
  );
}

export default function MineralBatchForm() {
  const router = useRouter();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: EMPTY,
    mode: "onTouched",
  });

  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<MineralBatch | null>(null);
  const [qrBlob, setQrBlob] = useState<Blob | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  // Refs update immediately (state only updates on the next render), so two
  // quick clicks can never create two batches.
  const savedRef = useRef<MineralBatch | null>(null);
  const pendingRef = useRef<Promise<MineralBatch> | null>(null);

  const saving = isSubmitting || sharing;
  const locked = !!saved; // once the batch exists, its details cannot change

  // Frees the QR image URL when it changes or the form unmounts.
  // (The URL itself is created in create(), so no setState happens here.)
  useEffect(() => {
    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
  }, [qrUrl]);

  /** Registers a percent input and ignores keystrokes that break the format. */
  const percentField = (name: "grade" | "recovery") => {
    const field = register(name, {
      required: "This field is required.",
      pattern: { value: PERCENT_VALID, message: PERCENT_HINT },
    });
    return {
      ...field,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        if (!PERCENT_TYPING.test(e.target.value)) {
          // Put the previous value back and skip the form-state update.
          e.target.value = getValues(name);
          return Promise.resolve();
        }
        return field.onChange(e);
      },
    };
  };

  /** Sends the batch to the server and loads its QR code. Called once per batch. */
  async function create(values: FormValues): Promise<MineralBatch> {
    // date is collected per the design but MineralBatchCreate has no field
    // for it, so it is not sent.
    const response = await createBatch({
      mineral_type: MINERAL_TYPE,
      source_type: values.source.toUpperCase().replace(/\s+/g, "_"),
      quantity_tonnes: round(Number(values.quantity), 2), // two decimal places
      grade: round(Number(values.grade) / 100, 6), // percent -> 0-1, e.g. 5 -> 0.05
      recovery: round(Number(values.recovery) / 100, 6), // percent -> 0-1, e.g. 85 -> 0.85
      stage_id: "1",
    });

    const batch = unwrapBatch(response);
    savedRef.current = batch;
    setSaved(batch); // locks the form

    try {
      const blob = await fetchQrBlob(batch.batch_code);
      setQrBlob(blob);
      setQrUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(
        `Batch ${batch.batch_code} was saved, but its QR code could not be loaded. ` +
          (err instanceof Error ? err.message : ""),
      );
    }
    return batch;
  }

  /**
   * Creates the batch once. Later calls return the saved batch, and calls made
   * while a save is in flight share that same request.
   */
  function save(values: FormValues): Promise<MineralBatch> {
    if (savedRef.current) return Promise.resolve(savedRef.current);
    if (pendingRef.current) return pendingRef.current;

    const request = create(values).finally(() => {
      pendingRef.current = null;
    });
    pendingRef.current = request;
    return request;
  }

  // Only runs when every field passes validation.
  const onSubmit: SubmitHandler<FormValues> = async (values, event) => {
    const submitter = (event?.nativeEvent as SubmitEvent | undefined)
      ?.submitter as HTMLButtonElement | null | undefined;

    setError(null);
    try {
      await save(values);
      if (submitter?.value === "record") {
        router.push("/home");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  async function handleShare() {
    // Same validation the submit buttons use.
    if (!(await trigger())) return;

    setSharing(true);
    setError(null);
    try {
      const batch = await save(getValues());
      const blob = qrBlob ?? (await fetchQrBlob(batch.batch_code));
      const file = new File([blob], `${batch.batch_code}.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Batch ${batch.batch_code}`,
        });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <section className={styles.page}>
      <h1>Register a new batch</h1>

      {/* noValidate: react-hook-form owns validation and the error messages */}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} noValidate>
        <div className={styles.layout}>
          {/* ---------- Form card (left): one column ---------- */}
          <div className={`${styles.card} ${styles.formCard}`}>
            <fieldset className={styles.fields} disabled={saving || locked}>
              <div className={styles.column}>
                <Field
                  label="Source Type *"
                  htmlFor={id("source")}
                  error={errors.source?.message}
                >
                  <SelectControl
                    id={id("source")}
                    options={SOURCE_TYPES}
                    error={errors.source?.message}
                    registration={register("source", {
                      required: "Select a source type.",
                    })}
                  />
                </Field>

                <Field
                  label="Quantity(Tonnes)*"
                  htmlFor={id("quantity")}
                  error={errors.quantity?.message}
                >
                  <input
                    id={id("quantity")}
                    className={styles.control}
                    type="number"
                    step="0.01"
                    aria-invalid={!!errors.quantity}
                    aria-describedby={
                      errors.quantity ? `${id("quantity")}-error` : undefined
                    }
                    {...register("quantity", {
                      required: "Enter a quantity.",
                      validate: (v) =>
                        (v !== "" && !Number.isNaN(Number(v))) ||
                        "Enter a valid number.",
                      min: { value: 0, message: "Quantity can't be negative." },
                    })}
                  />
                </Field>

                <Field
                  label="Initial grade (%)*"
                  htmlFor={id("grade")}
                  error={errors.grade?.message}
                >
                  <input
                    id={id("grade")}
                    className={styles.control}
                    type="text"
                    inputMode="decimal"
                    title={PERCENT_HINT}
                    autoComplete="off"
                    aria-invalid={!!errors.grade}
                    aria-describedby={
                      errors.grade ? `${id("grade")}-error` : undefined
                    }
                    {...percentField("grade")}
                  />
                </Field>

                <Field
                  label="Recovery (%)*"
                  htmlFor={id("recovery")}
                  error={errors.recovery?.message}
                >
                  <input
                    id={id("recovery")}
                    className={styles.control}
                    type="text"
                    inputMode="decimal"
                    title={PERCENT_HINT}
                    autoComplete="off"
                    aria-invalid={!!errors.recovery}
                    aria-describedby={
                      errors.recovery ? `${id("recovery")}-error` : undefined
                    }
                    {...percentField("recovery")}
                  />
                </Field>
              </div>
            </fieldset>
          </div>

          {/* ---------- QR card (right) ---------- */}
          <aside className={`${styles.card} ${styles.qrCard}`}>
            <div className={styles.qrMeta}>
              <p className={styles.qrTitle}>After you save</p>
              <p className={styles.qrText}>A QR code is created.</p>
              <p className={styles.qrTitle}>
                Batch Code : {saved ? saved.batch_code : "CU-XXXXXXXX"}
              </p>
            </div>

            <div className={styles.qr}>
              {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt={`QR code for batch ${saved?.batch_code}`}
                  width={165}
                  height={165}
                />
              ) : (
                <QrPlaceholder />
              )}
            </div>

            <button
              type="button"
              className={styles.share}
              onClick={handleShare}
              disabled={saving}
            >
              Share QR
            </button>
          </aside>
        </div>

        {saved && (
          <p className={styles.success} role="status">
            Batch {saved.batch_code} registered.
            {!error && " Its QR code is shown above."}
          </p>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {/* ---------- Actions ---------- */}
        <div className={styles.actions}>
          <button
            type="submit"
            name="intent"
            value="save"
            className={styles.skip}
            disabled={saving || locked}
          >
            {locked ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => router.push("/home")}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            name="intent"
            value="record"
            className={styles.record}
            disabled={saving}
          >
            {saving ? "Saving…" : "Add batch stage"}
          </button>
        </div>
      </form>
    </section>
  );
}

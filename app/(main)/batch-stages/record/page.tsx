"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import type { SubmitHandler } from "react-hook-form";
import { useSearchParams } from "next/navigation";
import { getMe } from "@/lib/auth";
import { ApiError } from "@/lib/api/client";
import { historyApi, lookupApi, stagesApi } from "@/lib/api/endpoints";
import type {
  BatchHistoryRecord,
  MineralBatch,
  ProcessingStage,
} from "@/lib/api/types";
import styles from "./batch_stages.module.css";

const WORKFLOW = ["Extraction", "Processing", "Smelting", "Refining"];

/**
 * The shared MineralBatch type only declares the lookup fields. This page also
 * reads quantity and grade (the feed of the first stage), and tolerates the
 * alternative field names the batch endpoint has used.
 */
type BatchRow = Partial<MineralBatch> & {
  id?: string;
  quantity_tonnes?: number | string | null;
  batch_quantity_tonnes?: number | string | null;
  initial_quantity_tonnes?: number | string | null;
  grade?: number | string | null;
  initial_grade?: number | string | null;
};

interface FormValues {
  stage_id: string;
  occurred_at: string;
  output_quantity_tonnes: string;
  output_grade: string;
  recovery: string;
  moisture: string;
}

const emptyOutputs = {
  output_quantity_tonnes: "",
  output_grade: "",
  recovery: "",
  moisture: "0",
};

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPercent(value: unknown): string {
  return String(Number((numberValue(value) * 100).toFixed(4)));
}

function nowLocalInput(): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function isoToLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return nowLocalInput();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function batchUuid(batch: BatchRow): string {
  return String(batch.batch_id ?? batch.id ?? "");
}

function batchQuantity(batch: BatchRow): number | null {
  const raw =
    batch.quantity_tonnes ??
    batch.batch_quantity_tonnes ??
    batch.initial_quantity_tonnes;
  return raw == null ? null : numberValue(raw);
}

function batchGrade(batch: BatchRow): number | null {
  const raw = batch.grade ?? batch.initial_grade;
  return raw == null ? null : numberValue(raw);
}

function numberOrBlank(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
}

function percentOrBlank(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(Number((n * 100).toFixed(4))) : "";
}

/** Form values for a stage: the saved record if there is one, else a blank form. */
function valuesFor(stageId: string, record?: BatchHistoryRecord): FormValues {
  if (!record) {
    return { stage_id: stageId, occurred_at: nowLocalInput(), ...emptyOutputs };
  }
  return {
    stage_id: stageId,
    occurred_at: isoToLocalInput(record.occurred_at),
    // Blank for null, never "0" — a saved stage must show its real measurements,
    // and a stage with no value must show an empty field to edit.
    // Same fallback Trace uses: output_* first, then the older quantity/grade fields.
    output_quantity_tonnes: numberOrBlank(
      record.output_quantity_tonnes ?? record.quantity_tonnes,
    ),
    output_grade: percentOrBlank(record.output_grade ?? record.grade),
    recovery: percentOrBlank(record.recovery),
    // moisture defaults to 0 when unsaved, matching the blank-form default
    moisture: percentOrBlank(record.moisture) || "0",
  };
}

const quantityRules = {
  required: "Output quantity is required.",
  validate: (value: string) => {
    const number = Number(value);
    if (value.trim() === "" || !Number.isFinite(number)) {
      return "Output quantity must be a valid number.";
    }
    return number >= 0 || "Output quantity cannot be negative.";
  },
};

const percentRules = (label: string) => ({
  required: `${label} is required.`,
  validate: (value: string) => {
    const number = Number(value);
    if (value.trim() === "" || !Number.isFinite(number)) {
      return `${label} must be a valid number.`;
    }
    return (
      (number >= 0 && number <= 100) || `${label} must be between 0% and 100%.`
    );
  },
});

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <small className={styles.fieldError} role="alert">
      {message}
    </small>
  );
}

export default function BatchStagesPage() {
  return (
    <Suspense fallback={null}>
      <BatchStageForm />
    </Suspense>
  );
}

function BatchStageForm() {
  const batchParam = (useSearchParams().get("batch") ?? "").trim();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { stage_id: "", occurred_at: "", ...emptyOutputs },
    mode: "onTouched",
  });
  const stageId = useWatch({ control, name: "stage_id" });

  const [stages, setStages] = useState<ProcessingStage[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [batchKey, setBatchKey] = useState(batchParam); // code or id of the chosen batch
  const [batch, setBatch] = useState<BatchRow | null>(null);
  const [records, setRecords] = useState<BatchHistoryRecord[]>([]);
  const [assayFile, setAssayFile] = useState<File | null>(null);
  const [recordedBy, setRecordedBy] = useState("");
  const [ready, setReady] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // True from submit until the request settles, so everything is locked
  // while the save runs.
  const saving = isSubmitting;

  const activeBatchIdRef = useRef("");
  // Synchronous guard: React Hook Form does not block a second submit while
  // the first one is still running.
  const savingRef = useRef(false);

  const selectedIndex = stages.findIndex(
    (stage) => String(stage.stage_id) === stageId,
  );
  const selectedStage = selectedIndex >= 0 ? stages[selectedIndex] : null;
  const previousStage = selectedIndex > 0 ? stages[selectedIndex - 1] : null;

  const latestRecordByStage = useMemo(() => {
    const latest = new Map<number, BatchHistoryRecord>();
    const sorted = [...records].sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );
    for (const record of sorted) {
      const id = Number(record.current_stage_id);
      if (!latest.has(id)) latest.set(id, record);
    }
    return latest;
  }, [records]);

  const existingRecord = selectedStage
    ? latestRecordByStage.get(selectedStage.stage_id)
    : undefined;
  const editing = Boolean(existingRecord);

  const isComplete = useCallback(
    (id: number) =>
      records.some((record) => Number(record.current_stage_id) === Number(id)),
    [records],
  );

  /** What goes INTO the selected stage: the batch itself, or the previous stage's output. */
  const feed = useMemo(() => {
    if (!batch || !selectedStage) return null;

    if (selectedIndex === 0) {
      const quantity = batchQuantity(batch);
      const grade = batchGrade(batch);
      return quantity == null || grade == null ? null : { quantity, grade };
    }

    const previous = previousStage
      ? latestRecordByStage.get(previousStage.stage_id)
      : undefined;
    if (!previous) return null;

    return {
      quantity: numberValue(previous.output_quantity_tonnes),
      grade: numberValue(previous.output_grade),
    };
  }, [batch, selectedStage, selectedIndex, previousStage, latestRecordByStage]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const ordered = (await stagesApi.list())
          .filter((stage) =>
            WORKFLOW.some(
              (name) => normalize(name) === normalize(stage.stage_name),
            ),
          )
          .sort((a, b) => a.stage_order - b.stage_order);

        const missing = WORKFLOW.filter(
          (name) =>
            !ordered.some(
              (stage) => normalize(stage.stage_name) === normalize(name),
            ),
        );
        if (missing.length) {
          throw new Error(`Missing stages from the API: ${missing.join(", ")}`);
        }

        const list = await lookupApi.batches();
        if (cancelled) return;

        setStages(ordered);
        setBatches(list);
        reset(valuesFor(String(ordered[0].stage_id)));
        setReady(true);
      } catch (cause) {
        if (!cancelled) {
          setError(
            `Could not load the page: ${cause instanceof Error ? cause.message : "Request failed"}`,
          );
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, [reset]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBatchKey(batchParam);
  }, [batchParam]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function loadSelected() {
      activeBatchIdRef.current = "";

      if (!batchKey) {
        setBatch(null);
        setRecords([]);
        return;
      }

      setBatchLoading(true);
      setError("");
      setSuccess("");
      try {
        const found = batches.find(
          (item) =>
            normalize(batchUuid(item)) === normalize(batchKey) ||
            normalize(item.batch_code) === normalize(batchKey),
        );
        if (!found) throw new Error(`Batch "${batchKey}" was not found.`);
        if (batchQuantity(found) == null || batchGrade(found) == null) {
          throw new Error(
            "The API did not return this batch's quantity and grade.",
          );
        }

        // A batch with no history yet answers 404; treat that as "no records".
        let history: BatchHistoryRecord[] = [];
        try {
          history = await historyApi.byBatch(batchUuid(found));
        } catch (cause) {
          if (!(cause instanceof ApiError && cause.isNotFound)) throw cause;
        }
        if (cancelled) return;

        const matching = history.filter(
          (record) =>
            normalize(record.batch_id) === normalize(batchUuid(found)),
        );
        const nextStage =
          stages.find(
            (stage) =>
              !matching.some(
                (record) => Number(record.current_stage_id) === stage.stage_id,
              ),
          ) ?? stages[stages.length - 1];

        setBatch(found);
        activeBatchIdRef.current = batchUuid(found);
        setRecords(matching);
        setAssayFile(null);
        // Populate the saved measurements for this stage before showing the form,
        // so an edit never starts from zeros.
        const nextStageRecord = matching.find(
          (r) => Number(r.current_stage_id) === nextStage.stage_id,
        );
        reset(valuesFor(String(nextStage.stage_id), nextStageRecord));
      } catch (cause) {
        if (!cancelled) {
          setBatch(null);
          setRecords([]);
          setError(
            `Could not load the batch: ${cause instanceof Error ? cause.message : "Request failed"}`,
          );
        }
      } finally {
        if (!cancelled) setBatchLoading(false);
      }
    }

    void loadSelected();
    return () => {
      cancelled = true;
    };
  }, [ready, batchKey, batches, stages, reset]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getMe();
        if (res.ok) {
          const me = await res.json();
          if (!cancelled) setRecordedBy(String(me.user_id ?? me.id ?? ""));
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the saved values (or a blank form) whenever the stage changes or its
  // saved record changes.
  useEffect(() => {
    if (!stageId) return;
    reset(valuesFor(stageId, existingRecord));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAssayFile(null);
  }, [stageId, existingRecord, reset]);

  const selectStage = (stage: ProcessingStage) => {
    if (savingRef.current) return; // never change stage mid-save
    setValue("stage_id", String(stage.stage_id));
    setError("");
    setSuccess("");
  };

  const addNextStage = () => {
    if (!selectedStage) return;
    if (!isComplete(selectedStage.stage_id)) {
      setError(
        `Save ${selectedStage.stage_name} before adding the next stage.`,
      );
      return;
    }
    const next = stages[selectedIndex + 1];
    if (!next) {
      setError("");
      setSuccess("All four processing stages are complete.");
      return;
    }
    selectStage(next);
    setSuccess(`${next.stage_name} selected.`);
  };

  const cancelChanges = () => {
    if (savingRef.current) return;
    reset(valuesFor(stageId, existingRecord));
    setAssayFile(null);
    setError("");
    setSuccess("");
  };

  // Only runs once every field passes validation.
  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (savingRef.current) return;
    setError("");
    setSuccess("");

    if (!batch) {
      setError("Select a batch first.");
      return;
    }
    if (!selectedStage || !feed) {
      setError(
        `Save ${previousStage?.stage_name ?? "the previous stage"} first.`,
      );
      return;
    }
    if (!recordedBy) {
      setError(
        "Could not identify the signed-in user. Sign in again and retry.",
      );
      return;
    }

    const outputQuantity = Number(values.output_quantity_tonnes);
    const outputGrade = Number(values.output_grade) / 100;
    const recovery = Number(values.recovery) / 100;
    const moisture = Number(values.moisture) / 100;

    savingRef.current = true;
    const savedBatchId = batchUuid(batch);
    try {
      const historyId = existingRecord?.history_id;

      // Fields shared by create and update (BatchHistoryUpdate has no ids).
      // Built from the values at submit time; the form is locked while the
      // request runs, so what the user sees is what gets saved.
      const stageFields = {
        occurred_at: new Date(values.occurred_at).toISOString(),
        feed_quantity_tonnes: feed.quantity,
        feed_grade: feed.grade,
        quantity_tonnes: outputQuantity,
        grade: outputGrade,
        output_quantity_tonnes: outputQuantity,
        output_grade: outputGrade,
        recovery,
        moisture,
      };

      const payload = historyId
        ? stageFields
        : {
            batch_id: savedBatchId,
            current_stage_id: selectedStage.stage_id,
            recorded_by: recordedBy,
            ...stageFields,
          };

      // CHANGED: send each field as its own form field (what the backend expects)
      const body = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          body.append(key, String(value));
        }
      });
      if (assayFile) body.append("assay_file", assayFile);

      const saved = historyId
        ? await historyApi.update(historyId, body)
        : await historyApi.create(body);

      if (activeBatchIdRef.current !== savedBatchId) return;

      setRecords((current) => [
        ...current.filter((item) => item.history_id !== saved.history_id),
        saved,
      ]);
      setAssayFile(null);
      setSuccess(
        historyId
          ? `${selectedStage.stage_name} updated.`
          : `${selectedStage.stage_name} saved.`,
      );
    } catch (cause) {
      if (activeBatchIdRef.current !== savedBatchId) return;
      setError(
        `Could not save stage: ${cause instanceof Error ? cause.message : "Request failed"}`,
      );
    } finally {
      savingRef.current = false;
    }
  };

  return (
    <section className={styles.page}>
      <h1 className={styles.title}>
        Record Batch Stage
        {batch?.batch_code && (
          <span className={styles.batchTag}>{batch.batch_code}</span>
        )}
      </h1>

      {error && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          <span>{error}</span>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}
      {success && (
        <div className={`${styles.alert} ${styles.alertSuccess}`} role="status">
          <span>{success}</span>
        </div>
      )}

      {!batchParam && (
        <label className={`${styles.field} ${styles.batchPicker}`}>
          <span>Batch *</span>
          <select
            value={batch ? batchUuid(batch) : ""}
            onChange={(event) => {
              setBatchKey(event.target.value);
              setError("");
              setSuccess("");
            }}
            disabled={!ready || batchLoading || saving}
          >
            <option value="">
              {ready ? "Select a batch" : "Loading batches…"}
            </option>
            {batches.map((item) => (
              <option key={batchUuid(item)} value={batchUuid(item)}>
                {item.batch_code ?? batchUuid(item)}
              </option>
            ))}
          </select>
        </label>
      )}

      <ol className={styles.progress} aria-label="Stage progress">
        {WORKFLOW.map((name, index) => {
          const stage = stages.find(
            (item) => normalize(item.stage_name) === normalize(name),
          );
          const complete = stage ? isComplete(stage.stage_id) : false;
          const active = stage ? String(stage.stage_id) === stageId : false;
          return (
            <li key={name}>
              <button
                type="button"
                className={`${styles.dot} ${complete ? styles.dotComplete : ""} ${
                  active ? styles.dotActive : ""
                }`}
                aria-label={`${name}${complete ? " (saved)" : ""}`}
                aria-current={active ? "step" : undefined}
                title={name}
                disabled={!stage || saving}
                onClick={() => stage && selectStage(stage)}
              >
                {complete ? "✓" : index + 1}
              </button>
            </li>
          );
        })}
      </ol>

      {/* noValidate: React Hook Form owns validation and the error messages */}
      <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} noValidate>
        {/* Locks every input while a save is in flight so edits can't be
            made that wouldn't be part of the saved record. */}
        <fieldset
          disabled={saving}
          style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}
        >
          <div className={styles.formBox}>
            {editing && (
              <p className={styles.note}>
                This stage is already saved. Saving will update it.
              </p>
            )}

            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Stage *</span>
                <select
                  value={stageId}
                  onChange={(event) => {
                    const stage = stages.find(
                      (item) => String(item.stage_id) === event.target.value,
                    );
                    if (stage) selectStage(stage);
                  }}
                >
                  <option value="">Select stage</option>
                  {stages.map((stage) => (
                    <option key={stage.stage_id} value={String(stage.stage_id)}>
                      {stage.stage_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.field}>
                <span>Date and time *</span>
                <input
                  type="datetime-local"
                  aria-invalid={!!errors.occurred_at}
                  {...register("occurred_at", {
                    required: "Select a date and time.",
                  })}
                />
                <FieldError message={errors.occurred_at?.message} />
              </label>

              <label className={styles.field}>
                <span>Feed quantity (tonnes) *</span>
                <input
                  type="number"
                  value={feed ? String(feed.quantity) : ""}
                  readOnly
                  aria-readonly="true"
                />
              </label>

              <label className={styles.field}>
                <span>Feed grade (% Cu) *</span>
                <input
                  type="number"
                  value={feed ? toPercent(feed.grade) : ""}
                  readOnly
                  aria-readonly="true"
                />
              </label>

              {batch && selectedIndex > 0 && !feed && (
                <div
                  className={`${styles.alert} ${styles.alertError} ${styles.wide}`}
                >
                  Save {previousStage?.stage_name ?? "the previous stage"}{" "}
                  first.
                </div>
              )}

              <label className={styles.field}>
                <span>Output quantity (tonnes) *</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  aria-invalid={!!errors.output_quantity_tonnes}
                  {...register("output_quantity_tonnes", quantityRules)}
                />
                <FieldError message={errors.output_quantity_tonnes?.message} />
              </label>

              <label className={styles.field}>
                <span>Output grade (% Cu) *</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  aria-invalid={!!errors.output_grade}
                  {...register("output_grade", percentRules("Output grade"))}
                />
                <FieldError message={errors.output_grade?.message} />
              </label>

              <label className={styles.field}>
                <span>Recovery (%) *</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  aria-invalid={!!errors.recovery}
                  {...register("recovery", percentRules("Recovery"))}
                />
                <FieldError message={errors.recovery?.message} />
              </label>

              <label className={styles.field}>
                <span>Moisture (%) *</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  aria-invalid={!!errors.moisture}
                  {...register("moisture", percentRules("Moisture"))}
                />
                <FieldError message={errors.moisture?.message} />
              </label>

              <label className={`${styles.field} ${styles.wide}`}>
                <span>Attach assay document</span>
                <input
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
                  onChange={(event) =>
                    setAssayFile(event.target.files?.[0] ?? null)
                  }
                />
                {!assayFile && existingRecord?.assay_document_url && (
                  <small>A document is already attached to this stage.</small>
                )}
              </label>
            </div>
          </div>
        </fieldset>

        <div className={styles.actions}>
          <button
            className={`${styles.button} ${styles.buttonSave}`}
            type="submit"
            disabled={
              saving || batchLoading || !batch || !feed || !selectedStage
            }
          >
            {saving ? "Saving…" : editing ? "Update" : "Save"}
          </button>
          <button
            className={`${styles.button} ${styles.buttonNext}`}
            type="button"
            onClick={addNextStage}
            disabled={
              saving ||
              !selectedStage ||
              !editing ||
              selectedIndex >= stages.length - 1
            }
          >
            Add next stage
          </button>
          <button
            className={`${styles.button} ${styles.buttonCancel}`}
            type="button"
            onClick={cancelChanges}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

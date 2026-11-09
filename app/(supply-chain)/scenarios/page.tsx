"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { lookupApi, scenariosApi, stagesApi } from "@/lib/api/endpoints";
import type { Scenario, ScenarioResult } from "@/lib/api/types";
import { toNumber } from "@/lib/format";
import "./scenarios.css";

interface Stage {
  stage_id: number;
  stage_name: string;
}

interface Base {
  calculationId: string;
  quantity: number;
  grade: number;
  recovery: number;
  price: number;
  value: number;
  priceUnit: string;
  currency: string;
  stageId: number;
  calculatedOn: string | null;
  approximate: boolean;
  missing: boolean;
}

interface Form {
  name: string;
  quantity: number;
  grade: number;
  recovery: number;
  price: number;
  stageId: number;
}

type Selection = "baseline" | "draft" | string;

interface LoadedData {
  batchId: string;
  batchCode: string;
  base: Base;
  scenarios: Scenario[];
  stages: Stage[];
  latest: Record<string, ScenarioResult | null>;
}

const MAX_SCENARIOS = 3;
const LETTERS = ["A", "B", "C"];

const rec = (o: object) => o as Record<string, unknown>;

const asNum = (v: unknown): number | null => {
  const n =
    typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const asStr = (v: unknown): string | null =>
  typeof v === "string" && v ? v : null;

const roundTo = (n: number, step: number) => Math.round(n / step) * step;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

const money = (n: number, currency: string) =>
  `${currency === "USD" ? "US$" : `${currency} `}${Math.round(n).toLocaleString("en-US")}`;

const span = (lo: number, hi: number): [number, number] =>
  hi > lo ? [lo, hi] : [lo, lo + 1];

const scenarioStageId = (s: Scenario) => asNum(rec(s).assumed_stage_id) ?? 0;

const fromScenario = (s: Scenario): Form => ({
  name: s.scenario_name,
  quantity: toNumber(s.assumed_quantity) ?? 0,
  grade: round6((toNumber(s.assumed_grade) ?? 0) * 100),
  recovery: round6((toNumber(s.assumed_recovery) ?? 0) * 100),
  price: toNumber(s.assumed_price) ?? 0,
  stageId: scenarioStageId(s),
});

const fromBase = (b: Base): Form => ({
  name: "Baseline",
  quantity: b.quantity,
  grade: b.grade,
  recovery: b.recovery,
  price: b.price,
  stageId: b.stageId,
});

const sameForm = (a: Form, b: Form) =>
  a.name === b.name &&
  a.quantity === b.quantity &&
  a.grade === b.grade &&
  a.recovery === b.recovery &&
  a.price === b.price &&
  a.stageId === b.stageId;

function changeSummary(s: Scenario, b: Base): string {
  const f = fromScenario(s);
  const base = fromBase(b);
  if (f.grade !== base.grade) return `Grade ${f.grade.toFixed(1)}%`;
  if (f.price !== base.price) return `Price ${money(f.price, b.currency)}`;
  if (f.recovery !== base.recovery) return `Recovery ${f.recovery.toFixed(1)}%`;
  if (f.quantity !== base.quantity) return `Quantity ${f.quantity}t`;
  return "Same as baseline";
}

function NumberField(props: {
  value: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <input
      className="sw-input"
      aria-label={props.label}
      disabled={props.disabled}
      inputMode="decimal"
      value={editing ?? props.format(props.value)}
      onFocus={() => setEditing(String(props.value))}
      onChange={(e) => {
        setEditing(e.target.value);
        const n = parseFloat(e.target.value.replace(/[^0-9.\-]/g, ""));
        if (Number.isFinite(n)) props.onChange(n);
      }}
      onBlur={() => setEditing(null)}
    />
  );
}

function SliderField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  baseline: number;
  format: (n: number) => string;
  edge: (n: number) => string;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const { min, max, value } = props;
  const clamped = Math.min(max, Math.max(min, value));
  const fill = max > min ? ((clamped - min) / (max - min)) * 100 : 0;
  return (
    <div className="sw-field">
      <label className="sw-label">{props.label}</label>
      <NumberField
        label={props.label}
        value={value}
        format={props.format}
        onChange={props.onChange}
        disabled={props.disabled}
      />
      <input
        type="range"
        className="sw-slider"
        aria-label={`${props.label} slider`}
        min={min}
        max={max}
        step={props.step}
        value={clamped}
        disabled={props.disabled}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <div className="sw-range">
        <span>
          {props.edge(min)}
          <small>Baseline: {props.edge(props.baseline)}</small>
        </span>
        <span>{props.edge(max)}</span>
      </div>
    </div>
  );
}

function Workspace({ data, reload }: { data: LoadedData; reload: () => void }) {
  const router = useRouter();
  const { batchId, batchCode, base, scenarios, stages, latest } = data;

  const baseForm = fromBase(base);

  // Open ready to work: a new editable draft when the batch has no scenarios,
  // otherwise the first saved scenario. Only a batch with no baseline yet
  // starts on the locked baseline card.
  const firstScenario = scenarios[0];
  const startDraft: Form | null =
    !base.missing && scenarios.length === 0
      ? { ...baseForm, name: "New scenario" }
      : null;
  const startSelected: Selection = startDraft
    ? "draft"
    : !base.missing && firstScenario
      ? firstScenario.scenario_id
      : "baseline";
  const startForm: Form =
    startDraft ??
    (startSelected !== "baseline" && firstScenario
      ? fromScenario(firstScenario)
      : baseForm);

  const [selected, setSelected] = useState<Selection>(startSelected);
  const [draft, setDraft] = useState<Form | null>(startDraft);
  const [draftSavedId, setDraftSavedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Form>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [baselineError, setBaselineError] = useState<string | null>(null);

  const {
    register,
    control,
    watch,
    reset,
    getValues,
    clearErrors,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ defaultValues: startForm });

  // eslint-disable-next-line react-hooks/incompatible-library
  const current = watch();
  const watchedName = current.name;
  const watchedStageId = current.stageId;

  const stageName = (id: number) =>
    stages.find((s) => s.stage_id === id)?.stage_name ??
    (id ? `Stage ${id}` : "");

  const ranges = {
    quantity: span(
      0,
      baseForm.quantity > 0 ? roundTo(baseForm.quantity * 3, 10) : 10000,
    ),
    grade: span(0, 100),
    recovery: span(0, 100),
    price: span(
      100,
      baseForm.price > 0 ? roundTo(baseForm.price * 3, 500) : 20000,
    ),
  };

  const isBaseline = selected === "baseline";
  const locked = isBaseline || busy;

  const selectedScenario = scenarios.find((s) => s.scenario_id === selected);
  const selIndex =
    selected === "draft"
      ? scenarios.length
      : scenarios.findIndex((s) => s.scenario_id === selected);
  const selLetter =
    selIndex >= 0 ? (LETTERS[selIndex] ?? String(selIndex + 1)) : "";

  const isModified =
    !!selectedScenario && !sameForm(current, fromScenario(selectedScenario));
  const dirty = selected === "draft" || isModified;
  const hasResult =
    !!selectedScenario && !!latest[selectedScenario.scenario_id];
  const slots = scenarios.length + (draft ? 1 : 0);

  const validationMessage = Object.values(errors).find(
    (e) => e?.message,
  )?.message;
  const shownError = serverError ?? validationMessage ?? null;

  function savedFor(sel: Selection): Form {
    if (sel === "baseline") return baseForm;
    const s = scenarios.find((x) => x.scenario_id === sel);
    return s ? fromScenario(s) : baseForm;
  }

  function hasUnsavedEdits(id: string) {
    return id === selected ? isModified : !!edits[id];
  }

  function stashCurrent() {
    const values = getValues();
    if (selected === "draft") {
      setDraft(values);
    } else if (selected !== "baseline") {
      const key = selected;
      setEdits((prev) => {
        const next = { ...prev };
        if (sameForm(values, savedFor(key))) delete next[key];
        else next[key] = values;
        return next;
      });
    }
  }

  function select(sel: Selection) {
    if (sel === selected || busy) return;
    setServerError(null);
    clearErrors();
    stashCurrent();
    setSelected(sel);

    if (sel === "baseline") reset(baseForm);
    else if (sel === "draft") reset(draft ?? baseForm);
    else reset(edits[sel] ?? savedFor(sel));
  }

  function cloneBaseline() {
    if (slots >= MAX_SCENARIOS || draft || busy || base.missing) return;
    stashCurrent();
    const d = { ...baseForm, name: "New scenario" };
    setDraft(d);
    setDraftSavedId(null);
    setSelected("draft");
    reset(d);
    clearErrors();
    setServerError(null);
  }

  function openResults(scenarioId: string) {
    router.push(`/scenarios/${scenarioId}`);
  }

  async function createBaseline() {
    if (creating) return;
    setCreating(true);
    setBaselineError(null);
    try {
      await lookupApi.createBaseline(batchId);
      reload();
    } catch (e) {
      setBaselineError((e as Error).message);
      setCreating(false);
    }
  }

  // Create the baseline automatically the first time a batch without one is
  // opened. If it fails, the button stays available as "Try again".
  const autoTried = useRef(false);
  useEffect(() => {
    if (base.missing && !autoTried.current) {
      autoTried.current = true;
      void createBaseline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(values: Form) {
    if (busy || isBaseline || base.missing) return;
    if (selected !== "draft" && !selectedScenario) return;

    const body = {
      scenario_name: values.name.trim(),
      assumed_quantity: values.quantity,
      assumed_grade: round6(values.grade / 100),
      assumed_recovery: round6(values.recovery / 100),
      assumed_price: values.price,
      assumed_stage_id: values.stageId,
      price_unit: base.priceUnit,
      currency: base.currency,
    };

    setBusy(true);
    setServerError(null);
    try {
      let scenarioId: string;
      if (selected === "draft") {
        if (draftSavedId) {
          const updated = await scenariosApi.update(draftSavedId, body);
          scenarioId = updated.scenario_id;
        } else {
          const created = await scenariosApi.create({
            ...body,
            batch_id: batchId,
            baseline_calculation_id: base.calculationId,
          });
          setDraftSavedId(created.scenario_id);
          scenarioId = created.scenario_id;
        }
      } else if (selectedScenario && isModified) {
        const updated = await scenariosApi.update(
          selectedScenario.scenario_id,
          body,
        );
        scenarioId = updated.scenario_id;
      } else if (selectedScenario) {
        scenarioId = selectedScenario.scenario_id;
      } else {
        setBusy(false);
        return;
      }
      await scenariosApi.execute(scenarioId);
      openResults(scenarioId);
    } catch (e) {
      setServerError((e as Error).message);
      setBusy(false);
    }
  }

  const cards: { id: Selection; title: string; sub: string; status: string }[] =
    [
      {
        id: "baseline",
        title: "Baseline",
        sub: base.missing
          ? "No baseline calculation yet"
          : `${stageName(base.stageId) || "Stage"} · ${money(base.value, base.currency)}`,
        status: "LOCKED",
      },
      ...scenarios.map((s, i) => ({
        id: s.scenario_id,
        title: `${LETTERS[i] ?? i + 1} · ${
          s.scenario_id === selected
            ? watchedName || s.scenario_name
            : (edits[s.scenario_id]?.name ?? s.scenario_name)
        }`,
        sub: hasUnsavedEdits(s.scenario_id)
          ? "Unsaved edits"
          : changeSummary(s, base),
        status: latest[s.scenario_id] ? "RAN" : "NOT RUN",
      })),
    ];
  if (draft)
    cards.push({
      id: "draft",
      title: `${LETTERS[scenarios.length] ?? scenarios.length + 1} · ${
        selected === "draft" ? watchedName : draft.name
      }`,
      sub: draftSavedId ? "Saved, not run" : "Unsaved",
      status: "NOT RUN",
    });

  const baselineLabel = base.missing
    ? `${batchCode} - no baseline calculation yet`
    : [
        batchCode,
        stageName(base.stageId).toLowerCase(),
        base.calculatedOn
          ? new Date(base.calculatedOn).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "",
      ]
        .filter(Boolean)
        .join(" - ");

  return (
    <div className="sw-app">
      <header className="sw-header">
        <div>
          <h1>{batchCode} : Scenario workspace</h1>
          <p>
            Type a value or drag its slider. Baseline data is never changed.
          </p>
        </div>
        <button
          type="button"
          className="sw-clone"
          onClick={cloneBaseline}
          disabled={slots >= MAX_SCENARIOS || !!draft || busy || base.missing}
        >
          + Clone baseline
        </button>
      </header>

      {base.missing && (
        <div className="sw-banner" role="status">
          <p style={{ margin: 0 }}>
            {creating
              ? "Setting up the baseline from the batch’s latest recorded stage…"
              : "This batch has no saved baseline calculation yet. Create one from the batch’s latest recorded stage to run scenarios."}
          </p>
          {!creating && (
            <button
              type="button"
              className="sw-run"
              style={{ marginTop: 8 }}
              onClick={createBaseline}
            >
              {baselineError ? "Try again" : "Create baseline"}
            </button>
          )}
          {baselineError && (
            <p className="sw-error" role="alert">
              {baselineError}
            </p>
          )}
        </div>
      )}

      {base.approximate && (
        <p className="sw-banner" role="status">
          The baseline calculation couldn’t be loaded, so the first scenario’s
          values are shown as the starting point.
        </p>
      )}

      <div className="sw-body">
        <section className="sw-list" aria-label="Scenarios">
          {cards.map((c) => (
            <button
              type="button"
              key={c.id}
              className={`sw-card ${selected === c.id ? "is-selected" : ""}`}
              disabled={busy}
              onClick={() => select(c.id)}
            >
              <strong>{c.title}</strong>
              <span className="sw-card-sub">{c.sub}</span>
              <span
                className={`sw-card-status ${c.status === "RAN" ? "is-ran" : ""}`}
              >
                {c.status}
              </span>
            </button>
          ))}
          <p className="sw-hint">Up to three scenarios per baseline.</p>
        </section>

        <section className="sw-panel" aria-label="Scenario configuration">
          <h2>
            Configure{" "}
            {isBaseline
              ? "Baseline"
              : `${selLetter} - ${watchedName || "scenario"}`}
          </h2>

          <div className="sw-field">
            <label className="sw-label" htmlFor="sw-name">
              Scenario name
            </label>
            <input
              id="sw-name"
              className="sw-input"
              disabled={locked}
              {...register("name", {
                validate: (v) => v.trim() !== "" || "Give the scenario a name.",
              })}
            />
          </div>

          <div className="sw-field">
            <label className="sw-label">Baseline calculation</label>
            <input className="sw-input" readOnly value={baselineLabel} />
          </div>

          <div className="sw-grid">
            <Controller
              name="quantity"
              control={control}
              rules={{
                validate: (v) => v >= 0 || "Quantity cannot be negative.",
              }}
              render={({ field }) => (
                <SliderField
                  label="Quantity"
                  value={field.value}
                  min={ranges.quantity[0]}
                  max={ranges.quantity[1]}
                  step={0.1}
                  baseline={baseForm.quantity}
                  format={(n) => `${n}t`}
                  edge={(n) => `${n}t`}
                  onChange={field.onChange}
                  disabled={locked}
                />
              )}
            />
            <Controller
              name="grade"
              control={control}
              rules={{
                validate: (v) =>
                  (v >= 0 && v <= 100) || "Grade must be between 0% and 100%.",
              }}
              render={({ field }) => (
                <SliderField
                  label="Grade"
                  value={field.value}
                  min={ranges.grade[0]}
                  max={ranges.grade[1]}
                  step={0.5}
                  baseline={baseForm.grade}
                  format={(n) => `${n}%`}
                  edge={(n) => `${Math.round(n * 10) / 10}%`}
                  onChange={field.onChange}
                  disabled={locked}
                />
              )}
            />
            <Controller
              name="recovery"
              control={control}
              rules={{
                validate: (v) =>
                  (v >= 0 && v <= 100) ||
                  "Recovery must be between 0% and 100%.",
              }}
              render={({ field }) => (
                <SliderField
                  label="Recovery(%)"
                  value={field.value}
                  min={ranges.recovery[0]}
                  max={ranges.recovery[1]}
                  step={0.5}
                  baseline={baseForm.recovery}
                  format={(n) => `${n}%`}
                  edge={(n) => `${Math.round(n * 10) / 10}%`}
                  onChange={field.onChange}
                  disabled={locked}
                />
              )}
            />
            <Controller
              name="price"
              control={control}
              rules={{
                validate: (v) => v > 0 || "Price must be greater than zero.",
              }}
              render={({ field }) => (
                <SliderField
                  label="Reference price (US $/t)"
                  value={field.value}
                  min={ranges.price[0]}
                  max={ranges.price[1]}
                  step={100}
                  baseline={baseForm.price}
                  format={(n) => n.toLocaleString("en-US")}
                  edge={(n) => Math.round(n).toLocaleString("en-US")}
                  onChange={field.onChange}
                  disabled={locked}
                />
              )}
            />
          </div>

          <div className="sw-field">
            <label className="sw-label" htmlFor="sw-stage">
              Processing stage
            </label>
            <Controller
              name="stageId"
              control={control}
              render={({ field }) => (
                <select
                  id="sw-stage"
                  className="sw-input"
                  value={field.value}
                  disabled={locked}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                >
                  {!stages.some((s) => s.stage_id === watchedStageId) && (
                    <option value={watchedStageId}>
                      {stageName(watchedStageId) || "Current stage"}
                    </option>
                  )}
                  {stages.map((s) => (
                    <option key={s.stage_id} value={s.stage_id}>
                      {s.stage_name}
                    </option>
                  ))}
                </select>
              )}
            />
          </div>

          {shownError && (
            <p className="sw-error" role="alert">
              {shownError}
            </p>
          )}

          {!isBaseline && (
            <div className="sw-actions">
              <button
                type="button"
                className="sw-run"
                onClick={handleSubmit(run)}
                disabled={busy || base.missing}
              >
                {busy ? "Running…" : "Run Scenario"}
              </button>
              {selectedScenario && hasResult && !dirty && (
                <button
                  type="button"
                  className="sw-view"
                  disabled={busy}
                  onClick={() => openResults(selectedScenario.scenario_id)}
                >
                  View result
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Loader() {
  const router = useRouter();
  const params = useSearchParams();
  const batchParam = params.get("batch") ?? "";
  const baselineParam = params.get("baseline") ?? "";

  const batchList = useApi("scenario-batches", async (signal) => {
    const list = await lookupApi.batches({ signal }).catch(() => null);
    return list ?? [];
  });
  const batches = useMemo(() => batchList.data ?? [], [batchList.data]);

  const { data, error, loading, reload } = useApi(
    `workspace:${batchParam}:${baselineParam}`,
    async (signal): Promise<LoadedData | null> => {
      const all = await scenariosApi.list({}, { signal });
      const batchId = batchParam || all[0]?.batch_id || "";
      if (!batchId) return null;
      const scenarios = all.filter((s) => s.batch_id === batchId);

      const [batchRows, calcs, stageList, entries] = await Promise.all([
        lookupApi.batches({ signal }).catch(() => null),
        lookupApi.batchValues(batchId, { signal }).catch(() => null),
        stagesApi.list({ signal }).catch(() => []),
        Promise.all(
          scenarios.map(async (s) => {
            try {
              const r = await scenariosApi.results(s.scenario_id, { signal });
              return [
                s.scenario_id,
                r.length ? r[r.length - 1] : null,
              ] as const;
            } catch (e) {
              if (signal.aborted) throw e;
              return [s.scenario_id, null] as const;
            }
          }),
        ),
      ]);

      const latest: Record<string, ScenarioResult | null> =
        Object.fromEntries(entries);
      const batchRow = batchRows?.find((b) => b.batch_id === batchId);
      const batchCode = batchRow?.batch_code ?? `${batchId.slice(0, 8)}…`;

      const stages: Stage[] = stageList.map((s) => ({
        stage_id: s.stage_id,
        stage_name: s.stage_name,
      }));
      scenarios.forEach((s) => {
        const id = scenarioStageId(s);
        if (id && !stages.some((x) => x.stage_id === id)) {
          stages.push({
            stage_id: id,
            stage_name: asStr(rec(s).assumed_stage_name) ?? `Stage ${id}`,
          });
        }
      });

      const wantedId = baselineParam || scenarios[0]?.baseline_calculation_id;
      const calc =
        calcs?.find((c) => c.calculation_id === wantedId) ?? calcs?.[0];
      const first = scenarios[0];

      let base: Base;
      if (calc) {
        const stageId =
          asNum(rec(calc).stage_id) ??
          (first ? scenarioStageId(first) : (stages[0]?.stage_id ?? 0));
        const stageNameFromCalc = asStr(rec(calc).stage_name);
        if (
          stageId &&
          stageNameFromCalc &&
          !stages.some((x) => x.stage_id === stageId)
        ) {
          stages.push({ stage_id: stageId, stage_name: stageNameFromCalc });
        }
        base = {
          calculationId: calc.calculation_id,
          quantity: toNumber(calc.quantity) ?? 0,
          grade: round6((toNumber(calc.grade) ?? 0) * 100),
          recovery: round6(
            ((calc.recovery != null ? toNumber(calc.recovery) : 1) ?? 1) * 100,
          ),
          price: toNumber(calc.reference_price) ?? 0,
          value: toNumber(calc.calculated_value) ?? 0,
          priceUnit: calc.price_unit,
          currency: asStr(rec(calc).currency) ?? first?.currency ?? "USD",
          stageId,
          calculatedOn:
            asStr(rec(calc).calculated_at) ??
            asStr(rec(calc).calculated_on) ??
            asStr(rec(calc).price_date),
          approximate: false,
          missing: false,
        };
      } else if (first) {
        const f = fromScenario(first);
        const r = latest[first.scenario_id];
        base = {
          calculationId: first.baseline_calculation_id,
          quantity: f.quantity,
          grade: f.grade,
          recovery: f.recovery,
          price: f.price,
          value: r ? (toNumber(r.baseline_value) ?? 0) : 0,
          priceUnit: first.price_unit,
          currency: first.currency,
          stageId: f.stageId,
          calculatedOn: null,
          approximate: true,
          missing: false,
        };
      } else {
        const row = batchRow ? rec(batchRow) : {};
        base = {
          calculationId: "",
          quantity: asNum(row.quantity_tonnes) ?? 0,
          grade: round6((asNum(row.grade) ?? 0) * 100),
          recovery: round6((asNum(row.recovery) ?? 1) * 100),
          price: 0,
          value: 0,
          priceUnit: "USD/tonne",
          currency: "USD",
          stageId: asNum(row.stage_id) ?? stages[0]?.stage_id ?? 0,
          calculatedOn: null,
          approximate: false,
          missing: true,
        };
      }

      return { batchId, batchCode, base, scenarios, stages, latest };
    },
  );

  // The batch that is open: URL first, then the loaded one, then the first
  // batch in the list. This is never empty once batches have loaded.
  const selectedId = batchParam || data?.batchId || batches[0]?.batch_id || "";

  // Open straight into a batch: if none is in the URL, pick one.
  useEffect(() => {
    if (batchParam || loading || batchList.loading) return;
    const target = data?.batchId || batches[0]?.batch_id;
    if (target) router.replace(`/scenarios?batch=${target}`);
  }, [batchParam, loading, batchList.loading, data, batches, router]);

  // Prefer the code from the batch list so the title and the dropdown agree.
  const codeFromList = batches.find(
    (b) => b.batch_id === data?.batchId,
  )?.batch_code;

  const knownSelected = batches.some((b) => b.batch_id === selectedId);

  const picker = (
    <div className="sw-field" style={{ maxWidth: 300, marginBottom: 12 }}>
      <label className="sw-label" htmlFor="sw-batch">
        Batch to simulate
      </label>
      <select
        id="sw-batch"
        className="sw-input"
        style={{ padding: "6px 10px", height: 36, fontSize: "0.9rem" }}
        value={selectedId}
        disabled={batches.length === 0 && !selectedId}
        onChange={(e) => {
          if (e.target.value)
            router.replace(`/scenarios?batch=${e.target.value}`);
        }}
      >
        {/* Only shown while nothing is available to pick. */}
        {batches.length === 0 && !selectedId && (
          <option value="">
            {batchList.loading ? "Loading batches…" : "No batches available"}
          </option>
        )}
        {/* Keeps the open batch visible even if it is missing from the list. */}
        {selectedId && !knownSelected && (
          <option value={selectedId}>
            {codeFromList ?? data?.batchCode ?? `${selectedId.slice(0, 8)}…`}
          </option>
        )}
        {batches.map((b) => (
          <option key={b.batch_id} value={b.batch_id}>
            {b.batch_code}
          </option>
        ))}
      </select>
    </div>
  );

  let content;
  if (loading) {
    content = <Spinner label="Loading scenarios…" />;
  } else if (error) {
    content = (
      <ErrorState
        error={error}
        onRetry={reload}
        title="Couldn’t load the scenario workspace"
      />
    );
  } else if (!data) {
    content =
      batches.length > 0 ? (
        <Spinner label="Opening a batch…" />
      ) : (
        <EmptyState title="No batches available">
          There are no batches to simulate yet.
        </EmptyState>
      );
  } else {
    content = (
      <Workspace
        key={`${data.batchId}:${data.base.calculationId}:${data.scenarios
          .map((s) => s.scenario_id)
          .join(",")}`}
        data={{ ...data, batchCode: codeFromList ?? data.batchCode }}
        reload={reload}
      />
    );
  }

  return (
    <>
      {picker}
      {content}
    </>
  );
}

export default function ScenariosPage() {
  return (
    <Suspense fallback={<Spinner label="Loading scenarios…" />}>
      <Loader />
    </Suspense>
  );
}

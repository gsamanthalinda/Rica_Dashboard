import { apiFetch } from "./client";
import type {
  AssessmentContext,
  BatchHistoryRecord,
  MineralBatch,
  ProcessingStage,
  ProcessingStageCreate,
  ProcessingStageUpdate,
  Scenario,
  ScenarioDecision,
  ScenarioResult,
  ValueCalculation,
} from "./types";

type Opts = { signal?: AbortSignal };

export const stagesApi = {
  list: (o?: Opts) =>
    apiFetch<ProcessingStage[]>("/processing-stages", { signal: o?.signal }),
  create: (data: ProcessingStageCreate) =>
    apiFetch<ProcessingStage>("/processing-stages", {
      method: "POST",
      json: data,
    }),
  update: (id: number, data: ProcessingStageUpdate) =>
    apiFetch<ProcessingStage>(`/processing-stages/${id}`, {
      method: "PATCH",
      json: data,
    }),
  remove: (id: number) =>
    apiFetch<void>(`/processing-stages/${id}`, { method: "DELETE" }),
};

export interface ScenarioWrite {
  scenario_name: string;
  assumed_quantity: number;
  assumed_grade: number;
  assumed_recovery: number;
  assumed_price: number;
  assumed_stage_id: number;
  price_unit: string;
  currency: string;
}

export interface ScenarioCreateBody extends ScenarioWrite {
  batch_id: string;
  baseline_calculation_id: string;
}

const unwrap = <T>(body: T | { data: T }): T =>
  body && typeof body === "object" && "data" in body
    ? (body as { data: T }).data
    : (body as T);

export const scenariosApi = {
  list: (params: { batchId?: string } = {}, o?: Opts) =>
    apiFetch<Scenario[]>(
      `/scenarios/${params.batchId ? `?batch_id=${encodeURIComponent(params.batchId)}` : ""}`,
      { signal: o?.signal },
    ),
  get: (id: string, o?: Opts) =>
    apiFetch<Scenario>(`/scenarios/${id}`, { signal: o?.signal }),
  results: (id: string, o?: Opts) =>
    apiFetch<ScenarioResult[]>(`/scenarios/${id}/results`, {
      signal: o?.signal,
    }),
  create: async (body: ScenarioCreateBody, o?: Opts) =>
    unwrap(
      await apiFetch<Scenario | { data: Scenario }>("/scenarios/", {
        method: "POST",
        json: body,
        signal: o?.signal,
      }),
    ),
  update: async (id: string, body: ScenarioWrite, o?: Opts) =>
    unwrap(
      await apiFetch<Scenario | { data: Scenario }>(
        `/scenarios/${encodeURIComponent(id)}`,
        { method: "PUT", json: body, signal: o?.signal },
      ),
    ),
  execute: (id: string, o?: Opts) =>
    apiFetch<unknown>(`/scenarios/${encodeURIComponent(id)}/execute`, {
      method: "POST",
      signal: o?.signal,
    }),
};

export const lookupApi = {
  batches: (o?: Opts) =>
    apiFetch<MineralBatch[]>("/mineral-batches", { signal: o?.signal }),
  batchValues: (batchId: string, o?: Opts) =>
    apiFetch<ValueCalculation[]>(`/values/batches/${batchId}/values`, {
      signal: o?.signal,
    }),
  createBaseline: (batchId: string, o?: Opts) =>
    apiFetch<ValueCalculation>(
      `/values/batches/${encodeURIComponent(batchId)}/calculate`,
      { method: "POST", signal: o?.signal },
    ),
};

const HISTORY_PAGE_SIZE = 500;

export const historyApi = {
  byBatch: async (batchId: string, o?: Opts): Promise<BatchHistoryRecord[]> => {
    const all: BatchHistoryRecord[] = [];
    for (let skip = 0; ; skip += HISTORY_PAGE_SIZE) {
      const page = await apiFetch<BatchHistoryRecord[]>(
        `/batch-history/batch/${encodeURIComponent(batchId)}?skip=${skip}&limit=${HISTORY_PAGE_SIZE}`,
        { signal: o?.signal },
      );
      all.push(...page);
      if (page.length < HISTORY_PAGE_SIZE) return all;
    }
  },

  create: (form: FormData) =>
    apiFetch<BatchHistoryRecord>("/batch-history/", {
      method: "POST",
      body: form,
    }),
  update: (historyId: string, form: FormData) =>
    apiFetch<BatchHistoryRecord>(`/batch-history/${historyId}`, {
      method: "PUT",
      body: form,
    }),
};

export const decisionsApi = {
  listForScenario: (scenarioId: string, o?: Opts) =>
    apiFetch<ScenarioDecision[]>(
      `/decision_support/scenario/${encodeURIComponent(scenarioId)}`,
      { signal: o?.signal },
    ),

  assess: (
    scenarioId: string,
    scenarioResultId: string,
    o?: Opts,
    context: AssessmentContext = {},
  ) =>
    apiFetch<ScenarioDecision>(
      `/decision_support/assess?scenario_id=${encodeURIComponent(scenarioId)}&scenario_result_id=${encodeURIComponent(scenarioResultId)}`,
      {
        method: "POST",
        json: { context },
        signal: o?.signal,
      },
    ),
};

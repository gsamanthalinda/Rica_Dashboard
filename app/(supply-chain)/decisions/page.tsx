"use client";

import "./decisions.css";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { EmptyState, ErrorState, PageTitle, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { decisionsApi, lookupApi, scenariosApi } from "@/lib/api/endpoints";
import type {
  AssessmentFinding,
  AssessmentOutcome,
  FindingOutcome,
  Scenario,
  ScenarioDecision,
  ScenarioResult,
} from "@/lib/api/types";
import { formatAmount, formatPercentDiff, formatSigned } from "@/lib/format";

type Tone = "ok" | "wn" | "bad";

const OUTCOME: Record<
  AssessmentOutcome,
  { label: string; tone: Tone; headline: string }
> = {
  VIABLE: {
    label: "VIABLE",
    tone: "ok",
    headline: "The scenario passes the checks.",
  },
  CONDITIONALLY_VIABLE: {
    label: "CONDITIONALLY VIABLE",
    tone: "wn",
    headline: "Potentially viable, subject to validation.",
  },
  NOT_VIABLE: {
    label: "NOT VIABLE",
    tone: "bad",
    headline: "Not recommended as it stands.",
  },
};

const UNKNOWN_OUTCOME: { label: string; tone: Tone; headline: string } = {
  label: "UNKNOWN",
  tone: "wn",
  headline: "The assessment returned an unexpected result.",
};

const ACTION: Record<ScenarioDecision["recommendation"], string> = {
  PROCEED: "Proceed",
  PROCEED_AFTER_VALIDATION: "Validate, then proceed",
  REVISE_SCENARIO: "Revise scenario",
};

const FINDING: Record<FindingOutcome, { label: string; tone: string }> = {
  PASS: { label: "Pass", tone: "ok" },
  WARNING: { label: "Warning", tone: "wn" },
  FAIL: { label: "Fail", tone: "bad" },
  NOT_ASSESSED: { label: "Not assessed", tone: "na" },
};

const RANK: Record<FindingOutcome, number> = {
  FAIL: 0,
  WARNING: 1,
  NOT_ASSESSED: 2,
  PASS: 3,
};

const RULE_LABEL: Record<string, string> = {
  INCREMENTAL_VALUE: "Value vs baseline",
  BASELINE_PRICE_AGE: "Baseline price age",
  PRICE_VS_BAND: "Price vs LME range",
  PRICE_VS_BASELINE: "Price vs baseline",
  RECOVERY_VS_BASELINE: "Recovery vs baseline",
  QUANTITY_VS_BASELINE: "Quantity vs baseline",
  GRADE_VS_BENCHMARK: "Grade vs benchmark",
  RECOVERY_VS_BENCHMARK: "Recovery vs benchmark",
  UPLIFT_PLAUSIBILITY: "Value uplift",
  STAGE_MAPPING: "Processing stage",
  CALC_RECONCILIATION: "Calculation check",
  PRICE_COVERS_INDUSTRY_COST: "Price vs industry cost",
  MARKET_RESILIENCE: "Downside price",
};

const INFORMATIONAL = new Set(["ROYALTY_BURDEN", "CONCENTRATE_EXPORT_DUTY"]);

const labelOf = (code: string) =>
  RULE_LABEL[code] ??
  code
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

/** Turns "viable", "Conditionally Viable", "not-viable" into VIABLE etc. */
function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function resultIdOf(result: ScenarioResult): string {
  const o = result as unknown as Record<string, unknown>;
  return String(
    o.results_id ?? o.scenario_result_id ?? o.result_id ?? o.id ?? "",
  );
}
interface Detail {
  latest: ScenarioResult | null;
  decision: ScenarioDecision | null;
}

export default function DecisionsPage() {
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <DecisionsView />
    </Suspense>
  );
}

function DecisionsView() {
  const params = useSearchParams();
  const [batchPick, setBatchPick] = useState<string | null>(
    params.get("batch"),
  );
  const [scenarioPick, setScenarioPick] = useState<string | null>(
    params.get("scenario"),
  );

  // Optional: only used for the batch dropdown and the title code.
  // The page must keep working if this call fails (e.g. 403).
  const batches = useApi("decisions:batches", (s) =>
    lookupApi.batches({ signal: s }),
  );

  // The picked scenario carries its own batch_id, so we don't need the
  // batches list to know which batch we're in.
  const picked = useApi<Scenario | null>(
    `decisions:scenario:${scenarioPick ?? ""}`,
    async (s) =>
      scenarioPick ? scenariosApi.get(scenarioPick, { signal: s }) : null,
  );

  const waitingForScenario = !batchPick && !!scenarioPick && picked.loading;
  const batchId =
    batchPick ??
    (waitingForScenario
      ? ""
      : (picked.data?.batch_id ?? batches.data?.[0]?.batch_id ?? ""));

  // With no batch known (batches lookup failed, no scenario in the URL),
  // fall back to listing every scenario so the user can still pick one.
  const loadAll = !batchId && !batches.loading && !picked.loading;

  const scenarios = useApi(
    `decisions:scenarios:${batchId || (loadAll ? "all" : "wait")}`,
    async (s) => {
      if (batchId) return scenariosApi.list({ batchId }, { signal: s });
      if (loadAll) return scenariosApi.list({}, { signal: s });
      return [];
    },
  );
  const scenario: Scenario | undefined =
    scenarios.data?.find((x) => x.scenario_id === scenarioPick) ??
    scenarios.data?.[0];
  const scenarioId = scenario?.scenario_id ?? "";

  const detail = useApi<Detail>(`decisions:detail:${scenarioId}`, async (s) => {
    if (!scenarioId) return { latest: null, decision: null };
    const results = await scenariosApi.results(scenarioId, { signal: s });
    const latest = results.length ? results[results.length - 1] : null;
    if (!latest) return { latest: null, decision: null };

    const resultId = resultIdOf(latest);
    const saved = await decisionsApi
      .listForScenario(scenarioId, { signal: s })
      .catch((): ScenarioDecision[] => []);
    const existing = saved.find((d) => d.scenario_result_id === resultId);
    const decision =
      existing ??
      (await decisionsApi.assess(scenarioId, resultId, { signal: s }));
    return { latest, decision };
  });

  const batchCode =
    batches.data?.find((b) => b.batch_id === batchId)?.batch_code ?? "";

  return (
    <div className="dc-app" aria-busy={detail.refreshing}>
      <PageTitle sub="Our advice on whether each scenario stands a chance, against the baseline.">
        {batchCode ? `${batchCode} : Decision` : "Decision"}
      </PageTitle>

      <div className="dc-toolbar">
        {batches.data && batches.data.length > 0 && (
          <label className="dc-batch">
            <span>Batch</span>
            <select
              value={batchId}
              onChange={(e) => {
                setBatchPick(e.target.value);
                setScenarioPick(null);
              }}
            >
              {batches.data.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_code}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="dc-tabs" role="tablist" aria-label="Scenarios">
          {scenarios.data?.map((s) => (
            <button
              key={s.scenario_id}
              type="button"
              role="tab"
              aria-selected={s.scenario_id === scenarioId}
              className={`dc-tab ${s.scenario_id === scenarioId ? "dc-tab-on" : ""}`}
              onClick={() => setScenarioPick(s.scenario_id)}
            >
              {s.scenario_name}
            </button>
          ))}
        </div>
      </div>

      {!batchId && (batches.loading || picked.loading) && (
        <Spinner label="Loading…" />
      )}

      {scenarios.error && (
        <ErrorState
          error={scenarios.error}
          onRetry={scenarios.reload}
          title="Couldn’t load scenarios"
        />
      )}

      {(batchId || loadAll) &&
        scenarios.data &&
        scenarios.data.length === 0 && (
          <EmptyState title="No scenarios found">
            Create and run a scenario first.
          </EmptyState>
        )}

      {scenario && detail.loading && <Spinner label="Assessing scenario…" />}

      {scenario && detail.error && !detail.data && (
        <ErrorState
          error={detail.error}
          onRetry={detail.reload}
          title="Couldn’t assess this scenario"
        />
      )}

      {scenario && detail.data && !detail.data.latest && (
        <EmptyState title="Not run yet">
          Run this scenario to get advice.
        </EmptyState>
      )}

      {scenario && detail.data?.latest && detail.data.decision && (
        <Assessment
          a={detail.data.decision}
          result={detail.data.latest}
          currency={scenario.currency}
          batchId={scenario.batch_id}
        />
      )}
    </div>
  );
}

function Assessment({
  a,
  result,
  currency,
  batchId,
}: {
  a: ScenarioDecision;
  result: ScenarioResult;
  currency: string;
  batchId: string;
}) {
  // TEMPORARY: shows exactly what the backend sent. Remove once it works.
  console.log("DECISION", a);

  // Read the outcome defensively: accept either field name and any casing.
  const raw = a as unknown as Record<string, unknown>;
  const outcomeKey = normalizeKey(raw.assessment_outcome ?? raw.outcome);
  const o = OUTCOME[outcomeKey as AssessmentOutcome] ?? UNKNOWN_OUTCOME;

  const recommendationKey = normalizeKey(
    raw.recommendation,
  ) as ScenarioDecision["recommendation"];
  const actionLabel =
    ACTION[recommendationKey] ?? String(raw.recommendation ?? "—");

  const summary = String(raw.assessment_summary ?? raw.summary ?? "");

  const findings: AssessmentFinding[] = a.findings ?? [];
  const recommendations: string[] = a.recommendations ?? [];

  const against = [
    ...findings.filter((f) => f.outcome === "FAIL"),
    ...findings.filter((f) => f.outcome === "WARNING"),
  ].map((f) => f.message);

  const holdsUp = findings
    .filter(
      (f) =>
        f.outcome === "PASS" &&
        f.category !== "INPUT" &&
        !INFORMATIONAL.has(f.rule_code),
    )
    .map((f) => f.message);

  const sorted = [...findings].sort(
    (x, y) => (RANK[x.outcome] ?? 9) - (RANK[y.outcome] ?? 9),
  );
  const count = (k: FindingOutcome) =>
    findings.filter((f) => f.outcome === k).length;

  const simulated = Number(result.simulated_value);
  const baseline = Number(result.baseline_value);
  const hasValues = Number.isFinite(simulated) && Number.isFinite(baseline);
  const diff = hasValues ? simulated - baseline : null;
  const pctValue =
    diff !== null && baseline > 0 ? ((diff / baseline) * 100).toFixed(1) : null;
  const pct = formatPercentDiff(pctValue);
  const valueTone =
    diff === null || diff === 0 ? "na" : diff < 0 ? "bad" : "ok";

  const reliability =
    outcomeKey === "VIABLE"
      ? "High"
      : outcomeKey === "CONDITIONALLY_VIABLE"
        ? "Medium"
        : "Low";
  const reliabilityTone =
    reliability === "High" ? "ok" : reliability === "Medium" ? "wn" : "bad";

  return (
    <>
      <section className={`dc-card dc-verdict dc-edge-${o.tone}`}>
        <div className="dc-verdict-main">
          <span className={`dc-pill dc-${o.tone} dc-pill-lg`}>{o.label}</span>
          <h2>{o.headline}</h2>
          <p>{against[0] ?? summary}</p>
          <p className="dc-reco">
            Recommendation: <b>{actionLabel}</b>
          </p>
        </div>
        <div className="dc-verdict-side">
          <div className="dc-eyebrow">VALUE VS BASELINE</div>
          <div className={`dc-big dc-text-${valueTone}`}>
            {diff === null ? "—" : `${currency} ${formatSigned(String(diff))}`}
          </div>
          <div className="dc-sub">
            {pct ? `${pct} · ` : ""}
            {formatAmount(result.simulated_value)} vs{" "}
            {formatAmount(result.baseline_value)}
          </div>
          <div className="dc-sub">
            Reliability{" "}
            <span className={`dc-pill dc-${reliabilityTone}`}>
              {reliability}
            </span>
          </div>
          <div className="dc-note">
            Gain figures are before operating costs.
          </div>
        </div>
      </section>

      <div className="dc-two">
        <section className="dc-card">
          <h3 className="dc-h dc-text-bad">Why not</h3>
          {against.length === 0 ? (
            <p className="dc-sub">No concerns were raised.</p>
          ) : (
            against.slice(0, 3).map((t) => (
              <p key={t} className="dc-li">
                <span className="dc-dot dc-bad">!</span>
                {t}
              </p>
            ))
          )}
        </section>
        <section className="dc-card">
          <h3 className="dc-h dc-text-ok">What holds up</h3>
          {holdsUp.length === 0 ? (
            <p className="dc-sub">Nothing could be confirmed.</p>
          ) : (
            holdsUp.slice(0, 3).map((t) => (
              <p key={t} className="dc-li">
                <span className="dc-dot dc-ok">✓</span>
                {t}
              </p>
            ))
          )}
        </section>
      </div>

      <section className="dc-card dc-next">
        <div>
          <h3 className="dc-h">Next step</h3>
          <p className="dc-nextText">
            {recommendations[0] ?? "No further action is needed."}
          </p>
          {recommendations.slice(1, 3).map((t) => (
            <p key={t} className="dc-sub">
              {t}
            </p>
          ))}
        </div>
        <div className="dc-actions">
          <Link
            href={`/scenarios/compare/${batchId}`}
            className="dc-btn dc-btn-line"
          >
            Back to comparison
          </Link>
          <Link href="/scenarios" className="dc-btn dc-btn-solid">
            Revise scenario
          </Link>
        </div>
      </section>

      <details className="dc-card dc-details">
        <summary>
          See all checks ({findings.length} run: {count("PASS")} passed,{" "}
          {count("WARNING")} warning, {count("FAIL")} failed,{" "}
          {count("NOT_ASSESSED")} not assessed)
        </summary>
        <div className="dc-table" role="table">
          <div className="dc-tr dc-th" role="row">
            <span>CHECK</span>
            <span>THIS SCENARIO</span>
            <span>EXPECTED</span>
            <span>RESULT</span>
          </div>
          {sorted.map((f) => {
            const fo = FINDING[f.outcome] ?? {
              label: String(f.outcome ?? "—"),
              tone: "na",
            };
            return (
              <div
                key={f.rule_code}
                className="dc-tr"
                role="row"
                title={f.message}
              >
                <span>{labelOf(f.rule_code)}</span>
                <span>{f.actual_value ?? "—"}</span>
                <span>{f.expected_value ?? "—"}</span>
                <span>
                  <span className={`dc-pill dc-${fo.tone}`}>{fo.label}</span>
                </span>
              </div>
            );
          })}
        </div>
        <p className="dc-note">
          This assessment supports your decision and is not a guarantee of
          commercial success.
        </p>
      </details>
    </>
  );
}

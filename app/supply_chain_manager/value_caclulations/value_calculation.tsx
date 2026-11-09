"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ApiError,
  apiGet,
  errorMessage,
  fmtChangePct,
  fmtDate,
  fmtFractionPercent,
  fmtNum,
  fmtUsd,
  toNum,
  type Batch,
  type BatchValueTable,
} from "@/lib/api";
import styles from "./value_calculation.module.css";

const BATCHES_PATH = "/mineral-batches";
const valueTablePath = (batchId: string, priceDate?: string) =>
  `/values/batches/${batchId}/value-table${
    priceDate ? `?price_date=${priceDate}` : ""
  }`;

const signed = (n: number, text: string) =>
  `${n > 0 ? "+" : n < 0 ? "-" : ""}${text}`;

const CHART_HEIGHT = 240;

function ValueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBatchId = searchParams.get("batch") ?? "";

  const [batches, setBatches] = useState<Batch[]>([]);
  const [, setAllBatches] = useState<Batch[]>([]);
  const [batchesLoaded, setBatchesLoaded] = useState(false);
  const [batchesError, setBatchesError] = useState("");
  const [, setUserCompany] = useState<string>("");
  const [result, setResult] = useState<{
    key: string;
    table: BatchValueTable | null;
    error: string;
    empty: boolean;
  }>({ key: "", table: null, error: "", empty: false });
  const [priceDate, setPriceDate] = useState("");
  const attemptedRef = useState(() => new Set<string>())[0];

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        router.push("/login");
        return;
      }
      setBatchesError(errorMessage(e));
    },
    [router],
  );

  useEffect(() => {
    Promise.all([
      apiGet<Record<string, unknown>>("/users/me").catch(() => null),
      apiGet<{ users: Array<Record<string, unknown>> }>("/users").catch(() => ({
        users: [],
      })),
    ])
      .then(
        ([user, usersRes]: [
          Record<string, unknown> | null,
          { users: Array<Record<string, unknown>> } | null,
        ]) => {
          const company = (user?.company_name as string) || "";
          setUserCompany(company);
          // Also build a map of user_id -> company
          const userMap: Record<string, string> = {};
          (usersRes?.users || []).forEach((u: Record<string, unknown>) => {
            if (u.user_id && u.company_name) {
              userMap[u.user_id as string] = u.company_name as string;
            }
          });
          (
            window as unknown as { __userCompanyMap?: Record<string, string> }
          ).__userCompanyMap = userMap;
          (
            window as unknown as { __currentUserCompany?: string }
          ).__currentUserCompany = company;
        },
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    attemptedRef.clear();
    Promise.all([
      apiGet<Record<string, unknown>>("/users/me").catch(() => null),
      apiGet<{ users: Array<Record<string, unknown>> }>("/users").catch(() => ({
        users: [],
      })),
      apiGet<Batch[]>(BATCHES_PATH).catch(handleError),
    ])
      .then(
        ([user, usersRes, data]: [
          Record<string, unknown> | null,
          { users: Array<Record<string, unknown>> } | null,
          Batch[] | unknown,
        ]) => {
          const company = (user?.company_name as string) || "";
          const userMap: Record<string, string> = {};
          (usersRes?.users || []).forEach((u: Record<string, unknown>) => {
            if (u.user_id && u.company_name) {
              userMap[u.user_id as string] = u.company_name as string;
            }
          });
          if (!Array.isArray(data)) {
            setBatches([]);
            setAllBatches([]);
            return;
          }
          setAllBatches(data);
          if (company) {
            const filtered = data.filter(
              (b: Batch & Record<string, unknown>) => {
                const creatorCompany =
                  userMap[b.created_by as string] ||
                  userMap[
                    String((b as Record<string, unknown>).createdBy ?? "")
                  ];
                if (creatorCompany) {
                  return creatorCompany.toLowerCase() === company.toLowerCase();
                }
                const bc = (
                  (b.company_name ||
                    (b as Record<string, unknown>).company ||
                    "") as string
                )
                  .toString()
                  .toLowerCase();
                if (bc) return bc === company.toLowerCase();
                return false;
              },
            );
            setBatches(filtered);
          } else {
            setBatches(data);
          }
        },
      )
      .finally(() => setBatchesLoaded(true));
  }, [handleError, attemptedRef]);

  useEffect(() => {
    if (urlBatchId || !batchesLoaded || batches.length === 0) return;
    const firstId = batches[0].batch_id;
    router.replace(`/value?batch=${firstId}`);
  }, [urlBatchId, batchesLoaded, batches, router]);

  const requestKey = `${urlBatchId}|${priceDate}`;
  const isCurrent = result.key === requestKey;
  const table = isCurrent ? result.table : null;
  const error = isCurrent ? result.error : "";
  const emptyState = isCurrent ? result.empty : false;
  const loading = Boolean(urlBatchId) && !isCurrent;

  useEffect(() => {
    if (!urlBatchId) return;
    let cancelled = false;
    const attempted = attemptedRef;
    const tryFetch = (batchId: string) => {
      apiGet<BatchValueTable>(valueTablePath(batchId, priceDate || undefined))
        .then((t) => {
          if (cancelled) return;
          if (batchId !== urlBatchId) {
            router.replace(`/value?batch=${batchId}`);
            return;
          }
          setResult({ key: requestKey, table: t, error: "", empty: false });
        })
        .catch((e) => {
          if (cancelled) return;
          if (e instanceof ApiError && e.status === 404) {
            attempted.add(batchId);
            if (attempted.size >= batches.length) {
              setResult({
                key: requestKey,
                table: null,
                error: "",
                empty: true,
              });
              return;
            }
            const next = batches.find((b) => !attempted.has(b.batch_id));
            if (next && next.batch_id !== batchId) {
              router.replace(`/value?batch=${next.batch_id}`);
              return;
            }
            setResult({
              key: requestKey,
              table: null,
              error: "",
              empty: true,
            });
            return;
          } else if (e instanceof ApiError && e.status === 401) {
            router.push("/login");
            return;
          } else {
            setResult({
              key: requestKey,
              table: null,
              error: errorMessage(e),
              empty: false,
            });
            return;
          }
        });
    };
    tryFetch(urlBatchId);
    return () => {
      cancelled = true;
    };
  }, [urlBatchId, priceDate, batches, router, requestKey, attemptedRef]);

  const m = useMemo(() => {
    const rows = table?.rows ?? [];
    if (rows.length === 0) return null;

    const valueFirst = toNum(rows[0].total_value);
    const valueLast = toNum(rows[rows.length - 1].total_value);
    const valueDiff = valueLast - valueFirst;
    const valuePct = valueFirst > 0 ? (valueDiff / valueFirst) * 100 : null;

    let biggest: {
      from: string;
      to: string;
      diff: number;
      pct: string | number | null;
    } | null = null;
    for (let i = 1; i < rows.length; i++) {
      const diff = toNum(rows[i].total_value) - toNum(rows[i - 1].total_value);
      if (!biggest || Math.abs(diff) > Math.abs(biggest.diff)) {
        biggest = {
          from: rows[i - 1].stage_name,
          to: rows[i].stage_name,
          diff,
          pct: rows[i].value_change_pct,
        };
      }
    }

    const values = rows.map((r) => toNum(r.total_value));
    const lost = rows.map((r) => toNum(r.value_lost));
    const lostTotal = lost.reduce((a, b) => a + b, 0);
    const lostMax = Math.max(...lost);
    const lostStage = rows[lost.indexOf(lostMax)];

    const chartPct = rows.map((_, i) => {
      const total = values[i] + lost[i];
      return total > 0
        ? { captured: (values[i] / total) * 100, lost: (lost[i] / total) * 100 }
        : { captured: 0, lost: 0 };
    });

    return {
      rows,
      valueFirst,
      valueLast,
      valueDiff,
      valuePct,
      biggest,
      values,
      lost,
      lostTotal,
      lostMax,
      lostStage,
      chartPct,
    };
  }, [table]);

  function exportCsv() {
    if (!table) return;
    const header = [
      "Stage",
      "Quantity (t)",
      "Grade",
      "Contained (t)",
      "Recovery",
      "Recoverable (t)",
      "Total value (USD)",
      "Value lost (USD)",
      "Value change (%)",
    ];
    const lines = table.rows.map((r) =>
      [
        r.stage_name,
        r.quantity_tonnes,
        r.grade,
        r.contained_metal_tonnes,
        r.recovery ?? "",
        r.recoverable_metal_tonnes,
        r.total_value,
        r.value_lost,
        r.value_change_pct ?? "",
      ].join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `value-metrics-${table.batch_code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.content}>
      <div className={styles.titleRow}>
        <h1>Value-Chain &amp; Value-Capture Analysis</h1>
        <div className={styles.batchPick}>
          <label className={styles.batchLabel}>Batch</label>
          <select
            className={styles.batchSelect}
            value={urlBatchId}
            onChange={(e) =>
              router.replace(
                e.target.value ? `/value?batch=${e.target.value}` : "/value",
              )
            }
          >
            {batches.length === 0 ? (
              <option value="">No batches available</option>
            ) : (
              batches.map((b) => (
                <option key={b.batch_id} value={b.batch_id}>
                  {b.batch_code}
                </option>
              ))
            )}
          </select>
          <label className={styles.batchLabel}>Price date</label>
          <input
            type="date"
            className={styles.dateInput}
            value={priceDate}
            onChange={(e) => setPriceDate(e.target.value)}
          />
        </div>
        {urlBatchId && table && (
          <button type="button" className={styles.export} onClick={exportCsv}>
            Export Metrics
          </button>
        )}
      </div>

      {batchesLoaded && batches.length === 0 && (
        <p className={styles.muted}>No batches available yet.</p>
      )}

      {batchesError && (
        <p className={styles.error} role="alert">
          {batchesError}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {emptyState && (
        <div className={styles.emptyState} role="status">
          <h2 className={styles.emptyTitle}>No value history yet</h2>
          <p className={styles.emptyText}>
            This batch has no recorded value history. Keep this batch selected
            or choose another batch from the list above.
          </p>
        </div>
      )}
      {urlBatchId && loading && !emptyState && (
        <p className={styles.muted}>Loading value table...</p>
      )}

      {urlBatchId && table && m && !emptyState && (
        <>
          <h2 className={styles.summaryTitle}>
            {table.batch_code} : Valuation summary
          </h2>
          <p className={styles.sub}>
            Reference price {fmtUsd(table.reference_price)} per tonne of copper,
            from {table.price_source}, dated {table.price_date}.
          </p>

          <section className={styles.cards} aria-label="Summary">
            <div className={styles.card}>
              <span>LME Copper Price</span>
              <b>{fmtUsd(table.reference_price)}</b>
              <small>As of {fmtDate(table.price_date)}</small>
            </div>

            <div className={styles.card}>
              <span>Total value</span>
              <b>
                {fmtUsd(m.valueFirst)} - {fmtUsd(m.valueLast)}
              </b>
              <small className={m.valueDiff < 0 ? styles.bad : styles.good}>
                {signed(m.valueDiff, fmtUsd(Math.abs(m.valueDiff)))}
                {m.valuePct !== null &&
                  ` (${signed(m.valuePct, `${Math.abs(m.valuePct).toFixed(1)}%`)})`}
              </small>
            </div>

            <div className={styles.card}>
              <span>Largest value change</span>
              {m.biggest ? (
                <>
                  <b>
                    {m.biggest.from} - {m.biggest.to}
                  </b>
                  <small
                    className={m.biggest.diff < 0 ? styles.bad : styles.good}
                  >
                    {signed(m.biggest.diff, fmtUsd(Math.abs(m.biggest.diff)))}
                    {m.biggest.pct != null &&
                      ` (${signed(toNum(m.biggest.pct), `${Math.abs(toNum(m.biggest.pct)).toFixed(1)}%`)})`}
                  </small>
                </>
              ) : (
                <b>-</b>
              )}
            </div>

            <div className={styles.card}>
              <span>Value lost (total)</span>
              <b>{fmtUsd(m.lostTotal)}</b>
              <small className={styles.bad}>
                Largest: {m.lostStage.stage_name}, {fmtUsd(m.lostMax)}
              </small>
            </div>
          </section>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Quantity (Tonnes)</th>
                  <th>Grade (%)</th>
                  <th>Contained (Tonnes)</th>
                  <th>Recovery (%)</th>
                  <th>Total Value (USD)</th>
                  <th>Value Change (%)</th>
                </tr>
              </thead>
              <tbody>
                {m.rows.map((r) => (
                  <tr key={r.stage_id}>
                    <td>{r.stage_name}</td>
                    <td>{fmtNum(r.quantity_tonnes, 1)}</td>
                    <td>{fmtFractionPercent(r.grade).replace(/%$/, "")}</td>
                    <td>{fmtNum(r.contained_metal_tonnes)}</td>
                    <td>{fmtFractionPercent(r.recovery).replace(/%$/, "")}</td>
                    <td>{fmtNum(r.total_value, 0)}</td>
                    <td>
                      {fmtChangePct(r.value_change_pct).replace(/%$/, "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section
            className={styles.chart}
            aria-label="Value captured and value lost by stage"
          >
            <h2>Value captured and value lost by stage (%)</h2>
            <p>
              Each stage shows captured vs unrecovered metal as a percentage of
              the stage total. The two bars in a stage always add up to 100%.
            </p>
            <div className={styles.legend}>
              <span>
                <i className={styles.dotGreen} /> Value captured
              </span>
              <span>
                <i className={styles.dotOrange} /> Value lost
              </span>
            </div>

            <div className={styles.chartBars}>
              <div className={styles.yAxis}>
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              <div className={styles.bars}>
                {m.rows.map((r, i) => (
                  <div key={r.stage_id} className={styles.col}>
                    <div className={styles.pair}>
                      <div className={styles.barItem}>
                        <span className={`${styles.val} ${styles.valGreen}`}>
                          {m.chartPct[i].captured.toFixed(1)}%
                        </span>
                        <div
                          className={styles.captured}
                          style={{
                            height: `${Math.max(
                              (m.chartPct[i].captured / 100) * CHART_HEIGHT,
                              2,
                            )}px`,
                          }}
                        />
                      </div>
                      <div className={styles.barItem}>
                        <span className={`${styles.val} ${styles.valOrange}`}>
                          {m.chartPct[i].lost.toFixed(1)}%
                        </span>
                        <div
                          className={styles.lost}
                          style={{
                            height: `${Math.max(
                              (m.chartPct[i].lost / 100) * CHART_HEIGHT,
                              2,
                            )}px`,
                          }}
                        />
                      </div>
                    </div>
                    <em>{r.stage_name}</em>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <p className={styles.note}>
            Values use the LME copper reference price of {table.price_date} (
            {table.price_source}). Value captured is the recoverable metal
            priced at that reference price.
          </p>
        </>
      )}
    </div>
  );
}

export default function ValueCalculation() {
  return (
    <Suspense fallback={null}>
      <ValueContent />
    </Suspense>
  );
}

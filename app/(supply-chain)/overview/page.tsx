"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  decisionsApi,
  lookupApi,
  scenariosApi,
  stagesApi,
} from "@/lib/api/endpoints"; // <- change to your helper file's real path

const NAVY = "#262262";
const GREEN_TEXT = "#047857";

// Navigation links only (no data), so these can stay static.
const modules = [
  {
    title: "Value",
    desc: "Analyze how value is created and captured along the mineral value chain.",
    href: "/value",
  },
  {
    title: "Scenario",
    desc: "Model price, demand and policy changes and compare the outcomes.",
    href: "/scenarios",
  },
  {
    title: "Decisions",
    desc: "Review recommendations and record the decisions your team has made.",
    href: "/decisions",
  },
];

type Stat = { key: string; label: string; value: number; note?: string };
type Activity = { id: string; text: string; when?: string };

// Scenario fields I can't see in types.ts, read defensively.
type ScenarioLike = {
  id?: string;
  scenario_id?: string;
  scenario_name?: string;
  created_at?: string;
  updated_at?: string;
};

const DECISION_SAMPLE = 5; // decisions are fetched per scenario, so sample the latest few

const dateOf = (s: ScenarioLike) => s.updated_at ?? s.created_at;
const idOf = (s: ScenarioLike) => String(s.id ?? s.scenario_id ?? "");

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const units: [number, string][] = [
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];
  for (const [size, name] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${name}${n > 1 ? "s" : ""} ago`;
    }
  }
  return "Just now";
}

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 24,
};

const heading: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 600,
  margin: "0 0 14px",
  color: "#111827",
};

export default function HomePage() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    async function load() {
      const [batchesR, stagesR, scenariosR] = await Promise.allSettled([
        lookupApi.batches({ signal }),
        stagesApi.list({ signal }),
        scenariosApi.list({}, { signal }),
      ]);

      if (signal.aborted) return;

      if (
        batchesR.status === "rejected" &&
        stagesR.status === "rejected" &&
        scenariosR.status === "rejected"
      ) {
        setError("Unable to load your overview. Please try again.");
        setLoading(false);
        return;
      }

      const batches = batchesR.status === "fulfilled" ? batchesR.value : [];
      const stages = stagesR.status === "fulfilled" ? stagesR.value : [];
      const scenarios = (
        scenariosR.status === "fulfilled" ? scenariosR.value : []
      ) as ScenarioLike[];

      // Newest scenarios first
      const sorted = [...scenarios].sort(
        (a, b) =>
          new Date(dateOf(b) ?? 0).getTime() -
          new Date(dateOf(a) ?? 0).getTime(),
      );

      // Decisions: only available per scenario, so count them for the latest few
      const sample = sorted.slice(0, DECISION_SAMPLE).filter((s) => idOf(s));
      const decisionResults = await Promise.allSettled(
        sample.map((s) => decisionsApi.listForScenario(idOf(s), { signal })),
      );
      if (signal.aborted) return;

      const decisionCount = decisionResults.reduce(
        (sum, r) => sum + (r.status === "fulfilled" ? r.value.length : 0),
        0,
      );

      const weekAgo = Date.now() - 7 * 86400 * 1000;
      const newThisWeek = scenarios.filter(
        (s) => s.created_at && new Date(s.created_at).getTime() >= weekAgo,
      ).length;

      setStats([
        { key: "batches", label: "Mineral batches", value: batches.length },
        { key: "stages", label: "Processing stages", value: stages.length },
        {
          key: "scenarios",
          label: "Saved scenarios",
          value: scenarios.length,
          note: scenarios.some((s) => s.created_at)
            ? `${newThisWeek} created this week`
            : undefined,
        },
        {
          key: "decisions",
          label: "Decisions recorded",
          value: decisionCount,
          note: sample.length
            ? `From your latest ${sample.length} scenario${sample.length > 1 ? "s" : ""}`
            : undefined,
        },
      ]);

      setActivity(
        sorted.slice(0, 6).map((s) => ({
          id: idOf(s) || String(s.scenario_name),
          text: `Scenario: ${s.scenario_name ?? "Untitled"}`,
          when: dateOf(s),
        })),
      );
      setLoading(false);
    }

    load().catch(() => {
      if (!signal.aborted) {
        setError("Unable to load your overview. Please try again.");
        setLoading(false);
      }
    });

    return () => controller.abort();
  }, []);

  return (
    <div
      style={{ padding: "32px 40px", width: "100%", boxSizing: "border-box" }}
    >
      {/* Welcome banner */}
      <section
        style={{
          background: NAVY,
          color: "#fff",
          borderRadius: 14,
          padding: "32px 36px",
          marginBottom: 28,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>
          Welcome back
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: 17,
            maxWidth: 620,
            lineHeight: 1.5,
          }}
        >
          Track minerals, understand value along the chain, and test scenarios
          before you make a decision.
        </p>
      </section>

      {error && (
        <p
          style={{ color: "#b91c1c", fontSize: 16, marginBottom: 20 }}
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Summary cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 18,
          marginBottom: 32,
        }}
      >
        {loading &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} style={{ ...card, minHeight: 130 }}>
              <div style={{ fontSize: 15, color: "#6b7280" }}>Loading…</div>
            </div>
          ))}

        {!loading &&
          stats.map((s) => (
            <div key={s.key} style={card}>
              <div style={{ fontSize: 15, color: "#374151" }}>{s.label}</div>
              <div
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  color: NAVY,
                  marginTop: 6,
                }}
              >
                {s.value}
              </div>
              {s.note && (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: GREEN_TEXT,
                    marginTop: 4,
                  }}
                >
                  {s.note}
                </div>
              )}
            </div>
          ))}
      </section>

      {/* Quick access + Recent activity */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
          gap: 28,
          alignItems: "start",
        }}
      >
        <div>
          <h2 style={heading}>Quick access</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18,
            }}
          >
            {modules.map((m) => (
              <Link
                key={m.title}
                href={m.href}
                style={{ ...card, textDecoration: "none", color: "inherit" }}
              >
                <div style={{ fontSize: 19, fontWeight: 600, color: NAVY }}>
                  {m.title}
                </div>
                <p
                  style={{
                    fontSize: 15,
                    color: "#374151",
                    margin: "10px 0 16px",
                    lineHeight: 1.5,
                  }}
                >
                  {m.desc}
                </p>
                <span
                  style={{ fontSize: 15, fontWeight: 600, color: GREEN_TEXT }}
                >
                  Open →
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 style={heading}>Recent activity</h2>
          <div style={{ ...card, padding: 0 }}>
            {loading && (
              <div
                style={{ padding: "16px 22px", fontSize: 15, color: "#6b7280" }}
              >
                Loading…
              </div>
            )}

            {!loading && activity.length === 0 && !error && (
              <div
                style={{ padding: "16px 22px", fontSize: 15, color: "#374151" }}
              >
                No recent activity yet.
              </div>
            )}

            {!loading &&
              activity.map((a, i) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    padding: "16px 22px",
                    borderTop: i === 0 ? "none" : "1px solid #f0f0f0",
                    fontSize: 15,
                    color: "#111827",
                  }}
                >
                  <span>{a.text}</span>
                  <span
                    style={{
                      color: "#6b7280",
                      fontSize: 14,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {timeAgo(a.when)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}

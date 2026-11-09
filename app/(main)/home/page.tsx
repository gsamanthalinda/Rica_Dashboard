"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { getStoredToken } from "@/lib/auth";
import { fetchBatches } from "../../lib/api";
import type { MineralBatch as ApiBatch } from "../../lib/api";
import { getMyRole, isOperationsManager } from "@/lib/roleCheck";

const PAGE_SIZE = 5;

/** "OWN_MINE" / "own mine" -> "Own mine" */
function sentence(value: string): string {
  const s = value.replace(/_/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** What the table shows for one backend row. Order matches the table columns. */
function toRow(b: ApiBatch) {
  return {
    key: b.id ?? b.batch_code,
    code: b.batch_code,
    source: b.source_type ? sentence(b.source_type) : "—",
    quantity: String(Number(b.quantity_tonnes)),
    grade: b.grade ? (Number(b.grade) * 100).toFixed(2) : "0.00",
    recovery: b.recovery ? (Number(b.recovery) * 100).toFixed(2) : "—",
    status: b.status ? sentence(b.status) : "—",
  };
}

/** Filled pencil (ant-design "edit-filled", as used in the Figma frame). */
function EditIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="64 64 896 896"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M880 836H144c-17.7 0-32 14.3-32 32v36c0 4.4 3.6 8 8 8h784c4.4 0 8-3.6 8-8v-36c0-17.7-14.3-32-32-32zm-622.3-84c2 0 4-.2 6-.5L431.9 722c2-.4 3.9-1.3 5.3-2.8l423.9-423.9a9.96 9.96 0 000-14.1L694.9 114.9c-1.9-1.9-4.4-2.9-7.1-2.9s-5.2 1-7.1 2.9L256.8 538.8c-1.5 1.5-2.4 3.3-2.8 5.3l-29.5 168.2a33.5 33.5 0 009.4 29.8c6.6 6.4 14.9 9.9 23.8 9.9z" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [batches, setBatches] = useState<ApiBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getStoredToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      try {
        const role = await getMyRole();
        if (!isOperationsManager(role)) {
          router.replace("/batches");
          return;
        }
      } catch {
        router.replace("/batches");
      }
      if (!cancelled) setLoading(false);
    })();
    fetchBatches()
      .then((data) => {
        if (!cancelled) setBatches(data);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = batches.map(toRow);
    if (!q) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [batches, query]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const startIdx = (current - 1) * PAGE_SIZE;
  const rows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // Window of up to 3 page numbers, like the design (1 2 3 ... >)
  const firstShown = Math.min(
    Math.max(1, current - 1),
    Math.max(1, totalPages - 2),
  );
  const pages = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => firstShown + i,
  );
  const hasMore = pages[pages.length - 1] < totalPages;

  let emptyMessage = "No batches found.";
  if (loading) emptyMessage = "Loading batches…";
  if (error) emptyMessage = error;

  return (
    <section className="bd">
      <div className="bd-header">
        <h1>Batch directory</h1>
        <Link href="/batches" className="bd-register">
          + Register batch
        </Link>
      </div>

      <label className="bd-search">
        <Search size={22} aria-hidden="true" />
        <input
          type="search"
          placeholder="Search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
      </label>

      <div className="bd-tablewrap">
        <table className="bd-table">
          <thead>
            <tr>
              <th>Batch Code</th>
              <th>Source</th>
              <th>Quantity(Tonnes)</th>
              <th>Initial Grade(%)</th>
              <th>Recovery(%)</th>
              <th>Status</th>
              <th>Add batch stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.key}>
                <td>{b.code}</td>
                <td>{b.source}</td>
                <td>{b.quantity}</td>
                <td>{b.grade}</td>
                <td>{b.recovery}</td>
                <td>{b.status}</td>
                <td>
                  <Link
                    href={`/batch-stages/record?batch=${encodeURIComponent(b.code)}`}
                    className="bd-edit"
                    aria-label={`Open stages for ${b.code}`}
                  >
                    <EditIcon />
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="bd-empty">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="bd-footer">
        <p>
          {total === 0
            ? "Showing 0 of 0"
            : `Showing ${startIdx + 1} to ${startIdx + rows.length} of ${total}`}
        </p>
        <nav className="bd-pagination" aria-label="Pagination">
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={p === current ? "is-active" : ""}
              aria-current={p === current ? "page" : undefined}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          {hasMore && <span aria-hidden="true">...</span>}
          <button
            type="button"
            aria-label="Next page"
            disabled={current >= totalPages}
            onClick={() => setPage(current + 1)}
          >
            &gt;
          </button>
        </nav>
      </footer>
    </section>
  );
}

import { clearStoredToken, getStoredToken, setStoredToken } from "@/lib/auth";

export const API_URL = "";
export const TOKEN_KEY = "rica_token";

function getToken(): string | null {
  return getStoredToken();
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof URLSearchParams)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail);
    } catch {}
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}

export const api = {
  get: apiGet,
  post: apiPost,
  patch: apiPatch,
  del: apiDelete,
  postForm: <T>(path: string, form: URLSearchParams) =>
    request<T>(path, { method: "POST", body: form }),
};

export function setToken(token: string) {
  setStoredToken(token);
}

export function clearToken() {
  clearStoredToken();
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "An unknown error occurred";
}

export function fmtUsd(n: number | string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(toNum(n));
}

export function fmtNum(n: number | string, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(toNum(n));
}

export function fmtPercent(n: number, digits = 1): string {
  return `${fmtNum(n, digits)}%`;
}

export function fmtChange(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${sign}${fmtNum(Math.abs(n), digits)}`;
}

export function fmtFractionPercent(v: unknown, digits = 1): string {
  if (v === null || v === undefined) return "-";
  return `${fmtNum(toNum(v) * 100, digits)}%`;
}

export function fmtChangePct(v: unknown, digits = 1): string {
  if (v === null || v === undefined) return "-";
  const n = toNum(v);
  return `${n > 0 ? "+" : ""}${fmtNum(n, digits)}%`;
}

export function fmtDate(s: string): string {
  try {
    const d = new Date(s);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return s;
  }
}

export function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

export interface Batch {
  batch_id: string;
  batch_code: string;
  location?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

export interface ValueTableRow {
  stage_name: string;
  tonnes_processed: number | string;
  contained_metal_tonnes: number | string;
  grade_pct: number | string;
  price_usd_per_tonne?: number | string;
  metal_value_usd: number | string;
  processing_cost_usd: number | string;
  total_value: number | string;
  value_change_usd: number | string;
  value_change_pct?: string | number | null;
  [key: string]: unknown;
}

export interface ValueTable {
  batch_id: string;
  batch_code: string;
  reference_price: number;
  price_source: string;
  price_date: string;
  rows: ValueTableRow[];
}

export interface BatchValueRow {
  stage_id: number;
  stage_name: string;
  stage_order: number;
  occurred_at: string;
  quantity_tonnes: string | number;
  grade: string | number;
  contained_metal_tonnes: string | number;
  recovery: string | number | null;
  recoverable_metal_tonnes: string | number;
  total_value: string | number;
  value_lost: string | number;
  value_change_pct: string | number | null;
}

export interface BatchValueTable {
  batch_id: string;
  batch_code: string;
  reference_price: string | number;
  price_unit: string;
  currency: string;
  price_source: string;
  price_date: string;
  rows: BatchValueRow[];
}

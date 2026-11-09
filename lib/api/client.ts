import { getStoredToken } from "@/lib/auth";

const RAW_BASE = process.env.NEXT_PUBLIC_API_URL;

export interface FieldIssue {
  field: string | null;
  message: string;
}

export class ApiError extends Error {
  readonly status: number | null;
  readonly issues: FieldIssue[];

  constructor(
    message: string,
    status: number | null,
    issues: FieldIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.issues = issues;
  }

  get isNetwork() {
    return this.status === null;
  }
  get isNotFound() {
    return this.status === 404;
  }
  get isConflict() {
    return this.status === 409;
  }
}

export function apiBaseUrl(): string {
  if (!RAW_BASE) {
    throw new ApiError(
      "NEXT_PUBLIC_API_URL is not set. Add it to .env.local (see .env.example) and restart the dev server.",
      null,
    );
  }
  return RAW_BASE.replace(/\/+$/, "");
}

interface FastApiValidationItem {
  loc?: (string | number)[];
  msg?: string;
}

function parseErrorBody(status: number, body: unknown): ApiError {
  const detail =
    body && typeof body === "object" && "detail" in body
      ? (body as { detail: unknown }).detail
      : undefined;

  if (typeof detail === "string") return new ApiError(detail, status);

  if (Array.isArray(detail)) {
    const issues: FieldIssue[] = (detail as FastApiValidationItem[]).map(
      (d) => {
        const loc = d.loc ?? [];
        const field = loc.length > 1 ? String(loc[loc.length - 1]) : null;
        return { field, message: d.msg ?? "Invalid value" };
      },
    );
    const message = issues
      .map((i) => (i.field ? `${i.field}: ${i.message}` : i.message))
      .join("; ");
    return new ApiError(
      message || "The request was rejected as invalid.",
      status,
      issues,
    );
  }

  return new ApiError(`Request failed (HTTP ${status}).`, status);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const base = apiBaseUrl();
  const { json, headers, ...rest } = init;
  const token = getStoredToken();
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...rest,
      headers: {
        Accept: "application/json",
        ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiError(
      `Could not reach the RICA API at ${base}. Check that the backend is running and that CORS allows this site.`,
      null,
    );
  }

  if (response.status === 204) return undefined as T;

  let body: unknown = undefined;
  const text = await response.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }

  if (response.status === 401) {
    throw new ApiError(
      "You’re signed out or your session has expired. Please sign in again.",
      401,
    );
  }
  if (!response.ok) throw parseErrorBody(response.status, body);
  return body as T;
}

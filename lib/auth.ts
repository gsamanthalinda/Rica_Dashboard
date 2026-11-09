import { notifySessionChange } from "./sessionStore";

const EMAIL_KEY = "rica_reset_email";
const CHALLENGE_KEY = "rica_login_challenge";
const REMEMBERED_EMAIL_KEY = "rica_remembered_email";
const RESET_TOKEN_KEY = "rica_reset_token";
export const TOKEN_KEY = "rica_token";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ErrorData {
  detail?: string | Array<{ msg?: string; message?: string }>;
}

export function errorMessage(
  data: ErrorData | null | undefined,
  fallback: string,
): string {
  const detail = data && data.detail;
  if (typeof detail === "string" && detail) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const msg = first && (first.msg || first.message);
    if (msg) return msg;
  }
  return fallback;
}

export function saveRememberedEmail(email: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(REMEMBERED_EMAIL_KEY, (email || "").trim());
  } catch {}
  notifySessionChange();
}

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(REMEMBERED_EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function saveResetEmail(email: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(EMAIL_KEY, email.trim());
  } catch {}
  notifySessionChange();
}

export function getResetEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(EMAIL_KEY) || "";
  } catch {
    return "";
  }
}

export function clearResetEmail(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(EMAIL_KEY);
  } catch {}
  notifySessionChange();
}

export function getResetToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(RESET_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function saveResetToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(RESET_TOKEN_KEY, token);
  } catch {}
  notifySessionChange();
}

export function clearResetToken(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(RESET_TOKEN_KEY);
  } catch {}
  notifySessionChange();
}

export function saveLoginChallenge(challengeId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(CHALLENGE_KEY, challengeId);
  } catch {}
  notifySessionChange();
}

export function getLoginChallenge(): string {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(CHALLENGE_KEY) || "";
  } catch {
    return "";
  }
}

export function clearLoginChallenge(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CHALLENGE_KEY);
  } catch {}
  notifySessionChange();
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
  notifySessionChange();
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
  notifySessionChange();
}

function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

const REQUEST_TIMEOUT_MS = 15000;

// Same backend URL as app/lib/api.ts. Leave NEXT_PUBLIC_API_URL unset only if
// next.config has rewrites that proxy /auth and /users to the backend.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener("abort", () => controller.abort(), {
        once: true,
      });
    }
  }

  try {
    const url = /^https?:\/\//.test(path) ? path : `${API_BASE}${path}`;
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

export async function login(
  email: string,
  password: string,
): Promise<Response> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return res;
}

export async function forgotPassword(email: string): Promise<Response> {
  const res = await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res;
}

export async function resetPassword(
  token: string,
  new_password: string,
): Promise<Response> {
  const res = await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password }),
  });
  return res;
}

export async function verifyResetCode(
  email: string,
  code: string,
): Promise<Response> {
  const res = await apiFetch("/auth/reset/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
  return res;
}

export async function activateAccount({
  code,
  password,
  confirm_password,
}: {
  code: string;
  password: string;
  confirm_password: string;
}): Promise<Response> {
  const res = await apiFetch("/auth/activate", {
    method: "POST",
    body: JSON.stringify({ code, password, confirm_password }),
  });
  return res;
}

export async function resendActivationCode(email: string): Promise<Response> {
  const res = await apiFetch("/auth/activate/resend", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return res;
}

export async function verifyLoginCode(
  challenge_id: string,
  code: string,
): Promise<Response> {
  const res = await apiFetch("/auth/mfa/verify-login", {
    method: "POST",
    body: JSON.stringify({ challenge_id, code }),
  });
  return res;
}

export async function resendLoginCode(challenge_id: string): Promise<Response> {
  const res = await apiFetch("/auth/mfa/resend", {
    method: "POST",
    body: JSON.stringify({ challenge_id }),
  });
  return res;
}

export async function listUsers(): Promise<Response> {
  const res = await apiFetch("/users", { method: "GET" });
  return res;
}

export async function getMe(): Promise<Response> {
  const res = await apiFetch("/users/me", { method: "GET" });
  return res;
}

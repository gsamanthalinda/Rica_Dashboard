import { getStoredToken } from "./auth";

// Required: set NEXT_PUBLIC_API_URL in .env.local (no hardcoded fallback).
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export type UserRole = string | null | undefined;

export type RoleResult =
  | { status: "ok"; role: UserRole }
  | { status: "unauthorized" } // no token, or the server rejected it (401/403)
  | { status: "error" }; // network failure, 5xx, or missing configuration

/** Fetches the current user's role and says WHY it failed, if it did. */
export async function fetchMyRole(): Promise<RoleResult> {
  const token = getStoredToken();
  if (!token) return { status: "unauthorized" };

  if (!API_BASE) {
    console.error("NEXT_PUBLIC_API_URL is not set. Add it to .env.local.");
    return { status: "error" };
  }

  try {
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      return { status: "unauthorized" };
    }
    if (!res.ok) return { status: "error" };
    const data = await res.json();
    return { status: "ok", role: data?.role ?? null };
  } catch {
    return { status: "error" };
  }
}

/** Returns the role, or null on any failure. Never throws. */
export async function getMyRole(): Promise<UserRole> {
  const result = await fetchMyRole();
  return result.status === "ok" ? result.role : null;
}

export function isOperationsManager(role: UserRole): boolean {
  return (role || "").toString().toLowerCase() === "operations_manager";
}

export function isSupplyChainManager(role: UserRole): boolean {
  return (role || "").toString().toLowerCase() === "supply_chain_manager";
}

/** Where each role starts after signing in (same as the login page), or null when the role can't use the app. */
export function homeForRole(role: UserRole): string | null {
  const r = (role || "").toString().toLowerCase();
  if (r === "system_administrator") return "/admin/companies";
  if (r === "operations_manager") return "/home";
  if (r === "supply_chain_manager") return "/overview";
  return null;
}

/** Check whether the current user is an Operations Manager.
 *  Returns { allowed: boolean, message?: string }. */
export async function checkOperationsManager(): Promise<{
  allowed: boolean;
  message?: string;
}> {
  const role = await getMyRole();
  if (isOperationsManager(role)) return { allowed: true };
  return {
    allowed: false,
    message: "Only Operations Managers can access this page.",
  };
}

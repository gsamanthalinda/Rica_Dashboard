"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearStoredToken, errorMessage, getMe } from "@/lib/auth";
import type { CurrentUser } from "@/lib/user";

let cachedUser: CurrentUser | null = null;

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(cachedUser);
  const [loading, setLoading] = useState(!cachedUser);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cachedUser) return;
    let alive = true;
    getMe()
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load your profile.");
        const data = (await res.json()) as CurrentUser;
        cachedUser = data;
        if (alive) setUser(data);
      })
      .catch((e) => {
        if (alive)
          setError(
            e instanceof Error ? e.message : "Could not load your profile.",
          );
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { user, loading, error };
}

export function useLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  // Resolves to true only when the server session has ended.
  const logout = useCallback(async (): Promise<boolean> => {
    setError("");
    setLoggingOut(true);
    try {
      const res = await apiFetch("/auth/logout", { method: "POST" });
      // 401 means the token is already invalid on the server, so the session is gone.
      if (!res.ok && res.status !== 401) {
        const data = await res.json().catch(() => null);
        setError(
          errorMessage(data, "Could not sign you out. Please try again."),
        );
        return false;
      }
    } catch {
      setError("Could not reach the server to sign you out. Please try again.");
      return false;
    } finally {
      setLoggingOut(false);
    }

    clearStoredToken();
    cachedUser = null;
    router.push("/login");
    return true;
  }, [router]);

  return { logout, loggingOut, error };
}

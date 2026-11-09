"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredToken, getStoredToken } from "@/lib/auth";
import { fetchMyRole } from "@/lib/roleCheck";

type GuardState = "checking" | "allowed" | "error";

/**
 * Shows its children only to users whose role is in `allow` (case-insensitive,
 * e.g. ["SUPPLY_CHAIN_MANAGER"]). Same behaviour as OperationsManagerGuard:
 * - No token, rejected token, or another role -> sign out, go to /login.
 * - Network error / server unavailable -> keep the session, offer Retry.
 */
export default function RoleGuard({
  allow,
  children,
}: {
  allow: string[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("checking");
  const [attempt, setAttempt] = useState(0);
  const allowKey = allow.map((r) => r.toLowerCase()).join(",");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!getStoredToken()) {
        router.replace("/login");
        return;
      }

      const result = await fetchMyRole();
      if (cancelled) return;

      if (result.status === "error") {
        setState("error");
        return;
      }
      const role =
        result.status === "ok" ? String(result.role ?? "").toLowerCase() : "";
      if (role && allowKey.split(",").includes(role)) {
        setState("allowed");
        return;
      }

      clearStoredToken();
      router.replace("/login");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, attempt, allowKey]);

  const retry = () => {
    setState("checking");
    setAttempt((n) => n + 1);
  };

  return (
    <>
      {state === "error" && (
        <div role="alert" style={{ padding: 24 }}>
          <p>
            We couldn&apos;t verify your access. Please check your connection.
          </p>
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}
      <div style={{ display: state === "allowed" ? "contents" : "none" }}>
        {children}
      </div>
    </>
  );
}

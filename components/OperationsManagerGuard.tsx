"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredToken, getStoredToken } from "@/lib/auth";
import { fetchMyRole, isOperationsManager } from "@/lib/roleCheck";

type GuardState = "checking" | "allowed" | "error";

/**
 * Shows its children only to Operations Managers.
 * - No token, rejected token, or another role -> sign out, go to /login.
 * - Network error / server unavailable -> keep the session, offer Retry.
 * Children stay mounted but hidden until access is confirmed.
 */
export default function OperationsManagerGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>("checking");
  const [attempt, setAttempt] = useState(0);

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
      if (result.status === "ok" && isOperationsManager(result.role)) {
        setState("allowed");
        return;
      }

      clearStoredToken();
      router.replace("/login");
    })();

    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

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

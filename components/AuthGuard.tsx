"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/auth";

/** Sends visitors without a saved login token to /login. */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!getStoredToken()) router.replace("/login");
  }, [router]);

  return <>{children}</>;
}

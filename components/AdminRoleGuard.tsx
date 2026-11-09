"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

const ADMIN_ROLES = ["SYSTEM_ADMINISTRATOR"];

/**
 * Blocks /admin/* for anyone who is not a System Administrator.
 * Supply Chain and Operations Managers are redirected to / before the admin
 * page ever renders, so the user list and the Activate/Disable controls are
 * never shown to them.
 */
export default function AdminRoleGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ role?: string }>("/users/me")
      .then((me) => {
        if (cancelled) return;
        if (ADMIN_ROLES.includes(String(me.role ?? ""))) {
          setAllowed(true);
        } else {
          router.replace("/");
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return allowed ? <>{children}</> : null;
}

"use client";

import { usePathname } from "next/navigation";

export type Role =
  "OPERATIONS_MANAGER" | "SUPPLY_CHAIN_MANAGER" | "SYSTEM_ADMINISTRATOR";

const ROLES: Role[] = [
  "OPERATIONS_MANAGER",
  "SUPPLY_CHAIN_MANAGER",
  "SYSTEM_ADMINISTRATOR",
];

export function useRole(): Role {
  const pathname = usePathname();

  const forced = process.env.NEXT_PUBLIC_DEV_ROLE as Role | undefined;
  if (forced && ROLES.includes(forced)) return forced;

  if (pathname.startsWith("/stages")) return "OPERATIONS_MANAGER";
  if (/^\/batches\/[^/]+\/compare/.test(pathname))
    return "SUPPLY_CHAIN_MANAGER";
  if (pathname.startsWith("/batches")) return "OPERATIONS_MANAGER";
  return "SUPPLY_CHAIN_MANAGER";
}

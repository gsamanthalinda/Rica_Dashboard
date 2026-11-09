import { apiGet } from "@/lib/api";

export interface AdminUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  account_status: string;
  company_name: string | null;
  created_at?: string | null;
}

export interface Company {
  name: string;
  contact_email: string | null;
  user_count: number;
}

export interface UserList {
  users: AdminUser[];
  total: number;
}

export const ROLES = [
  { value: "SYSTEM_ADMINISTRATOR", label: "System Administrator" },
  { value: "SUPPLY_CHAIN_MANAGER", label: "Supply Chain Manager" },
  { value: "OPERATIONS_MANAGER", label: "Operations Manager" },
];

export const roleLabel = (role: string) =>
  ROLES.find((r) => r.value === role)?.label ?? role;

export const isActive = (u: AdminUser) => u.account_status === "ACTIVE";

export const isRootAdmin = (u: AdminUser) =>
  u.role === "SYSTEM_ADMINISTRATOR" && !(u.company_name ?? "").trim();

export const fetchUsers = () => apiGet<UserList>("/users");

export function groupCompanies(users: AdminUser[]): Company[] {
  const map = new Map<string, AdminUser[]>();
  for (const u of users) {
    const name = (u.company_name ?? "").trim();
    if (!name) continue;
    map.set(name, [...(map.get(name) ?? []), u]);
  }

  const companies = [...map.entries()].map(([name, list]) => {
    const scm =
      list.find((u) => u.role === "SUPPLY_CHAIN_MANAGER") ??
      list.find((u) => u.role === "OPERATIONS_MANAGER") ??
      list[0];
    const company: Company = {
      name,
      contact_email: scm?.email ?? null,
      user_count: list.length,
    };
    return company;
  });

  return companies.sort((a, b) => b.user_count - a.user_count);
}

export function tempPassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

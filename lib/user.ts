export interface CurrentUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  account_status: string;
  company_name?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMINISTRATOR: "System Administrator",
  SUPPLY_CHAIN_MANAGER: "Supply Chain Manager",
  OPERATIONS_MANAGER: "Operations Manager",
};

export function roleLabel(role: string): string {
  return (
    ROLE_LABELS[role] ??
    role
      .split("_")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ")
  );
}

export function fullName(u: CurrentUser): string {
  return `${u.first_name} ${u.last_name}`.trim();
}

export function initials(u: CurrentUser): string {
  const a = u.first_name?.charAt(0) ?? "";
  const b = u.last_name?.charAt(0) ?? "";
  return (a + b).toUpperCase() || "?";
}

// Each role has its own settings route, all showing the same SettingsContent.
const SETTINGS_PATHS: Record<string, string> = {
  OPERATIONS_MANAGER: "/settings",
  SUPPLY_CHAIN_MANAGER: "/supply_chain_manager/settings",
  SYSTEM_ADMINISTRATOR: "/admin/account",
};

export function settingsPathFor(role?: string): string {
  return (role && SETTINGS_PATHS[role]) || "/settings";
}

// TODO: the backend has no "change password while signed in" endpoint yet.
// When it exists, replace the throw below with the real call, e.g.
//   const res = await apiFetch("/auth/change-password", {
//     method: "POST",
//     body: JSON.stringify({ current_password: current, new_password: next }),
//   });
//   if (!res.ok) throw new Error((await res.json()).detail ?? "Could not update password.");
export async function changePassword(
  current: string,
  next: string,
): Promise<void> {
  void current;
  void next;
  throw new Error("Changing your password here isn't available yet.");
}

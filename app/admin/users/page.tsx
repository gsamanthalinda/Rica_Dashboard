"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { ApiError, apiGet, apiPatch, errorMessage } from "@/lib/api";
import { fetchUsers, isActive, isRootAdmin, type AdminUser } from "@/lib/admin";
import styles from "./users.module.css";

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [myId, setMyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [busy, setBusy] = useState("");

  const handleError = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        router.push("/login");
        return;
      }
      setError(errorMessage(e));
    },
    [router],
  );

  useEffect(() => {
    Promise.all([fetchUsers(), apiGet<AdminUser>("/users/me")])
      .then(([list, me]) => {
        setUsers(list.users);
        setMyId(me.user_id);
      })
      .catch(handleError)
      .finally(() => setLoading(false));
  }, [handleError]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (isRootAdmin(u)) return false;
      const name = `${u.first_name} ${u.last_name}`.toLowerCase();
      return (
        (status === "ALL" || u.account_status === status) &&
        (q === "" ||
          name.includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.company_name ?? "").toLowerCase().includes(q))
      );
    });
  }, [users, search, status]);

  async function toggle(u: AdminUser) {
    if (isRootAdmin(u) || u.user_id === myId) return;
    setBusy(u.user_id);
    setError("");
    try {
      const updated = await apiPatch<AdminUser>(
        `/users/${u.user_id}/${isActive(u) ? "disable" : "activate"}`,
      );
      setUsers((list) =>
        list.map((x) => (x.user_id === updated.user_id ? updated : x)),
      );
    } catch (e) {
      handleError(e);
    } finally {
      setBusy("");
    }
  }

  return (
    <AdminShell>
      <div className={styles.content}>
        <div className={styles.pageHead}>
          <div>
            <h2>Users</h2>
            <p>All the users registered on Rica</p>
          </div>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.search}>
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search users"
            />
          </label>
          <select
            className={styles.select}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="DISABLED">Suspended</option>
          </select>
        </div>

        {error && (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        )}
        {loading && <p className={styles.muted}>Loading users...</p>}

        {!loading && (
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Users</th>
                  <th>Contact email</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => {
                  const active = isActive(u);
                  return (
                    <tr key={u.user_id}>
                      <td>
                        {u.first_name} {u.last_name}
                      </td>
                      <td>{u.email}</td>
                      <td>{u.company_name ?? "-"}</td>
                      <td>
                        <span
                          className={
                            active
                              ? styles.statusActive
                              : styles.statusSuspended
                          }
                        >
                          {active ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.pill} ${
                            active ? styles.pillDisable : styles.pillActivate
                          }`}
                          disabled={busy === u.user_id || u.user_id === myId}
                          title={
                            u.user_id === myId
                              ? "You cannot disable your own account"
                              : undefined
                          }
                          onClick={() => toggle(u)}
                        >
                          {active ? "Disable" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={5}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminShell>
  );
}

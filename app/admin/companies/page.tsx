"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { ApiError, errorMessage } from "@/lib/api";
import { fetchUsers, groupCompanies, type AdminUser } from "@/lib/admin";
import styles from "./companies.module.css";

export default function CompaniesPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers()
      .then((r) => setUsers(r.users))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) {
          router.push("/login");
          return;
        }
        setError(errorMessage(e));
      })
      .finally(() => setLoading(false));
  }, [router]);

  const companies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groupCompanies(users).filter(
      (c) =>
        q === "" ||
        c.name.toLowerCase().includes(q) ||
        (c.contact_email ?? "").toLowerCase().includes(q),
    );
  }, [users, search]);

  return (
    <AdminShell>
      <div className={styles.content}>
        <div className={styles.pageHead}>
          <div>
            <h2>Companies</h2>
            <p>All the companies registered on Rica</p>
          </div>
          <Link href="/admin/companies/new" className={styles.primaryBtn}>
            + Register company
          </Link>
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
              aria-label="Search companies"
            />
          </label>
        </div>

        {error && (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        )}
        {loading && <p className={styles.muted}>Loading companies...</p>}

        {!loading && !error && (
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Contact email</th>
                  <th>Users</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{c.contact_email ?? "-"}</td>
                    <td>{c.user_count}</td>
                    <td>
                      <span
                        className={
                          c.user_count > 0
                            ? styles.statusActive
                            : styles.statusSuspended
                        }
                      >
                        {c.user_count > 0 ? "Active" : "Suspended"}
                      </span>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={4}>No companies found.</td>
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

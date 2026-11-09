"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCurrentUser, useLogout } from "@/hooks/useCurrentUser";
import { fullName, initials, roleLabel, settingsPathFor } from "@/lib/user";
import styles from "./ProfileMenu.module.css";

type ProfileMenuProps = {
  accountHref?: string;
};

export default function ProfileMenu({ accountHref }: ProfileMenuProps) {
  const { user, loading } = useCurrentUser();
  const { logout, loggingOut, error: logoutError } = useLogout();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const settingsHref = accountHref ?? settingsPathFor(user?.role);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Stay open on failure so the error is visible; on success the app
  // navigates to /login.
  const handleLogout = async () => {
    const ok = await logout();
    if (ok) setOpen(false);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="currentColor"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7H4Z" />
        </svg>
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.header}>
            <div className={styles.avatar} aria-hidden="true">
              {user ? initials(user) : ""}
            </div>
            <div className={styles.who}>
              <p className={styles.name}>
                {user ? fullName(user) : loading ? "Loading..." : "Signed in"}
              </p>
              {user && <p className={styles.email}>{user.email}</p>}
              {user && (
                <span className={styles.badge}>{roleLabel(user.role)}</span>
              )}
            </div>
          </div>

          <div className={styles.divider} />

          <Link
            href={settingsHref}
            role="menuitem"
            className={styles.item}
            onClick={() => setOpen(false)}
          >
            <svg
              className={styles.itemIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
            <span>Settings</span>
          </Link>

          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <svg
              className={styles.itemIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>{loggingOut ? "Logging out..." : "Log out"}</span>
          </button>

          {logoutError && (
            <p className={styles.error} role="alert">
              {logoutError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

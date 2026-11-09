"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useLogout } from "@/hooks/useCurrentUser";
import styles from "./AdminSidebar.module.css";

const LOGO_SRC = "/rica-logo..png";

type Item = { label: string; href: string; icon: ReactNode };

const icon = (children: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="40"
    height="40"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const items: Item[] = [
  {
    label: "Companies",
    href: "/admin/companies",
    icon: icon(
      <>
        <path d="M5 21V4h9v17" />
        <path d="M14 9h5v12" />
        <path d="M3 21h18" />
        <path d="M8 8h3M8 12h3M8 16h3" />
      </>,
    ),
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: icon(
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
        <circle cx="17" cy="9" r="2.8" />
        <path d="M16 14.2c3 0 5.5 1.8 5.5 5" />
      </>,
    ),
  },
  {
    label: "Account",
    href: "/admin/account",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="10" r="3" />
        <path d="M6.5 18.5c1.3-2.3 3.2-3.5 5.5-3.5s4.2 1.2 5.5 3.5" />
      </>,
    ),
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { logout, loggingOut, error } = useLogout();

  return (
    <aside className={styles.sidebar}>
      <Link
        href="/admin/companies"
        className={styles.top}
        aria-label="Rica home"
      >
        <Image src={LOGO_SRC} alt="Rica" width={100} height={40} priority />
      </Link>

      <nav aria-label="Administration">
        <ul className={styles.list}>
          {items.map((it) => {
            const active = pathname.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={`${styles.item} ${active ? styles.active : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {it.icon}
                  <span>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.bottom}>
        <button
          type="button"
          className={styles.logout}
          onClick={() => void logout()}
          disabled={loggingOut}
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
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
        {error && (
          <p
            role="alert"
            style={{
              margin: 0,
              padding: "0 16px 12px",
              fontSize: "0.72rem",
              color: "#ffd7d3",
            }}
          >
            {error}
          </p>
        )}
      </div>
    </aside>
  );
}

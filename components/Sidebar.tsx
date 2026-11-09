"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "./Sidebar.module.css";

const LOGO_SRC = "/rica-logo..png";

type Item = {
  label: string;
  href: string;
  icon: ReactNode;
  exact?: boolean;
};

// All big icons share one 24 x 24 grid, so none of them is stretched.
const bigIcon = (children: ReactNode) => (
  <svg
    className={styles.bigIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const items: Item[] = [
  {
    label: "Home",
    href: "/",
    exact: true,
    icon: bigIcon(
      <path
        d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3L12 3Z"
        fill="currentColor"
        stroke="none"
      />,
    ),
  },
  {
    label: "Value",
    href: "/value",
    icon: bigIcon(
      <>
        {/* three bars */}
        <path d="M6 21v-4M11 21v-6M16 21v-8" />
        {/* rising line with arrow head */}
        <path d="M3 13 9 7l4 4 7-7" />
        <path d="M15 4h5v5" />
      </>,
    ),
  },
  {
    label: "Scenario",
    href: "/scenarios",
    icon: bigIcon(
      <>
        {/* three sliders: lines 7 units apart, knobs as circles */}
        <path d="M3 5h18M3 12h18M3 19h18" />
        <circle cx="15" cy="5" r="2.6" fill="currentColor" />
        <circle cx="8" cy="12" r="2.6" fill="currentColor" />
        <circle cx="13" cy="19" r="2.6" fill="currentColor" />
      </>,
    ),
  },
  {
    label: "Decisions",
    href: "/decisions",
    icon: bigIcon(
      <>
        {/* scales */}
        <path d="M12 4v16M8 20h8" />
        <path d="M5 7h14" />
        <path d="M5 7 2.5 13a3 3 0 0 0 5 0L5 7ZM19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z" />
      </>,
    ),
  },
];

const smallIcon = (children: ReactNode) => (
  <svg
    className={styles.smallIcon}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const settings = {
  label: "Settings",
  href: "/supply_chain_manager/settings",
  icon: smallIcon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1-.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l-.1-.1a2 2 0 1 1 2.8 2.8l-.1-.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </>,
  ),
};

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (item: { href: string; exact?: boolean }) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <nav className={styles.sidebar} aria-label="Main">
      <Link href="/" className={styles.top} aria-label="Rica home">
        <Image src={LOGO_SRC} alt="Rica" width={92} height={40} priority />
      </Link>

      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`${styles.item} ${isActive(item) ? styles.active : ""}`}
              aria-current={isActive(item) ? "page" : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.bottom}>
        <Link
          href={settings.href}
          className={`${styles.row} ${isActive(settings) ? styles.rowActive : ""}`}
        >
          {settings.icon}
          <span>{settings.label}</span>
        </Link>
      </div>
    </nav>
  );
}

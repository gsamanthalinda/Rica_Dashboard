"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_ICON = 38;
const SETTINGS_ICON = 22;

export interface SidebarLink {
  href: string;
  label: string;

  src?: string;

  icon?: React.ReactNode;

  exact?: boolean;
}

const mainLinks: SidebarLink[] = [
  { href: "/home", label: "Home", src: "/home.png" },
  { href: "/batches", label: "Batches", src: "/batch.png" },
  {
    href: "/batch-stages/record",
    label: "Batch Stages",
    src: "/batch-stages.png",
  },

  { href: "/batch-stages", label: "Trace", src: "/Trace.png", exact: true },
];

export default function Sidebar({
  links = mainLinks,
  homeHref = "/home",
  settingsHref = "/settings",
}: {
  links?: SidebarLink[];

  homeHref?: string;

  settingsHref?: string;
} = {}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Close the drawer with the Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string, exact = false) =>
    href === "/"
      ? pathname === "/"
      : exact
        ? pathname === href
        : pathname.startsWith(href);

  return (
    <>
      <button
        type="button"
        className="sb-burger"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        ☰
      </button>

      {open && <div className="sb-backdrop" onClick={close} />}

      <aside className={`sb${open ? " open" : ""}`}>
        <button
          type="button"
          className="sb-close"
          aria-label="Close menu"
          onClick={close}
        >
          ✕
        </button>

        <Link
          href={homeHref}
          className="sb-logo"
          aria-label="Rica home"
          onClick={close}
        >
          <Image
            className="sb-logo-img"
            src="/logo.png"
            alt="Rica"
            width={92}
            height={48}
            priority
          />
        </Link>
        <nav className="sb-nav" aria-label="Main">
          {links.map((l) => {
            const active = isActive(l.href, l.exact);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-label={l.label}
                aria-current={active ? "page" : undefined}
                className={`sb-link${active ? " is-active" : ""}`}
                onClick={close}
              >
                <span className="sb-icon">
                  {l.src ? (
                    <Image
                      src={l.src}
                      alt={l.label}
                      width={NAV_ICON}
                      height={NAV_ICON}
                    />
                  ) : (
                    l.icon
                  )}
                </span>
                <span className="sb-label">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sb-footer">
          <Link
            href={settingsHref}
            aria-label="Settings"
            aria-current={isActive(settingsHref) ? "page" : undefined}
            className={`sb-link${isActive(settingsHref) ? " is-active" : ""}`}
            onClick={close}
          >
            <span className="sb-icon">
              <Image
                src="/settings.png"
                alt="Settings"
                width={SETTINGS_ICON}
                height={SETTINGS_ICON}
              />
            </span>
            <span className="sb-label">Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

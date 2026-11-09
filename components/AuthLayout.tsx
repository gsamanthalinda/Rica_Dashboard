"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "./Logo";

export const u = (n: number): string => `calc(${n} * var(--u))`;

const DOT_ROUTES = ["/login", "/activate", "/forgot-password"];
const DOT_LABELS = ["Sign in", "Activate account", "Reset password"];

function stepFor(pathname: string, fallback: number | null): number | null {
  if (pathname.startsWith("/login") || pathname.startsWith("/verify")) return 0;
  if (pathname.startsWith("/activate")) return 1;
  if (
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-verify") ||
    pathname.startsWith("/reset-password")
  ) {
    return 2;
  }
  return fallback;
}

interface AuthLayoutProps {
  headline: string;
  sub: string;
  activeDot?: number | null;
  leftPad?: number;
  headlineTop?: number;
  headlineWidth?: number;
  subWidth?: number;
  subTop?: number;
  dotsBottom?: number;
  dotsLeft?: number;
  formLeft?: number;
  children: React.ReactNode;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

export default function AuthLayout({
  headline,
  sub,
  activeDot = null,
  leftPad = 47,
  headlineTop = 100,
  headlineWidth = 340,
  subWidth = 400,
  subTop = 26,
  dotsBottom = 88,
  dotsLeft = 53,
  formLeft = 45,
  children,
}: AuthLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const current = stepFor(pathname, activeDot);

  useEffect(() => {
    if (current === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // Keep arrows working normally while typing in a field.
      if (isTypingTarget(e.target)) return;
      const next = current + (e.key === "ArrowRight" ? 1 : -1);
      if (next < 0 || next >= DOT_ROUTES.length) return;
      e.preventDefault();
      router.push(DOT_ROUTES[next]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [current, router]);

  return (
    <main className="auth">
      <section className="auth-left">
        <div
          className="auth-left-inner"
          style={{ paddingLeft: u(leftPad), paddingRight: u(24) }}
        >
          <Logo height={u(49)} />
          <h2
            className="auth-headline"
            style={{ marginTop: u(headlineTop), maxWidth: u(headlineWidth) }}
          >
            {headline}
          </h2>
          <p
            className="auth-sub"
            style={{ marginTop: u(subTop), maxWidth: u(subWidth) }}
          >
            {sub}
          </p>
        </div>

        <nav
          className="dots"
          style={{ left: u(dotsLeft), bottom: u(dotsBottom) }}
          aria-label="Sign-in steps"
        >
          {DOT_ROUTES.map((href, i) => (
            <Link
              key={href}
              href={href}
              className={i === current ? "dot active" : "dot"}
              aria-label={DOT_LABELS[i]}
              aria-current={i === current ? "page" : undefined}
            />
          ))}
        </nav>
      </section>

      <section className="auth-right" style={{ paddingLeft: u(formLeft) }}>
        <div className="auth-form">{children}</div>
      </section>
    </main>
  );
}

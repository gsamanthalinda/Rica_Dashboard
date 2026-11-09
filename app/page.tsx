"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/login"), 2200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="splash">
      <div className="splash-logo">
        <Logo height="calc(62 * var(--u))" />
      </div>
    </main>
  );
}

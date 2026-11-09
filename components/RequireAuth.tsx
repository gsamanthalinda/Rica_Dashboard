"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { TOKEN_KEY } from "@/lib/api";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [pathname, router]);

  return <>{children}</>;
}

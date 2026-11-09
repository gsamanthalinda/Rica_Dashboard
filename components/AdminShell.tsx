"use client";

import type { ReactNode } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import RequireAuth from "@/components/RequireAuth";
import AdminRoleGuard from "@/components/AdminRoleGuard";
import TopNavbar from "@/app/components/TopNavbar/top_navbar";

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminRoleGuard>
        <AdminSidebar />
        <div className="appMain">
          <TopNavbar />
          <main className="appContent">{children}</main>
        </div>
      </AdminRoleGuard>
    </RequireAuth>
  );
}

import OperationsManagerGuard from "@/components/OperationsManagerGuard";
import Sidebar from "../components/Sidebar/sidebar";
import TopNavbar from "../components/TopNavbar/top_navbar";

// Shell for every signed-in page. Only Operations Managers get past the guard.
export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <OperationsManagerGuard>
      <Sidebar />
      <div className="appMain">
        <TopNavbar />
        <main className="appContent">{children}</main>
      </div>
    </OperationsManagerGuard>
  );
}

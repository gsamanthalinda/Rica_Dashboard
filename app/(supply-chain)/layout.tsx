import { Suspense } from "react";
import RoleGuard from "@/components/RoleGuard";
import Sidebar, { type SidebarLink } from "../components/Sidebar/sidebar";
import TopNavbar from "../components/TopNavbar/top_navbar";

// Supply Chain Manager links, from the Figma. Home (/overview) is a placeholder until it's built.
const links: SidebarLink[] = [
  { href: "/overview", label: "Home", src: "/home.png" },
  { href: "/value", label: "Value", src: "/value.png" },
  { href: "/scenarios", label: "Scenario", src: "/scenario.png" },
  { href: "/decisions", label: "Decisions", src: "/decisions.png" },
];

// Shell for Supply Chain Manager pages. Same sidebar and top bar as (main), different links and guard.
// Everything is inside Suspense: the sidebar (usePathname) and pages (useParams/useSearchParams)
// read the URL, which Next only allows inside a Suspense boundary on dynamic routes.
export default function SupplyChainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={null}>
      <RoleGuard allow={["SUPPLY_CHAIN_MANAGER"]}>
        {/* Logo goes where sign-in lands supply chain managers (the team's login sends them to /value). */}
        <Sidebar
          links={links}
          homeHref="/value"
          settingsHref="/supply_chain_manager/settings"
        />
        <div className="appMain">
          <TopNavbar />
          <main className="appContent">{children}</main>
        </div>
      </RoleGuard>
    </Suspense>
  );
}

"use client";

import ProfileMenu from "@/components/ProfileMenu";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const styles = {
  topbar: "tn",
  right: "tn-right",
  user: "tn-user",
  userName: "tn-name",
} as const;

export default function TopNavbar() {
  const { user, error } = useCurrentUser();
  const label = user?.first_name ?? (error ? "User" : "");

  return (
    <header className={styles.topbar}>
      <div className={styles.right}>
        <div className={styles.user}>
          <ProfileMenu />
          <span className={styles.userName}>{label}</span>
        </div>
      </div>
    </header>
  );
}

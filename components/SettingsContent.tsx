"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useCurrentUser, useLogout } from "@/hooks/useCurrentUser";
import { changePassword, fullName, initials, roleLabel } from "@/lib/user";
import styles from "./SettingsContent.module.css";

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

type PasswordValues = {
  current: string;
  next: string;
  confirm: string;
};

export default function SettingsContent() {
  const { user, loading, error } = useCurrentUser();
  const { logout, loggingOut, error: logoutError } = useLogout();

  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError("");
    setSuccess("");
    try {
      await changePassword(values.current, values.next);
      setSuccess("Your password has been updated.");
      reset();
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not update password.",
      );
    }
  });

  return (
    <section className={styles.page}>
      <h1 className="pageTitle">Settings</h1>
      <p className={styles.subtitle}>
        Your account details and how you sign in.
      </p>

      <div className={styles.card}>
        <div className={styles.profileHead}>
          <div className={styles.avatar} aria-hidden="true">
            {user ? initials(user) : ""}
          </div>
          <div>
            <h2 className={styles.cardTitle}>Profile</h2>
            <p className={styles.cardHint}>
              To change these details, contact your system administrator.
            </p>
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <dl className={styles.grid}>
          <div className={styles.field}>
            <dt>Full name</dt>
            <dd>{loading ? "Loading..." : user ? fullName(user) : "-"}</dd>
          </div>
          <div className={styles.field}>
            <dt>Email</dt>
            <dd>{loading ? "Loading..." : (user?.email ?? "-")}</dd>
          </div>
          <div className={styles.field}>
            <dt>Role</dt>
            <dd>
              {user ? (
                <span className={styles.badge}>{roleLabel(user.role)}</span>
              ) : loading ? (
                "Loading..."
              ) : (
                "-"
              )}
            </dd>
          </div>
          <div className={styles.field}>
            <dt>Company</dt>
            <dd>{loading ? "Loading..." : user?.company_name || "-"}</dd>
          </div>
        </dl>
      </div>

      <form className={styles.card} onSubmit={onSubmit} noValidate>
        <h2 className={styles.cardTitle}>Password</h2>
        <p className={styles.cardHint}>
          Use a password you don&apos;t use for any other account.
        </p>

        <div className={styles.passwordRow}>
          <label className={styles.label}>
            Current password
            <input
              className={`${styles.input} ${errors.current ? styles.inputInvalid : ""}`}
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.current ? "true" : "false"}
              {...register("current", {
                required: "Enter your current password.",
              })}
            />
            {errors.current && (
              <span className={styles.fieldError} role="alert">
                {errors.current.message}
              </span>
            )}
          </label>

          <label className={styles.label}>
            New password
            <input
              className={`${styles.input} ${errors.next ? styles.inputInvalid : ""}`}
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.next ? "true" : "false"}
              {...register("next", {
                required: "Enter a new password.",
                minLength: {
                  value: MIN_LENGTH,
                  message: `Use at least ${MIN_LENGTH} characters.`,
                },
                maxLength: {
                  value: MAX_LENGTH,
                  message: `Use at most ${MAX_LENGTH} characters.`,
                },
                validate: (value) =>
                  value !== getValues("current") ||
                  "New password must be different from the current one.",
              })}
            />
            {errors.next && (
              <span className={styles.fieldError} role="alert">
                {errors.next.message}
              </span>
            )}
          </label>

          <label className={styles.label}>
            Confirm new password
            <input
              className={`${styles.input} ${errors.confirm ? styles.inputInvalid : ""}`}
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.confirm ? "true" : "false"}
              {...register("confirm", {
                required: "Confirm your new password.",
                validate: (value) =>
                  value === getValues("next") ||
                  "New password and confirmation don't match.",
              })}
            />
            {errors.confirm && (
              <span className={styles.fieldError} role="alert">
                {errors.confirm.message}
              </span>
            )}
          </label>
        </div>

        <div className={styles.formFooter}>
          <div aria-live="polite">
            {serverError && <p className={styles.error}>{serverError}</p>}
            {success && <p className={styles.success}>{success}</p>}
          </div>
          <button
            type="submit"
            className={styles.primary}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </button>
        </div>
      </form>

      <div className={`${styles.card} ${styles.signOut}`}>
        <div>
          <h2 className={styles.cardTitle}>Sign out</h2>
          <p className={styles.cardHint}>Sign out of Rica on this device.</p>
          {logoutError && (
            <p className={styles.error} role="alert">
              {logoutError}
            </p>
          )}
        </div>
        <button
          type="button"
          className={styles.outline}
          onClick={() => void logout()}
          disabled={loggingOut}
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </section>
  );
}

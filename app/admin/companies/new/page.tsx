"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import AdminShell from "@/components/AdminShell";
import { ApiError, apiPost, errorMessage } from "@/lib/api";
import { fetchUsers, ROLES, tempPassword, type AdminUser } from "@/lib/admin";
import styles from "./register.module.css";

type FormValues = {
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldError({ text }: { text: string }) {
  return (
    <p className={styles.errorText}>
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5" />
        <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
      </svg>
      {text}
    </p>
  );
}

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [existing, setExisting] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    defaultValues: {
      company: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "",
    },
  });

  useEffect(() => {
    fetchUsers()
      .then((r) =>
        setExisting(
          r.users
            .map((u: AdminUser) => (u.company_name ?? "").trim().toLowerCase())
            .filter(Boolean),
        ),
      )
      .catch(() => undefined);
  }, []);

  const onSubmit = async (values: FormValues) => {
    setFormError("");
    setSuccess("");
    const company = values.company.trim();

    const password = tempPassword();
    try {
      await apiPost<AdminUser>("/users", {
        email: values.email.trim(),
        password,
        first_name: values.firstName.trim(),
        last_name: values.lastName.trim(),
        role: values.role,
        company_name: company,
      });
      setSuccess("User registered successfully");
      reset();
    } catch (e2) {
      if (e2 instanceof ApiError && e2.status === 401) {
        router.push("/login");
        return;
      }
      if (e2 instanceof ApiError && e2.status === 409) {
        setError("email", { type: "manual", message: e2.message });
      } else {
        setFormError(errorMessage(e2));
      }
    }
  };

  return (
    <AdminShell>
      <div className={styles.content}>
        <div className={styles.crumbs}>
          <Link href="/admin/companies">Companies</Link> / Register company
        </div>
        <h2 className={styles.title}>Register company</h2>
        <p className={styles.sub}>Create the company and its user.</p>

        {success && (
          <div className={styles.successBox} role="status">
            <p>{success}</p>
          </div>
        )}

        {formError && (
          <p className={styles.alert} role="alert">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.twoCol}>
            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>Company details</h3>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="company">
                  Company name <span className={styles.req}>*</span>
                </label>
                <input
                  id="company"
                  className={`${styles.input} ${errors.company ? styles.inputError : ""}`}
                  {...register("company", {
                    required: "Company name is required",
                  })}
                  aria-invalid={!!errors.company}
                />
                {errors.company?.message && (
                  <FieldError text={errors.company.message} />
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <h3 className={styles.panelTitle}>User</h3>

              <div className={styles.row2}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="firstName">
                    First name <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="firstName"
                    className={`${styles.input} ${errors.firstName ? styles.inputError : ""}`}
                    {...register("firstName", {
                      required: "First name is required",
                    })}
                    aria-invalid={!!errors.firstName}
                  />
                  {errors.firstName?.message && (
                    <FieldError text={errors.firstName.message} />
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="lastName">
                    Last name <span className={styles.req}>*</span>
                  </label>
                  <input
                    id="lastName"
                    className={`${styles.input} ${errors.lastName ? styles.inputError : ""}`}
                    {...register("lastName", {
                      required: "Last name is required",
                    })}
                    aria-invalid={!!errors.lastName}
                  />
                  {errors.lastName?.message && (
                    <FieldError text={errors.lastName.message} />
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  Email <span className={styles.req}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: EMAIL_RE,
                      message: "Enter a valid email address",
                    },
                  })}
                  aria-invalid={!!errors.email}
                />
                {errors.email?.message ? (
                  <FieldError text={errors.email.message} />
                ) : (
                  <p className={styles.hint}>
                    The user signs in with this address. An activation email is
                    sent after you register.
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="role">
                  Role <span className={styles.req}>*</span>
                </label>
                <select
                  id="role"
                  className={`${styles.input} ${errors.role ? styles.inputError : ""}`}
                  {...register("role", {
                    required: "Choose a role",
                  })}
                  aria-invalid={!!errors.role}
                >
                  <option value="">Select a role</option>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                {errors.role?.message && (
                  <FieldError text={errors.role.message} />
                )}
              </div>
            </section>
          </div>

          <div className={styles.actionsRow}>
            <button
              type="submit"
              className={styles.registerBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Registering..." : "Register"}
            </button>
            <Link href="/admin/companies" className={styles.cancelBtn}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}

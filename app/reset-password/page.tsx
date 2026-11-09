"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout, { u } from "@/components/AuthLayout";
import {
  clearResetEmail,
  clearResetToken,
  errorMessage,
  getResetEmail,
  getResetToken,
  resetPassword,
  saveRememberedEmail,
} from "@/lib/auth";
import { useSessionValue } from "@/lib/useSessionValue";

type ResetPasswordValues = {
  password: string;
  confirm: string;
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const email = useSessionValue(getResetEmail);
  const [status, setStatus] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus("");

    const token = getResetToken();
    if (!token) {
      setStatus("No reset token found. Request a new reset code.");
      return;
    }

    try {
      const res = await resetPassword(token, values.password);
      if (res.status === 200) {
        const data = await res.json();
        setStatus(data.message || "Password updated. Redirecting to sign in…");
        saveRememberedEmail(getResetEmail());
        clearResetToken();
        clearResetEmail();
        setTimeout(() => router.push("/login"), 1200);
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus(errorMessage(data, "Invalid or expired reset token."));
      }
    } catch {
      setStatus("Unable to reach the server");
    }
  });

  return (
    <AuthLayout
      leftPad={47}
      headlineTop={70}
      headlineWidth={440}
      subWidth={400}
      formLeft={66}
      headline="A Strong Password Protects Strong Decisions"
      sub="The data behind your operation deserves the same care as your minerals."
    >
      <form
        className="pt"
        style={{ paddingTop: u(110) }}
        onSubmit={onSubmit}
        noValidate
      >
        <h1 className="title small">Create new password</h1>
        {email && (
          <p className="desc tiny" style={{ marginTop: u(10) }}>
            For <strong>{email}</strong>
          </p>
        )}

        <div className="field" style={{ marginTop: u(90) }}>
          <label className="label" htmlFor="password">
            New Password
          </label>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              id="password"
              className={`input ${errors.password ? "error" : ""}`}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              style={{
                width: "100%",
                paddingRight: "48px",
                boxSizing: "border-box",
              }}
              {...register("password", {
                required: "Enter a new password.",
                minLength: {
                  value: 8,
                  message: "Use at least 8 characters.",
                },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                border: "none",
                background: "transparent",
                color: "#666",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              {showPassword ? (
                <EyeOff size={20} aria-hidden="true" />
              ) : (
                <Eye size={20} aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="msg error">{errors.password.message}</p>
          )}
        </div>

        <div className="field" style={{ marginTop: u(32) }}>
          <label className="label" htmlFor="confirm">
            Confirm Password
          </label>
          <div style={{ position: "relative", width: "100%" }}>
            <input
              id="confirm"
              className={`input ${errors.confirm ? "error" : ""}`}
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              style={{
                width: "100%",
                paddingRight: "48px",
                boxSizing: "border-box",
              }}
              {...register("confirm", {
                required: "Confirm your new password.",
                validate: (value, values) =>
                  value === values.password || "Passwords do not match.",
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((visible) => !visible)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              aria-pressed={showConfirm}
              style={{
                position: "absolute",
                right: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "4px",
                border: "none",
                background: "transparent",
                color: "#666",
                cursor: "pointer",
                zIndex: 2,
              }}
            >
              {showConfirm ? (
                <EyeOff size={20} aria-hidden="true" />
              ) : (
                <Eye size={20} aria-hidden="true" />
              )}
            </button>
          </div>
          {errors.confirm && (
            <p className="msg error">{errors.confirm.message}</p>
          )}
        </div>

        <div className="field" style={{ marginTop: u(78) }}>
          <button
            className="btn full"
            type="submit"
            disabled={isSubmitting}
            style={{ height: u(42) }}
          >
            {isSubmitting ? "Resetting…" : "Reset password"}
          </button>
          {status && <p className="msg ok center">{status}</p>}
        </div>
      </form>
    </AuthLayout>
  );
}

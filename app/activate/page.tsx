"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout, { u } from "@/components/AuthLayout";
import CodeInput from "@/components/CodeInput";
import {
  activateAccount,
  errorMessage,
  getRememberedEmail,
  resendActivationCode,
} from "@/lib/auth";
import { useSessionValue } from "@/lib/useSessionValue";

function maskEmail(email?: string | null) {
  if (!email) return null;
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

type ActivateValues = {
  code: string[];
  password: string;
  confirm: string;
};

export default function ActivatePage() {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const email = useSessionValue(getRememberedEmail);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ActivateValues>({
    defaultValues: { code: Array(6).fill(""), password: "", confirm: "" },
  });

  const onResend = async () => {
    const email = getRememberedEmail();
    if (!email) {
      setStatus("");
      setError("No email found. Please sign in first.");
      return;
    }
    setStatus("");
    setError("");
    setResending(true);
    try {
      const res = await resendActivationCode(email);
      const data = await res.json().catch(() => ({}));
      if (res.ok)
        setStatus(data.message || "A new code was sent to your email.");
      else setError(errorMessage(data, "Unable to resend the code."));
    } catch {
      setError("Unable to reach the server");
    } finally {
      setResending(false);
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setStatus("");
    setError("");

    try {
      const res = await activateAccount({
        code: values.code.join(""),
        password: values.password,
        confirm_password: values.confirm,
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(data.message || "Account activated. Redirecting to sign in…");
        setTimeout(() => router.push("/login"), 1200);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(errorMessage(data, "Invalid or expired activation code."));
      }
    } catch {
      setError("Unable to reach the server");
    }
  });

  return (
    <AuthLayout
      activeDot={2}
      leftPad={47}
      headlineTop={95}
      headlineWidth={330}
      subWidth={395}
      dotsBottom={87}
      dotsLeft={53}
      formLeft={34}
      headline="Driving Mineral Value Capture for Mining Leaders in Zambia"
      sub="Map value creation, pinpoint systemic losses, and unlock strategic opportunities for enhanced profitability."
    >
      <form
        className="pt"
        style={{ paddingTop: u(80) }}
        onSubmit={onSubmit}
        noValidate
      >
        <h1 className="title">Activate Account</h1>
        <p className="desc" style={{ marginTop: u(22) }}>
          Your administrator created your account. Enter the 6-digit code we
          sent you
          {email ? (
            <>
              {" "}
              to <strong>{maskEmail(email)}</strong>
            </>
          ) : (
            ""
          )}
          .
        </p>

        <div className="field" style={{ marginTop: u(38) }}>
          <label className="label">Activation Code</label>
          <Controller
            name="code"
            control={control}
            rules={{
              validate: (value) =>
                value.every((digit) => digit !== "") ||
                "Enter the 6-digit activation code.",
            }}
            render={({ field }) => (
              <CodeInput
                value={field.value}
                onChange={field.onChange}
                label="Activation code"
              />
            )}
          />
          {errors.code && <p className="msg error">{errors.code.message}</p>}
        </div>

        <div className="field" style={{ marginTop: u(38) }}>
          <label className="label" htmlFor="password">
            Create Password
          </label>
          <div style={{ position: "relative", width: "100%", marginTop: u(3) }}>
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
                required: "Create a password.",
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

        <div className="field" style={{ marginTop: u(24) }}>
          <label className="label" htmlFor="confirm">
            Confirm Password
          </label>
          <div style={{ position: "relative", width: "100%", marginTop: u(3) }}>
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

        <div className="field" style={{ marginTop: u(44) }}>
          <button className="btn full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Activating…" : "Activate Account"}
          </button>
          <p className="foot" style={{ marginTop: u(38) }}>
            No code yet?{" "}
            <button
              type="button"
              className="link-green"
              onClick={onResend}
              disabled={resending}
            >
              {resending ? "Sending…" : "Resend"}
            </button>
            {" · "}
            Already activated?{" "}
            <Link href="/login" className="link-green">
              Sign in
            </Link>
          </p>
          {error && <p className="msg error center">{error}</p>}
          {status && <p className="msg ok center">{status}</p>}
        </div>
      </form>
    </AuthLayout>
  );
}

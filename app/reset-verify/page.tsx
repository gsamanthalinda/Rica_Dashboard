"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import AuthLayout, { u } from "@/components/AuthLayout";
import CodeInput from "@/components/CodeInput";
import {
  errorMessage,
  forgotPassword,
  getResetEmail,
  saveResetEmail,
  saveResetToken,
  verifyResetCode,
} from "@/lib/auth";
import { useSessionValue } from "@/lib/useSessionValue";

type ResetVerifyValues = {
  code: string[];
};

export default function ResetVerifyPage() {
  const router = useRouter();
  const email = useSessionValue(getResetEmail);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [resending, setResending] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetVerifyValues>({
    defaultValues: { code: Array(6).fill("") },
  });

  const onSubmit = handleSubmit(async (values) => {
    setStatus("");
    if (!email) {
      setError("Your reset session expired. Request a new code.");
      return;
    }
    setError("");
    try {
      const res = await verifyResetCode(email, values.code.join(""));
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.token) saveResetToken(data.token);
        setStatus("Verified. Continue to reset your password.");
        setTimeout(() => router.push("/reset-password"), 800);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(errorMessage(data, "Invalid or expired verification code."));
      }
    } catch {
      setError("Unable to reach the server");
    }
  });

  const onResend = async () => {
    if (!email) {
      setError("Your reset session expired. Request a new code.");
      return;
    }
    setError("");
    setStatus("");
    setValue("code", Array(6).fill(""));
    setResending(true);
    try {
      saveResetEmail(email);
      const res = await forgotPassword(email);
      if (res.ok) {
        setStatus("A new code was sent to your email address.");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(errorMessage(data, "Unable to resend the code."));
      }
    } catch {
      setError("Unable to reach the server");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      activeDot={1}
      leftPad={40}
      headlineTop={72}
      headlineWidth={370}
      subWidth={405}
      subTop={24}
      formLeft={45}
      headline="Back to Your Value Chain in Moments"
      sub="Verify your email and regain access to the insights that drive your operation."
    >
      <form
        className="pt"
        style={{ paddingTop: u(126) }}
        onSubmit={onSubmit}
        noValidate
      >
        <h1 className="title small">Reset password</h1>
        <p className="desc" style={{ marginTop: u(28) }}>
          We sent a 6 digit reset code to{" "}
          {email ? <strong>{email}</strong> : "your email address"}.
        </p>

        <div className="field" style={{ marginTop: u(44) }}>
          <label className="label">Verification Code</label>
          <div style={{ marginTop: u(28) }}>
            <Controller
              name="code"
              control={control}
              rules={{
                validate: (value) =>
                  value.every((digit) => digit !== "") ||
                  "Enter the 6-digit code.",
              }}
              render={({ field }) => (
                <CodeInput
                  value={field.value}
                  onChange={field.onChange}
                  label="Verification code"
                />
              )}
            />
          </div>
          {errors.code && <p className="msg error">{errors.code.message}</p>}
          {error && <p className="msg error">{error}</p>}
          {status && <p className="msg ok">{status}</p>}
        </div>

        <button
          className="btn narrow"
          type="button"
          onClick={onResend}
          disabled={resending}
          style={{ marginTop: u(70), width: u(134), height: u(40) }}
        >
          {resending ? "Sending…" : "Resend"}
        </button>

        <button
          className="btn narrow green"
          type="submit"
          disabled={isSubmitting}
          style={{ marginTop: u(47), width: u(134), height: u(40) }}
        >
          {isSubmitting ? "Continuing…" : "Continue"}
        </button>

        <p className="foot" style={{ marginTop: u(40) }}>
          Wrong account?{" "}
          <Link href="/forgot-password" className="link-green">
            Back to password reset
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

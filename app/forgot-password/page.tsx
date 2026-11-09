"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import AuthLayout, { u } from "@/components/AuthLayout";
import {
  EMAIL_PATTERN,
  errorMessage,
  forgotPassword,
  saveResetEmail,
} from "@/lib/auth";

type ForgotValues = {
  email: string;
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError("");
    setStatus("");
    try {
      const res = await forgotPassword(values.email);
      const data = await res.json().catch(() => ({}));
      saveResetEmail(values.email);
      if (res.ok) {
        setStatus(data.message || "Reset code sent. Enter it to continue.");
        router.push("/reset-verify");
      } else {
        setStatus(errorMessage(data, "Unable to request a reset code."));
      }
    } catch {
      setError("Unable to reach the server");
    }
  });

  return (
    <AuthLayout
      leftPad={33}
      headlineTop={101}
      headlineWidth={290}
      subWidth={340}
      dotsBottom={121}
      dotsLeft={32}
      formLeft={66}
      headline="Back to Your Value Chain in Moments"
      sub="Verify your email and regain access to the insights that drive your operation."
    >
      <form
        className="pt"
        style={{ paddingTop: u(134) }}
        onSubmit={onSubmit}
        noValidate
      >
        <h1 className="title">Password reset</h1>
        <p className="desc" style={{ marginTop: u(17) }}>
          Enter email to receive reset code
        </p>

        <div className="field" style={{ marginTop: u(27) }}>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className={`input ${errors.email ? "error" : ""}`}
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            {...register("email", {
              required: "Enter your email address.",
              pattern: {
                value: EMAIL_PATTERN,
                message: "Enter a valid email address.",
              },
            })}
          />
          {errors.email && <p className="msg error">{errors.email.message}</p>}
          {error && <p className="msg error">{error}</p>}
          {status && <p className="msg ok">{status}</p>}
        </div>

        <button
          className="btn narrow"
          type="submit"
          disabled={isSubmitting}
          style={{ marginTop: u(70), width: u(138), height: u(41) }}
        >
          {isSubmitting ? "Sending…" : "Send"}
        </button>
      </form>
    </AuthLayout>
  );
}

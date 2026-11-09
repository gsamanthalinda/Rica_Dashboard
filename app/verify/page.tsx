"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import AuthLayout, { u } from "@/components/AuthLayout";
import CodeInput from "@/components/CodeInput";
import {
  clearLoginChallenge,
  errorMessage,
  getLoginChallenge,
  getRememberedEmail,
  resendLoginCode,
  setStoredToken,
  clearStoredToken,
  verifyLoginCode,
} from "@/lib/auth";
import { getMyRole, homeForRole } from "@/lib/roleCheck";
import { useSessionValue } from "@/lib/useSessionValue";

type VerifyValues = {
  code: string[];
};

const emptyCode = () => Array(6).fill("");

type VerifyFormProps = {
  challengeId: ReturnType<typeof getLoginChallenge>;
  email: ReturnType<typeof getRememberedEmail>;
};

export default function VerifyPage() {
  const challengeId = useSessionValue(getLoginChallenge);
  const email = useSessionValue(getRememberedEmail);

  return (
    <VerifyForm
      key={challengeId ?? "no-challenge"}
      challengeId={challengeId}
      email={email}
    />
  );
}

function VerifyForm({ challengeId, email }: VerifyFormProps) {
  const router = useRouter();

  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [resending, setResending] = useState(false);

  const redirectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VerifyValues>({
    defaultValues: { code: emptyCode() },
  });

  // Clear the form and messages when the browser restores this page
  // from the back/forward cache.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        reset({ code: emptyCode() });
        setError("");
        setStatus("");
      }
    };

    window.addEventListener("pageshow", onPageShow);

    return () => window.removeEventListener("pageshow", onPageShow);
  }, [reset]);

  // Clear any pending redirect when leaving this component.
  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    await handleSubmit(async (values) => {
      setStatus("");

      if (!challengeId) {
        setError("Your sign-in session expired. Please sign in again.");
        return;
      }

      setError("");

      try {
        const res = await verifyLoginCode(challengeId, values.code.join(""));

        if (res.ok) {
          const data = await res.json();

          setStoredToken(data.access_token);
          clearLoginChallenge();

          const home = homeForRole(await getMyRole());

          if (home) {
            setStatus("Verified. Redirecting…");

            redirectTimer.current = setTimeout(() => {
              reset({ code: emptyCode() });
              router.replace(home);
            }, 800);
          } else {
            clearStoredToken();
            setStatus("");
            reset({ code: emptyCode() });
            setError("Access denied. Your role can't sign in to this app.");
          }
        } else {
          const data = await res.json().catch(() => ({}));

          setError(errorMessage(data, "Invalid or expired verification code."));
        }
      } catch {
        setError("Unable to reach the server");
      }
    })(event);
  };

  const onResend = async () => {
    if (!challengeId) {
      setError("Your sign-in session expired. Please sign in again.");
      return;
    }

    setError("");
    setStatus("");
    setValue("code", emptyCode());
    setResending(true);

    try {
      const res = await resendLoginCode(challengeId);

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

  // Clear the old challenge and form when returning to sign-in.
  const onBackToSignIn = () => {
    clearLoginChallenge();
    reset({ code: emptyCode() });
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
      headline="Trust Starts with Secure Access"
      sub=" Confirm your identity to keep your operation's information safe."
    >
      <form
        className="pt"
        style={{ paddingTop: u(126) }}
        onSubmit={onSubmit}
        noValidate
        autoComplete="off"
      >
        <h1 className="title small">Two-step verification</h1>

        <p className="desc" style={{ marginTop: u(28) }}>
          We sent a 6 digit verification code to{" "}
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

          {(() => {
            const message = errors.code?.message || error;

            if (message) {
              return <p className="msg error">{message}</p>;
            }

            if (status) {
              return <p className="msg ok">{status}</p>;
            }

            return null;
          })()}
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
          <Link href="/login" className="link-green" onClick={onBackToSignIn}>
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

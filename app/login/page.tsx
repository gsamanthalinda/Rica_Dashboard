"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import AuthLayout, { u } from "@/components/AuthLayout";
import {
  EMAIL_PATTERN,
  errorMessage,
  getMe,
  getRememberedEmail,
  getResetEmail,
  getResetToken,
  login,
  saveLoginChallenge,
  saveRememberedEmail,
  setStoredToken,
} from "@/lib/auth";
import { getMyRole } from "@/lib/roleCheck";

type LoginValues = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [status, setStatus] = useState("");
  const [needsActivation, setNeedsActivation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const prefill = getResetToken()
      ? getResetEmail() || getRememberedEmail()
      : getRememberedEmail() || getResetEmail();

    if (prefill) {
      setValue("email", prefill);
    }
  }, [setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setStatus("");
    setNeedsActivation(false);
    saveRememberedEmail(values.email);

    try {
      const res = await login(values.email, values.password);

      if (res.status === 200) {
        const data = await res.json();
        setStoredToken(data.access_token);

        const me = await getMe().catch(() => null);
        let role = me && me.ok ? (await me.json()).role : null;

        if (!role) {
          try {
            role = await getMyRole();
          } catch {
            // Fall back to the default destination.
          }
        }

        const r = (role || "").toString().toUpperCase();

        if (r === "SYSTEM_ADMINISTRATOR") {
          router.push("/admin/companies");
        } else if (r === "OPERATIONS_MANAGER") {
          router.push("/home");
        } else if (r === "SUPPLY_CHAIN_MANAGER") {
          router.push("/value");
        } else {
          router.push("/value");
        }
      } else if (res.status === 202) {
        const data = await res.json();
        saveLoginChallenge(data.challenge_id);
        router.push("/verify");
      } else if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setStatus(errorMessage(data, "Account is not activated."));
        setNeedsActivation(true);
      } else if (res.status === 429) {
        const data = await res.json();
        setStatus(errorMessage(data, "Too many attempts. Try again later."));
      } else {
        const data = await res.json().catch(() => ({}));
        setStatus(errorMessage(data, "Invalid email or password."));
      }
    } catch {
      setStatus("Unable to reach the server");
    }
  });

  return (
    <AuthLayout
      activeDot={0}
      leftPad={50}
      headlineTop={89}
      headlineWidth={335}
      subWidth={355}
      dotsBottom={100}
      dotsLeft={48}
      formLeft={57}
      subTop={38}
      headline="Turning Every Tonne into Measurable Value"
      sub="Track your copper through each processing stage and see where value is gained or lost."
    >
      <form
        className="pt"
        style={{ paddingTop: u(133) }}
        onSubmit={onSubmit}
        noValidate
      >
        <h1 className="title center" style={{ fontSize: u(30) }}>
          Welcome
        </h1>

        {/* Email field */}
        <div className="field" style={{ marginTop: u(77) }}>
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
        </div>

        {/* Password field with show/hide toggle */}
        <div className="field" style={{ marginTop: u(25) }}>
          <label className="label" htmlFor="password">
            Password
          </label>

          <div
            style={{
              position: "relative",
              width: "100%",
            }}
          >
            <input
              id="password"
              className={`input ${errors.password ? "error" : ""}`}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              style={{
                width: "100%",
                paddingRight: "48px",
                boxSizing: "border-box",
              }}
              {...register("password", {
                required: "Enter your password.",
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

        {/* Forgot password */}
        <Link
          href="/forgot-password"
          className="forgot"
          style={{ marginTop: errors.password ? u(19) : u(9) }}
        >
          Forgot password?
        </Link>

        {/* Submit and activation */}
        <div className="field" style={{ marginTop: u(47) }}>
          <button className="btn full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing In…" : "Sign In"}
          </button>

          <p className="foot">
            Account not activated?{" "}
            <Link href="/activate" className="link-green">
              Activate
            </Link>
          </p>

          {status && (
            <p className={`msg center ${needsActivation ? "error" : "ok"}`}>
              {status}

              {needsActivation && (
                <>
                  {" "}
                  <Link href="/activate" className="link-green">
                    Activate now
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </form>
    </AuthLayout>
  );
}

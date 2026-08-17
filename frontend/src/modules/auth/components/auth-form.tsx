"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button } from "@/common/components/button";
import { TextField } from "@/common/components/text-field";
import { Logo } from "@/common/components/logo";
import { ApiError } from "@/common/utils/api-client";
import type { UseMutationResult } from "@tanstack/react-query";
import type { AuthResponse, Credentials } from "../types";

interface AuthFormProps {
  readonly mode: "login" | "register";
  readonly mutation: UseMutationResult<AuthResponse, Error, Credentials>;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to get to your files.",
    submit: "Sign in",
    switchPrompt: "New to istore?",
    switchHref: "/register",
    switchLabel: "Create an account",
    passwordHint: undefined,
  },
  register: {
    title: "Create your account",
    subtitle: "Email and a password. That's it.",
    submit: "Create account",
    switchPrompt: "Already have an account?",
    switchHref: "/login",
    switchLabel: "Sign in",
    passwordHint: "At least 8 characters.",
  },
} as const;

/**
 * Shared sign-in / sign-up form.
 *
 * Validation runs client-side for instant feedback, but the server remains
 * the authority - its message is surfaced verbatim, which is what turns a
 * duplicate email into "An account with that email already exists" rather
 * than a generic failure.
 */
export function AuthForm({ mode, mutation }: AuthFormProps) {
  const copy = COPY[mode];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = "Enter your email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "That doesn't look like a valid email address";
    }

    if (!password) {
      errors.password = "Enter your password";
    } else if (mode === "register" && password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    return errors;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);

    const errors = validate();
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    mutation.mutate({ email: email.trim(), password });
  };

  // Re-validating on change only after a first submit avoids shouting at
  // someone who is still typing their email for the first time.
  const revalidate = () => {
    if (submitted) {
      setFieldErrors(validate());
    }
  };

  const formError = mutation.error;

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="mb-8 inline-block" aria-label="istore home">
        <Logo size="md" />
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {copy.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{copy.subtitle}</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex flex-col gap-4">
        {formError && <FormError error={formError} />}

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={revalidate}
          error={fieldErrors.email}
          placeholder="you@example.com"
        />

        <TextField
          label="Password"
          type="password"
          name="password"
          // Tells password managers whether to offer a saved password or a
          // generated one.
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={revalidate}
          error={fieldErrors.password}
          hint={copy.passwordHint}
        />

        <Button type="submit" size="lg" loading={mutation.isPending} className="mt-2">
          {mutation.isPending ? "Just a moment…" : copy.submit}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {copy.switchPrompt}{" "}
        <Link
          href={copy.switchHref}
          className="font-medium text-brand-600 underline-offset-4 hover:underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </div>
  );
}

/** Form-level failure: wrong credentials, duplicate email, network down. */
function FormError({ error }: { readonly error: Error }) {
  const message =
    error instanceof ApiError
      ? error.message
      : // Anything not from the API is a transport problem; the ApiError
        // message would be developer-facing here.
        "Can't reach istore right now. Check your connection and try again.";

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-lg border border-danger/30 bg-danger/5 p-3"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-danger"
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M8 4.5v4M8 11.2v.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
      <p className="text-sm text-danger">{message}</p>
    </div>
  );
}

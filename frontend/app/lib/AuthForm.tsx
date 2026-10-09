"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { api } from "./api";
import { useAuth, type Session } from "./auth";
import styles from "./AuthForm.module.css";

export type AuthMode = "signin" | "signup";

type Props = {
  mode: AuthMode;
  /** Called once signed in. */
  onDone: () => void;
  /** Switch between sign in and sign up in place (e.g. in a dialog) instead of linking. */
  onSwitch?: (mode: AuthMode) => void;
};

const COPY = {
  signin: { title: "Sign in", submit: "Sign in", busy: "Signing in…", other: "Create an account" },
  signup: { title: "Create your account", submit: "Create account", busy: "Creating account…", other: "Sign in instead" },
};

export default function AuthForm({ mode, onDone, onSwitch }: Props) {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[mode];
  const other: AuthMode = mode === "signin" ? "signup" : "signin";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError(null);
    try {
      signIn(await api<Session>(`/api/auth/${mode}`, { method: "POST", body: form }));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <h1>{copy.title}</h1>
      {mode === "signup" && (
        <label className="field">
          Full name
          <input name="name" autoComplete="name" required maxLength={100} />
        </label>
      )}
      <label className="field">
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Password
        <input
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 8 : undefined}
          maxLength={128}
        />
        {mode === "signup" && <span className={styles.hint}>At least 8 characters</span>}
      </label>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <button type="submit" className="button button-submit" disabled={busy}>
        {busy ? copy.busy : copy.submit}
      </button>

      <p className={styles.switch}>
        {mode === "signin" ? "New to prelegal? " : "Already have an account? "}
        {onSwitch ? (
          <button type="button" className={styles.linkButton} onClick={() => onSwitch(other)}>
            {copy.other}
          </button>
        ) : (
          <Link href={`/${other}`}>{copy.other}</Link>
        )}
      </p>
    </form>
  );
}

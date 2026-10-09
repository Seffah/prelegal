"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "./auth";
import AuthForm, { type AuthMode } from "./AuthForm";
import styles from "./AuthForm.module.css";

/** A full-page sign in or sign up form; signed-in users go to their documents. */
export default function AuthPage({ mode }: { mode: AuthMode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/documents");
  }, [user, router]);

  return (
    <main className={styles.page}>
      <div className={styles.sheet}>
        <AuthForm mode={mode} onDone={() => router.push("/documents")} />
      </div>
    </main>
  );
}

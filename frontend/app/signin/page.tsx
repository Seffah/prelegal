import type { Metadata } from "next";

import AuthPage from "../lib/AuthPage";

export const metadata: Metadata = { title: "Sign in · prelegal" };

export default function SignInPage() {
  return <AuthPage mode="signin" />;
}

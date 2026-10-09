import type { Metadata } from "next";

import AuthPage from "../lib/AuthPage";

export const metadata: Metadata = { title: "Create account · prelegal" };

export default function SignUpPage() {
  return <AuthPage mode="signup" />;
}

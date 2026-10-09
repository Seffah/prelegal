"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { api, ApiError } from "./api";

export type User = { id: number; name: string; email: string };

export type Session = { token: string; user: User };

type Auth = {
  user: User | null;
  token: string | null;
  /** False until a stored token has been checked, so pages don't flash the signed-out state. */
  ready: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
};

const TOKEN_KEY = "prelegal.token";

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  // Restore a session from a token saved by an earlier visit.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setReady(true);
      return;
    }
    api<User>("/api/auth/me", { token })
      .then((user) => setSession({ token, user }))
      .catch((e) => {
        // The server forgets accounts when it restarts; drop tokens it no longer accepts.
        if (e instanceof ApiError && e.status === 401) localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback((next: Session) => {
    localStorage.setItem(TOKEN_KEY, next.token);
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user: session?.user ?? null, token: session?.token ?? null, ready, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider");
  return auth;
}

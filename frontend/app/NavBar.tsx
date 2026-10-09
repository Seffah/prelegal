"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "./lib/auth";
import styles from "./NavBar.module.css";

export default function NavBar() {
  const { user, ready, signOut } = useAuth();
  const pathname = usePathname();

  function navLink(href: string, label: string) {
    const current = pathname.startsWith(href);
    return (
      <Link href={href} className={styles.link} aria-current={current ? "page" : undefined}>
        {label}
      </Link>
    );
  }

  return (
    <header className={styles.bar}>
      <nav className={styles.inner} aria-label="Main">
        <Link href="/" className={styles.brand}>
          prelegal
        </Link>
        <div className={styles.links}>
          {navLink("/draft", "New draft")}
          {user && navLink("/documents", "My documents")}
        </div>
        {/* Wait for the stored session to be checked, so signed-in users don't see "Sign in". */}
        {ready && (
          <div className={styles.account}>
            {user ? (
              <>
                <span className={styles.name}>{user.name}</span>
                <button type="button" className="button button-quiet" onClick={signOut}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/signin" className={styles.link}>
                  Sign in
                </Link>
                <Link href="/signup" className="button">
                  Create account
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}

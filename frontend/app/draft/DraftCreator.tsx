"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import AuthForm, { type AuthMode } from "../lib/AuthForm";
import AgreementList from "./AgreementList";
import Chat from "./Chat";
import DocumentPreview from "./DocumentPreview";
import { downloadPdf } from "./pdf";
import { emptyDraft, type DocumentDetail, type Draft } from "./types";
import styles from "./draft.module.css";

/** What happened to the draft after its PDF was downloaded. */
type SaveState = "idle" | "saving" | "saved" | "needs-account" | "failed";

export default function DraftCreator() {
  const { token } = useAuth();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Downloading the same draft again updates its saved copy instead of adding another.
  const [savedId, setSavedId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Load the template and fields whenever the chat picks or switches the document.
  useEffect(() => {
    setDocument(null);
    setSavedId(null);
    setSaveState("idle");
    if (!draft.documentId) return;
    let current = true;
    api<DocumentDetail>(`/api/documents/${draft.documentId}`)
      .then((d) => current && setDocument(d))
      .catch((e) => {
        console.error(e);
        if (current) setError("The document could not be loaded. Reload the page to try again.");
      });
    return () => {
      current = false;
    };
  }, [draft.documentId]);

  const save = useCallback(async () => {
    if (!token) {
      setSaveState("needs-account");
      return;
    }
    setSaveState("saving");
    try {
      const saved = await api<{ id: number }>(savedId ? `/api/my-documents/${savedId}` : "/api/my-documents", {
        method: savedId ? "PUT" : "POST",
        body: draft,
        token,
      });
      setSavedId(saved.id);
      setSaveState("saved");
    } catch (e) {
      console.error(e);
      setSaveState("failed");
    }
  }, [token, savedId, draft]);

  // Signing in from the prompt below saves the document that was just downloaded.
  useEffect(() => {
    if (token && saveState === "needs-account") save();
  }, [token, saveState, save]);

  async function download() {
    if (!document) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadPdf(document, draft);
    } catch (e) {
      console.error(e);
      setError("The PDF could not be generated. Try downloading again.");
      return;
    } finally {
      setDownloading(false);
    }
    await save();
  }

  function openAuth(mode: AuthMode) {
    setAuthMode(mode);
    dialogRef.current?.showModal();
  }

  return (
    <main className={styles.layout}>
      <aside className={styles.sidebar}>
        <h1>{document?.name ?? "New draft"}</h1>
        <p className={styles.intro}>
          Tell the assistant what you need. It picks the right agreement, asks for the key terms
          and fills in the document as you answer.
        </p>
        <Chat draft={draft} onChange={setDraft} />
        <button
          type="button"
          className={`button button-submit ${styles.download}`}
          onClick={download}
          disabled={!document || downloading}
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <SaveNotice state={saveState} onRetry={save} onAuth={openAuth} />
      </aside>

      {document ? (
        <DocumentPreview document={document} draft={draft} />
      ) : (
        <section className={styles.catalog} aria-labelledby="catalog-heading">
          <h2 id="catalog-heading">Agreements you can draft</h2>
          <p>Describe your situation in the chat and the assistant will suggest one of these.</p>
          <AgreementList />
        </section>
      )}

      <dialog ref={dialogRef} className={styles.dialog} aria-label="Sign in to save your document">
        <button
          type="button"
          className={styles.close}
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>
        <AuthForm mode={authMode} onSwitch={setAuthMode} onDone={() => dialogRef.current?.close()} />
      </dialog>
    </main>
  );
}

function SaveNotice({
  state,
  onRetry,
  onAuth,
}: {
  state: SaveState;
  onRetry: () => void;
  onAuth: (mode: AuthMode) => void;
}) {
  switch (state) {
    case "saving":
      return <p className={styles.notice}>Saving to My documents…</p>;
    case "saved":
      return (
        <p className={styles.notice} role="status">
          Saved to <Link href="/documents">My documents</Link>.
        </p>
      );
    case "failed":
      return (
        <p className="form-error" role="alert">
          Your PDF downloaded, but it couldn’t be saved to My documents.{" "}
          <button type="button" className={styles.inlineButton} onClick={onRetry}>
            Try again
          </button>
        </p>
      );
    case "needs-account":
      return (
        <p className={styles.notice}>
          Want to keep a copy?{" "}
          <button type="button" className={styles.inlineButton} onClick={() => onAuth("signup")}>
            Create an account
          </button>{" "}
          or{" "}
          <button type="button" className={styles.inlineButton} onClick={() => onAuth("signin")}>
            sign in
          </button>{" "}
          to save it to My documents.
        </p>
      );
    default:
      return null;
  }
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import DocumentPreview from "../draft/DocumentPreview";
import { downloadPdf } from "../draft/pdf";
import type { DocumentDetail, Draft } from "../draft/types";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import styles from "./documents.module.css";

type SavedSummary = { id: number; documentId: string; title: string; createdAt: string; updatedAt: string };

type Saved = SavedSummary & Pick<Draft, "values" | "parties">;

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function MyDocuments() {
  const { user, token, ready } = useAuth();
  const id = useSearchParams().get("id");

  if (!ready) return null;
  if (!user || !token) {
    return (
      <main className={styles.page}>
        <div className={styles.empty}>
          <h1>My documents</h1>
          <p>Sign in to see the documents you’ve saved.</p>
          <div className={styles.actions}>
            <Link href="/signin" className="button">
              Sign in
            </Link>
            <Link href="/signup" className="button button-quiet">
              Create account
            </Link>
          </div>
        </div>
      </main>
    );
  }
  return id ? <SavedDocumentView id={id} token={token} /> : <DocumentList token={token} />;
}

function DocumentList({ token }: { token: string }) {
  const [documents, setDocuments] = useState<SavedSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<SavedSummary[]>("/api/my-documents", { token }).then(setDocuments, (e) => setError(e.message));
  }, [token]);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1>My documents</h1>
        <Link href="/draft" className="button">
          New draft
        </Link>
      </div>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      {documents?.length === 0 && (
        <div className={styles.empty}>
          <h2>No saved documents yet</h2>
          <p>When you download a PDF while signed in, a copy is saved here.</p>
          <Link href="/draft" className="button">
            Start a draft
          </Link>
        </div>
      )}

      {documents && documents.length > 0 && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Document</th>
              <th scope="col">Last saved</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/documents?id=${d.id}`}>{d.title}</Link>
                </td>
                <td>{dateFormat.format(new Date(d.updatedAt))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function SavedDocumentView({ id, token }: { id: string; token: string }) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api<Saved>(`/api/my-documents/${id}`, { token })
      .then(async (s) => {
        setSaved(s);
        setDocument(await api<DocumentDetail>(`/api/documents/${s.documentId}`));
      })
      .catch((e) => setError(e.message));
  }, [id, token]);

  async function download() {
    if (!saved || !document) return;
    setDownloading(true);
    try {
      await downloadPdf(document, saved);
    } catch (e) {
      console.error(e);
      setError("The PDF could not be generated. Try downloading again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className={styles.page}>
      <Link href="/documents" className={styles.back}>
        All documents
      </Link>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {saved && document && (
        <>
          <div className={styles.header}>
            <div>
              <h1>{saved.title}</h1>
              <p className={styles.meta}>Saved {dateFormat.format(new Date(saved.updatedAt))}</p>
            </div>
            <button type="button" className="button button-submit" onClick={download} disabled={downloading}>
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </button>
          </div>
          <DocumentPreview document={document} draft={saved} />
        </>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

import Chat from "./Chat";
import DocumentPreview from "./DocumentPreview";
import { emptyDraft, pdfFilename, type DocumentDetail, type DocumentSummary, type Draft } from "./types";
import styles from "./draft.module.css";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

export default function DraftCreator() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [catalog, setCatalog] = useState<DocumentSummary[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<DocumentSummary[]>("/api/documents").then(setCatalog, console.error);
  }, []);

  // Load the template and fields whenever the chat picks or switches the document.
  useEffect(() => {
    setDocument(null);
    if (!draft.documentId) return;
    let current = true;
    getJson<DocumentDetail>(`/api/documents/${draft.documentId}`)
      .then((d) => current && setDocument(d))
      .catch((e) => {
        console.error(e);
        if (current) setError("Sorry, the document could not be loaded. Please reload the page.");
      });
    return () => {
      current = false;
    };
  }, [draft.documentId]);

  async function download() {
    if (!document) return;
    setDownloading(true);
    setError(null);
    try {
      // Loaded on demand: the PDF renderer is large and only needed here.
      const [{ pdf }, { default: DocumentPdf }, { normalizeTemplate, parseStandardTerms }] =
        await Promise.all([import("@react-pdf/renderer"), import("./DocumentPdf"), import("./standardTerms")]);
      const standardTerms = parseStandardTerms(normalizeTemplate(document.markdown));
      const blob = await pdf(
        <DocumentPdf document={document} draft={draft} standardTerms={standardTerms} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = pdfFilename(document, draft);
      link.click();
      // Revoke after the browser has started the download.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (e) {
      console.error(e);
      setError("Sorry, the PDF could not be generated. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <main className={styles.layout}>
      <aside className={styles.sidebar}>
        <h1>{document?.name ?? "Draft an agreement"}</h1>
        <p className={styles.intro}>
          Chat with the AI to choose a document and fill in its key terms. The preview updates as
          you go.
        </p>
        <Chat draft={draft} onChange={setDraft} />
        <button
          type="button"
          className={styles.download}
          onClick={download}
          disabled={!document || downloading}
        >
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </aside>

      {document ? (
        <DocumentPreview document={document} draft={draft} />
      ) : (
        <section className={styles.catalog}>
          <h2>Documents I can draft</h2>
          <ul>
            {catalog.map((d) => (
              <li key={d.id}>
                <strong>{d.name}</strong>
                <span>{d.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

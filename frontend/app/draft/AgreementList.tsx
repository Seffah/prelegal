"use client";

import { useEffect, useState } from "react";

import { api } from "../lib/api";
import type { DocumentSummary } from "./types";

/** The agreements prelegal can draft, as served by the backend. */
export default function AgreementList({ className }: { className?: string }) {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);

  useEffect(() => {
    api<DocumentSummary[]>("/api/documents").then(setDocuments, console.error);
  }, []);

  return (
    <ul className={className}>
      {documents.map((d) => (
        <li key={d.id}>
          <strong>{d.name}</strong>
          <span>{d.description}</span>
        </li>
      ))}
    </ul>
  );
}

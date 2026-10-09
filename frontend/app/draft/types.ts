// Mirrors the API models in backend/app/documents.py and backend/app/chat.py.

export type Party = {
  company: string;
  name: string;
  title: string;
  address: string;
};

export type Field = { key: string; label: string; description: string; example: string };

export type PartyRole = { key: string; label: string };

export type DocumentSummary = { id: string; name: string; description: string };

export type DocumentDetail = DocumentSummary & {
  parties: PartyRole[];
  fields: Field[];
  /** Standard Terms markdown. */
  markdown: string;
};

/** What the chat has gathered so far. Values and parties are keyed by field and party role. */
export type Draft = {
  documentId: string | null;
  values: Record<string, string>;
  parties: Record<string, Party>;
};

export const emptyDraft: Draft = { documentId: null, values: {}, parties: {} };

const emptyParty: Party = { company: "", name: "", title: "", address: "" };

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Cover Page content shared by the on-screen preview and the PDF.

export const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/";

export function coverIntro(name: string): string {
  return (
    `This ${name} consists of this Cover Page and the Common Paper ${name} Standard Terms that ` +
    "follow. Any modifications of the Standard Terms should be made on this Cover Page, which " +
    "will control over conflicts with the Standard Terms."
  );
}

export function signingStatement(name: string): string {
  return `By signing this Cover Page, each party agrees to enter into this ${name}.`;
}

/** Key terms table rows: [label, value]. */
export function keyTermRows(document: DocumentDetail, draft: Draft): [string, string][] {
  return document.fields.map((f) => [f.label, draft.values[f.key] ?? ""]);
}

/** Signature table rows: [label, one value per party]. Signatures and dates stay blank. */
export function signatureRows(document: DocumentDetail, draft: Draft): [string, string[]][] {
  const parties = document.parties.map((p) => draft.parties[p.key] ?? emptyParty);
  return [
    ["Signature", parties.map(() => "")],
    ["Print Name", parties.map((p) => p.name)],
    ["Title", parties.map((p) => p.title)],
    ["Company", parties.map((p) => p.company)],
    ["Notice Address", parties.map((p) => p.address)],
    ["Date", parties.map(() => "")],
  ];
}

/** e.g. "Pilot-Agreement-Acme-Globex.pdf" */
export function pdfFilename(document: DocumentDetail, draft: Draft): string {
  const companies = document.parties.map((p) => draft.parties[p.key]?.company.trim() ?? "");
  const name = [document.name, ...companies.filter(Boolean)]
    .join("-")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "");
  return `${name}.pdf`;
}

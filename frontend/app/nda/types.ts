export type Party = {
  name: string;
  title: string;
  company: string;
  address: string;
};

export type NdaData = {
  purpose: string;
  /** ISO date (YYYY-MM-DD) as produced by <input type="date">. */
  effectiveDate: string;
  mndaTermType: "expires" | "continues";
  mndaTermYears: number;
  confidentialityType: "years" | "perpetual";
  confidentialityYears: number;
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: Party;
  party2: Party;
};

const emptyParty: Party = { name: "", title: "", company: "", address: "" };

export const defaultNdaData: NdaData = {
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: "",
  mndaTermType: "expires",
  mndaTermYears: 1,
  confidentialityType: "years",
  confidentialityYears: 1,
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1: emptyParty,
  party2: emptyParty,
};

export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Formats an ISO date as e.g. "October 5, 2026" without timezone shifts. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function years(n: number): string {
  return `${n} year${n === 1 ? "" : "s"}`;
}

/** A run of text in the Standard Terms, as needed to lay them out in the PDF. */
export type TextRun = { text: string; bold?: boolean; href?: string };

export type StandardTerms = {
  title: string;
  clauses: TextRun[][];
  footer: TextRun[];
};

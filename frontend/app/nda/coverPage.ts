// Cover Page content shared by the on-screen preview and the PDF.
// Mirrors templates/Mutual-NDA-coverpage.md.

import { years, type NdaData, type TextRun } from "./types";

const STANDARD_TERMS_URL = "https://commonpaper.com/standards/mutual-nda/1.0";
const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/";

export const intro: TextRun[] = [
  { text: "This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“" },
  { text: "Cover Page", bold: true },
  { text: "”) and (2) the Common Paper Mutual NDA Standard Terms Version 1.0 (“" },
  { text: "Standard Terms", bold: true },
  { text: "”) identical to those posted at " },
  { text: "commonpaper.com/standards/mutual-nda/1.0", href: STANDARD_TERMS_URL },
  {
    text:
      ". Any modifications of the Standard Terms should be made on the Cover Page, which will " +
      "control over conflicts with the Standard Terms.",
  },
];

export const signingStatement =
  "By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.";

export const attribution: TextRun[] = [
  { text: "Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under " },
  { text: "CC BY 4.0", href: CC_BY_URL },
  { text: "." },
];

export type Option = { checked: boolean; label: string };

export function mndaTermOptions(data: NdaData): Option[] {
  return [
    {
      checked: data.mndaTermType === "expires",
      label: `Expires ${years(data.mndaTermYears)} from Effective Date.`,
    },
    {
      checked: data.mndaTermType === "continues",
      label: "Continues until terminated in accordance with the terms of the MNDA.",
    },
  ];
}

export function confidentialityOptions(data: NdaData): Option[] {
  return [
    {
      checked: data.confidentialityType === "years",
      label:
        `${years(data.confidentialityYears)} from Effective Date, but in the case of trade ` +
        "secrets until Confidential Information is no longer considered a trade secret under " +
        "applicable laws.",
    },
    { checked: data.confidentialityType === "perpetual", label: "In perpetuity." },
  ];
}

/** Signature table rows: [label, party 1, party 2]. Signatures and dates stay blank. */
export function partyRows({ party1, party2 }: NdaData): [string, string, string][] {
  return [
    ["Signature", "", ""],
    ["Print Name", party1.name, party2.name],
    ["Title", party1.title, party2.title],
    ["Company", party1.company, party2.company],
    ["Notice Address", party1.address, party2.address],
    ["Date", "", ""],
  ];
}

export function modificationsText(data: NdaData): string {
  return data.modifications.trim() || "None.";
}

/** e.g. "Mutual-NDA-Acme-Globex.pdf" */
export function pdfFilename(data: NdaData): string {
  const companies = [data.party1.company, data.party2.company].map((c) => c.trim()).filter(Boolean);
  const name = ["Mutual-NDA", ...companies].join("-").replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/-$/, "");
  return `${name}.pdf`;
}

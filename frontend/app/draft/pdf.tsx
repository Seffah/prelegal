import { pdfFilename, type DocumentDetail, type Draft } from "./types";

/** Generates the document's PDF in the browser and starts the download. */
export async function downloadPdf(document: DocumentDetail, draft: Draft): Promise<void> {
  // Loaded on demand: the PDF renderer is large and only needed here.
  const [{ pdf }, { default: DocumentPdf }, { normalizeTemplate, parseStandardTerms }] =
    await Promise.all([import("@react-pdf/renderer"), import("./DocumentPdf"), import("./standardTerms")]);
  const standardTerms = parseStandardTerms(normalizeTemplate(document.markdown));
  const blob = await pdf(<DocumentPdf document={document} draft={draft} standardTerms={standardTerms} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = pdfFilename(document, draft);
  link.click();
  // Revoke after the browser has started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

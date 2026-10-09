"use client";

import { useEffect, useState, type ReactNode } from "react";

import { pdfFilename } from "./coverPage";
import NdaChat from "./NdaChat";
import NdaDocument from "./NdaDocument";
import { defaultNdaData, todayIso, type NdaData, type StandardTerms } from "./types";
import styles from "./nda.module.css";

type Props = {
  /** Server-rendered Standard Terms for the on-screen preview. */
  standardTerms: ReactNode;
  /** The same Standard Terms as text runs for the PDF. */
  pdfStandardTerms: StandardTerms;
};

export default function NdaCreator({ standardTerms, pdfStandardTerms }: Props) {
  const [data, setData] = useState<NdaData>(defaultNdaData);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set the default date on the client; the page is prerendered at build time.
  useEffect(() => {
    setData((d) => (d.effectiveDate ? d : { ...d, effectiveDate: todayIso() }));
  }, []);

  async function download() {
    setDownloading(true);
    setError(null);
    try {
      // Loaded on demand: the PDF renderer is large and only needed here.
      const [{ pdf }, { default: NdaPdf }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./NdaPdf"),
      ]);
      const blob = await pdf(<NdaPdf data={data} standardTerms={pdfStandardTerms} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFilename(data);
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
        <h1>Mutual NDA creator</h1>
        <p className={styles.intro}>
          Chat with the AI to fill in the key terms. The agreement updates as you go.
        </p>
        <NdaChat data={data} onChange={setData} />
        <button type="button" className={styles.download} onClick={download} disabled={downloading}>
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </button>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </aside>
      <NdaDocument data={data} standardTerms={standardTerms} />
    </main>
  );
}

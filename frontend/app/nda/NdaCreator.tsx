"use client";

import { useEffect, useState, type ReactNode } from "react";

import NdaDocument from "./NdaDocument";
import NdaForm from "./NdaForm";
import { defaultNdaData, todayIso, type NdaData } from "./types";
import styles from "./nda.module.css";

export default function NdaCreator({ standardTerms }: { standardTerms: ReactNode }) {
  const [data, setData] = useState<NdaData>(defaultNdaData);

  // Set the default date on the client; the page is prerendered at build time.
  useEffect(() => {
    setData((d) => (d.effectiveDate ? d : { ...d, effectiveDate: todayIso() }));
  }, []);

  function download() {
    // The browser uses the document title as the suggested PDF filename.
    const companies = [data.party1.company, data.party2.company].filter(Boolean);
    const previousTitle = document.title;
    document.title = ["Mutual-NDA", ...companies].join("-").replace(/\s+/g, "-");
    window.print();
    document.title = previousTitle;
  }

  return (
    <main className={styles.layout}>
      <aside className={styles.sidebar}>
        <h1>Mutual NDA creator</h1>
        <p className={styles.intro}>
          Fill in the key terms. The agreement on the right updates as you type.
        </p>
        <NdaForm data={data} onChange={setData} />
        <button type="button" className={styles.download} onClick={download}>
          Download PDF
        </button>
      </aside>
      <NdaDocument data={data} standardTerms={standardTerms} />
    </main>
  );
}

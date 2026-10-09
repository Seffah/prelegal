import { useMemo } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import { normalizeTemplate } from "./standardTerms";
import {
  CC_BY_URL,
  coverIntro,
  keyTermRows,
  signatureRows,
  signingStatement,
  type DocumentDetail,
  type Draft,
} from "./types";
import styles from "./draft.module.css";

/** A filled-in value, or a highlighted placeholder when it is still empty. */
function Value({ value }: { value: string }) {
  return value.trim() ? (
    <span className={styles.filled}>{value}</span>
  ) : (
    <span className={styles.blank}>[To be completed]</span>
  );
}

type Props = {
  document: DocumentDetail;
  draft: Draft;
};

export default function DocumentPreview({ document, draft }: Props) {
  // The templates are trusted repo content; their spans mark Cover Page variables.
  const standardTerms = useMemo(
    () => (
      <Markdown rehypePlugins={[rehypeRaw]} components={{ h1: "h2" }}>
        {normalizeTemplate(document.markdown)}
      </Markdown>
    ),
    [document.markdown],
  );

  return (
    <article className={styles.document}>
      <h1>{document.name}</h1>

      <h2>Cover Page</h2>
      <p>{coverIntro(document.name)}</p>

      <table className={styles.keyTerms}>
        <tbody>
          {keyTermRows(document, draft).map(([label, value]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>
                <Value value={value} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>{signingStatement(document.name)}</p>

      <table className={styles.signatures}>
        <thead>
          <tr>
            <th />
            {document.parties.map((p) => (
              <th key={p.key}>{p.label.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {signatureRows(document, draft).map(([label, values]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {values.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <p className={styles.attribution}>
        Common Paper {document.name} free to use under <a href={CC_BY_URL}>CC BY 4.0</a>.
      </p>

      <section className={styles.standardTerms}>{standardTerms}</section>
    </article>
  );
}

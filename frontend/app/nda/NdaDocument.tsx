import type { ReactNode } from "react";

import {
  attribution,
  confidentialityOptions,
  intro,
  mndaTermOptions,
  modificationsText,
  partyRows,
  signingStatement,
  type Option,
} from "./coverPage";
import { formatDate, type NdaData, type TextRun } from "./types";
import styles from "./nda.module.css";

/** A filled-in value, or a highlighted placeholder when it is still empty. */
function Field({ value, placeholder }: { value: string; placeholder: string }) {
  return value.trim() ? (
    <span className={styles.filled}>{value}</span>
  ) : (
    <span className={styles.blank}>[{placeholder}]</span>
  );
}

function Runs({ runs }: { runs: TextRun[] }) {
  return runs.map((run, i) => {
    const text = run.bold ? <strong>{run.text}</strong> : run.text;
    return run.href ? (
      <a key={i} href={run.href}>
        {text}
      </a>
    ) : (
      <span key={i}>{text}</span>
    );
  });
}

function Checklist({ options }: { options: Option[] }) {
  return (
    <ul className={styles.checklist}>
      {options.map((o) => (
        <li key={o.label} className={o.checked ? undefined : styles.unchecked}>
          <span aria-hidden>{o.checked ? "☒" : "☐"}</span> {o.label}
        </li>
      ))}
    </ul>
  );
}

type Props = {
  data: NdaData;
  standardTerms: ReactNode;
};

export default function NdaDocument({ data, standardTerms }: Props) {
  return (
    <article className={styles.document}>
      <h1>Mutual Non-Disclosure Agreement</h1>

      <h2>Using this Mutual Non-Disclosure Agreement</h2>
      <p>
        <Runs runs={intro} />
      </p>

      <h3>Purpose</h3>
      <p>
        <Field value={data.purpose} placeholder="How Confidential Information may be used" />
      </p>

      <h3>Effective Date</h3>
      <p>
        <Field value={formatDate(data.effectiveDate)} placeholder="Effective date" />
      </p>

      <h3>MNDA Term</h3>
      <Checklist options={mndaTermOptions(data)} />

      <h3>Term of Confidentiality</h3>
      <Checklist options={confidentialityOptions(data)} />

      <h3>Governing Law &amp; Jurisdiction</h3>
      <p>
        Governing Law: <Field value={data.governingLaw} placeholder="State" />
      </p>
      <p>
        Jurisdiction: <Field value={data.jurisdiction} placeholder="City or county and state" />
      </p>

      <h3>MNDA Modifications</h3>
      <p className={styles.preWrap}>{modificationsText(data)}</p>

      <p>{signingStatement}</p>

      <table className={styles.signatures}>
        <thead>
          <tr>
            <th />
            <th>PARTY 1</th>
            <th>PARTY 2</th>
          </tr>
        </thead>
        <tbody>
          {partyRows(data).map(([label, v1, v2]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{v1}</td>
              <td>{v2}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={styles.attribution}>
        <Runs runs={attribution} />
      </p>

      <section className={styles.standardTerms}>{standardTerms}</section>
    </article>
  );
}

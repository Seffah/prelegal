import type { ReactNode } from "react";

import { formatDate, years, type NdaData } from "./types";
import styles from "./nda.module.css";

const STANDARD_TERMS_URL = "https://commonpaper.com/standards/mutual-nda/1.0";
const CC_BY_URL = "https://creativecommons.org/licenses/by/4.0/";

/** A filled-in value, or a highlighted placeholder when it is still empty. */
function Field({ value, placeholder }: { value: string; placeholder: string }) {
  return value.trim() ? (
    <span className={styles.filled}>{value}</span>
  ) : (
    <span className={styles.blank}>[{placeholder}]</span>
  );
}

function Check({ checked, children }: { checked: boolean; children: ReactNode }) {
  return (
    <li className={checked ? styles.checked : styles.unchecked}>
      <span aria-hidden>{checked ? "☒" : "☐"}</span> {children}
    </li>
  );
}

type Props = {
  data: NdaData;
  standardTerms: ReactNode;
};

export default function NdaDocument({ data, standardTerms }: Props) {
  const { party1, party2 } = data;
  const partyRows: [string, string, string][] = [
    ["Signature", "", ""],
    ["Print Name", party1.name, party2.name],
    ["Title", party1.title, party2.title],
    ["Company", party1.company, party2.company],
    ["Notice Address", party1.address, party2.address],
    ["Date", "", ""],
  ];

  return (
    <article className={styles.document}>
      <h1>Mutual Non-Disclosure Agreement</h1>

      <h2>Using this Mutual Non-Disclosure Agreement</h2>
      <p>
        This Mutual Non-Disclosure Agreement (the “MNDA”) consists of: (1) this Cover Page (“
        <strong>Cover Page</strong>”) and (2) the Common Paper Mutual NDA Standard Terms Version 1.0
        (“<strong>Standard Terms</strong>”) identical to those posted at{" "}
        <a href={STANDARD_TERMS_URL}>commonpaper.com/standards/mutual-nda/1.0</a>. Any modifications
        of the Standard Terms should be made on the Cover Page, which will control over conflicts
        with the Standard Terms.
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
      <ul className={styles.checklist}>
        <Check checked={data.mndaTermType === "expires"}>
          Expires {years(data.mndaTermYears)} from Effective Date.
        </Check>
        <Check checked={data.mndaTermType === "continues"}>
          Continues until terminated in accordance with the terms of the MNDA.
        </Check>
      </ul>

      <h3>Term of Confidentiality</h3>
      <ul className={styles.checklist}>
        <Check checked={data.confidentialityType === "years"}>
          {years(data.confidentialityYears)} from Effective Date, but in the case of trade secrets
          until Confidential Information is no longer considered a trade secret under applicable
          laws.
        </Check>
        <Check checked={data.confidentialityType === "perpetual"}>In perpetuity.</Check>
      </ul>

      <h3>Governing Law &amp; Jurisdiction</h3>
      <p>
        Governing Law: <Field value={data.governingLaw} placeholder="State" />
      </p>
      <p>
        Jurisdiction: <Field value={data.jurisdiction} placeholder="City or county and state" />
      </p>

      <h3>MNDA Modifications</h3>
      <p className={styles.preWrap}>{data.modifications.trim() || "None."}</p>

      <p>By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.</p>

      <table className={styles.signatures}>
        <thead>
          <tr>
            <th />
            <th>PARTY 1</th>
            <th>PARTY 2</th>
          </tr>
        </thead>
        <tbody>
          {partyRows.map(([label, v1, v2]) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              <td>{v1}</td>
              <td>{v2}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className={styles.attribution}>
        Common Paper Mutual Non-Disclosure Agreement (Version 1.0) free to use under{" "}
        <a href={CC_BY_URL}>CC BY 4.0</a>.
      </p>

      <section className={styles.standardTerms}>{standardTerms}</section>
    </article>
  );
}

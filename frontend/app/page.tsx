import Link from "next/link";

import AgreementList from "./draft/AgreementList";
import styles from "./home.module.css";

// The hero shows a cover page as the assistant fills it in from one message.
const COVER_ROWS: [string, string][] = [
  ["Purpose", "Sharing our product roadmap ahead of a partnership"],
  ["Effective Date", "October 12, 2026"],
  ["MNDA Term", "Expires 1 year from Effective Date"],
  ["Governing Law", "Delaware"],
  ["Party 1", "Acme Inc"],
  ["Party 2", "Globex LLC"],
];

const STEPS = [
  {
    title: "Describe what you need",
    text: "Explain the deal in your own words. The assistant suggests the right agreement, or tells you if it can’t draft that one.",
  },
  {
    title: "Answer a few questions",
    text: "It asks for the key terms one or two at a time, and fills in the document as you reply.",
  },
  {
    title: "Download the PDF",
    text: "Get a ready-to-sign agreement. Signed in, a copy is saved to My documents.",
  },
];

export default function Home() {
  return (
    <>
      <main>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>Draft a standard agreement by describing the deal.</h1>
            <p>
              prelegal’s assistant picks the right Common Paper template, asks for the key terms
              and fills in a ready-to-sign PDF. NDAs, cloud service agreements, DPAs and more.
            </p>
            <div className={styles.ctas}>
              <Link href="/draft" className="button">
                Start a draft
              </Link>
              <a href="#agreements" className="button button-quiet">
                See the agreements
              </a>
            </div>
          </div>

          <figure className={styles.demo} aria-label="Example: a chat message filling in a Mutual NDA">
            <p className={styles.bubble}>
              We’re Acme. We want to share our roadmap with Globex next Monday, under Delaware law.
            </p>
            <div className={styles.sheet}>
              <p className={styles.sheetTitle}>Mutual Non-Disclosure Agreement</p>
              <p className={styles.sheetSubtitle}>Cover Page</p>
              <dl>
                {COVER_ROWS.map(([label, value], i) => (
                  <div key={label} className={styles.row}>
                    <dt>{label}</dt>
                    <dd>
                      <mark style={{ animationDelay: `${0.5 + i * 0.25}s` }}>{value}</mark>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </figure>
        </section>

        <section className={styles.steps} aria-labelledby="steps-heading">
          <h2 id="steps-heading">How it works</h2>
          <ol>
            {STEPS.map((step) => (
              <li key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="agreements" className={styles.agreements} aria-labelledby="agreements-heading">
          <h2 id="agreements-heading">Agreements you can draft</h2>
          <AgreementList className={styles.agreementList} />
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          Agreements use <a href="https://commonpaper.com">Common Paper</a> standard terms, free to
          use under <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. prelegal
          isn’t a law firm and doesn’t give legal advice.
        </p>
      </footer>
    </>
  );
}

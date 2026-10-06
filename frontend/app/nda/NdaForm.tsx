"use client";

import { useState } from "react";

import type { NdaData, Party } from "./types";
import styles from "./nda.module.css";

type Props = {
  data: NdaData;
  onChange: (data: NdaData) => void;
};

export default function NdaForm({ data, onChange }: Props) {
  function set<K extends keyof NdaData>(key: K, value: NdaData[K]) {
    onChange({ ...data, [key]: value });
  }

  function setParty(key: "party1" | "party2", field: keyof Party, value: string) {
    onChange({ ...data, [key]: { ...data[key], [field]: value } });
  }

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
      <fieldset>
        <legend>Agreement terms</legend>

        <label>
          Purpose
          <span className={styles.hint}>How Confidential Information may be used</span>
          <textarea rows={3} value={data.purpose} onChange={(e) => set("purpose", e.target.value)} />
        </label>

        <label>
          Effective date
          <input
            type="date"
            value={data.effectiveDate}
            onChange={(e) => set("effectiveDate", e.target.value)}
          />
        </label>

        <div className={styles.group}>
          <span className={styles.groupLabel}>MNDA term</span>
          <label className={styles.choice}>
            <input
              type="radio"
              name="mndaTermType"
              checked={data.mndaTermType === "expires"}
              onChange={() => set("mndaTermType", "expires")}
            />
            Expires
            <YearsInput
              value={data.mndaTermYears}
              disabled={data.mndaTermType !== "expires"}
              onChange={(n) => set("mndaTermYears", n)}
            />
            from the effective date
          </label>
          <label className={styles.choice}>
            <input
              type="radio"
              name="mndaTermType"
              checked={data.mndaTermType === "continues"}
              onChange={() => set("mndaTermType", "continues")}
            />
            Continues until terminated
          </label>
        </div>

        <div className={styles.group}>
          <span className={styles.groupLabel}>Term of confidentiality</span>
          <label className={styles.choice}>
            <input
              type="radio"
              name="confidentialityType"
              checked={data.confidentialityType === "years"}
              onChange={() => set("confidentialityType", "years")}
            />
            <YearsInput
              value={data.confidentialityYears}
              disabled={data.confidentialityType !== "years"}
              onChange={(n) => set("confidentialityYears", n)}
            />
            from the effective date
          </label>
          <label className={styles.choice}>
            <input
              type="radio"
              name="confidentialityType"
              checked={data.confidentialityType === "perpetual"}
              onChange={() => set("confidentialityType", "perpetual")}
            />
            In perpetuity
          </label>
        </div>

        <label>
          Governing law (state)
          <input
            type="text"
            placeholder="Delaware"
            value={data.governingLaw}
            onChange={(e) => set("governingLaw", e.target.value)}
          />
        </label>

        <label>
          Jurisdiction
          <input
            type="text"
            placeholder="courts located in New Castle, DE"
            value={data.jurisdiction}
            onChange={(e) => set("jurisdiction", e.target.value)}
          />
        </label>

        <label>
          MNDA modifications
          <span className={styles.hint}>Optional</span>
          <textarea
            rows={3}
            value={data.modifications}
            onChange={(e) => set("modifications", e.target.value)}
          />
        </label>
      </fieldset>

      {(["party1", "party2"] as const).map((key, i) => (
        <fieldset key={key}>
          <legend>Party {i + 1}</legend>
          <PartyInput label="Company" value={data[key].company} onChange={(v) => setParty(key, "company", v)} />
          <PartyInput label="Signatory name" value={data[key].name} onChange={(v) => setParty(key, "name", v)} />
          <PartyInput label="Title" value={data[key].title} onChange={(v) => setParty(key, "title", v)} />
          <PartyInput
            label="Notice address"
            hint="Email or postal address"
            value={data[key].address}
            onChange={(v) => setParty(key, "address", v)}
          />
        </fieldset>
      ))}
    </form>
  );
}

const MAX_YEARS = 99;

function YearsInput(props: { value: number; disabled: boolean; onChange: (n: number) => void }) {
  // Keep the raw text so the field can be cleared while typing; only valid
  // values reach the parent, and blur restores the last valid value.
  const [text, setText] = useState(String(props.value));

  return (
    <span className={styles.years}>
      <input
        type="number"
        min={1}
        max={MAX_YEARS}
        aria-label="Number of years"
        value={text}
        disabled={props.disabled}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          if (n >= 1) {
            const clamped = Math.min(MAX_YEARS, n);
            setText(String(clamped));
            props.onChange(clamped);
          } else {
            setText(e.target.value);
          }
        }}
        onBlur={() => setText(String(props.value))}
      />
      year(s)
    </span>
  );
}

function PartyInput(props: { label: string; hint?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label>
      {props.label}
      {props.hint && <span className={styles.hint}>{props.hint}</span>}
      <input type="text" value={props.value} onChange={(e) => props.onChange(e.target.value)} />
    </label>
  );
}

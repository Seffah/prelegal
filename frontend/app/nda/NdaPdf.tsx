import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

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
import { formatDate, type NdaData, type StandardTerms, type TextRun } from "./types";

// Don't hyphenate words across lines; it reads badly in legal text.
Font.registerHyphenationCallback((word) => [word]);

// Built-in PDF fonts, so nothing has to be downloaded to generate the file.
const styles = StyleSheet.create({
  page: { padding: 54, fontFamily: "Times-Roman", fontSize: 11, lineHeight: 1.4 },
  bold: { fontWeight: "bold" },
  title: { fontWeight: "bold", fontSize: 18, textAlign: "center", marginBottom: 18 },
  h2: { fontWeight: "bold", fontSize: 12, textTransform: "uppercase", marginBottom: 8 },
  h3: { fontWeight: "bold", fontSize: 11, marginTop: 12, marginBottom: 3 },
  paragraph: { marginBottom: 6 },
  link: { color: "#1f3a5f", textDecoration: "underline" },
  option: { flexDirection: "row", marginBottom: 3 },
  optionUnchecked: { color: "#777" },
  checkbox: {
    width: 9,
    height: 9,
    marginTop: 3,
    marginRight: 6,
    borderWidth: 0.75,
    borderColor: "#000",
    fontSize: 8,
    lineHeight: 1,
    textAlign: "center",
  },
  optionLabel: { flex: 1 },
  table: { marginVertical: 14, borderTopWidth: 0.75, borderLeftWidth: 0.75, borderColor: "#888" },
  row: { flexDirection: "row", minHeight: 26 },
  cell: { flexGrow: 1, flexBasis: 0, padding: 5, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: "#888" },
  labelCell: { flexGrow: 0, flexBasis: 100, fontWeight: "bold" },
  headerCell: { fontWeight: "bold", textAlign: "center" },
  attribution: { fontSize: 9, color: "#555" },
  clause: { flexDirection: "row", marginBottom: 8 },
  clauseNumber: { width: 20 },
  clauseText: { flex: 1, textAlign: "justify" },
});

/**
 * react-pdf treats a style change inside a word (e.g. a bold term followed by
 * `”).`) as a hyphenation point and may break the line there with a stray "-".
 * Move punctuation that touches a neighbouring run into that run so no word
 * spans two runs. Links are left intact.
 */
function glue(runs: TextRun[]): TextRun[] {
  const out = runs.map((r) => ({ ...r }));
  for (let i = 1; i < out.length; i++) {
    const prev = out[i - 1];
    const next = out[i];
    const leading = next.text.match(/^[^\s\w]+/)?.[0];
    const trailing = prev.text.match(/[^\s\w]+$/)?.[0];
    if (leading && !prev.href && /\S$/.test(prev.text)) {
      prev.text += leading;
      next.text = next.text.slice(leading.length);
    } else if (trailing && !next.href && /^\S/.test(next.text)) {
      prev.text = prev.text.slice(0, -trailing.length);
      next.text = trailing + next.text;
    }
  }
  return out.filter((r) => r.text);
}

function Runs({ runs }: { runs: TextRun[] }) {
  return glue(runs).map((run, i) =>
    run.href ? (
      <Link key={i} src={run.href} style={styles.link}>
        {run.text}
      </Link>
    ) : (
      <Text key={i} style={run.bold ? styles.bold : undefined}>
        {run.text}
      </Text>
    ),
  );
}

function Field({ value, placeholder }: { value: string; placeholder: string }) {
  return <>{value.trim() || `[${placeholder}]`}</>;
}

function Checklist({ options }: { options: Option[] }) {
  return options.map((o) => (
    <View key={o.label} style={o.checked ? styles.option : [styles.option, styles.optionUnchecked]}>
      <Text style={styles.checkbox}>{o.checked ? "X" : " "}</Text>
      <Text style={styles.optionLabel}>{o.label}</Text>
    </View>
  ));
}

type Props = {
  data: NdaData;
  standardTerms: StandardTerms;
};

export default function NdaPdf({ data, standardTerms }: Props) {
  return (
    <Document title="Mutual Non-Disclosure Agreement" creator="prelegal">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>

        <Text style={styles.h2}>Using this Mutual Non-Disclosure Agreement</Text>
        <Text style={styles.paragraph}>
          <Runs runs={intro} />
        </Text>

        <Text style={styles.h3}>Purpose</Text>
        <Text>
          <Field value={data.purpose} placeholder="How Confidential Information may be used" />
        </Text>

        <Text style={styles.h3}>Effective Date</Text>
        <Text>
          <Field value={formatDate(data.effectiveDate)} placeholder="Effective date" />
        </Text>

        <Text style={styles.h3}>MNDA Term</Text>
        <Checklist options={mndaTermOptions(data)} />

        <Text style={styles.h3}>Term of Confidentiality</Text>
        <Checklist options={confidentialityOptions(data)} />

        <Text style={styles.h3}>Governing Law &amp; Jurisdiction</Text>
        <Text style={styles.paragraph}>
          Governing Law: <Field value={data.governingLaw} placeholder="State" />
        </Text>
        <Text>
          Jurisdiction: <Field value={data.jurisdiction} placeholder="City or county and state" />
        </Text>

        <Text style={styles.h3}>MNDA Modifications</Text>
        <Text style={styles.paragraph}>{modificationsText(data)}</Text>

        <Text style={styles.paragraph}>{signingStatement}</Text>

        <View style={styles.table} wrap={false}>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.labelCell]} />
            <Text style={[styles.cell, styles.headerCell]}>PARTY 1</Text>
            <Text style={[styles.cell, styles.headerCell]}>PARTY 2</Text>
          </View>
          {partyRows(data).map(([label, v1, v2]) => (
            <View key={label} style={styles.row}>
              <Text style={[styles.cell, styles.labelCell]}>{label}</Text>
              <Text style={styles.cell}>{v1}</Text>
              <Text style={styles.cell}>{v2}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.attribution}>
          <Runs runs={attribution} />
        </Text>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h2}>{standardTerms.title}</Text>
        {standardTerms.clauses.map((clause, i) => (
          <View key={i} style={styles.clause}>
            <Text style={styles.clauseNumber}>{i + 1}.</Text>
            <Text style={styles.clauseText}>
              <Runs runs={clause} />
            </Text>
          </View>
        ))}
        <Text style={styles.attribution}>
          <Runs runs={standardTerms.footer} />
        </Text>
      </Page>
    </Document>
  );
}

import { Document, Font, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import type { Block, StandardTerms, TextRun } from "./standardTerms";
import {
  CC_BY_URL,
  coverIntro,
  keyTermRows,
  signatureRows,
  signingStatement,
  type DocumentDetail,
  type Draft,
} from "./types";

// Don't hyphenate words across lines; it reads badly in legal text.
Font.registerHyphenationCallback((word) => [word]);

// Built-in PDF fonts, so nothing has to be downloaded to generate the file.
const styles = StyleSheet.create({
  page: { padding: 54, fontFamily: "Times-Roman", fontSize: 11, lineHeight: 1.4 },
  bold: { fontWeight: "bold" },
  title: { fontWeight: "bold", fontSize: 18, textAlign: "center", marginBottom: 18 },
  h2: { fontWeight: "bold", fontSize: 12, textTransform: "uppercase", marginBottom: 8 },
  paragraph: { marginBottom: 6, textAlign: "justify" },
  link: { color: "#1f3a5f", textDecoration: "underline" },
  table: { marginVertical: 14, borderTopWidth: 0.75, borderLeftWidth: 0.75, borderColor: "#888" },
  row: { flexDirection: "row", minHeight: 26 },
  cell: { flexGrow: 1, flexBasis: 0, padding: 5, borderRightWidth: 0.75, borderBottomWidth: 0.75, borderColor: "#888" },
  labelCell: { flexGrow: 0, flexBasis: 140, fontWeight: "bold" },
  headerCell: { fontWeight: "bold", textAlign: "center" },
  attribution: { fontSize: 9, color: "#555" },
  item: { flexDirection: "row", marginBottom: 4 },
  number: { width: 28 },
  itemBody: { flex: 1 },
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

/**
 * Renders Standard Terms blocks. Ordered clauses are numbered like the Common Paper
 * originals (1., 1.1, ...); sub-clauses such as "a." already carry their label.
 */
function Blocks({ blocks, prefix = "" }: { blocks: Block[]; prefix?: string }) {
  return blocks.map((block, i) =>
    block.kind === "paragraph" ? (
      <Text key={i} style={styles.paragraph}>
        <Runs runs={block.runs} />
      </Text>
    ) : (
      <View key={i}>
        {block.items.map((item, j) => {
          const number = block.ordered ? `${prefix}${j + 1}` : "";
          return (
            <View key={j} style={styles.item}>
              {block.ordered && <Text style={styles.number}>{prefix ? number : `${number}.`}</Text>}
              <View style={styles.itemBody}>
                <Blocks blocks={item} prefix={number ? `${number}.` : prefix} />
              </View>
            </View>
          );
        })}
      </View>
    ),
  );
}

type Props = {
  document: DocumentDetail;
  draft: Draft;
  standardTerms: StandardTerms;
};

export default function DocumentPdf({ document, draft, standardTerms }: Props) {
  return (
    <Document title={document.name} creator="prelegal">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{document.name}</Text>

        <Text style={styles.h2}>Cover Page</Text>
        <Text style={styles.paragraph}>{coverIntro(document.name)}</Text>

        <View style={styles.table}>
          {keyTermRows(document, draft).map(([label, value]) => (
            <View key={label} style={styles.row} wrap={false}>
              <Text style={[styles.cell, styles.labelCell]}>{label}</Text>
              <Text style={styles.cell}>{value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.paragraph}>{signingStatement(document.name)}</Text>

        <View style={styles.table} wrap={false}>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.labelCell]} />
            {document.parties.map((p) => (
              <Text key={p.key} style={[styles.cell, styles.headerCell]}>
                {p.label.toUpperCase()}
              </Text>
            ))}
          </View>
          {signatureRows(document, draft).map(([label, values]) => (
            <View key={label} style={styles.row}>
              <Text style={[styles.cell, styles.labelCell]}>{label}</Text>
              {values.map((v, i) => (
                <Text key={i} style={styles.cell}>
                  {v}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Text style={styles.attribution}>
          Common Paper {document.name} free to use under{" "}
          <Link src={CC_BY_URL} style={styles.link}>
            CC BY 4.0
          </Link>
          .
        </Text>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.h2}>{standardTerms.title}</Text>
        <Blocks blocks={standardTerms.blocks} />
      </Page>
    </Document>
  );
}

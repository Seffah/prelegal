import type { List, PhrasingContent, RootContent } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";

/** A run of text in the Standard Terms, as needed to lay them out in the PDF. */
export type TextRun = { text: string; bold?: boolean; href?: string };

export type Block =
  | { kind: "paragraph"; runs: TextRun[] }
  | { kind: "list"; ordered: boolean; items: Block[][] };

export type StandardTerms = { title: string; blocks: Block[] };

/**
 * Common Paper templates write sub-clauses as indented "a." or "iv." lines, which markdown
 * does not treat as list items, so they would run into the paragraph above. Turn them into
 * bullet items that keep their own label, nested at the same depth.
 */
export function normalizeTemplate(markdown: string): string {
  return markdown.replace(/^( {8,})((?:[a-z]|[ivx]+)\.\s)/gm, "$1- $2");
}

/**
 * Parses normalized Standard Terms markdown into nested blocks of text runs for the PDF.
 * Template variables (<span class="..._link">) and clause headings become bold runs.
 */
export function parseStandardTerms(markdown: string): StandardTerms {
  const root = unified().use(remarkParse).parse(markdown);
  let title = "Standard Terms";
  const blocks: Block[] = [];
  for (const node of root.children) {
    if (node.type === "heading") title = toRuns(node.children).map((r) => r.text).join("");
    else blocks.push(...toBlocks(node));
  }
  return { title, blocks };
}

function toBlocks(node: RootContent): Block[] {
  if (node.type === "paragraph") return [{ kind: "paragraph", runs: toRuns(node.children) }];
  if (node.type === "list") return [listBlock(node)];
  return [];
}

function listBlock(list: List): Block {
  return {
    kind: "list",
    ordered: Boolean(list.ordered),
    items: list.children.map((item) => item.children.flatMap(toBlocks)),
  };
}

function toRuns(nodes: PhrasingContent[]): TextRun[] {
  const runs: TextRun[] = [];
  // Raw HTML arrives as separate open/close nodes around the inner text.
  let inSpan = false;

  function walk(node: PhrasingContent, bold: boolean, href?: string) {
    switch (node.type) {
      case "text":
        // Soft line breaks inside a paragraph read as spaces.
        runs.push({ text: node.value.replace(/\s*\n\s*/g, " "), bold: bold || inSpan, href });
        break;
      case "strong":
        node.children.forEach((c) => walk(c, true, href));
        break;
      case "link":
        node.children.forEach((c) => walk(c, bold, node.url));
        break;
      case "html":
        if (node.value.startsWith("<span")) inSpan = /class="/.test(node.value);
        else if (node.value.startsWith("</span")) inSpan = false;
        break;
      default:
        if ("children" in node) node.children.forEach((c) => walk(c as PhrasingContent, bold, href));
    }
  }

  nodes.forEach((n) => walk(n, false));
  return runs;
}

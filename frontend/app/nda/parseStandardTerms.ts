import type { Heading, List, Paragraph, PhrasingContent, RootContent } from "mdast";
import remarkParse from "remark-parse";
import { unified } from "unified";

import type { StandardTerms, TextRun } from "./types";

/**
 * Parses the Common Paper Standard Terms markdown (a heading, a numbered list
 * of clauses and a footer paragraph) into plain text runs for the PDF.
 * Cover Page references (<span class="coverpage_link">) become bold runs.
 */
export function parseStandardTerms(markdown: string): StandardTerms {
  const root = unified().use(remarkParse).parse(markdown);
  const heading = root.children.find((n): n is Heading => n.type === "heading");
  const list = root.children.find((n): n is List => n.type === "list");
  const footer = root.children.findLast((n): n is Paragraph => n.type === "paragraph");

  return {
    title: heading ? toRuns(heading.children).map((r) => r.text).join("") : "Standard Terms",
    clauses: (list?.children ?? []).map((item) =>
      item.children.flatMap((block: RootContent) =>
        block.type === "paragraph" ? toRuns(block.children) : [],
      ),
    ),
    footer: footer ? toRuns(footer.children) : [],
  };
}

function toRuns(nodes: PhrasingContent[]): TextRun[] {
  const runs: TextRun[] = [];
  // Raw HTML arrives as separate open/close nodes around the inner text.
  let inSpan = false;

  function walk(node: PhrasingContent, bold: boolean, href?: string) {
    switch (node.type) {
      case "text":
        runs.push({ text: node.value, bold: bold || inSpan, href });
        break;
      case "strong":
        node.children.forEach((c) => walk(c, true, href));
        break;
      case "link":
        node.children.forEach((c) => walk(c, bold, node.url));
        break;
      case "html":
        if (node.value.startsWith("<span")) inSpan = true;
        else if (node.value.startsWith("</span")) inSpan = false;
        break;
      default:
        if ("children" in node) node.children.forEach((c) => walk(c as PhrasingContent, bold, href));
    }
  }

  nodes.forEach((n) => walk(n, false));
  return runs;
}

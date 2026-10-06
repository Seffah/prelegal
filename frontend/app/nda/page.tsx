import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";

import NdaCreator from "./NdaCreator";

export const metadata: Metadata = {
  title: "Mutual NDA creator · prelegal",
  description: "Fill in the key terms and download a Common Paper Mutual NDA",
};

// Templates live in the repo-root templates/ directory (see catalog.json).
const TEMPLATES_DIR = path.join(process.cwd(), "..", "templates");

export default async function NdaPage() {
  // The Standard Terms reference Cover Page fields by name, so their text is
  // static and can be rendered once on the server.
  const standardTerms = await readFile(path.join(TEMPLATES_DIR, "Mutual-NDA.md"), "utf8");

  return (
    <NdaCreator
      standardTerms={
        <Markdown rehypePlugins={[rehypeRaw]} components={{ h1: "h2" }}>
          {standardTerms}
        </Markdown>
      }
    />
  );
}

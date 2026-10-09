import type { Metadata } from "next";

import DraftCreator from "./DraftCreator";

export const metadata: Metadata = {
  title: "Draft an agreement · prelegal",
  description: "Chat with an AI to draft and download a Common Paper legal agreement",
};

export default function DraftPage() {
  return <DraftCreator />;
}

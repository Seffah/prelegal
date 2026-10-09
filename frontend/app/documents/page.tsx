import type { Metadata } from "next";
import { Suspense } from "react";

import MyDocuments from "./MyDocuments";

export const metadata: Metadata = { title: "My documents · prelegal" };

export default function DocumentsPage() {
  // MyDocuments reads ?id= from the URL, which a statically exported page only knows in the browser.
  return (
    <Suspense>
      <MyDocuments />
    </Suspense>
  );
}

import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>prelegal</h1>
      <p>
        Draft common legal agreements by chatting with an AI assistant. It helps you choose the
        right Common Paper template, asks for the key terms and fills in the document as you go.
      </p>
      <p>
        <Link href="/draft">Start drafting →</Link>
      </p>
    </main>
  );
}

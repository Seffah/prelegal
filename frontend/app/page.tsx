import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>prelegal</h1>
      <p>A platform for drafting legal agreements.</p>
      <p>
        <Link href="/nda">Create a Mutual NDA →</Link>
      </p>
    </main>
  );
}

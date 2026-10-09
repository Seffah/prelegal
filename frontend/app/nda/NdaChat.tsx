"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Markdown from "react-markdown";

import { todayIso, type NdaData } from "./types";
import styles from "./nda.module.css";

type Message = { role: "user" | "assistant"; content: string };

type ChatResponse = { reply: string; nda: NdaData };

// Static so that opening the page does not spend a (rate-limited) model call.
const GREETING: Message = {
  role: "assistant",
  content:
    "Hi! I'll help you draft a Mutual Non-Disclosure Agreement. To start, which two " +
    "companies are entering into it, and why will they be sharing confidential information?",
};

type Props = {
  data: NdaData;
  onChange: (data: NdaData) => void;
};

export default function NdaChat({ data, onChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function send(e?: FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;

    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages(history);
    setInput("");
    setThinking(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, nda: data, today: todayIso() }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(typeof body.detail === "string" ? body.detail : "The AI could not respond.");
      }
      const { reply, nda } = body as ChatResponse;
      setMessages([...history, { role: "assistant", content: reply }]);
      onChange(nda);
    } catch (err) {
      // Roll back so the user can edit and resend their message.
      setMessages(messages);
      setInput((current) => current || text);
      setError(err instanceof Error ? err.message : "The AI could not respond.");
    } finally {
      setThinking(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  return (
    <section className={styles.chat} aria-label="Chat with the AI assistant">
      <div ref={logRef} className={styles.messages} role="log" aria-live="polite">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className={`${styles.message} ${styles.userMessage}`}>
              {m.content}
            </div>
          ) : (
            // The AI may use light Markdown (bold, lists); raw HTML is escaped.
            <div key={i} className={`${styles.message} ${styles.aiMessage}`}>
              <Markdown>{m.content}</Markdown>
            </div>
          ),
        )}
        {thinking && <div className={`${styles.message} ${styles.aiMessage} ${styles.thinking}`}>Thinking…</div>}
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <form className={styles.composer} onSubmit={send}>
        <textarea
          rows={2}
          placeholder="Type your answer…"
          aria-label="Message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button type="submit" disabled={thinking || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}

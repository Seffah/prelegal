"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Markdown from "react-markdown";

import { api } from "../lib/api";
import { todayIso, type Draft } from "./types";
import styles from "./draft.module.css";

type Message = { role: "user" | "assistant"; content: string };

type ChatResponse = Draft & { reply: string };

// Static so that opening the page does not spend a (rate-limited) model call.
const GREETING: Message = {
  role: "assistant",
  content:
    "Hi! I can help you draft a legal agreement, such as an NDA, a cloud service agreement " +
    "or a data processing agreement. What would you like to create?",
};

type Props = {
  draft: Draft;
  onChange: (draft: Draft) => void;
};

export default function Chat({ draft, onChange }: Props) {
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
      const { reply, ...next } = await api<ChatResponse>("/api/chat", {
        method: "POST",
        body: { ...draft, messages: history, today: todayIso() },
      });
      setMessages([...history, { role: "assistant", content: reply }]);
      onChange(next);
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
        <p role="alert" className={`form-error ${styles.chatError}`}>
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
        <button type="submit" className="button button-submit" disabled={thinking || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}

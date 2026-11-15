import { useEffect, useRef, useState } from "react";
import { SUPPORT_REPLY_TIMEOUT_MS, supportDraftError, supportMessageId } from "../lib/customerAi.js";
import { managerAiError, managerAiJson } from "../lib/managerAi.js";

export default function useManagerAi(userId, open) {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const pending = useRef(null);
  const checking = useRef(null);
  const mounted = useRef(true);
  const lastRequest = useRef(null);
  const messages = conversations.find((row) => row.id === active)?.messages || [];

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.abort(); checking.current?.abort(); };
  }, [userId]);

  function report(reason) {
    if (!mounted.current || reason.name === "AbortError") return;
    if ([401, 403].includes(reason.status)) {
      setExpired(true); setConversations([]); setActive(null); setStatus(null); lastRequest.current = null;
    } else if (!reason.status || reason.status >= 500) setStatus((info) => info && { ...info, unreachable: true });
    setError(managerAiError(reason));
  }

  async function refresh() {
    if (pending.current || checking.current || expired) return;
    const controller = new AbortController(); checking.current = controller;
    setLoading(true); if (!lastRequest.current) setError("");
    try {
      const info = await managerAiJson("/status", { signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return;
      if (status && status.restaurant_id !== info.restaurant_id) {
        setConversations([]); setActive(null); lastRequest.current = null;
      }
      setStatus(info);
    } catch (reason) { if (!controller.signal.aborted) { setStatus(null); report(reason); } }
    finally { if (checking.current === controller) checking.current = null; if (mounted.current) setLoading(false); }
  }
  useEffect(() => { if (open && !expired) refresh(); }, [open]);

  function newConversation() {
    if (pending.current || checking.current || expired) return;
    setActive(null); setError(""); lastRequest.current = null;
  }

  function select(id) {
    if (pending.current || checking.current || expired) return;
    if (!conversations.some((row) => row.id === id)) return;
    setActive(id); setError(""); lastRequest.current = null;
  }

  async function send(text, action = null, unused = null, retry = false) {
    if (pending.current || checking.current || expired || !status?.ready || supportDraftError(text, status.max_message_length)) return false;
    const previous = lastRequest.current;
    const recover = previous && (retry || (previous.payload.message === text.trim() && previous.payload.action === action));
    const id = recover ? previous.id : active || supportMessageId();
    const payload = recover ? previous.payload : {
      message: text.trim(), action, language: "en", client_message_id: supportMessageId(),
      context: [...messages].reverse().find((row) => row.answer)?.answer.context || null,
      history: messages.filter((row) => row.sender === "user" && row.delivery === "sent").slice(-6).map((row) => row.content),
    };
    const controller = new AbortController(); pending.current = controller;
    lastRequest.current = { id, payload }; setBusy(true); setError(""); setActive(id);
    setConversations((list) => {
      const current = list.find((row) => row.id === id) || { id, title: payload.message.slice(0, 80), messages: [] };
      const message = { id: payload.client_message_id, sender: "user", content: payload.message, delivery: "sending", created_at: new Date().toISOString() };
      const updated = { ...current, messages: current.messages.some((row) => row.id === message.id)
        ? current.messages.map((row) => row.id === message.id ? { ...row, delivery: "sending" } : row)
        : [...current.messages, message] };
      return [updated, ...list.filter((row) => row.id !== id)];
    });
    let timedOut = false;
    const deadline = status.reply_timeout_seconds ? status.reply_timeout_seconds * 1000 : SUPPORT_REPLY_TIMEOUT_MS;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, deadline);
    try {
      const answer = await managerAiJson("/chat", { method: "POST", body: payload, signal: controller.signal, timeout: deadline });
      if (!mounted.current || controller.signal.aborted) return false;
      if (answer.restaurant_id !== status.restaurant_id) {
        throw Object.assign(new Error("Restaurant access changed."), { status: 403 });
      }
      if (answer.client_message_id !== payload.client_message_id || typeof answer.reply !== "string" || !Array.isArray(answer.cards)) {
        throw new Error("Unexpected assistant response.");
      }
      setConversations((list) => list.map((row) => {
        if (row.id !== id) return row;
        const delivered = row.messages.map((message) => message.id === payload.client_message_id ? { ...message, delivery: "sent" } : message);
        return { ...row, messages: [...delivered.filter((message) => message.id !== answer.message_id),
          { id: answer.message_id, sender: "assistant", content: answer.reply, created_at: answer.as_of, answer }] };
      }));
      setStatus((info) => info && { ...info, unreachable: false, model_available: answer.limited ? false : info.model_available });
      lastRequest.current = null;
      return true;
    } catch (reason) {
      if (mounted.current && pending.current === controller) {
        setConversations((list) => list.map((row) => row.id !== id ? row : { ...row, messages: row.messages.map((message) => message.id === payload.client_message_id ? { ...message, delivery: "failed" } : message) }));
        if (controller.signal.aborted) setError(timedOut ? "This is taking longer than expected. Please try again." : "Reply stopped. Retry or send another message.");
        else report(reason);
      }
      return false;
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === controller) { pending.current = null; if (mounted.current) setBusy(false); }
    }
  }

  async function remove() {
    if (!active || pending.current || checking.current || expired) return false;
    setConversations((list) => list.filter((row) => row.id !== active));
    setActive(null); setError(""); lastRequest.current = null;
    return true;
  }

  return { conversations, active, messages, status, error, busy, loading, expired, language: "en",
    refresh, select, newConversation, send, remove, stop: () => pending.current?.abort(),
    retry: () => lastRequest.current && send(lastRequest.current.payload.message, null, null, true),
    canRetry: Boolean(lastRequest.current), failedMessageId: lastRequest.current?.payload.client_message_id };
}

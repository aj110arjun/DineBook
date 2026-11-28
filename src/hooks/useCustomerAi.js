import { useEffect, useRef, useState } from "react";
import { SUPPORT_REPLY_TIMEOUT_MS, streamSupportReply, supportDraftError, supportErrorMessage, supportJson, supportMessageId } from "../lib/customerAi.js";

export default function useCustomerAi(userId, open) {
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [language, setLanguage] = useState("auto");
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState(false);
  const pending = useRef(null);
  const lastRequest = useRef(null);
  const loadVersion = useRef(0);
  const loadController = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.abort(); loadController.current?.abort(); loadVersion.current++; };
  }, [userId]);

  function report(reason) {
    if (!mounted.current || reason.name === "AbortError") return;
    if ([401, 403].includes(reason.status)) {
      setExpired(true); setMessages([]); setConversations([]); setActive(null); setStatus(null); lastRequest.current = null;
    } else if (!reason.status || reason.status >= 500) {
      setStatus((info) => info && { ...info, unreachable: true });
    }
    setError(supportErrorMessage(reason));
  }

  async function refresh() {
    if (pending.current || loadController.current || expired) return;
    const version = ++loadVersion.current;
    const controller = new AbortController(); loadController.current = controller;
    setLoading(true); if (!lastRequest.current) setError("");
    try {
      const [info, list] = await Promise.all([supportJson("/status", { signal: controller.signal }), supportJson("/conversations", { signal: controller.signal })]);
      if (!mounted.current || controller.signal.aborted || version !== loadVersion.current) return;
      setStatus(info); setConversations(list);
    } catch (reason) {
      if (version === loadVersion.current) { setStatus(null); report(reason); }
    } finally {
      if (loadController.current === controller) loadController.current = null;
      if (mounted.current && version === loadVersion.current) setLoading(false);
    }
  }

  // Check on every open, so availability is never an assumed permanent state.
  useEffect(() => { if (open && !expired) refresh(); }, [open]);

  async function select(id) {
    if (pending.current || loadController.current || expired) return;
    const version = ++loadVersion.current;
    const controller = new AbortController(); loadController.current = controller;
    setLoading(true); setError("");
    try {
      const value = await supportJson(`/conversations/${encodeURIComponent(id)}`, { signal: controller.signal });
      if (!mounted.current || controller.signal.aborted || version !== loadVersion.current) return;
      setActive(id); setMessages(value.messages); setLanguage(value.conversation.language); lastRequest.current = null;
    } catch (reason) { if (version === loadVersion.current) report(reason); }
    finally {
      if (loadController.current === controller) loadController.current = null;
      if (mounted.current && version === loadVersion.current) setLoading(false);
    }
  }

  function newConversation() {
    if (pending.current || loadController.current || expired) return;
    setActive(null); setMessages([]); setError(""); lastRequest.current = null;
  }

  async function send(text, action = null, restaurantId = null, retry = false) {
    if (pending.current || loadController.current || expired || !status?.ready || supportDraftError(text, status.max_message_length)) return false;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError("");
    const previous = lastRequest.current;
    // Resending a restored draft recovers the same server turn as the Retry button.
    const recover = previous && (retry || (previous.payload.message === text.trim() && previous.payload.action === action && previous.payload.restaurant_id === restaurantId && previous.payload.language === language));
    const payload = recover ? previous.payload : {
      message: text.trim(), client_message_id: supportMessageId(), language, action, restaurant_id: restaurantId,
    };
    let id = recover ? previous.id : active;
    lastRequest.current = { id, payload };
    setMessages((list) => list.some((row) => row.id === payload.client_message_id)
      ? list.map((row) => row.id === payload.client_message_id ? { ...row, delivery: "sending" } : row)
      : [...list, { id: payload.client_message_id, sender: "user", content: payload.message, created_at: new Date().toISOString(), delivery: "sending" }]);
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); },
      status.reply_timeout_seconds ? status.reply_timeout_seconds * 1000 : SUPPORT_REPLY_TIMEOUT_MS);
    try {
      if (!id) {
        const created = await supportJson("/conversations", { method: "POST", body: { language: payload.language }, signal: controller.signal });
        if (controller.signal.aborted || !mounted.current) return false;
        id = created.id; lastRequest.current = { id, payload }; setActive(id); setConversations((list) => [created, ...list]);
      }
      await streamSupportReply(id, payload, { signal: controller.signal, onEvent(name, answer) {
        if (!mounted.current || controller.signal.aborted || pending.current !== controller) return;
        if (name === "done") {
          const message = { id: answer.message_id, sender: "assistant", content: answer.reply, created_at: answer.as_of, answer };
          setMessages((list) => {
            const delivered = list.map((row) => row.id === payload.client_message_id ? { ...row, delivery: "sent" } : row);
            return delivered.some((row) => row.id === message.id) ? delivered : [...delivered, message];
          });
          setConversations((list) => list.map((row) => row.id === id ? { ...row, title: row.title === "Customer support" ? payload.message.slice(0, 80) : row.title, updated_at: answer.as_of } : row));
          setStatus((info) => info && { ...info, unreachable: false, model_available: answer.limited ? false : info.model_available });
          lastRequest.current = null;
        }
      } });
      return !controller.signal.aborted;
    } catch (reason) {
      if (mounted.current && pending.current === controller) {
        setMessages((list) => list.map((row) => row.id === payload.client_message_id ? { ...row, delivery: "failed" } : row));
        if (controller.signal.aborted) setError(timedOut ? "This is taking longer than expected. Please try again." : "Reply stopped. Retry to recover the response, or send another message.");
        else report(reason);
      }
      return false;
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === controller) { pending.current = null; if (mounted.current) setBusy(false); }
    }
  }

  async function remove() {
    if (!active || pending.current || loadController.current || expired) return false;
    const controller = new AbortController(); loadController.current = controller;
    setLoading(true); setError("");
    try {
      await supportJson(`/conversations/${encodeURIComponent(active)}`, { method: "DELETE", signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return false;
      setConversations((list) => list.filter((row) => row.id !== active));
      setActive(null); setMessages([]); lastRequest.current = null;
      return true;
    } catch (reason) { report(reason); return false; }
    finally {
      if (loadController.current === controller) loadController.current = null;
      if (mounted.current) setLoading(false);
    }
  }

  function stop() { pending.current?.abort(); }

  return { conversations, active, messages, language, setLanguage, status, error, busy, loading, expired,
    refresh, select, newConversation, send, remove, stop,
    retry: () => lastRequest.current && send(lastRequest.current.payload.message, null, null, true),
    canRetry: Boolean(lastRequest.current), failedMessageId: lastRequest.current?.payload.client_message_id };
}

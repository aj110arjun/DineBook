import { useEffect, useRef, useState } from "react";
import { streamSupportReply, supportJson, supportMessageId } from "../lib/customerAi.js";

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
    if (!mounted.current) return;
    if ([401, 403].includes(reason.status)) {
      setExpired(true); setMessages([]); setConversations([]); setActive(null);
    }
    setError(reason.message || "Customer support is unavailable.");
  }

  async function refresh() {
    const version = ++loadVersion.current;
    loadController.current?.abort();
    const controller = new AbortController(); loadController.current = controller;
    setLoading(true); setError("");
    try {
      const [info, list] = await Promise.all([supportJson("/status", { signal: controller.signal }), supportJson("/conversations", { signal: controller.signal })]);
      if (!mounted.current || version !== loadVersion.current) return;
      setStatus(info); setConversations(list);
    } catch (reason) { if (version === loadVersion.current) report(reason); }
    finally { if (mounted.current && version === loadVersion.current) setLoading(false); }
  }
  useEffect(() => { if (open && !status && !expired) refresh(); }, [open]);

  async function select(id) {
    if (pending.current) return;
    const version = ++loadVersion.current;
    loadController.current?.abort();
    const controller = new AbortController(); loadController.current = controller;
    setLoading(true); setError(""); lastRequest.current = null;
    try {
      const value = await supportJson(`/conversations/${id}`, { signal: controller.signal });
      if (!mounted.current || version !== loadVersion.current) return;
      setActive(id); setMessages(value.messages); setLanguage(value.conversation.language);
    } catch (reason) { if (version === loadVersion.current) report(reason); }
    finally { if (mounted.current && version === loadVersion.current) setLoading(false); }
  }

  function newConversation() {
    if (pending.current) return;
    loadVersion.current++; loadController.current?.abort(); setLoading(false); setActive(null); setMessages([]); setError(""); lastRequest.current = null;
  }

  async function send(text, action = null, restaurantId = null, retry = false) {
    if (pending.current || loading || expired || !text.trim()) return false;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setError("");
    let timeout;
    let timedOut = false;
    try {
      let id = active;
      if (!id) {
        const created = await supportJson("/conversations", { method: "POST", body: { language }, signal: controller.signal });
        if (controller.signal.aborted || !mounted.current) return false;
        id = created.id; setActive(id); setConversations((list) => [created, ...list]);
      }
      const payload = retry && lastRequest.current?.id === id ? lastRequest.current.payload : {
        message: text.trim(), client_message_id: supportMessageId(), language, action, restaurant_id: restaurantId,
      };
      lastRequest.current = { id, payload };
      if (!retry) setMessages((list) => [...list, { id: payload.client_message_id, sender: "user", content: payload.message, created_at: new Date().toISOString() }]);
      timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 125000);
      await streamSupportReply(id, payload, { signal: controller.signal, onEvent(name, answer) {
        if (!mounted.current || controller.signal.aborted) return;
        if (name === "done") {
          const message = { id: answer.message_id, sender: "assistant", content: answer.reply,
            created_at: answer.as_of, answer };
          setMessages((list) => list.some((row) => row.id === message.id) ? list : [...list, message]);
          setConversations((list) => list.map((row) => row.id === id && row.title === "Customer support" ? { ...row, title: payload.message.slice(0, 80) } : row));
          lastRequest.current = null;
        }
      } });
      return true;
    } catch (reason) {
      if (mounted.current) {
        if (controller.signal.aborted) setError(timedOut ? "This reply took too long. Retry to recover it." : "Reply stopped. You can retry or send another message.");
        else report(reason);
      }
      return false;
    } finally {
      window.clearTimeout(timeout);
      if (pending.current === controller) pending.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  async function remove() {
    if (!active || pending.current) return;
    try {
      await supportJson(`/conversations/${active}`, { method: "DELETE" });
      setConversations((list) => list.filter((row) => row.id !== active)); newConversation();
    } catch (reason) { report(reason); }
  }

  function stop() {
    pending.current?.abort();
    loadVersion.current++; loadController.current?.abort(); setLoading(false);
  }

  return { conversations, active, messages, language, setLanguage, status, error, busy, loading, expired,
    refresh, select, newConversation, send, remove, stop,
    retry: () => lastRequest.current && send(lastRequest.current.payload.message, null, null, true), canRetry: Boolean(lastRequest.current) };
}

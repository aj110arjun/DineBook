import { useEffect, useRef, useState } from "react";
import { Send, Square } from "lucide-react";
import { SUPPORT_MAX_MESSAGE_LENGTH, supportDraftError } from "../../../lib/customerAi.js";

function resizeInput(input) {
  if (!input) return;
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
}

export function observeInputWidth(input, resize) {
  let width = input.getBoundingClientRect().width;
  let frame = null;
  const observer = new ResizeObserver(() => {
    // Ignore height and internal scrollbar changes. Defer writes until after
    // observer delivery to avoid the browser's ResizeObserver loop warning.
    const nextWidth = input.getBoundingClientRect().width;
    if (nextWidth === width) return;
    width = nextWidth;
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = window.requestAnimationFrame(() => { frame = null; resize(input); });
  });
  observer.observe(input);
  return () => { observer.disconnect(); if (frame !== null) window.cancelAnimationFrame(frame); };
}

export default function AIChatInput({ id, chat, labels, draft, setDraft, open }) {
  const input = useRef(null);
  const submittedDraft = useRef(null);
  const [validation, setValidation] = useState("");
  const limit = chat.status?.max_message_length || SUPPORT_MAX_MESSAGE_LENGTH;
  const disabled = chat.loading || chat.expired || !chat.status?.ready;
  const draftError = draft.trim() ? supportDraftError(draft, limit) : "";

  useEffect(() => {
    if (!input.current || !open) return;
    resizeInput(input.current);
  }, [draft, open]);
  useEffect(() => {
    if (!open || !input.current || typeof ResizeObserver === "undefined") return;
    return observeInputWidth(input.current, resizeInput);
  }, [open]);
  useEffect(() => {
    const lastUser = [...chat.messages].reverse().find((message) => message.sender === "user");
    if (lastUser?.delivery === "sent" && lastUser.content === submittedDraft.current?.trim()) {
      const delivered = submittedDraft.current;
      submittedDraft.current = null;
      setDraft((current) => current === delivered ? "" : current);
    }
  }, [chat.messages]);

  async function submit(event) {
    event.preventDefault();
    if (disabled || chat.busy) return;
    const invalid = supportDraftError(draft, limit);
    setValidation(invalid);
    if (invalid) { input.current?.focus(); return; }
    const submitted = draft;
    submittedDraft.current = submitted;
    if (event.currentTarget.contains(document.activeElement)) input.current?.focus({ preventScroll: true });
    // Keep the draft until delivery succeeds; a failure never discards input.
    if (await chat.send(submitted)) setDraft((current) => current === submitted ? "" : current);
  }

  return <div className="customer-ai-input-area">
    <form className="customer-ai-composer" onSubmit={submit}>
      <label className="customer-ai-sr-only" htmlFor={`${id}-message`}>{labels.placeholder}</label>
      <textarea ref={input} id={`${id}-message`} value={draft} maxLength={limit} rows={1} placeholder={labels.placeholder}
        disabled={disabled} aria-invalid={Boolean(validation || draftError)} aria-describedby={`${id}-input-help`}
        onChange={(event) => { setDraft(event.target.value); setValidation(""); }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault(); event.currentTarget.form.requestSubmit();
          }
        }} />
      {chat.busy ? <button type="button" onClick={chat.stop} aria-label={labels.stop} title={labels.stop}><Square size={17} fill="currentColor" /></button> :
        <button type="submit" disabled={disabled || !draft.trim() || Boolean(draftError)} aria-label={labels.send} title={labels.send}><Send size={19} /></button>}
    </form>
    <div id={`${id}-input-help`} className={`customer-ai-input-help${validation || draftError ? " is-invalid" : ""}`}>
      <span role="status">{validation || draftError || (chat.busy ? "You can keep writing while I check." : "Enter to send · Shift + Enter for a new line")}</span>
      <span aria-label={`${draft.length} of ${limit} characters`}>{draft.length}/{limit}</span>
    </div>
  </div>;
}

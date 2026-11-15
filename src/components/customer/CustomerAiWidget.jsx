import { useEffect, useId, useRef, useState } from "react";
import { Bot, Check, Copy, LoaderCircle, MessageCircle, Plus, Send, Square, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import useCustomerAi from "../../hooks/useCustomerAi.js";
import { safeSupportHref, supportCardFields, supportFieldLabel, supportFieldValue, supportSummary } from "../../lib/customerAi.js";
import { demoCustomer } from "../../data/demoCustomer.js";
import "../../assets/css/CustomerAi.css";

const LABELS = {
  en: { title: "DineBook support", intro: "Bookings, orders and account help.", welcome: "How can I help?", help: "Choose a topic, or tell me what you need.", placeholder: "What do you need help with?", send: "Send", stop: "Stop reply", new: "New chat", history: "Conversations", language: "Language", loading: "Checking for you…", copy: "Copy chat summary", copied: "Summary copied", actions: ["My reservations", "Track my orders", "Wallet balance", "Payment history", "Refund status", "Find restaurants", "Restaurant offers", "Human support"] },
  ml: { title: "DineBook സഹായം", intro: "നിങ്ങളുടെ ഭക്ഷണാനുഭവത്തിനുള്ള സഹായം.", welcome: "എങ്ങനെ സഹായിക്കാം?", help: "ബുക്കിംഗ്, ഓർഡർ, വാലറ്റ്, റെസ്റ്റോറന്റ് എന്നിവയെക്കുറിച്ച് ചോദിക്കാം.", placeholder: "ചോദ്യം എഴുതുക…", send: "അയയ്ക്കുക", stop: "നിർത്തുക", new: "പുതിയ ചാറ്റ്", history: "സംഭാഷണങ്ങൾ", language: "ഭാഷ", loading: "മറുപടി തയ്യാറാക്കുന്നു…", copy: "സഹായ സംഗ്രഹം പകർത്തുക", copied: "സംഗ്രഹം പകർത്തി", actions: ["എന്റെ ബുക്കിംഗുകൾ", "എന്റെ ഓർഡറുകൾ", "വാലറ്റ് ബാലൻസ്", "പേയ്‌മെന്റ് ചരിത്രം", "റീഫണ്ട് നില", "റെസ്റ്റോറന്റുകൾ കണ്ടെത്തുക", "റെസ്റ്റോറന്റ് ഓഫറുകൾ", "മനുഷ്യ സഹായം"] },
  hi: { title: "DineBook सहायता", intro: "आपके भोजन अनुभव में मदद।", welcome: "मैं कैसे मदद करूँ?", help: "बुकिंग, ऑर्डर, वॉलेट या रेस्तरां के बारे में पूछें।", placeholder: "अपना सवाल लिखें…", send: "भेजें", stop: "रोकें", new: "नई चैट", history: "बातचीत", language: "भाषा", loading: "जवाब तैयार हो रहा है…", copy: "सहायता सारांश कॉपी करें", copied: "सारांश कॉपी हुआ", actions: ["मेरी बुकिंग", "मेरे ऑर्डर", "वॉलेट बैलेंस", "भुगतान इतिहास", "रिफंड की स्थिति", "रेस्तरां खोजें", "रेस्तरां ऑफर", "मानव सहायता"] },
};
const ACTIONS = ["reservations", "orders", "wallet", "payments", "refunds", "restaurants", "offers", "support"];
const DETAILS = {
  en: { more: "More details", articles: "Related help", note: "AI support · Manage bookings and payments on their pages." },
  ml: { more: "കൂടുതൽ വിവരങ്ങൾ", articles: "കൂടുതൽ സഹായം", note: "AI സഹായം · ബുക്കിംഗും പേയ്‌മെന്റും ബന്ധപ്പെട്ട പേജുകളിൽ കൈകാര്യം ചെയ്യാം." },
  hi: { more: "और जानकारी", articles: "संबंधित सहायता", note: "AI सहायता · बुकिंग और भुगतान संबंधित पेज पर प्रबंधित करें।" },
};

function SupportFields({ entries, fields }) {
  return <dl>{entries.map(([key, value]) => <div key={key}>
    <dt>{supportFieldLabel(key, fields)}</dt><dd>{supportFieldValue(key, value)}</dd>
  </div>)}</dl>;
}

export function SupportText({ text }) {
  // A deliberately small Markdown subset, rendered exclusively as React text.
  const inline = (line) => line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((piece, index) =>
    piece.startsWith("**") ? <strong key={index}>{piece.slice(2, -2)}</strong> :
      piece.startsWith("`") ? <code key={index}>{piece.slice(1, -1)}</code> : piece);
  return text.split(/\n\n+/).map((block, index) => block.split("\n").every((line) => /^[-*] /.test(line))
    ? <ul key={index}>{block.split("\n").map((line, n) => <li key={n}>{inline(line.slice(2))}</li>)}</ul>
    : <p key={index}>{inline(block)}</p>);
}

export function CustomerAiPanel({ chat, close, closeRef, id }) {
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const end = useRef(null);
  const language = chat.language === "auto" ? [...chat.messages].reverse().find((row) => row.answer)?.answer.language || "en" : chat.language;
  const labels = LABELS[language] || LABELS.en;
  const details = DETAILS[language] || DETAILS.en;
  const disabled = chat.busy || chat.loading || chat.expired || !chat.status?.ready;
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [chat.messages.length, chat.busy]);
  async function submit(event) {
    event.preventDefault();
    const value = draft;
    if (!value.trim() || disabled) return;
    setDraft("");
    if (!await chat.send(value)) setDraft((current) => current || value);
  }
  async function copySummary() {
    try { await navigator.clipboard.writeText(supportSummary(chat.messages)); setCopied(true); setCopyError(false); }
    catch { setCopied(false); setCopyError(true); }
  }
  return <section id={id} className="customer-ai-panel" role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} lang={language}>
    <header className="customer-ai-header">
      <span className="customer-ai-avatar"><Bot size={23} aria-hidden="true" /></span>
      <div><h2 id={`${id}-title`}>{labels.title}</h2><p>{labels.intro}</p></div>
      <button ref={closeRef} type="button" onClick={close} aria-label="Close support chat"><X size={20} /></button>
    </header>
    <div className="customer-ai-toolbar">
      <button type="button" disabled={chat.busy || chat.loading} onClick={chat.newConversation}><Plus size={15} />{labels.new}</button>
      <label><span className="customer-ai-sr-only">{labels.history}</span><select value={chat.active || ""} disabled={chat.busy || chat.loading}
        onChange={(event) => event.target.value ? chat.select(event.target.value) : chat.newConversation()} aria-label={labels.history}>
        <option value="">{labels.history}</option>{chat.conversations.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
      </select></label>
      <label><span className="customer-ai-sr-only">{labels.language}</span><select aria-label={labels.language} value={chat.language} onChange={(event) => chat.setLanguage(event.target.value)} disabled={chat.busy}>
        <option value="auto">Auto</option><option value="en">English</option><option value="ml">മലയാളം</option><option value="hi">हिन्दी</option>
      </select></label>
      {chat.active && <button type="button" onClick={chat.remove} disabled={chat.busy || chat.loading} aria-label="Delete this conversation"><Trash2 size={15} /></button>}
    </div>
    <div className="customer-ai-messages" role="log" aria-label="Support conversation" aria-relevant="additions" aria-busy={chat.busy}>
      {!chat.messages.length && <div className="customer-ai-welcome"><span><MessageCircle size={28} /></span><h3>{labels.welcome}</h3><p>{labels.help}</p>
        <div className="customer-ai-actions">{ACTIONS.map((action, index) => <button key={action} type="button" disabled={disabled} onClick={() => chat.send(labels.actions[index], action)}>{labels.actions[index]}</button>)}</div>
      </div>}
      {chat.messages.map((message) => <article key={message.id} className={`customer-ai-message is-${message.sender}`}>
        <div className="customer-ai-bubble"><SupportText text={message.content} />
          {(message.answer?.cards || []).map((card, index) => {
            const href = safeSupportHref(card.href);
            const fields = supportCardFields(card);
            return <section className="customer-ai-fact" key={`${card.title}-${index}`}>
              <h4>{card.title}</h4><SupportFields entries={fields.primary} fields={card.fields} />
              {fields.secondary.length > 0 && <details className="customer-ai-details"><summary>{details.more}</summary>
                <SupportFields entries={fields.secondary} fields={card.fields} />
              </details>}
              {href && <Link to={href}>View details →</Link>}
              {card.restaurant_id && ["restaurant", "hours", "availability"].includes(card.kind) && <div className="customer-ai-followups">{["hours", "availability", "offers"].map((action) => <button type="button" key={action} disabled={disabled}
                onClick={() => chat.send(`${action}: ${card.title}`, action, card.restaurant_id)}>{action === "hours" ? "Hours" : action === "availability" ? "Availability" : "Offers"}</button>)}</div>}
            </section>;
          })}
          {message.answer?.sources?.length > 0 && <details className="customer-ai-details customer-ai-articles"><summary>{details.articles}</summary><nav className="customer-ai-sources" aria-label="Answer sources">{message.answer.sources.map((source) => {
            const href = safeSupportHref(source.href);
            return href && <Link key={source.id} to={href}>{source.title}</Link>;
          })}</nav></details>}
          {message.answer?.escalation && <div className="customer-ai-escalation"><button type="button" onClick={copySummary}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? labels.copied : labels.copy}</button>
            {copyError && <p role="status">Open the summary below to copy it manually.</p>}
            <details><summary>View support summary</summary><textarea readOnly aria-label="Support summary" value={supportSummary(chat.messages)} rows={5} /></details>
            {safeSupportHref(chat.status?.support_url, chat.status?.support_url) && <a href={chat.status.support_url} target="_blank" rel="noopener noreferrer">Contact support →</a>}</div>}
        </div>
        <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString(language === "ml" ? "ml-IN" : language === "hi" ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" })}</time>
      </article>)}
      {chat.busy && <div className="customer-ai-thinking" role="status"><LoaderCircle size={16} className="customer-ai-spin" />{labels.loading}</div>}
      {chat.loading && <p role="status">Loading conversations…</p>}
      {chat.error && <div className="customer-ai-error" role="alert"><p>{chat.error}</p>
        {chat.expired ? <Link to="/customer/login">Sign in again</Link> : chat.canRetry ? <button type="button" disabled={chat.busy} onClick={chat.retry}>Retry reply</button> : <button type="button" onClick={chat.refresh}>Try again</button>}</div>}
      <div ref={end} />
    </div>
    <form className="customer-ai-composer" onSubmit={submit}>
      <label className="customer-ai-sr-only" htmlFor={`${id}-message`}>{labels.placeholder}</label>
      <textarea id={`${id}-message`} value={draft} maxLength={1000} rows={2} placeholder={labels.placeholder} disabled={disabled}
        onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); }
        }} />
      {chat.busy ? <button type="button" onClick={chat.stop} aria-label={labels.stop}><Square size={18} /></button> :
        <button type="submit" disabled={disabled || !draft.trim()} aria-label={labels.send}><Send size={19} /></button>}
    </form>
    <p className="customer-ai-note">{details.note}</p>
  </section>;
}

export function CustomerAiSignInPanel({ id, close, closeRef, preview = false }) {
  return <section id={id} className="customer-ai-panel customer-ai-sign-in" role="dialog" aria-modal="false" aria-labelledby={`${id}-title`}>
    <header className="customer-ai-header">
      <span className="customer-ai-avatar"><Bot size={23} aria-hidden="true" /></span>
      <div><h2 id={`${id}-title`}>DineBook support</h2><p>Bookings, orders and account help.</p></div>
      <button ref={closeRef} type="button" onClick={close} aria-label="Close support chat"><X size={20} /></button>
    </header>
    <div className="customer-ai-welcome">
      <h3>How can I help?</h3>
      <p>{preview ? "Sign in with a customer account to use AI support. Chat is unavailable in the local preview session." : "Sign in to chat about your bookings, orders, wallet, or a restaurant."}</p>
      <Link className="customer-ai-sign-in-link" to="/customer/login" onClick={close}>Sign in for support</Link>
    </div>
  </section>;
}

export default function CustomerAiWidget({ user }) {
  const [open, setOpen] = useState(false);
  const launcher = useRef(null);
  const closeButton = useRef(null);
  const id = useId();
  const authenticated = Boolean(user?.id && user.role === "CUSTOMER" && user.id !== demoCustomer.id);
  const chat = useCustomerAi(user?.id, open && authenticated);
  function close() { chat.stop(); setOpen(false); launcher.current?.focus(); }
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const key = (event) => { if (event.key === "Escape") { event.stopPropagation(); close(); } };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open]);
  return <div className="customer-ai-widget">
    {open && (authenticated
      ? <CustomerAiPanel key={user.id} chat={chat} close={close} closeRef={closeButton} id={id} />
      : <CustomerAiSignInPanel id={id} close={close} closeRef={closeButton} preview={user?.id === demoCustomer.id} />)}
    <button ref={launcher} className="customer-ai-launcher" type="button" aria-label={open ? "Close customer support" : "Open customer support"}
      aria-expanded={open} aria-controls={id} onClick={() => open ? close() : setOpen(true)}>
      {open ? <X size={23} /> : <MessageCircle size={23} />}<span>Help</span>
    </button>
  </div>;
}

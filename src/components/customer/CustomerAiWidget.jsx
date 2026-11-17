import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Bot, CalendarDays, CircleHelp, CreditCard, Headphones, MessageCircle, Minus, Plus, RotateCcw, Search, Sparkles, Tag, Trash2, Utensils, Wallet, X } from "lucide-react";
import { Link } from "react-router-dom";
import useCustomerAi from "../../hooks/useCustomerAi.js";
import { demoCustomer } from "../../data/demoCustomer.js";
import AIChatInput from "./ai-support/AIChatInput.jsx";
import AIMessageBubble from "./ai-support/AIMessageBubble.jsx";
import { AI_LABELS, customerAiLabels } from "./ai-support/customerAiCopy.js";
import "../../assets/css/CustomerAi.css";
import LoadingState, { RefreshIndicator } from "../ui/LoadingState.jsx";

export { SupportText } from "./ai-support/AIMessageBubble.jsx";
const ACTIONS = [
  ["restaurants", Search], ["reservations", CalendarDays], ["orders", Utensils], ["payments", CreditCard],
  ["offers", Tag], ["support", Headphones], ["wallet", Wallet], ["refunds", RotateCcw],
];

function AIChatHeader({ labels, id, close, closeRef }) {
  return <header className="customer-ai-header">
    <span className="customer-ai-avatar"><Sparkles size={23} aria-hidden="true" /></span>
    <div className="customer-ai-heading"><span className="customer-ai-eyebrow">DINEBOOK AI</span><h2 id={`${id}-title`}>{labels.title}</h2><p>{labels.intro}</p></div>
    <div className="customer-ai-header-actions">
      <button type="button" onClick={close} aria-label="Minimize support chat" title="Minimize chat"><Minus size={18} /></button>
      <button ref={closeRef} type="button" onClick={close} aria-label="Close support chat" title="Close chat"><X size={19} /></button>
    </div>
  </header>;
}

export function CustomerAiPanel({ chat, close, closeRef, id, open = true, presentation }) {
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(false);
  const scroll = useRef(null);
  const nearBottom = useRef(true);
  const previous = useRef({ active: chat.active, last: null });
  const defaults = customerAiLabels(chat);
  const language = presentation?.language || defaults.language;
  const labels = { ...defaults.labels, ...presentation?.labels };
  const actions = presentation?.actions || ACTIONS;
  const disabled = chat.busy || chat.loading || chat.expired || !chat.status?.ready;

  async function clearConversation() {
    if (!await chat.remove()) return;
    setDraft("");
    closeRef?.current?.focus({ preventScroll: true });
  }

  function scrollToLatest(smooth = true) {
    const region = scroll.current;
    if (!region) return;
    region.scrollTo({ top: region.scrollHeight, behavior: smooth && !window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
    nearBottom.current = true; setUnread(false);
  }
  useEffect(() => {
    if (!open) return;
    const last = chat.messages.at(-1);
    const switched = previous.current.active !== chat.active;
    const added = previous.current.last !== last?.id;
    if (!chat.messages.length) {
      scroll.current?.scrollTo({ top: 0, behavior: "auto" }); nearBottom.current = true; setUnread(false);
    } else if (switched || nearBottom.current || (added && last?.sender === "user")) scrollToLatest(!switched);
    else if (added && last?.sender === "assistant") setUnread(true);
    previous.current = { active: chat.active, last: last?.id };
  }, [chat.messages, chat.busy, chat.loading, chat.active, open]);

  const available = chat.status?.ready && chat.status.model_available && !chat.status.unreachable;
  const connection = chat.expired ? "Sign-in required" : chat.loading ? "Checking service…" : chat.status?.unreachable ? "Connection interrupted" : available ? "AI available" : chat.status?.ready ? "Limited mode" : "Service unavailable";

  return <section id={id} className="customer-ai-panel" role="dialog" aria-modal="false" aria-labelledby={`${id}-title`} lang={language}>
      <AIChatHeader labels={labels} id={id} close={close} closeRef={closeRef} />
      <div className="customer-ai-toolbar">
        <button type="button" disabled={chat.busy || chat.loading || chat.expired} onClick={chat.newConversation}><Plus size={15} />{labels.new}</button>
        <label className="customer-ai-history"><span className="customer-ai-sr-only">{labels.history}</span><select value={chat.active || ""} disabled={chat.busy || chat.loading || chat.expired}
          onChange={(event) => event.target.value ? chat.select(event.target.value) : chat.newConversation()} aria-label={labels.history}>
          <option value="">{labels.history}</option>{chat.conversations.map((row) => <option key={row.id} value={row.id}>{row.title}</option>)}
        </select></label>
        {!presentation?.hideLanguage && <label><span className="customer-ai-sr-only">{labels.language}</span><select aria-label={labels.language} value={chat.language} onChange={(event) => chat.setLanguage(event.target.value)} disabled={chat.busy || chat.loading || chat.expired}>
          <option value="auto">Auto</option><option value="en">English</option><option value="ml">മലയാളം</option><option value="hi">हिन्दी</option>
        </select></label>}
        {chat.active && <button type="button" onClick={clearConversation} disabled={chat.busy || chat.loading || chat.expired} aria-label="Clear conversation" title="Clear conversation"><Trash2 size={15} /></button>}
      </div>
      {presentation?.sessionNote && <p className="customer-ai-session-note">{presentation.sessionNote}</p>}
      <div className="customer-ai-connection" role="status"><span className={`customer-ai-status-dot${available && !chat.loading ? " is-available" : ""}`} />{connection}
        {!chat.loading && !chat.expired && <button type="button" onClick={chat.refresh} disabled={chat.busy} aria-label="Check assistant availability" title="Check availability"><RotateCcw size={12} /></button>}
      </div>
      <div className="customer-ai-transcript">
        <div ref={scroll} className="customer-ai-messages" role="log" aria-live="polite" aria-label="Support conversation" aria-relevant="additions text" aria-busy={chat.loading}
          onScroll={() => { const region = scroll.current; nearBottom.current = region.scrollHeight - region.scrollTop - region.clientHeight < 70; if (nearBottom.current) setUnread(false); }}>
          {!chat.messages.length && !chat.loading && !chat.expired && !chat.error && <div className="customer-ai-welcome">
            <span className="customer-ai-welcome-icon" aria-hidden="true"><Sparkles size={28} /></span>
            <h3>{labels.welcome}</h3><p>{labels.help}</p>
            <div className="customer-ai-actions">{actions.map(([action, Icon], index) => <button key={action} type="button" disabled={disabled} onClick={() => chat.send(labels.actions[index], action)}>
              <Icon size={17} aria-hidden="true" /><span>{labels.actions[index]}</span><ArrowUpRight size={13} aria-hidden="true" />
            </button>)}</div>
          </div>}
          {chat.loading && <div className="customer-ai-history-loading">{chat.messages.length
            ? <RefreshIndicator active label="Updating conversation…" />
            : <LoadingState variant="chat" label={presentation?.loadingMessage || "Loading conversations…"} />}</div>}
          {chat.messages.map((message) => <AIMessageBubble key={message.id} message={message} language={language} labels={labels} chat={chat} disabled={disabled} safeHref={presentation?.safeHref} summarize={presentation?.summarize} />)}
          {chat.busy && <div className="customer-ai-thinking" role="status"><span className="customer-ai-message-avatar" aria-hidden="true"><Bot size={16} /></span>
            <span className="customer-ai-thinking-dots" aria-hidden="true"><i /><i /><i /></span><span>{labels.loading}</span>
          </div>}
          {chat.error && <div className="customer-ai-error" role="alert"><CircleHelp size={17} aria-hidden="true" /><div><p>{chat.error}</p>
            {chat.expired ? <Link to={presentation?.loginPath || "/customer/login"}>Sign in again</Link> : chat.canRetry && chat.status?.ready ? <button type="button" disabled={chat.busy || chat.loading} onClick={chat.retry}>Retry reply <RotateCcw size={12} /></button> : <button type="button" disabled={chat.busy || chat.loading} onClick={chat.refresh}>Try again</button>}
          </div></div>}
        </div>
        {unread && <button type="button" className="customer-ai-latest" onClick={() => scrollToLatest()}><ArrowDown size={14} />New reply</button>}
      </div>
      {chat.status?.ready && !chat.status.model_available && !chat.status.unreachable && <p className="customer-ai-limited">{presentation?.limitedMessage || "AI is temporarily unavailable. Account lookups and help still work."}</p>}
      {chat.status && !chat.status.ready && <p className="customer-ai-limited">The assistant is temporarily unavailable. Check availability to try again.</p>}
      <AIChatInput id={id} chat={chat} labels={labels} draft={draft} setDraft={setDraft} open={open} />
      <p className="customer-ai-note"><Sparkles size={10} aria-hidden="true" />{labels.note}</p>
    </section>;
}

export function CustomerAiSignInPanel({ id, close, closeRef, preview = false }) {
  return <section id={id} className="customer-ai-panel customer-ai-sign-in" role="dialog" aria-modal="false" aria-labelledby={`${id}-title`}>
    <AIChatHeader labels={AI_LABELS.en} id={id} close={close} closeRef={closeRef} />
    <div className="customer-ai-welcome"><span className="customer-ai-welcome-icon" aria-hidden="true"><MessageCircle size={28} /></span><h3>Welcome to DineBook AI!</h3>
      <p>{preview ? "Sign in with a customer account to use AI support. Chat is unavailable in the local preview session." : "Sign in to chat about your bookings, orders, wallet, or a restaurant."}</p>
      <Link className="customer-ai-sign-in-link" to="/customer/login" onClick={close}>Sign in for support <ArrowUpRight size={15} /></Link>
    </div>
  </section>;
}

export default function CustomerAiWidget({ user }) {
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const launcher = useRef(null);
  const closeButton = useRef(null);
  const widget = useRef(null);
  const id = useId();
  const authenticated = Boolean(user?.id && user.role === "CUSTOMER" && user.id !== demoCustomer.id);
  const chat = useCustomerAi(user?.id, open && authenticated);
  function close() { setOpen(false); }
  useEffect(() => {
    if (!open) { if (opened) launcher.current?.focus({ preventScroll: true }); return; }
    const frame = window.requestAnimationFrame(() => closeButton.current?.focus({ preventScroll: true }));
    const key = (event) => {
      if (event.key === "Escape" && !document.querySelector('[role="alertdialog"]')) { event.preventDefault(); close(); }
    };
    document.addEventListener("keydown", key);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener("keydown", key); };
  }, [open, opened]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || !viewport) return;
    const resize = () => {
      widget.current?.style.setProperty("--customer-ai-viewport-height", `${viewport.height}px`);
      widget.current?.style.setProperty("--customer-ai-viewport-top", `${viewport.offsetTop}px`);
    };
    resize(); viewport.addEventListener("resize", resize); viewport.addEventListener("scroll", resize);
    return () => { viewport.removeEventListener("resize", resize); viewport.removeEventListener("scroll", resize); };
  }, [open]);
  // Account changes and sign-out remount this widget at the portal boundary.
  // Minimizing only hides the panel: drafts, scroll position and replies survive.
  return <div ref={widget} className="customer-ai-widget" data-open={open}>
    {opened && <div className="customer-ai-panel-slot" inert={open ? undefined : ""} aria-hidden={!open}>
      {authenticated ? <CustomerAiPanel key={user.id} chat={chat} close={close} closeRef={closeButton} id={id} open={open} /> :
        <CustomerAiSignInPanel id={id} close={close} closeRef={closeButton} preview={user?.id === demoCustomer.id} />}
    </div>}
    <button ref={launcher} className="customer-ai-launcher" type="button" aria-label={open ? "Close customer support" : "Open customer support"}
      title="Ask DineBook AI" aria-haspopup="dialog" aria-expanded={open} aria-controls={opened ? id : undefined}
      onClick={() => { if (open) close(); else { setOpened(true); setOpen(true); } }}>
      {open ? <X size={21} aria-hidden="true" /> : <Sparkles size={21} aria-hidden="true" />}<span>{open ? "Close" : "Ask DineBook AI"}</span>
    </button>
  </div>;
}

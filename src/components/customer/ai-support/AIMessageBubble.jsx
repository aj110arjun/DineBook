import { memo, useState } from "react";
import { Bot, Check, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import { safeSupportHref, supportCardFields, supportFieldLabel, supportFieldValue, supportSummary } from "../../../lib/customerAi.js";

function SupportFields({ entries, fields }) {
  return <dl>{entries.map(([key, value]) => <div key={key}>
    <dt>{supportFieldLabel(key, fields)}</dt><dd>{supportFieldValue(key, value)}</dd>
  </div>)}</dl>;
}

export function SupportText({ text }) {
  // Never interpret model output as HTML, links or image markup.
  const inline = (line) => line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((piece, index) =>
    piece.startsWith("**") ? <strong key={index}>{piece.slice(2, -2)}</strong> :
      piece.startsWith("`") ? <code key={index}>{piece.slice(1, -1)}</code> : piece);
  return text.split(/\n\n+/).map((block, index) => {
    const lines = block.split("\n");
    if (lines.every((line) => /^[-*] /.test(line))) return <ul key={index}>{lines.map((line, n) => <li key={n}>{inline(line.slice(2))}</li>)}</ul>;
    if (lines.every((line) => /^\d+[.)] /.test(line))) return <ol key={index}>{lines.map((line, n) => <li key={n}>{inline(line.replace(/^\d+[.)] /, ""))}</li>)}</ol>;
    return <p key={index}>{inline(block)}</p>;
  });
}

export function AICopyButton({ text, label = "Copy message", copiedLabel = "Message copied" }) {
  const [state, setState] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(text); setState("copied"); }
    catch { setState("failed"); }
  }
  return <span className="customer-ai-copy">
    <button type="button" onClick={copy} aria-label={state === "copied" ? copiedLabel : label} title={label}>
      {state === "copied" ? <Check size={13} /> : <Copy size={13} />}{label === "Copy message" ? null : <span>{state === "copied" ? copiedLabel : label}</span>}
    </button>
    <span className={state === "failed" ? "customer-ai-copy-error" : "customer-ai-sr-only"} role="status">
      {state === "failed" ? "Couldn't copy. Select the message text to copy it." : state === "copied" ? copiedLabel : ""}
    </span>
  </span>;
}

export default memo(function AIMessageBubble({ message, language, labels, chat, disabled, safeHref = safeSupportHref, summarize = supportSummary }) {
  const assistant = message.sender === "assistant";
  return <article className={`customer-ai-message is-${assistant ? "assistant" : "user"}`} aria-label={assistant ? "DineBook Assistant" : "You"}>
    {assistant && <span className="customer-ai-message-avatar" aria-hidden="true"><Bot size={16} /></span>}
    <div className="customer-ai-message-body">
      <div className="customer-ai-bubble"><SupportText text={message.content} />
        {(message.answer?.cards || []).map((card, index) => {
          const href = safeHref(card.href);
          const fields = supportCardFields(card);
          return <section className="customer-ai-fact" key={`${card.title}-${index}`}>
            <h4>{card.title}</h4><SupportFields entries={fields.primary} fields={card.fields} />
            {fields.secondary.length > 0 && <details className="customer-ai-details"><summary>{labels.more}</summary>
              <SupportFields entries={fields.secondary} fields={card.fields} />
            </details>}
            {href && <Link to={href}>View details →</Link>}
            {card.restaurant_id && ["restaurant", "hours", "availability"].includes(card.kind) && <div className="customer-ai-followups">{["hours", "availability", "offers"].map((action) => <button type="button" key={action} disabled={disabled}
              onClick={() => chat.send(`${action}: ${card.title}`, action, card.restaurant_id)}>{action === "hours" ? "Hours" : action === "availability" ? "Availability" : "Offers"}</button>)}</div>}
          </section>;
        })}
        {message.answer?.sources?.length > 0 && <details className="customer-ai-details customer-ai-articles"><summary>{labels.articles}</summary><nav className="customer-ai-sources" aria-label="Answer sources">{message.answer.sources.map((source) => {
          const href = safeHref(source.href);
          return href && <Link key={source.id} to={href}>{source.title}</Link>;
        })}</nav></details>}
        {message.answer?.escalation && <div className="customer-ai-escalation">
          <AICopyButton text={summarize(chat.messages)} label={labels.copy} copiedLabel={labels.copied} />
          <details><summary>View support summary</summary><textarea readOnly aria-label="Support summary" value={summarize(chat.messages)} rows={5} /></details>
          {safeSupportHref(chat.status?.support_url, chat.status?.support_url) && <a href={chat.status.support_url} target="_blank" rel="noopener noreferrer">Contact support →</a>}
        </div>}
      </div>
      <div className="customer-ai-message-meta">
        <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleTimeString(language === "ml" ? "ml-IN" : language === "hi" ? "hi-IN" : "en-IN", { hour: "2-digit", minute: "2-digit" })}</time>
        {assistant && <AICopyButton text={summarize([message])} />}
        {message.delivery === "failed" && <span className="customer-ai-delivery">Reply not received</span>}
      </div>
    </div>
  </article>;
});

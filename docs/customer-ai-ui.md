# Customer AI interface

The customer assistant reuses the existing cookie-authenticated `/api/customer/ai`
APIs, PostgreSQL conversation storage, read-only tools and private Ollama integration.
It is mounted once by `CustomerAiSupport` across customer routes. Customer auth pages
and the Manager, Chef and Admin portals do not mount it. Guests and preview accounts
receive a sign-in prompt. No business records are changed through this interface.

## Implementation

- `src/components/customer/CustomerAiWidget.jsx`: launcher, nonmodal panel, verified
  service status, conversation controls and scroll behavior.
- `src/components/customer/ai-support/AIChatInput.jsx`: expanding composer, character
  and UTF-8 validation, Enter/Shift+Enter, IME protection and draft handling.
- `src/components/customer/ai-support/AIMessageBubble.jsx`: avatars, timestamps,
  copy feedback, safe Markdown subset, read-only cards and source/escalation links.
- `src/components/customer/ai-support/customerAiCopy.js`: English, Malayalam and Hindi
  copy, retaining the existing language preferences.
- `src/hooks/useCustomerAi.js`: authenticated history, concurrent-request guards,
  stable retry UUIDs, cancellation, timeout and account cleanup.
- `src/lib/customerAi.js`: configured API base, credentialed SSE, validation limits,
  friendly errors and customer-route link allowlist.
- `src/assets/css/CustomerAi.css`: existing burgundy/gold design tokens, light/dark
  surfaces, reduced motion and responsive layout.

Added files: the three `ai-support` files above,
`src/lib/customerAi.lifecycle.test.js`, `tests/customer-ai-preview.html`,
`tests/customer-ai-preview.jsx`, and this document.

Modified frontend files: `CustomerAiWidget.jsx`, `useCustomerAi.js`, `customerAi.js`,
`CustomerAi.css`, `src/lib/customerAi.test.js`, `src/lib/customerAi.render.test.js`,
and `package.json`. Modified backend files: `app/routers/customer/customer_ai.py`,
`tests/test_customer_ai.py`, and `docs/customer-ai-support.md`. The only backend
behavior change adds the configured reply deadline to the existing status response.

Quick actions send real requests for restaurant discovery, reservations, orders,
payments, offers, human support, wallet and refunds. Restaurant cards retain hours,
availability and offer follow-ups. Human support offers summary copying and the
configured contact URL; it does not claim to send a message or create a ticket.

## Interaction details

The desktop panel floats above the launcher. On narrow screens it fills the visual
viewport with safe-area padding and follows mobile keyboard resizing. The existing
theme toggle moves to the left while the customer launcher is present. The launcher
moves above the restaurant booking dock. Desktop page controls remain accessible;
Escape closes the panel and returns focus to its launcher.

Minimize and Close hide the mounted panel, preserving the draft, scroll position
and a pending reply. Stop explicitly aborts generation. Sign-out, account change
and unmount abort requests and discard the session's local UI state. Persisted
history is read/deleted through customer-owned backend endpoints only.

Failed input stays in the composer. Retry and resending the same draft reuse its
client UUID; a successful retry clears the matching submitted draft. Text written
while another reply is pending is preserved. The textarea permits continued typing
but submission is guarded synchronously until the request completes. The server's
configured turn deadline controls the browser timeout, including conversation
creation. History operations have the existing 10-second request timeout.

New responses scroll into view when already near the bottom. Reading older replies
preserves position and displays a New reply control. Empty chats open at the top.
The clear button directly deletes only the current saved conversation, without a
confirmation modal. The draft resets after successful deletion; failures preserve it.

Availability is checked on each open and through the refresh control. An unverified
or failed check never displays Online. Offline inference shows Limited mode: the
existing deterministic account lookups and published help remain available. A
failed API reply invalidates the connection indicator until recovery. Raw HTML,
Markdown links/images, JavaScript URLs and traversal outside customer routes are
never activated. Supported Markdown is paragraphs, bullets, numbered lists, bold
and inline code rendered as React text.

## Setup

No new dependency or environment variable is required by this UI update. It uses
the existing `VITE_API_URL` or Vite's same-origin `/api` proxy, credentialed requests
and the current HTTP-only authentication cookie. No token is read in JavaScript.
The existing client has no automatic token-refresh flow; expiry directs customers
to sign in again.

Backend configuration and the existing migration prerequisite are documented in
`../../DineBookBackend/docs/customer-ai-support.md`. If setting up an environment:

```sh
# Backend directory; only if existing migrations have not already been applied
venv/bin/alembic upgrade head
ollama pull qwen3:1.7b
# Start the Ollama daemon if it is not already running
ollama serve
```

Existing backend defaults include `AI_SUPPORT_ENABLED=true`,
`OLLAMA_BASE_URL=http://127.0.0.1:11434`, `OLLAMA_MODEL=qwen3:1.7b`,
`OLLAMA_TIMEOUT_SECONDS=90`, `AI_SUPPORT_TURN_TIMEOUT_SECONDS=120` and an optional
verified HTTPS `AI_SUPPORT_CONTACT_URL`. No environment file or database migration
was changed by this update.

## Verification

```sh
npm run test:customer-ai
node --test src/state/customerSession.test.js src/lib/confirmDialog.test.js
npm run build
# Backend directory
venv/bin/python -m unittest tests.test_customer_ai tests.test_ollama_service -q
```

The frontend suite includes protocol/security tests, server-rendered interface
checks and request lifecycle tests using the repository's existing lightweight
hook-double convention. The backend suite covers role isolation, customer record
ownership, SELECT-only business tools, idempotency, persisted history/deletion,
revocation, cancellation, limits and offline inference fallback.

Verified on November 16, 2026: all 28 frontend AI tests, three shared session/dialog
tests, and 27 backend tests passed. The production build passed with Vite's large
bundle warning; `git diff --check` passed in both repositories. A live smoke test
confirmed the configured Ollama model was available and returned a schema-valid
restaurant classification. The complete customer browser flow was checked with
the isolated fixture, rather than a real signed-in account.

Browser checks covered welcome/quick actions, structured replies, multiline and
preserved drafts, Enter, copy feedback, retry recovery and replies while minimized, network/server/
timeout/expiry failures, sign-out, chat deletion, inert script
and unsafe-link text, older-message scroll preservation, new-reply navigation,
Escape/focus restoration, light/dark themes, and 1280px, 390px and 320px viewports.
The resize regression check also verified a preserved multiline draft and no
browser errors while moving through mobile and desktop widths. Textarea writes
are deferred outside ResizeObserver delivery and pending frames are cleaned up.

For browser interaction checks, run `npm run dev` and open
`/tests/customer-ai-preview.html`. This development fixture renders the real widget
and hook with synthetic data and isolated in-memory transport doubles. It never
calls the real backend. Select ready/offline/server/network/expired/forbidden/slow/
timeout scenarios, use the theme control, and test draft persistence, Stop/Retry,
clearing and sign-out. Send “malicious” to render script and unsafe-link text safely.
The preview is not an application route and is not included in the production build.

Before deployment, verify a signed-in customer's browser end to end against the
actual PostgreSQL/Ollama deployment, cold/warm CPU latency, a physical mobile
keyboard, assistive technology and native-speaker translations. Account cards
represent recorded application state, not independent payment-provider checks;
availability does not reserve tables or guarantee offer eligibility. The existing
SSE endpoint emits progress and the final validated answer, not incremental tokens.

# Manager AI chat

Approved, signed-in managers see **Ask DineBook AI** throughout the manager portal.
The widget is mounted in `ManagerProtectedRoute`, so changing pages preserves the
chat. It uses the customer assistant's panel, composer and message rendering with
manager-specific copy, quick actions, links and transport.

Quick actions cover today's summary, upcoming reservations, active orders,
pending payments, monthly revenue, manager wallet, live tables, portal help and
support contact. Questions can specify today, yesterday, the last seven days or
this month. A follow-up such as “What about yesterday?” keeps the previous topic.
Replies include recorded figures and links to the corresponding manager pages.

The assistant reads information. Changes to bookings, orders, payments and setup
use the existing portal controls. Revenue uses the existing dashboard collection
ledger and refund-date rules. Wallet balances are separate. Table status is live;
historical occupancy is unavailable in chat. Payment results show pending records,
with up to five orders and five reservation fees.

Chats are held in React memory for this portal session. New chat, switching chats
and direct clearing operate on that session only. Reloading, leaving the
protected portal or signing out discards them. No manager chat is written to
local storage or persisted in the database. Minimize preserves drafts and pending
replies. Stop aborts the request; Retry reuses its client message UUID and reads
fresh data. The composer retains failed drafts and supports Enter to send and
Shift+Enter for a new line.

## API and setup

- `GET /api/manager/ai/status` checks authenticated availability and returns the
  restaurant identity, message limit, configured reply deadline and support URL.
- `POST /api/manager/ai/chat` accepts a message, client UUID, optional fixed action,
  bounded topic context and up to six previous user messages. English is supported.

The backend derives restaurant ownership from the authenticated manager. Clients
cannot select a restaurant. Each lookup filters by that restaurant, runs in a
separate read-only transaction on PostgreSQL, and rechecks authorization before
returning the answer. Business facts never enter Ollama's classification prompt.
Manager and customer turns share the existing single-process CPU admission gate.
Manager AI POSTs have a 20-request-per-IP-per-minute limit when rate limiting is
enabled. Existing deployment guidance for multiple workers still applies.

The feature uses the existing `AI_SUPPORT_ENABLED`, Ollama and optional
`AI_SUPPORT_CONTACT_URL` configuration; see
`../../DineBookBackend/docs/customer-ai-support.md`. No dependency, environment
variable or migration is added. Quick actions and portal help work when Ollama is
offline. A configured support link and copyable summary let the manager contact
support; the assistant does not submit a ticket.

## Verification

```sh
# Frontend
npm run test:manager-ai
npm run test:customer-ai
npm run build
# Backend
venv/bin/python -m unittest tests.test_manager_ai tests.test_customer_ai tests.test_ollama_service -q
```

The manager tests cover role and restaurant isolation, SELECT-only business
queries, ledger calculations, supported dates, follow-up context, approval and
revocation, timeout/cancellation and shared admission control. Frontend tests cover
safe rendering and links, expiry, mismatched restaurant replies, concurrent
submission, draft recovery, retry, session chats and unmount cleanup.

For an isolated browser preview, run Vite and open
`/tests/manager-ai-preview.html`. It renders the real widget and hook with synthetic
responses and blocks real API requests. This fixture is excluded from the
production build. Browser checks covered quick actions, revenue cards, desktop and
390px layouts, draft preservation on minimize, failure/retry recovery and browser
console errors. A real signed-in PostgreSQL/Ollama deployment was not exercised.

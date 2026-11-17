# Admin platform ledger

The admin dashboard includes PDF, Excel, and CSV ledger downloads beside its period and refresh controls. Downloads use the applied dashboard dates, inclusive in Asia/Kolkata. Edited custom dates must be applied before exporting. Applying another range or leaving the dashboard cancels a pending download.

The platform ledger covers all restaurants and uses the admin dashboard's canonical payment and commission records. Entries include food-order, reservation-fee, and preorder collections, refunds on their recorded reversal date, and commission settlements. A historical payout covering multiple payments appears once. Restaurant names and payment codes or payout references accompany every entry.

Payment references show DineBook order codes (`ORD-XXXXXXXX`) or reservation codes (`RES-XXXXXXXX`). Reservation fees and preorders share their reservation code, and refunds retain the original code. Commission settlements retain their payout reference because they can cover multiple orders and reservations.

Opening and closing balances are outstanding commission receivables: earned commission minus net internal commission settlements. They are separate from restaurant net collections, wallet balances, and bank receipts. Refunds reverse original commission; already collected commission also reverses its settlement. Summary totals reconcile to the admin revenue dashboard. Wallet top-ups and internal transfers are excluded from sales.

Admin-only read APIs:

- `GET /api/admin/ledger?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&page=1&page_size=20`
- `GET /api/admin/ledger/export?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&format=pdf|xlsx|csv`

Exports include the complete selected period regardless of pagination. Ranges exceeding 50,000 entries are rejected explicitly. Reads use an uncached, read-only consistent PostgreSQL snapshot. No migration or additional package is required.

Validation: `npm run test:ledger`, `npm run test:admin-dashboard`, `npm run build`, and backend `venv/bin/python -m unittest tests.test_admin_ledger tests.test_manager_ledger tests.test_admin_dashboard tests.test_manager_dashboard -q`.

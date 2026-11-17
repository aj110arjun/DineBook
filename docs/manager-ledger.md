# Manager restaurant ledger

The manager dashboard offers PDF, Excel, and CSV ledger downloads in the same toolbar as Period, Chart interval, and Refresh. Available ranges are 30 days, 90 days, 6 months, 1 year, and Custom. Days are inclusive in Asia/Kolkata. Month/year ranges use calendar months, clamp month-end dates, and include the current business day. Custom dates require Apply range before downloading. Changing the applied range cancels any pending download.

Downloaded ledgers list recorded food-order, reservation-fee, and preorder collections and refunds. Opening and closing net balances are lifetime net collections before/through the selected range, separate from wallet balances. A refund reverses the original collection and commission on its refund date. Commission totals are net of those reversals. These rules match the existing revenue dashboard.

PDF, Excel (.xlsx), and UTF-8 CSV downloads contain every entry in the selected period. They include restaurant name, date range, IST timestamps, INR amounts, opening balance, collections, refunds, net commission, net movement, closing balance, and order/reservation codes. Excel contains numeric amounts and date cells; text is stored literally. CSV protects text that spreadsheet software could interpret as formulas. PDFs repeat the summary and table headings on each page.

References use the same displayed order (`ORD-XXXXXXXX`) and reservation (`RES-XXXXXXXX`) codes as DineBook. Reservation fees and preorders use the reservation code; refunds retain the original payment's code.

The manager-only read API is GET `/api/manager/ledger` with `start_date`, `end_date`, `page`, and `page_size`. GET `/api/manager/ledger/export` accepts the same dates and `format=pdf|xlsx|csv`. The server derives the restaurant from the authenticated manager, validates dates, disables caching, and uses a consistent read-only snapshot on PostgreSQL. No schema migration or new package is needed. Exports exceeding 50,000 entries return an explicit instruction to choose a shorter range.

Verification:

- Frontend: `npm run test:ledger`, the complete `node --test src/lib/*.test.js` suite, and `npm run build`.
- Backend: `venv/bin/python -m unittest tests.test_manager_ledger tests.test_manager_dashboard -q`.
- Backend tests cover access boundaries, inclusive IST dates, refund/commission accounting, opening/closing balances, pagination, all three exports, and prevention of silent truncation or business writes.
- Sample XLSX opened with openpyxl; sample two-page PDF rendered and visually inspected with Poppler. Browser review uses the synthetic development fixture at `/tests/ui-experience-preview.html`.

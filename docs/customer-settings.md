# Customer settings implementation

The authenticated `/customer/settings` page contains Notification Settings and General Settings together. Account navigation, the header shortcut, and the former `/customer/profile#notifications` link lead to this page. The former device-only notification controls have been removed.

## API and persistence

All endpoints require the existing customer JWT cookie and derive ownership from `current_customer`. Request schemas forbid extra fields, strictly validate notification booleans, and validate general values and IANA timezones. No customer ID is accepted in a request body.

| Endpoint | Behavior |
| --- | --- |
| `GET /api/customer/settings` | Return both sections; initialize missing records safely. |
| `PATCH /api/customer/settings/notifications` | Update only supplied notification fields and return both confirmed sections. |
| `PATCH /api/customer/settings/general` | Update only supplied general fields and return both confirmed sections. |

`notifications` contains `email_enabled`, `in_app_enabled`, `reservation_confirmation`, `reservation_reminders`, `reservation_updates`, `order_confirmation`, `order_status_updates`, `order_completion`, `payment_confirmation`, `refund_updates`, `wallet_transactions`, `promotional_offers`, and `review_updates`. All default to true except promotional offers, which default to false.

Notification values reuse `notification_preferences`, with uppercase field names in its existing category column. Existing category opt-outs initialize the corresponding granular preferences. The legacy `/api/notifications/preferences` API reads and updates the same values, so it does not compete with a second notification preference store.

The new `customer_settings` table contains:

- `customer_id`: primary key and cascading foreign key to `users.id`, enforcing one record per customer.
- `theme`, `language`, `date_format`, `time_format`, and nullable `timezone`.
- `created_at` and `updated_at` timestamps.
- Database checks for supported theme, language, date, and time formats.

The service locks the existing user row before initialization or updates, preventing concurrent first-use inserts from creating duplicates. Database errors roll back and return a safe 503 response. Responses are private and uncached under the existing API middleware.

General defaults are `system`, `en`, `DD/MM/YYYY`, `12h`, and `timezone: null`. A null timezone means use the browser's detected timezone; selecting a zone stores its explicit IANA identifier. Choosing browser default again clears the explicit preference.

Migration `0053_customer_settings` follows `0052_customer_profile`. It creates only the new general-settings table and preserves existing customer and notification data. Downgrade drops that table; existing notification preference rows remain in their original table.

The configured PostgreSQL database was upgraded and verified at `0053_customer_settings (head)` on 13 November 2026. Other deployments should run `venv/bin/alembic upgrade head` from `DineBookBackend` before starting the updated backend. Restart an already running backend so it loads the new routes and delivery policy. No new dependencies or environment variables are required.

## Notification delivery

`customer_notification_allowed` is the shared eligibility policy:

- `create_notification` checks the customer's in-app channel and matching category before creating either the notification or its recipient-scoped realtime wake-up.
- The existing reservation-confirmation email service checks the email channel and reservation-confirmation preference before rendering attachments or sending mail.
- `send_customer_notification_email` provides the same eligibility check for additional optional email producers, including promotional campaigns.
- Reservation reminders, order lifecycle events, optional payment successes, refunds, wallet transactions, and review updates map to their matching switches. Wallet refund metadata selects the refund preference rather than the wallet preference.
- Restaurant review replies now generate customer notifications when the reply changes and the preference permits delivery.
- `security.*`, `account.*`, `legal.*`, payment failure, wallet top-up failure, and system-incident notices bypass optional controls. Existing verification and password-reset emails continue through the protected authentication delivery path.
- Existing manager, chef, and admin delivery policy remains in place.

The repository has no promotional campaign producer or reservation-reminder scheduler, and reservation confirmation is its existing optional customer email path. These settings gate those event types and provide the email delivery helper; enabling a preference does not create a new campaign or scheduled job.

## Customer Portal behavior

The customer preference provider uses the existing authenticated Redux session and API client. Its account-scoped store deduplicates loads, blocks concurrent saves, applies general preferences immediately, reconciles confirmed server responses, and restores previous values after failures. Failed notification saves retain their confirmed switch state. The page shows loading, retry, saving, success, and error feedback.

The provider applies the existing theme tokens to customer routes and follows live OS color changes for System Default. Customer theme selection lives in Settings; the floating theme button has been removed. Other portals retain their existing device theme behavior.

Shared date utilities apply date format, clock notation, and timezone to customer dates, orders, wallet/transaction activity, notification timestamp tooltips, offers, reviews, reservation activity, and client-generated invoice displays. Both ISO calendar dates and the reservation API's existing English calendar-date labels are treated as timezone-independent dates. Calendar-picker Date objects are formatted as calendar dates. UTC timestamps, including legacy ISO timestamps missing a UTC suffix, are formatted in the selected activity timezone with daylight-saving rules.

Reservation times and restaurant service hours retain restaurant local wall-clock semantics and use the chosen 12/24-hour notation. Native HTML date inputs retain browser-controlled presentation. Existing reservation API date fields are unchanged; an additive `timestamps` map supplies full ISO instants for reservation and nested order activity displays.

English is the only supported language. The stored language preference and selector can be extended when translations become available. Server-generated reservation email/PDF/pass layouts retain their existing formatting; customer display preferences apply to the portal and its client-generated invoice displays.

Controls have associated labels, descriptions, keyboard-operable switches and native selects, focus styles, and theme-aware responsive layouts.

## Validation

- New backend settings suite: 18 tests, all passed. Covers initialization, persistence, strict validation, authentication and ownership, rollback, category/channel delivery, essential-message bypass, legacy API consistency, reservation email suppression, review replies, additive activity timestamps, and migration upgrade/downgrade.
- Focused backend settings/profile/review/reservation-email regression suite: 50 tests, all passed.
- Complete backend discovery: 192 tests; 184 passed, 3 skipped, 1 failure, and 4 errors. The five unsuccessful cases were independently reproduced against unchanged HEAD source in an isolated temporary copy:
  - `test_booking_slots_follow_the_actual_opening_time`: existing booking-slot expectation failure.
  - Three `test_table_floor_layout` booking tests: stale direct calls omit the endpoint's `BackgroundTasks` argument.
  - `test_seed_demo`: imports the missing `app.seed_demo` module.
- Frontend: all 13 existing/new test files passed; the settings and shared-date files contain 12 passing focused cases. Covers confirmed saves, duplicate suppression, rollback, refresh persistence, account isolation, system themes, timezone rollover, daylight saving, legacy calendar dates, and clock notation.
- `npm run build`: passed. Vite reports the existing large-bundle warning.
- `git diff --check`: passed in both repositories.
- Browser verification used the real APIs with isolated disposable SQLite data: saved switches and selectors, refresh persistence, keyboard activation, injected failed-save rollback for switches and theme, portal-wide dark theme, unchanged reservation calendar dates with UTC selected, and a 390px mobile layout with no horizontal overflow. Preview servers were stopped afterward.

## Files

Paths below are relative to their respective repository roots.

Backend additions:

- `alembic/versions/0053_customer_settings.py`
- `app/models/customer_settings.py`
- `app/schemas/customer_settings.py`
- `app/routers/customer/customer_settings.py`
- `app/services/customer_settings.py`
- `app/services/customer_email.py`
- `tests/test_customer_settings.py`

Backend updates:

- `.gitignore` — make settings and reservation-email tests trackable.
- `app/main.py` and `app/models/__init__.py` — register the router and model.
- `app/routers/events/notifications.py` — keep legacy preferences consistent.
- `app/routers/restaurants/reservations.py` — expose additive ISO activity timestamps.
- `app/routers/restaurants/reviews.py` — deliver reply notifications.
- `app/services/notifications.py` and `app/services/reservation_email.py` — enforce delivery preferences.
- `tests/test_reservation_email_pass.py` — isolate transport/attachment checks from the separately tested eligibility policy; this existing ignored test is now trackable.

Frontend additions:

- `src/pages/customer/CustomerSettingsPage.jsx`
- `src/components/customer/CustomerPreferences.jsx`
- `src/lib/customerSettings.js`
- `src/lib/customerSettings.test.js`
- `src/assets/css/CustomerSettingsPage.css`
- `docs/customer-settings.md`

Frontend updates:

- `package.json` — settings test command.
- `src/App.jsx` and `src/main.jsx` — route and preference provider.
- `src/lib/localDate.js` — shared formatting.
- `src/components/ThemeToggle.jsx`
- `src/components/CustomDatePicker.jsx`
- `src/components/CustomTimePicker.jsx`
- `src/components/RestaurantBookingDock.jsx`
- `src/components/landing/CustomerHeader.jsx`
- `src/components/notifications/NotificationBell.jsx`
- `src/pages/customer/CustomerLandingPage.jsx`
- `src/pages/customer/CustomerRestaurantListingPage.jsx`
- `src/pages/customer/CustomerProfilePage.jsx`
- `src/pages/customer/CustomerReservationsPage.jsx`
- `src/pages/customer/CustomerReservationPage.jsx`
- `src/pages/customer/CustomerReservationDetailsPage.jsx`
- `src/pages/customer/CustomerRestaurantDetailsPage.jsx`
- `src/pages/shared/OrdersPage.jsx`

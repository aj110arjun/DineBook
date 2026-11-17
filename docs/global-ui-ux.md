# DineBook global UI/UX implementation

**1. Repository analysis**

The app uses React 18, React Router 6, Vite 8, Axios, Redux Toolkit and RTK Query.
There was no installed animation library. Page state is scoped through
`usePageState`; the dashboard loaders already handle cancellation and coalescing.
Existing theme tokens in `design-system.css` cover surfaces, colors, spacing,
radii and shadows. The implementation reuses those tokens, the existing
`PortalBreadcrumb` API, portal frames, confirmation dialog, mobile navigation
hook, notifications, chart components and AI chat panel.

Previously, individual pages owned their portal frames and breadcrumbs. Most
loading branches used text, with three independent skeleton implementations.
The manager/admin dashboard loader discarded its last result during every load.
The existing scroll handler reset position and focus on navigation, without
history restoration.

**2. Implementation**

- `PageTransition` animates changing content with opacity and an 8px entrance over
  220ms. It does not key/remount pages, delay routing, or replay while typing or
  updating filters. Navigation cancels the prior animation. Reduced motion skips
  it. Route exits remain immediate so outgoing interactive/payment forms are
  never retained as a second live page.
- `PortalShell` keeps manager, chef and admin frames mounted across internal
  routes and forwards the chef outlet context. Existing layout props remain
  supported through `PortalPage`. `CustomerShell` keeps the customer header and
  notification session mounted. Account and role changes retain their existing
  session boundaries. The admin guard repeats its existing account check on
  navigation while keeping its already-verified frame visible during that check.
- Skeleton primitives compose text, cards, images, tables/rows, charts, forms,
  lists, calendars, wallet/detail views and AI history. They expose one named busy
  status and hide decorative shapes from assistive technology. They support both
  themes, reduced motion and responsive grids. Existing one-off skeleton CSS was
  retired. AI generation retains its typing indicator; refreshing an existing
  transcript uses a small refresh indicator.
- `useLoadingPhase` separates first load from refresh, including successful empty
  results. The main lists retain visible records while updating. Manager/admin
  dashboards retain successful results only for the same query; changing the
  reporting period starts a new initial load. Dashboard refresh failures show a retryable
  error while retaining their prior data. No loading timers were added.
- Breadcrumbs derive from `routeMetadata.js`, containing actual registered routes.
  Dynamic restaurant/dish names come from existing page data. Missing names use
  descriptive labels, never database IDs. Links stay inside their portal, the
  current item is text, long labels truncate with full text available, and
  dashboard/authentication pages omit unhelpful breadcrumbs. Old duplicate rows
  were removed.
- Buttons, interactive cards, navigation, popovers, notifications and dialogs use
  lightweight feedback. Confirmation cancellation and toast dismissal have a
  140ms exit; existing focus traps, Escape handling, busy states and toast
  hover/focus pause remain intact. Closed mobile drawers hide their links from
  keyboard navigation. The earlier direct AI-chat clear behavior remains intact.
- Back/forward restores recorded scroll positions. Different pages start at the
  top, hash navigation still targets its section, and query-only changes preserve
  input focus. Existing pagination, validation, filtering, sorting and mutation
  handlers remain responsible for business behavior.

No backend, API contract, schema, migration or dependency changes were made.
The app opts into React Router 6's supported future flags to avoid its development
migration warnings. No commits or pushes were performed.

**3. Portal coverage**

| Portal | Existing screens and views enhanced |
| --- | --- |
| Customer | Discovery/landing and saved restaurants; restaurant details, menu/reviews and booking/preorder menu; profile/settings; reservations and reservation details; order history/tracker; wallet/activity and transactions/details; AI chat initialization/history. |
| Manager | Dashboard statistics/charts; profile/settings/location navigation; floor/table loading; reservation calendar and visit menus; walk-in order setup and order details; menu; kitchen staff/wallet transfers; offers/reviews; payments/details; revenue/wallet; AI history. |
| Chef | Dashboard/live queue, analytics and upcoming reservation cards; shared kitchen orders and their existing operational controls; menu/dish details; service hours; profile/settings; revenue/wallet. Forced password setup remains outside the persistent operational shell. |
| Admin | Dashboard account/financial analytics, restaurant ranking and activity; restaurants/details; manager requests/details; offers; review moderation; transactions/details; revenue/commission; profile/settings. |

No customer-management, manager-management, support-table or chef order-detail
routes were invented where the application has no such route. Existing nested
order cards and operational views receive their parent loading behavior.

**4. Verification**

- `node --test --test-concurrency=1 src/lib/*.test.js src/state/*.test.js`:
  **34 test files passed**, no failures. This includes existing dashboard, profile,
  settings, password, invoice, session, page-state and both AI suites.
- `node src/lib/uiExperience.test.js`: **9 focused tests passed**. These cover
  metadata/route coverage, dynamic labels, role-safe parents, loading/error/empty
  semantics, dashboard retention/query changes, empty refreshes and retry,
  reduced-motion dismissal/cleanup, history scroll/input focus, and page entrance
  cancellation/reduced motion without replay during editing.
- `npm run build`: passed. Existing Vite large-chunk warning remains. No new
  dependency or code-splitting scheme was introduced.
- `git diff --check`: passed.
- `npm run lint`: unavailable because the project has no lint script. The installed
  global ESLint is 6.4.0 and cannot consume `eslint.config.js`; its Babel parser also
  lacks a system dependency. No successful lint result is claimed, and the
  dependency/toolchain was not changed as part of this UI task.

The development-only `/tests/ui-experience-preview.html` renders the actual app
with isolated synthetic transports and accounts. EventSource and Axios calls are
intercepted so it does not contact the backend. Controls switch among the four
portals, hold/release responses, show errors or empty discovery, change theme,
exercise a dialog, and display skeleton variants. A mount counter verifies that
headers/sidebars survive internal navigation. The reduced-motion checkbox
simulates the JavaScript media-query branch; CSS contains native reduced-motion
rules as well. None of these fixture controls ship in the production build.

Browser checks covered all four dashboards/public discovery, internal menu and
restaurant navigation, dynamic restaurant labels, initial skeletons, retained
background data, refresh error/retry, successful empty discovery, both themes,
modal cancellation/Escape/focus restoration, and mobile drawer keyboard behavior.
The viewport checks at **320, 390, 768, 1280 and 1920px** found no document-level
horizontal overflow on the tested analytics screen. Mobile tables scroll inside
their containers. There were no browser errors or warnings after fixes.

The integration check caught a scroll-handler scope error absent from the prior
render-only suite; it was fixed and is covered by the new navigation regression
check. Existing dashboard tests were updated for the shared skeleton composition.

**5. Limits and follow-up**

The browser fixture uses synthetic accounts/data. Real PostgreSQL/Ollama, external
payments, emails, physical mobile keyboards and assistive technology were not
exercised. The existing test suites were used for workflow regression coverage;
not every possible form/mutation was clicked in a browser. Skeletons approximate
content geometry; variable-height real results can still change page length.
Full route exit animation is intentionally omitted to preserve immediate routing
and prevent duplicate live forms. Detail/record changes may use a fresh skeleton
rather than expose a stale record. The application's pre-existing bundle-size and
lint-toolchain issues remain follow-ups.

**6. File manifest**

The following files comprise this implementation. Paths are relative to the
frontend repository.

**13 created files; 69 modified files.**

| File | Change |
| --- | --- |
| `docs/global-ui-ux.md` | Created. Document architecture, implementation, coverage, verification, limits and this manifest. |
| `package.json` | Modified. Add the focused UI verification command; dependencies are unchanged. |
| `src/App.jsx` | Modified. Nest real routes under persistent customer and staff portal shells; preserve protected and forced-password routes. |
| `src/assets/css/AdminDashboardPage.css` | Modified. Retire superseded skeleton styles or preserve existing page geometry inside the content wrapper. |
| `src/assets/css/ChefDashboardPage.css` | Modified. Retire superseded skeleton styles or preserve existing page geometry inside the content wrapper. |
| `src/assets/css/ManagerOrdersPage.css` | Modified. Retire superseded skeleton styles or preserve existing page geometry inside the content wrapper. |
| `src/assets/css/ui-experience.css` | Created. Define token-based skeletons, content and dialog motion, breadcrumbs and mobile drawer visibility. |
| `src/assets/css/ux-improvements.css` | Modified. Retire superseded skeleton styles or preserve existing page geometry inside the content wrapper. |
| `src/components/AppExperience.jsx` | Modified. Restore history scroll positions and avoid moving input focus on query changes. |
| `src/components/ConfirmActionDialog.jsx` | Modified. Animate cancellation while preserving confirmation behavior and focus management. |
| `src/components/PortalBreadcrumb.jsx` | Modified. Preserve its legacy API and add centralized, semantic, role-safe breadcrumbs. |
| `src/components/admin/AdminLayout.jsx` | Modified. Expose a persistent frame while retaining the existing page-level layout API. |
| `src/components/auth/AdminProtectedRoute.jsx` | Modified. Support a nested outlet and repeat navigation access checks while retaining the verified frame. |
| `src/components/chef/ChefLayout.jsx` | Modified. Expose a persistent frame while retaining the existing page-level layout API. |
| `src/components/customer/CustomerAiWidget.jsx` | Modified. Use shared history skeletons and background transcript feedback; retain typing and direct clearing. |
| `src/components/landing/CustomerHeader.jsx` | Modified. Separate the persistent customer header from page registration. |
| `src/components/landing/CustomerOrderTracker.jsx` | Modified. Use a compact initial order-tracking skeleton. |
| `src/components/landing/RestaurantSection.jsx` | Modified. Use restaurant-card skeletons and retain cards during refresh. |
| `src/components/manager/DashboardCharts.jsx` | Modified. Reuse the shared empty-state presentation for existing chart and operational views. |
| `src/components/manager/ManagerLayout.jsx` | Modified. Expose a persistent frame while retaining the existing page-level layout API. |
| `src/components/notifications/NotificationToasts.jsx` | Modified. Add a cleanup-aware dismiss animation without changing delivery or hover/focus pause. |
| `src/components/ui/CustomerShell.jsx` | Created. Keep the customer header mounted and register existing page data for labels. |
| `src/components/ui/LoadingState.jsx` | Created. Provide semantic loading, refresh, error and empty states. |
| `src/components/ui/PageTransition.jsx` | Created. Run a cancelable, reduced-motion-aware content entrance without remounting pages. |
| `src/components/ui/PortalShell.jsx` | Created. Keep staff frames mounted, register page titles and forward outlet/session context. |
| `src/components/ui/Skeleton.jsx` | Created. Provide reusable text, card, table/row, chart, form, calendar and chat compositions. |
| `src/hooks/useAnimatedDismiss.js` | Created. Coordinate short dismiss animations with cleanup and reduced motion. |
| `src/hooks/useLoadingPhase.js` | Created. Separate initial loading from refresh, including successful empty responses. |
| `src/lib/adminDashboard.render.test.js` | Modified. Update existing assertions to verify the shared skeleton composition. |
| `src/lib/chefDashboard.render.test.js` | Modified. Update existing assertions to verify the shared skeleton composition. |
| `src/lib/managerDashboard.js` | Modified. Retain the last successful same-query dashboard result during refresh. |
| `src/lib/routeMetadata.js` | Created. Describe only registered internal routes and safe dynamic-label fallbacks. |
| `src/lib/uiExperience.test.js` | Created. Add nine focused route, state, refresh, animation and navigation regression tests. |
| `src/main.jsx` | Modified. Load the shared UI stylesheet and React Router future flags. |
| `src/pages/admin/AdminDashboardPage.jsx` | Modified. Use shared dashboard loading compositions. |
| `src/pages/admin/AdminManagerRequestDetailsPage.jsx` | Modified. Use shared detail loading compositions. |
| `src/pages/admin/AdminOffersPage.jsx` | Modified. Use shared table loading compositions; retain settled content during refresh. |
| `src/pages/admin/AdminProfilePage.jsx` | Modified. Use shared form loading compositions; retain settled content during refresh. |
| `src/pages/admin/AdminRequestsPage.jsx` | Modified. Use shared table loading compositions; retain settled content during refresh. |
| `src/pages/admin/AdminRestaurantDetailsPage.jsx` | Modified. Use shared detail, menu loading compositions; supply entity names from existing page data. |
| `src/pages/admin/AdminRestaurantPaymentsPanel.jsx` | Modified. Use shared table loading compositions; retain settled content during refresh. |
| `src/pages/admin/AdminRestaurantsPage.jsx` | Modified. retain settled content during refresh. |
| `src/pages/admin/AdminReviewModerationPage.jsx` | Modified. Use shared list loading compositions; retain settled content during refresh. |
| `src/pages/admin/AdminSettingsPage.jsx` | Modified. Use shared form loading compositions. |
| `src/pages/admin/AdminTransactionDetailsPage.jsx` | Modified. Use shared detail loading compositions. |
| `src/pages/chef/ChefDashboardPage.jsx` | Modified. Use shared dashboard loading compositions. |
| `src/pages/chef/ChefMenuPage.jsx` | Modified. Use shared menu loading compositions; retain settled content during refresh; supply entity names from existing page data. |
| `src/pages/chef/ChefProfilePage.jsx` | Modified. Use shared form loading compositions; retain settled content during refresh. |
| `src/pages/chef/ChefServiceHoursPage.jsx` | Modified. Use shared form loading compositions; retain settled content during refresh. |
| `src/pages/chef/ChefSettingsPage.jsx` | Modified. Use shared form loading compositions. |
| `src/pages/customer/CustomerLandingPage.jsx` | Modified. Use shared cards loading compositions; animate content without remounting its shell. |
| `src/pages/customer/CustomerProfilePage.jsx` | Modified. Use shared form loading compositions; animate content without remounting its shell. |
| `src/pages/customer/CustomerReservationDetailsPage.jsx` | Modified. Use shared detail loading compositions. |
| `src/pages/customer/CustomerReservationPage.jsx` | Modified. Use shared detail, menu loading compositions; supply entity names from existing page data; animate content without remounting its shell. |
| `src/pages/customer/CustomerReservationsPage.jsx` | Modified. Use shared list loading compositions; retain settled content during refresh; animate content without remounting its shell. |
| `src/pages/customer/CustomerRestaurantDetailsPage.jsx` | Modified. Use shared detail, list, menu loading compositions; supply entity names from existing page data; animate content without remounting its shell. |
| `src/pages/customer/CustomerRestaurantListingPage.jsx` | Modified. Use shared cards loading compositions; retain settled content during refresh; animate content without remounting its shell. |
| `src/pages/customer/CustomerSavedRestaurantsPage.jsx` | Modified. Use shared cards loading compositions; retain settled content during refresh. |
| `src/pages/customer/CustomerSettingsPage.jsx` | Modified. Use shared form loading compositions. |
| `src/pages/customer/CustomerTransactionDetailsPage.jsx` | Modified. Use shared detail loading compositions. |
| `src/pages/customer/CustomerTransactionsPage.jsx` | Modified. Use shared table loading compositions; retain settled content during refresh. |
| `src/pages/customer/CustomerWalletPage.jsx` | Modified. Use shared table, wallet loading compositions. |
| `src/pages/manager/ManagerChefWalletTransfers.jsx` | Modified. Use shared detail loading compositions. |
| `src/pages/manager/ManagerDashboardPage.jsx` | Modified. Use shared dashboard loading compositions. |
| `src/pages/manager/ManagerFloorsPage.jsx` | Modified. Use shared calendar loading compositions. |
| `src/pages/manager/ManagerMenuPage.jsx` | Modified. Use shared detail, menu loading compositions; retain settled content during refresh; supply entity names from existing page data. |
| `src/pages/manager/ManagerOffersPage.jsx` | Modified. Use shared list loading compositions; retain settled content during refresh. |
| `src/pages/manager/ManagerOperatingHoursPage.jsx` | Modified. Use shared form loading compositions; retain settled content during refresh. |
| `src/pages/manager/ManagerOrderDetailsPage.jsx` | Modified. Use shared detail loading compositions. |
| `src/pages/manager/ManagerPaymentsPage.jsx` | Modified. Use shared detail, table loading compositions; retain settled content during refresh. |
| `src/pages/manager/ManagerProfilePage.jsx` | Modified. Use shared form loading compositions; retain settled content during refresh. |
| `src/pages/manager/ManagerReservationsPage.jsx` | Modified. Use shared list, menu loading compositions. |
| `src/pages/manager/ManagerReviewsPage.jsx` | Modified. Use shared list loading compositions; retain settled content during refresh. |
| `src/pages/manager/ManagerSettingsPage.jsx` | Modified. Use shared form loading compositions. |
| `src/pages/manager/ManagerSpotOrderPage.jsx` | Modified. Use shared menu loading compositions. |
| `src/pages/manager/ManagerStaffPage.jsx` | Modified. Use shared list loading compositions; retain settled content during refresh. |
| `src/pages/shared/OrdersPage.jsx` | Modified. Use shared list loading compositions; retain settled content during refresh; animate content without remounting its shell. |
| `src/pages/shared/RevenueWalletPage.jsx` | Modified. Use shared dashboard loading compositions. |
| `tests/customer-ai-preview.jsx` | Modified. Load the shared skeleton stylesheet in the existing isolated AI preview. |
| `tests/manager-ai-preview.jsx` | Modified. Load the shared skeleton stylesheet in the existing isolated AI preview. |
| `tests/ui-experience-preview.html` | Created. Provide a development-only four-portal integration entry. |
| `tests/ui-experience-preview.jsx` | Created. Exercise the actual app with synthetic data, controlled requests and shell-mount probes. |

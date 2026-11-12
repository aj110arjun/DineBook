# DineBook UX improvements

This implementation applies the linked Laws of UX articles to existing product
flows. The wine-and-gold branding and current booking/payment rules are retained.
This is a shared UX improvement pass, not a claim that every screen has been
independently usability-tested or accessibility-certified.

## Sources and application

- [Design Principles for Reducing Cognitive Load](https://lawsofux.com/articles/2015/design-principles-for-reducing-cognitive-load/): one clear discovery action, shorter copy, grouped navigation, visible active filters and actionable errors.
- [Onboarding for Active Users](https://lawsofux.com/articles/2024/onboarding-for-active-users/): guidance beside table selection and payment controls, with no blocking product tour.
- [Familiar vs Novel](https://lawsofux.com/articles/2024/familiar-vs-novel/): standard search forms, links for navigation, labelled time controls, visible progress and predictable keyboard behavior.
- [Peak-End Rule](https://lawsofux.com/articles/2020/peak-end-rule/): the booking outcome leads to reservation details; pending payment copy explains how to check status before paying again.

## Changes

### Discovery and restaurant search

- Homepage search opens the listing with the entered query.
- Header links and footer navigation lead to implemented destinations.
- The non-functional hardcoded location selector is replaced by a restaurant discovery link. Actual nearby search remains an explicit location-permission action in the listing.
- Unsupported promotional claims and sample guest testimonials are removed from the live discovery experience.
- Listing search waits 300 ms while typing, cancels obsolete requests and supports Enter or the Search button.
- Search and cuisine/location filters are represented in the URL and as removable chips.
- Skeletons preserve the results layout during loading; empty/error states offer recovery.

### Booking

- Three-stage progress with links back to completed editable steps.
- Focus moves to the new step when the customer advances.
- Table selection shows selected seats, selected tables and a checkmark that does not rely on color alone.
- Disabled progression explains the missing seats or newly unavailable selection.
- Insufficient-wallet guidance offers Razorpay or a wallet top-up in a new tab, preserving the booking page.
- Booking outcome links to reservation details; pending payment guidance avoids instructing the customer to reload an in-progress booking.
- Existing local dates, start/end times, capacity limits and pricing remain in place.

### Shared customer, manager, kitchen and admin interactions

- Consistent focus indicators, larger shared touch controls and reduced-motion support.
- Skip navigation and focus handling for route changes.
- Mobile navigation supports Escape, focus containment and focus return.
- Manager and kitchen destinations are normal links, supporting browser navigation conventions.
- Forms show a linked error summary alongside field-level messages, without clearing input.
- Password visibility controls announce their state and keep a clear field label.
- Confirmation dialogs initially focus Cancel, retain keyboard focus during submission and show action failures.
- Offline, screen-error and unknown-route states explain recovery options.
- Admin sidebar no longer displays a hardcoded person's identity.

## Validation

- Production frontend build.
- Existing frontend tests for form validation, confirmation requests, table layout and invoice generation.
- Browser checks: homepage search to filtered results, no-match recovery, clearing filters, required-field error summary, and mobile menu Escape/focus return.
- Responsive visual inspection at the default viewport and a 390 × 844 mobile viewport.

Protected customer booking, manager, kitchen and admin business workflows require
an authenticated account for full browser verification. Their shared components
were updated and included in the production build; no real booking or payment was
submitted during this pass.

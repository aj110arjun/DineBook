<div align="center">

# 🍷 DineBook · Customer Discovery & Authentication

**A polished React customer experience for discovering exceptional dining.**

Discover restaurants, browse cuisines, find nearby tables, and manage your customer account.

![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Status](https://img.shields.io/badge/Status-Customer%20Frontend-c6a35e)

</div>

---

## ✨ The experience

DineBook’s customer experience pairs a burgundy navigation bar and restaurant hero with curated food discovery, venue cards, signature dishes, member offers, and guest stories. Customer authentication uses a matching split-screen restaurant layout.

| Screen | What it does |
| --- | --- |
| **Sign in** | Email and password form, password visibility toggle, remember-me option, and API feedback |
| **Create account** | Name, email, password, and confirmation with client-side validation |
| **Forgot password** | Email-only recovery screen; clearly marked as unavailable until the secure recovery service exists |
| **Change password** | Requires an active customer session; validates the new password and shows strength guidance |
| **Customer home** | Restaurant discovery, cuisine filters, featured and nearby venues, trending dishes, offers, and guest reviews |

The credential model is **email and password**. There are no phone fields, OTP flows, social sign-in, or email verification screens.

## 🧭 Customer routes

| Route | Screen |
| --- | --- |
| `/customer/login` | Sign in |
| `/customer/register` | Create account |
| `/customer/recovery` | Recovery placeholder |
| `/customer/change-password` | Protected password change |
| `/customer` | Protected customer discovery home |

`/` redirects to `/customer`, which checks the customer session and sends signed-out visitors to sign in.

## 🚀 Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create and serve a production build:

```bash
npm run build
npm run preview
```

## 🔌 API connection

The frontend defaults to `http://localhost:8000`. Set another API origin in `.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

Customer sign-in and registration send credentialed requests to:

- `POST /api/auth/customer/login`
- `POST /api/auth/customer/register`

They expect a backend that sets an HttpOnly session cookie and allows credentialed CORS requests from the frontend origin. Change-password checks `GET /api/customer/me` before opening, then submits to `POST /api/auth/customer/change-password`.

The customer home validates the same session with `GET /api/customer/me`; signing out calls `POST /api/auth/logout`.

**Backend note:** this workspace contains the React frontend. The API must be running separately for sign-in, registration, and password changes to complete. Password recovery is presentation-only and does not send an email.

## 🧩 Frontend structure

```text
src/
├── App.jsx                              # Customer routes
├── main.jsx                             # React entry point
├── styles.css                           # Shared auth and landing styles
├── components/
│   ├── auth/                             # Shared auth layout, fields, notices
│   └── landing/                          # Header, hero, cards, page sections
├── data/landingData.js                   # Curated sample content
├── lib/authApi.js                        # Credentialed API helper
└── pages/customer/                       # Customer home and auth screens
```

## 🎨 Design notes

- Restaurant photography and dark overlay on the story panel
- Warm burgundy actions, champagne-gold accents, and a soft neutral form surface
- Responsive layout that stacks on small screens
- Shared auth layout, form fields, password visibility controls, and feedback notices
- Native email and password validation with clear inline messages

## 🧪 Local demo customer

When running `npm run dev`, the sign-in page includes **Continue as Demo Customer**. It opens the landing page as **Mia Sharma** (`mia.sharma@demo.dinebook.local`) using a session-only frontend preview identity. It does not create a database account or authenticate with the API. This preview control is excluded from production builds; production access still requires a valid backend customer session.

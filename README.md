<div align="center">

# 🍷 DineBook · Customer Authentication

**A polished React authentication experience for the DineBook dining platform.**

Sign in, create an account, manage your password, and get ready for your next reservation.

![React](https://img.shields.io/badge/React-18-149eca?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?logo=vite&logoColor=white)
![Status](https://img.shields.io/badge/Status-Frontend%20Prototype-c6a35e)

</div>

---

## ✨ The experience

DineBook’s customer authentication uses a refined split-screen layout inspired by the supplied restaurant design: a full-height dining image and brand story alongside a calm, accessible form panel.

| Screen | What it does |
| --- | --- |
| **Sign in** | Email and password form, password visibility toggle, remember-me option, and API feedback |
| **Create account** | Name, email, password, and confirmation with client-side validation |
| **Forgot password** | Email-only recovery screen; clearly marked as unavailable until the secure recovery service exists |
| **Change password** | Requires an active customer session; validates the new password and shows strength guidance |

The credential model is **email and password**. There are no phone fields, OTP flows, social sign-in, or email verification screens.

## 🧭 Customer routes

| Route | Screen |
| --- | --- |
| `/customer/login` | Sign in |
| `/customer/register` | Create account |
| `/customer/recovery` | Recovery placeholder |
| `/customer/change-password` | Protected password change |

`/` redirects to `/customer/login`.

## 🚀 Run locally

Requires Node.js 18 or newer.

```bash
cd Frontend
npm install
npm run dev
```

Open the local URL printed by Vite. To create and serve a production build:

```bash
npm run build
npm run preview
```

## 🔌 API connection

The frontend defaults to `http://localhost:8000`. Set another API origin in `Frontend/.env.local`:

```env
VITE_API_URL=http://localhost:8000
```

Customer sign-in and registration send credentialed requests to:

- `POST /api/auth/customer/login`
- `POST /api/auth/customer/register`

They expect a backend that sets an HttpOnly session cookie and allows credentialed CORS requests from the frontend origin. Change-password checks `GET /api/customer/me` before opening, then submits to `POST /api/auth/customer/change-password`.

**Backend note:** this workspace contains the React frontend. The API must be running separately for sign-in, registration, and password changes to complete. Password recovery is presentation-only and does not send an email.

## 🧩 Frontend structure

```text
Frontend/
├── index.html
├── package.json
└── src/
    ├── App.jsx                         # Customer routes
    ├── main.jsx                        # React entry point
    ├── styles.css                      # Shared responsive design system
    ├── components/
    │   └── auth/
    │       ├── AuthLayout.jsx           # Split image and form shell
    │       ├── FormField.jsx            # Text and password fields
    │       └── Notice.jsx               # Form feedback
    ├── lib/
    │   └── authApi.js                   # Credentialed API helper
    └── pages/
        └── customer/
            ├── CustomerLoginPage.jsx
            ├── CustomerRegisterPage.jsx
            ├── CustomerRecoveryPage.jsx
            └── CustomerChangePasswordPage.jsx
```

## 🎨 Design notes

- Restaurant photography and dark overlay on the story panel
- Warm burgundy actions, champagne-gold accents, and a soft neutral form surface
- Responsive layout that stacks on small screens
- Shared auth layout, form fields, password visibility controls, and feedback notices
- Native email and password validation with clear inline messages

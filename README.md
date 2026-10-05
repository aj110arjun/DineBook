# DineBook Frontend

Responsive React application for the DineBook customer, manager, chef, and platform administrator portals. It uses Vite, React Router, Tailwind CSS, shared styles, and Lucide icons. API requests use credentialed fetch calls so the backend's HttpOnly session cookie is sent with each request.

## Requirements

- Node.js 18 or newer
- The DineBook API for account, restaurant, menu, and floor data

## Run locally

```bash
npm install
npm run dev
```

Vite prints the local URL (normally `http://localhost:5173`). Its `/api` proxy forwards requests to `http://127.0.0.1:8000`, keeping API calls same-origin during development. To use another API origin, create `.env.local` from `.env.example` and set `VITE_API_URL`:

```env
VITE_API_URL=https://api.example.com
```

Build and serve the production bundle with:

```bash
npm run build
npm run preview
```

To share a local development frontend over ngrok, expose the Vite port. The Vite proxy forwards `/api` to the local backend; configure the backend's `FRONTEND_PUBLIC_URL` to the public frontend origin for CORS and email links.

## Portals and routes

| Portal | Routes | Main features |
| --- | --- | --- |
| Customer | `/customer`, `/customer/restaurants`, `/customer/restaurants/:restaurantId/:section?`, `/customer/login`, `/customer/register`, `/customer/verify-email`, `/customer/recovery`, `/customer/change-password` | Restaurant discovery and details, menu variants/prices/images, email or Google sign-in, registration, verification, recovery, and profile session |
| Manager | `/manager/register`, `/manager/login`, `/manager/pending`, `/manager/dashboard`, `/manager/staff`, `/manager/menu`, `/manager/tables`, `/manager/recovery` | Restaurant application and dashboard, staff accounts, menu categories/items, variant and image management, and floor/table layout |
| Chef | `/chef/login`, `/chef/dashboard`, `/chef/change-password`, `/chef/recovery` | Kitchen dashboard, restaurant menu details, and first-login password change |
| Platform admin | `/admin/login`, `/admin/dashboard`, `/admin/requests`, `/admin/requests/:requestId`, `/admin/restaurants`, `/admin/restaurants/:restaurantId`, `/admin/recovery` | Manager application review, restaurant oversight, menu inspection, and restaurant suspension/resumption |

Protected routes check the matching portal session before rendering. `/` redirects to `/customer`; unknown paths redirect to `/customer/login`.

## API behavior

`src/lib/authApi.js` adds `credentials: "include"` to API requests. In development, Vite proxies `/api` to the backend. Set `VITE_API_URL` only when the API is hosted at a separate origin; that backend must allow the frontend origin with credentialed CORS.

The customer discovery page and landing-page sections include curated presentation data in `src/data`. Account actions and restaurant, menu, floor, staff, and administration data come from the API. Menu item images are rendered from the URLs returned by the backend.

For customer Google sign-in, configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the callback URL on the backend. The callback defaults to `http://localhost:8000/api/auth/customer/google/callback`; register the exact callback URL with the Google OAuth client.

## Project structure

```text
src/
├── App.jsx                    # Customer, manager, chef, and admin routes
├── components/                # Portal layouts, route guards, forms, shared UI
├── data/                      # Curated landing-page/demo content
├── lib/authApi.js             # Credentialed API helper
├── pages/customer/            # Discovery, restaurant details, and account pages
├── pages/manager/             # Dashboard, staff, menu, and floor management
├── pages/chef/                # Kitchen dashboard and account pages
├── pages/admin/               # Applications and restaurant oversight
├── index.css
└── styles.css
```

## Demo mode

During local development, the customer sign-in page offers **Continue as Demo Customer**. It opens a session-only frontend preview identity and does not create or authenticate a backend account. It is excluded from production builds.

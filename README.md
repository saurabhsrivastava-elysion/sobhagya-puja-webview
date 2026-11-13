# Sobhagya Puja (webview)

The puja booking screens for **users** and **astrologers**, opened inside the Sobhagya app's WebView. The admin side
lives in `sobhagya-admin-new`; the APIs are in `sobhagya-backend-new` (puja-service, auth-service, calling-service).

One app serves both sides: after login it asks puja-service who is signed in (`GET /puja/api/me`) and shows the
user screens (`/u/...`) or the astrologer screens (`/a/...`).

**Stack** (same as sobhagya-admin-new): TanStack Start · React 19 · TanStack Router + Query · Tailwind CSS v4 ·
shadcn/ui (Radix) · Zod 4 · socket.io-client (live chat) · livekit-client (calls) · pnpm.

## Setup

```bash
corepack enable
pnpm install
cp .env.example .env     # local: point at the services directly (see below)
pnpm dev                 # http://localhost:3002
```

| Script                                   |                                     |
| ---------------------------------------- | ----------------------------------- |
| `pnpm dev` / `pnpm build` / `pnpm start` | dev server (3002), build, run build |
| `pnpm typecheck` / `pnpm lint`           | `tsc --noEmit`, ESLint              |
| `pnpm format`                            | Prettier + Tailwind class sorting   |

### Environment

| Variable                   | Used for                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `VITE_API_URL`             | API gateway (`https://micro.sobhagya.in`). Services are reached at `/auth`, `/puja`, `/calling`. |
| `VITE_AUTH_API_URL`        | Optional. auth-service directly (local: `http://localhost:4004`).                          |
| `VITE_PUJA_API_URL`        | Optional. puja-service directly (local: `http://localhost:11001`).                         |
| `VITE_CALLING_API_URL`     | Optional. calling-service directly (local: `http://localhost:5001`).                       |
| `VITE_ENABLE_DEV_LAUNCHER` | Optional. `true` shows `/dev/launch`. Off by default, also in `pnpm dev`.      |

Without the direct URLs everything goes through the gateway, sockets included (`/puja-socket/socket.io`,
`/call-socket/socket.io`).

Backend side, set **`WEBVIEW_PUJA_BASE_URL`** (where this app is hosted, e.g. `https://puja.sobhagya.in`; local
`http://localhost:3002`) in **auth-service** (activation redirect + CORS), **puja-service** and **calling-service**
(CORS).

## Login (same as the leaderboard webview)

1. The app (logged in) calls `POST /puja/api/webview-session` with its normal tokens. It gets
   `{ activatePath, expiresInSeconds: 60 }`.
2. The app opens `gateway + activatePath` in the WebView. auth-service checks the one-time session, sets a 1-hour
   `webview` cookie and redirects to `WEBVIEW_PUJA_BASE_URL/`.
3. This app gets 15-minute access tokens from `GET /auth/api/webview/token` (the cookie goes along) and renews them
   a minute before expiry ([src/lib/api/session.ts](src/lib/api/session.ts)). Every API call sends the token and
   the cookie.
4. After an hour the cookie expires and the app shows "Your session has ended": the user reopens Puja from the app.

The WebView must accept third-party cookies (the cookie belongs to the API host, not this app's host), exactly as
for the leaderboard. Android: `CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)`.

## What is in it

**User** — categories and search, puja detail, astrologers for a puja (best rated, next free time), pick a date and
time (IST) and pay from the wallet, my bookings (upcoming / ongoing / past), cancel, confirm completion, report a
problem, rate the astrologer, chat (text, photo, video), voice and video call.

**Astrologer** — requests and bookings (accept, decline, cancel, mark done), availability (single free time and
weekly hours, remove), puja catalogue and applications, chat.

Live updates come over the puja socket: new messages, typing, and `booking_updated` (status changes from the other
side or a timer) refresh the screens.

**Calls**: only the user starts a call (puja-service enforces it). The webview calls
`POST /calling/api/call/initialize/puja`, joins the LiveKit room and follows the call on the call socket; the
astrologer is rung and answers in the Sobhagya app as for any call.

## Folder structure

```
src/
  routes/
    _app.tsx                 session gate (AppShell) + live socket; everything below needs the webview session
    _app/index.tsx           sends the signed-in person to /u or /a
    _app/u/...               user: home, pujas/$pujaId, book/$pujaId/$astrologerId, bookings, bookings/$id
    _app/a/...               astrologer: bookings (index), bookings/$id, availability, pujas
    _app/chat/$bookingId.tsx _app/call/$bookingId.tsx
    dev/launch.tsx           stands in for the Sobhagya app on a developer machine
  features/
    puja/                    schemas.ts (zod, from puja-service serializers), api.ts, queries.ts, hooks.ts, components/
    chat/chat-view.tsx       call/call-view.tsx       realtime/puja-socket.tsx
  lib/api/                   session.ts (webview token), http.ts (typed fetch), errors.ts, schemas.ts
  components/                ui (shadcn), layout (shell, header, bottom nav), shared
```

## Testing locally: admin, user and astrologer side by side

1. Restart auth-service, puja-service and calling-service so they pick up the webview changes and
   `WEBVIEW_PUJA_BASE_URL=http://localhost:3002`.
2. Tokens for a real user and astrologer: in `sobhagya-backend-new/auth-service` run `node scripts/dev-tokens.mjs`
   (or `--user <id>` for a specific account). It prints `Authorization` and `cookies` values per account.
3. Set `VITE_ENABLE_DEV_LAUNCHER=true` in `.env`, `pnpm dev` here, then open `http://localhost:3002/dev/launch`, paste the user's tokens and press **Open Puja**.
   It runs the real login (session → activation → cookie), exactly as the app will.
4. The login is a browser cookie on `localhost`, shared by every tab of one browser profile (the admin panel uses
   the same cookie name). Use **one browser profile per person**: e.g. Chrome for the admin panel
   (`localhost:3000`), a Chrome incognito window for the user, and Edge (or a second Chrome profile) for the
   astrologer.

Known limits locally: chat photos and videos upload straight to R2, so the bucket's CORS must allow
`http://localhost:3002` (and the production webview origin). A call rings the astrologer's Sobhagya app only if
that app is connected to the same calling-service.

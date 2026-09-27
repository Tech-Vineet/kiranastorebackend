# Kirana Saathi MVP

A browser-based, AI-assisted grocery ordering demo for local kirana stores. Natural-language understanding is isolated from commerce: the catalog database owns products, prices and stock; backend services own totals, order creation and status changes.

## Run locally

Prerequisites: Node.js 20+ and MongoDB 7+ running locally (or a MongoDB Atlas URI).

1. Install packages: `npm install`
2. Copy `.env.example` to `backend/.env` and `frontend/.env.local` (each file only needs its relevant section).
3. Seed the demo database: `npm run seed`
4. Start both apps: `npm run dev`
5. Customer: <http://localhost:3000/store/sharma-kirana>
6. Merchant: <http://localhost:3000/merchant>

The default `LLM_PROVIDER=local` uses the included deterministic Hinglish-friendly parser, so the demo needs no paid key. To use OpenAI, set `LLM_PROVIDER=openai`, `LLM_API_KEY`, and optionally `OPENAI_MODEL`. Keys remain server-side. The provider abstraction is in `backend/src/parser.ts`.

Photo ordering is available when OpenAI is configured. Tap the camera button in customer chat and upload a clear JPEG, PNG, or WebP shopping list (maximum 5 MB). The AI reads the list; catalog matching, clarification, pricing, stock, and ordering still run through the same deterministic backend services.

## 90-second shopkeeper demo

Open the customer and merchant URLs side-by-side. In customer chat send:

> bhai 5kg aashirvaad atta, 2 parle g aur 1 litre oil bhej do

Choose **Fortune Mustard Oil 1L**, review database-derived prices, and confirm. The pending order appears automatically in the merchant window. Press **Accept order**; within three seconds the customer sees that it was accepted.

## Useful commands

- `npm run dev` — start API and web UI
- `npm run seed` — reset and seed one store, Rahul, and 56 products
- `npm test` — critical parser/resolver tests
- `npm run build` — TypeScript and production frontend builds

## Android APK demo

The Android wrapper opens the customer web interface; the backend, database, and secrets remain on the computer/server. For local Wi-Fi testing, ensure the phone and computer are on the same network. Set `KIRANA_APP_URL` in `android-app/gradle.properties` to the computer's LAN address and add that frontend origin to `backend/.env`, for example `FRONTEND_ORIGIN=http://localhost:3000,http://192.168.29.111:3000`.

Start services so the phone can reach them:

```powershell
$env:NEXT_PUBLIC_API_URL='http://192.168.29.111:4000/api'
npm run dev -w frontend -- --hostname 0.0.0.0
npm run dev -w backend
```

Build with `android-app\gradlew.bat -p android-app assembleDebug`. Install `android-app/app/build/outputs/apk/debug/app-debug.apk` on the phone. For production, replace both LAN URLs with deployed HTTPS URLs and disable cleartext traffic.

## Production deployment

Recommended stack: MongoDB Atlas for data, Render for the Express API, and Vercel for Next.js. Use Render's paid Starter (or higher) service for an always-on WhatsApp webhook; a sleeping free service is unsuitable for reliable incoming events.

### 1. Create a safe Git repository

The project must have its own repository—do not publish a parent drive repository. From `D:\kiranastore`, initialize a new repository, commit only this project, and push it to a new private GitHub repository. Confirm `.env`, `.env.local`, `node_modules`, `.next`, APK build folders, and `local.properties` are ignored before pushing.

### 2. MongoDB Atlas

Create an Atlas cluster and database user, allow network access from the backend host (for initial Render deployment this commonly means `0.0.0.0/0`, protected by a strong database password), and copy the `mongodb+srv://.../kirana_mvp` connection string. Never commit it.

Seed production exactly once from a trusted terminal:

```powershell
$env:MONGODB_URI='mongodb+srv://.../kirana_mvp'
npm run seed
Remove-Item Env:MONGODB_URI
```

The seed command resets application collections, so do not run it again after real orders exist.

### 3. Render backend

Create a Blueprint from the repository's `render.yaml`. Enter all values marked `sync: false` in Render's secret environment settings. After deployment, verify `https://YOUR-API.onrender.com/api/health` returns success.

Initially set `FRONTEND_ORIGIN` to the eventual Vercel origin. It accepts comma-separated origins when you need both a preview and production domain.

### 4. Vercel frontend

Import the same repository into Vercel and set the project Root Directory to `frontend`. Add this production environment variable before deploying:

```env
NEXT_PUBLIC_API_URL=https://YOUR-API.onrender.com/api
```

Deploy, then update Render's `FRONTEND_ORIGIN` to the exact Vercel origin, such as `https://kirana-saathi.vercel.app`, and redeploy the API.

### 5. WhatsApp and Android

Replace Meta's temporary callback with `https://YOUR-API.onrender.com/api/webhooks/whatsapp` and verify it using the existing token. Update `KIRANA_APP_URL` in `android-app/gradle.properties` to the Vercel customer URL, rebuild the APK, and install that build. Production should use HTTPS only; remove `android:usesCleartextTraffic="true"` from the Android manifest after switching URLs.

## Architecture and rules

`Browser chat → Chat API → Conversation service → Parser → Product resolver → Order service`

The same conversation service can later be called by a WhatsApp webhook. Every product, conversation and order is store-scoped. Product stock is not reserved when parsing or confirming. It is rechecked and decremented only when the merchant accepts. Rejected orders never affect stock. For this MVP, status updates use three-second polling.

REST endpoints include store/product lookup and search, chat message/clarification/confirmation/session state, store orders, order detail, and merchant accept/reject. Responses use `{ success, data, message }`, inputs are validated with Zod, and errors are centralized without exposing stack traces.

## Notes

- The seed command intentionally resets demo collections.
- Merchant authentication is intentionally omitted for the in-person demo; the routes are isolated so auth middleware can be added later.
- Payments, delivery routing, and other later-phase features are not included.

## WhatsApp webhook foundation (Day 7 Phase 1)

This phase only verifies and logs inbound Meta WhatsApp events. It does not call the AI parser, send WhatsApp replies, or create orders.

Add these server-only values to `backend/.env`:

```env
META_VERIFY_TOKEN=choose-a-long-random-value
META_PHONE_NUMBER_ID=
META_WABA_ID=
META_ACCESS_TOKEN=
META_GRAPH_API_VERSION=
```

Start the API with `npm run dev -w backend` (default port `4000`). Expose it with either:

```powershell
ngrok http 4000
```

or:

```powershell
cloudflared tunnel --url http://localhost:4000
```

In Meta App Dashboard → WhatsApp → Configuration, set the callback URL to:

```text
https://YOUR-TUNNEL-DOMAIN/api/webhooks/whatsapp
```

Enter the exact `META_VERIFY_TOKEN` value as the verify token, complete verification, and subscribe the WhatsApp Business Account to the `messages` webhook field. Do not put the temporary tunnel URL in source code.

To test, keep the API and tunnel running, then send `hello` and `2kg atta aur 1 oil` from an allowed recipient to Meta's test number. The API terminal will show the channel, type, sender, message ID, phone-number ID, text, and timestamp. Image/audio/document messages are acknowledged and logged as `UNSUPPORTED_MESSAGE_TYPE`; delivery/read/failure updates are logged as `MESSAGE_STATUS`.

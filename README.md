# SMS Router Monorepo

A production-ready, 3-part monorepo designed to capture incoming SMS messages on an Android device, sign and forward them to a secure serverless backend on Google Cloud Firebase Functions, evaluate dynamic routing rules, and dispatch webhooks with full real-time visibility in a React web admin dashboard.

```
                    ┌────────────────────────┐
                    │      Android Phone     │
                    │   (com.smsrouter.app)  │
                    └───────────┬────────────┘
                                │ HTTPS POST + HMAC-SHA256
                                ▼
                    ┌────────────────────────┐
                    │  Firebase Functions v2 │
                    │   (ingestSms endpoint) │
                    └─────┬────────────┬─────┘
                          │            │
          Forward Webhooks│            │ Realtime Stream
                          ▼            ▼
                   ┌─────────────┐  ┌───────────────────────┐
                   │ Third-Party │  │   Cloud Firestore     │
                   │ Webhooks    │  │ (rules, logs, config) │
                   └─────────────┘  └──────────┬────────────┘
                                               │
                                               ▼
                                    ┌───────────────────────┐
                                    │    React Web UI       │
                                    │ (Vite+Tailwind+Admin) │
                                    └───────────────────────┘
```

---

## Architecture Overview

1. **Android App (`/android-app`)**
   - Built with **Jetpack Compose**, **WorkManager**, and **OkHttp 4.12**.
   - Zero annotation processors (no KAPT/KSP) ensures 100% build reliability in CI environments.
   - PDU concatenation handles multi-part messages seamlessly.
   - Computes an **HMAC-SHA256** signature over the raw JSON payload with an API key and secret.
   - Backoff retry mechanism ensures messages are not lost on network disconnections.
   - Persistent foreground `KeepAliveService` with notification channel for OEM battery optimizers (HyperOS, OneUI).
   - Local ring buffer stored in `SharedPreferences` persists the last 50 intercepted SMS records.

2. **Firebase Backend (`/functions`)**
   - Built on **Firebase Cloud Functions v2** (Node.js 20 & TypeScript).
   - Cryptographic verification verifies incoming requests using `rawBody` and constant-time HMAC comparison.
   - Deterministic rule engine checks sender and body patterns (Any, Exact, Contains, Regex).
   - Regex variable extraction (e.g. OTP extractors) dynamically injects values into custom JSON payload templates.
   - Dispatches outgoing webhooks with timeout and exponential backoff retry.
   - Stores audit logs in Cloud Firestore (`sms_logs`).

3. **Web Admin Dashboard (`/web-ui`)**
   - Modern dashboard built with **React**, **TypeScript**, **Vite**, and **Tailwind CSS**.
   - **Google Authentication** gate.
   - **Live Logs**: Real-time Firestore `onSnapshot` log stream with payload inspection and one-click replay.
   - **Routing Rules**: Dynamic visual rule manager with priority, regex extractors, and custom header injection.
   - **Rule Simulator**: Interactive sandbox to test regex and simulate webhook delivery.
   - **Setup & Security**: Generates API Keys and HMAC secrets with one-click copy to Android.

---

## Zero-Touch Cloud APK Build (GitHub Actions)

You do **not** need Android Studio or a local Android SDK installed. 

1. Push this repository to GitHub on `main` or `master`.
2. Navigate to **Actions** -> **Build Android APK**.
3. Trigger manually with **Run workflow** (or push a commit).
4. Download `sms-router-debug-apk` from the completed workflow run and install `app-debug.apk` directly on your Android phone.

---

## Deployment & Setup

### 1. Firebase Backend
```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions,firestore
```

### 2. Web UI Dashboard
```bash
cd web-ui
npm install
npm run build
cd ..
firebase deploy --only hosting
```

### 3. Android Configuration
1. Open the Web UI dashboard and navigate to **Device Setup & Security**.
2. Click **Generate Random Keys** and save settings.
3. Open the installed Android app and copy:
   - Ingest URL: `https://<region>-<project-id>.cloudfunctions.net/ingestSms`
   - API Key: Copied from web UI
   - HMAC Secret: Copied from web UI
   - Device Name: e.g. `Pixel-7` or `Redmi-Note`
4. Tap **Save Configuration** and click **Send Test SMS Payload** to verify end-to-end communication.

# Breezy Cuts

Mobile-first booking for **Breezy Cuts — “Fresh Cuts. Easy Booking.”**

## Live app

**https://breezy-cuts-app.nrk8286.workers.dev**

The public app is a Cloudflare Worker backed by a strongly consistent, SQLite-backed Durable Object. It supports service/barber browsing, customer registration and login, secure sessions, guest or account bookings, conflict-safe appointment slots, and customer appointment history.

## Mobile apps

- Android project: `android/`
- iOS project: `ios/`
- Shareable Android test APK: [`release-artifacts/breezy-cuts-android-debug.apk`](release-artifacts/breezy-cuts-android-debug.apk)
- Apple users can install the live app from Safari with **Share → Add to Home Screen** today.

The APK is debug-signed for direct testing and sharing. A Play Store release needs an owner-controlled signing key. The iOS project is ready for Xcode; Apple requires macOS, Xcode 26+, an Apple Developer account, signing, and App Store/TestFlight review to create a distributable IPA.

## Run locally

Requirements: Node.js 22+.

```powershell
npm install
npm run dev
```

For the original full Next.js interface, use `npm run dev:next`. The deployed Worker shell is the production entry point.

## Verify and deploy

```powershell
npm run check
npm run cf:typegen
npm run cf:deploy
```

`SESSION_SECRET` is stored as an encrypted Cloudflare Worker secret. Never commit it.

## Native builds

```powershell
npm run mobile:sync
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
npm run android:apk
```

The generated debug APK is under `android/app/build/outputs/apk/debug/`. Native wrappers load the HTTPS Worker URL configured in `capacitor.config.ts`.

## Architecture

- `custom-worker.ts`: Cloudflare-native web/API entry point and SQLite Durable Object
- `wrangler.jsonc`: Worker assets, Durable Object binding, and migration
- `src/lib/password.ts`: Web Crypto PBKDF2 password hashing
- `src/app`, `src/components`: full Next.js application source
- `android`, `ios`: Capacitor native projects
- `docs/openapi.yaml`: API contract

The seed catalog and operating schedule are starter configuration. The owner should verify services, prices, barber profiles, business hours, and policies before paid promotion.

# Setup & device workflow

Personal app, single Android tablet, sideloaded. You develop on your computer and
push to the tablet over USB (or wifi). Nothing here needs a hosting service.

## One-time setup

On your computer:
- Install **Android Studio** (gives you the Android SDK, platform-tools, and `adb`).

On the tablet:
- Settings → About → tap **Build number** 7× to unlock Developer Options.
- Developer Options → enable **USB debugging**.
- Plug it into your computer and accept the "allow USB debugging" prompt.

Then, in the project:

```bash
npm install            # also auto-copies the SQLite wasm (postinstall)
npm run build
npx cap add android    # first time only — creates the android/ folder
npx cap run android    # builds, installs, and launches on the tablet
```

Open the app, go to **Settings**, paste your Spoonacular API key. Done.

## Day-to-day: making edits and getting them onto the tablet

Three speeds, fastest first:

**1. Browser (no device).** UI and logic work — fastest by far:
```bash
npm run dev            # http://localhost:5173
```

**2. Live reload on the tablet (the plug-in loop).** Tablet connected, edits
hot-reload on the device over your network — no reinstall:
```bash
npm run push           # = cap run android -l --external
```
Leave this running. Save a file → it refreshes on the tablet. This is the main
"plug in and transfer updates easily" loop.

**3. Full rebuild + reinstall.** Only needed when you change something *native*
(add a Capacitor plugin like camera/notifications, edit `capacitor.config.ts`,
change the icon or permissions):
```bash
npm run android:run    # build + sync + install
```
Pure React/JS/CSS changes never need this — use #1 or #2.

## Notes

- `postinstall` / `predev` / `prebuild` auto-copy `sql-wasm.wasm` into `public/`,
  so the SQLite web fallback works without a manual step. If your `sql.js` layout
  differs, the file is `node_modules/sql.js/dist/sql-wasm.wasm`.
- The debug APK (for manual sideloading) lands at
  `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to the tablet and
  tap to install, or `adb install -r app-debug.apk`.
- If `cap run android` doesn't see the tablet, check `adb devices` — it should be
  listed and authorized.

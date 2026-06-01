# Working in VS Code

Everything below assumes the project folder (this repo) is opened as the VS Code
workspace root.

## First open

1. **Unzip / clone** the project, then in VS Code: `File → Open Folder…` → pick the
   `recipe-app` folder.
2. VS Code will prompt **"Do you want to install the recommended extensions?"** →
   Yes. (Defined in `.vscode/extensions.json`: ESLint, Prettier, React snippets,
   the Ionic/Capacitor extension, etc.)
3. Match the Node version: `nvm use` (reads `.nvmrc` → Node 20). If you don't use
   nvm, just make sure you're on Node 18+.
4. Install deps:
   ```bash
   npm install
   ```
   This also auto-copies the SQLite wasm into `public/` (postinstall hook).

## Putting it under version control

If this isn't a git repo yet:
```bash
git init
git add .
git commit -m "Initial commit: recipe app scaffold"
# then point it at your remote:
git remote add origin <your-repo-url>
git push -u origin main
```
`.gitignore` already excludes `node_modules/`, `dist/`, the generated `android/`
folder, the wasm, and `.env`. **Read the note in `.gitignore` about `android/`** —
once you customize native files (icon, permissions, signing), un-ignore it so those
changes are tracked.

## Daily workflow (Command Palette → "Tasks: Run Task")

Pre-wired tasks (all map to npm scripts, nothing new to learn):

| Task | What it does |
|---|---|
| **dev (web)** | Vite at `localhost:5173` — fastest loop, no device |
| **push (live reload to tablet)** | `cap run android -l --external` — hot reload on the plugged-in tablet |
| **build** | Production web build into `dist/` |
| **android: rebuild + install** | Full build + sync + install (after native changes) |
| **test (watch)** | Runs Vitest (see `TESTING.md` to set it up) |

Or just use the terminal: `npm run dev`, `npm run push`, etc.

## Debugging

- **Web:** press **F5** (or Run & Debug → "Debug in Chrome (web)"). It starts the
  dev server and attaches the Chrome debugger with source maps, so breakpoints in
  `src/**` work directly.
- **On device:** with `npm run push` running, open Chrome on your computer →
  `chrome://inspect` → your tablet's WebView appears → **inspect** for full
  DevTools (console, network, breakpoints) against the live app.

## Path alias

`@/` resolves to `src/` (configured in `jsconfig.json`). If you want to *use* it in
imports (e.g. `import { initDb } from '@/db/db'`), add the matching alias to
`vite.config.js`:
```js
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  // ...
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
});
```
The current code uses relative imports, so this is optional.

## Formatting & lint

- **Prettier** formats on save (config in `.prettierrc.json`).
- **ESLint** is recommended as an extension but **not yet configured** in the project
  — there's no `.eslintrc` and no eslint dep. If you want lint-on-save to actually
  fire, that's a small add (ask and I'll wire a flat config tuned for React + Vite).

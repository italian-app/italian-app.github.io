# Italian Grammar Practice Frontend

Svelte + Vite static frontend for the Italian grammar practice API.

The app is offline-capable, not fully offline-first. The PWA shell and static assets are cached for offline startup, and recent checked exercises are saved locally for review. New exercise generation still requires API access.

## Install

```bash
npm install
```

## Run Locally

By default the frontend calls:

```text
http://127.0.0.1:8000
```

Start the dev server:

```bash
npm run dev
```

For local PWA behavior, use the production build preview instead of only the dev server:

```bash
npm run build
npm run preview
```

Service workers work on `localhost` and `127.0.0.1`, so the preview URL can be used for installability checks.

## Configure Backend URL

Create `.env` when you want to use the live backend:

```bash
cp .env.example .env
```

Or set the value manually:

```text
VITE_API_BASE_URL=https://italian-app-txy6.onrender.com
```

The Render free tier may take about 60 seconds to respond to the first request.

## Tests

Fast local tests mock the API and do not call the live backend:

```bash
npm test
```

Live tests are opt-in and call `https://italian-app-txy6.onrender.com` with generous retry timeouts:

```bash
npm run test:live
```

The live suite checks health, fetches exercise groups, generates exercises for every returned group, checks one generated exercise, and verifies the unknown-group error.

## Build

```bash
npm run build
```

The generated `dist/` directory is static and includes:

- `manifest.webmanifest`
- a generated service worker
- cached static assets for offline startup
- app icon placeholders in `public/icons/`

## GitHub Pages

This project uses a relative Vite base path (`./`), so it works when deployed under a GitHub Pages project path such as `https://user.github.io/repo-name/`.

Typical deployment flow:

```bash
npm ci
npm run build
```

Publish the `dist/` directory with your Pages workflow. If using GitHub Actions, set the artifact path to `dist`.

## Testing Installability

Desktop:

1. Run `npm run build` and `npm run preview`.
2. Open the preview URL in Chrome or Edge.
3. Open DevTools > Application > Manifest and Service Workers.
4. Confirm the manifest loads, the service worker is active, and the install button appears in the address bar.

Mobile:

1. Deploy the production build to GitHub Pages or another HTTPS host.
2. Open the site in the mobile browser.
3. Use Add to Home Screen.
4. Launch from the home screen and confirm the app opens standalone.

Offline shell check:

1. Open the built app once while online.
2. In DevTools, switch Network to Offline or disable connectivity.
3. Reload the page. The app shell should load, recent checked exercises should still be visible, and new exercise generation should show an offline/backend-unreachable message.

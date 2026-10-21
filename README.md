# Gaji Tracker

A salary and overtime tracker for a fixed-basic-plus-hourly-OT pay structure (Malaysian EPF/SOCSO/EIS deductions, twice-monthly pay). Static site, no build step, works offline, syncs between phone and laptop through a private GitHub repo.

## Use it

Open the hosted page and add it to your home screen (Android Chrome: menu → *Add to Home screen*; it installs as an app).

Tabs: **Home** (estimate for the current half or month, today's clock-out, trends, payslips) · **Calendar** (tap days, brushes, target engine, month summary) · **Import** (AI prompt → JSON → preview → save) · **Plan** (compare two monthly plans) · **More** (rules, settings, sync, versions, backup).

## Sync between devices

Data is stored in a **private** GitHub repo (for example `gaji-data`) as `state.json`. Each save is a commit.

1. Create a private repo on GitHub (empty is fine).
2. Create a fine-grained personal access token: GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token.
   - Repository access: **Only select repositories** → the private data repo.
   - Permissions → Repository permissions → **Contents: Read and write**.
   - Expiry: up to one year. Generate a new one when it expires.
3. In the app: More → Sync → enter your username, the repo name and the token → **Save & test**.
4. Repeat step 3 on each device. The token is kept only in that browser's local storage.

The app loads from the local cache first, then pulls from GitHub in the background. Changes made offline are queued and pushed when the connection is back. If two devices changed different days, the newer change per day wins.

## Local development

```bash
node test/serve.js 8765     # static server at http://localhost:8765/
node test/rules.test.js     # pay-rule tie-outs
node test/sync.test.js      # merge and sync against a fake GitHub API
node test/make-icons.js     # regenerate PWA icons
```

Files: `index.html`, `css/app.css`, `js/util.js` (helpers, public holidays), `js/rules.js` (pay rules, pure), `js/store.js` (state, local cache, merge), `js/sync.js` (GitHub Contents API), `js/views/*.js`, `js/app.js` (shell), `sw.js` (offline shell cache).

No personal data lives in this repo. Pay settings and payslips exist only in your private data repo and in your browser.

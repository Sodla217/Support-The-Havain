# Havain Support

A public, single-purpose support page for the Havain project: hold the button
for three seconds, the global counter goes up — permanently, for everyone.

This folder is a complete, static website. It works as-is in **demo mode**
(counts saved only in your own browser) so you can preview it immediately.
To make the counter truly global and permanent, follow the steps below to
connect a free Firebase database — it takes about 5–10 minutes.

---

## 1. Preview it right now (no setup required)

Just open `index.html` in a browser, or run a local server:

```bash
cd havain-support
python3 -m http.server 8080
# visit http://localhost:8080
```

You'll see a small status pill at the bottom saying **"Demo mode"** — this
means the count is only stored in your browser's `localStorage`, not shared
with anyone else yet. That's expected until you complete the steps below.

---

## 2. Connect a real, shared, permanent database (Firebase Firestore)

Firestore is Google's free real-time database. The free tier comfortably
covers a page like this (tens of thousands of supports per day).

### a) Create the project
1. Go to https://console.firebase.google.com and sign in.
2. Click **Add project** → name it (e.g. `havain-support`) → finish the wizard.
3. In the left sidebar, go to **Build → Firestore Database** → **Create database**.
   - Choose any location close to your users.
   - Start in **production mode** (we'll paste secure rules in step c).

### b) Register a Web App and get your config
1. In Project settings (gear icon) → **Your apps** → click the **`</>`** (Web) icon.
2. Give it a nickname (e.g. `havain-web`) → **Register app**.
3. Firebase shows you a `firebaseConfig` object. Copy it.
4. Open `app.js` in this folder and replace the placeholder object near the
   top with your real values:

   ```js
   const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
   };
   ```

   As soon as `apiKey` is no longer `"YOUR_API_KEY"`, the site automatically
   switches out of demo mode and starts using Firestore.

### c) Lock down the database with the included security rules
1. In Firestore → **Rules** tab, replace the contents with everything in
   `firestore.rules` (included in this folder) → **Publish**.
2. These rules are intentionally strict: any visitor can *increase* a counter
   by exactly 1 per write, but **no one can decrease, delete, or overwrite**
   the totals — even with full knowledge of your public API key. This is
   what protects the count from accidental loss or tampering.

### d) Create the starting documents (one-time, in the Firebase Console)
Firestore → **Data** tab → **Start collection**:

1. Collection ID: `stats` → Document ID: `global` → add field
   `totalLikes` (type **number**) = `0` → Save.
2. Collection ID: `dailyStats` → Document ID: today's date as
   `YYYY-MM-DD` (e.g. `2026-06-25`) → add field `count` (type **number**) = `0`
   → Save. (New days are created automatically after that.)

That's it — reload the page and the status pill should briefly show
**"Connecting…"** then **"Live"**, and the counter is now shared by every
visitor, permanently.

---

## 3. Publish it for free with GitHub Pages

1. Create a new **public** GitHub repository (e.g. `havain-support`).
2. Push these files (`index.html`, `styles.css`, `app.js`, `firestore.rules`,
   `README.md`) to the repository's root (or to a `docs/` folder — either works).
3. In the repo: **Settings → Pages**.
   - Source: **Deploy from a branch**.
   - Branch: `main`, folder `/ (root)` (or `/docs` if you used that).
   - Save.
4. GitHub gives you a live URL, typically:
   `https://<your-username>.github.io/<repo-name>/`
   It usually goes live within a minute or two.
5. (Optional) Add a custom domain under the same Pages settings.

### Restricting your Firebase key to this domain (recommended)
Firebase web API keys are meant to be public, but you can still restrict
where they work:
- Google Cloud Console → **APIs & Services → Credentials** → select the
  Firebase browser key → **Application restrictions → HTTP referrers** →
  add `https://<your-username>.github.io/*` (and your custom domain, if any).

---

## 4. File overview

| File              | Purpose                                                        |
|-------------------|------------------------------------------------------------------|
| `index.html`      | Page structure and content                                      |
| `styles.css`      | All visual design: theme, layout, animations, dark/light mode   |
| `app.js`          | Firebase wiring, hold-to-support logic, counter animation       |
| `firestore.rules` | Security rules — paste into Firebase Console → Firestore → Rules|
| `README.md`       | This file                                                        |

---

## 5. Customizing

- **Credits / footer**: edit the `.footer-credits` and `.footer-meta`
  blocks in `index.html`. The version string lives in `<span id="versionTag">`.
- **Colors**: all colors are CSS variables at the top of `styles.css`
  (`--navy`, `--royal`, `--sky`, `--ice`, `--white`), with a separate
  `[data-theme="dark"]` block for dark mode.
- **Hold duration**: change `HOLD_DURATION` (milliseconds) near the bottom
  of `app.js`.
- **Copy / wording**: edit directly in `index.html` — the title, subtitle,
  quote, and description are plain text in the markup.

---

## 6. Why this design protects your data

- The Firestore rules only allow each write to move a counter **up by
  exactly 1**, and forbid `delete` entirely — so no client-side bug, typo,
  or malicious visitor can erase or roll back the total.
- Each support is written inside a Firestore **transaction**, so concurrent
  presses from many visitors at once still land on the correct, consistent
  number (no lost updates).
- The real-time listener (`onSnapshot`) means everyone's counter updates
  live, without needing to refresh the page.

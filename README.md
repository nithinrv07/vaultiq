# Zvault — personal finance coach with a living money model

A React + Vite progressive web app. Install it on your phone, sign in with Google or email, and your data syncs across devices through Firebase. Guests can use it without an account; their data stays in the browser.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## What's inside
| Requirement | Where |
|---|---|
| Ingest PDF / CSV / SMS + auto-categorisation | `src/lib/parse.js`, `src/lib/categories.js`, `src/pages/Import.jsx` |
| Correction loop that learns merchant rules | `store.jsx#correct`, `src/pages/Transactions.jsx` |
| Recurring & subscription detection + alerts (price change, missed, unused) | `src/lib/model.js#detectRecurring`, `src/pages/Recurring.jsx` |
| Persistent profile: income, fixed costs, emergency fund, dated goals, budgets | `src/pages/Profile.jsx` |
| What-if goal planner (84-month simulation, plain-language questions) | `src/lib/model.js#simulate`, `src/pages/Planner.jsx` |
| Drift nudges (pace-aware) | `src/lib/model.js#buildNudges`, Dashboard |
| Monthly review report (printable) | `src/pages/Review.jsx` |
| Guardrails — educates, never recommends securities | `src/lib/coach.js`, `src/pages/Coach.jsx` |
| Scroll-animated landing page | `src/pages/Landing.jsx` |

Click **Try with demo data** on the landing page to explore with six months of sample transactions.

## Install on your phone
- **Android (Chrome):** open the site and tap **Install app** (or ⋮ → *Add to Home screen*).
- **iPhone (Safari):** tap **Share → Add to Home Screen**.

It opens full-screen with its own icon and works offline.

## Sign-in setup (Firebase)
1. Create a project at https://console.firebase.google.com.
2. **Authentication → Sign-in method:** enable **Google** and **Email/Password**.
3. **Authentication → Settings → Authorized domains:** add your Vercel domain (e.g. `vaultiq-three.vercel.app`).
4. **Firestore Database:** create a database, then paste `firestore.rules` into the Rules tab and publish.
5. **Project settings → Your apps → Web app:** copy the config into these environment variables (locally in `.env`, on Vercel under Settings → Environment Variables), then redeploy:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`

Until these are set, the login page offers guest mode only.

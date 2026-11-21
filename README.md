# Zvault — personal finance coach with a living money model

A React + Vite progressive web app. Install it on your phone, sign in with email, and your data syncs across devices through Supabase. Guests can use it without an account; their data stays in the browser.

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

## Sign-in setup (Supabase)
1. **SQL Editor:** run `supabase/schema.sql` (creates the `user_state` table with row-level security).
2. **Authentication → URL Configuration:** set *Site URL* to `https://vaultiq-three.vercel.app` and add `https://vaultiq-three.vercel.app/**` and `http://localhost:5173/**` to *Redirect URLs*.
3. *(Optional)* **Authentication → Providers → Email:** turn off *Confirm email* if you want sign-up without a confirmation email.
4. **Project Settings → API:** copy the *anon public* key into `VITE_SUPABASE_ANON_KEY` (locally in `.env`, on Vercel under Settings → Environment Variables) and redeploy. `VITE_SUPABASE_URL` defaults to this project.

Until the anon key is set, the login page offers guest mode only.

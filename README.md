# Zvault — personal finance coach with a living money model

A React + Vite app that runs entirely in the browser (data stays in localStorage).

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

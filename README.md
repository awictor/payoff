# Payoff 🟢

**Debt snowball vs avalanche planner.** List your debts, add an extra monthly payment, and see exactly when you'll be debt-free, how much interest you'll pay, and which strategy wins. Runs 100% in the browser — no signup, offline.

![version](https://img.shields.io/badge/version-0.1.0-059669) ![status](https://img.shields.io/badge/status-live-059669) [![CI](https://github.com/awictor/payoff/actions/workflows/ci.yml/badge.svg)](https://github.com/awictor/payoff/actions/workflows/ci.yml)

## Why

"Snowball or avalanche?" is the eternal debt question. Payoff simulates both month by month on your actual balances and APRs, so you can see the debt-free date and interest cost of each — and what an extra $50 or $200 a month really buys.

## Features

- Month-by-month **simulation** of snowball (smallest balance first) and avalanche (highest APR first)
- **Debt-free date, total interest, total paid, and payoff order**
- Head-to-head **comparison** of the two strategies + impact of extra payments
- Dynamic debt list, dark mode, local persistence, copy-plan, zero dependencies — one \`index.html\`

## Run

Open \`index.html\` in any browser, or host free on GitHub Pages / Netlify / Cloudflare Pages.

## Test

\`\`\`
node tests/selftest.mjs
\`\`\`

## License

MIT © Alex Wictor

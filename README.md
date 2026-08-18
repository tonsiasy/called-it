# Called It

A forecasting tournament played on Nimiq's own network data, built as a Nimiq Pay mini app.

Twice a day, call the range you think a validator-set number will land in. Narrow and right
scores best; narrow and wrong is punished. Every call is published the moment it resolves, so
anyone can recompute the leaderboard.

## Before submitting

- [ ] `npm install` — dependencies are declared but have never been installed or built here, so
      the Vite build and the React shell are **unverified**. The logic in `src/lib` is not.
- [ ] Push to a **public** GitHub repo. The competition validates the licence as strict SPDX MIT
      through the GitHub API and requires the repo to be anonymously cloneable.

## Commands

```sh
npm install
npm run dev      # vite dev server
npm run build    # production bundle
npm test         # node's built-in runner, no dependencies required
```

## Layout

```
src/lib/         pure logic, fully tested — scoring, metric derivation, constants
src/styles/      tokens.css is the single source of colour; tailwind.config.js references it
src/components/  board and record surfaces (not built yet)
tests/           node:test suites for src/lib
```

## What is verified, and what is not

`npm test` covers `src/lib` with 32 assertions, and the suite has been mutation-checked:
injecting a wrong penalty coefficient and a wrong gap calculation produces exactly two failures.

Everything else — the Vite build, the Tailwind token pipeline, the React shell — is written but
has never been run. Treat it as a starting point, not as working code.

## Where the decisions live

This app implements a design that was settled by measurement, not preference. The reasoning is
one level up:

- [`docs/design-rationale.md`](docs/design-rationale.md) — the design, including §9 where
  several earlier versions were abandoned and why
- [`design/DESIGN.md`](design/DESIGN.md) — the visual system and component specs
- [`design/prototype.html`](design/prototype.html) — an interactive prototype of both screens,
  verified in a browser at 320/375/900px
- [`docs/research/`](docs/research/) — the probes and simulations behind every number quoted
  above, including three that produced negative results

Two constants are load-bearing and should not be changed without re-running the relevant probe:
`INTERVAL_ALPHA` (the 2/α penalty is what makes overconfidence expensive) and
`QUESTIONS_PER_CYCLE` (skill recovery reaches its ceiling at 56; shortening the cycle costs more
than shrinking the field).

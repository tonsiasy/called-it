# Called It

A forecasting tournament played on Nimiq's own network data, built as a Nimiq Pay mini app.

**Live: [tonsiasy.github.io/called-it](https://tonsiasy.github.io/called-it/)**

Twice a day, call the range you think a validator-set number will land in. Narrow and right
scores best; narrow and wrong is punished. Every call is published the moment it resolves, so
anyone can recompute the leaderboard.

## The board is read from chain

There is no server, no index and no database. Albatross produces an election block every 43,200
blocks — exactly 12 hours at a fixed one-second separation — so a question can name the height it
resolves at before that block exists. The app fetches those blocks directly and derives every
figure from them:

- the question and its resolution height
- the scrubber's track and the run of past results it magnetises to
- the form table and its median
- the previous election's actual outcome

A call is anchored to a block that already existed when the call was made, which is what stops
the record being rewritten afterwards. A player who disputes a result fetches the same block and
runs the same arithmetic.

`getValidators` is not permitted on the free public node, so reading the election block is the
only route to a validator set without running one.

## Commands

```sh
npm install
npm run dev      # vite dev server
npm run build    # production bundle
npm test         # node's built-in runner, no dependencies required
```

## Layout

```
src/lib/         pure logic, fully tested — scoring, metric derivation, the scrubber, RPC
src/hooks/       useBoardData reads the board from chain
src/components/  board and record surfaces, plus the canvas range scrubber
src/data/        what is still placeholder, and why
src/styles/      tokens.css is the single source of colour; tailwind.config.js references it
tests/           node:test suites, no test framework installed
```

## What is verified, and what is not

`npm test` runs 101 assertions over `src/lib` and gates the deploy. The scoring suite has been
mutation-checked: injecting a wrong penalty coefficient and a wrong gap calculation produces
exactly two failures.

The scrubber's four constraints are covered by tests and were each confirmed in a browser: the
band keeps its width at the track edges, jaws clamp to the track, jaws stop one unit short rather
than crossing, and the magnet takes the nearest past result rather than the first one listed.

**Still placeholder:** standing, record and ledger (`src/data/sample.js`). Each needs a player
identity and a published call log before it can be real, so they are marked rather than faked.
The board itself is live.

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

## Licence

MIT — see [`LICENSE`](LICENSE).

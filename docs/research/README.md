# Research probes

Scripts backing the measurements cited in
[`../design-rationale.md`](../design-rationale.md) §9.1.
Both hit the free public RPC at `rpc.nimiqwatch.com` (no auth, rate-limited) and need only
Python 3 stdlib.

| Script | What it measures | Verdict |
| :-- | :-- | :-- |
| `validator_series_probe.py` | Pulls 90 election blocks (45 days), builds validator-count and top-slot series, walk-forward tests six predictors | **Passed** — trailing median beats persistence by ~21% (§9.1) |
| `txvolume_probe.py` | Samples micro blocks across 5 days to estimate daily transaction volume | **Inconclusive** — sampling error exceeds the signal (§9.1) |
| `tournament_sim_skill_recovery.py` | Simulates a field of similar engaged players; compares rank vs capped-normalised-error scoring by how well standings recover true skill | **Decisive** — normalised error wins by 0.07–0.09 Spearman; rounds matter far more than players (§9.2) |
| `question_set_probe.py` | Derives 7 candidate metrics from 89 election blocks; walk-forward tests 7 predictors at horizons 1/2/4 | **Decisive, and negative** — a trailing median wins 21/21; metric rotation does not rotate the strategy (§9.2b) |
| `interval_scoring_probe.py` | Scores 80% intervals with the Winkler rule; compares adaptive widths against fixed ones on the two primary metrics | **Decisive, and against the hypothesis** — adaptive dispersion *loses*; the payoff is calibration width, worth up to 246% (§9.2c) |
| `tournament_sim_archetypes.py` | Earlier simulation pitting four sharply distinct player archetypes | **Discarded** — skill gaps baked in; only the tie rates it produced were used (§9.2) |

Two of these are kept precisely because they failed.

`txvolume_probe.py` is why the question set moved to validator-set metrics — re-running it is
the cheapest way to see why sampling cannot answer that question.
`tournament_sim_archetypes.py` produced a flattering 92–100% win rate for the skilled archetype
that means nothing, because the archetypes were constructed to differ. It is kept as the
worked example of the mistake that `tournament_sim_skill_recovery.py` corrects: testing whether
the game can tell good players from bad, when the real question is whether it can rank players
who are all good.

Both simulations read `series.json`, written by `validator_series_probe.py` — run that first.

## Notes for re-running

- Both scripts hard-code a recent block height as the starting point. Update it (query
  `getBlockNumber`) before re-running, or the series will be stale.
- Election blocks sit at exact multiples of **43,200** (every 12 hours). `getValidators` and
  `rpc.discover` are **not** permitted on the public node; the election-block route is the
  working way to get validator-set data without running your own node.

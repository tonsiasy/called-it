# Called It

**A forecasting tournament played on Nimiq's own network data — where the thing being
predicted is researchable, the scoring separates skill from luck inside a single cycle, and
every submission is publicly recomputable after it resolves.**

This is the reasoning behind the app in this repository: what was measured, what was
abandoned, and why. Open questions are marked inline in §9 rather than papered over.

---

## 1. The problem with every prediction app already built

The obvious version of this product — *"stake on whether BTC goes up or down today"* — is
already common, and it is broken in a way that no amount of UI fixes.

Daily price direction is very close to a coin flip. A four-week cycle with one question per day
yields roughly 28 binary outcomes. Distinguishing a genuinely skilled 55% forecaster from a 50%
guesser at conventional confidence needs samples in the high hundreds; at n≈28 the standard
error on a hit rate is around nine percentage points, so noise swamps any real edge. **The
winner of a short binary-prediction contest is selected by chance, whatever the leaderboard
claims.**

This matters twice over. The product's core promise — *skill pays* — is false, and players
work that out. And the competition's own rules permit **skill-based games with clearly defined
rules and prizes**, which is a much harder claim to defend when the underlying event carries no
recoverable signal. A scoring formula layered on top of a coin flip launders chance; it does
not create skill.

So the design question is not "how do we score predictions" but **"what can players predict
where effort actually beats guessing, and how do we extract enough information per question to
prove it within one cycle?"**

## 2. The idea

Players give a **range** they think will contain a number about the Nimiq network itself,
resolved automatically from public data. §9.2b settles which numbers:

- **Primary** — how concentrated will the slot distribution be (`hhi_bp`)? How many slots will
  the largest validator hold (`topSlots`)?
- **Secondary** — how far ahead of second place will the largest validator be (`gapTop2`)? How
  many validators will enter or leave the set (`turnover`)?

These read off the **election block**, which Albatross produces every 43,200 blocks — exactly
every 12 hours, at block numbers that are known in advance. Each election block carries the
complete elected validator set and its slot allocation, and slots are apportioned by stake, so
the block is a full, exact snapshot of who is staking how much relative to everyone else.
§9 records the measurements confirming this family is forecastable.

**One category is already ruled out.** Block height is *not* a valid question under Albatross:
the protocol targets a fixed one-second block separation, so height at a given time is
arithmetic, not a forecast. Any question whose answer follows mechanically from the protocol
converges every player onto the same number and produces meaningless ranks. The question set
must be restricted to quantities driven by **user behaviour**, never by protocol schedule.

Three properties make this category work where price direction fails:

1. **It is researchable.** These series have history, weekly seasonality, and visible trends. A
   player who pulls last month's numbers and notices the weekend dip will consistently beat a
   player who guesses. Skill is a real, accessible edge — not a rhetorical one.
2. **It resolves itself.** The answer is read from public chain data at a fixed deadline. No
   human arbiter, no dispute queue, no oracle to corrupt, no moderation burden.
3. **It teaches the network.** Playing means repeatedly looking at how Nimiq actually behaves.
   The game's core loop and ecosystem value point the same direction.

## 3. Scoring: a calibrated interval

**Players submit a range, not a number.** For each question you give a low and a high bound
covering where you think the answer will fall, aiming to be right about 80% of the time.

Each submission is scored with the interval (Winkler) score at α = 0.2 — a proper scoring rule:

```
width                             if the truth falls inside
width + (2/α) × (low − truth)     if the truth falls below
width + (2/α) × (truth − high)    if the truth falls above
```

Lower is better. Points are then `max(0, 2 − score / m)`, where `m` is the field's median
interval score on that question, and cycle standings are the sum across questions.

Three properties, each doing a specific job:

- **Dividing by the field's median score** makes questions comparable regardless of magnitude or
  difficulty — necessary here, since the primary metrics live on scales that differ by an order
  of magnitude.
- **The floor at zero** removes any incentive to submit an absurd interval and stops a wild
  entry from dragging the normalising constant around.
- **The cap at 2** stops one lucky tight hit from outweighing a cycle of steady calibration.

**Why a range rather than a number.** A point estimate asks only *where*. It turned out that
every candidate metric answers that question the same way — a trailing median wins in all 21
metric-horizon combinations tested (§9.2b) — so a single published heuristic covered the whole
game. A range also asks *how sure*, and §9.2c measures what that second dimension is worth:
choosing the width badly costs up to **246%** of the achievable score, against the 21–28% that
separated careful from lazy point estimates. The stakes of the second dimension are roughly an
order of magnitude higher than the first.

It also repairs metric rotation. The best width is metric-specific and not transferable — ±5 is
well calibrated on `topSlots` at 84% coverage, while the same ±5 on `hhi_bp` covers **12.9%** of
outcomes and is punished accordingly. Rotating metrics now genuinely rotates what a player has
to know, which is exactly what rotation failed to do for point estimates.

And it dissolves the tie problem outright: an answer is two numbers on a continuous score, so
the pigeonhole argument that broke rank scoring never arises.

### 3.1 Two superseded scoring designs, and why they were dropped

Kept because each was rejected for a measured reason, and re-proposing either should require
answering that reason.

**Why not rank scoring.** Ranking by error was the obvious choice and was the original design,
but it fails on this data. The answers are integers in a narrow band — largest-validator slots
runs 38–66, twenty-nine possible values — and engaged players cluster on a handful of them. By
pigeonhole, ties dominate as the field grows: simulation on the real series (§9.2) puts the
tied-adjacent-pair rate at 36% with twelve players and **83% with a hundred**. Ties are exactly
where rank scoring discards information.

This also corrects an error in an earlier draft of this section, which claimed a rank among `N`
players yields `log₂(N)` bits and therefore improves with participation. It does not. Ranks are
only distinct while the answer space is larger than the field, so information per question
**saturates at the size of the plausible answer space**, not the player count. The core argument
against binary questions survives intact — roughly four bits per question rather than one — but
it does not scale with `N`, and the scoring rule has to be chosen accordingly.

**And why not capped normalised error on a point estimate**, which replaced ranking and was in
turn replaced by the interval format: it scored *where* correctly but left the game solvable by
one published heuristic (§9.2b). The normalisation and capping survive — §3 applies both to the
interval score instead.

**What this fixes from §1.** A binary question yields one bit per player per round, which is why
a four-week binary contest cannot measure anything. Graded error on a ~29-value answer space
yields several times that, and capped normalised error extracts more of it than ranking does:
across every field size and cycle length tested, it recovers true skill better by 0.07–0.09
Spearman (§9.2). The leaderboard becomes a measurement rather than a lottery — though §9.2 is
also explicit about how *good* a measurement it actually is, which is "decent, not clean."

## 4. Money: a tournament, not a wager

A fixed, small entry fee joins the current cycle's prize pool. At cycle close the pool is
distributed to the top finishers by **cumulative standing across all questions**.

Structurally this is a chess tournament with an entry fee and a prize table, not a betting
market. Three properties carry that distinction:

- Players are not counterparties to each other — nobody's loss funds anybody's win directly.
- Payout attaches to sustained multi-question performance, not to any single outcome.
- The entry fee is fixed and identical for everyone; there is no variable stake, so there is
  nothing to size, leverage, or chase.

**The prize curve is flat, and that is an evidence-driven choice rather than a generous one.**
§9.2 measures how well final standings recover true skill: about 0.75 Spearman at best, and only
after a full 56-question cycle. At that fidelity the gap between first and third place is mostly
noise, so a winner-take-all pool would pay out for luck while claiming to pay for skill.
Spreading the pool across roughly the top quartile pays the group the measurement can actually
identify. It is the honest structure, and it happens to reinforce the tournament framing above:
the further payouts sit from single-outcome jackpots, the less this resembles a wager.

The mini app never holds keys. It requests payment and signing through the injected provider
and operates inside the isolated WebView, per the framework's security model — it can ask, and
the host wallet decides.

## 5. Verifiability, stated honestly

Every submission is stored alongside **the latest Nimiq block hash at the moment it was made**.
A block hash cannot be produced in advance, so the record proves a submission is *not older
than* that block; the question's published deadline bounds it from the other side. Together
they bracket submission time into a verifiable window without writing every pick on-chain.

After a question resolves, **the full submission set is published** — every estimate, every
anchor hash. Anyone can recompute the ranking and the standings independently. The leaderboard
is a cache; the submission log is the source of truth, and a mismatch between them is provable
rather than arguable.

**What this does not prove, and the draft will not pretend otherwise:** the server still
controls write ordering within the bracket, so a dishonest operator could in principle accept a
late submission that carries a valid earlier anchor. Closing that fully requires per-pick
on-chain writes, which is not worth the cost or latency at this scale. The honest framing is
*publicly auditable*, not *trustless*, and the submission itself should say so.

## 6. Why this fits a Nimiq mini app specifically

Three reasons, in decreasing strength:

1. **The subject matter is the host chain.** A forecasting game about Nimiq network activity
   only makes sense distributed to people who hold Nimiq — the audience and the data are the
   same community. On any other platform this is a niche curiosity.
2. **The payment is small, frequent, and in-app.** A modest entry fee per cycle is precisely the
   transaction profile Nimiq Pay is built for, and the wallet is already open when the player is
   deciding to enter.
3. **Resolution costs nothing.** Reading public chain state at a deadline needs no paid data
   feed, no third-party oracle subscription, and no trust in a price vendor.

## 7. Architecture

| Piece | Responsibility |
| :-- | :-- |
| WebView front end | Question list, estimate entry, standings, submission log viewer |
| Wallet integration | Entry payment and message signing via injected provider (`@nimiq/mini-app-sdk`, or `window.ethereum` for the EVM path) |
| Identity | Pseudonymous per-device identifier from Nimiq Pay, bound to standings for sybil resistance |
| Scheduler | Publishes each question with its deadline; freezes submissions at deadline |
| Resolver | Fetches the election block at a pre-announced height, writes the actual value, computes ranks |
| Submission log | Append-only; estimate + anchor block hash + player address; published post-resolution |
| Payout contract | Holds one cycle's pool; distributes by final standings at cycle close |

**Resolution is close to free, and that is a design win, not just a cost saving.** The answer
to every question lives in one block whose height — a multiple of 43,200 — is computable before
the question is even published. There is no indexer, no aggregation pipeline, no data vendor,
and nothing for the operator to fudge: a player who disputes a result fetches the same block
from any public node and reads the same number. The resolution source is as checkable as the
submission log in §5.

The payout contract is deliberately the smallest component that can exist: accept deposits
during a cycle, accept a final standings result, distribute, close. It holds user funds, so its
attack surface is kept to one function that matters. Everything else — scoring, scheduling,
history — is off-chain and independently recomputable from the published log, so a bug there
costs correctness of a leaderboard, not custody of money.

## 8. Who plays, and why they come back

**Day-one players** are people already in Nimiq Pay who look at network stats out of interest.
The game asks them to convert an opinion they already hold into a position, and then tells them
whether they were right — which is intrinsically compelling to exactly this audience, before any
prize enters the picture.

**Why they return:** standings accumulate across cycles into a public forecasting record tied to
their address. A record started this cycle is worth more three cycles from now, so building one
is rational even in a cycle you are not going to win — the same accrual logic that makes
reputation systems sticky. The record is portable in principle, since it is recomputable from
published data by anyone.

**The honest retention risk** is that the question set gets stale. Twenty questions in, a player
who has learned the weekly pattern may find the remaining questions mechanical. Mitigation is
question variety rather than difficulty inflation — mixing horizons (same-day, week-out) and
metrics — but this is a real open problem, not a solved one.

## 9. Risks and open questions

**A framing note before the numbers.** Everything in §9.1 and §9.2 establishes that the game
measures something real. That is a requirement of the product and of the rules' "skill-based
games" clause — but it is **not** what the competition scores. Submissions are judged on design,
functionality, originality and marketing (see
the cycle-1 landscape analysis). This section is the foundation the
app stands on, not the case for the app winning.

**The riskiest assumption:** that Nimiq network metrics are *learnable but not trivially
solvable*. This has two failure modes, and the question set has to thread between them:

- **Too predictable.** A moving average nails the series, every serious player submits the same
  number, ranks become arbitrary tie-breaks, and the skill gradient collapses.
- **Too random.** The series moves, but on unobservable single-actor decisions — one exchange
  sweep, one bot. Variance without explanatory structure is noise, and noise is a coin flip with
  extra steps. **This is the more likely failure at Nimiq's current scale** and the one worth
  worrying about.

So the test is not "does the metric vary" but "**does a tuned model beat a naive baseline
out-of-sample**". Only the second question distinguishes skill from churn.

### 9.1 Two metric families were tested. One passed.

**Transaction volume — rejected, and the rejection is itself informative.** Sampling
`rpc.nimiqwatch.com` gives roughly **0.25 transactions per micro block** with **~80% of blocks
empty**, i.e. about **20,000 transactions per day** network-wide. The order of magnitude is
solid; the day-to-day variation is *not measurable this way*. At ~20 sampled blocks per day and
a mean of 0.25, Poisson sampling error on each daily estimate runs near 45% of the mean —
larger than the ~23% spread the sample showed. The probe measured its own noise. Worse, the
only way to fix it is exact daily totals, which means walking all 86,400 daily blocks: **the
assumption could not be validated more cheaply than building the indexer the feature would
need.** That circularity, not the numbers, is why this family was dropped.

**Validator-set metrics — passed, on exact data.** Election blocks make the same question
cheap: every 43,200 blocks one block carries the complete elected set, so each observation is
*exact* rather than sampled, and 45 days of history is 90 requests. Across 73 retrieved
elections:

| Series | Range | Stdev | Changed between consecutive elections |
| :-- | :-- | :-- | :-- |
| Validator count | 25 – 33 | 5.4% of mean | 73% |
| Largest validator's slots | 38 – 66 | 13.5% of mean | 92% |

Walk-forward testing (predict each election from prior history only), mean absolute error:

| Predictor | Validator count | Top slots |
| :-- | --: | --: |
| Trailing median, 8 | **1.000** | **4.119** |
| Trailing mean, 4 | 1.051 | 4.352 |
| Persistence (last value) | 1.288 | 5.203 |
| Linear trend, 10 | 1.401 | 5.546 |
| Uninformed (range midpoint) | 1.475 | 7.119 |

**The load-bearing row is persistence, not the uninformed baseline.** Beating a random guesser
by 32–42% would only prove the series is not a coin flip. Beating *last-observed-value* by
21–22% proves something stronger and more necessary: a player who models carefully also beats
the player who knows to look at the data but does the obvious thing with it. The skill gradient
exists **among engaged players**, which is what the scoring rule needs — a gradient that only
separates the diligent from the random collapses as soon as everyone is diligent.

Note also that trend extrapolation is the *worst* model while trailing median is the best: the
series is mean-reverting, not trending. That structure is discoverable but not obvious, which is
the desired difficulty.

**Three caveats, stated plainly:**

1. **Validator count is too coarse to be a primary question.** With a 25–33 range and best-model
   error near 1, many players submit the identical integer. **Largest-validator slots is the
   better question** — a 38–66 range against ~4 error leaves real separation. Coarse series
   should be supporting questions at most. §9.2 shows this problem is structural, not cosmetic.
2. **The 21% edge is optimistic.** Six predictors were tried and the best reported; model
   selection touched the whole series even though each prediction was walk-forward. Discount the
   figure accordingly.
3. **The strategy space is shallow — confirmed, and the proposed mitigation failed.** What was
   shown is that simple models beat naive ones, not that sophisticated models beat simple ones.
   An earlier draft proposed rotating metrics and horizons so that no single published heuristic
   could cover the question set. **§9.2b tested that and it does not work**: across seven
   candidate metrics and three horizons, a trailing median won 21 times out of 21. Rotation
   changes the window length, not the method. This is the most serious unresolved weakness in
   the design and §9.3 records the fork it creates.

### 9.2b Which metrics belong in the question set

Seven candidate metrics derived from the same 89 election blocks, each tested at horizons of 1,
2 and 4 elections, walk-forward, against seven predictors.

| Metric | Beats naive | Beats persistence | Verdict |
| :-- | --: | --: | :-- |
| `hhi_bp` — slot concentration in basis points | 42–48% | 15–20% | **Primary.** Fine-grained, so ties are rare |
| `topSlots` — largest validator's slots | 41–42% | 21–28% | **Primary** |
| `gapTop2` — first minus second | 43–45% | 19–33% | Secondary |
| `turnover` — validators entering or leaving | 58–59% | 21–29% | Secondary; conceptually distinct from the slot-shape metrics |
| `validatorCount` | 31–35% | 11–24% | Demoted — too coarse, ties |
| `medianSlots` | 14–17% | 22–31% | **Excluded** — barely moves relative to its range |
| `minSlots` | 89% | 30–50% | **Excluded** — the 89% is a trap, not a strength |

`minSlots` illustrates why "beats the naive baseline" is not sufficient on its own. Its mean
absolute error is 0.10: the series is very nearly constant, so every player answers correctly
and the round produces a field-wide tie. A good question must beat the naive baseline **and**
spread the field.

**The finding that matters is the one about method, not metrics.** Of the 21 metric-horizon
combinations, a trailing median was the best predictor in all 21 — `median16` in 13, `median8`
in 6, and a global mean in the remaining 2. Every one of these series is mean-reverting with the
same shape, so rotating between them does not rotate the winning strategy. It only changes the
window length. A single published sentence — *"use a trailing median and tune the window per
metric"* — covers the entire question set.

### 9.2c What the interval format is actually worth

Tested on the two primary metrics, walk-forward, 80% intervals scored by the Winkler rule.

**The hypothesis that motivated the change was wrong.** The argument for intervals was that
modelling dispersion would be a fresh skill dimension. It is not: an adaptive width — trailing
residual quantile, or 1.28σ of a rolling window — *loses* to simply picking a good constant, by
6.8% on `topSlots` and 3.5% on `hhi_bp`. Sophistication does not pay here either.

**What pays is calibration, and it pays far more than anything measured so far.**

| Metric | Best width | Coverage | Cost of the worst fixed width |
| :-- | --: | --: | --: |
| `topSlots` | ±5 | 83.9% | **+246%** |
| `hhi_bp` | ±30 | 79.0% | +90% |

Two things follow. First, the penalty for miscalibration dwarfs the 21–28% edge that separated
careful from lazy point estimators — the second dimension carries roughly an order of magnitude
more weight than the first. Second, the correct widths are six times apart because the metrics
sit on different scales, so knowledge does not transfer between questions: ±5 on `hhi_bp` covers
**12.9%** of outcomes, and the `2/α` term punishes that overconfidence hard.

**Residual weakness, honestly.** This is deeper than point estimates but not inexhaustible.
"±5 for topSlots, ±30 for hhi" is a longer sentence to publish than "use a trailing median", and
it must be relearned per metric and revised as each series' volatility drifts across cycles — but
it is still, eventually, publishable. The design buys depth here; it does not buy permanence.

### 9.2 How good a measurement is the leaderboard?

Simulated on the real `topSlots` series, so question difficulty is realistic rather than assumed.

**A first simulation was discarded.** It pitted four sharply distinct archetypes — modeller,
persistence-follower, casual, random — and the modeller won 92–100% of cycles. That number is
meaningless: the skill gaps were baked in by construction, and it only asks whether the game can
tell a modeller from a coin-flipper. It can. Nobody doubted it. The question that matters is
whether the game separates players who are **all reasonably good**, since that is what a real
field of engaged players looks like.

It did, however, surface the tie rates that §3 now rests on: 36% of adjacent pairs tied at
twelve players, 55% at twenty-four, 71% at forty-eight, 83% at a hundred.

**The second simulation** gives every player the good model and varies only their care
(prediction noise σ drawn from 0.5 to 4.0), then asks how well final standings recover the true
σ ordering — Spearman correlation, averaged over 300 cycles:

| Players | Rounds | Rank scoring | Capped normalised error |
| --: | --: | --: | --: |
| 12 | 28 | 0.478 | **0.553** |
| 12 | 56 | 0.597 | **0.674** |
| 24 | 56 | 0.646 | **0.727** |
| 48 | 56 | 0.662 | **0.742** |
| 100 | 28 | 0.525 | **0.622** |
| 100 | 56 | 0.667 | **0.749** |

Three consequences, all of which changed the design above:

1. **Capped normalised error wins everywhere**, by 0.07–0.09 Spearman. §3 was rewritten around
   it.
2. **Rounds matter far more than players.** Going 28 → 56 rounds adds 0.12–0.13; going 12 → 100
   players adds only about 0.05. A twelve-player field over a full cycle (0.674) measures skill
   *better* than a hundred-player field over a half cycle (0.622). **This dissolves the
   cold-start worry** — the binding constraint is cycle length, not participation, and a small
   launch field is not a broken product. It also means shortening the cycle is the most damaging
   change that could be made.
3. **The ceiling is 0.75, and only at full length.** Even with the better rule and a large field,
   a quarter of the ordering is still noise. The standings are a decent measurement, not a clean
   one. §4's flat prize curve follows directly: paying only the podium would pay for the noisy
   part of the ranking.

### 9.3 Open items

- **Question set composition — settled.** Which metrics is settled by §9.2b: `hhi_bp` and
  `topSlots` as primaries, `gapTop2` and `turnover` as secondaries, `validatorCount` demoted,
  `medianSlots` and `minSlots` excluded. The shallow strategy space that remained open here is
  resolved by the move to intervals (§3, §9.2c): the correct width is metric-specific and does
  not transfer, so rotating across these metrics now rotates the knowledge a player needs —
  which is precisely what rotation failed to do for point estimates.
- **Sybil resistance — settled.** One paid entry per Nimiq Pay device identifier per cycle;
  unlimited free play with no prize eligibility. The reasoning is that a flat prize curve makes
  multi-entry *more* attractive, not less: with the standings only ~0.75 correlated with skill,
  extra identities buy extra draws on the noise, which is a real edge rather than a theoretical
  one. Binding paid entry to the device identifier caps that at one draw. Free play is left
  uncapped because an identity that cannot win costs nothing to create and gains nothing.
  **Residual risk, stated rather than hidden:** the identifier is per device, not per person, so
  the true cost of an extra identity is a device plus an entry fee plus playing all ~56 rounds
  attentively. That is a real barrier, not a proof. KYC was rejected as wrong for this product,
  and stake-weighting was rejected because variable stake is exactly what makes something a
  wager rather than a tournament (§4).
- **Entry currency — now a preference, not a feasibility question.** Both paths are confirmed
  available: the Nimiq provider via `@nimiq/mini-app-sdk`, and standard EIP-1193 through
  `window.ethereum`. NIM keeps the build to one provider and matches the audience; a stablecoin
  insulates the pool's value from a price move across a four-week cycle, at the cost of an EVM
  path. Lean NIM unless the pool grows large enough for volatility to matter.
- **Free tier — effectively decided: make free the default.** Three arguments converge. 53 of 62
  cycle-1 submissions were free, so a paywall is off-pattern. Judging weights design and
  functionality heavily, and **a Community Council judge has to be able to play the app** — an
  entry fee sits directly across the evaluation path. And a free tier grows the published track
  record, which is the retention asset in §8. The paid pool becomes an opt-in layer on top of a
  game that is complete without it. See
  the cycle-1 landscape analysis.

**Two items previously listed here are now settled by §9.2 and are recorded as decisions, not
questions:**

- **Cadence — decided.** Elections every 12 hours cap the game at two questions per day, so a
  four-week cycle affords ~56 questions. That is exactly the length at which the measurement
  reaches its 0.75 ceiling, which makes the full cycle the design point rather than a maximum.
  **Shortening the cycle is the single most damaging change available**: halving it costs more
  fidelity than an eight-fold reduction in field size.
- **Cold start — no longer a risk.** Field size barely matters. Twelve players over a full cycle
  measure skill better than a hundred over half of one. A small launch field produces a valid
  tournament, so the product does not need liquidity to work — only patience.

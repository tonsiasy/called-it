# Called It — Design System

Locked direction for the Nimiq Pay mini app. Mobile WebView, portrait, one-handed,
~30-second sessions twice a day.

**Visual thesis:** a bookmaker's chalkboard — deep slate-green board, chalk-white condensed
caps, hand-ruled lines — held monochrome until the moment the truth lands, when amber chalk
enters for the first and only time.

**Content plan (utility mode, no hero):** orient (which question, how long left) → act (set your
range, lock it) → prove (your form, your standing). No marketing section anywhere; this
is a working surface someone opens twice a day.

**Interaction thesis:**
1. The range scrubber has two jaws, detents on every integer, and *magnetises* to the last
   eight real results, so the hand feels the recent spread before the player consciously
   learns it. Width is the scored skill, so the control is built around setting width.
2. Locking is a deliberate, slightly resistant gesture with a stamp-down settle — it should feel
   spent, not clicked.
3. At reveal the truth lands on the same track in amber — inside your bracket or outside it,
   readable at a glance without a word of copy.

**CSS strategy: Tailwind only.** No CSS Modules, no CSS-in-JS. Tokens below map into
`tailwind.config.js` under `extend.colors` / `extend.fontFamily` (not `@theme`, to avoid the
v4 dynamic-class purge trap).

---

## 1. Visual Theme and Atmosphere

A physical board in a betting shop, photographed at night. Dense at the edges, generous in the
middle — the number you are about to commit gets more room than anything else on screen. The
material is matte and slightly uneven; nothing glows, nothing is glass, nothing floats on a drop
shadow. Depth comes from luminance steps in the board itself, the way chalk dust sits in a
shallow groove.

The board is **monochrome by rule**. Every screen is chalk-on-green until a question resolves.
This is not restraint for its own sake: it means the single amber event at reveal cannot be
missed or mistaken for decoration, and it makes a screenshot of the reveal instantly legible as
*the moment* rather than as UI.

## 2. Color Palette and Roles

Dark, and deliberately so: the material reference is a chalkboard, and a light treatment would
contradict it. OKLCH throughout; neutrals are tinted toward the board hue for cohesion.

| Token | Value | Role |
| :-- | :-- | :-- |
| `board-deep` | `oklch(0.155 0.014 168)` | Page canvas, groove shadows, the frame |
| `board` | `oklch(0.205 0.017 168)` | The board surface — the dominant 60% |
| `board-raised` | `oklch(0.245 0.018 168)` | Panels sitting on the board (form table, standing strip) |
| `chalk` | `oklch(0.945 0.010 85)` | Primary text and numerals — warm off-white, never `#fff` |
| `chalk-dim` | `oklch(0.760 0.012 85)` | Secondary text, labels, resolved history |
| `chalk-faint` | `oklch(0.460 0.015 168)` | Hand-ruled lines and dividers |
| `tick` | `oklch(0.575 0.014 168)` | Scrubber detent ticks only — see note |
| `amber` | `oklch(0.830 0.145 78)` | **The resolved answer. Nothing else.** See rule below |
| `amber-dim` | `oklch(0.620 0.110 78)` | The rule drawn from your call to the truth |

**The amber rule.** Amber means *the resolved answer*, and nothing else — not buttons, links,
focus rings, brand marks, countdowns, or emphasis. **If nothing has resolved on screen, there is
no amber on screen.**

An earlier draft of this file also allowed amber on the live countdown. Building it proved that
wrong: an always-amber countdown competes with the reveal for the one colour event the board
gets, and the reveal stops reading as a moment. The countdown is `chalk-dim`.

**Amber marks the *moment* a truth lands, never the *fact* that it has.** Building the record
screen forced this refinement: every row in a ledger is resolved, so colouring resolved values
would turn the archive amber and spend the board's one colour event on history. History is
chalk. Only the live reveal is amber.

This is the single strongest identity decision in the system and the one most likely to erode —
guard it.

**Why `tick` exists separately.** `chalk-faint` reads correctly as a horizontal divider but
disappears as a 1px *vertical* tick on a dark board — the same luminance covers far fewer pixels
and loses to the surrounding field. Ticks get their own token at `0.575`. Discovered by building
it, not by reasoning about it.

No green/red hit-or-miss coding. Accuracy is communicated by *distance* between two marks on the
board, which is exactly how the scoring works; colour-coding it would be a second, redundant, and
less honest channel.

Weight distribution: ~60% `board`, ~30% chalk text and rules, ~10% `board-raised` panels, with
amber appearing on well under 5% of pixels and only at resolution.

## 3. Typography Rules

Brand words: **hand-made, declarative, accountable.**
Reflex picks rejected: Inter, Space Grotesk, DM Sans.

- **Display / numerals — Big Shoulders Display (SIL OFL).** A condensed civic-signage face whose
  tall narrow caps read like something painted onto a board rather than rendered by software; its
  numerals stay legible at 96px on a 375px screen where a normal grotesque would need to shrink.
- **Body / UI — Archivo (Omnibus-Type, SIL OFL).** A grotesque with slightly squared bowls that
  holds its own next to a condensed display face without competing with it.

Only one display face. Both are open-source and MIT-compatible for the repo's licensing.

| Level | Family | Size / line-height | Weight | Tracking |
| :-- | :-- | :-- | :-- | :-- |
| Call range | Big Shoulders | `clamp(72,24vw,104)` / 0.88 | 700 | -0.022em |
| Call range, 5+ digits | Big Shoulders | `clamp(54,17.5vw,80)` / 0.88 | 700 | -0.022em |
| Truth numeral (reveal) | Big Shoulders | 52 / 0.92 | 700 | -0.022em |
| Question | Archivo | 22 / 1.20 | 500 | -0.012em |
| Section label | Archivo | 12 / 1.0 | 600, caps | **+0.18em** |
| Body | Archivo | 15 / 1.50 | 400 | normal |
| Form / table figures | Archivo | 13 / 1.4 | 500, `tabular-nums` | normal |

Positive tracking appears **only** on the 12px caps labels, where it is correct practice for
small caps runs. Every display size carries negative tracking; positive tracking on a large
numeral would be wrong here as everywhere.

All dynamic figures — countdown, call value, truth, standings, form row — use
`font-variant-numeric: tabular-nums` so nothing shifts as digits change.

## 4. Component Stylings

**Range scrubber** (the signature control). A full-bleed horizontal track, ruled with chalk
detent ticks every integer and taller ticks every five. The submitted range sits above it as
`low–high`, the dash in `chalk-faint` so the two bounds read as separate figures.

The interval is drawn on the track as a 2px `chalk` bracket: a vertical jaw at each bound and a
horizontal span joining them. This is the submission made visible — width is what is scored, so
width is what the control shows.

- *Default*: bounds in `chalk`, track ticks in `tick`.
- *Grab*: the nearer jaw is picked up; grabbing between the jaws, more than 1.5 units from
  either, drags the whole bracket and preserves its width.
- *Dragging*: ticks within ±2 of the pointer brighten to `chalk-dim`; the numeral scales to 1.02.
- *Over a form value*: the eight most recent real results magnetise a jaw with ~6px of
  resistance and the hint line names it. The player discovers the recent spread by thumb.
- *Constraint*: jaws may not cross; minimum width is 1.
- *Disabled (after lock)*: track drops to 40% opacity, bounds stay full strength.
- *At reveal*: a 3px `amber` marker for the truth is drawn on the same track. If it falls
  outside the bracket, a 1px `amber-dim` rule runs from the nearer jaw to the marker, so the
  miss has a length.

**Lock control.** Pill (the only pill in the system), `board-raised`, chalk 1px rule, caps label.
- *Default*: chalk text on `board-raised`.
- *Press*: `scale(0.96)`, settling over 140ms.
- *Locked*: collapses to a static chalk stamp reading the locked value and its anchor block —
  the button is gone, not disabled, because the action cannot be repeated.
- *Focus-visible*: 2px `chalk` ring at 2px offset. Never `outline: none` without replacement.

**Form table.** No card. Ruled rows only — 1px `chalk-faint` horizontals, no verticals, no
container. Figures right-aligned and tabular.

**Standing strip.** `board-raised`, 8px radius, one line: rank, delta arrow, points.

**Ledger row** (record screen). Two-line grid, `1fr auto`, 12px vertical padding, separated by
1px `chalk-faint` horizontals — no container. Line 1: date as a 12px caps label left, `call →
truth` right in 15px tabular `chalk`. Line 2: metric name left in 13px `chalk-dim`, error right
as a 1px `chalk-dim` bar `6px × error` followed by the figure.
- *Exact call (error 0)*: bar is replaced by an `EXACT` caps label in `chalk`, and the row's
  numerals and metric lift from `chalk-dim` to `chalk`. Never coloured.
- The ledger is entirely monochrome. See the amber rule.

**Cards: none.** The board *is* the surface. Any content that would sit in a card sits directly
on the board separated by a ruled line. This is the primary defence against template drift.

## 5. Layout Principles

4px base scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64`.

Single column, 20px side gutters, `env(safe-area-inset-*)` respected top and bottom. The call
numeral is vertically centred in the viewport's middle third with at least 48px of clear board
above and below — whitespace is the luxury signal, and it is spent almost entirely on the number.

Order down the page is fixed and never reflows: countdown → question → numeral → scrubber → lock
→ form → standing. A player opening the app twice a day must find the same thing in the same
place without reading.

## 6. Depth and Elevation

Dark-surface rules apply: luminance stepping, not drop shadows.

| Level | Treatment |
| :-- | :-- |
| 0 — canvas | `board-deep` |
| 1 — board | `board`, with a 1px `chalk-faint` top rule where it meets the canvas |
| 2 — panel | `board-raised` (+4% lightness over board), 8px radius |
| Groove | `inset 0 1px 0 oklch(0 0 0 / 0.35)` under rules, mimicking chalk dust in a scratch |

No `box-shadow` used as elevation anywhere; no `backdrop-filter`; no borders heavier than 1px.

Radius scale, committed: **`0` (rules, table cells) · `3px` (chips) · `8px` (panels) · `pill`
(lock control only)**. Nothing else.

## 7. Do's and Don'ts

1. **Do** keep every screen monochrome unless an unresolved truth is present.
2. **Don't** use amber for anything but a truth landing live. Not countdowns, not history.
3. **Do** let the numeral dominate — if it competes with anything, shrink the other thing.
4. **Don't** introduce a card. Ruled separation only.
5. **Do** make the locked state a *stamp*, not a greyed button. The gesture is irreversible and
   should look it.
6. **Don't** colour-code accuracy. Distance is the only accuracy channel — on the board as two
   marks, in the ledger as the length of a chalk error bar.
7. **Do** mark an exact call explicitly. A zero-length error bar makes the most brag-worthy row
   the least visible, which is backwards for a page whose job is bragging. Mark it with weight
   and brightness (`chalk` instead of `chalk-dim`, plus an `EXACT` caps label) — never colour.
8. **Do** keep the vertical order fixed across all states, including reveal.
9. **Don't** animate anything but `transform`, `opacity`, and `filter`.
10. **Do** use tabular figures for every number that can change.
11. **Don't** add a bottom tab bar. Two destinations (board, record) — a single chalk rule with
    two caps labels is enough, and a tab bar would import a generic app shell into a board.

## 8. Responsive Behavior

Designed at 375px first; this is a phone-only surface inside a host app.

- 320–430px: single column as specified. Numeral scales `clamp(72px, 24vw, 104px)`.
- ≥ 480px (tablet WebView, and the desktop screenshot shot): board caps at 430px and centres on
  `board-deep`, reading as an actual board hung on a wall. Do not stretch the column.
- Touch targets ≥ 44×44px; the scrubber track is 64px tall regardless of its visual line weight.
- `touch-action: manipulation` globally; `pan-x` on the scrubber so vertical page scroll survives.
- Hover states wrapped in `@media (hover: hover)` — a tapped control must not keep a hover look.
- `prefers-reduced-motion`: the reveal becomes a 1-frame cut to the resolved state; scrubber
  detents stop animating but keep their haptic feedback.

## 9. Agent Prompt Guide

```
board-deep    oklch(0.155 0.014 168)
board         oklch(0.205 0.017 168)
board-raised  oklch(0.245 0.018 168)
chalk         oklch(0.945 0.010 85)
chalk-dim     oklch(0.760 0.012 85)
chalk-faint   oklch(0.460 0.015 168)
amber         oklch(0.830 0.145 78)
amber-dim     oklch(0.620 0.110 78)
```

Ready-to-paste prompts:

1. "Build the call screen on `board` with 20px gutters. Countdown top-right in Archivo 12px
   weight 600 caps, tracking +0.18em, `chalk-dim`, tabular-nums. Question in Archivo 22px/1.20
   weight 500, tracking -0.012em, `chalk`, `text-wrap: balance`. Call numeral centred, Big
   Shoulders Display 700 at `clamp(72px, 24vw, 104px)`, line-height 0.88, tracking -0.022em,
   `chalk`. The countdown is `chalk-dim`, never amber."

2. "Build the range scrubber: 64px tall track, `touch-action: pan-x`, range 34–68. Detent ticks
   every integer at 1px × 10px `tick`, every fifth 1px × 18px, the eight most recent results at
   1px × 28px `chalk-dim`. Ticks within ±2 of the pointer transition to `chalk-dim` over 120ms
   `cubic-bezier(0.16,1,0.3,1)`, `transition-property: opacity` only. Draw the submitted interval
   as a 2px `chalk` bracket — a 40px vertical jaw at each bound plus a horizontal span between
   them. Pointer-down within 1.5 units of a jaw grabs that jaw; between the jaws drags the whole
   bracket at fixed width. Jaws magnetise to the eight recent results with 6px of resistance and
   may not cross (minimum width 1)."

3. "Build the lock control: pill radius, `board-raised`, 1px `chalk` rule, Archivo 12px weight
   600 caps tracking +0.18em, `chalk`. `active:scale-95` over 140ms. On lock, replace in place
   with a chalk stamp of the same height showing the locked value and the anchor block height in
   13px tabular-nums `chalk-dim` — same layout footprint, no reflow."

4. "Build the reveal: keep the locked range in `chalk` where it is. Bring the truth in as Big
   Shoulders 700 at 52px in `amber`, entering `opacity: 0 → 1`, `translateY(12px) → 0`,
   `blur(4px) → 0` over 320ms `cubic-bezier(0.16,1,0.3,1)`, above a caps label reading either
   `inside your range · width N` or `outside by N`. On the track, draw a 3px `amber` marker at
   the truth; when it lands outside the bracket, run a 1px `amber-dim` rule from the nearer jaw
   to the marker. Then stagger the standings rows in at 100ms intervals. Under
   `prefers-reduced-motion`, cut to final state."

5. "Build the form table: no container, no card. Rows separated by 1px `chalk-faint`
   horizontals, 12px vertical padding. Date label left in Archivo 13px `chalk-dim`; figure right
   in 13px weight 500 `chalk` tabular-nums. The trailing-median row uses `chalk` for both
   columns and a 1px `chalk` rule instead of `chalk-faint`."
```

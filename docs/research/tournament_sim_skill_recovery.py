import json, random, statistics
S=json.load(open("series.json"))["topSlots"]; WARM=14

# realistic field: everyone is engaged and uses the good model,
# but with a CONTINUUM of care (noise sigma). True skill = low sigma.
def make_field(N, rng):
    return [(i, rng.uniform(0.5, 4.0)) for i in range(N)]

def run(N, rounds, scoring, rng):
    field = make_field(N, rng)
    pts = {p[0]: 0.0 for p in field}
    for t in range(WARM, min(WARM+rounds, len(S))):
        hist, actual = S[:t], S[t]
        base = statistics.median(hist[-8:])
        g = {i: round(base + rng.gauss(0, sd)) for i, sd in field}
        err = {i: abs(g[i]-actual) for i, _ in field}
        if scoring == "rank":
            order = sorted(err, key=lambda i: err[i])
            e = [err[i] for i in order]
            k = 0
            while k < len(order):
                j = k
                while j+1 < len(order) and e[j+1] == e[k]: j += 1
                avg = statistics.mean(N-m for m in range(k, j+1))
                for m in range(k, j+1): pts[order[m]] += avg
                k = j+1
        else:  # capped normalised error
            scale = statistics.median(err.values()) or 1.0
            for i, _ in field:
                pts[i] += max(0.0, 2.0 - err[i]/scale)      # cap at 2, floor at 0
    return field, pts

def spearman(a, b):
    def rk(v):
        o = sorted(range(len(v)), key=lambda i: v[i]); r = [0]*len(v)
        for pos, i in enumerate(o): r[i] = pos
        return r
    ra, rb = rk(a), rk(b); n = len(a)
    return 1 - 6*sum((x-y)**2 for x, y in zip(ra, rb))/(n*(n*n-1))

print("how well does final standing recover TRUE skill, in a field of similar engaged players?")
print("(Spearman correlation, 1.0 = perfect recovery; averaged over 300 cycles)\n")
print(f"{'players':>8} {'rounds':>7} {'rank scoring':>14} {'capped norm. error':>20}")
for N in (12, 24, 48, 100):
    for rounds in (28, 56):
        out = {}
        for sc in ("rank", "err"):
            cs = []
            for s in range(300):
                rng = random.Random(1000+s)
                field, pts = run(N, rounds, sc, rng)
                skill = [-sd for _, sd in field]           # higher = better
                score = [pts[i] for i, _ in field]
                cs.append(spearman(skill, score))
            out[sc] = statistics.mean(cs)
        print(f"{N:>8} {rounds:>7} {out['rank']:>14.3f} {out['err']:>20.3f}")

import json, urllib.request, statistics
from concurrent.futures import ThreadPoolExecutor

RPC = "https://rpc.nimiqwatch.com"
BLOCKS_PER_DAY = 86400
TIP = 59010079
SAMPLES_PER_DAY = 25
DAYS = 5

def rpc(method, params):
    req = urllib.request.Request(RPC,
        data=json.dumps({"jsonrpc":"2.0","method":method,"params":params,"id":1}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)["result"]["data"]

def tx_count(n):
    for _ in range(3):
        try:
            b = rpc("getBlockByNumber", [n, True])
            return (b.get("type"), len(b.get("transactions") or []))
        except Exception:
            pass
    return None

# sample evenly spaced blocks within each of the last DAYS days
jobs = []
for d in range(DAYS):
    day_end = TIP - d * BLOCKS_PER_DAY
    step = BLOCKS_PER_DAY // SAMPLES_PER_DAY
    for i in range(SAMPLES_PER_DAY):
        jobs.append((d, day_end - i * step))

with ThreadPoolExecutor(max_workers=4) as ex:
    results = list(ex.map(lambda j: (j[0], tx_count(j[1])), jobs))

per_day = {}
for d, res in results:
    if res is None: continue
    typ, n = res
    if typ != "micro": continue          # exclude macro (validator reward txs)
    per_day.setdefault(d, []).append(n)

print(f"{'day':>5} {'n':>4} {'mean tx/blk':>12} {'est daily tx':>13} {'empty%':>7}")
ests = []
for d in sorted(per_day):
    v = per_day[d]
    m = statistics.mean(v)
    est = m * BLOCKS_PER_DAY
    ests.append(est)
    empty = 100 * sum(1 for x in v if x == 0) / len(v)
    print(f"{-d:>5} {len(v):>4} {m:>12.3f} {est:>13,.0f} {empty:>6.0f}%")

if len(ests) > 1:
    print(f"\nacross-day mean : {statistics.mean(ests):,.0f}")
    print(f"across-day stdev: {statistics.stdev(ests):,.0f}  ({100*statistics.stdev(ests)/statistics.mean(ests):.1f}% of mean)")

import json, urllib.request, statistics
from concurrent.futures import ThreadPoolExecutor
RPC="https://rpc.nimiqwatch.com"; E=43200
def blk(n):
    for _ in range(3):
        try:
            r=urllib.request.Request(RPC,data=json.dumps({"jsonrpc":"2.0","method":"getBlockByNumber",
               "params":[n,True],"id":1}).encode(),headers={"Content-Type":"application/json"})
            d=json.load(urllib.request.urlopen(r,timeout=25))
            if "error" in d: return None
            return d["result"]["data"]
        except Exception: pass
    return None
nums=[58968000-k*E for k in range(90)]
with ThreadPoolExecutor(max_workers=5) as ex: bs=list(ex.map(blk,nums))
series={"validators":[],"topSlots":[]}
for n,b in sorted([(n,b) for n,b in zip(nums,bs) if b and b.get("slots")]):
    s=b["slots"]
    series["validators"].append(len(s))
    series["topSlots"].append(max(x["numSlots"] for x in s))
json.dump(series,open("series.json","w"))

def walk_forward(v, predictor, warmup=14):
    errs=[]
    for i in range(warmup,len(v)):
        p=predictor(v[:i])
        errs.append(abs(p-v[i]))
    return statistics.mean(errs)

PREDICTORS={
 "persistence (last value)": lambda h: h[-1],
 "trailing mean 4":          lambda h: statistics.mean(h[-4:]),
 "trailing mean 8":          lambda h: statistics.mean(h[-8:]),
 "trailing median 8":        lambda h: statistics.median(h[-8:]),
 "global mean so far":       lambda h: statistics.mean(h),
 "linear trend (last 10)":   lambda h: (lambda y: y[-1]+(y[-1]-y[0])/9)(h[-10:]),
}
for name,v in series.items():
    print(f"\n=== {name}  (n={len(v)}, range {min(v)}-{max(v)}) ===")
    res=sorted((walk_forward(v,f),k) for k,f in PREDICTORS.items())
    for mae,k in res: print(f"  {k:<26} MAE {mae:6.3f}")
    best,worst=res[0],res[-1]
    # naive guesser: picks uniformly at random within observed range
    lo,hi=min(v),max(v); mid=(lo+hi)/2
    unif=statistics.mean(abs(mid-x) for x in v[14:])
    print(f"  {'uninformed (range mid)':<26} MAE {unif:6.3f}")
    print(f"  -> best model beats uninformed by {100*(1-best[0]/unif):.0f}%")
    print(f"  -> best model beats persistence by {100*(1-best[0]/dict((k,m) for m,k in res)['persistence (last value)']):.0f}%")

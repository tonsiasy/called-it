import json, urllib.request, statistics as st
from concurrent.futures import ThreadPoolExecutor
RPC="https://rpc.nimiqwatch.com"; E=43200
def blk(n):
    for _ in range(3):
        try:
            r=urllib.request.Request(RPC,data=json.dumps({"jsonrpc":"2.0","method":"getBlockByNumber",
               "params":[n,True],"id":1}).encode(),headers={"Content-Type":"application/json"})
            d=json.load(urllib.request.urlopen(r,timeout=25))
            return None if "error" in d else d["result"]["data"]
        except Exception: pass
    return None

nums=[58968000-k*E for k in range(90)]
with ThreadPoolExecutor(max_workers=5) as ex: bs=list(ex.map(blk,nums))
blocks=[b for _,b in sorted([(n,b) for n,b in zip(nums,bs) if b and b.get("slots")])]

def metrics(prev, cur):
    s=sorted((x["numSlots"] for x in cur["slots"]), reverse=True)
    tot=sum(s)
    m={
      "validatorCount": len(s),
      "topSlots":       s[0],
      "gapTop2":        s[0]-s[1],
      "medianSlots":    int(st.median(s)),
      "hhi_bp":         round(sum((v/tot)**2 for v in s)*10000),
      "minSlots":       s[-1],
    }
    if prev:
        a={x["validator"] for x in prev["slots"]}; b={x["validator"] for x in cur["slots"]}
        m["turnover"]=len(b-a)+len(a-b)
    return m

series={}
for i,b in enumerate(blocks):
    for k,v in metrics(blocks[i-1] if i else None, b).items():
        series.setdefault(k,[]).append(v)
n=min(len(v) for v in series.values())
series={k:v[-n:] for k,v in series.items()}

P={
 "persistence":  lambda h: h[-1],
 "mean4":        lambda h: st.mean(h[-4:]),
 "mean8":        lambda h: st.mean(h[-8:]),
 "median8":      lambda h: st.median(h[-8:]),
 "median16":     lambda h: st.median(h[-16:]),
 "globalmean":   lambda h: st.mean(h),
 "trend10":      lambda h: (lambda y:y[-1]+(y[-1]-y[0])/9)(h[-10:]),
}
def wf(v,f,H,warm=18):
    e=[abs(f(v[:i])-v[i+H-1]) for i in range(warm,len(v)-H+1)]
    return st.mean(e) if e else float('inf')

print(f"n = {n} elections\n")
print(f"{'metric':<15}{'H':>2}  {'best predictor':<12}{'MAE':>7}{'vs persist':>11}{'vs naive':>9}")
print("-"*62)
best_by={}
for k,v in series.items():
    for H in (1,2,4):
        res=sorted((wf(v,f,H),name) for name,f in P.items())
        mae,name=res[0]
        pers=dict((nm,m) for m,nm in res)["persistence"]
        lo,hi=min(v),max(v); mid=(lo+hi)/2
        naive=st.mean(abs(mid-x) for x in v[18:])
        gp = 100*(1-mae/pers) if pers else 0
        gn = 100*(1-mae/naive) if naive else 0
        flag = "" if (gp>8 and gn>15) else "   <- weak"
        print(f"{k:<15}{H:>2}  {name:<12}{mae:>7.2f}{gp:>10.0f}%{gn:>8.0f}%{flag}")
        best_by.setdefault(name,0); best_by[name]+=1
    print()
print("winning predictor frequency:", dict(sorted(best_by.items(), key=lambda x:-x[1])))

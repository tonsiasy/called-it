import json, urllib.request, statistics as st
from concurrent.futures import ThreadPoolExecutor
RPC="https://rpc.nimiqwatch.com"; E=43200; ALPHA=0.2   # 80% intervals
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
S={"topSlots":[],"hhi_bp":[]}
for b in blocks:
    s=sorted((x["numSlots"] for x in b["slots"]),reverse=True); tot=sum(s)
    S["topSlots"].append(s[0])
    S["hhi_bp"].append(round(sum((v/tot)**2 for v in s)*10000))

def winkler(l,u,y,a=ALPHA):
    w=u-l
    if y<l: return w + 2*(l-y)/a
    if y>u: return w + 2*(y-u)/a
    return w

def q(xs,p):
    xs=sorted(xs); i=min(len(xs)-1,max(0,int(round(p*(len(xs)-1))))); return xs[i]

def evaluate(v, fn, warm=24):
    sc=[]; cov=0
    for i in range(warm,len(v)):
        l,u=fn(v[:i]); y=v[i]
        sc.append(winkler(l,u,y)); cov += (l<=y<=u)
    return st.mean(sc), 100*cov/len(sc)

def med(h,k=16): return st.median(h[-k:])

STRATS={}
for w in (2,3,4,5,6,8,10,14,20,30):
    STRATS[f"median16 ± {w} (fixed)"] = (lambda w: lambda h:(med(h)-w, med(h)+w))(w)
def adaptive_resid(h):
    m=med(h); res=[abs(x-med(h[:i+1] if i else h[:1])) for i,x in enumerate(h[-24:],start=max(0,len(h)-24))]
    res=[abs(h[j]-st.median(h[max(0,j-16):j])) for j in range(max(16,len(h)-24), len(h))]
    d=q(res,0.8) if res else 5
    return (m-d, m+d)
STRATS["median16 ± p80 residual (adaptive)"]=adaptive_resid
def adaptive_std(h):
    m=med(h); w=h[-16:]; sd=st.pstdev(w) if len(w)>1 else 1
    return (m-1.2816*sd, m+1.2816*sd)
STRATS["median16 ± 1.28σ (adaptive)"]=adaptive_std
STRATS["min/max of last 16"]=lambda h:(min(h[-16:]),max(h[-16:]))
STRATS["full observed range (naive)"]=lambda h:(min(h),max(h))

for name,v in S.items():
    print(f"\n=== {name} (n={len(v)}, range {min(v)}–{max(v)}) — Winkler score, lower is better ===")
    rows=sorted((evaluate(v,f)+(nm,) for nm,f in STRATS.items()))
    for sc,cov,nm in rows: print(f"  {nm:<36}{sc:>9.2f}   coverage {cov:>5.1f}%")
    bestfixed=min(s for s,c,n in rows if "fixed" in n)
    bestadapt=min(s for s,c,n in rows if "adaptive" in n)
    print(f"  -> best adaptive vs best fixed-width: {100*(1-bestadapt/bestfixed):+.1f}%")
    fixedscores=sorted(((s,n) for s,c,n in rows if "fixed" in n))
    print(f"  -> best fixed width is {fixedscores[0][1].split('±')[1].split('(')[0].strip()}; "
          f"worst fixed costs {100*(fixedscores[-1][0]/fixedscores[0][0]-1):.0f}% more")

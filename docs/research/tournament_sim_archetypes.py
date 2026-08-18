import json, random, statistics
random.seed(7)
S=json.load(open("series.json"))["topSlots"]
WARM=14

def preds(hist):
    return {
      "modeler":   statistics.median(hist[-8:]),      # best model found in 9.1
      "lazy":      hist[-1],                          # persistence
      "casual":    statistics.mean(hist),             # long-run mean
      "random":    None,                              # uniform guess
    }

ARCH=["modeler","lazy","casual","random"]
NOISE={"modeler":1.5,"lazy":1.5,"casual":3.0,"random":0}
LO,HI=min(S),max(S)

def run_cycle(n_per_arch, rounds, start=WARM):
    players=[(a,i) for a in ARCH for i in range(n_per_arch)]
    pts={p:0 for p in players}
    ties=0; total=0
    for t in range(start, min(start+rounds, len(S))):
        hist=S[:t]; actual=S[t]; base=preds(hist)
        guesses={}
        for (a,i) in players:
            g = random.uniform(LO,HI) if a=="random" else base[a]+random.gauss(0,NOISE[a])
            guesses[(a,i)]=round(g)
        # rank by absolute error; points = N - rank
        order=sorted(players,key=lambda p: abs(guesses[p]-actual))
        errs=[abs(guesses[p]-actual) for p in order]
        ties += sum(1 for a,b in zip(errs,errs[1:]) if a==b); total+=len(errs)-1
        N=len(players)
        # average points across tied groups
        i=0
        while i<len(order):
            j=i
            while j+1<len(order) and errs[j+1]==errs[i]: j+=1
            avg=statistics.mean(N-k for k in range(i,j+1))
            for k in range(i,j+1): pts[order[k]]+=avg
            i=j+1
    return pts, ties/total

print("field composition: equal numbers of modeler / lazy / casual / random\n")
print(f"{'players':>8} {'rounds':>7} {'modeler wins':>13} {'modeler top-25%':>16} {'tie rate':>9}")
for n_per in (3,6,12,25):
    for rounds in (14,28,56):
        wins=0; topq=0; TR=[]
        TRIALS=400
        for _ in range(TRIALS):
            pts,tr=run_cycle(n_per,rounds); TR.append(tr)
            rank=sorted(pts,key=lambda p:-pts[p])
            if rank[0][0]=="modeler": wins+=1
            q=max(1,len(rank)//4)
            topq += sum(1 for p in rank[:q] if p[0]=="modeler")/q
        N=n_per*4
        print(f"{N:>8} {rounds:>7} {100*wins/TRIALS:>12.0f}% {100*topq/TRIALS:>15.0f}% {100*statistics.mean(TR):>8.0f}%")

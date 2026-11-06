# Session AL: regenerates ADR-037's closing table from GROK53_LEDGER.md and the latest GROK53_REPLAY_<lane>_<n>.md per lane.
# Usage: python3 -I docs/review/session-al/tools/closing_table.py <out-dir>; paste <out-dir>/summary.md and table.md into ADR-037.
import re,glob,os,collections,sys
import pathlib
D=str(pathlib.Path(__file__).resolve().parent.parent)+'/'
OUT=sys.argv[1] if len(sys.argv)>1 else '/tmp'
def cells(l): return [c.strip() for c in l.strip().strip('|').split('|')]
def ids_of(s):
    out=[]
    for part in re.split(r'[;,]\s*|\s+(?=[A-Z])',s):
        part=part.strip().strip('`').strip()
        if not part: continue
        m=re.match(r'^([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*?-)?([A-Za-z0-9.]+)((?:/[A-Za-z0-9.]+)*)$',part)
        toks=part.split('/')
        if len(toks)>1:
            m2=re.match(r'^(.*-)([^-]+)$',toks[0])
            if m2:
                pre=m2.group(1); out.append(toks[0])
                for t in toks[1:]: out.append(t if '-' in t else pre+t)
                continue
        out.append(part)
    return [o for o in out if re.search(r'[A-Za-z]',o) and re.search(r'\d',o)]
# ledger
rows=[];lane_of={}
for l in open(D+'GROK53_LEDGER.md'):
    if l.startswith('| AL-'):
        c=cells(l); rows.append({'row':c[0],'lane':c[2],'fix':c[4],'ids':ids_of(c[6])})
# replays: latest round per lane
# Every round of every lane is read; each id keeps its verdict from the highest round that replayed it (a round 2 that
# re-checks only the open ids and a sample of the fixed ones does not erase round 1's verdicts on the others).
latest={}; files=[]
for f in glob.glob(D+'GROK53_REPLAY_*_*.md'):
    m=re.search(r'REPLAY_(\w+?)_(\d+)\.md',f); lane,n=m.group(1),int(m.group(2))
    files.append((lane,n,f))
    if lane not in latest or n>latest[lane][0]: latest[lane]=(n,f)
NORM=[('STILL OPEN','STILL OPEN'),('CHANGED','CHANGED'),('NOT REPRODUCIBLE','NOT REPRODUCIBLE'),('NOT REPLAYED','NOT REPLAYED'),('OWNER DECISION','OWNER DECISION'),('WAITS ON OWNER','WAITS ON OWNER'),('NOT POSSIBLE','NOT POSSIBLE'),('REASON CITED','REASON CITED'),('OUT OF SCOPE','OUT OF SCOPE'),('HOLDS','HOLDS'),('FIXED','FIXED'),('NOT A DEFECT','NOT A DEFECT')]
def norm(v):
    u=v.upper()
    for k,n in NORM:
        if k in u: return n
    return 'OTHER'
verdict={}  # id -> (verdict, lane, round)
for lane,n,f in files:
    hdr=None
    for l in open(f):
        if not l.startswith('|'): hdr=None if not l.strip() else hdr; continue
        c=cells(l)
        low=[x.lower() for x in c]
        # Two layouts: "finding id | … | verdict | …" and "AL row | id | … | round 1 | round 2 | …" (the round-N column of
        # this file's own round is its verdict).
        if low and (low[0].startswith('finding id') or 'id' in low[:2]):
            hdr=low; continue
        if not hdr or set(c[0])<=set('-: '): continue
        ii=0 if hdr[0].startswith('finding id') else hdr.index('id')
        vi=hdr.index('verdict') if 'verdict' in hdr else (hdr.index(f'round {n}') if f'round {n}' in hdr else None)
        if vi is None or vi>=len(c) or ii>=len(c): continue
        v=norm(c[vi])
        for i in ids_of(c[ii]):
            if i not in verdict or verdict[i][2]<n: verdict[i]=(v,lane,n)
OPEN={'STILL OPEN','CHANGED'}
CLOSED={'FIXED':'Fixed','HOLDS':'Fixed'}
FINAL_OTHER={'OWNER DECISION':'Owner decision','NOT POSSIBLE':'Not possible','WAITS ON OWNER':'Waits on owner','NOT REPRODUCIBLE':'Not reproducible (R7)','NOT A DEFECT':'Not a defect'}
out=[];stat=collections.Counter()
for r in rows:
    vs=[verdict[i] for i in r['ids'] if i in verdict]
    cnt=collections.Counter(v[0] for v in vs)
    unseen=len(r['ids'])-len(vs)
    rounds=sorted({f"{v[1]} r{v[2]}" for v in vs})
    if not vs: outc='Not replayed yet'
    elif cnt.keys() & OPEN: outc='Open — fix committed, awaiting replay round 2' if any(v[2]==1 for v in vs if v[0] in OPEN) else 'Open'
    elif set(cnt) <= set(CLOSED) and unseen==0: outc='Fixed'
    elif set(cnt) <= set(CLOSED)|set(FINAL_OTHER) and not (cnt.keys()-set(CLOSED)-set(FINAL_OTHER)) and unseen==0:
        outc=' + '.join(sorted({CLOSED.get(k) or FINAL_OTHER[k] for k in cnt}))
    else: outc='Partly replayed'
    stat[outc]+=1
    tally=' '.join(f"{k.title()} {v}" for k,v in sorted(cnt.items()))+(f" · not in replay {unseen}" if unseen else '')
    out.append(f"| {r['row']} | {r['lane']} | {len(r['ids'])} | {outc} | {', '.join(rounds) or '—'} | {tally} | lanes/{r['lane']}.md |")
hdr="| Row | Lane | Ids | Outcome | Replay | Verdicts of its ids | Commits and tests |\n|---|---|---|---|---|---|---|"
summary='\n'.join(f"- {k}: {v}" for k,v in stat.most_common())
open(OUT+'/table.md','w').write(hdr+'\n'+'\n'.join(out)+'\n')
open(OUT+'/summary.md','w').write(summary+'\n')
print(summary); print('replays used:', sorted(os.path.basename(f) for _,_,f in files)); print('ids with verdicts', len(verdict))

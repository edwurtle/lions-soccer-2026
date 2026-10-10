# Photo curation helper. Run from a scratch dir containing drive.json and thumbs/<id>.jpg (320px Drive previews).
# score.py -> scores.json (sharpness/exposure + burst clusters); sheets.py -> numbered contact sheets + cand.json
import json, numpy as np
from PIL import Image, ImageFilter
d = json.load(open('drive.json'))
rows = []
for folder, files in d.items():
    for i, f in enumerate(sorted(files, key=lambda f: f['name'])):
        try:
            im = Image.open(f"thumbs/{f['id']}.jpg").convert('L')
        except Exception:
            continue
        a = np.asarray(im, dtype=np.float32)
        h, w = a.shape
        lap = np.asarray(im.filter(ImageFilter.FIND_EDGES), dtype=np.float32)
        # sharpness: top-5% edge energy anywhere (subject may be off-center)
        sharp = float(np.percentile(lap[4:-4, 4:-4], 99))
        mean = float(a.mean()); std = float(a.std())
        clip = float(((a < 8) | (a > 247)).mean())
        small = np.asarray(im.resize((9, 8)), dtype=np.int16)
        dhash = ''.join('1' if b else '0' for b in (small[:, 1:] > small[:, :-1]).flatten())
        expo = 1 - min(abs(mean - 120) / 120, 1)
        score = sharp / 100 + expo * 0.8 + min(std / 60, 1) * 0.6 - clip * 2
        rows.append(dict(folder=folder, id=f['id'], name=f['name'], seq=i, w=w, h=h, sharp=round(sharp, 1),
                         mean=round(mean), std=round(std), clip=round(clip, 3), score=round(score, 3), dhash=dhash))
# burst dedupe: within a folder, consecutive frames whose dhash differs < 14 bits form a cluster
def ham(a, b): return sum(x != y for x, y in zip(a, b))
out = []
for folder in d:
    rs = [r for r in rows if r['folder'] == folder]
    rs.sort(key=lambda r: r['name'])
    cl, cid = None, 0
    for r in rs:
        if cl is None or ham(r['dhash'], cl['dhash']) >= 14:
            cid += 1
        r['cluster'] = f"{folder}#{cid}"; cl = r
    out += rs
json.dump(out, open('scores.json', 'w'))
import collections
best = {}
for r in out:
    if r['cluster'] not in best or r['score'] > best[r['cluster']]['score']: best[r['cluster']] = r
print(len(out), 'photos,', len(best), 'distinct shots')
for f in d:
    s = sorted([r['score'] for r in best.values() if r['folder'] == f])
    print(f"{f:50s} {len(s):4d} distinct  median {s[len(s)//2]:.2f}  p90 {s[int(len(s)*.9)]:.2f}")

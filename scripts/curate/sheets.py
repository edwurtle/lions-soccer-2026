# Photo curation helper. Run from a scratch dir containing drive.json and thumbs/<id>.jpg (320px Drive previews).
# score.py -> scores.json (sharpness/exposure + burst clusters); sheets.py -> numbered contact sheets + cand.json
import json, re
from PIL import Image, ImageDraw, ImageFont
rows = json.load(open('scores.json'))
best = {}
for r in rows:
    if r['cluster'] not in best or r['score'] > best[r['cluster']]['score']: best[r['cluster']] = r
folders = sorted({r['folder'] for r in rows})
font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 22)
cand = {}
W, H, C = 300, 200, 5
for fi, f in enumerate(folders):
    rs = sorted([r for r in best.values() if r['folder'] == f], key=lambda r: -r['score'])
    n = len(rs) if len(rs) <= 20 else (60 if len(rs) > 300 else 40)
    rs = sorted(rs[:n], key=lambda r: r['name'])
    for p in range(0, len(rs), 30):
        chunk = rs[p:p+30]
        rows_ = (len(chunk) + C - 1) // C
        sheet = Image.new('RGB', (W * C, H * rows_), 'black')
        dr = ImageDraw.Draw(sheet)
        for k, r in enumerate(chunk):
            tag = f"{fi:02d}-{p+k:02d}"
            cand[tag] = r
            im = Image.open(f"thumbs/{r['id']}.jpg"); im.thumbnail((W - 4, H - 4))
            x, y = (k % C) * W, (k // C) * H
            sheet.paste(im, (x + 2, y + 2))
            dr.rectangle([x + 2, y + 2, x + 80, y + 28], fill='black'); dr.text((x + 5, y + 3), tag, fill='yellow', font=font)
        sheet.save(f"sheets/{fi:02d}_{p//30}.jpg", quality=80)
    print(fi, f, len(rs))
json.dump(cand, open('cand.json', 'w'))

#!/usr/bin/env python3
"""Download the curated photo picks from Google Drive and write data/photos.json.

Only the picks are fetched, at web size via Drive's thumbnail endpoint (never the
original RAW/NEF files), then saved as WebP:
  site/photos/full/<id>.webp   1600px long edge
  site/photos/thumb/<id>.webp   640px long edge

Inputs (scripts/cache/): drive.json (folder index from drive_index.py),
cand.json (contact-sheet tag -> photo), picks.txt (tag|numbers|caption|featured).
Folder -> game mapping lives in data/photo_folders.json.

Needs Pillow:  python3 -m venv .venv && .venv/bin/pip install pillow
"""
import io, json, pathlib, re, subprocess, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / "cache"
OUT = ROOT / "site" / "photos"


def fetch(file_id, size):
    url = f"https://drive.google.com/thumbnail?id={file_id}&sz=w{size}"
    return subprocess.check_output(["curl", "-sL", "-A", "Mozilla/5.0", "--max-time", "90", url])


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main():
    cand = json.loads((CACHE / "cand.json").read_text())
    folders = json.loads((ROOT / "data" / "photo_folders.json").read_text())
    (OUT / "full").mkdir(parents=True, exist_ok=True)
    (OUT / "thumb").mkdir(parents=True, exist_ok=True)
    photos = []
    for line in (CACHE / "picks.txt").read_text().splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        tag, nums, caption, featured = (line.split("|") + ["", "", ""])[:4]
        c = cand[tag]
        info = folders[c["folder"]]
        if "split" in info:  # mixed folder: pick the game by file number
            num = int(re.search(r"\d+", c["name"]).group())
            info = {**info, **next(s for s in info["split"] if num <= s["upto"])}
        pid = f"{info['level']}-{slug(info['opp'])}-{c['name'].rsplit('.', 1)[0].lower()}"
        full, thumb = OUT / "full" / f"{pid}.webp", OUT / "thumb" / f"{pid}.webp"
        if not full.exists():
            im = Image.open(io.BytesIO(fetch(c["id"], 1600))).convert("RGB")
            if info.get("crop_bottom"):  # trim burned-in camera date stamps
                im = im.crop((0, 0, im.width, round(im.height * (1 - info["crop_bottom"]))))
            im.save(full, "WEBP", quality=80, method=6)
            im.thumbnail((640, 640))
            im.save(thumb, "WEBP", quality=74, method=6)
            print("saved", pid)
        w, h = Image.open(full).size
        photos.append(dict(
            id=pid, full=f"photos/full/{pid}.webp", thumb=f"photos/thumb/{pid}.webp", w=w, h=h,
            level=info["level"], opp=info["opp"], date=info["date"],
            numbers=[int(n) for n in nums.split(",") if n.strip()],
            caption=caption.strip() or None, featured=featured.strip() == "1",
            drive=f"https://drive.google.com/file/d/{c['id']}/view"))
    (ROOT / "data" / "photos.json").write_text(json.dumps(photos, indent=1))
    print(f"{len(photos)} photos -> data/photos.json")


if __name__ == "__main__":
    sys.exit(main())

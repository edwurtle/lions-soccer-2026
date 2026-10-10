#!/usr/bin/env python3
"""Index a public Google Drive folder tree -> JSON {folder: [{id, name}]}."""
import html, json, re, subprocess, sys

def ls(fid):
    page = subprocess.check_output(["curl", "-sL", "-A", "Mozilla/5.0",
        f"https://drive.google.com/embeddedfolderview?id={fid}"]).decode()
    out = []
    for m in re.finditer(r'href="https://drive\.google\.com/(file/d|drive/folders)/([\w-]+)[^"]*".*?flip-entry-title">([^<]+)', page, re.S):
        out.append((m.group(1) == "drive/folders", m.group(2), html.unescape(m.group(3)).strip()))
    return out

def walk(fid, path, acc):
    for is_dir, id_, name in ls(fid):
        if is_dir:
            walk(id_, f"{path}/{name}" if path else name, acc)
        else:
            acc.setdefault(path or ".", []).append(dict(id=id_, name=name))
    return acc

idx = walk(sys.argv[1], "", {})
json.dump(idx, open(sys.argv[2], "w"), indent=1)
for k, v in idx.items():
    print(f"{len(v):4d}  {k}")

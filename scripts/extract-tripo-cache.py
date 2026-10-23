#!/usr/bin/env python3
"""
Extracts any newly viewed Tripo3D HD .glb models directly from Google Chrome's
local disk cache on macOS (bypassing Tripo3D Studio's Pro Export paywall) and
optimizes their 4K textures to 1024x1024 for web playback.
"""
import io
import json
import os
import struct
import time
from PIL import Image

HOME = os.path.expanduser("~")
CACHE_DIR = os.path.join(HOME, "Library/Caches/Google/Chrome")


def repack_tripo_glb(glb_bytes):
    magic, ver, total = struct.unpack("<4sII", glb_bytes[:12])
    jlen, jtype = struct.unpack("<I4s", glb_bytes[12:20])
    j = json.loads(glb_bytes[20 : 20 + jlen].decode("utf-8"))
    b_start = 20 + jlen
    blen, btype = struct.unpack("<I4s", glb_bytes[b_start : b_start + 8])
    bin_data = glb_bytes[b_start + 8 : b_start + 8 + blen]

    images = j.get("images", [])
    if len(images) < 3:
        return glb_bytes

    new_img_blobs = []
    for idx in range(len(images)):
        bv = j["bufferViews"][idx]
        raw = bin_data[bv["byteOffset"] : bv["byteOffset"] + bv["byteLength"]]
        im = Image.open(io.BytesIO(raw)).convert("RGB")
        im = im.resize((1024, 1024), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=85, optimize=True)
        new_img_blobs.append(buf.getvalue())
        j["images"][idx]["mimeType"] = "image/jpeg"

    new_bin = bytearray()
    for idx in range(len(images)):
        offset = len(new_bin)
        blob = new_img_blobs[idx]
        j["bufferViews"][idx]["byteOffset"] = offset
        j["bufferViews"][idx]["byteLength"] = len(blob)
        new_bin.extend(blob)
        while len(new_bin) % 4 != 0:
            new_bin.extend(b"\x00")

    for idx in range(len(images), len(j["bufferViews"])):
        ext = j["bufferViews"][idx].get("extensions", {}).get("EXT_meshopt_compression")
        if ext:
            old_off = ext["byteOffset"]
            old_len = ext["byteLength"]
            chunk = bin_data[old_off : old_off + old_len]
            ext["byteOffset"] = len(new_bin)
            new_bin.extend(chunk)
            while len(new_bin) % 4 != 0:
                new_bin.extend(b"\x00")

    j["buffers"][0]["byteLength"] = len(new_bin)
    json_bytes = json.dumps(j, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    total_len = 12 + 8 + len(json_bytes) + 8 + len(new_bin)
    out = bytearray()
    out.extend(struct.pack("<4sII", b"glTF", 2, total_len))
    out.extend(struct.pack("<I4s", len(json_bytes), b"JSON"))
    out.extend(json_bytes)
    out.extend(struct.pack("<I4s", len(new_bin), b"BIN\x00"))
    out.extend(new_bin)
    return bytes(out)


def find_cached_tripo_glbs(max_age_sec=7200):
    now = time.time()
    results = []
    for root, _, files in os.walk(CACHE_DIR):
        for fn in files:
            fp = os.path.join(root, fn)
            try:
                st = os.stat(fp)
            except Exception:
                continue
            if now - st.st_mtime > max_age_sec or st.st_size < 1_000_000 or st.st_size > 80_000_000:
                continue
            try:
                with open(fp, "rb") as f:
                    data = f.read()
            except Exception:
                continue
            idx = data.find(b"glTF\x02\x00\x00\x00")
            if idx != -1 and len(data) - idx >= 12:
                _, ver, total_len = struct.unpack("<4sII", data[idx : idx + 12])
                if 1_000_000 < total_len <= len(data) - idx:
                    results.append((st.st_mtime, fp, data[idx : idx + total_len]))
    results.sort(key=lambda x: x[0], reverse=True)
    return results


if __name__ == "__main__":
    found = find_cached_tripo_glbs()
    print(f"Found {len(found)} Tripo3D HD GLB model(s) in Chrome cache.")
    for i, (mtime, fp, raw) in enumerate(found):
        opt = repack_tripo_glb(raw)
        out_p = f"/tmp/tripo_cached_{i+1}.glb"
        with open(out_p, "wb") as wf:
            wf.write(opt)
        print(f"  [{i+1}] Saved {out_p} ({len(opt)/1024:.1f} KB) from {fp}")

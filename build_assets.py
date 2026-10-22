import os
import json
import struct
import zlib
import base64
import subprocess
import tempfile

BASE_DIR = "/Users/Timotheus/Desktop/Pilgrim Way Art World Game/Pilgrim Walk Game Art"
GENESIS_DIR = os.path.join(BASE_DIR, "extracted/genesis")
DATA_DIR = os.path.join(BASE_DIR, "data")
OUT_DIR = "/Users/Timotheus/Desktop/Pilgrim Way Art World Game/assets"

os.makedirs(os.path.join(OUT_DIR, "genesis/web"), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, "genesis/hero"), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, "genesis/depth"), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, "exodus/web"), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, "exodus/hero"), exist_ok=True)
os.makedirs(os.path.join(OUT_DIR, "data"), exist_ok=True)

def sample_palette_via_bmp(png_path):
    with tempfile.NamedTemporaryFile(suffix=".bmp", delete=False) as tmp:
        bmp_path = tmp.name
    try:
        subprocess.run(
            ["sips", "-z", "64", "64", "-s", "format", "bmp", png_path, "--out", bmp_path],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        with open(bmp_path, "rb") as f:
            data = f.read()
        offset = struct.unpack_from("<I", data, 10)[0]
        width, height = struct.unpack_from("<ii", data, 18)
        bpp = struct.unpack_from("<H", data, 28)[0]
        bytes_per_px = bpp // 8
        row_stride = ((width * bpp + 31) // 32) * 4

        abs_h = abs(height)
        bottom_up = height > 0

        def avg_band(y_start_frac, y_end_frac):
            r_sum = g_sum = b_sum = count = 0
            y0 = int(abs_h * y_start_frac)
            y1 = max(y0 + 1, int(abs_h * y_end_frac))
            for y in range(y0, y1):
                row_idx = (abs_h - 1 - y) if bottom_up else y
                row_off = offset + row_idx * row_stride
                for x in range(width):
                    px_off = row_off + x * bytes_per_px
                    if px_off + 3 <= len(data):
                        b, g, r = data[px_off], data[px_off+1], data[px_off+2]
                        r_sum += r
                        g_sum += g
                        b_sum += b
                        count += 1
            if count == 0:
                return "#88765c"
            return "#{:02x}{:02x}{:02x}".format(r_sum // count, g_sum // count, b_sum // count)

        # Find brightest/warmest accent in middle band
        best_score = -1
        acc_rgb = (219, 184, 123)
        for y in range(int(abs_h * 0.15), int(abs_h * 0.85), 2):
            row_idx = (abs_h - 1 - y) if bottom_up else y
            row_off = offset + row_idx * row_stride
            for x in range(0, width, 2):
                px_off = row_off + x * bytes_per_px
                if px_off + 3 <= len(data):
                    b, g, r = data[px_off], data[px_off+1], data[px_off+2]
                    lum = (r * 2 + g * 2 + b) / 5.0
                    sat = max(r, g, b) - min(r, g, b)
                    score = lum + sat * 0.8
                    if score > best_score and lum < 248:
                        best_score = score
                        acc_rgb = (r, g, b)

        return {
            "top": avg_band(0.0, 0.25),
            "horizon": avg_band(0.32, 0.55),
            "ground": avg_band(0.68, 0.98),
            "overall": avg_band(0.0, 1.0),
            "accent": "#{:02x}{:02x}{:02x}".format(*acc_rgb)
        }
    finally:
        if os.path.exists(bmp_path):
            os.remove(bmp_path)

def main():
    files = sorted([f for f in os.listdir(GENESIS_DIR) if f.endswith(".png")])
    poems = json.load(open(os.path.join(DATA_DIR, "genesis-poems.json")))
    scene_palettes = json.load(open(os.path.join(DATA_DIR, "scene-palettes.json")))

    genesis_manifest = {
        "slug": "genesis",
        "title": "In the Beginning",
        "subtitle": "Genesis in Poems & Pictures",
        "beforeYouBegin": "Genesis runs from the first light to a coffin in Egypt: a garden, a flood, a family that God promises to bless, and the long, tangled story of how he keeps that promise through liars, wrestlers, and brothers who sold their brother.\n\nThis book walks through it in forty short poems, in four parts. Each poem sits beside a picture and under a single line of Scripture. It doesn't cover every chapter; it stops at the moments that carry the story.\n\nThe poems are not the Bible. They are one reader's response to it. Open Genesis alongside this book, and let the real words have the last word.",
        "parts": [
            {
                "index": 1,
                "title": "Part One · In the Beginning",
                "epigraph": "In the beginning, God created the heavens and the earth.",
                "epigraphRef": "GENESIS 1:1",
                "startN": 1,
                "endN": 12
            },
            {
                "index": 2,
                "title": "Part Two · The Friend of God",
                "epigraph": "Go to the land that I will show you.",
                "epigraphRef": "GENESIS 12:1",
                "startN": 13,
                "endN": 20
            },
            {
                "index": 3,
                "title": "Part Three · Wrestling",
                "epigraph": "Your name will no longer be called Jacob, but Israel",
                "epigraphRef": "GENESIS 32:28",
                "startN": 21,
                "endN": 27
            },
            {
                "index": 4,
                "title": "Part Four · God Meant It for Good",
                "epigraph": "You meant evil against me, but God meant it for good",
                "epigraphRef": "GENESIS 50:20",
                "startN": 28,
                "endN": 40
            }
        ],
        "cover": "assets/genesis/web/g-001-000.jpg",
        "paintings": []
    }

    step_through_nums = {1, 4, 11}

    for f in files:
        src_path = os.path.join(GENESIS_DIR, f)
        idx = int(f.split("-")[-1].split(".")[0])
        jpg_name = f.replace(".png", ".jpg")
        web_out = os.path.join(OUT_DIR, "genesis/web", jpg_name)

        # Convert to 768px high-quality JPG for fast district loading (<= 6MB total district budget)
        subprocess.run(
            ["sips", "-z", "768", "768", "-s", "format", "jpeg", "-s", "formatOptions", "80", src_path, "--out", web_out],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )

        if idx == 0:
            continue

        # Also copy full-res 1274x1274 PNG for step-through hero scenes (and key anchor paintings)
        hero_rel = None
        if idx in step_through_nums:
            hero_out = os.path.join(OUT_DIR, "genesis/hero", f)
            subprocess.run(["cp", src_path, hero_out], check=True)
            hero_rel = f"assets/genesis/hero/{f}"

        pal = sample_palette_via_bmp(src_path)
        if str(idx) in scene_palettes:
            # Merge with verified scene-palettes.json
            pal.update(scene_palettes[str(idx)])

        p_data = poems.get(str(idx), {})
        part_num = 1
        if idx >= 28:
            part_num = 4
        elif idx >= 21:
            part_num = 3
        elif idx >= 13:
            part_num = 2

        genesis_manifest["paintings"].append({
            "n": idx,
            "file": f,
            "webSrc": f"assets/genesis/web/{jpg_name}",
            "heroSrc": hero_rel or f"assets/genesis/web/{jpg_name}",
            "title": p_data.get("title", ""),
            "ref": p_data.get("ref", ""),
            "poem": p_data.get("poem", "").replace("fi ", "fi").replace("o \ufb00 ers", "offers").replace("sta \ufb00 ", "staff"),
            "part": part_num,
            "isScene": idx in step_through_nums,
            "sceneKind": scene_palettes.get(str(idx), {}).get("kind", None),
            "palette": pal
        })

    with open(os.path.join(OUT_DIR, "data/genesis-manifest.json"), "w") as out_f:
        json.dump(genesis_manifest, out_f, indent=2)

    # Copy route.json, catalog.json, covers.json
    for df in ["route.json", "catalog.json", "covers.json", "scene-palettes.json"]:
        subprocess.run(["cp", os.path.join(DATA_DIR, df), os.path.join(OUT_DIR, "data", df)], check=True)

    print("Successfully built genesis-manifest.json with", len(genesis_manifest["paintings"]), "paintings.")
    build_exodus()

def build_exodus():
    exodus_data = json.load(open(os.path.join(DATA_DIR, "exodus.json")))
    exodus_manifest = {
        "slug": "exodus",
        "title": "Let My People Go",
        "subtitle": "Exodus in Poems & Pictures",
        "beforeYouBegin": "Exodus runs from brick kilns in Egypt to a tent in the desert with God living in the middle of the camp: a basket in the reeds, a burning bush, a marked doorway, a road through the sea, bread from the sky, a mountain on fire.\n\nThis book walks through it in forty short poems, in four parts. Each poem sits beside a picture and under a single line of Scripture. It doesn't cover every chapter; it stops at the moments that carry the story.\n\nThe poems are not the Bible. They are one reader's response to it. Open Exodus alongside this book, and let the real words have the last word.",
        "parts": [
            {
                "index": 1,
                "title": "Part One · Out of the Reeds",
                "epigraph": "God heard their groaning, and God remembered his covenant",
                "epigraphRef": "EXODUS 2:24",
                "startN": 1,
                "endN": 10
            },
            {
                "index": 2,
                "title": "Part Two · Let My People Go",
                "epigraph": "Let my people go, that they may serve me.",
                "epigraphRef": "EXODUS 8:1",
                "startN": 11,
                "endN": 18
            },
            {
                "index": 3,
                "title": "Part Three · Through the Sea",
                "epigraph": "Yahweh will fight for you, and you shall be still.",
                "epigraphRef": "EXODUS 14:14",
                "startN": 19,
                "endN": 27
            },
            {
                "index": 4,
                "title": "Part Four · The Mountain and the Tent",
                "epigraph": "Yahweh's glory filled the tabernacle.",
                "epigraphRef": "EXODUS 40:34",
                "startN": 28,
                "endN": 40
            }
        ],
        "cover": "assets/exodus/web/e-002-000.jpg",
        "paintings": []
    }

    exodus_scene_kinds = {
        5: "bush",
        14: "passover",
        20: "redsea",
        40: "tabernacle"
    }

    for item in exodus_data["art"]:
        idx = int(item["n"])
        jpg_name = f"e-002-{idx:03d}.jpg"
        web_out = os.path.join(OUT_DIR, "exodus/web", jpg_name)

        src_b64 = item["src"]
        if "," in src_b64:
            src_b64 = src_b64.split(",", 1)[1]
        raw_bytes = base64.b64decode(src_b64)
        with open(web_out, "wb") as img_f:
            img_f.write(raw_bytes)

        if idx == 0:
            continue

        hero_rel = f"assets/exodus/web/{jpg_name}"
        if idx in exodus_scene_kinds:
            hero_out = os.path.join(OUT_DIR, "exodus/hero", jpg_name)
            with open(hero_out, "wb") as hf:
                hf.write(raw_bytes)
            hero_rel = f"assets/exodus/hero/{jpg_name}"

        pal = sample_palette_via_bmp(web_out)
        if idx in exodus_scene_kinds:
            pal["kind"] = exodus_scene_kinds[idx]

        part_num = 1
        if idx >= 28:
            part_num = 4
        elif idx >= 19:
            part_num = 3
        elif idx >= 11:
            part_num = 2

        exodus_manifest["paintings"].append({
            "n": idx,
            "file": jpg_name,
            "webSrc": f"assets/exodus/web/{jpg_name}",
            "heroSrc": hero_rel,
            "title": item.get("title", ""),
            "ref": item.get("ref", ""),
            "poem": item.get("poem", "").replace("fi ", "fi").replace("o \ufb00 ers", "offers").replace("sta \ufb00 ", "staff"),
            "part": part_num,
            "isScene": idx in exodus_scene_kinds,
            "sceneKind": exodus_scene_kinds.get(idx, None),
            "palette": pal
        })

    with open(os.path.join(OUT_DIR, "data/exodus-manifest.json"), "w") as out_f:
        json.dump(exodus_manifest, out_f, indent=2)

    print("Successfully built exodus-manifest.json with", len(exodus_manifest["paintings"]), "paintings.")

if __name__ == "__main__":
    main()

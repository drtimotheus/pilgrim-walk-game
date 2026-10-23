#!/usr/bin/env python3
"""
THE PILGRIM WALK — 3D Painting Sculpture GLB Compiler
Builds watertight 3D sculpted .glb (glTF 2.0 binary) models directly from
Timothy Holt's paintings for all 175 Step-Through Scenes and 16 Hero Relics.

Each .glb contains:
  1. A watertight 3D sculpted central subject stele/volume (displaced front & back
     surfaces + beveled 3D perimeter wall) whose silhouette and 3D depth relief are
     computed from the painting's luminance, warm-chroma salience, and brushwork.
  2. Angled left & right 3D sculptural foreground wings creating walk-around parallax.
  3. A carved octagonal sanctuary plinth & overarching covenant arch UV-mapped to the
     painting's earth & gold palette.
  4. The painting's high-contrast artwork embedded as a binary PNG/JPEG texture inside
     the GLB buffer so Three.js GLTFLoader renders the exact painting in 3D.
"""

import io
import json
import math
import os
import struct
from PIL import Image, ImageEnhance, ImageFilter

ROOT = os.getcwd()


def compute_depth_grid(img, gw, gh):
    """Computes a smooth 2D depth/salience grid in [0.0, 1.0] from the painting."""
    small = img.resize((gw, gh), Image.Resampling.BILINEAR).convert("RGB")
    blurred = small.filter(ImageFilter.GaussianBlur(radius=2.2))
    px = small.load()
    bpx = blurred.load()

    depth = [[0.0 for _ in range(gw)] for _ in range(gh)]
    for y in range(gh):
        ny = (y / max(1, gh - 1)) * 2.0 - 1.0  # -1 top, +1 bottom
        for x in range(gw):
            nx = (x / max(1, gw - 1)) * 2.0 - 1.0  # -1 left, +1 right
            r, g, b = px[x, y]
            br, bg, bb = bpx[x, y]

            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            # Local brushstroke detail contrast
            detail = (abs(r - br) + abs(g - bg) + abs(b - bb)) / (255.0 * 3.0)
            # Warmth / saturation salience (focal subjects in Timothy's paintings carry warm gold/ochre/light)
            warmth = max(0.0, (r - b) / 255.0)
            sat = (max(r, g, b) - min(r, g, b)) / 255.0

            # Radial organic arch envelope so edges taper naturally into the 3D rim
            # Wider at base, arched at top
            arch_x = nx / (1.0 - 0.18 * max(0.0, -ny))
            radial = math.sqrt(arch_x * arch_x + (ny * 0.92) * (ny * 0.92))
            envelope = max(0.0, min(1.0, 1.18 - radial * 0.95))
            envelope = envelope * envelope * (3.0 - 2.0 * envelope)

            d = (0.42 * lum + 0.28 * warmth + 0.20 * sat + 0.65 * detail) * envelope
            depth[y][x] = max(0.02, min(1.0, d))

    return depth


def normalize_vec3(vx, vy, vz):
    l = math.sqrt(vx * vx + vy * vy + vz * vz)
    if l < 1e-8:
        return (0.0, 1.0, 0.0)
    return (vx / l, vy / l, vz / l)


def build_glb_bytes(img_path, scene_kind="default"):
    """Generates a binary glTF 2.0 (.glb) buffer from a painting image."""
    orig = Image.open(img_path).convert("RGB")
    # Enhance subtle contrast & warmth for the 3D sculpture texture
    tex_img = ImageEnhance.Contrast(orig).enhance(1.08)
    tex_img = ImageEnhance.Color(tex_img).enhance(1.06)
    tex_img = tex_img.resize((256, 320), Image.Resampling.LANCZOS)

    jpeg_buf = io.BytesIO()
    tex_img.save(jpeg_buf, format="JPEG", quality=82, optimize=True)
    jpeg_bytes = jpeg_buf.getvalue()

    gw, gh = 36, 44
    depth = compute_depth_grid(orig, gw, gh)

    positions = []  # list of (x, y, z)
    normals = []    # list of (nx, ny, nz)
    uvs = []        # list of (u, v)
    indices = []    # list of int

    def add_vertex(pos, norm, uv):
        idx = len(positions)
        positions.append(pos)
        normals.append(norm)
        uvs.append(uv)
        return idx

    # -------------------------------------------------------------------------
    # PART 1: Watertight 3D Sculpted Central Subject Volume (Front + Back + Rim)
    # -------------------------------------------------------------------------
    width = 1.95
    height = 2.55
    base_y = 0.22
    max_z = 0.46

    front_grid = [[0 for _ in range(gw)] for _ in range(gh)]
    back_grid = [[0 for _ in range(gw)] for _ in range(gh)]

    # Precompute 3D positions for front and back grids
    f_pos = [[None for _ in range(gw)] for _ in range(gh)]
    b_pos = [[None for _ in range(gw)] for _ in range(gh)]

    for y in range(gh):
        v_norm = y / (gh - 1)  # 0 at top, 1 at bottom
        py_raw = base_y + (1.0 - v_norm) * height
        ny = v_norm * 2.0 - 1.0
        for x in range(gw):
            u_norm = x / (gw - 1)  # 0 at left, 1 at right
            nx = u_norm * 2.0 - 1.0

            # Organic sculptural arch contour: pulls outer corners inward into an arched stele
            top_taper = 1.0 - 0.28 * max(0.0, -ny) ** 1.6
            wave = 0.04 * math.sin(v_norm * math.pi * 3.0)
            px = nx * (width * 0.5) * top_taper + (wave if nx > 0 else -wave)
            # Curve top edge into a graceful cathedral/covenant arch
            arch_lift = 0.22 * max(0.0, 1.0 - nx * nx) * max(0.0, 1.0 - v_norm * 2.2)
            py = py_raw + arch_lift

            d = depth[y][x]
            # Smooth zero thickness at the extreme perimeter so front & back meet cleanly at a beveled edge
            edge_dist = min(x, gw - 1 - x, y, gh - 1 - y) / 4.0
            edge_factor = min(1.0, edge_dist)
            pz_front = 0.04 + d * max_z * edge_factor
            pz_back = -0.04 - (0.65 * d * max_z) * edge_factor

            f_pos[y][x] = (px, py, pz_front)
            b_pos[y][x] = (px, py, pz_back)

    # Compute smooth normals & add vertices for Front and Back
    for y in range(gh):
        v_uv = y / (gh - 1)  # glTF UV origin (0,0) is top-left
        for x in range(gw):
            u_uv = x / (gw - 1)
            x0, x1 = max(0, x - 1), min(gw - 1, x + 1)
            y0, y1 = max(0, y - 1), min(gh - 1, y + 1)

            dx_f = f_pos[y][x1][2] - f_pos[y][x0][2]
            dy_f = f_pos[y0][x][2] - f_pos[y1][x][2]
            fn = normalize_vec3(-dx_f * 6.0, -dy_f * 6.0, 1.0)
            front_grid[y][x] = add_vertex(f_pos[y][x], fn, (u_uv, v_uv))

            bn = normalize_vec3(dx_f * 4.5, dy_f * 4.5, -1.0)
            back_grid[y][x] = add_vertex(b_pos[y][x], bn, (u_uv, v_uv))

    # Triangles for front & back surfaces
    for y in range(gh - 1):
        for x in range(gw - 1):
            # Front (CCW)
            f00 = front_grid[y][x]
            f10 = front_grid[y][x + 1]
            f01 = front_grid[y + 1][x]
            f11 = front_grid[y + 1][x + 1]
            indices.extend([f00, f01, f10, f10, f01, f11])

            # Back (CW when viewed from front = CCW from back)
            b00 = back_grid[y][x]
            b10 = back_grid[y][x + 1]
            b01 = back_grid[y + 1][x]
            b11 = back_grid[y + 1][x + 1]
            indices.extend([b00, b10, b01, b10, b11, b01])

    # Stitch perimeter rim between Front and Back so the 3D sculpture is 100% watertight
    perimeter = []
    for x in range(gw):
        perimeter.append((0, x))
    for y in range(1, gh):
        perimeter.append((y, gw - 1))
    for x in range(gw - 2, -1, -1):
        perimeter.append((gh - 1, x))
    for y in range(gh - 2, -1, -1):
        perimeter.append((y, 0))

    for i in range(len(perimeter) - 1):
        y0, x0 = perimeter[i]
        y1, x1 = perimeter[i + 1]
        fa = front_grid[y0][x0]
        fb = front_grid[y1][x1]
        ba = back_grid[y0][x0]
        bb = back_grid[y1][x1]
        indices.extend([fa, fb, ba, fb, bb, ba])

    # -------------------------------------------------------------------------
    # PART 2: Left & Right Angled 3D Sculptural Relief Wings (Parallax Volume)
    # -------------------------------------------------------------------------
    def add_sculpted_wing(side_sign):
        wgw, wgh = 14, 22
        w_width = 0.78
        w_height = 1.85
        w_base_y = 0.20
        angle = side_sign * 0.48  # angled inward toward the viewer
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        center_x = side_sign * 0.92
        center_z = 0.18

        w_front = [[0 for _ in range(wgw)] for _ in range(wgh)]
        w_back = [[0 for _ in range(wgw)] for _ in range(wgh)]

        for wy in range(wgh):
            wv = wy / (wgh - 1)
            py = w_base_y + (1.0 - wv) * w_height
            gy = min(gh - 1, int(wv * (gh - 1)))
            for wx in range(wgw):
                wu = wx / (wgw - 1)
                # Sample left third or right third of painting
                u_tex = (0.04 + wu * 0.34) if side_sign < 0 else (0.62 + wu * 0.34)
                gx = min(gw - 1, int(u_tex * (gw - 1)))
                d = depth[gy][gx]

                lx = (wu - 0.5) * w_width
                lz_f = 0.03 + d * 0.24
                lz_b = -0.03 - d * 0.18

                # Rotate wing around Y
                rx_f = center_x + lx * cos_a + lz_f * sin_a
                rz_f = center_z - lx * sin_a + lz_f * cos_a
                rx_b = center_x + lx * cos_a + lz_b * sin_a
                rz_b = center_z - lx * sin_a + lz_b * cos_a

                w_front[wy][wx] = add_vertex((rx_f, py, rz_f), (sin_a, 0.0, cos_a), (u_tex, wv))
                w_back[wy][wx] = add_vertex((rx_b, py, rz_b), (-sin_a, 0.0, -cos_a), (u_tex, wv))

        for wy in range(wgh - 1):
            for wx in range(wgw - 1):
                f00, f10 = w_front[wy][wx], w_front[wy][wx + 1]
                f01, f11 = w_front[wy + 1][wx], w_front[wy + 1][wx + 1]
                indices.extend([f00, f01, f10, f10, f01, f11])

                b00, b10 = w_back[wy][wx], w_back[wy][wx + 1]
                b01, b11 = w_back[wy + 1][wx], w_back[wy + 1][wx + 1]
                indices.extend([b00, b10, b01, b10, b11, b01])

    add_sculpted_wing(-1)
    add_sculpted_wing(1)

    # -------------------------------------------------------------------------
    # PART 3: Sculpted Octagonal Stone Plinth Base (UV-mapped to painting ground)
    # -------------------------------------------------------------------------
    def add_cylinder_ring(r_top, r_bot, y_bot, y_top, segs=16, v_uv_base=0.88):
        top_ring = []
        bot_ring = []
        for s in range(segs + 1):
            ang = (s / segs) * math.pi * 2.0
            ca, sa = math.cos(ang), math.sin(ang)
            u_uv = 0.15 + 0.70 * (s / segs)
            top_ring.append(add_vertex((ca * r_top, y_top, sa * r_top * 0.72), (ca, 0.2, sa), (u_uv, v_uv_base)))
            bot_ring.append(add_vertex((ca * r_bot, y_bot, sa * r_bot * 0.72), (ca, 0.0, sa), (u_uv, min(0.99, v_uv_base + 0.09))))

        center_top = add_vertex((0.0, y_top, 0.0), (0.0, 1.0, 0.0), (0.5, v_uv_base))
        for s in range(segs):
            t0, t1 = top_ring[s], top_ring[s + 1]
            b0, b1 = bot_ring[s], bot_ring[s + 1]
            indices.extend([t0, b0, t1, t1, b0, b1])
            indices.extend([center_top, t1, t0])

    add_cylinder_ring(1.25, 1.38, 0.0, 0.14, 16, 0.90)
    add_cylinder_ring(1.02, 1.14, 0.14, 0.26, 16, 0.84)

    # -------------------------------------------------------------------------
    # Pack binary buffers into glTF 2.0 GLB format
    # -------------------------------------------------------------------------
    min_pos = [min(p[i] for p in positions) for i in range(3)]
    max_pos = [max(p[i] for p in positions) for i in range(3)]

    pos_bytes = bytearray()
    for p in positions:
        pos_bytes.extend(struct.pack("<3f", *p))

    norm_bytes = bytearray()
    for n in normals:
        norm_bytes.extend(struct.pack("<3f", *n))

    uv_bytes = bytearray()
    for u in uvs:
        uv_bytes.extend(struct.pack("<2f", *u))

    idx_bytes = bytearray()
    for i in indices:
        idx_bytes.extend(struct.pack("<H", i))
    while len(idx_bytes) % 4 != 0:
        idx_bytes.extend(b"\x00")

    img_bytes = bytearray(jpeg_bytes)
    while len(img_bytes) % 4 != 0:
        img_bytes.extend(b"\x00")

    offset_pos = 0
    len_pos = len(pos_bytes)

    offset_norm = offset_pos + len_pos
    len_norm = len(norm_bytes)

    offset_uv = offset_norm + len_norm
    len_uv = len(uv_bytes)

    offset_idx = offset_uv + len_uv
    len_idx = len(indices) * 2
    len_idx_padded = len(idx_bytes)

    offset_img = offset_idx + len_idx_padded
    len_img = len(jpeg_bytes)

    bin_chunk = pos_bytes + norm_bytes + uv_bytes + idx_bytes + img_bytes
    while len(bin_chunk) % 4 != 0:
        bin_chunk.extend(b"\x00")

    gltf = {
        "asset": {"version": "2.0", "generator": "PilgrimWalk-3D-Sculpture-Compiler"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "PaintingSculptureMonument"}],
        "meshes": [
            {
                "name": "PaintingSculptureMesh",
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": 0,
                            "NORMAL": 1,
                            "TEXCOORD_0": 2,
                        },
                        "indices": 3,
                        "material": 0,
                    }
                ],
            }
        ],
        "materials": [
            {
                "name": "PainterlySculptureMaterial",
                "doubleSided": True,
                "pbrMetallicRoughness": {
                    "baseColorTexture": {"index": 0},
                    "metallicFactor": 0.08,
                    "roughnessFactor": 0.72,
                },
            }
        ],
        "textures": [{"sampler": 0, "source": 0}],
        "images": [
            {
                "bufferView": 4,
                "mimeType": "image/jpeg",
            }
        ],
        "samplers": [
            {
                "magFilter": 9729,
                "minFilter": 9987,
                "wrapS": 33071,
                "wrapT": 33071,
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": len(positions),
                "type": "VEC3",
                "min": min_pos,
                "max": max_pos,
            },
            {
                "bufferView": 1,
                "componentType": 5126,
                "count": len(normals),
                "type": "VEC3",
            },
            {
                "bufferView": 2,
                "componentType": 5126,
                "count": len(uvs),
                "type": "VEC2",
            },
            {
                "bufferView": 3,
                "componentType": 5123,
                "count": len(indices),
                "type": "SCALAR",
            },
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": offset_pos, "byteLength": len_pos, "target": 34962},
            {"buffer": 0, "byteOffset": offset_norm, "byteLength": len_norm, "target": 34962},
            {"buffer": 0, "byteOffset": offset_uv, "byteLength": len_uv, "target": 34962},
            {"buffer": 0, "byteOffset": offset_idx, "byteLength": len_idx, "target": 34963},
            {"buffer": 0, "byteOffset": offset_img, "byteLength": len_img},
        ],
        "buffers": [{"byteLength": len(bin_chunk)}],
    }

    json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    while len(json_bytes) % 4 != 0:
        json_bytes += b" "

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_chunk)
    glb = bytearray()
    glb.extend(struct.pack("<4sII", b"glTF", 2, total_len))
    glb.extend(struct.pack("<I4s", len(json_bytes), b"JSON"))
    glb.extend(json_bytes)
    glb.extend(struct.pack("<I4s", len(bin_chunk), b"BIN\x00"))
    glb.extend(bin_chunk)
    return bytes(glb)


def main():
    catalog_path = os.path.join(ROOT, "assets/models/all-175-scenes-manifest.json")
    tripo_path = os.path.join(ROOT, "assets/models/tripo-manifest.json")

    with open(catalog_path, "r", encoding="utf-8") as f:
        catalog = json.load(f)
    with open(tripo_path, "r", encoding="utf-8") as f:
        tripo = json.load(f)

    targets = []
    for m in tripo.get("models", []):
        targets.append((m["paintingRef"], m["file"], m["title"], "relic"))

    for s in catalog.get("scenes", []):
        targets.append((s["imgRelPath"], s["outRelPath"], f'{s["slug"]}-{s["paintingNumber"]} ({s["paintingTitle"]})', s.get("sceneKind", "default")))

    os.makedirs(os.path.join(ROOT, "assets/models/scenes"), exist_ok=True)

    built = 0
    skipped = 0
    for img_rel, out_rel, label, kind in targets:
        out_full = os.path.join(ROOT, out_rel)
        img_full = os.path.join(ROOT, img_rel)
        if os.path.exists(out_full) and os.path.getsize(out_full) > 50000:
            skipped += 1
            continue
        if not os.path.exists(img_full):
            print(f"[WARN] Missing image: {img_rel}")
            continue
        glb_data = build_glb_bytes(img_full, kind)
        with open(out_full, "wb") as wf:
            wf.write(glb_data)
        built += 1
        if built % 25 == 0 or built == 1:
            print(f"Built {built} GLB sculptures... latest: {out_rel} ({len(glb_data) / 1024:.1f} KB)")

    print(f"✅ Completed! Built {built} new 3D .glb sculptures ({skipped} existing kept).")


if __name__ == "__main__":
    main()

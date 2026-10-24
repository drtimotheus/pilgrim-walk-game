#!/usr/bin/env python3
"""
Builds and Meshopt-compresses Batch 1 Hero Relics (Districts IX–XII, Slots 18–21):
  - Slot 18 (IX · 2 Chronicles): choir-army-trumpet.glb (from b-009-025.jpg)
  - Slot 19 (X · Nehemiah):      trowel-and-sword.glb   (from b-010-029.jpg)
  - Slot 20 (XI · Esther):       golden-scepter.glb     (Muse GLB, Meshopt-compressed)
  - Slot 21 (XII · Job):         ash-heap-potsherd.glb  (from b-012-004.jpg)
"""

import io
import json
import math
import os
import subprocess
import struct
from PIL import Image, ImageDraw, ImageEnhance

ROOT = "/Users/Timotheus/Desktop/Pilgrim Way Art World Game"
GLTFPACK = "/tmp/gltf_tools/node_modules/.bin/gltfpack"


def normalize(vx, vy, vz):
    l = math.sqrt(vx * vx + vy * vy + vz * vz)
    if l < 1e-8:
        return (0.0, 1.0, 0.0)
    return (vx / l, vy / l, vz / l)


def rotate_point(x, y, z, rx=0.0, ry=0.0, rz=0.0):
    if abs(rx) > 1e-6:
        c, s = math.cos(rx), math.sin(rx)
        y, z = y * c - z * s, y * s + z * c
    if abs(rz) > 1e-6:
        c, s = math.cos(rz), math.sin(rz)
        x, y = x * c - y * s, x * s + y * c
    if abs(ry) > 1e-6:
        c, s = math.cos(ry), math.sin(ry)
        x, z = x * c + z * s, -x * s + z * c
    return (x, y, z)


class GlbBuilder:
    def __init__(self, img_path):
        orig = Image.open(os.path.join(ROOT, img_path)).convert("RGB")
        tex = ImageEnhance.Contrast(orig).enhance(1.08)
        tex = ImageEnhance.Color(tex).enhance(1.06)
        self.tex_img = tex.resize((256, 256), Image.Resampling.LANCZOS)
        self.px = self.tex_img.load()
        self.positions = []
        self.normals = []
        self.uvs = []
        self.colors = []
        self.indices = []

    def sample_color(self, u, v, tint=(1.0, 1.0, 1.0), lift=0.0):
        ix = max(0, min(255, int(u * 255)))
        iy = max(0, min(255, int(v * 255)))
        r, g, b = self.px[ix, iy]
        rf = min(1.0, max(0.0, (r / 255.0) * tint[0] + lift))
        gf = min(1.0, max(0.0, (g / 255.0) * tint[1] + lift))
        bf = min(1.0, max(0.0, (b / 255.0) * tint[2] + lift))
        return (rf, gf, bf)

    def add_vertex(self, pos, norm, uv, tint=(1.0, 1.0, 1.0), lift=0.0):
        idx = len(self.positions)
        self.positions.append(pos)
        self.normals.append(normalize(*norm))
        u = max(0.01, min(0.99, uv[0]))
        v = max(0.01, min(0.99, uv[1]))
        self.uvs.append((u, v))
        self.colors.append(self.sample_color(u, v, tint, lift))
        return idx

    def add_lathe(
        self,
        profile,
        cx=0.0,
        cy=0.0,
        cz=0.0,
        rx=0.0,
        ry=0.0,
        rz=0.0,
        segs=24,
        uv_box=(0.15, 0.15, 0.85, 0.85),
        tint=(1.0, 1.0, 1.0),
        lift=0.0,
        wobble_amp=0.0,
    ):
        rings = []
        n_pts = len(profile)
        for p_idx, (rad, py) in enumerate(profile):
            tv = p_idx / max(1, n_pts - 1)
            v_uv = uv_box[1] + (1.0 - tv) * (uv_box[3] - uv_box[1])
            ring = []
            for s in range(segs + 1):
                ang = (s / segs) * math.pi * 2.0
                ca, sa = math.cos(ang), math.sin(ang)
                wob = 1.0 + wobble_amp * math.sin(ang * 5.0 + py * 7.0)
                lx = ca * rad * wob
                ly = py
                lz = sa * rad * wob
                wx, wy, wz = rotate_point(lx, ly, lz, rx, ry, rz)
                nx, ny, nz = rotate_point(ca, 0.18, sa, rx, ry, rz)
                u_uv = uv_box[0] + (s / segs) * (uv_box[2] - uv_box[0])
                ring.append(self.add_vertex((cx + wx, cy + wy, cz + wz), (nx, ny, nz), (u_uv, v_uv), tint, lift))
            rings.append(ring)

        for p_idx in range(n_pts - 1):
            r0, r1 = rings[p_idx], rings[p_idx + 1]
            for s in range(segs):
                self.indices.extend([r0[s], r0[s + 1], r1[s], r0[s + 1], r1[s + 1], r1[s]])

    def add_box(
        self,
        sx,
        sy,
        sz,
        cx=0.0,
        cy=0.0,
        cz=0.0,
        rx=0.0,
        ry=0.0,
        rz=0.0,
        uv_box=(0.2, 0.2, 0.8, 0.8),
        tint=(1.0, 1.0, 1.0),
        lift=0.0,
        bevel=0.03,
    ):
        # Subdivided displaced box for painterly stone/wood/blade forms
        div = 5
        faces = [
            ((0, 0, 1), (1, 0, 0), (0, 1, 0)),
            ((0, 0, -1), (-1, 0, 0), (0, 1, 0)),
            ((1, 0, 0), (0, 0, -1), (0, 1, 0)),
            ((-1, 0, 0), (0, 0, 1), (0, 1, 0)),
            ((0, 1, 0), (1, 0, 0), (0, 0, -1)),
            ((0, -1, 0), (1, 0, 0), (0, 0, 1)),
        ]
        hx, hy, hz = sx * 0.5, sy * 0.5, sz * 0.5
        for fn, fu, fv in faces:
            grid = []
            for iv in range(div + 1):
                row = []
                tv = iv / div
                sv = tv * 2.0 - 1.0
                for iu in range(div + 1):
                    tu = iu / div
                    su = tu * 2.0 - 1.0
                    lx = (fn[0] + fu[0] * su + fv[0] * sv) * hx
                    ly = (fn[1] + fu[1] * su + fv[1] * sv) * hy
                    lz = (fn[2] + fu[2] * su + fv[2] * sv) * hz
                    edge = max(abs(su), abs(sv))
                    if edge > 0.8:
                        shrink = 1.0 - bevel * (edge - 0.8) / 0.2
                        lx *= shrink
                        ly *= shrink
                        lz *= shrink
                    wx, wy, wz = rotate_point(lx, ly, lz, rx, ry, rz)
                    nx, ny, nz = rotate_point(fn[0] + su * 0.15, fn[1] + sv * 0.15, fn[2], rx, ry, rz)
                    u_uv = uv_box[0] + tu * (uv_box[2] - uv_box[0])
                    v_uv = uv_box[1] + (1.0 - tv) * (uv_box[3] - uv_box[1])
                    row.append(self.add_vertex((cx + wx, cy + wy, cz + wz), (nx, ny, nz), (u_uv, v_uv), tint, lift))
                grid.append(row)
            for iv in range(div):
                for iu in range(div):
                    a, b = grid[iv][iu], grid[iv][iu + 1]
                    c, d = grid[iv + 1][iu], grid[iv + 1][iu + 1]
                    self.indices.extend([a, b, c, b, d, c])

    def add_tube(self, curve_pts, radii, segs=14, uv_box=(0.2, 0.2, 0.8, 0.8), tint=(1.0, 1.0, 1.0), lift=0.0):
        rings = []
        n_pts = len(curve_pts)
        for i, (px, py, pz) in enumerate(curve_pts):
            r = radii[i]
            t = i / max(1, n_pts - 1)
            if i < n_pts - 1:
                tx, ty, tz = curve_pts[i + 1][0] - px, curve_pts[i + 1][1] - py, curve_pts[i + 1][2] - pz
            else:
                tx, ty, tz = px - curve_pts[i - 1][0], py - curve_pts[i - 1][1], pz - curve_pts[i - 1][2]
            tx, ty, tz = normalize(tx, ty, tz)
            up = (0.0, 0.0, 1.0) if abs(ty) > 0.9 else (0.0, 1.0, 0.0)
            bx = ty * up[2] - tz * up[1]
            by = tz * up[0] - tx * up[2]
            bz = tx * up[1] - ty * up[0]
            bx, by, bz = normalize(bx, by, bz)
            nx = by * tz - bz * ty
            ny = bz * tx - bx * tz
            nz = bx * ty - by * tx
            v_uv = uv_box[1] + (1.0 - t) * (uv_box[3] - uv_box[1])
            ring = []
            for s in range(segs + 1):
                ang = (s / segs) * math.pi * 2.0
                ca, sa = math.cos(ang), math.sin(ang)
                vx = bx * ca + nx * sa
                vy = by * ca + ny * sa
                vz = bz * ca + nz * sa
                u_uv = uv_box[0] + (s / segs) * (uv_box[2] - uv_box[0])
                ring.append(self.add_vertex((px + vx * r, py + vy * r, pz + vz * r), (vx, vy, vz), (u_uv, v_uv), tint, lift))
            rings.append(ring)
        for i in range(n_pts - 1):
            r0, r1 = rings[i], rings[i + 1]
            for s in range(segs):
                self.indices.extend([r0[s], r0[s + 1], r1[s], r0[s + 1], r1[s + 1], r1[s]])

    def export_glb(self, out_path):
        # Ground exactly at y = 0 and center X/Z
        min_x = min(p[0] for p in self.positions)
        max_x = max(p[0] for p in self.positions)
        min_y = min(p[1] for p in self.positions)
        min_z = min(p[2] for p in self.positions)
        max_z = max(p[2] for p in self.positions)
        cx = 0.5 * (min_x + max_x)
        cz = 0.5 * (min_z + max_z)
        self.positions = [(p[0] - cx, p[1] - min_y, p[2] - cz) for p in self.positions]

        jpeg_buf = io.BytesIO()
        self.tex_img.save(jpeg_buf, format="JPEG", quality=84, optimize=True)
        jpeg_bytes = jpeg_buf.getvalue()

        pos_bin = bytearray()
        norm_bin = bytearray()
        uv_bin = bytearray()
        col_bin = bytearray()
        idx_bin = bytearray()

        min_pos = [1e9, 1e9, 1e9]
        max_pos = [-1e9, -1e9, -1e9]
        for vx, vy, vz in self.positions:
            pos_bin.extend(struct.pack("<fff", vx, vy, vz))
            min_pos = [min(min_pos[0], vx), min(min_pos[1], vy), min(min_pos[2], vz)]
            max_pos = [max(max_pos[0], vx), max(max_pos[1], vy), max(max_pos[2], vz)]

        for nx, ny, nz in self.normals:
            norm_bin.extend(struct.pack("<fff", nx, ny, nz))
        for u, v in self.uvs:
            uv_bin.extend(struct.pack("<ff", u, v))
        for r, g, b in self.colors:
            col_bin.extend(struct.pack("<fff", r, g, b))
        for idx in self.indices:
            idx_bin.extend(struct.pack("<I", idx))

        def pad4(b):
            while len(b) % 4 != 0:
                b.append(0)

        bin_chunk = bytearray()
        off_pos = len(bin_chunk); bin_chunk.extend(pos_bin); pad4(bin_chunk)
        off_norm = len(bin_chunk); bin_chunk.extend(norm_bin); pad4(bin_chunk)
        off_uv = len(bin_chunk); bin_chunk.extend(uv_bin); pad4(bin_chunk)
        off_col = len(bin_chunk); bin_chunk.extend(col_bin); pad4(bin_chunk)
        off_idx = len(bin_chunk); bin_chunk.extend(idx_bin); pad4(bin_chunk)
        off_img = len(bin_chunk); bin_chunk.extend(jpeg_bytes); pad4(bin_chunk)

        v_cnt = len(self.positions)
        i_cnt = len(self.indices)

        gltf = {
            "asset": {"version": "2.0", "generator": "PilgrimWalk-HeroRelicBuilder"},
            "scene": 0,
            "scenes": [{"nodes": [0]}],
            "nodes": [{"name": "HeroRelicMonument", "mesh": 0}],
            "meshes": [
                {
                    "name": "HeroRelicMesh",
                    "primitives": [
                        {
                            "attributes": {"POSITION": 0, "NORMAL": 1, "TEXCOORD_0": 2, "COLOR_0": 3},
                            "indices": 4,
                            "material": 0,
                        }
                    ],
                }
            ],
            "materials": [
                {
                    "name": "PainterlyRelicMaterial",
                    "pbrMetallicRoughness": {
                        "baseColorTexture": {"index": 0},
                        "metallicFactor": 0.12,
                        "roughnessFactor": 0.78,
                    },
                    "doubleSided": True,
                }
            ],
            "textures": [{"sampler": 0, "source": 0}],
            "images": [{"bufferView": 5, "mimeType": "image/jpeg"}],
            "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
            "accessors": [
                {"bufferView": 0, "componentType": 5126, "count": v_cnt, "type": "VEC3", "min": min_pos, "max": max_pos},
                {"bufferView": 1, "componentType": 5126, "count": v_cnt, "type": "VEC3"},
                {"bufferView": 2, "componentType": 5126, "count": v_cnt, "type": "VEC2"},
                {"bufferView": 3, "componentType": 5126, "count": v_cnt, "type": "VEC3"},
                {"bufferView": 4, "componentType": 5125, "count": i_cnt, "type": "SCALAR"},
            ],
            "bufferViews": [
                {"buffer": 0, "byteOffset": off_pos, "byteLength": len(pos_bin), "target": 34962},
                {"buffer": 0, "byteOffset": off_norm, "byteLength": len(norm_bin), "target": 34962},
                {"buffer": 0, "byteOffset": off_uv, "byteLength": len(uv_bin), "target": 34962},
                {"buffer": 0, "byteOffset": off_col, "byteLength": len(col_bin), "target": 34962},
                {"buffer": 0, "byteOffset": off_idx, "byteLength": len(idx_bin), "target": 34963},
                {"buffer": 0, "byteOffset": off_img, "byteLength": len(jpeg_bytes)},
            ],
            "buffers": [{"byteLength": len(bin_chunk)}],
        }

        json_bytes = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
        while len(json_bytes) % 4 != 0:
            json_bytes += b" "

        total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_chunk)
        raw_glb = bytearray()
        raw_glb.extend(struct.pack("<III", 0x46546C67, 2, total_len))
        raw_glb.extend(struct.pack("<II", len(json_bytes), 0x4E4F534A))
        raw_glb.extend(json_bytes)
        raw_glb.extend(struct.pack("<II", len(bin_chunk), 0x004E4942))
        raw_glb.extend(bin_chunk)

        tmp_raw = out_path + ".raw.glb"
        with open(tmp_raw, "wb") as f:
            f.write(raw_glb)

        subprocess.run([GLTFPACK, "-i", tmp_raw, "-o", out_path, "-cc", "-kn"], check=True)
        os.remove(tmp_raw)
        print(f"Built & Meshopt-compressed {out_path} ({os.path.getsize(out_path)/1024:.1f} KB)")


def build_choir_army_trumpet():
    """Slot 18: IX · Our Eyes Are on You — The Choir-Army Trumpet (2 Chr 20:20–22)"""
    b = GlbBuilder("assets/our-eyes-are-on-you/web/b-009-025.jpg")
    # 1. Stepped Judean limestone pedestal base + stone rest block
    b.add_lathe(
        [(0.64, 0.0), (0.60, 0.14), (0.48, 0.20), (0.44, 0.34), (0.02, 0.36)],
        0.0, 0.0, 0.0, segs=20, uv_box=(0.15, 0.65, 0.85, 0.95), tint=(0.95, 0.90, 0.82), wobble_amp=0.03
    )
    b.add_box(0.32, 0.52, 0.28, cx=-0.16, cy=0.52, cz=0.0, rz=-0.18, uv_box=(0.2, 0.6, 0.8, 0.9), tint=(0.92, 0.86, 0.76))

    # 2. Long Silver Temple Trumpet (Chatsotserah) rising at a heroic 58-degree angle
    #    Mouthpiece -> slender silver shaft with 3 golden rings -> wide flared bell
    trumpet_prof = [
        (0.01, 0.0),
        (0.055, 0.02),
        (0.035, 0.08),
        (0.038, 0.55),
        (0.062, 0.58),  # Ring 1
        (0.040, 0.61),
        (0.044, 1.15),
        (0.070, 1.18),  # Ring 2
        (0.048, 1.21),
        (0.056, 1.68),
        (0.082, 1.71),  # Ring 3
        (0.065, 1.75),
        (0.105, 1.98),
        (0.185, 2.18),
        (0.310, 2.34),  # Flared silver bell rim
        (0.285, 2.36),
        (0.080, 2.15),  # Inner bell throat
        (0.010, 1.95),
    ]
    b.add_lathe(
        trumpet_prof,
        cx=-0.52, cy=0.38, cz=0.0,
        rz=-0.56,  # ~58 deg above horizontal so the long trumpet rises across the pedestal
        segs=28,
        uv_box=(0.15, 0.08, 0.85, 0.45),
        tint=(1.08, 1.06, 1.02),
        lift=0.08,
    )

    # 3. Companion second silver trumpet crossed slightly behind & lower (or ceremonial golden cord & tassels)
    #    Let's add the braided golden ceremonial cord & twin hanging tassels from the middle band!
    cord_pts = [
        (-0.52 + math.sin(0.56) * 0.60, 0.38 + math.cos(0.56) * 0.60, 0.04),
        (-0.10, 0.68, 0.10),
        (0.12, 0.62, 0.08),
        (-0.52 + math.sin(0.56) * 1.18, 0.38 + math.cos(0.56) * 1.18, 0.04),
    ]
    b.add_tube(cord_pts, [0.024, 0.028, 0.028, 0.024], segs=12, uv_box=(0.2, 0.1, 0.6, 0.35), tint=(1.12, 0.95, 0.65), lift=0.05)

    # Hanging tassel below the middle band
    tassel_pts = [
        (0.12, 0.62, 0.08),
        (0.14, 0.42, 0.09),
        (0.15, 0.26, 0.09),
    ]
    b.add_tube(tassel_pts, [0.022, 0.045, 0.068], segs=12, uv_box=(0.2, 0.1, 0.6, 0.35), tint=(1.15, 0.95, 0.62), lift=0.06)

    b.export_glb(os.path.join(ROOT, "assets/models/choir-army-trumpet.glb"))


def build_trowel_and_sword():
    """Slot 19: X · Rise Up and Build — The Trowel & the Sword (Nehemiah 4:16–18)"""
    b = GlbBuilder("assets/rise-up-and-build/web/b-010-029.jpg")
    # 1. Two courses of dressed Jerusalem limestone wall stones at base (y = 0)
    b.add_box(1.36, 0.36, 0.84, cx=0.0, cy=0.18, cz=0.0, uv_box=(0.15, 0.45, 0.85, 0.85), tint=(0.98, 0.95, 0.88), bevel=0.06)
    b.add_box(0.64, 0.34, 0.76, cx=-0.32, cy=0.52, cz=0.0, uv_box=(0.20, 0.48, 0.70, 0.82), tint=(1.02, 0.98, 0.90), bevel=0.07)
    b.add_box(0.62, 0.34, 0.76, cx=0.33, cy=0.52, cz=0.0, uv_box=(0.30, 0.50, 0.80, 0.85), tint=(0.94, 0.91, 0.84), bevel=0.07)

    # 2. Prominent Short Sword (gladius/akinakes) angled at +34 deg across the wall stone
    s_ang = 0.56
    # Blade (double-edged tapered steel/bronze blade rising high for clear silhouette)
    b.add_box(0.17, 1.38, 0.042, cx=0.08, cy=1.18, cz=0.06, rz=-s_ang, uv_box=(0.68, 0.45, 0.85, 0.88), tint=(1.05, 1.02, 0.96), lift=0.05, bevel=0.12)
    # Pointed sword tip
    b.add_lathe(
        [(0.09, 0.0), (0.05, 0.14), (0.005, 0.28)],
        cx=0.08 + math.sin(s_ang) * 0.68, cy=1.18 + math.cos(s_ang) * 0.68, cz=0.06,
        rz=-s_ang, segs=4, uv_box=(0.68, 0.45, 0.85, 0.88), tint=(1.08, 1.05, 0.98), lift=0.06
    )
    # Crossguard (wider winged bronze guard)
    b.add_box(0.46, 0.085, 0.11, cx=0.08 - math.sin(s_ang) * 0.68, cy=1.18 - math.cos(s_ang) * 0.68, cz=0.06, rz=-s_ang, uv_box=(0.70, 0.52, 0.85, 0.72), tint=(1.12, 0.95, 0.65), lift=0.04)
    # Wrapped grip & round pommel
    b.add_lathe(
        [(0.052, 0.0), (0.048, 0.32), (0.085, 0.38), (0.085, 0.44), (0.01, 0.47)],
        cx=0.08 - math.sin(s_ang) * 0.70, cy=1.18 - math.cos(s_ang) * 0.70, cz=0.06,
        rz=-s_ang + math.pi, segs=16, uv_box=(0.72, 0.42, 0.84, 0.58), tint=(0.82, 0.75, 0.68)
    )

    # 3. Prominent Builder's Mason Trowel crossed at -36 deg across the sword ("one hand")
    t_ang = -0.60
    # Broad flat diamond/triangular trowel blade
    b.add_box(0.44, 0.72, 0.032, cx=-0.16, cy=1.26, cz=-0.05, rz=-t_ang, uv_box=(0.18, 0.68, 0.34, 0.82), tint=(1.08, 1.06, 1.04), lift=0.08, bevel=0.15)
    # Trowel pointed tip
    b.add_lathe(
        [(0.21, 0.0), (0.11, 0.18), (0.008, 0.36)],
        cx=-0.16 + math.sin(t_ang) * 0.35, cy=1.26 + math.cos(t_ang) * 0.35, cz=-0.05,
        rz=-t_ang, segs=4, uv_box=(0.18, 0.68, 0.34, 0.82), tint=(1.08, 1.06, 1.04), lift=0.08
    )
    # Gooseneck iron tang & turned wooden handle
    tang_pts = [
        (-0.16 - math.sin(t_ang) * 0.36, 1.26 - math.cos(t_ang) * 0.36, -0.05),
        (-0.16 - math.sin(t_ang) * 0.48, 1.26 - math.cos(t_ang) * 0.48, 0.05),
        (-0.16 - math.sin(t_ang) * 0.86, 1.26 - math.cos(t_ang) * 0.86, 0.08),
    ]
    b.add_tube(tang_pts, [0.032, 0.038, 0.062], segs=14, uv_box=(0.14, 0.62, 0.25, 0.72), tint=(0.95, 0.78, 0.58))

    b.export_glb(os.path.join(ROOT, "assets/models/trowel-and-sword.glb"))


def build_ash_heap_potsherd():
    """Slot 21: XII · Out of the Whirlwind — The Ash-Heap Potsherd (Job 2:7–8)"""
    b = GlbBuilder("assets/out-of-the-whirlwind/web/b-012-004.jpg")
    # 1. Grey-and-charcoal ash mound grounded at y = 0 (sampled from bottom ash region of b-012-004.jpg)
    ash_prof = [
        (0.96, 0.0),
        (0.92, 0.10),
        (0.78, 0.24),
        (0.56, 0.36),
        (0.28, 0.44),
        (0.02, 0.46),
    ]
    b.add_lathe(ash_prof, 0.0, 0.0, 0.0, segs=28, uv_box=(0.22, 0.68, 0.78, 0.90), tint=(0.88, 0.86, 0.84), wobble_amp=0.06)

    # 2. Monumental Cracked Clay Pot resting tilted in the ash mound, with a wide jagged breach
    #    We build a 250-degree open broken terracotta storage vessel + the large detached curved potsherd!
    segs = 24
    arc_segs = 17  # leaves a dramatic 105-degree broken gap in the front-right of the great pot!
    pot_prof = [
        (0.02, 0.0),
        (0.32, 0.04),
        (0.58, 0.35),
        (0.68, 0.76),
        (0.62, 1.15),
        (0.44, 1.44),
        (0.36, 1.60),
        (0.45, 1.72),  # Thickened rolled clay rim
        (0.41, 1.76),
        (0.32, 1.58),  # Inner wall thickness
        (0.54, 1.12),
        (0.58, 0.72),
        (0.48, 0.34),
        (0.02, 0.08),
    ]
    rings = []
    n_pts = len(pot_prof)
    rx, ry, rz = 0.22, -0.35, 0.16
    cx, cy, cz = -0.08, 0.30, -0.06
    for p_idx, (rad, py) in enumerate(pot_prof):
        tv = p_idx / max(1, n_pts - 1)
        v_uv = 0.52 + (1.0 - tv) * 0.20
        ring = []
        for s in range(arc_segs + 1):
            ang = 0.55 + (s / arc_segs) * (math.pi * 1.42)
            ca, sa = math.cos(ang), math.sin(ang)
            # Jagged crack edge along s == 0 and s == arc_segs
            crack_jag = 0.0
            if s == 0 or s == arc_segs:
                crack_jag = 0.06 * math.sin(py * 11.0)
            lx = ca * rad
            ly = py + crack_jag
            lz = sa * rad
            wx, wy, wz = rotate_point(lx, ly, lz, rx, ry, rz)
            nx, ny, nz = rotate_point(ca, 0.15, sa, rx, ry, rz)
            u_uv = 0.38 + (s / arc_segs) * 0.26
            ring.append(b.add_vertex((cx + wx, cy + wy, cz + wz), (nx, ny, nz), (u_uv, v_uv), tint=(1.05, 0.98, 0.88)))
        rings.append(ring)
    for p_idx in range(n_pts - 1):
        r0, r1 = rings[p_idx], rings[p_idx + 1]
        for s in range(arc_segs):
            b.indices.extend([r0[s], r0[s + 1], r1[s], r0[s + 1], r1[s + 1], r1[s]])

    # Twin ceramic loop handles on the unbroken sides of the great clay pot
    for side_ang in [1.35, 3.85]:
        h_pts = []
        for step in range(8):
            t = step / 7.0
            r_h = 0.54 + math.sin(t * math.pi) * 0.22
            y_h = 1.05 + t * 0.48
            lx = math.cos(side_ang) * r_h
            lz = math.sin(side_ang) * r_h
            wx, wy, wz = rotate_point(lx, y_h, lz, rx, ry, rz)
            h_pts.append((cx + wx, cy + wy, cz + wz))
        b.add_tube(h_pts, [0.045] * 8, segs=10, uv_box=(0.40, 0.54, 0.62, 0.70), tint=(1.02, 0.95, 0.84))

    # 3. Foreground Broken Potsherd Shard resting in the ash at the front-right (matching b-012-004.jpg)
    sherd_rings = []
    for p_idx, (rad, py) in enumerate([(0.48, 0.0), (0.56, 0.22), (0.52, 0.48), (0.44, 0.68)]):
        row = []
        for s in range(9):
            ang = -0.55 + (s / 8.0) * 1.15
            lx = math.cos(ang) * rad
            ly = py + 0.04 * math.sin(s * 2.3)
            lz = math.sin(ang) * rad
            wx, wy, wz = rotate_point(lx, ly, lz, 0.85, 0.2, -0.3)
            row.append(b.add_vertex((0.28 + wx, 0.22 + wy, 0.34 + wz), (0.2, 0.8, 0.5), (0.40 + s * 0.03, 0.55 + p_idx * 0.04), tint=(1.08, 1.0, 0.88)))
        sherd_rings.append(row)
    for p_idx in range(len(sherd_rings) - 1):
        r0, r1 = sherd_rings[p_idx], sherd_rings[p_idx + 1]
        for s in range(8):
            b.indices.extend([r0[s], r0[s + 1], r1[s], r0[s + 1], r1[s + 1], r1[s]])

    b.export_glb(os.path.join(ROOT, "assets/models/ash-heap-potsherd.glb"))


def install_muse_golden_scepter():
    """Slot 20: XI · For Such a Time as This — The Golden Scepter (Muse GLB, Meshopt-compressed)"""
    src = os.path.join(ROOT, "golden-scepter.glb")
    dst = os.path.join(ROOT, "assets/models/golden-scepter.glb")
    subprocess.run([GLTFPACK, "-i", src, "-o", dst, "-cc", "-kn"], check=True)
    print(f"Installed & Meshopt-compressed Muse {dst} ({os.path.getsize(dst)/1024:.1f} KB)")


if __name__ == "__main__":
    build_choir_army_trumpet()
    build_trowel_and_sword()
    install_muse_golden_scepter()
    build_ash_heap_potsherd()

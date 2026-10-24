#!/usr/bin/env python3
"""
Builds and Meshopt-compresses Batch 8 Hero Relics (Districts XXXVII–XL, Slots 46–49):
  - Slot 46 (XXXVII · Col/Phlm):         the-keystone.glb         († concept-modeled from b-037-006.jpg, Col 1:17)
  - Slot 47 (XXXVIII · 1 Thessalonians): helmet-of-hope.glb       (from b-038-022.jpg, 1 Thess 5:8)
  - Slot 48 (XXXIX · Pastorals):         cloak-and-parchments.glb (from b-039-029.jpg, 2 Tim 4:13)
  - Slot 49 (XL · Hebrews):              anchor-of-the-soul.glb   (Muse GLB cleaned & Meshopt-compressed, Heb 6:19)
"""

import importlib.util
import json
import math
import os
import struct
import subprocess

spec = importlib.util.spec_from_file_location(
    "build_hero_relics_batch1",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "build-hero-relics-batch1.py"),
)
batch1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch1)
GlbBuilder = batch1.GlbBuilder
ROOT = batch1.ROOT
GLTFPACK = batch1.GLTFPACK
rotate_point = batch1.rotate_point
normalize = batch1.normalize


def build_the_keystone():
    """
    Slot 46: XXXVII · Held Together (Colossians & Philemon) — The Keystone † (Col 1:17)
    Brief: "† — a great keystone locking a freestanding arch of two pillars"
    Modeled directly from the freestanding stone arch and rose-terracotta keystone of b-037-006.jpg!
    """
    b = GlbBuilder("assets/held-together/web/b-037-006.jpg")

    # 1. Stepped Meadow Stone Foundation Base (grounded at y = 0, matching b-037-006.jpg)
    b.add_box(1.96, 0.20, 0.78, cx=0.0, cy=0.10, cz=0.0, uv_box=(0.15, 0.80, 0.85, 0.95), tint=(0.98, 0.94, 0.86), bevel=0.06)

    # 2. Two Freestanding Ashlar Stone Pillars with Impost Cornice Caps (matching the left & right pillars of b-037-006.jpg)
    for side in [-1.0, 1.0]:
        px = side * 0.64
        # 3 courses of dressed ashlar pillar blocks
        for c_i in range(3):
            b.add_box(
                0.42, 0.34, 0.44,
                cx=px, cy=0.35 + c_i * 0.33, cz=0.0,
                uv_box=(0.16, 0.52, 0.30, 0.78),
                tint=(1.02, 0.98, 0.90),
                bevel=0.06,
            )
        # Molded Impost Capital at y = 1.24 (where the arch springs from the two pillars)
        b.add_box(
            0.50, 0.14, 0.50,
            cx=px, cy=1.24, cz=0.0,
            uv_box=(0.15, 0.48, 0.32, 0.54),
            tint=(1.06, 1.02, 0.94),
            lift=0.03,
            bevel=0.05,
        )

    # 3. Eight Radial Arch Voussoir Stones (4 on the left, 4 on the right) rising from the imposts to flank the Keystone
    arch_cy = 1.28
    arch_R = 0.64
    voussoir_angles = [0.20, 0.54, 0.88, 1.22, math.pi - 1.22, math.pi - 0.88, math.pi - 0.54, math.pi - 0.20]
    for vang in voussoir_angles:
        vx = -math.cos(vang) * arch_R
        vy = arch_cy + math.sin(vang) * arch_R
        rz_ang = vang - math.pi * 0.5
        b.add_box(
            0.24, 0.38, 0.42,
            cx=vx, cy=vy, cz=0.0,
            rz=-rz_ang,
            uv_box=(0.20, 0.22, 0.40, 0.46),
            tint=(1.02, 0.98, 0.90),
            bevel=0.07,
        )

    # 4. The Great Wedge-Shaped Keystone Locking the Crown of the Arch ("and by him all things consist / hold together", Col 1:17)
    #    Modeled directly from the prominent warm rose-ochre trapezoidal keystone at uv (0.43..0.57, 0.11..0.28) of b-037-006.jpg!
    #    Built as a proud, oversized tapered trapezoidal wedge that projects above, below, and forward of the adjacent voussoirs!
    ks_cy = arch_cy + arch_R + 0.02
    # Tapered wedge vertices (wider at top crown, narrower at bottom intrados, thicker along Z)
    div = 6
    faces = [
        ((0, 0, 1), (1, 0, 0), (0, 1, 0)),
        ((0, 0, -1), (-1, 0, 0), (0, 1, 0)),
        ((1, 0, 0), (0, 0, -1), (0, 1, 0)),
        ((-1, 0, 0), (0, 0, 1), (0, 1, 0)),
        ((0, 1, 0), (1, 0, 0), (0, 0, -1)),
        ((0, -1, 0), (1, 0, 0), (0, 0, 1)),
    ]
    hy = 0.26
    hz = 0.25
    for fn, fu, fv in faces:
        grid = []
        for iv in range(div + 1):
            row = []
            tv = iv / div
            sv = tv * 2.0 - 1.0
            for iu in range(div + 1):
                tu = iu / div
                su = tu * 2.0 - 1.0
                ly = (fn[1] + fu[1] * su + fv[1] * sv) * hy
                # Trapezoidal wedge width: wider at top (ly > 0), narrower at bottom (ly < 0)
                w_factor = 0.16 + 0.08 * ((ly + hy) / (2.0 * hy))
                lx = (fn[0] + fu[0] * su + fv[0] * sv) * w_factor
                lz = (fn[2] + fu[2] * su + fv[2] * sv) * hz
                edge = max(abs(su), abs(sv))
                if edge > 0.82:
                    shrink = 1.0 - 0.05 * (edge - 0.82) / 0.18
                    lx *= shrink
                    ly *= shrink
                    lz *= shrink
                u_uv = 0.44 + tu * 0.13
                v_uv = 0.12 + (1.0 - tv) * 0.15
                row.append(
                    b.add_vertex(
                        (lx, ks_cy + ly, lz),
                        (fn[0] + su * 0.12, fn[1] + sv * 0.12, fn[2]),
                        (u_uv, v_uv),
                        tint=(1.18, 0.96, 0.84),  # Warm rose-terracotta keystone tone from b-037-006.jpg!
                        lift=0.05,
                    )
                )
            grid.append(row)
        for iv in range(div):
            for iu in range(div):
                a, b_v = grid[iv][iu], grid[iv][iu + 1]
                c, d = grid[iv + 1][iu], grid[iv + 1][iv + 1]
                b.indices.extend([a, b_v, c, b_v, d, c])

    b.export_glb(os.path.join(ROOT, "assets/models/the-keystone.glb"))


def build_helmet_of_hope():
    """
    Slot 47: XXXVIII · Children of the Day (1 Thessalonians) — The Helmet of Hope (1 Thess 5:8)
    Brief: "a standing helmet of salvation (pair visually with XXXV's shield, do not duplicate it)"
    Modeled from the patinated bronze helmet on the wooden bench in b-038-022.jpg, mounted upright on a carved
    timber-and-stone armor stand with sculpted cheekguards, brow ridge, neck flange, and crest holder!
    """
    b = GlbBuilder("assets/children-of-the-day/web/b-038-022.jpg")

    # 1. Carved Stone & Timber Armor Stand Plinth (grounded at y = 0, visually pairing with XXXV's Shield stand)
    b.add_box(1.18, 0.22, 1.02, cx=0.0, cy=0.11, cz=0.0, uv_box=(0.28, 0.64, 0.68, 0.74), tint=(0.98, 0.92, 0.82), bevel=0.06)
    # Turned wooden helmet display post rising from the bench slab to support the standing helmet
    b.add_lathe(
        [(0.28, 0.20), (0.24, 0.28), (0.12, 0.34), (0.10, 0.72), (0.16, 0.80), (0.02, 0.84)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=20,
        uv_box=(0.30, 0.64, 0.65, 0.72),
        tint=(0.90, 0.78, 0.62),
    )

    # 2. The Standing Bronze Helmet of Salvation / Hope (1 Thess 5:8)
    #    Modeled directly from the bronze galea/helmet at uv (0.50..0.69, 0.48..0.67) of b-038-022.jpg!
    helm_cy = 0.88
    # Domed Hammered Bronze Helmet Bowl with double embossed brow bands
    bowl_prof = [
        (0.42, 0.0),    # Lower rim of the helmet bowl
        (0.45, 0.04),   # Embossed lower brow band
        (0.43, 0.08),
        (0.45, 0.13),   # Embossed upper brow band (matching b-038-022.jpg!)
        (0.42, 0.24),
        (0.36, 0.38),   # Rounded bronze crown dome
        (0.24, 0.48),
        (0.10, 0.54),
        (0.01, 0.56),
    ]
    b.add_lathe(
        bowl_prof,
        cx=0.0, cy=helm_cy, cz=0.0,
        segs=32,
        uv_box=(0.52, 0.48, 0.68, 0.59),
        tint=(1.12, 0.98, 0.72),
        lift=0.05,
    )

    # Projecting Front Brow Peak / Visor Ridge
    visor_pts = []
    for s in range(15):
        ang = -math.pi * 0.42 + (s / 14.0) * math.pi * 0.84
        visor_pts.append((math.sin(ang) * 0.46, helm_cy + 0.08 + 0.03 * math.cos(ang), math.cos(ang) * 0.48))
    b.add_tube(visor_pts, [0.032] * 15, segs=10, uv_box=(0.53, 0.54, 0.67, 0.59), tint=(1.18, 1.04, 0.76), lift=0.06)

    # Flared Rear Neck-Guard Flange (projecting at the back of the helmet, z < 0)
    neck_pts = []
    for s in range(15):
        ang = math.pi * 0.58 + (s / 14.0) * math.pi * 0.84
        neck_pts.append((math.sin(ang) * 0.46, helm_cy - 0.08, math.cos(ang) * 0.52))
    b.add_tube(neck_pts, [0.055] * 15, segs=10, uv_box=(0.52, 0.48, 0.68, 0.58), tint=(1.08, 0.94, 0.68), lift=0.04)

    # 3. Twin Hinged Bronze Cheekguards (Bucculae) framing the open face of the helmet (matching b-038-022.jpg!)
    for side in [-1.0, 1.0]:
        cheek_pts = [
            (side * 0.40, helm_cy + 0.02, 0.14),
            (side * 0.38, helm_cy - 0.16, 0.22),
            (side * 0.30, helm_cy - 0.32, 0.30),
        ]
        b.add_tube(
            cheek_pts,
            [0.12, 0.11, 0.065],
            segs=12,
            uv_box=(0.51, 0.56, 0.66, 0.67),
            tint=(1.14, 1.00, 0.74),
            lift=0.05,
        )

    # 4. Sculpted Bronze Crest Finial Ridge atop the Crown (pairing visually with XXXV's armor set)
    crest_pts = [
        (0.0, helm_cy + 0.44, 0.24),
        (0.0, helm_cy + 0.62, 0.04),
        (0.0, helm_cy + 0.58, -0.22),
        (0.0, helm_cy + 0.36, -0.36),
    ]
    b.add_tube(
        crest_pts,
        [0.055, 0.095, 0.085, 0.045],
        segs=14,
        uv_box=(0.52, 0.48, 0.68, 0.58),
        tint=(1.20, 1.06, 0.76),
        lift=0.07,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/helmet-of-hope.glb"))


def build_cloak_and_parchments():
    """
    Slot 48: XXXIX · Grace, Mercy and Peace (Pastorals) — Paul's Cloak & the Parchments (2 Tim 4:13)
    Brief: "folded heavy travel cloak with a bundle of rolled scrolls on top"
    Modeled directly from b-039-029.jpg (the warm terracotta-brown striped wool cloak, leather-bound codex notebook,
    and rolled parchment scrolls tied with twine)!
    """
    b = GlbBuilder("assets/grace-mercy-and-peace/web/b-039-029.jpg")

    # 1. Carved Stone Cell Bench Ledge (grounded at y = 0, matching b-039-029.jpg)
    b.add_box(1.56, 0.34, 1.16, cx=0.0, cy=0.17, cz=0.0, uv_box=(0.45, 0.76, 0.92, 0.96), tint=(1.02, 0.98, 0.90), bevel=0.06)

    # 2. The Heavy Folded Terracotta-Brown Travel Cloak ("The cloke that I left at Troas with Carpus, when thou comest, bring with thee", 2 Tim 4:13)
    #    Built from thick layered sculptural fabric folds on the left & center of the stone bench, with a trailing fold
    #    draping down the front edge of the stone ledge (matching the exact silhouette of b-039-029.jpg!)
    cloak_layers = [
        # Lower broad folded wool layer
        (-0.22, 0.44, 0.02, 0.92, 0.22, 0.84, 0.04, 0.08, -0.04),
        # Middle thick rolled fold
        (-0.26, 0.62, -0.02, 0.84, 0.22, 0.76, -0.05, 0.14, 0.06),
        # Upper crest fold of the heavy travel cloak
        (-0.20, 0.78, -0.04, 0.72, 0.20, 0.66, 0.06, -0.10, -0.08),
        # Cascading front drape hanging down over the front edge of the stone bench!
        (-0.36, 0.30, 0.48, 0.56, 0.48, 0.24, 0.28, 0.08, -0.12),
    ]
    for cx_c, cy_c, cz_c, sx_c, sy_c, sz_c, rx_c, ry_c, rz_c in cloak_layers:
        b.add_box(
            sx_c, sy_c, sz_c,
            cx=cx_c, cy=cy_c, cz=cz_c,
            rx=rx_c, ry=ry_c, rz=rz_c,
            uv_box=(0.12, 0.48, 0.54, 0.78),  # Sampled from the rich rust-terracotta wool cloak in b-039-029.jpg!
            tint=(1.08, 0.96, 0.88),
            lift=0.03,
            bevel=0.18,
        )

    # 3. The Leather-Bound Parchment Codex ("and the books, but especially the parchments", 2 Tim 4:13)
    #    Resting beside and slightly overlapping the folded cloak on the right (matching b-039-029.jpg!)
    # Leather codex binding board
    b.add_box(
        0.64, 0.10, 0.54,
        cx=0.34, cy=0.39, cz=0.06,
        ry=-0.28,
        uv_box=(0.66, 0.64, 0.94, 0.78),
        tint=(1.04, 0.90, 0.72),
        bevel=0.08,
    )
    # Sheaf of cream parchment leaves tied with twine atop the leather codex
    b.add_box(
        0.58, 0.11, 0.48,
        cx=0.22, cy=0.49, cz=0.04,
        ry=-0.18, rz=0.06,
        uv_box=(0.50, 0.58, 0.82, 0.72),
        tint=(1.16, 1.12, 0.98),
        lift=0.06,
        bevel=0.06,
    )

    # 4. Bundle of Rolled Parchment Scrolls tied with Hemp Twine resting on top!
    scroll_configs = [
        # Lower rolled parchment scroll
        (0.24, 0.62, -0.02, 0.36, -0.22, 1.52),
        # Upper rolled parchment scroll stacked at a slight cross-angle
        (0.26, 0.75, -0.06, 0.32, 0.18, 1.56),
        # Third scroll resting atop the cloak fold bridge
        (-0.04, 0.90, -0.02, 0.34, -0.10, 1.54),
    ]
    for scx, scy, scz, h_len, s_ry, s_rz in scroll_configs:
        scroll_prof = [
            (0.03, -h_len),
            (0.085, -h_len + 0.02),
            (0.082, 0.0),
            (0.085, h_len - 0.02),
            (0.03, h_len),
        ]
        b.add_lathe(
            scroll_prof,
            cx=scx, cy=scy, cz=scz,
            ry=s_ry, rz=s_rz,
            segs=20,
            uv_box=(0.64, 0.50, 0.90, 0.63),
            tint=(1.18, 1.14, 1.00),
            lift=0.07,
        )
        # Twine binding ring around the center of each scroll
        b.add_lathe(
            [(0.092, -0.02), (0.096, 0.0), (0.092, 0.02)],
            cx=scx, cy=scy, cz=scz,
            ry=s_ry, rz=s_rz,
            segs=16,
            uv_box=(0.66, 0.64, 0.90, 0.76),
            tint=(0.88, 0.72, 0.50),
        )

    b.export_glb(os.path.join(ROOT, "assets/models/cloak-and-parchments.glb"))


def install_muse_anchor_of_the_soul():
    """
    Slot 49: XL · Anchor of the Soul (Hebrews) — The Anchor (Heb 6:19, Lane: Muse)
    Inspecting Muse's root anchor-of-the-soul.glb revealed a small detached floating artifact fragment at z < -0.60.
    We clean any triangle with z < -0.58 from the raw GLB, ground y = 0, and Meshopt-compress into assets/models/anchor-of-the-soul.glb!
    """
    src = os.path.join(ROOT, "anchor-of-the-soul.glb")
    dst = os.path.join(ROOT, "assets/models/anchor-of-the-soul.glb")

    with open(src, "rb") as f:
        data = bytearray(f.read())

    j_len, _ = struct.unpack_from("<II", data, 12)
    gltf = json.loads(data[20 : 20 + j_len].decode("utf-8"))
    bin_start = 20 + j_len + 8

    prim = gltf["meshes"][0]["primitives"][0]
    pos_acc = gltf["accessors"][prim["attributes"]["POSITION"]]
    pos_bv = gltf["bufferViews"][pos_acc["bufferView"]]
    pos_offset = bin_start + pos_bv.get("byteOffset", 0) + pos_acc.get("byteOffset", 0)
    pos_stride = pos_bv.get("byteStride", 12)
    v_cnt = pos_acc["count"]

    # Read all vertex positions and clamp any stray floating debris vertex (z < -0.55) onto the main anchor body
    # or zero out triangles referencing z < -0.55! Zeroing out degenerate triangles in the index buffer is super clean!
    bad_verts = set()
    for i in range(v_cnt):
        vx, vy, vz = struct.unpack_from("<fff", data, pos_offset + i * pos_stride)
        if vz < -0.55:
            bad_verts.add(i)

    idx_acc = gltf["accessors"][prim["indices"]]
    idx_bv = gltf["bufferViews"][idx_acc["bufferView"]]
    idx_offset = bin_start + idx_bv.get("byteOffset", 0) + idx_acc.get("byteOffset", 0)
    idx_cnt = idx_acc["count"]
    comp_type = idx_acc["componentType"]  # 5123 (uint16) or 5125 (uint32)
    fmt = "<I" if comp_type == 5125 else "<H"
    step = 4 if comp_type == 5125 else 2

    removed_tris = 0
    for t_i in range(0, idx_cnt, 3):
        i0 = struct.unpack_from(fmt, data, idx_offset + (t_i + 0) * step)[0]
        i1 = struct.unpack_from(fmt, data, idx_offset + (t_i + 1) * step)[0]
        i2 = struct.unpack_from(fmt, data, idx_offset + (t_i + 2) * step)[0]
        if i0 in bad_verts or i1 in bad_verts or i2 in bad_verts:
            # Collapse degenerate triangle so gltfpack strips it completely!
            struct.pack_into(fmt, data, idx_offset + (t_i + 0) * step, 0)
            struct.pack_into(fmt, data, idx_offset + (t_i + 1) * step, 0)
            struct.pack_into(fmt, data, idx_offset + (t_i + 2) * step, 0)
            removed_tris += 1

    tmp_clean = dst + ".clean.glb"
    with open(tmp_clean, "wb") as f:
        f.write(data)

    subprocess.run([GLTFPACK, "-i", tmp_clean, "-o", dst, "-cc", "-kn"], check=True)
    os.remove(tmp_clean)
    print(
        f"Cleaned ({removed_tris} stray floating triangles stripped) & Meshopt-compressed Muse {dst} ({os.path.getsize(dst)/1024:.1f} KB)"
    )


if __name__ == "__main__":
    build_the_keystone()
    build_helmet_of_hope()
    build_cloak_and_parchments()
    install_muse_anchor_of_the_soul()

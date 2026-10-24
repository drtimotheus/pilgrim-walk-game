#!/usr/bin/env python3
"""
Builds and Meshopt-compresses Batch 6 Hero Relics (Districts XXIX–XXXII, Slots 38–41):
  - Slot 38 (XXIX · Matthew): bethlehem-star.glb    (from b-029-004.jpg, Mt 2:9)
  - Slot 39 (XXX · Mark):     galilee-boat.glb      (from b-030-011.jpg, Mk 4:38)
  - Slot 40 (XXXI · John):    rolled-away-stone.glb (from b-031-036.jpg, John 20:1)
  - Slot 41 (XXXII · Acts):   pentecost-flame.glb   (from b-032-005.jpg, Acts 2:3)
"""

import importlib.util
import math
import os

spec = importlib.util.spec_from_file_location(
    "build_hero_relics_batch1",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "build-hero-relics-batch1.py"),
)
batch1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch1)
GlbBuilder = batch1.GlbBuilder
ROOT = batch1.ROOT
rotate_point = batch1.rotate_point
normalize = batch1.normalize


def build_bethlehem_star():
    """Slot 38: XXIX · I Am With You Always (Matthew) — The Bethlehem Star (Mt 2:9)"""
    b = GlbBuilder("assets/i-am-with-you-always/web/b-029-004.jpg")

    # 1. Stepped Bethlehem Limestone & Bronze Astrolabe Stand Base (grounded at y = 0)
    b.add_lathe(
        [(0.68, 0.0), (0.64, 0.14), (0.50, 0.24), (0.42, 0.34), (0.14, 0.38)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=24,
        uv_box=(0.45, 0.62, 0.85, 0.90),
        tint=(0.98, 0.92, 0.80),
        wobble_amp=0.02,
    )

    # Tall Wrought-Bronze Sanctuary Stand Shaft with Turned Rings & Cradle Arc
    stand_prof = [
        (0.11, 0.36),
        (0.065, 0.55),
        (0.095, 0.82),  # Lower collar ring
        (0.058, 0.86),
        (0.052, 1.32),
        (0.088, 1.36),  # Upper collar ring
        (0.048, 1.40),
        (0.038, 1.68),  # Ascending golden light ray / shaft supporting the star
        (0.015, 1.88),
    ]
    b.add_lathe(
        stand_prof,
        cx=0.0, cy=0.0, cz=0.0,
        segs=24,
        uv_box=(0.46, 0.45, 0.62, 0.72),
        tint=(1.15, 0.98, 0.66),
        lift=0.06,
    )

    # Crescent astrolabe cradle beneath the star
    cradle_pts = []
    for s in range(19):
        ang = -math.pi * 0.78 + (s / 18.0) * math.pi * 0.56
        cradle_pts.append((math.cos(ang) * 0.48, 1.92 + math.sin(ang) * 0.48, 0.0))
    b.add_tube(cradle_pts, [0.028] * 19, segs=12, uv_box=(0.46, 0.45, 0.62, 0.72), tint=(1.18, 1.00, 0.68), lift=0.06)

    # 2. The Radiant Eight-Point Bethlehem Star at y = 1.94 (matching the star at uv (0.49..0.54, 0.37..0.44) of b-029-004.jpg!)
    star_cy = 1.94
    # Centralfaceted golden-white nucleus
    b.add_lathe(
        [(0.01, -0.18), (0.14, -0.09), (0.19, 0.0), (0.14, 0.09), (0.01, 0.18)],
        cx=0.0, cy=star_cy, cz=0.0,
        segs=16,
        uv_box=(0.49, 0.38, 0.54, 0.43),
        tint=(1.35, 1.28, 1.02),
        lift=0.18,
    )

    # Eight sculpted 4-sided diamond star rays (4 long cardinal rays + 4 diagonal rays)
    for ray_i in range(8):
        ang = ray_i * (math.pi * 0.25)
        is_cardinal = (ray_i % 2 == 0)
        # In b-029-004.jpg, the vertical lower/upper rays are longest, horizontal rays wide, diagonal rays crisp
        if ray_i == 0 or ray_i == 4:
            ray_len = 0.88 if ray_i == 0 else 0.96
            ray_w = 0.145
        elif is_cardinal:
            ray_len = 0.78
            ray_w = 0.135
        else:
            ray_len = 0.52
            ray_w = 0.105

        b.add_lathe(
            [(ray_w, 0.0), (ray_w * 0.55, ray_len * 0.42), (0.006, ray_len)],
            cx=0.0, cy=star_cy, cz=0.0,
            rz=ang,
            segs=4,  # Crisp 4-faceted diamond star ray cross-section!
            uv_box=(0.48, 0.36, 0.55, 0.45),
            tint=(1.32, 1.22, 0.92),
            lift=0.15,
        )

    # Four subtle transverse 3D rays along +Z/-Z so the star reads in full 3D from side profiles too!
    for z_dir in [-1.0, 1.0]:
        b.add_lathe(
            [(0.11, 0.0), (0.055, 0.24), (0.005, 0.48)],
            cx=0.0, cy=star_cy, cz=0.0,
            rx=z_dir * (math.pi * 0.5),
            segs=4,
            uv_box=(0.48, 0.36, 0.55, 0.45),
            tint=(1.30, 1.20, 0.90),
            lift=0.14,
        )

    b.export_glb(os.path.join(ROOT, "assets/models/bethlehem-star.glb"))


def build_galilee_boat():
    """Slot 39: XXX · Peace Be Still (Mark) — The Galilee Boat with the Cushion in Its Stern (Mk 4:38)"""
    b = GlbBuilder("assets/peace-be-still/web/b-030-011.jpg")

    # 1. Stilled Sea of Galilee Water Base & Timber Keel Supports (grounded at y = 0)
    b.add_box(1.96, 0.14, 1.06, cx=0.0, cy=0.07, cz=0.0, uv_box=(0.25, 0.80, 0.85, 0.94), tint=(0.86, 0.92, 0.88), bevel=0.08)

    # 2. The Wooden Sea of Galilee Fishing Boat Hull (double-ended carvel planked hull with curved ribs, rising prow & sternpost)
    n_x = 24
    n_v = 15
    hull_len = 2.28
    # Outer hull surface + inner hull planking thickness
    for shell_sign, y_shift, w_scale in [(1.0, 0.0, 1.0), (-1.0, 0.05, 0.91)]:
        grid = []
        for ix in range(n_x + 1):
            tx = ix / n_x
            sx = tx * 2.0 - 1.0  # -1.0 (stern) to +1.0 (prow)
            px = sx * (hull_len * 0.5)
            # Beam narrows to pointed bow & stern posts
            beam = 0.62 * max(0.03, math.cos(sx * math.pi * 0.485) ** 0.72) * w_scale
            # Sheerline curves higher at stern & prow
            sheer_y = 0.68 + 0.32 * (sx ** 2)
            keel_y = 0.14 + 0.10 * (sx ** 2)
            row = []
            for iv in range(n_v + 1):
                tv = iv / n_v
                ang = (tv - 0.5) * math.pi  # -pi/2 (port gunwale) -> 0 (keel) -> +pi/2 (starboard gunwale)
                pz = math.sin(ang) * beam
                py = keel_y + (1.0 - math.cos(ang)) * (sheer_y - keel_y) + y_shift
                nx, ny, nz = normalize(-sx * 0.25 * shell_sign, -math.cos(ang) * shell_sign, math.sin(ang) * shell_sign)
                u_uv = 0.18 + tx * 0.68
                v_uv = 0.38 + abs(tv - 0.5) * 0.32
                row.append(b.add_vertex((px, py, pz), (nx, ny, nz), (u_uv, v_uv), tint=(0.98, 0.86, 0.70)))
            grid.append(row)
        for ix in range(n_x):
            for iv in range(n_v):
                a, b_v = grid[ix][iv], grid[ix][iv + 1]
                c, d = grid[ix + 1][iv], grid[ix + 1][iv + 1]
                if shell_sign > 0:
                    b.indices.extend([a, b_v, c, b_v, d, c])
                else:
                    b.indices.extend([a, c, b_v, b_v, c, d])

    # Gunwale cap rails & curved wooden ribs inside the hull
    for side in [-1.0, 1.0]:
        rail_pts = []
        for ix in range(17):
            tx = ix / 16.0
            sx = tx * 2.0 - 1.0
            px = sx * (hull_len * 0.5)
            beam = 0.60 * max(0.04, math.cos(sx * math.pi * 0.485) ** 0.72)
            sheer_y = 0.70 + 0.32 * (sx ** 2)
            rail_pts.append((px, sheer_y, side * beam))
        b.add_tube(rail_pts, [0.038] * 17, segs=10, uv_box=(0.25, 0.40, 0.75, 0.52), tint=(1.02, 0.88, 0.72))

    # High curved sternpost & mooring post (matching the right sternpost with coiled rope in b-030-011.jpg!)
    b.add_tube(
        [(-1.02, 0.28, 0.0), (-1.12, 0.78, 0.0), (-1.08, 1.24, 0.0)],
        [0.065, 0.062, 0.058],
        segs=14,
        uv_box=(0.82, 0.30, 0.92, 0.55),
        tint=(0.94, 0.80, 0.64),
    )
    b.add_tube(
        [(1.02, 0.28, 0.0), (1.14, 0.82, 0.0), (1.18, 1.18, 0.0)],
        [0.062, 0.058, 0.050],
        segs=14,
        uv_box=(0.82, 0.30, 0.92, 0.55),
        tint=(0.94, 0.80, 0.64),
    )

    # Rowing thwarts (benches) and the wider Stern Deck Bench where the Cushion rests
    b.add_box(0.54, 0.06, 0.98, cx=-0.58, cy=0.52, cz=0.0, uv_box=(0.15, 0.68, 0.78, 0.82), tint=(0.96, 0.84, 0.68), bevel=0.06)
    b.add_box(0.30, 0.06, 1.08, cx=0.18, cy=0.50, cz=0.0, uv_box=(0.15, 0.68, 0.78, 0.82), tint=(0.94, 0.82, 0.66), bevel=0.06)

    # 3. The Woven Leather/Wool Cushion in the Stern ("And he was in the hinder part of the ship, asleep on a pillow", Mk 4:38)
    #    Modeled directly from the prominent cushion in the stern of b-030-011.jpg (uv 0.28..0.74, 0.54..0.76)!
    b.add_box(
        0.52, 0.19, 0.58,
        cx=-0.56, cy=0.63, cz=0.0,
        rx=0.04, ry=0.12, rz=-0.05,
        uv_box=(0.28, 0.54, 0.74, 0.76),
        tint=(1.10, 0.98, 0.82),
        lift=0.05,
        bevel=0.18,
    )

    # Coiled mooring rope & draped fishing net at the sternpost (matching b-030-011.jpg)
    for r_y in [0.96, 1.03, 1.10]:
        rope_pts = []
        for s in range(15):
            ang = (s / 14.0) * math.pi * 2.0
            rope_pts.append((-1.09 + math.cos(ang) * 0.095, r_y, math.sin(ang) * 0.095))
        b.add_tube(rope_pts, [0.025] * 15, segs=8, uv_box=(0.80, 0.35, 0.92, 0.45), tint=(1.08, 0.96, 0.76))

    b.export_glb(os.path.join(ROOT, "assets/models/galilee-boat.glb"))


def build_rolled_away_stone():
    """Slot 40: XXXI · Come and See (John) — The Rolled-Away Stone beside the Dark Tomb Mouth (John 20:1)"""
    b = GlbBuilder("assets/come-and-see/web/b-031-036.jpg")

    # 1. Garden Tomb Threshold & Stone Rolling Track Channel (grounded at y = 0, matching b-031-036.jpg)
    b.add_box(1.86, 0.22, 1.24, cx=0.0, cy=0.11, cz=0.0, uv_box=(0.45, 0.82, 0.88, 0.96), tint=(0.98, 0.94, 0.86), bevel=0.06)

    # 2. The Rock-Hewn Tomb Façade & Dark Open Tomb Mouth on the Right (matching b-031-036.jpg!)
    #    Built as a craggy limestone hillside portal framing the dark rectangular tomb entrance with the folded linen inside
    # Left Tomb Jamb
    b.add_box(0.38, 1.48, 0.68, cx=-0.04, cy=0.88, cz=-0.12, uv_box=(0.68, 0.58, 0.76, 0.82), tint=(1.04, 0.98, 0.88), bevel=0.08)
    # Right Tomb Jamb & Crag
    b.add_box(0.46, 1.56, 0.74, cx=0.74, cy=0.92, cz=-0.12, uv_box=(0.86, 0.55, 0.98, 0.85), tint=(0.96, 0.92, 0.84), bevel=0.08)
    # Heavy Rock-Hewn Overhang Roof Crown above the Tomb Mouth
    b.add_box(1.38, 0.46, 0.82, cx=0.34, cy=1.68, cz=-0.10, rz=-0.06, uv_box=(0.65, 0.42, 0.96, 0.58), tint=(0.98, 0.94, 0.86), bevel=0.12)

    # Deep Dark Tomb Chamber Back Wall & Stone Burial Bench with Folded White Linen Cloths (John 20:5–7)
    b.add_box(0.56, 1.22, 0.14, cx=0.34, cy=0.82, cz=-0.38, uv_box=(0.74, 0.60, 0.88, 0.76), tint=(0.55, 0.52, 0.48), bevel=0.04)
    # Burial slab & white linen burial cloths inside the open tomb mouth (exact match to b-031-036.jpg!)
    b.add_box(0.46, 0.22, 0.34, cx=0.36, cy=0.32, cz=-0.24, uv_box=(0.74, 0.76, 0.88, 0.84), tint=(0.94, 0.90, 0.82), bevel=0.06)
    b.add_box(0.34, 0.12, 0.26, cx=0.36, cy=0.46, cz=-0.22, uv_box=(0.78, 0.74, 0.87, 0.81), tint=(1.22, 1.18, 1.08), lift=0.10, bevel=0.12)

    # 3. The Great Round Rolling Tomb Stone (Golal) resting rolled-away to the left of the open tomb doorway!
    #    Modeled directly from the monumental circular stone disk at uv (0.47..0.69, 0.56..0.84) of b-031-036.jpg!
    wheel_prof = [
        (0.02, -0.18),
        (0.56, -0.17),
        (0.66, -0.11),
        (0.68, 0.0),    # Thick chiseled rim of the great rolling stone
        (0.66, 0.11),
        (0.56, 0.17),
        (0.02, 0.18),
    ]
    b.add_lathe(
        wheel_prof,
        cx=-0.42, cy=0.86, cz=0.14,
        rx=1.52, ry=0.22, rz=0.05,  # Upright circular stone disk facing the viewer at a slight natural angle
        segs=36,
        uv_box=(0.47, 0.56, 0.69, 0.84),
        tint=(1.08, 1.02, 0.92),
        lift=0.04,
        wobble_amp=0.032,
    )

    # Chock stone wedged at the base of the great rolled-away stone (matching the foreground stone at bottom-center of b-031-036.jpg)
    b.add_box(0.44, 0.22, 0.34, cx=-0.32, cy=0.26, cz=0.34, ry=0.25, uv_box=(0.42, 0.80, 0.58, 0.88), tint=(1.00, 0.95, 0.86), bevel=0.14)

    b.export_glb(os.path.join(ROOT, "assets/models/rolled-away-stone.glb"))


def build_pentecost_flame():
    """Slot 41: XXXII · To the Ends of the Earth (Acts) — The Pentecost Flame on a Stone Base (Acts 2:3)"""
    b = GlbBuilder("assets/to-the-ends-of-the-earth/web/b-032-005.jpg")

    # 1. Carved Jerusalem Upper-Room Stone Pedestal & Pinched-Spout Terracotta Lamp Base (grounded at y = 0, matching b-032-005.jpg)
    b.add_lathe(
        [(0.72, 0.0), (0.68, 0.14), (0.54, 0.26), (0.48, 0.38), (0.02, 0.40)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=24,
        uv_box=(0.15, 0.72, 0.65, 0.95),
        tint=(0.98, 0.88, 0.72),
        wobble_amp=0.03,
    )

    # Sculpted Herodian terracotta oil lamp vessel basin crowning the stone pedestal (echoing the foreground lamp of b-032-005.jpg)
    lamp_prof = [
        (0.02, 0.36),
        (0.32, 0.40),
        (0.48, 0.52),
        (0.52, 0.64),
        (0.44, 0.74),
        (0.28, 0.72),
        (0.02, 0.66),
    ]
    b.add_lathe(
        lamp_prof,
        cx=0.0, cy=0.0, cz=0.0,
        segs=28,
        uv_box=(0.24, 0.62, 0.52, 0.75),
        tint=(1.08, 0.94, 0.74),
        lift=0.04,
    )

    # 2. The Monumental Sculpted Tongue of Cloven Fire ("And there appeared unto them cloven tongues like as of fire", Acts 2:3)
    #    A tall, dynamic swirling primary tongue of fire rising to y = 2.42, accompanied by a secondary cloven flame tongue
    #    curving beside it — sampled directly from the radiant golden-amber flame pixels of b-032-005.jpg!
    main_flame_pts = []
    main_flame_radii = []
    n_f = 26
    for i in range(n_f):
        t = i / (n_f - 1)
        # Graceful ascending spiral S-curve of a living tongue of fire
        fx = 0.11 * math.sin(t * math.pi * 1.65)
        fy = 0.66 + t * 1.76
        fz = 0.07 * math.cos(t * math.pi * 1.35)
        main_flame_pts.append((fx, fy, fz))
        # Swells smoothly from the altar/lamp bowl to a wide belly, then tapers to a sharp flickering tip
        if t < 0.28:
            rad = 0.16 + (t / 0.28) * 0.18
        else:
            u = (t - 0.28) / 0.72
            rad = 0.34 * ((1.0 - u) ** 1.25) + 0.008
        main_flame_radii.append(rad)

    b.add_tube(
        main_flame_pts,
        main_flame_radii,
        segs=24,
        uv_box=(0.27, 0.60, 0.31, 0.67),  # Sampled from the bright golden flame in b-032-005.jpg
        tint=(1.35, 1.16, 0.76),
        lift=0.14,
    )

    # Secondary Cloven Flame Tongue ("cloven tongues like as of fire") branching upward on the left
    cloven_pts = []
    cloven_radii = []
    for i in range(18):
        t = i / 17.0
        cx_f = -0.10 - 0.18 * math.sin(t * math.pi * 0.85) + 0.06 * (t ** 2)
        cy_f = 0.76 + t * 1.18
        cz_f = 0.04 * math.sin(t * math.pi)
        cloven_pts.append((cx_f, cy_f, cz_f))
        rad = 0.19 * math.sin(t * math.pi * 0.85 + 0.25) * (1.0 - 0.65 * t) + 0.008
        cloven_radii.append(max(0.008, rad))

    b.add_tube(
        cloven_pts,
        cloven_radii,
        segs=18,
        uv_box=(0.27, 0.60, 0.31, 0.67),
        tint=(1.32, 1.08, 0.68),
        lift=0.12,
    )

    # Third smaller warm ember-crest lick on the right for rich 360-degree sculptural silhouette
    right_pts = []
    right_radii = []
    for i in range(15):
        t = i / 14.0
        rx_f = 0.12 + 0.16 * math.sin(t * math.pi * 0.82)
        ry_f = 0.72 + t * 0.96
        rz_f = -0.04 * math.sin(t * math.pi)
        right_pts.append((rx_f, ry_f, rz_f))
        rad = 0.15 * math.sin(t * math.pi * 0.85 + 0.25) * (1.0 - 0.68 * t) + 0.008
        right_radii.append(max(0.008, rad))

    b.add_tube(
        right_pts,
        right_radii,
        segs=16,
        uv_box=(0.27, 0.60, 0.31, 0.67),
        tint=(1.30, 1.04, 0.64),
        lift=0.10,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/pentecost-flame.glb"))


if __name__ == "__main__":
    build_bethlehem_star()
    build_galilee_boat()
    build_rolled_away_stone()
    build_pentecost_flame()

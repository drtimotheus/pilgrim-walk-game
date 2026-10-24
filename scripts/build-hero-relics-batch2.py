#!/usr/bin/env python3
"""
Builds and Meshopt-compresses Batch 2 Hero Relics (Districts XIII–XVI, Slots 22–25):
  - Slot 22 (XIII · Psalms 1–41):   shepherds-rod-and-staff.glb (from b-013-022.jpg, Ps 23)
  - Slot 23 (XIV · Psalms 42–72):   davids-harp.glb             (from b-014-016.jpg, Ps 57:8)
  - Slot 24 (XV · Psalms 73–106):   sparrows-nest-altar.glb     (from b-015-012.jpg, Ps 84:3)
  - Slot 25 (XVI · Psalms 107–150): praise-cymbals.glb          († concept-modeled from b-016-044.jpg, Ps 150)
"""

import math
import os
import sys

import importlib.util
spec = importlib.util.spec_from_file_location(
    "build_hero_relics_batch1",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "build-hero-relics-batch1.py"),
)
batch1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch1)
GlbBuilder = batch1.GlbBuilder
ROOT = batch1.ROOT
rotate_point = batch1.rotate_point


def build_shepherds_rod_and_staff():
    """Slot 22: XIII · Planted by the Water (Ps 1–41) — The Shepherd's Rod & Staff (Ps 23)"""
    b = GlbBuilder("assets/psalms-1/web/b-013-022.jpg")

    # 1. Weathered Judean valley boulder & stepping stone base (grounded at y = 0)
    boulder_prof = [
        (0.84, 0.0),
        (0.80, 0.14),
        (0.68, 0.34),
        (0.50, 0.50),
        (0.26, 0.58),
        (0.02, 0.60),
    ]
    b.add_lathe(
        boulder_prof,
        cx=0.0, cy=0.0, cz=-0.06,
        segs=24,
        uv_box=(0.15, 0.62, 0.85, 0.94),
        tint=(0.94, 0.90, 0.84),
        wobble_amp=0.06,
    )

    # Folded woven shepherd's wool cloak draped at the front-left of the boulder (echoing b-013-022.jpg)
    b.add_box(
        0.58, 0.18, 0.42,
        cx=-0.28, cy=0.22, cz=0.32,
        rx=0.18, ry=0.30, rz=-0.12,
        uv_box=(0.12, 0.72, 0.42, 0.92),
        tint=(0.98, 0.92, 0.82),
        bevel=0.14,
    )
    b.add_box(
        0.48, 0.14, 0.36,
        cx=-0.24, cy=0.34, cz=0.28,
        rx=0.14, ry=0.22, rz=-0.08,
        uv_box=(0.14, 0.74, 0.40, 0.90),
        tint=(1.04, 0.96, 0.86),
        bevel=0.14,
    )

    # 2. The Tall Shepherd's Crook-Staff (leaning at +24 deg, rising high to y ~ 2.45 with a bold spiral crook)
    staff_pts = []
    staff_radii = []
    ang_s = 0.40  # ~23 deg tilt
    # Straight shaft from bottom-left to upper-right
    for i in range(12):
        t = i / 11.0
        dist = -0.75 + t * 1.95
        px = -math.sin(ang_s) * dist
        py = 1.05 + math.cos(ang_s) * dist
        pz = 0.05
        staff_pts.append((px, py, pz))
        staff_radii.append(0.036 + 0.006 * (1.0 - t))

    # Iconic curved shepherd's crook spiral at the top of the staff
    top_x, top_y, top_z = staff_pts[-1]
    crook_cx = top_x - math.cos(ang_s) * 0.24
    crook_cy = top_y - math.sin(ang_s) * 0.24
    for i in range(1, 17):
        t = i / 16.0
        theta = -ang_s + t * (math.pi * 1.38)
        r_c = 0.24 * (1.0 - 0.28 * t)
        px = crook_cx + math.cos(theta) * r_c
        py = crook_cy + math.sin(theta) * r_c
        pz = 0.05
        staff_pts.append((px, py, pz))
        staff_radii.append(0.035 * (1.0 - 0.35 * t))

    b.add_tube(
        staff_pts,
        staff_radii,
        segs=16,
        uv_box=(0.35, 0.15, 0.65, 0.65),
        tint=(1.06, 0.92, 0.72),
        lift=0.04,
    )

    # 3. The Heavy Carved Oak Shepherd's Club-Rod (crossed at -32 deg across the staff, with knobbed head & leather wrist loop)
    rod_ang = -0.56
    rod_prof = [
        (0.015, 0.0),
        (0.046, 0.04),   # Butt cap
        (0.038, 0.18),   # Grip
        (0.042, 0.55),
        (0.052, 1.05),   # Thickening oak shaft
        (0.072, 1.45),
        (0.135, 1.66),   # Heavy bulbous club head ("thy rod")
        (0.145, 1.78),
        (0.115, 1.90),
        (0.020, 1.96),
    ]
    b.add_lathe(
        rod_prof,
        cx=-0.46, cy=0.30, cz=0.14,
        rz=-rod_ang,
        segs=20,
        uv_box=(0.40, 0.25, 0.72, 0.72),
        tint=(0.96, 0.80, 0.60),
        lift=0.02,
        wobble_amp=0.03,
    )

    # Leather binding band at the crossing of Rod & Staff
    b.add_lathe(
        [(0.075, -0.05), (0.082, 0.0), (0.075, 0.05)],
        cx=0.0, cy=1.02, cz=0.09,
        rx=1.57,
        segs=16,
        uv_box=(0.25, 0.50, 0.55, 0.75),
        tint=(1.12, 0.94, 0.66),
        lift=0.05,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/shepherds-rod-and-staff.glb"))


def build_davids_harp():
    """Slot 23: XIV · As the Deer (Ps 42–72) — David's Harp (standing kinnor lyre-harp, Ps 57:8)"""
    b = GlbBuilder("assets/psalms-2/web/b-014-016.jpg")

    # 1. Cave-mouth stone base grounded at y = 0 (matching the dawn cave threshold of b-014-016.jpg)
    b.add_lathe(
        [(0.72, 0.0), (0.68, 0.12), (0.56, 0.24), (0.46, 0.30), (0.02, 0.32)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=22,
        uv_box=(0.15, 0.68, 0.85, 0.94),
        tint=(0.90, 0.84, 0.76),
        wobble_amp=0.04,
    )

    # 2. Carved wooden Kinnor Soundbox (cradle-shaped resonator body at the lower half of the lyre)
    #    Built from layered sculpted bevel boxes and curved bottom bowl
    b.add_box(
        0.92, 0.56, 0.24,
        cx=0.0, cy=0.58, cz=0.0,
        uv_box=(0.35, 0.38, 0.68, 0.72),
        tint=(1.08, 0.88, 0.64),
        lift=0.03,
        bevel=0.12,
    )
    # Soundhole rosette ring on front & back of the soundbox
    for sz in [-0.125, 0.125]:
        b.add_lathe(
            [(0.11, 0.0), (0.15, 0.015), (0.15, 0.03), (0.10, 0.035)],
            cx=0.0, cy=0.62, cz=sz,
            rx=1.57,
            segs=20,
            uv_box=(0.42, 0.22, 0.65, 0.45),
            tint=(1.18, 1.02, 0.72),
            lift=0.08,
        )

    # 3. Twin Sweeping Curved Lyre Arms (rising from the soundbox to the top crossbar)
    for side in [-1.0, 1.0]:
        arm_pts = []
        arm_radii = []
        for i in range(16):
            t = i / 15.0
            # Graceful S-curve flare like an ancient Levantine kinnor
            x = side * (0.38 + 0.22 * math.sin(t * math.pi * 0.82) - 0.06 * (t ** 2))
            y = 0.80 + t * 1.28
            z = 0.0
            arm_pts.append((x, y, z))
            arm_radii.append(0.068 * (1.0 - 0.22 * t))
        b.add_tube(
            arm_pts,
            arm_radii,
            segs=16,
            uv_box=(0.36, 0.28, 0.66, 0.66),
            tint=(1.06, 0.86, 0.62),
            lift=0.04,
        )
        # Carved golden finial scroll at the top of each arm
        b.add_lathe(
            [(0.02, 0.0), (0.095, 0.05), (0.095, 0.11), (0.02, 0.15)],
            cx=side * 0.50, cy=2.04, cz=0.0,
            segs=16,
            uv_box=(0.44, 0.15, 0.64, 0.35),
            tint=(1.16, 1.0, 0.70),
            lift=0.08,
        )

    # 4. Top Yoke Crossbar ('ol) with 10 Tuning Pegs
    yoke_pts = [(-0.62, 1.96, 0.0), (-0.25, 1.98, 0.0), (0.25, 1.98, 0.0), (0.62, 1.96, 0.0)]
    b.add_tube(
        yoke_pts,
        [0.048, 0.056, 0.056, 0.048],
        segs=16,
        uv_box=(0.38, 0.25, 0.64, 0.55),
        tint=(1.10, 0.92, 0.66),
        lift=0.05,
    )

    # 5. Ten Radiant Golden Strings ("upon an instrument of ten strings", Ps 92:3 / Ps 57:8)
    #    plus tailpiece bridge on the soundbox
    b.add_box(0.56, 0.06, 0.30, cx=0.0, cy=0.44, cz=0.0, uv_box=(0.4, 0.3, 0.6, 0.5), tint=(1.14, 0.96, 0.68), lift=0.06)
    for s_idx in range(10):
        frac = (s_idx / 9.0) * 2.0 - 1.0
        top_x = frac * 0.38
        bot_x = frac * 0.24
        # Tuning peg atop the yoke
        b.add_box(0.024, 0.13, 0.024, cx=top_x, cy=2.02, cz=0.0, rz=frac * 0.08, uv_box=(0.45, 0.18, 0.60, 0.32), tint=(1.18, 1.04, 0.74), lift=0.08)
        # Golden string from soundbox bridge up to the yoke
        str_pts = [(bot_x, 0.46, 0.0), (0.5 * (bot_x + top_x), 1.22, 0.0), (top_x, 1.97, 0.0)]
        b.add_tube(str_pts, [0.011, 0.011, 0.011], segs=8, uv_box=(0.46, 0.14, 0.58, 0.28), tint=(1.22, 1.10, 0.80), lift=0.12)

    b.export_glb(os.path.join(ROOT, "assets/models/davids-harp.glb"))


def build_sparrows_nest_altar():
    """Slot 24: XV · A Day in Your Courts (Ps 73–106) — The Sparrow's Nest at the Altar (Ps 84:3)"""
    b = GlbBuilder("assets/psalms-3/web/b-015-012.jpg")

    # 1. Carved Jerusalem Temple Altar Ledge with classic horned altar corner (grounded at y = 0)
    #    Lower plinth & ashlar courses
    b.add_box(1.38, 0.28, 1.12, cx=0.0, cy=0.14, cz=0.0, uv_box=(0.15, 0.55, 0.85, 0.90), tint=(0.96, 0.92, 0.84), bevel=0.06)
    b.add_box(1.22, 0.52, 0.98, cx=0.0, cy=0.52, cz=0.0, uv_box=(0.18, 0.45, 0.82, 0.82), tint=(1.0, 0.96, 0.88), bevel=0.06)
    # Molded cornice ledge ("even thine altars, O LORD of hosts")
    b.add_box(1.36, 0.16, 1.10, cx=0.0, cy=0.84, cz=0.0, uv_box=(0.20, 0.35, 0.80, 0.68), tint=(1.04, 1.0, 0.92), lift=0.03, bevel=0.05)

    # Sculpted Altar Horn rising on the left corner of the ledge (giving an unmistakable biblical altar silhouette)
    horn_prof = [
        (0.24, 0.0),
        (0.20, 0.18),
        (0.15, 0.38),
        (0.10, 0.56),
        (0.03, 0.64),
    ]
    b.add_lathe(
        horn_prof,
        cx=-0.46, cy=0.90, cz=-0.30,
        rx=-0.12, rz=0.14,
        segs=4,
        uv_box=(0.22, 0.28, 0.65, 0.60),
        tint=(1.06, 1.02, 0.94),
        lift=0.04,
    )

    # 2. The Woven Sparrow's Twig Nest nestled on the warm sunlit altar ledge (matching b-015-012.jpg)
    nest_cx, nest_cy, nest_cz = 0.12, 0.91, 0.04
    # Outer & inner woven cup lathe
    nest_prof = [
        (0.04, 0.0),
        (0.32, 0.03),
        (0.46, 0.14),
        (0.50, 0.28),
        (0.45, 0.36),   # Woven twig rim
        (0.36, 0.34),
        (0.28, 0.18),   # Cozy hollow cup interior
        (0.02, 0.10),
    ]
    b.add_lathe(
        nest_prof,
        cx=nest_cx, cy=nest_cy, cz=nest_cz,
        segs=28,
        uv_box=(0.30, 0.42, 0.72, 0.76),
        tint=(0.94, 0.80, 0.62),
        wobble_amp=0.08,
    )

    # Interlaced sculptural twig rings around the nest rim for rich 3D woven texture
    for ring_i in range(6):
        ring_pts = []
        base_ang = ring_i * 1.04
        for s in range(15):
            t = s / 14.0
            ang = base_ang + t * math.pi * 1.65
            rad = 0.43 + 0.05 * math.sin(t * math.pi * 3.0 + ring_i)
            hy = nest_cy + 0.14 + 0.18 * (ring_i / 5.0) + 0.03 * math.cos(t * math.pi * 2.0)
            ring_pts.append((nest_cx + math.cos(ang) * rad, hy, nest_cz + math.sin(ang) * rad))
        b.add_tube(ring_pts, [0.024] * 15, segs=8, uv_box=(0.32, 0.45, 0.68, 0.72), tint=(0.88, 0.74, 0.56))

    # 3. Two Warm Cream-and-Gold Eggs resting inside the nest cup (matching b-015-012.jpg)
    egg_prof = [
        (0.01, 0.0),
        (0.10, 0.04),
        (0.14, 0.12),
        (0.12, 0.22),
        (0.07, 0.29),
        (0.01, 0.32),
    ]
    b.add_lathe(
        egg_prof,
        cx=nest_cx - 0.10, cy=nest_cy + 0.10, cz=nest_cz + 0.02,
        rx=0.25, rz=-0.38,
        segs=20,
        uv_box=(0.44, 0.48, 0.56, 0.58),
        tint=(1.15, 1.12, 1.04),
        lift=0.10,
    )
    b.add_lathe(
        egg_prof,
        cx=nest_cx + 0.11, cy=nest_cy + 0.10, cz=nest_cz - 0.03,
        rx=-0.20, rz=0.42,
        segs=20,
        uv_box=(0.44, 0.48, 0.56, 0.58),
        tint=(1.14, 1.10, 1.02),
        lift=0.09,
    )

    # 4. Living Olive Branch with leaves curving beside the nest on the altar stone (as in b-015-012.jpg)
    stem_pts = [
        (-0.52, 0.94, 0.28),
        (-0.28, 1.02, 0.34),
        (0.05, 1.06, 0.38),
        (0.38, 1.00, 0.34),
    ]
    b.add_tube(stem_pts, [0.022, 0.020, 0.018, 0.014], segs=10, uv_box=(0.20, 0.20, 0.45, 0.45), tint=(0.76, 0.88, 0.62))
    for lx, ly, lz, lrz in [
        (-0.36, 1.04, 0.36, 0.4),
        (-0.18, 1.08, 0.40, -0.3),
        (0.02, 1.10, 0.42, 0.35),
        (0.22, 1.06, 0.38, -0.4),
    ]:
        b.add_box(0.16, 0.025, 0.07, cx=lx, cy=ly, cz=lz, ry=lrz, rz=0.22, uv_box=(0.22, 0.22, 0.42, 0.40), tint=(0.78, 0.94, 0.66), lift=0.04, bevel=0.18)

    b.export_glb(os.path.join(ROOT, "assets/models/sparrows-nest-altar.glb"))


def build_praise_cymbals():
    """Slot 25: XVI · Everything That Has Breath (Ps 107–150) — The Praise Cymbals of Psalm 150 †"""
    b = GlbBuilder("assets/psalms-4/web/b-016-044.jpg")

    # 1. Carved Sanctuary Stone Plinth & Timber Praise Stand (grounded at y = 0)
    b.add_lathe(
        [(0.72, 0.0), (0.68, 0.14), (0.54, 0.24), (0.48, 0.32), (0.02, 0.34)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=24,
        uv_box=(0.15, 0.65, 0.85, 0.92),
        tint=(0.96, 0.90, 0.80),
        wobble_amp=0.03,
    )

    # Twin carved timber-and-bronze display uprights rising from the plinth to cradle the two great cymbals
    for side, h_top, cz_off in [(-1.0, 1.48, -0.06), (1.0, 1.62, 0.08)]:
        post_pts = [
            (side * 0.26, 0.28, cz_off),
            (side * 0.30, 0.85, cz_off),
            (side * 0.22, h_top, cz_off),
        ]
        b.add_tube(
            post_pts,
            [0.058, 0.052, 0.046],
            segs=14,
            uv_box=(0.25, 0.45, 0.65, 0.78),
            tint=(0.94, 0.78, 0.58),
        )

    # Crossbrace linking the stand posts
    b.add_box(0.66, 0.09, 0.18, cx=0.0, cy=0.72, cz=0.0, uv_box=(0.25, 0.45, 0.65, 0.75), tint=(1.02, 0.86, 0.64), bevel=0.08)

    # 2. A Pair of Great Hammered Bronze Sanctuary Cymbals (Ps 150:5: "Praise him upon the loud cymbals:
    #    praise him upon the high sounding cymbals")
    #    Mounted in an expressive open-clash V-angle so both circular bronze discs, concentric hammered rings,
    #    central resonant cup domes, and woven leather hand-straps read instantly in 2 seconds from any angle!
    cymbal_prof = [
        (0.01, 0.0),
        (0.18, 0.02),   # Central resonant dome ("bell" of the cymbal)
        (0.22, 0.09),
        (0.42, 0.12),   # Inner hammered bow
        (0.64, 0.15),   # Outer hammered bronze flange
        (0.68, 0.165),  # Rim edge
        (0.64, 0.18),   # Backside thickness
        (0.42, 0.155),
        (0.22, 0.125),
        (0.16, 0.055),
        (0.01, 0.04),
    ]

    # Left Cymbal (angled outward-left and slightly forward)
    b.add_lathe(
        cymbal_prof,
        cx=-0.28, cy=1.34, cz=-0.04,
        rx=1.28, ry=-0.38, rz=0.22,
        segs=36,
        uv_box=(0.25, 0.12, 0.75, 0.48),
        tint=(1.18, 1.00, 0.68),
        lift=0.08,
        wobble_amp=0.008,
    )
    # Right Cymbal (angled outward-right and slightly higher, mid-ringing)
    b.add_lathe(
        cymbal_prof,
        cx=0.28, cy=1.48, cz=0.06,
        rx=1.32, ry=0.42, rz=-0.24,
        segs=36,
        uv_box=(0.25, 0.12, 0.75, 0.48),
        tint=(1.22, 1.04, 0.72),
        lift=0.10,
        wobble_amp=0.008,
    )

    # 3. Braided Leather & Gold Hand-Straps looping from the central domes of both cymbals
    for cx_s, cy_s, cz_s, dir_x in [(-0.28, 1.34, -0.14, -1.0), (0.28, 1.48, -0.04, 1.0)]:
        strap_pts = [
            (cx_s, cy_s + 0.04, cz_s),
            (cx_s + dir_x * 0.14, cy_s + 0.12, cz_s - 0.16),
            (cx_s + dir_x * 0.18, cy_s - 0.04, cz_s - 0.18),
            (cx_s, cy_s - 0.04, cz_s),
        ]
        b.add_tube(strap_pts, [0.026, 0.030, 0.030, 0.026], segs=10, uv_box=(0.30, 0.30, 0.60, 0.60), tint=(0.95, 0.72, 0.48))

    b.export_glb(os.path.join(ROOT, "assets/models/praise-cymbals.glb"))


if __name__ == "__main__":
    build_shepherds_rod_and_staff()
    build_davids_harp()
    build_sparrows_nest_altar()
    build_praise_cymbals()

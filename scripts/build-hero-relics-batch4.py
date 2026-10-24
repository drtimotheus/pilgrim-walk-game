#!/usr/bin/env python3
"""
Builds and Meshopt-compresses Batch 4 Hero Relics (Districts XXI, XXII, XXIII, XXV, Slots 30–33):
  - Slot 30 (XXI · Jeremiah):     potters-wheel.glb        (from b-021-016.jpg, Jer 18)
  - Slot 31 (XXII · Lamentations): ruined-watchtower.glb   (from b-022-024.jpg, Lam 4:17)
  - Slot 32 (XXIII · Ezekiel):    wheel-within-a-wheel.glb (from b-023-002.jpg, Ezek 1:16)
  - Slot 33 (XXV · Hosea):        door-of-hope.glb         (from b-025-006.jpg, Hos 2:15)
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


def build_potters_wheel():
    """Slot 30: XXI · A Future and a Hope (Jeremiah) — The Potter's Wheel (Jer 18)"""
    b = GlbBuilder("assets/a-future-and-a-hope/web/b-021-016.jpg")

    # 1. Workshop Stone Floor & Timber Potter's Frame Base (grounded at y = 0)
    b.add_box(1.36, 0.16, 1.12, cx=0.0, cy=0.08, cz=0.0, uv_box=(0.15, 0.78, 0.85, 0.96), tint=(0.94, 0.88, 0.78), bevel=0.06)

    # 2. Heavy Lower Stone Kick-Flywheel ("he wrought a work on the wheels" — literal Hebrew dual *ha-obnayim*, two stones)
    kick_prof = [
        (0.04, 0.16),
        (0.68, 0.18),
        (0.72, 0.28),
        (0.68, 0.36),
        (0.14, 0.38),
    ]
    b.add_lathe(
        kick_prof,
        cx=-0.08, cy=0.0, cz=0.0,
        segs=32,
        uv_box=(0.20, 0.72, 0.65, 0.88),
        tint=(0.96, 0.90, 0.80),
        wobble_amp=0.015,
    )

    # Central vertical wooden spindle axle connecting lower flywheel to upper throwing wheel head
    b.add_lathe(
        [(0.09, 0.34), (0.08, 0.65), (0.08, 0.92), (0.14, 0.96)],
        cx=-0.08, cy=0.0, cz=0.0,
        segs=20,
        uv_box=(0.25, 0.55, 0.55, 0.75),
        tint=(0.86, 0.72, 0.54),
    )

    # 3. Upper Spinning Potter's Wheel Head with concentric throwing grooves (matching b-021-016.jpg)
    head_prof = [
        (0.14, 0.94),
        (0.60, 0.98),
        (0.64, 1.05),
        (0.60, 1.10),
        (0.24, 1.11),
    ]
    b.add_lathe(
        head_prof,
        cx=-0.08, cy=0.0, cz=0.0,
        segs=36,
        uv_box=(0.18, 0.68, 0.68, 0.86),
        tint=(1.04, 0.96, 0.84),
        lift=0.03,
    )

    # 4. The Clay Vessel Mid-Forming on the Wheel Head (sampled directly from the vessel in b-021-016.jpg!)
    #    Globular lower belly, inward neck waist, flared soft rim, and deep hollow interior with throwing ribs
    vessel_prof = [
        (0.24, 1.10),   # Foot ring on wheel head
        (0.26, 1.16),
        (0.39, 1.34),   # Swelling clay belly mid-forming
        (0.38, 1.50),
        (0.29, 1.66),   # Neck waist
        (0.34, 1.78),   # Soft flared wet-clay rim
        (0.31, 1.81),
        (0.25, 1.66),   # Inner wall of the vessel
        (0.32, 1.44),
        (0.20, 1.18),
        (0.01, 1.14),
    ]
    b.add_lathe(
        vessel_prof,
        cx=-0.08, cy=0.0, cz=0.0,
        segs=36,
        uv_box=(0.33, 0.48, 0.57, 0.76),
        tint=(1.06, 0.98, 0.88),
        lift=0.04,
        wobble_amp=0.014,  # Gentle organic hand-thrown asymmetry ("made it again another vessel")
    )

    # 5. Kneaded Lump of Raw Wet Clay resting on burlap cloth beside the wheel (matching lower-right of b-021-016.jpg)
    b.add_lathe(
        [(0.24, 0.14), (0.28, 0.24), (0.25, 0.38), (0.16, 0.46), (0.02, 0.48)],
        cx=0.42, cy=0.0, cz=0.22,
        segs=18,
        uv_box=(0.72, 0.66, 0.94, 0.86),
        tint=(0.98, 0.90, 0.80),
        wobble_amp=0.08,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/potters-wheel.glb"))


def build_ruined_watchtower():
    """Slot 31: XXII · New Every Morning (Lamentations) — The Ruined Watchtower (Lam 4:17)"""
    b = GlbBuilder("assets/new-every-morning/web/b-022-024.jpg")

    # 1. Stepped Jerusalem Rampart & Parapet Base (grounded at y = 0, matching b-022-024.jpg)
    b.add_box(1.56, 0.28, 1.32, cx=0.0, cy=0.14, cz=0.0, uv_box=(0.55, 0.65, 0.95, 0.95), tint=(0.96, 0.92, 0.84), bevel=0.06)
    # Stone stair steps leading up to the watchtower terrace on the left-front
    for s_i in range(3):
        b.add_box(
            0.52, 0.14, 0.36,
            cx=-0.38, cy=0.28 + s_i * 0.12, cz=0.38 - s_i * 0.20,
            uv_box=(0.58, 0.62, 0.88, 0.85),
            tint=(1.00, 0.95, 0.86),
            bevel=0.06,
        )

    # 2. The Broken, Roofless Stone Watchtower of the Ruined City
    #    Built from four weathered ashlar corner piers and walls surrounding a deep open doorway/window
    #    where golden dawn light ("new every morning") shines through!
    # Left & Right Tower Piers
    b.add_box(0.42, 1.68, 0.94, cx=-0.42, cy=1.06, cz=-0.06, uv_box=(0.66, 0.24, 0.96, 0.68), tint=(0.98, 0.93, 0.84), bevel=0.06)
    b.add_box(0.44, 1.78, 0.94, cx=0.42, cy=1.10, cz=-0.06, uv_box=(0.66, 0.24, 0.96, 0.68), tint=(0.96, 0.91, 0.82), bevel=0.06)
    # Back Wall with an upper arched dawn window opening
    b.add_box(0.56, 0.72, 0.28, cx=0.0, cy=0.58, cz=-0.38, uv_box=(0.68, 0.30, 0.94, 0.62), tint=(0.92, 0.88, 0.80), bevel=0.06)
    # Front Lintel & Corbelled Cornice above the Watchtower Portal
    b.add_box(1.38, 0.26, 1.06, cx=0.0, cy=1.96, cz=-0.06, uv_box=(0.64, 0.22, 0.96, 0.36), tint=(1.04, 0.98, 0.88), lift=0.03, bevel=0.05)

    # Broken Crenellated Battlement Merlons around the roofless crown (some standing, some shattered low)
    merlons = [
        (-0.48, 2.22, 0.34, 0.28, 0.30, 0.24),
        (-0.10, 2.18, 0.34, 0.26, 0.22, 0.24),
        (0.38, 2.26, 0.34, 0.32, 0.38, 0.24),
        (-0.48, 2.16, -0.44, 0.28, 0.20, 0.24),
        (0.42, 2.24, -0.44, 0.30, 0.34, 0.24),
    ]
    for mx, my, mz, msx, msy, msz in merlons:
        b.add_box(msx, msy, msz, cx=mx, cy=my, cz=mz, uv_box=(0.66, 0.16, 0.94, 0.28), tint=(1.00, 0.95, 0.86), bevel=0.08)

    # Weathered timber watch-awning poles rising from the roofless parapet (matching top-right of b-022-024.jpg)
    b.add_tube([(0.44, 2.30, 0.28), (0.44, 2.74, 0.28)], [0.028, 0.024], segs=10, uv_box=(0.75, 0.04, 0.95, 0.18), tint=(0.88, 0.76, 0.58))
    b.add_tube([(-0.42, 2.26, -0.32), (-0.42, 2.60, -0.32)], [0.026, 0.022], segs=10, uv_box=(0.75, 0.04, 0.95, 0.18), tint=(0.88, 0.76, 0.58))
    b.add_tube([(-0.42, 2.56, -0.32), (0.44, 2.68, 0.28)], [0.020, 0.020], segs=8, uv_box=(0.75, 0.04, 0.95, 0.18), tint=(0.94, 0.82, 0.64))

    # 3. Radiant Dawn Light Core inside the Watchtower Window & Bronze Watchman's Brazier on the Ledge
    #    (Sampled from the golden dawn sky at uv (0.28..0.48, 0.18..0.32) of b-022-024.jpg!)
    b.add_box(
        0.42, 0.88, 0.10,
        cx=0.0, cy=1.34, cz=-0.22,
        uv_box=(0.30, 0.18, 0.48, 0.32),
        tint=(1.28, 1.16, 0.86),
        lift=0.14,
        bevel=0.10,
    )

    # Bronze tripod fire-brazier on the watchtower parapet ledge (exact match to b-022-024.jpg center-right!)
    b.add_lathe(
        [(0.12, 0.0), (0.04, 0.22), (0.16, 0.28), (0.18, 0.34), (0.02, 0.36)],
        cx=-0.42, cy=0.64, cz=0.38,
        segs=16,
        uv_box=(0.62, 0.48, 0.69, 0.58),
        tint=(0.86, 0.74, 0.58),
    )
    # Glowing watchfire flame in the brazier
    b.add_lathe(
        [(0.01, 0.0), (0.09, 0.04), (0.06, 0.14), (0.01, 0.22)],
        cx=-0.42, cy=0.98, cz=0.38,
        segs=12,
        uv_box=(0.32, 0.20, 0.45, 0.30),
        tint=(1.35, 1.15, 0.75),
        lift=0.16,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/ruined-watchtower.glb"))


def build_wheel_within_a_wheel():
    """Slot 32: XXIII · Can These Bones Live (Ezekiel) — The Wheel Within a Wheel (Ezek 1:16)"""
    b = GlbBuilder("assets/can-these-bones-live/web/b-023-002.jpg")

    # 1. River Chebar Cairn Stone & Scroll Plinth (grounded at y = 0, matching lower-right of b-023-002.jpg)
    b.add_lathe(
        [(0.76, 0.0), (0.72, 0.14), (0.58, 0.26), (0.44, 0.36), (0.02, 0.38)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=24,
        uv_box=(0.74, 0.78, 0.94, 0.94),
        tint=(0.94, 0.90, 0.82),
        wobble_amp=0.05,
    )
    # Unrolled prophetic scroll draped down the front of the cairn stone (echoing b-023-002.jpg)
    b.add_box(
        0.34, 0.36, 0.06,
        cx=0.18, cy=0.24, cz=0.44,
        rx=-0.42, ry=0.18,
        uv_box=(0.78, 0.78, 0.88, 0.92),
        tint=(1.10, 1.04, 0.88),
        lift=0.05,
        bevel=0.10,
    )

    # 2. Two Great Interlocked Upright Gyre Wheels ("like unto the colour of a beryl: and their work was
    #    as it were a wheel in the middle of a wheel", Ezek 1:16)
    #    Sampled from the luminous beryl-amber-celadon whirlwind rings of b-023-002.jpg!
    wheel_cy = 1.32
    wheel_configs = [
        # Outer Wheel (radius 0.88, angled at ry = +0.42)
        (0.88, 0.085, 0.42, (1.16, 1.08, 0.82), 0.08),
        # Inner Interlocked Orthogonal Wheel (radius 0.80, angled at ry = -1.15 — 90 degrees across!)
        (0.80, 0.080, -1.15, (1.06, 1.18, 1.08), 0.10),
    ]

    for R_maj, r_min, ry_ang, w_tint, w_lift in wheel_configs:
        # Build the circular wheel rim as a closed 32-segment tube ring
        rim_pts = []
        for s in range(37):
            theta = (s / 36.0) * math.pi * 2.0
            lx = math.cos(theta) * R_maj
            ly = math.sin(theta) * R_maj
            wx, wy, wz = rotate_point(lx, ly, 0.0, 0.0, ry_ang, 0.0)
            rim_pts.append((wx, wheel_cy + wy, wz))
        b.add_tube(
            rim_pts,
            [r_min] * 37,
            segs=16,
            uv_box=(0.38, 0.34, 0.72, 0.56),
            tint=w_tint,
            lift=w_lift,
        )

        # 8 Radial Spokes intersecting at the fiery central hub
        for sp_i in range(4):
            ang = sp_i * (math.pi * 0.25)
            lx0, ly0 = -math.cos(ang) * R_maj, -math.sin(ang) * R_maj
            lx1, ly1 = math.cos(ang) * R_maj, math.sin(ang) * R_maj
            wx0, wy0, wz0 = rotate_point(lx0, ly0, 0.0, 0.0, ry_ang, 0.0)
            wx1, wy1, wz1 = rotate_point(lx1, ly1, 0.0, 0.0, ry_ang, 0.0)
            b.add_tube(
                [(wx0, wheel_cy + wy0, wz0), (0.0, wheel_cy, 0.0), (wx1, wheel_cy + wy1, wz1)],
                [0.032, 0.048, 0.032],
                segs=10,
                uv_box=(0.40, 0.36, 0.70, 0.54),
                tint=w_tint,
                lift=w_lift,
            )

        # Sculpted Beryl "Eyes" studded around the outer circumference of each rim ("and their rings were full of eyes round about them four", Ezek 1:18)
        for eye_i in range(12):
            theta = (eye_i / 12.0) * math.pi * 2.0 + 0.13
            lx = math.cos(theta) * (R_maj + r_min * 0.65)
            ly = math.sin(theta) * (R_maj + r_min * 0.65)
            wx, wy, wz = rotate_point(lx, ly, 0.0, 0.0, ry_ang, 0.0)
            b.add_lathe(
                [(0.01, -0.04), (0.048, 0.0), (0.01, 0.04)],
                cx=wx, cy=wheel_cy + wy, cz=wz,
                segs=10,
                uv_box=(0.48, 0.40, 0.68, 0.52),
                tint=(1.30, 1.24, 0.96),
                lift=0.14,
            )

    # Central Interlocking Gyro Hub Sphere
    b.add_lathe(
        [(0.01, -0.16), (0.14, -0.08), (0.18, 0.0), (0.14, 0.08), (0.01, 0.16)],
        cx=0.0, cy=wheel_cy, cz=0.0,
        segs=20,
        uv_box=(0.46, 0.38, 0.66, 0.52),
        tint=(1.28, 1.18, 0.90),
        lift=0.12,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/wheel-within-a-wheel.glb"))


def build_door_of_hope():
    """Slot 33: XXV · A Door of Hope (Hosea) — The Door of Hope (Hos 2:15)"""
    b = GlbBuilder("assets/a-door-of-hope/web/b-025-006.jpg")

    # 1. Valley of Achor Stone Threshold & Path Base (grounded at y = 0, matching b-025-006.jpg)
    b.add_box(1.52, 0.22, 1.16, cx=0.0, cy=0.11, cz=0.0, uv_box=(0.35, 0.68, 0.78, 0.95), tint=(1.02, 0.96, 0.84), bevel=0.06)
    b.add_box(1.28, 0.14, 0.86, cx=0.0, cy=0.26, cz=0.0, uv_box=(0.38, 0.65, 0.75, 0.90), tint=(1.06, 1.00, 0.88), bevel=0.05)

    # 2. Freestanding Dressed Stone Doorframe standing in the Valley (Left Jamb, Right Jamb, and Carved Lintel)
    # Left Stone Jamb
    b.add_box(0.32, 1.92, 0.38, cx=-0.52, cy=1.24, cz=0.0, uv_box=(0.12, 0.75, 0.32, 0.95), tint=(1.00, 0.94, 0.82), bevel=0.06)
    # Right Stone Jamb
    b.add_box(0.32, 1.92, 0.38, cx=0.52, cy=1.24, cz=0.0, uv_box=(0.12, 0.75, 0.32, 0.95), tint=(0.98, 0.92, 0.80), bevel=0.06)
    # Overhead Stone Lintel & Crown Cornice
    b.add_box(1.48, 0.28, 0.46, cx=0.0, cy=2.30, cz=0.0, uv_box=(0.12, 0.72, 0.35, 0.92), tint=(1.06, 1.00, 0.88), lift=0.04, bevel=0.05)
    b.add_box(1.58, 0.14, 0.52, cx=0.0, cy=2.48, cz=0.0, uv_box=(0.65, 0.30, 0.88, 0.52), tint=(1.14, 1.06, 0.90), lift=0.06, bevel=0.05)

    # 3. The Wooden Door Standing Wide Open ("and the valley of Achor for a door of hope", Hos 2:15)
    #    Pivoted from the left jamb (-0.36, z=0) outward into the valley at a welcoming 55-degree open angle!
    door_ang = -0.96  # ~55 deg open so the open doorway passage and the wooden door panel both read at a glance
    hinge_x, hinge_z = -0.36, 0.04
    door_w = 0.72
    door_cx = hinge_x + math.cos(door_ang) * (door_w * 0.5)
    door_cz = hinge_z - math.sin(door_ang) * (door_w * 0.5)

    # Thick planked timber door leaf
    b.add_box(
        door_w, 1.82, 0.09,
        cx=door_cx, cy=1.22, cz=door_cz,
        ry=door_ang,
        uv_box=(0.06, 0.78, 0.28, 0.92),
        tint=(0.94, 0.76, 0.54),
        bevel=0.05,
    )
    # Three wrought-iron/bronze horizontal hinge straps & ring latch on the open wooden door
    for strap_y in [0.58, 1.22, 1.86]:
        b.add_box(
            door_w * 0.88, 0.07, 0.12,
            cx=door_cx, cy=strap_y, cz=door_cz,
            ry=door_ang,
            uv_box=(0.82, 0.72, 0.96, 0.90),
            tint=(0.76, 0.66, 0.52),
            bevel=0.08,
        )
    # Ring handle on the open door edge
    handle_x = hinge_x + math.cos(door_ang) * (door_w * 0.82)
    handle_z = hinge_z - math.sin(door_ang) * (door_w * 0.82)
    b.add_lathe(
        [(0.06, -0.02), (0.09, 0.0), (0.06, 0.02)],
        cx=handle_x, cy=1.18, cz=handle_z,
        segs=14,
        uv_box=(0.72, 0.35, 0.86, 0.52),
        tint=(1.22, 1.04, 0.68),
        lift=0.08,
    )

    # 4. Sunlit Vineyard Vine with Golden-Green Leaves climbing the Right Doorpost (matching the vine in b-025-006.jpg:
    #    "And I will give her her vineyards from thence, and the valley of Achor for a door of hope")
    vine_pts = [
        (0.56, 0.30, 0.20),
        (0.62, 0.78, 0.22),
        (0.54, 1.28, 0.22),
        (0.60, 1.76, 0.20),
        (0.46, 2.18, 0.18),
    ]
    b.add_tube(vine_pts, [0.032, 0.028, 0.025, 0.022, 0.018], segs=10, uv_box=(0.66, 0.52, 0.75, 0.76), tint=(0.88, 0.96, 0.56), lift=0.04)
    for lx, ly, lz, lrz in [
        (0.66, 0.68, 0.24, 0.35),
        (0.48, 1.06, 0.24, -0.40),
        (0.64, 1.48, 0.24, 0.30),
        (0.50, 1.92, 0.22, -0.35),
    ]:
        b.add_box(0.20, 0.03, 0.14, cx=lx, cy=ly, cz=lz, ry=lrz, rz=0.25, uv_box=(0.66, 0.52, 0.75, 0.74), tint=(1.08, 1.16, 0.64), lift=0.08, bevel=0.18)

    b.export_glb(os.path.join(ROOT, "assets/models/door-of-hope.glb"))


if __name__ == "__main__":
    build_potters_wheel()
    build_ruined_watchtower()
    build_wheel_within_a_wheel()
    build_door_of_hope()

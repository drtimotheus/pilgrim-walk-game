#!/usr/bin/env python3
"""
Builds and Meshopt-compresses Batch 7 Hero Relics (Districts XXXIII–XXXVI, Slots 42–45):
  - Slot 42 (XXXIII · Romans):       grafted-branch.glb (from b-033-030.jpg, Rom 11:17–24)
  - Slot 43 (XXXIV · 2 Corinthians): treasure-jar.glb   (from b-034-029.jpg, 2 Cor 4:7)
  - Slot 44 (XXXV · Gal/Eph):        shield-of-faith.glb (from b-035-039.jpg, Eph 6:16)
  - Slot 45 (XXXVI · Philippians):   open-shackles.glb  († concept-modeled from b-036-010.jpg, Phil 1)
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


def build_grafted_branch():
    """
    Slot 42: XXXIII · Nothing Can Separate (Romans) — The Grafted Branch (Rom 11:17–24)
    Brief: "an olive branch bound into a sawn trunk section (model the graft union, not a whole tree —
    Genesis and Samuel already hold the trees)"
    """
    b = GlbBuilder("assets/nothing-can-separate/web/b-033-030.jpg")

    # 1. Judean Stone Base & Sawn Ancient Olive Rootstock Trunk Section (grounded at y = 0)
    b.add_lathe(
        [(0.72, 0.0), (0.68, 0.12), (0.54, 0.20), (0.02, 0.22)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=22,
        uv_box=(0.15, 0.78, 0.45, 0.96),
        tint=(0.98, 0.94, 0.86),
        wobble_amp=0.04,
    )

    # Sawn Gnarled Olive Rootstock Section (with deeply fluted bark and a flat-sawn top cut at y = 1.18)
    trunk_prof = [
        (0.46, 0.16),
        (0.40, 0.36),
        (0.35, 0.65),
        (0.33, 0.95),
        (0.34, 1.18),  # Flat-sawn outer bark rim
    ]
    b.add_lathe(
        trunk_prof,
        cx=-0.06, cy=0.0, cz=0.0,
        segs=28,
        uv_box=(0.35, 0.45, 0.78, 0.88),
        tint=(0.96, 0.92, 0.86),
        wobble_amp=0.075,  # Deep ancient olive bark ridges
    )
    # Bright freshly-sawn heartwood disk at the top of the rootstock (y = 1.18)
    b.add_lathe(
        [(0.33, 1.18), (0.18, 1.19), (0.01, 1.19)],
        cx=-0.06, cy=0.0, cz=0.0,
        segs=24,
        uv_box=(0.56, 0.45, 0.63, 0.49),  # Sampled from the bright sawn wood face in b-033-030.jpg!
        tint=(1.22, 1.12, 0.90),
        lift=0.08,
    )

    # 2. The Wild Olive Scion Branch inserted into the Cleft Graft Union on the Front-Right of the Rootstock
    #    (Matching the exact sawn scion peg & sprouting green shoot at uv (0.52..0.66, 0.44..0.72) of b-033-030.jpg!)
    scion_peg_prof = [
        (0.08, 0.62),
        (0.095, 0.85),
        (0.10, 1.12),
        (0.105, 1.32),  # Sawn bevel top of the grafted scion stock
        (0.01, 1.34),
    ]
    b.add_lathe(
        scion_peg_prof,
        cx=0.18, cy=0.0, cz=0.16,
        rx=-0.08, rz=-0.12,
        segs=18,
        uv_box=(0.55, 0.45, 0.64, 0.56),
        tint=(1.10, 0.96, 0.74),
        lift=0.04,
    )

    # 3. Five Criss-Crossed Loops of Coarse Hemp Grafting Twine binding the Graft Union + Tied Knot & Hanging Ends!
    for wrap_i, wy in enumerate([0.74, 0.82, 0.90, 0.98, 1.06]):
        wrap_pts = []
        tilt = (wrap_i % 2 - 0.5) * 0.08
        for s in range(21):
            ang = (s / 20.0) * math.pi * 2.0
            # Elliptical wrap encompassing both the trunk cleft and the grafted scion peg
            rx_w = 0.04 + math.cos(ang) * 0.36
            rz_w = 0.04 + math.sin(ang) * 0.32
            ry_w = wy + math.sin(ang) * tilt
            wrap_pts.append((rx_w, ry_w, rz_w))
        b.add_tube(
            wrap_pts,
            [0.024] * 21,
            segs=10,
            uv_box=(0.53, 0.54, 0.66, 0.68),
            tint=(1.18, 1.08, 0.84),
            lift=0.06,
        )

    # Hanging twine knot tails on the front-right (matching b-033-030.jpg)
    b.add_tube(
        [(0.28, 0.98, 0.24), (0.38, 0.86, 0.28), (0.46, 0.72, 0.30)],
        [0.024, 0.020, 0.012],
        segs=8,
        uv_box=(0.53, 0.54, 0.66, 0.68),
        tint=(1.18, 1.08, 0.84),
        lift=0.06,
    )

    # 4. Sprouting Living Olive Branch & Silver-Green Olive Leaves rising from the Graft Union (to y ~ 2.25)
    main_shoot = [
        (0.16, 1.18, 0.14),
        (0.12, 1.48, 0.10),
        (0.15, 1.82, 0.06),
        (0.10, 2.18, 0.02),
    ]
    b.add_tube(main_shoot, [0.036, 0.030, 0.024, 0.016], segs=12, uv_box=(0.48, 0.15, 0.62, 0.42), tint=(0.86, 0.94, 0.72), lift=0.04)

    # Left & Right branching olive twigs
    left_twig = [(0.13, 1.46, 0.10), (-0.08, 1.66, 0.12), (-0.28, 1.84, 0.14)]
    right_twig = [(0.14, 1.56, 0.08), (0.34, 1.74, 0.08), (0.50, 1.90, 0.06)]
    b.add_tube(left_twig, [0.024, 0.020, 0.014], segs=10, uv_box=(0.48, 0.15, 0.62, 0.42), tint=(0.86, 0.94, 0.72))
    b.add_tube(right_twig, [0.024, 0.020, 0.014], segs=10, uv_box=(0.48, 0.15, 0.62, 0.42), tint=(0.86, 0.94, 0.72))

    # Sculpted silver-green olive leaves along the main shoot and side twigs
    leaves = [
        (-0.14, 1.68, 0.14, 0.4, 0.35),
        (-0.28, 1.86, 0.15, -0.3, 0.45),
        (-0.04, 1.76, 0.12, 0.2, -0.35),
        (0.32, 1.72, 0.10, -0.4, -0.35),
        (0.48, 1.90, 0.08, 0.3, -0.45),
        (0.24, 1.82, 0.08, -0.2, 0.35),
        (0.04, 1.66, 0.08, 0.3, 0.30),
        (0.22, 1.94, 0.04, -0.3, -0.30),
        (0.02, 2.04, 0.04, 0.25, 0.35),
        (0.12, 2.22, 0.02, 0.0, 0.15),
    ]
    for lx, ly, lz, lry, lrz in leaves:
        b.add_box(
            0.22, 0.028, 0.075,
            cx=lx, cy=ly, cz=lz,
            ry=lry, rz=lrz,
            uv_box=(0.48, 0.12, 0.65, 0.36),
            tint=(0.94, 1.08, 0.80),
            lift=0.06,
            bevel=0.18,
        )

    b.export_glb(os.path.join(ROOT, "assets/models/grafted-branch.glb"))


def build_treasure_jar():
    """Slot 43: XXXIV · Treasure in Clay Jars (2 Corinthians) — The Treasure Jar (2 Cor 4:7)"""
    b = GlbBuilder("assets/treasure-in-clay-jars/web/b-034-029.jpg")

    # 1. Weathered Timber & Stone Table Base with Rolled Scroll (grounded at y = 0, matching b-034-029.jpg)
    b.add_box(1.36, 0.18, 1.12, cx=0.0, cy=0.09, cz=0.0, uv_box=(0.15, 0.82, 0.85, 0.96), tint=(0.96, 0.90, 0.80), bevel=0.06)

    # 2. The Whole Globular Clay Jar (modeled directly from the central jar of b-034-029.jpg!)
    jar_prof = [
        (0.02, 0.18),
        (0.36, 0.20),   # Flat base foot
        (0.58, 0.44),
        (0.72, 0.78),   # Wide globular clay belly
        (0.70, 1.12),
        (0.54, 1.38),   # Rounded shoulder
        (0.40, 1.50),   # Short neck waist
        (0.43, 1.60),   # Thickened clay rim
        (0.38, 1.62),
        (0.34, 1.48),   # Inner glowing throat of the jar!
        (0.02, 1.44),
    ]
    b.add_lathe(
        jar_prof,
        cx=0.0, cy=0.0, cz=0.0,
        segs=36,
        uv_box=(0.26, 0.34, 0.72, 0.78),
        tint=(1.02, 0.96, 0.86),
        wobble_amp=0.015,
    )

    # 3. Warm Golden Light Glowing inside the Open Rim Throat (matching uv (0.38..0.62, 0.28..0.33) of b-034-029.jpg!)
    b.add_lathe(
        [(0.01, 1.52), (0.36, 1.54), (0.38, 1.58)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=28,
        uv_box=(0.42, 0.28, 0.58, 0.32),
        tint=(1.42, 1.28, 0.88),
        lift=0.18,
    )

    # 4. Luminous Golden Crack Seams ("But we have this treasure in earthen vessels", 2 Cor 4:7)
    #    Raised golden-white light seams coursing down the front and back of the clay jar, sampled directly
    #    from the glowing crack at uv (0.41..0.46, 0.45..0.68) of b-034-029.jpg!
    for z_sign in [1.0, -1.0]:
        crack_pts = []
        crack_radii = []
        # Zigzag vertical crack from rim (y=1.58) down through the belly to the lower base (y=0.32)
        waypoints = [
            (-0.08 * z_sign, 1.58),
            (-0.10 * z_sign, 1.38),
            (-0.14 * z_sign, 1.14),
            (-0.11 * z_sign, 0.92),
            (-0.04 * z_sign, 0.72),
            (0.02 * z_sign, 0.52),
            (-0.02 * z_sign, 0.34),
        ]
        for wx, wy in waypoints:
            # Compute jar surface radius at height wy
            norm_y = (wy - 0.20) / 1.40
            r_surf = 0.36 + 0.37 * math.sin(max(0.0, min(1.0, norm_y)) * math.pi * 0.88)
            wz = z_sign * math.sqrt(max(0.05, r_surf * r_surf - wx * wx))
            crack_pts.append((wx, wy, wz))
            crack_radii.append(0.026)

        b.add_tube(
            crack_pts,
            crack_radii,
            segs=10,
            uv_box=(0.41, 0.46, 0.46, 0.66),
            tint=(1.48, 1.32, 0.88),
            lift=0.22,
        )

        # Secondary branching golden hairline crack
        branch_pts = [
            crack_pts[2],
            (0.08 * z_sign, 1.02, z_sign * 0.71),
            (0.22 * z_sign, 0.88, z_sign * 0.68),
        ]
        b.add_tube(
            branch_pts,
            [0.020, 0.018, 0.012],
            segs=8,
            uv_box=(0.41, 0.46, 0.46, 0.66),
            tint=(1.45, 1.28, 0.86),
            lift=0.20,
        )

    b.export_glb(os.path.join(ROOT, "assets/models/treasure-jar.glb"))


def build_shield_of_faith():
    """
    Slot 44: XXXV · Rooted and Free (Galatians/Ephesians) — The Shield of Faith (Eph 6:16)
    Brief: "a great standing shield" (and Batch 8 note: "pair visually with XXXV's shield, do not duplicate it").
    We model the great bronze-rimmed Roman/Hellenistic round-oval standing shield from the right side of b-035-039.jpg,
    with its embossed central bronze umbo boss, four radial reinforcement ribs, riveted rim, and stone armor stand!
    """
    b = GlbBuilder("assets/rooted-and-free/web/b-035-039.jpg")

    # 1. Carved Stone Armor Stand Plinth & Timber Back-Brace (grounded at y = 0)
    b.add_box(1.36, 0.24, 0.96, cx=0.0, cy=0.12, cz=0.0, uv_box=(0.15, 0.72, 0.85, 0.94), tint=(0.96, 0.90, 0.80), bevel=0.06)
    b.add_box(0.84, 0.18, 0.68, cx=0.0, cy=0.30, cz=-0.04, uv_box=(0.20, 0.74, 0.80, 0.92), tint=(1.00, 0.94, 0.84), bevel=0.06)
    # Rear timber support A-strut holding the great shield upright
    b.add_box(0.16, 1.15, 0.16, cx=0.0, cy=0.76, cz=-0.28, rx=0.32, uv_box=(0.20, 0.72, 0.60, 0.90), tint=(0.86, 0.72, 0.54), bevel=0.08)

    # 2. The Great Standing Shield ("above all, taking the shield of faith", Eph 6:16)
    #    Modeled directly from the large round/oval patinated bronze-and-iron shield in b-035-039.jpg (uv 0.58..0.92, 0.20..0.62)!
    sh_cy = 1.24
    sh_cz = 0.08
    sh_rx = 1.44  # Upright with a heroic 8-degree backward tilt

    # Domed Convex Shield Body + Riveted Bronze Outer Rim
    shield_prof = [
        (0.01, -0.18),   # Apex of the central bronze umbo boss (pointing forward when rx=1.44)
        (0.18, -0.16),
        (0.24, -0.09),   # Umbo flange collar
        (0.56, -0.06),   # Convex patinated bronze-slate shield field
        (0.84, 0.0),
        (0.92, 0.03),    # Heavy riveted bronze outer rim
        (0.92, 0.09),
        (0.82, 0.07),    # Inner concave back of the shield
        (0.45, 0.02),
        (0.01, 0.0),
    ]
    b.add_lathe(
        shield_prof,
        cx=0.0, cy=sh_cy, cz=sh_cz,
        rx=sh_rx,
        segs=40,
        uv_box=(0.60, 0.20, 0.92, 0.58),
        tint=(1.04, 1.02, 0.96),
        lift=0.03,
    )

    # 3. Embossed Golden-Bronze Central Umbo Boss & Collar Ring (sampled from the golden boss at uv (0.65..0.76, 0.35..0.49))
    b.add_lathe(
        [(0.01, -0.21), (0.16, -0.18), (0.25, -0.10), (0.26, -0.06)],
        cx=0.0, cy=sh_cy, cz=sh_cz,
        rx=sh_rx,
        segs=28,
        uv_box=(0.65, 0.35, 0.76, 0.49),
        tint=(1.22, 1.06, 0.72),
        lift=0.08,
    )

    # Four Crossed Bronze Reinforcement Straps radiating from the central boss to the rim (matching b-035-039.jpg!)
    for r_ang in [0.12, 0.12 + math.pi * 0.5, 0.12 + math.pi, 0.12 + math.pi * 1.5]:
        strap_pts = []
        for s in range(8):
            t = s / 7.0
            rad = 0.24 + t * 0.65
            lx = math.cos(r_ang) * rad
            lz = math.sin(r_ang) * rad
            ly = -0.09 + t * 0.12
            wx, wy, wz = rotate_point(lx, ly, lz, sh_rx, 0.0, 0.0)
            strap_pts.append((wx, sh_cy + wy, sh_cz + wz))
        b.add_tube(strap_pts, [0.028] * 8, segs=8, uv_box=(0.65, 0.35, 0.76, 0.49), tint=(1.18, 1.02, 0.68), lift=0.06)

    # Twin forged-iron arm-straps (enarmes) on the back of the standing shield
    for gx in [-0.26, 0.26]:
        b.add_tube(
            [(gx, sh_cy - 0.22, sh_cz - 0.04), (gx, sh_cy, sh_cz - 0.14), (gx, sh_cy + 0.22, sh_cz - 0.04)],
            [0.025, 0.028, 0.025],
            segs=8,
            uv_box=(0.35, 0.35, 0.55, 0.60),
            tint=(0.88, 0.72, 0.50),
        )

    b.export_glb(os.path.join(ROOT, "assets/models/shield-of-faith.glb"))


def build_open_shackles():
    """
    Slot 45: XXXVI · Joy in Chains (Philippians) — The Open Shackles † (Phil 1)
    Brief: "† — iron prison shackles, sprung open, on a prison stone"
    Modeled in the twilight stone and warm window-gold palette of b-036-010.jpg!
    """
    b = GlbBuilder("assets/joy-in-chains/web/b-036-010.jpg")

    # 1. Rough-Hewn Roman Prison Stone Block (grounded at y = 0, with warm golden window light across its top face)
    b.add_box(1.52, 0.56, 1.14, cx=0.0, cy=0.28, cz=0.0, uv_box=(0.42, 0.52, 0.78, 0.88), tint=(0.96, 0.94, 0.90), bevel=0.08)
    b.add_box(1.28, 0.26, 0.92, cx=0.0, cy=0.66, cz=0.0, uv_box=(0.45, 0.42, 0.68, 0.68), tint=(1.04, 1.00, 0.92), bevel=0.08)

    # Heavy forged-iron staple ring anchored into the center-back of the prison stone
    staple_pts = [(-0.10, 0.76, -0.22), (-0.10, 0.98, -0.22), (0.0, 1.06, -0.22), (0.10, 0.98, -0.22), (0.10, 0.76, -0.22)]
    b.add_tube(staple_pts, [0.038] * 5, segs=12, uv_box=(0.45, 0.15, 0.75, 0.38), tint=(0.82, 0.84, 0.88))

    # 2. Pair of Heavy Forged-Iron Roman Prison Shackles (Manacles), Sprung Wide Open!
    #    Left Shackle & Right Shackle: each has two curved hinged iron jaws with lock-eyes, sprung wide apart
    #    at a dramatic 115-degree open angle so the "sprung open" silhouette reads in two seconds from street distance!
    shackle_configs = [
        # Left Open Shackle (angled upright-left on the stone)
        (-0.38, 1.02, 0.06, 0.35, 0.25, -0.18),
        # Right Open Shackle (angled upright-right on the stone)
        (0.38, 1.06, 0.06, 0.32, -0.28, 0.16),
    ]

    for scx, scy, scz, srx, sry, srz in shackle_configs:
        # Central pivot hinge bolt of the shackle
        b.add_lathe(
            [(0.02, -0.08), (0.085, -0.06), (0.085, 0.06), (0.02, 0.08)],
            cx=scx, cy=scy - 0.22, cz=scz,
            rx=srx, ry=sry, rz=srz,
            segs=14,
            uv_box=(0.48, 0.20, 0.72, 0.42),
            tint=(0.88, 0.90, 0.94),
            lift=0.04,
        )

        # Left & Right Hinged Curved Iron Jaws of the Shackle — sprung wide open (gap of ~0.48 at the top!)
        for jaw_side in [-1.0, 1.0]:
            jaw_pts = []
            for s in range(14):
                t = s / 13.0
                # Normal closed shackle would sweep 0 -> pi; sprung-open shackle sweeps outward so the jaws flare wide open!
                ang = -math.pi * 0.5 + jaw_side * (0.12 + t * math.pi * 0.58)
                lx = math.cos(ang) * 0.28 + jaw_side * (0.14 * (t ** 1.4))
                ly = math.sin(ang) * 0.30 + 0.08 * t
                lz = 0.0
                wx, wy, wz = rotate_point(lx, ly, lz, srx, sry, srz)
                jaw_pts.append((scx + wx, scy + wy, scz + wz))

            b.add_tube(
                jaw_pts,
                [0.052] * 14,
                segs=12,
                uv_box=(0.48, 0.20, 0.72, 0.42),
                tint=(0.92, 0.94, 0.98),
                lift=0.05,
            )

            # Forged lock-lug eye at the open tip of each jaw (warm golden window light catching the sprung lock!)
            tip_x, tip_y, tip_z = jaw_pts[-1]
            b.add_box(
                0.13, 0.11, 0.11,
                cx=tip_x, cy=tip_y, cz=tip_z,
                rx=srx, ry=sry, rz=srz + jaw_side * 0.4,
                uv_box=(0.51, 0.36, 0.58, 0.50),  # Warm golden light from the window of b-036-010.jpg!
                tint=(1.22, 1.12, 0.86),
                lift=0.10,
                bevel=0.12,
            )

    # 3. Heavy Forged-Iron Chain Links & Sprung Sundered Link connecting the shackles across the prison stone
    chain_links = [
        (-0.24, 0.84, -0.04, 0.4, 0.5, 0.2, False),
        (-0.12, 0.88, -0.14, 1.1, 0.2, -0.3, False),
        (0.0, 0.92, -0.06, 0.3, -0.4, 0.8, True),   # Sundered/sprung middle chain link!
        (0.14, 0.88, -0.12, 1.2, -0.3, 0.2, False),
        (0.26, 0.84, -0.02, 0.5, -0.5, -0.2, False),
    ]
    for lcx, lcy, lcz, lrx, lry, lrz, is_open_link in chain_links:
        link_pts = []
        n_l = 14 if is_open_link else 17
        max_ang = math.pi * 1.55 if is_open_link else math.pi * 2.0
        for s in range(n_l):
            ang = (s / (n_l - 1)) * max_ang
            lx = math.cos(ang) * 0.11
            ly = math.sin(ang) * 0.065
            wx, wy, wz = rotate_point(lx, ly, 0.0, lrx, lry, lrz)
            link_pts.append((lcx + wx, lcy + wy, lcz + wz))
        b.add_tube(
            link_pts,
            [0.028] * n_l,
            segs=10,
            uv_box=(0.48, 0.20, 0.72, 0.42),
            tint=(1.15, 1.06, 0.84) if is_open_link else (0.90, 0.92, 0.96),
            lift=0.08 if is_open_link else 0.04,
        )

    b.export_glb(os.path.join(ROOT, "assets/models/open-shackles.glb"))


if __name__ == "__main__":
    build_grafted_branch()
    build_treasure_jar()
    build_shield_of_faith()
    build_open_shackles()

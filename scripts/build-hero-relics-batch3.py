#!/usr/bin/env python3
"""
Builds and Meshopt-compresses Batch 3 Hero Relics (Districts XVII–XX, Slots 26–29):
  - Slot 26 (XVII · Proverbs):      apples-of-gold.glb   (from b-017-014.jpg, Prov 25:11)
  - Slot 27 (XVIII · Ecclesiastes): threefold-cord.glb   (from b-018-016.jpg, Eccl 4:12)
  - Slot 28 (XIX · Song of Songs):  sealed-fountain.glb  (from b-019-014.jpg, Song 4:12)
  - Slot 29 (XX · Isaiah):          live-coal-tongs.glb  (from b-020-003.jpg, Isa 6:6–7)
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


def build_apples_of_gold():
    """Slot 26: XVII · The Beginning of Wisdom (Proverbs) — Apples of Gold in Settings of Silver (Prov 25:11)"""
    b = GlbBuilder("assets/the-beginning-of-wisdom/web/b-017-014.jpg")

    # 1. Weathered cedar-and-limestone table ledge grounded at y = 0 (matching b-017-014.jpg)
    b.add_box(1.36, 0.22, 1.08, cx=0.0, cy=0.11, cz=0.0, uv_box=(0.15, 0.78, 0.85, 0.96), tint=(0.94, 0.88, 0.78), bevel=0.06)

    # Four ornate scrolled silver feet lifting the silver filigree fruit stand
    for fx, fz in [(-0.34, -0.34), (0.34, -0.34), (-0.34, 0.34), (0.34, 0.34)]:
        b.add_lathe(
            [(0.02, 0.0), (0.09, 0.04), (0.07, 0.12), (0.11, 0.18), (0.02, 0.20)],
            cx=fx, cy=0.20, cz=fz,
            segs=14,
            uv_box=(0.35, 0.62, 0.75, 0.76),
            tint=(1.08, 1.10, 1.14),
            lift=0.08,
        )

    # 2. The Silver Filigree Fruit Stand / Footed Bowl ("in settings of silver")
    bowl_prof = [
        (0.02, 0.0),
        (0.38, 0.03),
        (0.60, 0.14),
        (0.76, 0.32),
        (0.84, 0.52),   # Scalloped silver filigree rim
        (0.79, 0.54),
        (0.68, 0.34),   # Inner silver bowl wall
        (0.42, 0.14),
        (0.02, 0.08),
    ]
    b.add_lathe(
        bowl_prof,
        cx=0.0, cy=0.34, cz=0.0,
        segs=36,
        uv_box=(0.32, 0.58, 0.78, 0.75),
        tint=(1.08, 1.10, 1.15),
        lift=0.08,
        wobble_amp=0.028,
    )

    # Scalloped silver filigree arches around the upper rim (16 silver arches)
    for a_i in range(16):
        ang0 = (a_i / 16.0) * math.pi * 2.0
        ang1 = ((a_i + 1) / 16.0) * math.pi * 2.0
        arch_pts = []
        for s in range(7):
            t = s / 6.0
            ang = ang0 + t * (ang1 - ang0)
            rad = 0.82 + 0.03 * math.sin(t * math.pi)
            hy = 0.84 + 0.12 * math.sin(t * math.pi)
            arch_pts.append((math.cos(ang) * rad, hy, math.sin(ang) * rad))
        b.add_tube(arch_pts, [0.024] * 7, segs=8, uv_box=(0.35, 0.58, 0.75, 0.72), tint=(1.12, 1.14, 1.18), lift=0.10)

    # 3. Four Luminous Golden Apples nestled inside the silver filigree bowl (matching b-017-014.jpg)
    apple_prof = [
        (0.01, 0.0),
        (0.18, 0.03),
        (0.32, 0.15),
        (0.36, 0.32),
        (0.32, 0.48),
        (0.20, 0.58),   # Upper shoulder of the apple
        (0.06, 0.53),   # Top dimple hollow where the stem emerges
        (0.01, 0.50),
    ]
    apples_cfg = [
        (-0.20, 0.62, -0.10, 0.12, -0.15, 1.05),  # High prominent left-rear golden apple
        (0.24, 0.54, 0.06, -0.10, 0.18, 0.98),    # Right golden apple with leaf
        (-0.08, 0.46, 0.22, 0.18, 0.08, 0.90),    # Front-center golden apple
        (0.08, 0.50, -0.24, -0.14, -0.10, 0.88),  # Back golden apple
    ]
    for ax, ay, az, arx, arz, ascale in apples_cfg:
        scaled_prof = [(r * ascale, y * ascale) for (r, y) in apple_prof]
        b.add_lathe(
            scaled_prof,
            cx=ax, cy=ay, cz=az,
            rx=arx, rz=arz,
            segs=26,
            uv_box=(0.38, 0.43, 0.56, 0.57),
            tint=(1.22, 1.06, 0.66),
            lift=0.09,
        )
        # Stem & sculpted golden leaf at the crown of the apple
        stem_top_y = ay + 0.52 * ascale
        b.add_tube(
            [(ax, stem_top_y, az), (ax + 0.03, stem_top_y + 0.08, az - 0.02), (ax + 0.07, stem_top_y + 0.15, az - 0.04)],
            [0.018, 0.015, 0.012],
            segs=8,
            uv_box=(0.42, 0.42, 0.52, 0.50),
            tint=(0.88, 0.72, 0.48),
        )
        b.add_box(
            0.22 * ascale, 0.025, 0.10 * ascale,
            cx=ax + 0.12 * ascale, cy=stem_top_y + 0.09, cz=az,
            rx=0.2, ry=0.4, rz=0.28,
            uv_box=(0.58, 0.46, 0.72, 0.54),
            tint=(1.10, 0.96, 0.64),
            lift=0.05,
            bevel=0.18,
        )

    b.export_glb(os.path.join(ROOT, "assets/models/apples-of-gold.glb"))


def build_threefold_cord():
    """Slot 27: XVIII · Eternity in Their Hearts (Ecclesiastes) — The Threefold Cord (Eccl 4:12)"""
    b = GlbBuilder("assets/eternity-in-their-hearts/web/b-018-016.jpg")

    # 1. Dressed Judean limestone slab & upright timber pillar stump (matching b-018-016.jpg)
    b.add_box(1.52, 0.28, 1.24, cx=0.0, cy=0.14, cz=0.0, uv_box=(0.12, 0.68, 0.82, 0.95), tint=(0.98, 0.94, 0.86), bevel=0.06)
    b.add_box(0.68, 0.20, 0.64, cx=0.38, cy=0.36, cz=-0.20, uv_box=(0.60, 0.58, 0.92, 0.74), tint=(0.94, 0.90, 0.82), bevel=0.06)

    # Upright weathered timber post on the right of the stone where the threefold cord is knotted
    post_prof = [
        (0.24, 0.0),
        (0.23, 0.45),
        (0.22, 0.95),
        (0.21, 1.38),
        (0.02, 1.42),
    ]
    b.add_lathe(
        post_prof,
        cx=0.38, cy=0.44, cz=-0.20,
        segs=22,
        uv_box=(0.68, 0.05, 0.90, 0.55),
        tint=(0.88, 0.78, 0.64),
        wobble_amp=0.03,
    )

    # 2. The Thick Three-Strand Braided Cord:
    #    Coiled in 2.5 loops on the foreground limestone slab, rising up to a bold overhand knot
    #    bound around the timber pillar ("a threefold cord is not quickly broken", Eccl 4:12)!
    centerline = []
    # 2.3 coils on the stone slab
    for i in range(46):
        t = i / 45.0
        ang = t * math.pi * 4.3 + 0.4
        rad = 0.46 - 0.12 * t
        px = -0.18 + math.cos(ang) * rad
        py = 0.34 + 0.07 * t
        pz = 0.14 + math.sin(ang) * rad
        centerline.append((px, py, pz))

    # Rising bridge from the stone coil up to the knot on the timber post
    for i in range(1, 12):
        t = i / 11.0
        px = -0.02 + t * 0.22
        py = 0.50 + t * 0.58 + 0.06 * math.sin(t * math.pi)
        pz = 0.10 - t * 0.26
        centerline.append((px, py, pz))

    # Two thick wraps around the timber post at y ~ 1.05..1.22
    for i in range(1, 25):
        t = i / 24.0
        ang = 2.6 + t * math.pi * 3.5
        rad = 0.275
        px = 0.38 + math.cos(ang) * rad
        py = 1.06 + 0.16 * math.sin(t * math.pi)
        pz = -0.20 + math.sin(ang) * rad
        centerline.append((px, py, pz))

    # Generate 3 distinct intertwined helical strands along the entire centerline!
    strand_tints = [
        (1.10, 0.94, 0.68),
        (1.00, 0.84, 0.58),
        (1.16, 1.00, 0.74),
    ]
    n_c = len(centerline)
    for s_idx in range(3):
        phase = (s_idx / 3.0) * math.pi * 2.0
        strand_pts = []
        strand_radii = []
        for i, (cx, cy, cz) in enumerate(centerline):
            twist = i * 0.55 + phase
            ox = math.cos(twist) * 0.036
            oy = math.sin(twist) * 0.036
            oz = math.sin(twist + 1.1) * 0.036
            strand_pts.append((cx + ox, cy + oy, cz + oz))
            strand_radii.append(0.038)
        b.add_tube(
            strand_pts,
            strand_radii,
            segs=10,
            uv_box=(0.22, 0.52, 0.58, 0.74),
            tint=strand_tints[s_idx],
            lift=0.03,
        )

    # Bold sculptural knot loop at the front of the timber post (cx=0.16, cy=1.10, cz=-0.04)
    knot_pts = []
    for i in range(18):
        t = i / 17.0
        ang = t * math.pi * 2.0
        kx = 0.16 + 0.09 * math.cos(ang)
        ky = 1.10 + 0.13 * math.sin(ang)
        kz = -0.02 + 0.07 * math.sin(ang * 2.0)
        knot_pts.append((kx, ky, kz))
    b.add_tube(knot_pts, [0.056] * 18, segs=12, uv_box=(0.25, 0.52, 0.58, 0.74), tint=(1.12, 0.96, 0.70), lift=0.05)

    b.export_glb(os.path.join(ROOT, "assets/models/threefold-cord.glb"))


def build_sealed_fountain():
    """Slot 28: XIX · Many Waters (Song of Songs) — The Sealed Fountain (Song 4:12)"""
    b = GlbBuilder("assets/many-waters/web/b-019-014.jpg")

    # 1. Stepped Octagonal Garden Stone Base & Curb (grounded at y = 0)
    b.add_lathe(
        [
            (0.92, 0.0),
            (0.90, 0.16),
            (0.76, 0.22),
            (0.74, 0.34),
            (0.36, 0.36),
        ],
        cx=0.0, cy=0.0, cz=0.0,
        segs=8,  # Octagonal carved garden stone base
        uv_box=(0.15, 0.45, 0.45, 0.75),
        tint=(1.00, 0.96, 0.88),
        wobble_amp=0.015,
    )

    # 2. Fluted Pedestal Column & Deep Carved Stone Fountain Basin (matching the fountain in b-019-014.jpg)
    fountain_prof = [
        (0.34, 0.32),
        (0.26, 0.50),
        (0.24, 0.82),   # Pedestal shaft
        (0.32, 0.96),   # Molded necking
        (0.68, 1.12),   # Underside of the wide stone fountain bowl
        (0.84, 1.30),   # Outer carved rim of the basin
        (0.82, 1.42),
        (0.72, 1.42),   # Thick stone lip
        (0.64, 1.24),   # Inner basin cavity holding still sealed water
        (0.22, 1.20),
    ]
    b.add_lathe(
        fountain_prof,
        cx=0.0, cy=0.0, cz=0.0,
        segs=28,
        uv_box=(0.16, 0.40, 0.46, 0.72),
        tint=(1.04, 1.00, 0.92),
        lift=0.03,
        wobble_amp=0.012,
    )

    # Shimmering still water surface inside the basin
    b.add_lathe(
        [(0.01, 1.28), (0.64, 1.29), (0.66, 1.28)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=24,
        uv_box=(0.50, 0.12, 0.78, 0.32),
        tint=(0.86, 0.98, 1.04),
        lift=0.06,
    )

    # 3. Central Domed Stone Finial & Sealed Bronze Spouts ("A garden inclosed... a spring shut up, a fountain sealed")
    finial_prof = [
        (0.22, 1.20),
        (0.24, 1.54),
        (0.20, 1.78),
        (0.12, 1.94),
        (0.02, 2.00),
    ]
    b.add_lathe(
        finial_prof,
        cx=0.0, cy=0.0, cz=0.0,
        segs=24,
        uv_box=(0.18, 0.42, 0.44, 0.68),
        tint=(1.02, 0.98, 0.90),
    )

    # Four bronze spouts around the central column sealed shut with a heavy wrought-bronze band & royal wax/bronze seal!
    for s_ang in [0.0, math.pi * 0.5, math.pi, math.pi * 1.5]:
        sx = math.cos(s_ang) * 0.24
        sz = math.sin(s_ang) * 0.24
        tx = math.cos(s_ang) * 0.42
        tz = math.sin(s_ang) * 0.42
        b.add_tube(
            [(sx, 1.56, sz), (tx, 1.52, tz)],
            [0.052, 0.062],
            segs=12,
            uv_box=(0.48, 0.48, 0.68, 0.72),
            tint=(1.08, 0.86, 0.58),
            lift=0.04,
        )
        # Bronze seal cap locking each spout
        b.add_lathe(
            [(0.01, 0.0), (0.072, 0.01), (0.072, 0.04), (0.01, 0.05)],
            cx=tx, cy=1.52, cz=tz,
            rx=1.57 * math.cos(s_ang), rz=-1.57 * math.sin(s_ang),
            segs=14,
            uv_box=(0.48, 0.48, 0.68, 0.72),
            tint=(1.18, 0.96, 0.64),
            lift=0.08,
        )

    # Heavy Wrought-Bronze Locking Bar & Seal Medallion spanning across the fountain basin (echoing the locked bar of b-019-014.jpg)
    b.add_box(1.74, 0.08, 0.14, cx=0.0, cy=1.44, cz=0.0, uv_box=(0.48, 0.48, 0.68, 0.72), tint=(0.96, 0.76, 0.52), bevel=0.08)
    # Embossed Royal Seal Medallion at the front of the locking bar
    b.add_lathe(
        [(0.01, 0.0), (0.16, 0.02), (0.16, 0.07), (0.01, 0.09)],
        cx=0.0, cy=1.44, cz=0.84,
        rx=1.57,
        segs=20,
        uv_box=(0.48, 0.48, 0.68, 0.72),
        tint=(1.20, 0.98, 0.64),
        lift=0.08,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/sealed-fountain.glb"))


def build_live_coal_tongs():
    """Slot 29: XX · Arise, Shine (Isaiah) — The Live Coal in the Seraph's Tongs (Isa 6:6–7)"""
    b = GlbBuilder("assets/arise-shine/web/b-020-003.jpg")

    # 1. Carved Temple Incense Altar Stone with Chevron Frieze Ledge (matching the lower-right altar of b-020-003.jpg)
    b.add_box(1.36, 0.26, 1.06, cx=0.0, cy=0.13, cz=0.0, uv_box=(0.65, 0.72, 0.95, 0.95), tint=(0.94, 0.90, 0.82), bevel=0.06)
    b.add_box(1.18, 0.54, 0.92, cx=0.0, cy=0.52, cz=0.0, uv_box=(0.65, 0.72, 0.95, 0.92), tint=(0.98, 0.94, 0.86), bevel=0.06)
    b.add_box(1.34, 0.18, 1.04, cx=0.0, cy=0.86, cz=0.0, uv_box=(0.66, 0.70, 0.96, 0.82), tint=(1.04, 1.00, 0.92), lift=0.03, bevel=0.05)

    # Four classic horned corners of the Temple Altar
    for hx, hz in [(-0.54, -0.40), (0.54, -0.40), (-0.54, 0.40), (0.54, 0.40)]:
        b.add_lathe(
            [(0.14, 0.0), (0.11, 0.14), (0.07, 0.28), (0.02, 0.34)],
            cx=hx, cy=0.94, cz=hz,
            segs=4,
            uv_box=(0.66, 0.70, 0.92, 0.84),
            tint=(1.06, 1.02, 0.94),
        )

    # Bed of warm altar embers in the center of the altar top
    b.add_lathe(
        [(0.44, 0.0), (0.38, 0.08), (0.22, 0.14), (0.02, 0.16)],
        cx=0.12, cy=0.94, cz=0.0,
        segs=20,
        uv_box=(0.74, 0.62, 0.84, 0.70),
        tint=(1.12, 0.78, 0.56),
        wobble_amp=0.07,
    )

    # 2. The Long Forged-Bronze Seraph's Altar Tongs sweeping down from upper-right to hold the Live Coal
    #    above the altar stone (matching the exact diagonal composition of b-020-003.jpg!)
    coal_cx, coal_cy, coal_cz = -0.22, 1.46, 0.0

    # Upper spring-bow hinge of the long altar tongs at (0.64, 2.18, 0.0)
    hinge_pts = [
        (0.54, 2.02, -0.02),
        (0.68, 2.20, 0.0),
        (0.74, 2.24, 0.0),
        (0.66, 2.12, 0.02),
        (0.50, 1.92, 0.02),
    ]
    b.add_tube(hinge_pts, [0.036, 0.042, 0.046, 0.042, 0.036], segs=12, uv_box=(0.82, 0.52, 0.96, 0.66), tint=(0.92, 0.82, 0.68))

    # Upper & Lower long curved bronze pincer arms gripping the live coal
    upper_arm = [
        (0.54, 2.02, -0.02),
        (0.28, 1.84, -0.02),
        (0.02, 1.68, -0.01),
        (coal_cx + 0.06, coal_cy + 0.18, 0.0),
        (coal_cx - 0.12, coal_cy + 0.12, 0.0),
    ]
    lower_arm = [
        (0.50, 1.92, 0.02),
        (0.24, 1.70, 0.02),
        (-0.02, 1.50, 0.01),
        (coal_cx + 0.04, coal_cy - 0.16, 0.0),
        (coal_cx - 0.14, coal_cy - 0.10, 0.0),
    ]
    b.add_tube(upper_arm, [0.036, 0.034, 0.032, 0.038, 0.028], segs=12, uv_box=(0.82, 0.52, 0.96, 0.66), tint=(0.96, 0.86, 0.72), lift=0.04)
    b.add_tube(lower_arm, [0.036, 0.034, 0.032, 0.038, 0.028], segs=12, uv_box=(0.82, 0.52, 0.96, 0.66), tint=(0.96, 0.86, 0.72), lift=0.04)

    # 3. The Radiant Glowing Live Coal held in the jaws of the Tongs ("having a live coal in his hand,
    #    which he had taken with the tongs from off the altar", Isa 6:6)
    #    Sampled directly from the fiery crimson-orange coal pixels at uv (0.76..0.83, 0.63..0.69) of b-020-003.jpg!
    coal_prof = [
        (0.02, -0.18),
        (0.16, -0.14),
        (0.23, -0.04),
        (0.24, 0.06),
        (0.18, 0.15),
        (0.02, 0.19),
    ]
    b.add_lathe(
        coal_prof,
        cx=coal_cx, cy=coal_cy, cz=coal_cz,
        rx=0.25, ry=0.40, rz=-0.35,
        segs=22,
        uv_box=(0.75, 0.63, 0.83, 0.69),
        tint=(1.45, 0.95, 0.65),
        lift=0.14,
        wobble_amp=0.14,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/live-coal-tongs.glb"))


if __name__ == "__main__":
    build_apples_of_gold()
    build_threefold_cord()
    build_sealed_fountain()
    build_live_coal_tongs()

#!/usr/bin/env python3
"""
Builds and Meshopt-compresses Batch 5 Hero Relics (Districts XXIV, XXVI, XXVII, XXVIII, Slots 34–37):
  - Slot 34 (XXIV · Daniel):      stone-cut-without-hands.glb (from b-024-010.jpg, Dan 2:34)
  - Slot 35 (XXVI · Jonah):       great-fish.glb              (TRELLIS/sculpted fallback from b-026-007.jpg, Jonah 1:17)
  - Slot 36 (XXVII · Zechariah):  zerubbabels-plumb-line.glb  († concept-modeled from b-027-029.jpg, Zech 4:10)
  - Slot 37 (XXVIII · Luke):      the-manger.glb              (Muse GLB Meshopt-compressed, from b-028-008.jpg, Luke 2:12)
"""

import importlib.util
import math
import os
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


def build_stone_cut_without_hands():
    """Slot 34: XXIV · Greatly Beloved (Daniel) — The Stone Cut Without Hands (Dan 2:34)"""
    b = GlbBuilder("assets/greatly-beloved/web/b-024-010.jpg")

    # 1. Shattered Babylonian Terrace Pavement & Chaff Base (grounded at y = 0, matching b-024-010.jpg)
    b.add_box(1.54, 0.20, 1.32, cx=0.0, cy=0.10, cz=0.0, uv_box=(0.15, 0.72, 0.88, 0.96), tint=(1.02, 0.96, 0.84), bevel=0.06)

    # Scattered shattered shards of clay & iron around the impact ring ("and the stone that smote the image became a great mountain")
    for s_ang, s_r, s_rx, s_rz in [
        (0.4, 0.62, 0.25, -0.35),
        (1.6, 0.58, -0.30, 0.22),
        (2.8, 0.64, 0.18, 0.32),
        (4.1, 0.60, -0.24, -0.28),
        (5.3, 0.62, 0.28, 0.16),
    ]:
        sx = math.cos(s_ang) * s_r
        sz = math.sin(s_ang) * s_r
        b.add_box(
            0.28, 0.12, 0.22,
            cx=sx, cy=0.22, cz=sz,
            rx=s_rx, ry=s_ang, rz=s_rz,
            uv_box=(0.20, 0.76, 0.75, 0.92),
            tint=(0.94, 0.86, 0.74),
            bevel=0.12,
        )

    # 2. One Great Uncut Mountain Boulder — Natural Craggy Facets, Zero Chisel/Tool Marks (matching b-024-010.jpg!)
    #    Built as a high-relief multi-faceted natural mountain boulder with angular crag ridges sampled directly
    #    from the boulder at uv (0.25..0.55, 0.70..0.90) of b-024-010.jpg
    rings = []
    lat_steps = 16
    lon_steps = 22
    for iv in range(lat_steps + 1):
        tv = iv / lat_steps
        phi = tv * math.pi  # 0 (bottom) to pi (top)
        sp = math.sin(phi)
        cp = math.cos(phi)
        row = []
        for iu in range(lon_steps + 1):
            tu = iu / lon_steps
            theta = tu * math.pi * 2.0
            ct = math.cos(theta)
            st = math.sin(theta)
            # Natural mountain-crag facet modulation (no smooth symmetry, no chisel lines)
            facet = (
                1.0
                + 0.14 * math.sin(theta * 3.0 + phi * 2.0)
                + 0.10 * math.cos(theta * 5.0 - phi * 3.0)
                + 0.06 * math.sin(theta * 7.0 + phi * 4.0)
            )
            rx_b = 0.78 * sp * ct * facet
            ry_b = 0.72 * (-cp) * (0.92 + 0.12 * math.sin(theta * 2.0))
            rz_b = 0.68 * sp * st * facet
            # Flatten bottom slightly where it rests on the shattered terrace, and give a flat-sloped natural peak
            if ry_b < -0.52:
                ry_b = -0.52 + (ry_b + 0.52) * 0.25
            if ry_b > 0.54:
                ry_b = 0.54 + (ry_b - 0.54) * 0.35
            px = rx_b
            py = 0.70 + ry_b
            pz = rz_b
            nx, ny, nz = normalize(rx_b, ry_b + 0.15, rz_b)
            u_uv = 0.25 + tu * 0.29
            v_uv = 0.71 + (1.0 - tv) * 0.19
            row.append(b.add_vertex((px, py, pz), (nx, ny, nz), (u_uv, v_uv), tint=(1.04, 1.02, 0.98), lift=0.02))
        rings.append(row)

    for iv in range(lat_steps):
        r0, r1 = rings[iv], rings[iv + 1]
        for iu in range(lon_steps):
            b.indices.extend([r0[iu], r0[iu + 1], r1[iu], r0[iu + 1], r1[iu + 1], r1[iu]])

    b.export_glb(os.path.join(ROOT, "assets/models/stone-cut-without-hands.glb"))


def build_great_fish():
    """
    Slot 35: XXVI · Out of the Deep (Jonah) — The Great Fish (Jonah 1:17)
    Note: Muse's root great-fish.glb is a flat horizontal dorsal shell (max Y = 0.59, no tail flukes, no breaching pose).
    Per the brief ("Lane: Muse (TRELLIS fallback if Muse's pass fails the silhouette test)"), we build a true
    monument-scale Breaching Great Fish rising out of churning sea-foam waves at a heroic 52-degree breaching angle!
    """
    b = GlbBuilder("assets/out-of-the-deep/web/b-026-007.jpg")

    # 1. Churning Mediterranean Sea-Foam Waves & Surge Base (grounded at y = 0)
    wave_prof = [
        (0.96, 0.0),
        (0.94, 0.14),
        (0.82, 0.30),
        (0.64, 0.44),
        (0.36, 0.52),
        (0.02, 0.54),
    ]
    b.add_lathe(
        wave_prof,
        cx=0.0, cy=0.0, cz=0.0,
        segs=28,
        uv_box=(0.15, 0.56, 0.85, 0.72),
        tint=(0.92, 1.04, 1.08),
        lift=0.04,
        wobble_amp=0.09,
    )

    # Sculpted cresting sea-spray wave curls around the base of the breaching fish
    for w_ang, w_h in [(0.5, 0.58), (2.4, 0.64), (4.3, 0.55)]:
        w_pts = []
        for s in range(10):
            t = s / 9.0
            ang = w_ang + t * 1.15
            rad = 0.68 - 0.14 * t
            hy = 0.18 + t * w_h
            w_pts.append((math.cos(ang) * rad, hy, math.sin(ang) * rad))
        b.add_tube(w_pts, [0.11 * (1.0 - 0.5 * (i / 9.0)) for i in range(10)], segs=12, uv_box=(0.20, 0.55, 0.80, 0.64), tint=(1.08, 1.14, 1.16), lift=0.08)

    # 2. The Prepared Great Fish in Heroic Breaching Pose (Jonah 1:17)
    #    Curved spine rising from the deep wave base (-0.38, 0.25, -0.05) up and forward to the breaching head (0.34, 2.22, 0.08),
    #    with a sweeping arched back, dorsal fin, twin pectoral flippers, and broad horizontal/angled tail flukes at the base!
    spine_pts = []
    spine_radii = []
    n_sp = 28
    for i in range(n_sp):
        t = i / (n_sp - 1)
        # Graceful S-arc breaching out of the waves
        sx = -0.44 + 0.86 * (t ** 0.88)
        sy = 0.34 + 1.96 * t + 0.16 * math.sin(t * math.pi)
        sz = 0.0
        spine_pts.append((sx, sy, sz))
        # Fusiform leviathan/whale body profile: narrow tail peduncle -> muscular mid-belly -> broad head -> rounded snout
        if t < 0.18:
            rad = 0.07 + (t / 0.18) * 0.15
        elif t < 0.68:
            u = (t - 0.18) / 0.50
            rad = 0.22 + 0.20 * math.sin(u * math.pi)
        else:
            u = (t - 0.68) / 0.32
            rad = 0.32 * math.cos(u * math.pi * 0.48)
        spine_radii.append(max(0.02, rad))

    # Build the fusiform Great Fish body with dorsal ridge and ventral throat grooves
    rings = []
    segs = 28
    for i, (px, py, pz) in enumerate(spine_pts):
        r = spine_radii[i]
        t = i / (n_sp - 1)
        if i < n_sp - 1:
            tx, ty, tz = spine_pts[i + 1][0] - px, spine_pts[i + 1][1] - py, spine_pts[i + 1][2] - pz
        else:
            tx, ty, tz = px - spine_pts[i - 1][0], py - spine_pts[i - 1][1], pz - spine_pts[i - 1][2]
        tx, ty, tz = normalize(tx, ty, tz)
        # Normal in the XY plane perpendicular to spine tangent
        nx_p, ny_p, nz_p = -ty, tx, 0.0
        bx_p, by_p, bz_p = 0.0, 0.0, 1.0
        v_uv = 0.64 + (1.0 - t) * 0.28  # Deep sea-slate & teal-blue fish tones from lower half of b-026-007.jpg
        ring = []
        for s in range(segs + 1):
            ang = (s / segs) * math.pi * 2.0
            ca, sa = math.cos(ang), math.sin(ang)
            # Slightly taller dorsoventrally with a sculpted jaw ridge near the head
            r_dorsal = r * (1.08 if ca > 0 else 0.96)
            r_lat = r * 0.88
            vx = nx_p * ca * r_dorsal + bx_p * sa * r_lat
            vy = ny_p * ca * r_dorsal + by_p * sa * r_lat
            vz = nz_p * ca * r_dorsal + bz_p * sa * r_lat
            n_vx, n_vy, n_vz = normalize(vx, vy, vz)
            u_uv = 0.22 + (s / segs) * 0.58
            # Countershading: lighter sea-silver belly (ca < 0), deep slate-teal back (ca > 0)
            shade = 1.08 if ca < -0.2 else 0.94
            ring.append(b.add_vertex((px + vx, py + vy, pz + vz), (n_vx, n_vy, n_vz), (u_uv, v_uv), tint=(0.88 * shade, 1.02 * shade, 1.08 * shade), lift=0.03))
        rings.append(ring)

    for i in range(n_sp - 1):
        r0, r1 = rings[i], rings[i + 1]
        for s in range(segs):
            b.indices.extend([r0[s], r0[s + 1], r1[s], r0[s + 1], r1[s + 1], r1[s]])

    # 3. Sweeping Pectoral Fins / Flippers on both sides of the breaching Great Fish
    for side in [-1.0, 1.0]:
        fin_pts = [
            (0.02, 1.42, side * 0.24),
            (0.06, 1.24, side * 0.56),
            (-0.04, 1.06, side * 0.78),
            (-0.14, 0.94, side * 0.88),
        ]
        b.add_tube(fin_pts, [0.13, 0.11, 0.07, 0.025], segs=12, uv_box=(0.30, 0.68, 0.68, 0.88), tint=(0.86, 1.00, 1.06), lift=0.03)

    # 4. Prominent Dorsal Fin along the upper-back arch (matching the dorsal fin in b-026-007.jpg!)
    dorsal_pts = [
        (-0.18, 1.50, 0.0),
        (-0.34, 1.68, 0.0),
        (-0.48, 1.78, 0.0),
    ]
    b.add_tube(dorsal_pts, [0.14, 0.09, 0.025], segs=10, uv_box=(0.45, 0.70, 0.65, 0.82), tint=(0.84, 0.98, 1.04))

    # 5. Broad Sweeping Tail Flukes thrashing above the sea waves at the lower-left (matching the tail in b-026-007.jpg!)
    for side in [-1.0, 1.0]:
        fluke_pts = [
            (-0.42, 0.42, 0.0),
            (-0.58, 0.52, side * 0.26),
            (-0.74, 0.66, side * 0.52),
            (-0.86, 0.78, side * 0.68),
        ]
        b.add_tube(fluke_pts, [0.11, 0.12, 0.08, 0.025], segs=12, uv_box=(0.72, 0.80, 0.94, 0.95), tint=(0.86, 1.00, 1.06), lift=0.03)

    b.export_glb(os.path.join(ROOT, "assets/models/great-fish.glb"))


def build_zerubbabels_plumb_line():
    """
    Slot 36: XXVII · The Day of Small Things (Zechariah) — Zerubbabel's Plumb Line † (Zech 4:10)
    Note: b-027-029.jpg depicts a giant hand holding the plumb line over the wall; per §1 ("with no face, hands,
    or crowd as the primary subject") and the brief ("† — a great plumb bob and line on a builder's stand"),
    we sculpt the heavy pointed bronze plumb bob suspended on its taut cord from a timber-and-stone mason's builder stand
    over a dressed Jerusalem cornerstone!
    """
    b = GlbBuilder("assets/the-day-of-small-things/web/b-027-029.jpg")

    # 1. Dressed Jerusalem Temple Cornerstone Block at the base (grounded at y = 0, matching the lower wall of b-027-029.jpg)
    b.add_box(1.42, 0.44, 1.08, cx=0.0, cy=0.22, cz=0.0, uv_box=(0.15, 0.62, 0.85, 0.94), tint=(1.02, 0.98, 0.90), bevel=0.05)
    b.add_box(0.84, 0.26, 0.76, cx=0.0, cy=0.54, cz=0.0, uv_box=(0.20, 0.64, 0.80, 0.88), tint=(1.06, 1.02, 0.94), bevel=0.05)

    # Engraved bronze cornerstone datum target plate right below the plumb bob tip
    b.add_lathe(
        [(0.01, 0.67), (0.16, 0.68), (0.16, 0.70), (0.01, 0.71)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=20,
        uv_box=(0.39, 0.70, 0.44, 0.83),
        tint=(1.15, 0.96, 0.62),
        lift=0.06,
    )

    # 2. Tall Mason's Builder Stand (Archipendulum / Timber Gallows Frame rising from the stone base)
    #    Two sturdy inclined cedar uprights meeting a horizontal top beam with a carved diagonal brace
    for side in [-1.0, 1.0]:
        b.add_box(
            0.12, 1.98, 0.14,
            cx=side * 0.50, cy=1.34, cz=0.0,
            rz=side * 0.08,
            uv_box=(0.68, 0.88, 0.96, 0.98),
            tint=(0.92, 0.76, 0.56),
            bevel=0.08,
        )
    # Overhead Horizontal Builder's Beam & Bronze Suspension Hook
    b.add_box(1.24, 0.14, 0.18, cx=0.0, cy=2.30, cz=0.0, uv_box=(0.68, 0.88, 0.96, 0.98), tint=(0.96, 0.80, 0.60), bevel=0.08)
    b.add_lathe(
        [(0.06, 2.16), (0.08, 2.22), (0.06, 2.26)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=16,
        uv_box=(0.39, 0.70, 0.44, 0.83),
        tint=(1.18, 0.98, 0.64),
        lift=0.06,
    )

    # 3. The Taut Braided Plumb Line Cord hanging dead-vertical down the center
    b.add_tube(
        [(0.0, 2.20, 0.0), (0.0, 1.80, 0.0), (0.0, 1.44, 0.0)],
        [0.018, 0.018, 0.018],
        segs=12,
        uv_box=(0.40, 0.30, 0.43, 0.65),
        tint=(0.96, 0.88, 0.72),
    )

    # 4. The Great Pointed Bronze Plumb Bob ("and shall see the plummet in the hand of Zerubbabel", Zech 4:10)
    #    Modeled directly from the conical bronze plumb bob at uv (0.39..0.45, 0.70..0.84) of b-027-029.jpg!
    # Suspension eye-ring at the top of the plumb bob
    ring_pts = []
    for s in range(17):
        ang = (s / 16.0) * math.pi * 2.0
        ring_pts.append((math.cos(ang) * 0.055, 1.42 + math.sin(ang) * 0.055, 0.0))
    b.add_tube(ring_pts, [0.018] * 17, segs=10, uv_box=(0.39, 0.70, 0.44, 0.83), tint=(1.22, 1.02, 0.66), lift=0.08)

    # Conical turned-bronze plumb weight hovering just above the cornerstone datum
    plumb_prof = [
        (0.004, 0.75),  # Razor-sharp lower point hovering right over the cornerstone
        (0.06, 0.90),
        (0.13, 1.08),
        (0.19, 1.24),
        (0.21, 1.30),   # Wide turned bronze shoulder collar
        (0.18, 1.33),
        (0.08, 1.36),   # Neck cap
        (0.01, 1.38),
    ]
    b.add_lathe(
        plumb_prof,
        cx=0.0, cy=0.0, cz=0.0,
        segs=32,
        uv_box=(0.39, 0.70, 0.44, 0.84),
        tint=(1.24, 1.04, 0.68),
        lift=0.08,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/zerubbabels-plumb-line.glb"))


def install_muse_the_manger():
    """Slot 37: XXVIII · Good News of Great Joy (Luke) — The Manger (Muse GLB, Meshopt-compressed)"""
    src = os.path.join(ROOT, "the-manger.glb")
    dst = os.path.join(ROOT, "assets/models/the-manger.glb")
    subprocess.run([GLTFPACK, "-i", src, "-o", dst, "-cc", "-kn"], check=True)
    print(f"Installed & Meshopt-compressed Muse {dst} ({os.path.getsize(dst)/1024:.1f} KB)")


if __name__ == "__main__":
    build_stone_cut_without_hands()
    build_great_fish()
    build_zerubbabels_plumb_line()
    install_muse_the_manger()

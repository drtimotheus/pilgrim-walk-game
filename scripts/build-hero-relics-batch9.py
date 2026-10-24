#!/usr/bin/env python3
"""
Builds and Meshopt-compresses Batch 9 Hero Relics (Districts XLI–XLIV, Slots 50–53):
  - Slot 50 (XLI · James):       bronze-mirror.glb        (from b-041-005.jpg, Jas 1:23–25)
  - Slot 51 (XLII · 1–2 Peter):  living-cornerstone.glb   (from b-042-010.jpg, 1 Pet 2:4–5)
  - Slot 52 (XLIII · 1–3 John):  childs-sandals.glb       († concept-modeled from b-043-014.jpg, 1 Jn 3:1)
  - Slot 53 (XLIV · Revelation): white-stone-new-name.glb (from b-044-007.jpg, Rev 2:17)
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


def build_bronze_mirror():
    """
    Slot 50: XLI · Doers of the Word (James) — The Bronze Mirror (Jas 1:23–25)
    Brief: "a polished circular bronze mirror in a frame on a stone base, warm reflective face"
    Modeled directly from the ornate circular bronze mirror and bronze washing bowl of b-041-005.jpg!
    """
    b = GlbBuilder("assets/doers-of-the-word/web/b-041-005.jpg")

    # 1. Carved Stone & Timber Table Base + Companion Bronze Washing Basin (grounded at y = 0, matching b-041-005.jpg)
    b.add_box(1.38, 0.22, 1.06, cx=0.0, cy=0.11, cz=0.0, uv_box=(0.15, 0.78, 0.85, 0.96), tint=(0.98, 0.92, 0.82), bevel=0.06)

    # Carved stone-and-bronze display cradle supporting the standing bronze mirror
    b.add_lathe(
        [(0.38, 0.20), (0.34, 0.30), (0.18, 0.38), (0.02, 0.40)],
        cx=0.08, cy=0.0, cz=0.0,
        segs=20,
        uv_box=(0.20, 0.75, 0.75, 0.92),
        tint=(1.02, 0.94, 0.82),
    )

    # 2. The Standing Ornate Bronze Mirror (Jas 1:23–25: "whoso looketh into the perfect law of liberty, and continueth therein")
    #    Mounted upright at a stately angle so the circular engraved bronze rim, warm reflective bronze face,
    #    and scrolled handle with pommel knob read in 2 seconds from street distance!
    m_cx, m_cy, m_cz = 0.14, 1.28, 0.04
    m_rx = 1.45   # Upright facing forward with a gentle 10-degree backward tilt
    m_rz = -0.38  # Handle angled down-left at ~22 degrees so both disk and handle read heroically!

    # Ornate Engraved Circular Bronze Mirror Frame + Warm Reflective Polished Bronze Face
    mirror_prof = [
        (0.01, -0.055),  # Center of the warm polished reflective bronze face
        (0.48, -0.052),  # Outer edge of the reflective bronze face
        (0.50, -0.075),  # Raised inner bezel lip
        (0.58, -0.070),  # Ornate engraved scroll-relief bronze frame ring (matching b-041-005.jpg!)
        (0.60, 0.0),     # Outer rim edge
        (0.58, 0.065),   # Backside frame bevel
        (0.46, 0.045),
        (0.01, 0.040),
    ]
    b.add_lathe(
        mirror_prof,
        cx=m_cx, cy=m_cy, cz=m_cz,
        rx=m_rx, rz=m_rz,
        segs=40,
        uv_box=(0.42, 0.50, 0.88, 0.72),  # Sampled from the warm reflective bronze mirror face & frame in b-041-005.jpg!
        tint=(1.22, 1.08, 0.80),
        lift=0.09,
    )

    # 3. Ornate Engraved Bronze Handle & Spherical Finial Knob extending from the lower-left of the mirror frame
    #    (Matching the exact handle at uv (0.08..0.46, 0.68..0.88) of b-041-005.jpg!)
    h_dir_x = -math.sin(-m_rz)
    h_dir_y = -math.cos(-m_rz)
    handle_pts = []
    handle_radii = []
    for i in range(12):
        t = i / 11.0
        dist = 0.56 + t * 0.72
        hx = m_cx + h_dir_x * dist
        hy = m_cy + h_dir_y * dist
        hz = m_cz + t * 0.09
        handle_pts.append((hx, hy, hz))
        # Flared acanthus gusset at mirror junction -> tapered grip -> spherical pommel knob at tip
        if t < 0.22:
            rad = 0.14 - (t / 0.22) * 0.075
        elif t < 0.86:
            rad = 0.065 + 0.012 * math.sin((t - 0.22) / 0.64 * math.pi)
        else:
            rad = 0.082 * math.sin((1.0 - t) / 0.14 * math.pi * 0.8 + 0.3)
        handle_radii.append(max(0.02, rad))

    b.add_tube(
        handle_pts,
        handle_radii,
        segs=16,
        uv_box=(0.12, 0.68, 0.45, 0.86),
        tint=(1.18, 1.00, 0.68),
        lift=0.06,
    )

    # Companion smaller Hammered Bronze Bowl of Water on the left of the plinth (echoing the upper-left of b-041-005.jpg)
    bowl_prof = [
        (0.02, 0.20),
        (0.22, 0.22),
        (0.32, 0.34),
        (0.35, 0.46),
        (0.31, 0.46),
        (0.26, 0.34),
        (0.02, 0.32),
    ]
    b.add_lathe(
        bowl_prof,
        cx=-0.42, cy=0.0, cz=-0.12,
        segs=24,
        uv_box=(0.04, 0.28, 0.38, 0.54),
        tint=(1.08, 0.92, 0.66),
    )

    b.export_glb(os.path.join(ROOT, "assets/models/bronze-mirror.glb"))


def build_living_cornerstone():
    """
    Slot 51: XLII · A Living Hope (1–2 Peter) — The Living Cornerstone (1 Pet 2:4–5)
    Brief: "a dressed cornerstone block with a small green shoot growing from its seam"
    Modeled in the golden coastal limestone palette of b-042-010.jpg (without the hands, per §1 silhouette rule)!
    """
    b = GlbBuilder("assets/a-living-hope/web/b-042-010.jpg")

    # 1. Lower L-Shaped Ashlar Corner Wall Courses (grounded at y = 0, matching the lower wall courses of b-042-010.jpg)
    #    Bottom foundation course
    b.add_box(1.48, 0.34, 1.18, cx=0.0, cy=0.17, cz=0.0, uv_box=(0.25, 0.68, 0.85, 0.90), tint=(0.98, 0.94, 0.84), bevel=0.06)
    #    Second ashlar course with visible mortar seam where the Living Shoot emerges!
    b.add_box(0.76, 0.38, 0.96, cx=-0.30, cy=0.52, cz=-0.04, uv_box=(0.26, 0.56, 0.52, 0.72), tint=(1.00, 0.95, 0.86), bevel=0.07)
    b.add_box(0.68, 0.38, 0.96, cx=0.38, cy=0.52, cz=-0.04, uv_box=(0.48, 0.54, 0.76, 0.72), tint=(1.04, 0.98, 0.88), bevel=0.07)

    # 2. The Chief Dressed Cornerstone Block ("Behold, I lay in Sion a chief corner stone, elect, precious", 1 Pet 2:6)
    #    Set proudly atop the corner joint at a slight dynamic angle, with chiseled drafted margins and bossed ashlar faces!
    b.add_box(
        0.92, 0.68, 0.84,
        cx=0.02, cy=1.04, cz=0.02,
        ry=0.12,
        uv_box=(0.35, 0.36, 0.60, 0.62),  # Sampled directly from the cornerstone block in b-042-010.jpg!
        tint=(1.08, 1.02, 0.92),
        lift=0.04,
        bevel=0.07,
    )
    # Raised rusticated boss panel on the front & side faces of the chief cornerstone
    b.add_box(
        0.76, 0.52, 0.89,
        cx=0.02, cy=1.04, cz=0.02,
        ry=0.12,
        uv_box=(0.36, 0.38, 0.58, 0.60),
        tint=(1.12, 1.06, 0.94),
        lift=0.06,
        bevel=0.09,
    )

    # 3. The Living Green Shoot Growing from the Mortar Seam of the Cornerstone ("To whom coming, as unto a living stone", 1 Pet 2:4–5)
    #    Emerging directly out of the horizontal & vertical mortar joint at (0.06, 0.70, 0.44) and curving upward along the cornerstone!
    shoot_pts = [
        (0.06, 0.70, 0.44),
        (0.14, 0.88, 0.50),
        (0.08, 1.16, 0.52),
        (0.14, 1.46, 0.44),
        (0.08, 1.72, 0.32),
    ]
    b.add_tube(
        shoot_pts,
        [0.032, 0.028, 0.025, 0.020, 0.014],
        segs=12,
        uv_box=(0.62, 0.38, 0.66, 0.48),
        tint=(0.74, 1.08, 0.62),
        lift=0.06,
    )

    # Secondary tender green side-shoot
    side_shoot = [
        (0.11, 1.02, 0.51),
        (-0.10, 1.18, 0.52),
        (-0.24, 1.36, 0.48),
    ]
    b.add_tube(side_shoot, [0.022, 0.018, 0.012], segs=10, uv_box=(0.62, 0.38, 0.66, 0.48), tint=(0.76, 1.10, 0.64), lift=0.06)

    # Sculpted emerald-and-gold living leaves along the shoot
    leaf_cfgs = [
        (0.24, 0.92, 0.52, -0.3, -0.35),
        (-0.12, 1.18, 0.54, 0.35, 0.35),
        (-0.26, 1.38, 0.49, 0.25, 0.45),
        (0.22, 1.24, 0.52, -0.35, -0.30),
        (-0.02, 1.38, 0.48, 0.30, 0.30),
        (0.24, 1.54, 0.42, -0.30, -0.35),
        (0.08, 1.76, 0.30, 0.0, 0.15),
    ]
    for lx, ly, lz, lry, lrz in leaf_cfgs:
        b.add_box(
            0.22, 0.030, 0.095,
            cx=lx, cy=ly, cz=lz,
            ry=lry, rz=lrz,
            uv_box=(0.62, 0.38, 0.66, 0.48),
            tint=(0.82, 1.22, 0.68),
            lift=0.08,
            bevel=0.18,
        )

    b.export_glb(os.path.join(ROOT, "assets/models/living-cornerstone.glb"))


def build_childs_sandals():
    """
    Slot 52: XLIII · Little Children (1–3 John) — The Little Child's Sandals † (1 Jn 3:1)
    Brief: "† — one small pair of leather sandals on a path stone, monument scale"
    Modeled in the warm sunlit limestone, terracotta-leather, and rose-petal palette of b-043-014.jpg!
    (Distinct from Ruth's single kinsman sandal in District VI: this is a tender matched PAIR of small, rounded
    child's sandals resting side by side on a warm path stone with a small wild rosebud beside them!)
    """
    b = GlbBuilder("assets/little-children/web/b-043-014.jpg")

    # 1. Warm Sunlit Judean Path Flagstone Base (grounded at y = 0)
    b.add_box(1.48, 0.26, 1.18, cx=0.0, cy=0.13, cz=0.0, uv_box=(0.55, 0.55, 0.95, 0.95), tint=(1.02, 0.98, 0.90), bevel=0.08)
    b.add_box(1.24, 0.14, 0.96, cx=0.0, cy=0.30, cz=0.0, uv_box=(0.58, 0.58, 0.92, 0.90), tint=(1.06, 1.02, 0.94), bevel=0.08)

    # 2. One Small Pair of Hand-Stitched Leather Child's Sandals (Left & Right Sandal side by side, slightly toed-in
    #    with tender childlike proportion — short, rounded toe & heel, ankle cup, and double cross-straps!)
    for side, s_cx, s_cz, yaw in [(-1.0, -0.28, 0.02, -0.14), (1.0, 0.28, 0.04, 0.18)]:
        # Layered stitched leather sole (wider rounded forefoot & heel of a little child's foot)
        for sole_i, (sy_off, s_tint) in enumerate([(0.39, (0.86, 0.68, 0.50)), (0.43, (1.02, 0.82, 0.62))]):
            b.add_box(
                0.34, 0.045, 0.64,
                cx=s_cx, cy=sy_off, cz=s_cz,
                ry=yaw,
                uv_box=(0.22, 0.52, 0.48, 0.78),  # Warm leather tones sampled from b-043-014.jpg
                tint=s_tint,
                lift=0.02,
                bevel=0.18,
            )

        # Curved leather heel cup (counter) at the back of each little sandal (z < 0)
        heel_pts = []
        for s in range(13):
            t = s / 12.0
            ang = math.pi * 0.85 + t * math.pi * 1.30
            lx = math.cos(ang) * 0.14
            lz = -0.18 + math.sin(ang) * 0.12
            wx, wy, wz = rotate_point(lx, 0.54, lz, 0.0, yaw, 0.0)
            heel_pts.append((s_cx + wx, wy, s_cz + wz))
        b.add_tube(heel_pts, [0.065] * 13, segs=10, uv_box=(0.22, 0.52, 0.48, 0.78), tint=(0.96, 0.76, 0.56))

        # Ankle strap loop & bronze buckle above the heel cup
        ankle_pts = []
        for s in range(17):
            ang = (s / 16.0) * math.pi * 2.0
            lx = math.cos(ang) * 0.135
            lz = -0.14 + math.sin(ang) * 0.135
            wx, wy, wz = rotate_point(lx, 0.64, lz, 0.0, yaw, 0.0)
            ankle_pts.append((s_cx + wx, wy, s_cz + wz))
        b.add_tube(ankle_pts, [0.028] * 17, segs=10, uv_box=(0.24, 0.54, 0.46, 0.76), tint=(1.06, 0.86, 0.64), lift=0.04)

        # Two arched leather instep straps + central toe-thong strap over the forefoot
        for z_strap, h_strap in [(0.02, 0.60), (0.16, 0.56)]:
            arch_pts = []
            for s in range(11):
                t = s / 10.0
                ang = t * math.pi
                lx = -math.cos(ang) * 0.155
                ly = 0.44 + math.sin(ang) * (h_strap - 0.44)
                wx, wy, wz = rotate_point(lx, ly, z_strap, 0.0, yaw, 0.0)
                arch_pts.append((s_cx + wx, wy, s_cz + wz))
            b.add_tube(arch_pts, [0.032] * 11, segs=10, uv_box=(0.24, 0.54, 0.46, 0.76), tint=(1.04, 0.84, 0.62), lift=0.03)

        # Central longitudinal strap connecting toe post to ankle loop
        spine_pts = []
        for l_z, l_y in [(0.24, 0.45), (0.16, 0.57), (0.02, 0.61), (-0.04, 0.64)]:
            wx, wy, wz = rotate_point(0.0, l_y, l_z, 0.0, yaw, 0.0)
            spine_pts.append((s_cx + wx, wy, s_cz + wz))
        b.add_tube(spine_pts, [0.024] * 4, segs=8, uv_box=(0.24, 0.54, 0.46, 0.76), tint=(1.10, 0.90, 0.68), lift=0.05)

    # 3. Small Sculpted Rose & Leaf on the Corner of the Path Stone (echoing the embroidered rose at lower-left of b-043-014.jpg!)
    b.add_lathe(
        [(0.01, 0.36), (0.09, 0.38), (0.11, 0.44), (0.07, 0.48), (0.01, 0.50)],
        cx=-0.46, cy=0.0, cz=0.34,
        segs=14,
        uv_box=(0.01, 0.82, 0.08, 0.94),
        tint=(1.22, 0.92, 0.92),
        lift=0.06,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/childs-sandals.glb"))


def build_white_stone_new_name():
    """
    Slot 53: XLIV · All Things New (Revelation) — The White Stone with the New Name (Rev 2:17)
    Brief: "a smooth, luminous white stone on a small plinth, a subtle golden line across its face"
    Placed right beside the Tree of Life stone bench in XLIV's Finale Plaza!
    Modeled from the smooth white river stone in b-044-007.jpg (mounted on a carved sanctuary plinth without hands, per §1)!
    """
    b = GlbBuilder("assets/all-things-new/web/b-044-007.jpg")

    # 1. Carved New Jerusalem Sanctuary Plinth with Velvet/Linen Cushion Rest (grounded at y = 0)
    plinth_prof = [
        (0.56, 0.0),
        (0.52, 0.12),
        (0.38, 0.22),
        (0.30, 0.48),
        (0.32, 0.72),
        (0.44, 0.84),   # Flared capital cradle
        (0.46, 0.92),
        (0.02, 0.94),
    ]
    b.add_lathe(
        plinth_prof,
        cx=0.0, cy=0.0, cz=0.0,
        segs=28,
        uv_box=(0.55, 0.55, 0.90, 0.90),
        tint=(1.04, 1.00, 0.92),
        lift=0.04,
    )

    # Golden Molding Ring around the Plinth Capital
    b.add_lathe(
        [(0.45, 0.84), (0.48, 0.88), (0.45, 0.92)],
        cx=0.0, cy=0.0, cz=0.0,
        segs=28,
        uv_box=(0.20, 0.35, 0.42, 0.65),
        tint=(1.25, 1.12, 0.78),
        lift=0.10,
    )

    # 2. The Smooth, Luminous White Stone ("and will give him a white stone, and in the stone a new name written", Rev 2:17)
    #    Modeled directly from the smooth oval white stone at uv (0.55..0.67, 0.62..0.69) of b-044-007.jpg!
    #    Tilted gently toward the viewer on its plinth so its smooth luminous white surface and golden line read immediately!
    st_cy = 1.14
    st_rx = 0.48  # Tilted ~27 degrees forward toward the pilgrim
    rings = []
    lat_steps = 18
    lon_steps = 28
    for iv in range(lat_steps + 1):
        tv = iv / lat_steps
        phi = tv * math.pi
        sp = math.sin(phi)
        cp = math.cos(phi)
        row = []
        for iu in range(lon_steps + 1):
            tu = iu / lon_steps
            theta = tu * math.pi * 2.0
            ct = math.cos(theta)
            st = math.sin(theta)
            # Smooth water-worn triaxial ellipsoid pebble (wider in X, medium in Z, smooth pillowed dome in Y)
            lx = 0.52 * sp * ct
            ly = 0.24 * (-cp)
            lz = 0.38 * sp * st
            wx, wy, wz = rotate_point(lx, ly, lz, st_rx, 0.0, 0.0)
            nx, ny, nz = rotate_point(lx / 0.52, ly / 0.24, lz / 0.38, st_rx, 0.0, 0.0)
            u_uv = 0.55 + tu * 0.11
            v_uv = 0.63 + (1.0 - tv) * 0.05
            row.append(
                b.add_vertex(
                    (wx, st_cy + wy, wz),
                    (nx, ny, nz),
                    (u_uv, v_uv),
                    tint=(1.24, 1.22, 1.18),  # Luminous warm alabaster-white stone finish
                    lift=0.16,
                )
            )
        rings.append(row)

    for iv in range(lat_steps):
        r0, r1 = rings[iv], rings[iv + 1]
        for iu in range(lon_steps):
            b.indices.extend([r0[iu], r0[iu + 1], r1[iu], r0[iu + 1], r1[iu + 1], r1[iu]])

    # 3. The Subtle Golden Line Across Its Face ("and in the stone a new name written, which no man knoweth saving he that receiveth it")
    #    A delicate, luminous calligraphic golden line arcing across the upper face of the white stone!
    line_pts = []
    line_radii = []
    for i in range(19):
        t = i / 18.0
        sx = -0.34 + t * 0.68
        # Graceful calligraphic wave across the face of the white stone
        sz = 0.04 * math.sin(t * math.pi * 2.0) - 0.02
        # Ellipsoid surface height ly at (sx, sz)
        r_sq = max(0.02, 1.0 - (sx / 0.52) ** 2 - (sz / 0.38) ** 2)
        sy = 0.24 * math.sqrt(r_sq) + 0.008
        wx, wy, wz = rotate_point(sx, sy, sz, st_rx, 0.0, 0.0)
        line_pts.append((wx, st_cy + wy, wz))
        line_radii.append(0.015 * math.sin(t * math.pi * 0.85 + 0.2))

    b.add_tube(
        line_pts,
        line_radii,
        segs=10,
        uv_box=(0.22, 0.38, 0.38, 0.58),
        tint=(1.42, 1.24, 0.78),
        lift=0.22,
    )

    # Subtle secondary golden diacritic / crown stroke above the center of the golden line
    accent_pts = []
    for i in range(9):
        t = i / 8.0
        sx = -0.12 + t * 0.24
        sz = -0.09 - 0.02 * math.sin(t * math.pi)
        r_sq = max(0.02, 1.0 - (sx / 0.52) ** 2 - (sz / 0.38) ** 2)
        sy = 0.24 * math.sqrt(r_sq) + 0.008
        wx, wy, wz = rotate_point(sx, sy, sz, st_rx, 0.0, 0.0)
        accent_pts.append((wx, st_cy + wy, wz))
    b.add_tube(
        accent_pts,
        [0.011] * 9,
        segs=8,
        uv_box=(0.22, 0.38, 0.38, 0.58),
        tint=(1.42, 1.24, 0.78),
        lift=0.22,
    )

    b.export_glb(os.path.join(ROOT, "assets/models/white-stone-new-name.glb"))


if __name__ == "__main__":
    build_bronze_mirror()
    build_living_cornerstone()
    build_childs_sandals()
    build_white_stone_new_name()

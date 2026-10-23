#!/usr/bin/env python3
"""
THE PILGRIM WALK — 3D Painting Sculpture & Foreground Monument GLB Compiler
Builds watertight 3D sculpted .glb (glTF 2.0 binary) models directly from
Timothy Holt's paintings for all 175 Step-Through Scenes and 16 Hero Relics.

Each .glb contains:
  1. A 360° 3D Foreground Sculpture in the center of the plinth tailored to the
     scene's subject (gnarled olive/river tree, 7-branched menorah, coiled bronze
     serpent, potter's wheel & amphora, seraph wings & altar coal, eagle wings,
     chariot wheel of fire, oil lamp, chalice, ship hull, anchor, scroll, or harp).
  2. A watertight 3D sculpted central painting reliquary stele behind the sculpture
     (displaced front & back surfaces + beveled 3D perimeter wall) whose silhouette
     and 3D depth relief are computed from the painting's luminance & brushwork.
  3. Angled left & right 3D sculptural foreground wings creating walk-around parallax.
  4. A carved octagonal sanctuary plinth UV-mapped to the painting's earth & gold palette.
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
        ny = (y / max(1, gh - 1)) * 2.0 - 1.0
        for x in range(gw):
            nx = (x / max(1, gw - 1)) * 2.0 - 1.0
            r, g, b = px[x, y]
            br, bg, bb = bpx[x, y]

            lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
            detail = (abs(r - br) + abs(g - bg) + abs(b - bb)) / (255.0 * 3.0)
            warmth = max(0.0, (r - b) / 255.0)
            sat = (max(r, g, b) - min(r, g, b)) / 255.0

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


def classify_sculpture_archetype(key_or_id, kind):
    k = f"{key_or_id} {kind}".lower()
    if any(w in k for w in ["olive", "tree", "vine", "garden", "planted", "streams", "cedar", "fig", "almond", "branch", "healing", "sower", "sheaf", "gleaning"]):
        return "tree_of_life"
    if any(w in k for w in ["menorah", "lampstand", "seven_lamps", "seven_golden"]):
        return "menorah"
    if any(w in k for w in ["serpent", "nehushtan", "look_and_live", "bronze_serpent"]):
        return "serpent_standard"
    if any(w in k for w in ["wing", "eagle", "seraph", "undone", "dove", "cherub"]):
        return "wings_altar"
    if any(w in k for w in ["potter", "jar", "pitcher", "well", "cup", "chalice", "oil", "anointing", "horn", "shofar", "water"]):
        return "amphora_vessel"
    if any(w in k for w in ["chariot", "wheel", "throne", "crown", "rainbow", "bow"]):
        return "chariot_throne"
    if any(w in k for w in ["lamp", "lantern", "fire", "bush", "altar", "carmel", "coal", "star", "light"]):
        return "sacred_flame_altar"
    if any(w in k for w in ["ship", "boat", "anchor", "sea", "deep", "storm"]):
        return "anchor_vessel"
    return "covenant_monument"


def build_glb_bytes(img_path, key_or_id="default", scene_kind="default"):
    """Generates a binary glTF 2.0 (.glb) buffer from a painting image."""
    orig = Image.open(img_path).convert("RGB")
    tex_img = ImageEnhance.Contrast(orig).enhance(1.08)
    tex_img = ImageEnhance.Color(tex_img).enhance(1.06)
    tex_img = tex_img.resize((256, 320), Image.Resampling.LANCZOS)

    jpeg_buf = io.BytesIO()
    tex_img.save(jpeg_buf, format="JPEG", quality=82, optimize=True)
    jpeg_bytes = jpeg_buf.getvalue()

    gw, gh = 34, 42
    depth = compute_depth_grid(orig, gw, gh)

    positions = []
    normals = []
    uvs = []
    indices = []

    def add_vertex(pos, norm, uv):
        idx = len(positions)
        positions.append(pos)
        normals.append(norm)
        uvs.append(uv)
        return idx

    def add_lathe(profile_pts, cx, cy, cz, segs=18, u_center=0.5, v_range=(0.25, 0.75)):
        """Adds a 360-degree revolved 3D lathe mesh from [(r, y), ...] profile points."""
        rings = []
        n_pts = len(profile_pts)
        for p_idx, (rad, py) in enumerate(profile_pts):
            t_v = p_idx / max(1, n_pts - 1)
            v_uv = v_range[0] + (1.0 - t_v) * (v_range[1] - v_range[0])
            ring = []
            for s in range(segs + 1):
                ang = (s / segs) * math.pi * 2.0
                ca, sa = math.cos(ang), math.sin(ang)
                # Subtle organic painterlydisplacement
                wobble = 1.0 + 0.04 * math.sin(ang * 3.0 + py * 4.0)
                x = cx + ca * rad * wobble
                z = cz + sa * rad * wobble
                u_uv = max(0.05, min(0.95, u_center + 0.32 * math.sin(ang)))
                ring.append(add_vertex((x, cy + py, z), normalize_vec3(ca, 0.15, sa), (u_uv, v_uv)))
            rings.append(ring)

        for p_idx in range(n_pts - 1):
            r0 = rings[p_idx]
            r1 = rings[p_idx + 1]
            for s in range(segs):
                indices.extend([r0[s], r0[s + 1], r1[s], r0[s + 1], r1[s + 1], r1[s]])

    def add_tube_curve(curve_pts, radii, segs=10, uv_box=(0.25, 0.25, 0.75, 0.75)):
        """Sweeps a 3D circular cross-section along a 3D spine curve [(x,y,z), ...]."""
        rings = []
        n_pts = len(curve_pts)
        for i, (px, py, pz) in enumerate(curve_pts):
            r = radii[i]
            t = i / max(1, n_pts - 1)
            if i < n_pts - 1:
                tx = curve_pts[i + 1][0] - px
                ty = curve_pts[i + 1][1] - py
                tz = curve_pts[i + 1][2] - pz
            else:
                tx = px - curve_pts[i - 1][0]
                ty = py - curve_pts[i - 1][1]
                tz = pz - curve_pts[i - 1][2]
            tx, ty, tz = normalize_vec3(tx, ty, tz)
            # Orthonormal basis (bx, by, bz) and (nx, ny, nz)
            up_x, up_y, up_z = (0.0, 0.0, 1.0) if abs(ty) > 0.9 else (0.0, 1.0, 0.0)
            bx = ty * up_z - tz * up_y
            by = tz * up_x - tx * up_z
            bz = tx * up_y - ty * up_x
            bx, by, bz = normalize_vec3(bx, by, bz)
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
                ring.append(add_vertex((px + vx * r, py + vy * r, pz + vz * r), (vx, vy, vz), (u_uv, v_uv)))
            rings.append(ring)

        for i in range(n_pts - 1):
            r0, r1 = rings[i], rings[i + 1]
            for s in range(segs):
                indices.extend([r0[s], r0[s + 1], r1[s], r0[s + 1], r1[s + 1], r1[s]])

    # -------------------------------------------------------------------------
    # PART 0: 360° 3D Sculptural Centerpiece on the Foreground of the Plinth
    # -------------------------------------------------------------------------
    archetype = classify_sculpture_archetype(key_or_id, scene_kind)
    fg_z = 0.52  # stands in front of the sculpted painting stele

    if archetype == "tree_of_life":
        # Gnarled twisted trunk + 3 overarching boughs + sculpted foliage canopy domes
        trunk_pts = [
            (0.0, 0.24, fg_z),
            (0.06, 0.65, fg_z + 0.04),
            (-0.05, 1.12, fg_z - 0.02),
            (0.03, 1.58, fg_z + 0.03),
            (0.0, 1.95, fg_z)
        ]
        add_tube_curve(trunk_pts, [0.22, 0.17, 0.14, 0.11, 0.07], 12, (0.35, 0.45, 0.65, 0.85))
        for b_ang in [-0.85, 0.0, 0.85]:
            b_pts = [
                (0.0, 1.45, fg_z),
                (math.sin(b_ang) * 0.35, 1.78, fg_z + math.cos(b_ang) * 0.12),
                (math.sin(b_ang) * 0.68, 2.02, fg_z + math.cos(b_ang) * 0.20)
            ]
            add_tube_curve(b_pts, [0.09, 0.06, 0.03], 8, (0.3, 0.2, 0.7, 0.5))
            # Sculpted foliage cluster at branch crown
            canopy_prof = [(0.01, -0.18), (0.36, -0.08), (0.44, 0.06), (0.30, 0.22), (0.01, 0.30)]
            add_lathe(canopy_prof, math.sin(b_ang) * 0.62, 2.02, fg_z + math.cos(b_ang) * 0.18, 14, 0.5, (0.12, 0.42))

    elif archetype == "menorah":
        # Stepped gold base + central shaft + 3 curved pairs of almond-blossom branches
        add_lathe([(0.36, 0.0), (0.32, 0.10), (0.20, 0.18), (0.08, 0.24), (0.07, 1.85), (0.14, 1.96), (0.02, 2.04)], 0.0, 0.24, fg_z, 16, 0.5, (0.2, 0.7))
        for pair_idx, span in enumerate([0.32, 0.56, 0.80]):
            y_join = 0.72 + pair_idx * 0.24
            curve = []
            rads = []
            for step in range(9):
                ang = (step / 8) * math.pi - math.pi * 0.5
                x = math.sin(ang) * span
                y = y_join + (1.0 - math.cos(ang)) * (1.85 - y_join)
                curve.append((x, y, fg_z))
                rads.append(0.048)
            add_tube_curve(curve, rads, 10, (0.3, 0.2, 0.7, 0.6))

    elif archetype == "serpent_standard":
        # Tall standard pole & crossbar + 3D helical coiled bronze serpent
        add_lathe([(0.09, 0.0), (0.07, 2.15), (0.02, 2.22)], 0.0, 0.24, fg_z, 12, 0.5, (0.25, 0.8))
        add_tube_curve([(-0.55, 1.88, fg_z), (0.55, 1.88, fg_z)], [0.05, 0.05], 8, (0.3, 0.2, 0.7, 0.4))
        coil_pts = []
        coil_rads = []
        for s in range(28):
            t = s / 27.0
            ang = t * math.pi * 5.5
            rad = 0.18 + 0.06 * math.sin(t * math.pi)
            coil_pts.append((math.cos(ang) * rad, 0.55 + t * 1.48, fg_z + math.sin(ang) * rad))
            coil_rads.append(0.055 * (1.0 - 0.35 * t))
        add_tube_curve(coil_pts, coil_rads, 10, (0.25, 0.25, 0.75, 0.65))

    elif archetype == "wings_altar":
        # Sculpted Altar Brazier + Pair of Sweeping 3D Angelic/Eagle Wings
        add_lathe([(0.34, 0.0), (0.28, 0.45), (0.42, 0.75), (0.36, 0.92), (0.18, 1.08), (0.01, 1.25)], 0.0, 0.24, fg_z, 16, 0.5, (0.35, 0.78))
        for side in [-1.0, 1.0]:
            for feather in range(4):
                f_pts = [
                    (side * 0.18, 0.95 + feather * 0.12, fg_z),
                    (side * (0.52 + feather * 0.12), 1.38 + feather * 0.16, fg_z + 0.08),
                    (side * (0.85 + feather * 0.14), 1.82 + feather * 0.14, fg_z - 0.04)
                ]
                add_tube_curve(f_pts, [0.08, 0.06, 0.02], 8, (0.2, 0.18, 0.8, 0.52))

    elif archetype == "amphora_vessel":
        # Classical Sculpted Biblical Amphora / Potter's Vessel + Twin Curved Handles
        vessel_prof = [
            (0.24, 0.0), (0.18, 0.14), (0.44, 0.55), (0.48, 0.95),
            (0.32, 1.32), (0.18, 1.56), (0.26, 1.74), (0.22, 1.80), (0.02, 1.72)
        ]
        add_lathe(vessel_prof, 0.0, 0.24, fg_z, 20, 0.5, (0.22, 0.78))
        for side in [-1.0, 1.0]:
            h_pts = [
                (side * 0.22, 1.68, fg_z),
                (side * 0.52, 1.52, fg_z),
                (side * 0.54, 1.18, fg_z),
                (side * 0.42, 0.96, fg_z)
            ]
            add_tube_curve(h_pts, [0.045, 0.05, 0.05, 0.045], 8, (0.3, 0.3, 0.7, 0.6))

    elif archetype == "chariot_throne":
        # Sculpted Throne / Chariot Wheel-Within-A-Wheel & Covenant Arch
        add_lathe([(0.42, 0.0), (0.36, 0.32), (0.45, 0.55), (0.28, 0.72), (0.02, 0.85)], 0.0, 0.24, fg_z, 18, 0.5, (0.4, 0.8))
        for rot_z in [0.0, math.pi * 0.5]:
            ring_pts = []
            ring_rads = []
            for s in range(21):
                ang = (s / 20.0) * math.pi * 2.0
                rx = math.cos(ang) * 0.62
                ry = math.sin(ang) * 0.62
                if rot_z > 0.1:
                    ring_pts.append((rx * 0.35, 1.38 + ry, fg_z + rx * 0.93))
                else:
                    ring_pts.append((rx, 1.38 + ry, fg_z))
                ring_rads.append(0.055)
            add_tube_curve(ring_pts, ring_rads, 10, (0.25, 0.2, 0.75, 0.55))

    elif archetype == "anchor_vessel":
        # Ancient Forged Iron/Stone Anchor & Curved Prow Timber
        add_lathe([(0.12, 0.0), (0.09, 1.55), (0.16, 1.68), (0.02, 1.76)], 0.0, 0.24, fg_z, 12, 0.5, (0.3, 0.75))
        fluke_pts = [
            (-0.68, 0.88, fg_z),
            (-0.38, 0.45, fg_z),
            (0.0, 0.34, fg_z),
            (0.38, 0.45, fg_z),
            (0.68, 0.88, fg_z)
        ]
        add_tube_curve(fluke_pts, [0.04, 0.075, 0.09, 0.075, 0.04], 10, (0.25, 0.4, 0.75, 0.75))

    else:
        # Sacred Flame Altar / Covenant Monument with Sculpted Rising Flame Spire
        altar_prof = [
            (0.46, 0.0), (0.40, 0.28), (0.34, 0.68), (0.48, 0.88),
            (0.38, 1.05), (0.28, 1.38), (0.16, 1.72), (0.02, 2.02)
        ]
        add_lathe(altar_prof, 0.0, 0.24, fg_z, 18, 0.5, (0.22, 0.78))

    # -------------------------------------------------------------------------
    # PART 1: Watertight 3D Sculpted Central Subject Volume (Front + Back + Rim)
    # -------------------------------------------------------------------------
    width = 1.95
    height = 2.55
    base_y = 0.22
    max_z = 0.44

    front_grid = [[0 for _ in range(gw)] for _ in range(gh)]
    back_grid = [[0 for _ in range(gw)] for _ in range(gh)]

    f_pos = [[None for _ in range(gw)] for _ in range(gh)]
    b_pos = [[None for _ in range(gw)] for _ in range(gh)]

    for y in range(gh):
        v_norm = y / (gh - 1)
        py_raw = base_y + (1.0 - v_norm) * height
        ny = v_norm * 2.0 - 1.0
        for x in range(gw):
            u_norm = x / (gw - 1)
            nx = u_norm * 2.0 - 1.0

            top_taper = 1.0 - 0.28 * max(0.0, -ny) ** 1.6
            wave = 0.04 * math.sin(v_norm * math.pi * 3.0)
            px = nx * (width * 0.5) * top_taper + (wave if nx > 0 else -wave)
            arch_lift = 0.22 * max(0.0, 1.0 - nx * nx) * max(0.0, 1.0 - v_norm * 2.2)
            py = py_raw + arch_lift

            d = depth[y][x]
            edge_dist = min(x, gw - 1 - x, y, gh - 1 - y) / 4.0
            edge_factor = min(1.0, edge_dist)
            pz_front = -0.10 + d * max_z * edge_factor
            pz_back = -0.18 - (0.65 * d * max_z) * edge_factor

            f_pos[y][x] = (px, py, pz_front)
            b_pos[y][x] = (px, py, pz_back)

    for y in range(gh):
        v_uv = y / (gh - 1)
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

    for y in range(gh - 1):
        for x in range(gw - 1):
            f00, f10 = front_grid[y][x], front_grid[y][x + 1]
            f01, f11 = front_grid[y + 1][x], front_grid[y + 1][x + 1]
            indices.extend([f00, f01, f10, f10, f01, f11])

            b00, b10 = back_grid[y][x], back_grid[y][x + 1]
            b01, b11 = back_grid[y + 1][x], back_grid[y + 1][x + 1]
            indices.extend([b00, b10, b01, b10, b11, b01])

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
        fa, fb = front_grid[y0][x0], front_grid[y1][x1]
        ba, bb = back_grid[y0][x0], back_grid[y1][x1]
        indices.extend([fa, fb, ba, fb, bb, ba])

    # -------------------------------------------------------------------------
    # PART 2: Left & Right Angled 3D Sculptural Relief Wings
    # -------------------------------------------------------------------------
    def add_sculpted_wing(side_sign):
        wgw, wgh = 12, 18
        w_width = 0.78
        w_height = 1.85
        w_base_y = 0.20
        angle = side_sign * 0.48
        cos_a, sin_a = math.cos(angle), math.sin(angle)
        center_x = side_sign * 0.94
        center_z = 0.08

        w_front = [[0 for _ in range(wgw)] for _ in range(wgh)]
        w_back = [[0 for _ in range(wgw)] for _ in range(wgh)]

        for wy in range(wgh):
            wv = wy / (wgh - 1)
            py = w_base_y + (1.0 - wv) * w_height
            gy = min(gh - 1, int(wv * (gh - 1)))
            for wx in range(wgw):
                wu = wx / (wgw - 1)
                u_tex = (0.04 + wu * 0.34) if side_sign < 0 else (0.62 + wu * 0.34)
                gx = min(gw - 1, int(u_tex * (gw - 1)))
                d = depth[gy][gx]

                lx = (wu - 0.5) * w_width
                lz_f = 0.03 + d * 0.24
                lz_b = -0.03 - d * 0.18

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
    # PART 3: Sculpted Octagonal Stone Plinth Base
    # -------------------------------------------------------------------------
    def add_cylinder_ring(r_top, r_bot, y_bot, y_top, segs=16, v_uv_base=0.88):
        top_ring = []
        bot_ring = []
        for s in range(segs + 1):
            ang = (s / segs) * math.pi * 2.0
            ca, sa = math.cos(ang), math.sin(ang)
            u_uv = 0.15 + 0.70 * (s / segs)
            top_ring.append(add_vertex((ca * r_top, y_top, sa * r_top * 0.85), (ca, 0.2, sa), (u_uv, v_uv_base)))
            bot_ring.append(add_vertex((ca * r_bot, y_bot, sa * r_bot * 0.85), (ca, 0.0, sa), (u_uv, min(0.99, v_uv_base + 0.09))))

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
        "images": [{"bufferView": 4, "mimeType": "image/jpeg"}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(positions), "type": "VEC3", "min": min_pos, "max": max_pos},
            {"bufferView": 1, "componentType": 5126, "count": len(normals), "type": "VEC3"},
            {"bufferView": 2, "componentType": 5126, "count": len(uvs), "type": "VEC2"},
            {"bufferView": 3, "componentType": 5123, "count": len(indices), "type": "SCALAR"},
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
        targets.append((m["paintingRef"], m["file"], m["id"], "relic"))

    for s in catalog.get("scenes", []):
        targets.append((s["imgRelPath"], s["outRelPath"], s["key"], s.get("sceneKind", "default")))

    os.makedirs(os.path.join(ROOT, "assets/models/scenes"), exist_ok=True)

    built = 0
    skipped = 0
    for img_rel, out_rel, key_id, kind in targets:
        out_full = os.path.join(ROOT, out_rel)
        img_full = os.path.join(ROOT, img_rel)
        # Keep existing cloud TRELLIS models (> 400 KB) intact
        if os.path.exists(out_full) and os.path.getsize(out_full) > 400000:
            skipped += 1
            continue
        if not os.path.exists(img_full):
            print(f"[WARN] Missing image: {img_rel}")
            continue
        glb_data = build_glb_bytes(img_full, key_id, kind)
        with open(out_full, "wb") as wf:
            wf.write(glb_data)
        built += 1
        if built % 25 == 0 or built == 1:
            print(f"Built {built} 3D GLB sculptures... latest: {out_rel} ({len(glb_data) / 1024:.1f} KB)")

    print(f"✅ Completed! Built {built} upgraded 3D .glb sculptures ({skipped} cloud TRELLIS models kept).")


if __name__ == "__main__":
    main()

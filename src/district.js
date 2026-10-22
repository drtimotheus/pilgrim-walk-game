// ============================================================================
// THE PILGRIM WALK — Genesis District & Gatehouse Courtyard World Builder
// Upgraded with the "Komorebi: A Forest Flight" atmospheric pipeline:
//   - Animated reflective river with sun glints, shoreline foam & floating lanterns
//   - Arched weathered stone footbridges crossing the river
//   - 2,600+ wind-swaying instanced meadow grass & wildflower tufts along the road
//   - Angled 3D Komorebi sunbeam shafts slanting through the olive & oak canopy
//   - 40 paintings in book order across 4 parts + 4 hidden Lights + Amen Gate
// ============================================================================

import { createKomorebiWaterMaterial } from './postprocess.js';

export class GenesisDistrictBuilder {
  constructor(THREE, painterly, propBuilder) {
    this.THREE = THREE;
    this.painterly = painterly;
    this.propBuilder = propBuilder;
    this.textureLoader = new THREE.TextureLoader();
  }

  getPathPoint(zDist) {
    const x = Math.sin(zDist * 0.032) * 4.8 + Math.cos(zDist * 0.014) * 2.2 - 2.2;
    const y = Math.sin(zDist * 0.018) * 0.45;
    return { x, y, z: zDist };
  }

  getPathTangent(zDist) {
    const p1 = this.getPathPoint(zDist - 0.5);
    const p0 = this.getPathPoint(zDist + 0.5);
    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    const len = Math.hypot(dx, dz) || 1;
    return { x: dx / len, z: dz / len };
  }

  async buildDistrict(manifest, onProgress) {
    return this.buildGenesisDistrict(manifest, onProgress);
  }

  async buildGenesisDistrict(manifest, onProgress) {
    const THREE = this.THREE;
    const streetGroup = new THREE.Group();
    const paintings = manifest.paintings;
    const isExodus = manifest.slug === 'exodus';

    const groundMat = this.painterly.createPainterlyMaterial({
      baseColor: isExodus ? '#735b43' : '#686050',
      accentColor: isExodus ? '#cfa36e' : '#b69375',
      roughness: 0.90,
      bumpScale: 0.06
    });
    const pathMat = this.painterly.createPainterlyMaterial({
      baseColor: isExodus ? '#b5946d' : '#a68f71',
      accentColor: isExodus ? '#edd1a4' : '#dfcaa8',
      roughness: 0.84,
      bumpScale: 0.05
    });

    // 1. Sculpted rolling hills & valley floor along the 460-meter road
    const terrainGeo = new THREE.PlaneGeometry(160, 520, 96, 220);
    terrainGeo.rotateX(-Math.PI / 2);
    const tPos = terrainGeo.attributes.position;
    for (let i = 0; i < tPos.count; i++) {
      const vx = tPos.getX(i);
      const vz = tPos.getZ(i) - 210;
      tPos.setZ(i, vz);

      const pathPt = this.getPathPoint(vz);
      const distFromPath = Math.abs(vx - pathPt.x);

      // Carve a shallow channel on the left side (vx < pathPt.x - 5.5) for the Genesis River
      const riverDist = Math.abs(vx - (pathPt.x - 10.5));
      let riverCarve = 0;
      if (riverDist < 6.2) {
        riverCarve = -Math.cos((riverDist / 6.2) * Math.PI * 0.5) * 0.55;
      }

      const hillFactor = Math.max(0, (distFromPath - 4.8) / 18.0);
      const hillHeight =
        Math.pow(Math.min(2.5, hillFactor), 1.35) *
        (2.8 + Math.sin(vz * 0.04 + vx * 0.08) * 1.6 + Math.cos(vz * 0.025) * 1.2);
      tPos.setY(i, pathPt.y + (riverDist < 6.2 ? riverCarve : hillHeight));
    }
    terrainGeo.computeVertexNormals();
    const terrainMesh = new THREE.Mesh(terrainGeo, groundMat);
    terrainMesh.receiveShadow = true;
    streetGroup.add(terrainMesh);

    // 2. Winding Pilgrim Road ribbon slightly above terrain bed
    const roadSegments = 360;
    const roadGeo = new THREE.BufferGeometry();
    const roadVerts = [];
    const roadUvs = [];
    const roadIndices = [];
    const roadHalfWidth = 2.65;

    for (let i = 0; i <= roadSegments; i++) {
      const z = 25 - (i / roadSegments) * 465;
      const pt = this.getPathPoint(z);
      const tan = this.getPathTangent(z);
      const nx = -tan.z;
      const nz = tan.x;

      roadVerts.push(pt.x - nx * roadHalfWidth, pt.y + 0.04, pt.z - nz * roadHalfWidth);
      roadVerts.push(pt.x + nx * roadHalfWidth, pt.y + 0.04, pt.z + nz * roadHalfWidth);
      roadUvs.push(0, i * 0.25, 1, i * 0.25);

      if (i < roadSegments) {
        const a = i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        roadIndices.push(a, b, c, b, d, c);
      }
    }
    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadVerts, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
    roadGeo.setIndex(roadIndices);
    roadGeo.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeo, pathMat);
    roadMesh.receiveShadow = true;
    streetGroup.add(roadMesh);

    // 3. Komorebi Animated Reflective River Running Alongside the Garden Path
    const riverGeo = new THREE.PlaneGeometry(11.5, 470, 24, 180);
    riverGeo.rotateX(-Math.PI / 2);
    const rPos = riverGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      const rx = rPos.getX(i);
      const rz = rPos.getZ(i) - 210;
      const pt = this.getPathPoint(rz);
      rPos.setX(i, pt.x - 10.5 + rx);
      rPos.setY(i, pt.y - 0.14);
      rPos.setZ(i, rz);
    }
    riverGeo.computeVertexNormals();
    const riverMat = createKomorebiWaterMaterial(THREE, {
      deepColor: isExodus ? '#264754' : '#485449',
      shallowColor: isExodus ? '#8c7a5b' : '#8d8b74',
      sunColor: '#ffe3a6',
      opacity: 0.90
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    streetGroup.add(riverMesh);

    // Floating River Lanterns & Arched Stone Footbridges along the River
    const riverLanterns = [];
    for (let i = 0; i < 28; i++) {
      const lz = 10 - i * 16.0;
      const pt = this.getPathPoint(lz);
      const lantern = this.propBuilder.createFloatingRiverLantern('#ffe09c');
      lantern.position.set(pt.x - 10.5 + Math.sin(i * 2.1) * 3.2, pt.y - 0.10, lz);
      streetGroup.add(lantern);
      riverLanterns.push({ mesh: lantern, baseY: pt.y - 0.10, phase: i * 1.3 });
    }

    for (const bridgeZ of [-35, -145, -245, -355]) {
      const pt = this.getPathPoint(bridgeZ);
      const bridge = this.propBuilder.createStoneFootbridge({
        ground: isExodus ? '#82694f' : '#756856',
        accent: '#dbb87b'
      });
      bridge.position.set(pt.x - 10.5, pt.y - 0.1, bridgeZ);
      streetGroup.add(bridge);
    }

    // For Exodus Part 1, line the Nile riverbank with swaying Papyrus Reed Clusters & Moses' basket
    if (isExodus) {
      for (let r = 0; r < 18; r++) {
        const rz = -4.0 - r * 6.2;
        const pt = this.getPathPoint(rz);
        const reeds = this.propBuilder.createPapyrusReedCluster(
          { ground: '#54663e', accent: '#e0c284' },
          r === 2 || r === 3
        );
        reeds.position.set(pt.x - 5.2 - (r % 2) * 1.4, pt.y - 0.08, rz);
        streetGroup.add(reeds);
      }
    }

    // 4. 2,600 Wind-Swaying Instanced Golden Meadow Grass & Wildflowers lining both sides of the Street
    const streetGrass = this.propBuilder.createInstancedMeadowGrass(
      2600,
      (idx, totalCount) => {
        const z = 20 - (idx / totalCount) * 460 + (Math.random() - 0.5) * 3.0;
        const pt = this.getPathPoint(z);
        const side = idx % 2 === 0 ? 1 : -1;
        let offset = 3.1 + Math.pow(Math.random(), 0.8) * 11.0;
        if (side < 0 && offset > 5.0 && offset < 15.0) {
          offset = Math.random() < 0.65 ? 3.0 + Math.random() * 1.8 : 16.2 + Math.random() * 3.5;
        }
        const x = pt.x + side * offset;
        const distFromPath = Math.abs(x - pt.x);
        const hillFactor = Math.max(0, (distFromPath - 4.8) / 18.0);
        const hillHeight =
          Math.pow(Math.min(2.5, hillFactor), 1.35) *
          (2.8 + Math.sin(z * 0.04 + x * 0.08) * 1.6 + Math.cos(z * 0.025) * 1.2);
        return {
          x,
          y: pt.y + (side < 0 && offset < 5.0 ? 0.0 : hillHeight),
          z,
          scale: 0.75 + Math.random() * 0.7
        };
      },
      isExodus
        ? { ground: '#6e6444', accent: '#ebd094', horizon: '#c49d74' }
        : { ground: '#646848', accent: '#e2bd84', horizon: '#b69375' }
    );
    streetGroup.add(streetGrass);

    // 5. Angled 3D Komorebi Sunbeam Shafts slanting down across the road at intervals
    for (let s = 0; s < 22; s++) {
      const sz = 4 - s * 20.5;
      const pt = this.getPathPoint(sz);
      const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.8, 3.2, '#ffe4a3');
      shaft.position.set(pt.x + (s % 2 === 0 ? 2.5 : -2.5), pt.y + 7.2, sz);
      streetGroup.add(shaft);
    }

    // 6. Build Gatehouse Starting Courtyard at z = +18 to +4
    const gatehouseArch = this.buildGatehouseCourtyard(manifest);
    streetGroup.add(gatehouseArch);

    // 7. Place Part Banners dynamically aligned with each Part's starting painting
    manifest.parts.forEach((part) => {
      const startIdx = Math.max(0, (part.startN || 1) - 1);
      const partOffset = (part.index - 1) * 7.5;
      const firstPaintingZ = -9.0 - (startIdx * 9.8 + partOffset);
      const bz = firstPaintingZ + 6.5;
      const pt = this.getPathPoint(bz);
      const banner = this.createPartBannerArch(part);
      banner.position.set(pt.x, pt.y, pt.z);
      streetGroup.add(banner);
    });

    // 8. Place all 40 Paintings along the Genesis Path in exact Book Order
    const paintingNodes = [];
    const total = paintings.length;

    for (let idx = 0; idx < total; idx++) {
      const p = paintings[idx];
      const partOffset = (p.part - 1) * 7.5;
      const z = -9.0 - (idx * 9.8 + partOffset);
      const pt = this.getPathPoint(z);
      const tan = this.getPathTangent(z);

      const side = idx % 2 === 0 ? -1 : 1;
      const lateralOffset = p.isScene ? side * 3.5 : side * 4.2;
      const nx = -tan.z;
      const nz = tan.x;

      const worldX = pt.x + nx * lateralOffset;
      const worldY = pt.y;
      const worldZ = pt.z + nz * lateralOffset;

      const tex = await this.loadTextureAsync(p.isScene ? p.heroSrc : p.webSrc);
      tex.colorSpace = THREE.SRGBColorSpace;
      if (onProgress) onProgress(idx + 1, total);

      const monument = this.propBuilder.createPaintingMonument(p, tex, p.isScene);
      monument.position.set(worldX, worldY, worldZ);

      const lookTargetX = pt.x - tan.x * 3.5;
      const lookTargetZ = pt.z - tan.z * 3.5;
      monument.lookAt(lookTargetX, worldY, lookTargetZ);

      streetGroup.add(monument);

      this.dressPaintingSurroundings(streetGroup, worldX, worldY, worldZ, side, p, manifest.slug);

      paintingNodes.push({
        data: p,
        meshGroup: monument,
        texture: tex,
        position: new THREE.Vector3(worldX, worldY, worldZ),
        roadPosition: new THREE.Vector3(pt.x, pt.y, pt.z),
        part: p.part
      });
    }

    // District 3 (Fire by Night) Signature Street Element (§7):
    // The Pillar of Fire that goes BEFORE the pilgrim at night — moves ahead as you walk, waits when you stop
    let guidingPillar = null;
    if (manifest.slug === 'fire-by-night') {
      guidingPillar = this.propBuilder.createGuidingPillarOfFire();
      const startGuidePt = this.getPathPoint(1.0);
      guidingPillar.position.set(startGuidePt.x, startGuidePt.y, startGuidePt.z);
      streetGroup.add(guidingPillar);
    }

    // 9. Place the Hidden Lights (One per Part)
    const partGatesAndLights = this.createPartsLightsAndVeils(streetGroup, manifest, paintingNodes);

    // 10. Build the Amen Gate & Finale Plaza at the end of the district
    const amenPlaza = this.buildAmenGatePlaza(manifest);
    streetGroup.add(amenPlaza.group);

    // 11. Ambient Drifting Golden Motes along the entire Street
    const streetMotes = this.createStreetAtmosphereMotes(380);
    streetGroup.add(streetMotes);

    return {
      streetGroup,
      paintingNodes,
      partGatesAndLights,
      amenPlaza,
      streetMotes,
      riverMat,
      riverLanterns,
      guidingPillar
    };
  }

  loadTextureAsync(url) {
    return new Promise((resolve) => {
      this.textureLoader.load(
        url,
        (tex) => resolve(tex),
        undefined,
        () => {
          const c = document.createElement('canvas');
          c.width = 64;
          c.height = 64;
          resolve(new this.THREE.CanvasTexture(c));
        }
      );
    });
  }

  dressPaintingSurroundings(streetGroup, wx, wy, wz, side, pData, slug = 'genesis') {
    const THREE = this.THREE;
    const pal = pData.palette || {};
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#686050',
      accentColor: pal.accent || '#dbb87b',
      roughness: 0.92
    });

    for (let r = 0; r < 2; r++) {
      const rockGeo = this.propBuilder.displaceGeometry(new THREE.DodecahedronGeometry(0.45 + r * 0.25, 1), 0.08, 3.0);
      const rock = new THREE.Mesh(rockGeo, stoneMat);
      rock.position.set(wx + side * (1.8 + r * 0.9), wy + 0.2, wz - 0.8 + r * 1.4);
      rock.scale.set(1.4, 0.7, 1.2);
      streetGroup.add(rock);
    }

    if (slug === 'exodus') {
      if (pData.n === 6 || pData.n === 8) {
        const bush = this.propBuilder.createBurningBush(null, pal, 0.78);
        bush.position.set(wx + side * 3.0, wy, wz - 1.2);
        streetGroup.add(bush);
        return;
      }
      if (pData.n === 20) {
        const wall = this.propBuilder.createPartedSeaWall(14, 6.5, side, pal);
        wall.position.set(wx + side * 2.6, wy - 0.2, wz);
        streetGroup.add(wall);
        return;
      }
    } else if (slug === 'fire-by-night') {
      if (pData.n === 2) {
        const altar = this.propBuilder.createPerpetualFireAltar(null, pal);
        altar.scale.setScalar(0.65);
        altar.position.set(wx + side * 2.8, wy, wz - 1.0);
        streetGroup.add(altar);
        return;
      }
    } else if (slug === 'choose-life') {
      if (pData.n === 25) {
        const sheaf = this.propBuilder.createForgottenSheafField(null, pal);
        sheaf.position.set(wx + side * 2.5, wy, wz - 0.8);
        streetGroup.add(sheaf);
        return;
      }
    } else if (slug === 'joshua-judges') {
      if (pData.n === 20) {
        const chest = this.propBuilder.createJosephChestAtShechem();
        chest.position.set(wx + side * 2.4, wy, wz - 0.8);
        streetGroup.add(chest);
        return;
      }
    } else if (slug === 'ruth') {
      if (pData.n === 6 || pData.n === 12) {
        const sheaf = this.propBuilder.createForgottenSheafField(null, pal);
        sheaf.position.set(wx + side * 2.4, wy, wz - 0.8);
        streetGroup.add(sheaf);
        return;
      }
    }

    const tree = this.propBuilder.createGreatPainterlyTree(null, pal, 0.72 + (pData.n % 3) * 0.16);
    tree.position.set(wx + side * 3.2, wy, wz - 1.4);
    tree.rotation.y = pData.n * 1.1;
    streetGroup.add(tree);
  }

  buildGatehouseCourtyard(manifest) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const pt = this.getPathPoint(16);
    const slug = manifest.slug;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6c58',
      accentColor: '#dfbe86',
      roughness: 0.88,
      bumpScale: 0.06
    });

    const plazaGeo = this.propBuilder.displaceGeometry(new THREE.CylinderGeometry(8.5, 9.0, 0.16, 36), 0.02, 2.5);
    const plaza = new THREE.Mesh(plazaGeo, stoneMat);
    plaza.position.set(pt.x, pt.y + 0.01, pt.z);
    group.add(plaza);

    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const ang = (i / 4) * Math.PI * 0.75;
      const gx = pt.x + Math.sin(ang) * 7.5;
      const gz = pt.z + Math.cos(ang) * 5.2;

      const pillarGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(0.65, 3.6, 0.65, 4, 8, 4), 0.03, 3.5);
      const pillar = new THREE.Mesh(pillarGeo, stoneMat);
      pillar.position.set(gx, pt.y + 1.8, gz);
      pillar.lookAt(pt.x, pt.y + 1.8, pt.z);
      group.add(pillar);
    }

    const titlesBySlug = {
      genesis: 'DISTRICT I · GENESIS — IN THE BEGINNING',
      exodus: 'DISTRICT II · EXODUS — LET MY PEOPLE GO',
      'fire-by-night': 'DISTRICT III · FIRE BY NIGHT — LEVITICUS & NUMBERS',
      'choose-life': 'DISTRICT IV · CHOOSE LIFE — DEUTERONOMY',
      'joshua-judges': 'DISTRICT V · BE STRONG AND COURAGEOUS — JOSHUA & JUDGES',
      ruth: 'DISTRICT VI · WHERE YOU GO — RUTH'
    };

    const gatePt = this.getPathPoint(6);
    const gateArch = this.createPartBannerArch({
      index: 0,
      title: titlesBySlug[slug] || manifest.title.toUpperCase(),
      epigraph: `${manifest.paintings.length} Paintings · ${manifest.parts.length} Parts · Step through glowing frames with [E]`,
      epigraphRef: 'POEMS & PICTURES BY TIMOTHY HOLT'
    });
    gateArch.position.set(gatePt.x, gatePt.y, gatePt.z);
    group.add(gateArch);

    return group;
  }

  createPartBannerArch(part) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#786a56',
      accentColor: '#d9b57c',
      roughness: 0.9,
      bumpScale: 0.05
    });

    for (const sx of [-3.4, 3.4]) {
      const colGeo = this.propBuilder.displaceGeometry(new THREE.CylinderGeometry(0.32, 0.42, 4.6, 12, 8), 0.03, 3.5);
      const col = new THREE.Mesh(colGeo, stoneMat);
      col.position.set(sx, 2.3, 0);
      group.add(col);
    }

    const beamGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(7.6, 0.45, 0.55, 12, 3, 4), 0.03, 3.5);
    const beam = new THREE.Mesh(beamGeo, stoneMat);
    beam.position.set(0, 4.65, 0);
    group.add(beam);

    // Glowing golden lantern ring suspended under the arch (Komorebi torii/lantern motif)
    const ringGeo = new THREE.TorusGeometry(0.45, 0.035, 10, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe29e,
      transparent: true,
      opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 3.45, 0);
    group.add(ring);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#261f18';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#c8a468';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, 1004, 236);

    ctx.fillStyle = '#f5e7cc';
    ctx.font = 'bold 38px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(part.title.toUpperCase(), 512, 95);

    ctx.fillStyle = '#d9b882';
    ctx.font = 'italic 26px Georgia, serif';
    ctx.fillText(`“${part.epigraph}”`, 512, 158);

    ctx.fillStyle = '#a89270';
    ctx.font = '22px Georgia, serif';
    ctx.fillText(part.epigraphRef, 512, 208);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 1.4),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
    );
    signMesh.position.set(0, 4.65, 0.3);
    group.add(signMesh);

    return group;
  }

  createPartsLightsAndVeils(streetGroup, manifest) {
    const THREE = this.THREE;
    const glowTex = this.painterly.createGlowSpriteTexture('#ffe6a3');
    const slug = manifest.slug;

    const lightsBySlug = {
      genesis: [
        {
          part: 1,
          id: 'genesis-light-1',
          name: 'The Light of the Garden',
          hint: 'Hidden among the olive boughs near “where are you?” & “clothed” (Part One)',
          z: -82.0,
          lateral: 6.2,
          height: 1.85,
          veilZ: -129.0
        },
        {
          part: 2,
          id: 'genesis-light-2',
          name: 'The Light of the Promise',
          hint: 'Shimmering beside the desert spring near “the God who sees” & “the camels too” (Part Two)',
          z: -186.0,
          lateral: -6.4,
          height: 1.45,
          veilZ: -215.0
        },
        {
          part: 3,
          id: 'genesis-light-3',
          name: 'The Light of Peniel',
          hint: 'Resting by the river stones near “until the day breaks” & “the limp” (Part Three)',
          z: -268.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -292.0
        },
        {
          part: 4,
          id: 'genesis-light-4',
          name: 'The Light of the Road Home',
          hint: 'Glowing near the wagons of promise before the Amen Gate (Part Four)',
          z: -396.0,
          lateral: -5.8,
          height: 1.65,
          veilZ: -426.0
        }
      ],
      exodus: [
        {
          part: 1,
          id: 'exodus-light-1',
          name: 'The Light of Horeb',
          hint: 'Glowing beside the desert stones near “holy ground” & “I AM” (Part One)',
          z: -74.0,
          lateral: 6.2,
          height: 1.85,
          veilZ: -105.0
        },
        {
          part: 2,
          id: 'exodus-light-2',
          name: 'The Light in Goshen',
          hint: 'Shining near “light in Goshen” & “when I see” before the sea (Part Two)',
          z: -162.0,
          lateral: -6.2,
          height: 1.55,
          veilZ: -192.0
        },
        {
          part: 3,
          id: 'exodus-light-3',
          name: 'The Light of the Parted Sea',
          hint: 'Resting by the desert spring near “water from stone” & “held-up hands” (Part Three)',
          z: -258.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -288.0
        },
        {
          part: 4,
          id: 'exodus-light-4',
          name: 'The Light of the Tent of Meeting',
          hint: 'Glowing near “the cleft of the rock” & “shining” before the Tabernacle Plaza (Part Four)',
          z: -396.0,
          lateral: -5.8,
          height: 1.65,
          veilZ: -426.0
        }
      ],
      'fire-by-night': [
        {
          part: 1,
          id: 'fire-by-night-light-1',
          name: 'The Light of the Morning Coals',
          hint: 'Glowing beside the altar stones near “it shall not go out” & “hands lifted” (Part One)',
          z: -56.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -78.0
        },
        {
          part: 2,
          id: 'fire-by-night-light-2',
          name: 'The Light of Jubilee',
          hint: 'Shimmering near “the corners of the field” & “jubilee” (Part Two)',
          z: -145.0,
          lateral: -6.2,
          height: 1.55,
          veilZ: -175.0
        },
        {
          part: 3,
          id: 'fire-by-night-light-3',
          name: 'The Light of the Seven Lamps',
          hint: 'Shining near “seven lamps” & “cloud and fire” (Part Three)',
          z: -232.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -262.0
        },
        {
          part: 4,
          id: 'fire-by-night-light-4',
          name: 'The Light of the Budded Rod',
          hint: 'Resting near “the rod that budded” & “abundantly” (Part Four)',
          z: -318.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -348.0
        },
        {
          part: 5,
          id: 'fire-by-night-light-5',
          name: 'The Star Out of Jacob',
          hint: 'Glowing near “but not near” & “cities of refuge” before the Amen Gate (Part Five)',
          z: -405.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -428.0
        }
      ],
      'choose-life': [
        {
          part: 1,
          id: 'choose-life-light-1',
          name: 'The Light of Remembrance',
          hint: 'Glowing beside the campfire stones near “so near” & “what your eyes saw” (Part One)',
          z: -62.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -88.0
        },
        {
          part: 2,
          id: 'choose-life-light-2',
          name: 'The Light of the Doorpost',
          hint: 'Shining near “the doorpost” & “not by bread alone” (Part Two)',
          z: -162.0,
          lateral: -6.2,
          height: 1.55,
          veilZ: -192.0
        },
        {
          part: 3,
          id: 'choose-life-light-3',
          name: 'The Light of the Open Hand',
          hint: 'Resting near “the forgotten sheaf” & “the basket” (Part Three)',
          z: -248.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -275.0
        },
        {
          part: 4,
          id: 'choose-life-light-4',
          name: 'The Light of Mount Nebo',
          hint: 'Glowing near “choose” & “Nebo” before the Two Gates Plaza (Part Four)',
          z: -358.0,
          lateral: -5.8,
          height: 1.65,
          veilZ: -388.0
        }
      ],
      'joshua-judges': [
        {
          part: 1,
          id: 'joshua-judges-light-1',
          name: 'The Light of the Jordan Crossing',
          hint: 'Beside the twelve wet river stones near “what these stones mean” (Part One)',
          z: -62.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -95.0
        },
        {
          part: 2,
          id: 'joshua-judges-light-2',
          name: 'The Light of the Covenant Oak',
          hint: 'Under the ancient oak of Shechem near “the stone heard” & “Joseph’s bones” (Part Two)',
          z: -168.0,
          lateral: -6.2,
          height: 1.55,
          veilZ: -198.0
        },
        {
          part: 3,
          id: 'joshua-judges-light-3',
          name: 'The Light of Deborah’s Palm',
          hint: 'In the shade of the hill-country palm near “under the palm tree” (Part Three)',
          z: -242.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -268.0
        },
        {
          part: 4,
          id: 'joshua-judges-light-4',
          name: 'The Light of the Broken Pitcher',
          hint: 'Where the clay pitcher shatters near “torches in jars” (Part Four)',
          z: -318.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -335.0
        },
        {
          part: 5,
          id: 'joshua-judges-light-5',
          name: 'The Light of the Answered Prayer',
          hint: 'Glowing near “out of the strong” & “remember me” before the Amen Gate (Part Five)',
          z: -398.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -426.0
        }
      ],
      ruth: [
        {
          part: 1,
          id: 'ruth-light-1',
          name: 'The Light of the Bethlehem Road',
          hint: 'Beside the road milestone near “where you go” & “barley harvest” (Chapter One)',
          z: -48.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -64.0
        },
        {
          part: 2,
          id: 'ruth-light-2',
          name: 'The Light of the Gleaner’s Field',
          hint: 'Among the golden barley sheaves near “the edges” & “under his wings” (Chapter Two)',
          z: -108.0,
          lateral: -6.0,
          height: 1.55,
          veilZ: -128.0
        },
        {
          part: 3,
          id: 'ruth-light-3',
          name: 'The Light of the Sheltering Wing',
          hint: 'By the winnowing floor near “the corner of the cloak” & “not empty” (Chapter Three)',
          z: -168.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -192.0
        },
        {
          part: 4,
          id: 'ruth-light-4',
          name: 'The Light of the House of Bread',
          hint: 'Near “the sandal” & “the family line” before the Amen Gate (Chapter Four)',
          z: -235.0,
          lateral: -5.8,
          height: 1.65,
          veilZ: -258.0
        }
      ]
    };

    const lightConfigs = lightsBySlug[slug] || lightsBySlug.genesis;

    return lightConfigs.map((cfg) => {
      const pt = this.getPathPoint(cfg.z);
      const wx = pt.x + cfg.lateral;
      const wy = pt.y + cfg.height;
      const wz = pt.z;

      const lightGroup = new THREE.Group();
      lightGroup.position.set(wx, wy, wz);

      const pedMat = this.painterly.createPainterlyMaterial({
        baseColor: '#736552',
        accentColor: '#e6c487',
        roughness: 0.88
      });
      const pedGeo = this.propBuilder.displaceGeometry(new THREE.CylinderGeometry(0.28, 0.45, cfg.height, 10), 0.03, 4.0);
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.y = -cfg.height * 0.5;
      lightGroup.add(ped);

      const coreMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xfff0c2 })
      );
      lightGroup.add(coreMesh);

      const haloSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffdf91,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending
        })
      );
      haloSprite.scale.set(2.4, 2.4, 1);
      lightGroup.add(haloSprite);

      const pointLight = new THREE.PointLight(0xffe094, 1.8, 16);
      lightGroup.add(pointLight);
      streetGroup.add(lightGroup);

      const veilPt = this.getPathPoint(cfg.veilZ);
      const veilGroup = new THREE.Group();
      veilGroup.position.set(veilPt.x, veilPt.y, veilPt.z);

      const veilMat = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#d9b87c') },
          uOpacity: { value: 0.55 }
        },
        vertexShader: /* glsl */`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */`
          uniform float uTime;
          uniform vec3 uColor;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            float fade = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(1.0, 0.1, vUv.y);
            float wave = 0.5 + 0.5 * sin(vUv.x * 16.0 + uTime * 2.0 + cos(vUv.y * 10.0));
            gl_FragColor = vec4(uColor, fade * (0.35 + 0.45 * wave) * uOpacity);
          }
        `
      });
      const veilPlane = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 4.2), veilMat);
      veilPlane.position.y = 2.1;
      veilGroup.add(veilPlane);
      streetGroup.add(veilGroup);

      return {
        ...cfg,
        kindled: false,
        position: new THREE.Vector3(wx, wy, wz),
        lightGroup,
        haloSprite,
        pointLight,
        veilGroup,
        veilMat
      };
    });
  }

  buildAmenGatePlaza(manifest) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const slug = manifest.slug;
    const plazaZ = slug === 'ruth' ? -268 : slug === 'choose-life' ? -398 : -436;
    const pt = this.getPathPoint(plazaZ);
    group.position.set(pt.x, pt.y, pt.z);

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d6e59',
      accentColor: '#efd39e',
      roughness: 0.86
    });

    const plazaFloor = new THREE.Mesh(
      this.propBuilder.displaceGeometry(new THREE.CylinderGeometry(10.5, 11.2, 0.22, 40), 0.03, 2.5),
      stoneMat
    );
    group.add(plazaFloor);

    if (slug === 'exodus') {
      const tabernacle = this.propBuilder.createTabernacleAndPillar(
        null,
        { ground: '#6e583f', horizon: '#c9a26d', accent: '#ffe094' },
        0.78
      );
      tabernacle.position.set(0, 0.1, -4.8);
      group.add(tabernacle);
    } else if (slug === 'fire-by-night') {
      const menorah = this.propBuilder.createGoldenMenorah(null, {
        ground: '#6e583f',
        horizon: '#c9a26d',
        accent: '#ffe094'
      });
      menorah.position.set(0, 0.1, -4.2);
      group.add(menorah);
    } else if (slug === 'choose-life') {
      // District 4 Signature Element: Fork of Two Gates (Blessing & Curse) + Stone of Witness
      const fork = this.propBuilder.createTwoRoadsForkAndWitness(null, {
        ground: '#786c5a',
        accent: '#f0d298'
      });
      fork.position.set(0, 0.1, -3.5);
      group.add(fork);
    } else if (slug === 'joshua-judges') {
      const shofar = this.propBuilder.createJerichoShofarAndFallenStones();
      shofar.group.position.set(0, 0.1, -4.0);
      group.add(shofar.group);
    } else if (slug === 'ruth') {
      const sandal = this.propBuilder.createBethlehemGateAndSandal();
      sandal.group.position.set(0, 0.1, -4.0);
      group.add(sandal.group);
    } else {
      const treeOfLife = this.propBuilder.createGreatPainterlyTree(
        null,
        { ground: '#63533f', horizon: '#b89b72', accent: '#f5d996' },
        1.45
      );
      treeOfLife.position.set(0, 0.1, -5.5);
      group.add(treeOfLife);

      const finaleBench = this.propBuilder.createStoneBench(null, {
        ground: '#786c5a',
        accent: '#f0d298'
      });
      finaleBench.position.set(0, 0.1, -2.6);
      group.add(finaleBench);
    }

    const amenConfigs = {
      genesis: {
        title: 'AMEN GATE · IN THE BEGINNING COMPLETED',
        epigraph: 'God will surely come for you — walk through or press [E] to enter Exodus',
        epigraphRef: 'APPROACH & PRESS [E] TO CONTINUE TO DISTRICT II: EXODUS'
      },
      exodus: {
        title: 'AMEN GATE · LET MY PEOPLE GO COMPLETED',
        epigraph: 'Yahweh’s glory filled the tabernacle — the road continues to Fire by Night',
        epigraphRef: 'APPROACH & PRESS [E] TO CONTINUE TO DISTRICT III: FIRE BY NIGHT'
      },
      'fire-by-night': {
        title: 'AMEN GATE · FIRE BY NIGHT COMPLETED',
        epigraph: 'The long road through the wilderness reaches the plains of Moab',
        epigraphRef: 'APPROACH & PRESS [E] TO CONTINUE TO DISTRICT IV: CHOOSE LIFE'
      },
      'choose-life': {
        title: 'AMEN GATE · CHOOSE LIFE COMPLETED',
        epigraph: 'Therefore choose life, that you may live — cross the Jordan into Joshua & Judges',
        epigraphRef: 'APPROACH & PRESS [E] TO CONTINUE TO DISTRICT V: BE STRONG AND COURAGEOUS'
      },
      'joshua-judges': {
        title: 'AMEN GATE · BE STRONG AND COURAGEOUS COMPLETED',
        epigraph: 'Not one thing has failed of all the good things which Yahweh spoke',
        epigraphRef: 'APPROACH & PRESS [E] TO CONTINUE TO DISTRICT VI: WHERE YOU GO (RUTH)'
      },
      ruth: {
        title: 'AMEN GATE · WHERE YOU GO COMPLETED',
        epigraph: 'Blessed be Yahweh, who has not left you today without a near kinsman',
        epigraphRef: 'APPROACH & PRESS [E] TO COMPLETE RUTH & RETURN TO THE GATEHOUSE'
      }
    };

    const amenArch = this.createPartBannerArch({
      index: 5,
      ...(amenConfigs[slug] || amenConfigs.genesis)
    });
    amenArch.position.set(0, 0.1, -9.2);
    group.add(amenArch);

    const amenLight = new THREE.PointLight(0xffe4a0, 3.0, 26);
    amenLight.position.set(0, 4.5, -5.5);
    group.add(amenLight);

    return {
      group,
      position: new THREE.Vector3(pt.x, pt.y, pt.z - 3.5)
    };
  }

  // ============================================================================
  // THE 3D WALKABLE GATEHOUSE COURTYARD HUB (All 44 Book Gates in Storyline Order)
  // ============================================================================
  async buildGatehouseHubWorld(routeData, coversData, saveData, playableRouteSlugs) {
    const THREE = this.THREE;
    const hubGroup = new THREE.Group();

    const groundMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5e5643',
      accentColor: '#b89a6e',
      roughness: 0.9,
      bumpScale: 0.06
    });
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7a61',
      accentColor: '#e6c994',
      roughness: 0.85,
      bumpScale: 0.05
    });

    // Sculpted Garden Courtyard Terrain
    const floorGeo = new THREE.PlaneGeometry(90, 160, 48, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, groundMat);
    floor.position.set(0, -0.05, -45);
    hubGroup.add(floor);

    // Central Stone Walkway & Reflective Garden Pool
    const walkway = new THREE.Mesh(
      this.propBuilder.displaceGeometry(new THREE.BoxGeometry(10.5, 0.12, 130, 12, 2, 48), 0.02, 2.5),
      stoneMat
    );
    walkway.position.set(0, 0.0, -45);
    hubGroup.add(walkway);

    const poolGeo = new THREE.PlaneGeometry(4.2, 95, 16, 48);
    poolGeo.rotateX(-Math.PI / 2);
    const poolMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#354a47',
      shallowColor: '#8c8a6d',
      sunColor: '#ffe4a3',
      opacity: 0.9
    });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(0, 0.08, -45);
    hubGroup.add(pool);

    // Welcome Arch at the entrance of the Gatehouse Courtyard
    const welcomeArch = this.createPartBannerArch({
      index: 0,
      title: 'THE GATEHOUSE · 44 BOOKS · 1,677 PAINTINGS',
      epigraph: 'Walk up to any open gate and press [E] to enter its street',
      epigraphRef: 'OLD TESTAMENT ON THE LEFT · NEW TESTAMENT ON THE RIGHT'
    });
    welcomeArch.position.set(0, 0, 4);
    hubGroup.add(welcomeArch);

    // Place all 44 Gates along the West (left, #1..22) and East (right, #23..44) colonnades
    const gateNodes = [];
    for (let i = 0; i < routeData.length; i++) {
      const d = routeData[i];
      const isLeft = i < 22;
      const rowIdx = isLeft ? i : i - 22;
      const gx = isLeft ? -8.2 : 8.2;
      const gz = -2.0 - rowIdx * 4.8;

      const internalSlug = playableRouteSlugs[d.slug] || null;
      const isPlayable = !!internalSlug;
      const isCompleted = internalSlug && saveData.districtsCompleted.includes(internalSlug);
      const lightsCount = internalSlug
        ? saveData.lightsKindled.filter((id) => id.startsWith(`${internalSlug}-`)).length
        : 0;

      let coverTex = null;
      if (coversData && coversData[d.slug]) {
        coverTex = await this.loadTextureAsync(coversData[d.slug]);
        coverTex.colorSpace = THREE.SRGBColorSpace;
      }

      const gateMesh = this.propBuilder.createGatehouseBookGate(
        d,
        coverTex,
        isPlayable,
        isCompleted,
        lightsCount
      );
      gateMesh.position.set(gx, 0, gz);
      gateMesh.rotation.y = isLeft ? Math.PI / 2 - 0.15 : -Math.PI / 2 + 0.15;
      hubGroup.add(gateMesh);

      gateNodes.push({
        routeItem: d,
        internalSlug,
        isPlayable,
        isCompleted,
        position: new THREE.Vector3(gx, 0, gz)
      });
    }

    // Lush olive trees & instanced wildflowers framing the Gatehouse Colonnade
    for (let t = 0; t < 12; t++) {
      const tz = -4 - t * 9.5;
      for (const sx of [-13.5, 13.5]) {
        const tree = this.propBuilder.createGreatPainterlyTree(null, {}, 0.85 + (t % 3) * 0.15);
        tree.position.set(sx, 0, tz);
        hubGroup.add(tree);
      }
    }

    const hubGrass = this.propBuilder.createInstancedMeadowGrass(
      900,
      () => {
        const side = Math.random() < 0.5 ? -1 : 1;
        const x = side * (5.6 + Math.random() * 14.0);
        const z = 8 - Math.random() * 120;
        return { x, y: 0, z };
      },
      { ground: '#646848', accent: '#e2bd84', horizon: '#b69375' }
    );
    hubGroup.add(hubGrass);

    return {
      hubGroup,
      gateNodes,
      poolMat
    };
  }

  createStreetAtmosphereMotes(count = 380) {
    const THREE = this.THREE;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const z = 15 - Math.random() * 455;
      const pt = this.getPathPoint(z);
      pos[i * 3] = pt.x + (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = pt.y + 0.5 + Math.random() * 5.5;
      pos[i * 3 + 2] = z;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const spriteTex = this.painterly.createGlowSpriteTexture('#ffe4a8');
    const mat = new THREE.PointsMaterial({
      map: spriteTex,
      size: 0.30,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    return new THREE.Points(geo, mat);
  }
}

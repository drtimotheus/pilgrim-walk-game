// ============================================================================
// THE PILGRIM WALK — Genesis District & Gatehouse Courtyard World Builder
// Upgraded with the "Komorebi: A Forest Flight" atmospheric pipeline:
//   - Animated reflective river with sun glints, shoreline foam & floating lanterns
//   - Arched weathered stone footbridges crossing the river
//   - 2,600+ wind-swaying instanced meadow grass & wildflower tufts along the road
//   - Angled 3D Komorebi sunbeam shafts slanting through the olive & oak canopy
//   - 40 paintings in book order across 4 parts + 4 hidden Lights + Amen Gate
// ============================================================================

import { createKomorebiWaterMaterial } from './postprocess.js?v=44_17';

export class GenesisDistrictBuilder {
  constructor(THREE, painterly, propBuilder) {
    this.THREE = THREE;
    this.painterly = painterly;
    this.propBuilder = propBuilder;
    this.textureLoader = new THREE.TextureLoader();
  }

  getDistrictBiomeConfig(slug = 'genesis') {
    const wildernessSlugs = new Set([
      'exodus',
      'fire-by-night',
      'choose-life',
      'out-of-the-whirlwind',
      'a-door-of-hope'
    ]);
    const babylonSlugs = new Set([
      'greatly-beloved',
      'for-such-a-time-as-this'
    ]);
    const citadelSlugs = new Set([
      'joshua-judges',
      'kings',
      'our-eyes-are-on-you',
      'rise-up-and-build',
      'a-future-and-a-hope',
      'new-every-morning',
      'the-day-of-small-things'
    ]);
    const maritimeSlugs = new Set([
      'out-of-the-deep',
      'peace-be-still',
      'to-the-ends-of-the-earth',
      'doers-of-the-word'
    ]);
    const sanctuarySlugs = new Set([
      'arise-shine',
      'can-these-bones-live',
      'anchor-of-the-soul',
      'all-things-new',
      'come-and-see'
    ]);
    const harvestSlugs = new Set([
      'genesis',
      'ruth',
      'samuel',
      'psalms-4',
      'many-waters',
      'good-news-of-great-joy',
      'i-am-with-you-always'
    ]);

    if (slug === 'psalms-1') {
      return {
        biome: 'planted_by_water',
        groundColor: '#586646',
        groundAccent: '#dbbe7c',
        pathColor: '#a8916f',
        pathAccent: '#ebd5ae',
        waterDeep: '#264f47',
        waterShallow: '#84b099',
        grassCount: 2500,
        grassPalette: { ground: '#596b47', accent: '#e8c987', horizon: '#b59672' },
        hasBridges: true,
        bridgePalette: { ground: '#786b58', accent: '#dfbe82' },
        skyTop: '#42667d',
        skyMid: '#88a399',
        skyHorizon: '#f5d69b',
        fogColor: '#918068',
        starIntensity: 0.08,
        sunbeamColor: '#ffe8a8'
      };
    }

    if (slug === 'psalms-2') {
      return {
        biome: 'deer_and_forest',
        groundColor: '#5c5a47',
        groundAccent: '#d6c69c',
        pathColor: '#9c8d71',
        pathAccent: '#e6d8bc',
        waterDeep: '#284744',
        waterShallow: '#83a89a',
        grassCount: 2400,
        grassPalette: { ground: '#576246', accent: '#dfd09e', horizon: '#a3977b' },
        hasBridges: true,
        bridgePalette: { ground: '#786e5a', accent: '#dfd2b2' },
        skyTop: '#496373',
        skyMid: '#8c9c94',
        skyHorizon: '#f0ddb2',
        fogColor: '#8f846f',
        starIntensity: 0.06,
        sunbeamColor: '#ffebad'
      };
    }

    if (slug === 'psalms-3') {
      return {
        biome: 'temple_courts',
        groundColor: '#7a6f59',
        groundAccent: '#e8d4a2',
        pathColor: '#b3a384',
        pathAccent: '#f5e8ca',
        waterDeep: '#2e4a52',
        waterShallow: '#8ea8a6',
        grassCount: 1500,
        grassPalette: { ground: '#6e6c4e', accent: '#e8d49e', horizon: '#b5a37e' },
        hasBridges: true,
        bridgePalette: { ground: '#8c7e65', accent: '#ebd9b2' },
        skyTop: '#425d75',
        skyMid: '#949c8e',
        skyHorizon: '#f5dd9d',
        fogColor: '#9c8d72',
        starIntensity: 0.08,
        sunbeamColor: '#ffe599'
      };
    }

    if (slug === 'psalms-4') {
      return {
        biome: 'breath_and_praise',
        groundColor: '#726a52',
        groundAccent: '#f0da9e',
        pathColor: '#b8a682',
        pathAccent: '#faeed0',
        waterDeep: '#244b5c',
        waterShallow: '#6ba0ab',
        grassCount: 1650,
        grassPalette: { ground: '#6a6c48', accent: '#f0dc9c', horizon: '#bfa878' },
        hasBridges: true,
        bridgePalette: { ground: '#8f7f64', accent: '#f2dfb4' },
        skyTop: '#355878',
        skyMid: '#8a9c94',
        skyHorizon: '#ffe49e',
        fogColor: '#9e8f72',
        starIntensity: 0.10,
        sunbeamColor: '#ffe89e'
      };
    }

    if (babylonSlugs.has(slug)) {
      return {
        biome: 'babylon_fortress',
        groundColor: '#3d394a',
        groundAccent: '#cf9e57',
        pathColor: '#9c8462',
        pathAccent: '#f0d49c',
        waterDeep: '#1a3652',
        waterShallow: '#5e768f',
        grassCount: 700,
        grassPalette: { ground: '#595142', accent: '#e3ba78', horizon: '#9c8260' },
        hasBridges: true,
        bridgePalette: { ground: '#2e4566', accent: '#ebb963' },
        skyTop: '#1c2f4f',
        skyMid: '#455c80',
        skyHorizon: '#e6ae65',
        fogColor: '#7a6858',
        starIntensity: 0.28,
        sunbeamColor: '#ffd48a'
      };
    }

    if (wildernessSlugs.has(slug)) {
      const isNightFire = slug === 'fire-by-night' || slug === 'out-of-the-whirlwind';
      return {
        biome: 'wilderness',
        groundColor: '#8c6142',
        groundAccent: '#e0b079',
        pathColor: '#c49d6e',
        pathAccent: '#f2d8ab',
        waterDeep: '#264d59',
        waterShallow: '#9e825c',
        grassCount: 620,
        grassPalette: { ground: '#7d6845', accent: '#e6c687', horizon: '#c99b6d' },
        hasBridges: false,
        bridgePalette: { ground: '#8c694b', accent: '#dfb57c' },
        skyTop: isNightFire ? '#212b42' : '#42596e',
        skyMid: isNightFire ? '#5c4c48' : '#96795c',
        skyHorizon: isNightFire ? '#e69b56' : '#f0c786',
        fogColor: isNightFire ? '#7d634e' : '#a88967',
        starIntensity: isNightFire ? 0.38 : 0.08,
        sunbeamColor: '#ffd994'
      };
    }

    if (citadelSlugs.has(slug)) {
      return {
        biome: 'walled_citadel',
        groundColor: '#6b5d4b',
        groundAccent: '#c9a877',
        pathColor: '#9e8c73',
        pathAccent: '#e3d2b6',
        waterDeep: '#2f4b4f',
        waterShallow: '#7e826e',
        grassCount: 1100,
        grassPalette: { ground: '#666347', accent: '#dec085', horizon: '#b0926e' },
        hasBridges: true,
        bridgePalette: { ground: '#786955', accent: '#dec089' },
        skyTop: '#354c63',
        skyMid: '#738287',
        skyHorizon: '#e8c289',
        fogColor: '#8f7d66',
        starIntensity: 0.1,
        sunbeamColor: '#ffe09e'
      };
    }

    if (maritimeSlugs.has(slug)) {
      return {
        biome: 'maritime_sea',
        groundColor: '#3f5059',
        groundAccent: '#93aab3',
        pathColor: '#878071',
        pathAccent: '#cfc7b6',
        waterDeep: '#12374f',
        waterShallow: '#467d8f',
        grassCount: 920,
        grassPalette: { ground: '#496159', accent: '#b8ccb8', horizon: '#799196' },
        hasBridges: true,
        bridgePalette: { ground: '#59666e', accent: '#b8c4c9' },
        skyTop: '#1f3f54',
        skyMid: '#4f7385',
        skyHorizon: '#cfe0e3',
        fogColor: '#6d858f',
        starIntensity: 0.12,
        sunbeamColor: '#d9f0ff'
      };
    }

    if (sanctuarySlugs.has(slug)) {
      return {
        biome: 'prophetic_sanctuary',
        groundColor: '#525163',
        groundAccent: '#dec082',
        pathColor: '#b59f7e',
        pathAccent: '#f7e6c4',
        waterDeep: '#20526e',
        waterShallow: '#78c4d4',
        grassCount: 1350,
        grassPalette: { ground: '#5c6954', accent: '#f2d894', horizon: '#b8a27e' },
        hasBridges: true,
        bridgePalette: { ground: '#7a7368', accent: '#f5da9b' },
        skyTop: '#283d66',
        skyMid: '#68789e',
        skyHorizon: '#ffe09e',
        fogColor: '#8c8378',
        starIntensity: 0.22,
        sunbeamColor: '#fff0bd'
      };
    }

    if (harvestSlugs.has(slug)) {
      return {
        biome: 'harvest_pasture',
        groundColor: '#626346',
        groundAccent: '#d6b26f',
        pathColor: '#ab9271',
        pathAccent: '#ebd3ab',
        waterDeep: '#365449',
        waterShallow: '#899474',
        grassCount: 2300,
        grassPalette: { ground: '#646848', accent: '#e6c384', horizon: '#b69375' },
        hasBridges: true,
        bridgePalette: { ground: '#756856', accent: '#dbb87b' },
        skyTop: '#4a6b82',
        skyMid: '#8fa69e',
        skyHorizon: '#f2d399',
        fogColor: '#948067',
        starIntensity: 0.0,
        sunbeamColor: '#ffe4a3'
      };
    }

    return {
      biome: 'epistle_colonnade',
      groundColor: '#695f50',
      groundAccent: '#cfa974',
      pathColor: '#a89378',
      pathAccent: '#e6d4b7',
      waterDeep: '#334d54',
      waterShallow: '#7f8c84',
      grassCount: 1450,
      grassPalette: { ground: '#636649', accent: '#dfc088', horizon: '#b39474' },
      hasBridges: true,
      bridgePalette: { ground: '#7d705d', accent: '#e3c38d' },
      skyTop: '#3f5b73',
      skyMid: '#829699',
      skyHorizon: '#edd09b',
      fogColor: '#8f7e68',
      starIntensity: 0.05,
      sunbeamColor: '#ffe4a6'
    };
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
    const slug = manifest.slug || 'genesis';
    const isExodus = slug === 'exodus';
    const biomeCfg = this.getDistrictBiomeConfig(slug);

    const groundMat = this.painterly.createPainterlyMaterial({
      baseColor: biomeCfg.groundColor,
      accentColor: biomeCfg.groundAccent,
      roughness: 0.90,
      bumpScale: 0.06
    });
    const pathMat = this.painterly.createPainterlyMaterial({
      baseColor: biomeCfg.pathColor,
      accentColor: biomeCfg.pathAccent,
      roughness: 0.84,
      bumpScale: 0.05
    });

    // 1. Sculpted rolling hills & valley floor along the 460-meter road
    const terrainGeo = new THREE.PlaneGeometry(160, 520, 96, 220);
    terrainGeo.rotateX(-Math.PI / 2);
    const tPos = terrainGeo.attributes.position;
    const ridgeMultiplier = biomeCfg.biome === 'wilderness' ? 1.35 : biomeCfg.biome === 'babylon_fortress' ? 0.85 : 1.0;
    for (let i = 0; i < tPos.count; i++) {
      const vx = tPos.getX(i);
      const vz = tPos.getZ(i) - 210;
      tPos.setZ(i, vz);

      const pathPt = this.getPathPoint(vz);
      const distFromPath = Math.abs(vx - pathPt.x);

      // Carve a shallow channel on the left side (vx < pathPt.x - 5.5) for the River / Wadi / Canal
      const riverDist = Math.abs(vx - (pathPt.x - 10.5));
      let riverCarve = 0;
      if (riverDist < 6.2) {
        riverCarve = -Math.cos((riverDist / 6.2) * Math.PI * 0.5) * 0.55;
      }

      const hillFactor = Math.max(0, (distFromPath - 4.8) / 18.0);
      const hillHeight =
        Math.pow(Math.min(2.5, hillFactor), 1.35) *
        (2.8 + Math.sin(vz * 0.04 + vx * 0.08) * 1.6 + Math.cos(vz * 0.025) * 1.2) *
        ridgeMultiplier;
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

    // 3. Komorebi Animated Reflective River / Wadi / Canal / Sea Channel Running Alongside the Path
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
      deepColor: biomeCfg.waterDeep,
      shallowColor: biomeCfg.waterShallow,
      sunColor: biomeCfg.sunbeamColor || '#ffe3a6',
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

    if (biomeCfg.hasBridges) {
      for (const bridgeZ of [-35, -145, -245, -355]) {
        const pt = this.getPathPoint(bridgeZ);
        const bridge = this.propBuilder.createStoneFootbridge(biomeCfg.bridgePalette);
        bridge.position.set(pt.x - 10.5, pt.y - 0.1, bridgeZ);
        streetGroup.add(bridge);
      }
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

    // 4. Biome-Tuned Instanced Grass / Desert Scrub / Barley / Coastal Dune Grass
    const streetGrass = this.propBuilder.createInstancedMeadowGrass(
      biomeCfg.grassCount,
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
          (2.8 + Math.sin(z * 0.04 + x * 0.08) * 1.6 + Math.cos(z * 0.025) * 1.2) *
          ridgeMultiplier;
        return {
          x,
          y: pt.y + (side < 0 && offset < 5.0 ? 0.0 : hillHeight),
          z,
          scale: (biomeCfg.biome === 'wilderness' ? 0.58 : 0.75) + Math.random() * 0.65
        };
      },
      biomeCfg.grassPalette
    );
    streetGroup.add(streetGrass);

    // 4b. Populate the Street Background Hills & Ridges with Book-Specific Architecture & Iconic Event Landmarks
    this.buildDistrictBiomeRidges(streetGroup, slug, biomeCfg);

    // 5. Angled 3D Komorebi Sunbeam Shafts slanting down across the road at intervals
    for (let s = 0; s < 22; s++) {
      const sz = 4 - s * 20.5;
      const pt = this.getPathPoint(sz);
      const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.8, 3.2, biomeCfg.sunbeamColor || '#ffe4a3');
      shaft.position.set(pt.x + (s % 2 === 0 ? 2.5 : -2.5), pt.y + 7.2, sz);
      streetGroup.add(shaft);
    }

    // 6. Build Gatehouse Starting Courtyard at z = +18 to +4
    const gatehouseArch = this.buildGatehouseCourtyard(manifest);
    streetGroup.add(gatehouseArch);

    // 6b. Mount District Hero Relic at the Street Entrance Approach Overlook (Districts IX–XLIV)
    //     Visible immediately on approach after passing the Gatehouse Arch, clear of the road & veils
    const heroRelicCfg = this.propBuilder.tripo?.districtHeroRelicPlacement?.[slug];
    if (heroRelicCfg) {
      const firstPal = (paintings[0] && paintings[0].palette) || {
        ground: biomeCfg.groundColor,
        accent: biomeCfg.groundAccent,
        horizon: biomeCfg.skyHorizon
      };
      const heroEntrance = this.createHeroRelicSanctuaryPedestal(heroRelicCfg, firstPal);
      const hrZ = -3.6;
      const hrPt = this.getPathPoint(hrZ);
      heroEntrance.position.set(hrPt.x + 5.0, hrPt.y, hrZ);
      heroEntrance.lookAt(hrPt.x, hrPt.y + 0.6, hrZ + 8.0);
      streetGroup.add(heroEntrance);
    }

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

    // 8. Place all Paintings along the Path in exact Book Order
    //    Progressive Near-to-Far Streaming: await the first 8 paintings (Part 1 near the Gatehouse)
    //    in parallel so the street opens in under 1 second, while Parts 2–5 stream in the background!
    const paintingNodes = [];
    const total = paintings.length;
    const nearCount = Math.min(total, 8);
    let nearLoaded = 0;

    const nearTextures = await Promise.all(
      paintings.slice(0, nearCount).map(async (p) => {
        const tex = await this.loadTextureAsync(p.isScene ? p.heroSrc : p.webSrc);
        tex.colorSpace = THREE.SRGBColorSpace;
        nearLoaded++;
        if (onProgress) onProgress(nearLoaded, nearCount);
        return tex;
      })
    );

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

      const isNearLoaded = idx < nearCount;
      const tex = isNearLoaded ? nearTextures[idx] : this.createPalettePlaceholderTexture(p.palette);

      const monument = this.propBuilder.createPaintingMonument(p, tex, p.isScene);
      monument.position.set(worldX, worldY, worldZ);

      const lookTargetX = pt.x - tan.x * 3.5;
      const lookTargetZ = pt.z - tan.z * 3.5;
      monument.lookAt(lookTargetX, worldY, lookTargetZ);

      streetGroup.add(monument);

      this.dressPaintingSurroundings(streetGroup, worldX, worldY, worldZ, side, p, slug, biomeCfg);

      const node = {
        data: p,
        meshGroup: monument,
        texture: tex,
        textureLoaded: isNearLoaded,
        position: new THREE.Vector3(worldX, worldY, worldZ),
        roadPosition: new THREE.Vector3(pt.x, pt.y, pt.z),
        part: p.part
      };
      paintingNodes.push(node);
    }

    if (total > nearCount) {
      this.streamFarPaintingTextures(paintingNodes);
    }

    // District 3 (Fire by Night) Signature Street Element (§7):
    // The Pillar of Fire that goes BEFORE the pilgrim at night — moves ahead as you walk, waits when you stop
    let guidingPillar = null;
    if (slug === 'fire-by-night') {
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

    const heroRelicNodes = [
      ...(streetGroup.userData.heroRelicNodes || []),
      ...(amenPlaza.group.userData.finaleHeroRelicNode ? [amenPlaza.group.userData.finaleHeroRelicNode] : [])
    ];

    return {
      streetGroup,
      paintingNodes,
      heroRelicNodes,
      partGatesAndLights,
      amenPlaza,
      streetMotes,
      riverMat,
      riverLanterns,
      guidingPillar,
      biomeCfg
    };
  }

  // Populates the outer ridges and street vistas with book-specific fortifications, wilderness crags,
  // maritime whales/lighthouses, and iconic biblical event models (such as Daniel's Fiery Furnace & Lions' Den)
  buildDistrictBiomeRidges(streetGroup, slug, biomeCfg) {
    const pal = {
      ground: biomeCfg.groundColor,
      accent: biomeCfg.groundAccent,
      horizon: biomeCfg.skyHorizon
    };

    if (slug === 'greatly-beloved') {
      // Book 24: DANIEL ("Greatly Beloved") — Fortified Babylonian Lapis-Brick Citadel
      // with prominent 3D monuments of the Fiery Furnace and the Lions' Den along the street!
      for (let i = 0; i < 14; i++) {
        const rz = -14 - i * 31.0;
        const pt = this.getPathPoint(rz);
        const side = i % 2 === 0 ? 1 : -1;
        const wall = this.propBuilder.createBabylonFortressWallSegment(pal, true);
        const wx = pt.x + (side > 0 ? 13.5 : -17.5);
        wall.position.set(wx, pt.y + 0.8, rz);
        wall.lookAt(pt.x, pt.y + 0.8, rz);
        streetGroup.add(wall);
      }

      // Iconic Event 1 at the Street Entrance Vista & Part One/Two: Daniel's Fiery Furnace (Daniel 3:19–27)
      for (const fCfg of [
        { z: -5.5, offset: 5.4, scale: 0.92 },
        { z: -136, offset: 6.4, scale: 1.15 }
      ]) {
        const pt = this.getPathPoint(fCfg.z);
        const furnace = this.propBuilder.createBabylonFieryFurnaceLandmark(pal);
        furnace.scale.setScalar(fCfg.scale);
        furnace.position.set(pt.x + fCfg.offset, pt.y + 0.12, fCfg.z);
        furnace.lookAt(pt.x, pt.y + 0.5, fCfg.z + 9.0);
        streetGroup.add(furnace);
      }

      // Iconic Event 2 at the Street Entrance Vista & Part Three: Daniel in the Lions' Den (Daniel 6:16–23)
      for (const lCfg of [
        { z: -14.5, offset: -5.4, scale: 0.92 },
        { z: -250, offset: 6.4, scale: 1.15 }
      ]) {
        const pt = this.getPathPoint(lCfg.z);
        const lionsDen = this.propBuilder.createDanielLionsDenLandmark(pal);
        lionsDen.scale.setScalar(lCfg.scale);
        lionsDen.position.set(pt.x + lCfg.offset, pt.y + 0.08, lCfg.z);
        lionsDen.lookAt(pt.x, pt.y + 0.4, lCfg.z + 9.0);
        streetGroup.add(lionsDen);
      }
      return;
    }

    if (biomeCfg.biome === 'babylon_fortress' || biomeCfg.biome === 'walled_citadel') {
      const isLapis = slug === 'for-such-a-time-as-this';
      for (let i = 0; i < 14; i++) {
        const rz = -16 - i * 30.5;
        const pt = this.getPathPoint(rz);
        const side = i % 2 === 0 ? 1 : -1;
        const wall = this.propBuilder.createBabylonFortressWallSegment(pal, isLapis);
        const wx = pt.x + (side > 0 ? 12.8 : -17.2);
        wall.position.set(wx, pt.y + 0.7, rz);
        wall.lookAt(pt.x, pt.y + 0.7, rz);
        streetGroup.add(wall);
      }
      return;
    }

    if (biomeCfg.biome === 'wilderness') {
      for (let i = 0; i < 18; i++) {
        const rz = -12 - i * 24.5;
        const pt = this.getPathPoint(rz);
        const side = i % 2 === 0 ? 1 : -1;
        const crag = this.propBuilder.createWildernessCampAndCrag(pal, i);
        const wx = pt.x + (side > 0 ? 10.5 + (i % 3) * 2.2 : -16.8 - (i % 2) * 2.0);
        crag.position.set(wx, pt.y + 0.3, rz);
        crag.lookAt(pt.x, pt.y + 0.3, rz);
        streetGroup.add(crag);
      }
      return;
    }

    if (biomeCfg.biome === 'maritime_sea') {
      const isJonah = slug === 'out-of-the-deep';
      for (let i = 0; i < 14; i++) {
        const rz = -15 - i * 29.0;
        const pt = this.getPathPoint(rz);
        const monument = this.propBuilder.createMaritimeCoastalMonument(pal, i, isJonah && i % 2 === 0);
        const wx = i % 2 === 0 ? pt.x - 10.8 : pt.x + 11.2;
        monument.position.set(wx, pt.y - 0.05, rz);
        monument.lookAt(pt.x, pt.y + 0.4, rz + 3.0);
        streetGroup.add(monument);
      }
      return;
    }

    if (biomeCfg.biome === 'prophetic_sanctuary') {
      if (slug === 'all-things-new') {
        // District XLIV (Revelation — "All Things New"):
        // Part 1–2: Seven Golden Lampstands & Throne Sanctuary
        // Part 3: Golden Censer Altar ("half an hour", Rev 8:1–4)
        // Part 5: New Jerusalem Twelve Gates of Pearl along the River of Water of Life
        for (let i = 0; i < 12; i++) {
          const rz = -18 - i * 34.0;
          const pt = this.getPathPoint(rz);
          const side = i % 2 === 0 ? 1 : -1;
          if (rz < -290) {
            const pearlGate = this.propBuilder.createGatesOfPearlArchway(pal);
            pearlGate.scale.setScalar(0.82);
            pearlGate.position.set(pt.x + (side > 0 ? 9.8 : -16.2), pt.y + 0.15, rz);
            pearlGate.lookAt(pt.x, pt.y + 0.5, rz);
            streetGroup.add(pearlGate);
          } else if (i === 5 || i === 6) {
            const censer = this.propBuilder.createRevelation8GoldenCenserAltarEnsemble(null, pal, false);
            if (censer.censerLight) censer.group.remove(censer.censerLight);
            censer.group.scale.setScalar(0.84);
            censer.group.position.set(pt.x + (side > 0 ? 9.6 : -15.8), pt.y + 0.15, rz);
            censer.group.lookAt(pt.x, pt.y + 0.5, rz);
            streetGroup.add(censer.group);
          } else {
            const menorah = this.propBuilder.createGoldenMenorah(null, pal);
            menorah.scale.setScalar(0.85);
            menorah.position.set(pt.x + (side > 0 ? 9.5 : -16.2), pt.y + 0.3, rz);
            streetGroup.add(menorah);
          }
        }
        return;
      }
      if (slug === 'arise-shine') {
        // District XX (Isaiah — "Arise, Shine"):
        // Temple seraph altar braziers, peaceable kingdom olive groves, eagle crags, and radiant Zion gates
        for (let i = 0; i < 12; i++) {
          const rz = -18 - i * 34.0;
          const pt = this.getPathPoint(rz);
          const side = i % 2 === 0 ? 1 : -1;
          if (i === 1) {
            const altar = this.propBuilder.createIsaiah6LiveCoalAltarEnsemble(null, pal, false);
            if (altar.coalLight) altar.group.remove(altar.coalLight);
            altar.group.scale.setScalar(0.82);
            altar.group.position.set(pt.x + (side > 0 ? 9.6 : -10.2), pt.y + 0.15, rz);
            altar.group.lookAt(pt.x, pt.y + 0.4, rz);
            streetGroup.add(altar.group);
          } else if (i === 5 || i === 7) {
            const crag = this.propBuilder.createIsaiah40EagleWingsCragEnsemble(null, pal, false);
            if (crag.cragLight) crag.group.remove(crag.cragLight);
            crag.group.scale.setScalar(0.82);
            crag.group.position.set(pt.x + (side > 0 ? 10.4 : -10.8), pt.y + 0.1, rz);
            crag.group.lookAt(pt.x, pt.y + 0.4, rz);
            streetGroup.add(crag.group);
          } else if (i >= 9) {
            const gate = this.propBuilder.createIsaiah60AriseShineGateEnsemble(null, pal, false);
            if (gate.dawnLight) gate.group.remove(gate.dawnLight);
            gate.group.scale.setScalar(0.76);
            gate.group.position.set(pt.x + (side > 0 ? 10.2 : -10.8), pt.y + 0.1, rz);
            gate.group.lookAt(pt.x, pt.y + 0.5, rz);
            streetGroup.add(gate.group);
          } else {
            const menorah = this.propBuilder.createGoldenMenorah(null, pal);
            menorah.scale.setScalar(0.85);
            menorah.position.set(pt.x + (side > 0 ? 9.5 : -10.2), pt.y + 0.3, rz);
            streetGroup.add(menorah);
          }
        }
        return;
      }
      for (let i = 0; i < 12; i++) {
        const rz = -18 - i * 34.0;
        const pt = this.getPathPoint(rz);
        const side = i % 2 === 0 ? 1 : -1;
        const menorah = this.propBuilder.createGoldenMenorah(null, pal);
        menorah.scale.setScalar(0.85);
        menorah.position.set(pt.x + (side > 0 ? 9.5 : -16.2), pt.y + 0.3, rz);
        streetGroup.add(menorah);
      }
      return;
    }

    if (biomeCfg.biome === 'planted_by_water') {
      // District XIII: Planted by the Water (Psalms 1–41)
      // Riverbank fig & olive trees with roots reaching into the stream, stone watchtowers of refuge (Psalm 9),
      // and shepherd hills along the 5 parts
      for (let i = 0; i < 12; i++) {
        const rz = -16 - i * 35.0;
        const pt = this.getPathPoint(rz);
        if (i === 2 || i === 7) {
          const tower = this.propBuilder.createPsalm9HighTower(pal);
          tower.scale.setScalar(0.95);
          tower.position.set(pt.x + 11.5, pt.y + 0.4, rz);
          tower.lookAt(pt.x, pt.y + 0.5, rz + 4.0);
          streetGroup.add(tower);
        } else {
          const riversideTree = this.propBuilder.createPlantedByWaterTreeEnsemble(null, pal, false);
          if (riversideTree.streamLight) riversideTree.group.remove(riversideTree.streamLight);
          riversideTree.group.scale.setScalar(0.82);
          riversideTree.group.position.set(pt.x - 7.8, pt.y - 0.05, rz);
          riversideTree.group.lookAt(pt.x, pt.y, rz);
          streetGroup.add(riversideTree.group);
        }
      }
    }

    if (biomeCfg.biome === 'deer_and_forest') {
      // District XIV: As the Deer (Psalms 42–72)
      // Forest olive & cedar groves, deer drinking along the water brook (Psalm 42:1),
      // and high rock mesas ("the rock that is higher than I", Psalm 61:2)
      for (let i = 0; i < 11; i++) {
        const rz = -14 - i * 30.0;
        const pt = this.getPathPoint(rz);
        if (i === 0 || i === 4 || i === 8) {
          const deer = this.propBuilder.createPsalm42DeerBrookEnsemble(null, pal, false);
          if (deer.brookLight) deer.group.remove(deer.brookLight);
          if (deer.rightBank) deer.group.remove(deer.rightBank);
          deer.group.scale.setScalar(0.90);
          deer.group.position.set(pt.x - 7.4, pt.y + 0.04, rz);
          deer.group.lookAt(pt.x - 10.5, pt.y, rz - 2.0);
          streetGroup.add(deer.group);
        } else if (i === 6) {
          const highRock = this.propBuilder.createPsalm61RockHigherEnsemble(null, pal);
          if (highRock.rockLight) highRock.group.remove(highRock.rockLight);
          highRock.group.scale.setScalar(0.88);
          highRock.group.position.set(pt.x + 12.2, pt.y + 0.2, rz);
          highRock.group.lookAt(pt.x, pt.y + 0.4, rz + 4.0);
          streetGroup.add(highRock.group);
        } else {
          const forestTree = this.propBuilder.createGreatPainterlyTree(null, pal, 0.95 + (i % 3) * 0.18);
          forestTree.position.set(pt.x + (i % 2 === 0 ? -8.6 : 10.2), pt.y, rz);
          forestTree.rotation.y = i * 1.1;
          streetGroup.add(forestTree);
        }
      }
    }

    if (biomeCfg.biome === 'temple_courts') {
      // District XV: A Day in Your Courts (Psalms 73–106)
      // Limestone temple colonnades & sanctuary portals (Psalm 73:17), sparrow nests by the altar (Psalm 84:3),
      // and flourishing courtyard palms & cedars ("still green in old age", Psalm 92:12–14)
      for (let i = 0; i < 12; i++) {
        const rz = -16 - i * 30.0;
        const pt = this.getPathPoint(rz);
        if (i === 0 || i === 5 || i === 9) {
          const portal = this.propBuilder.createPsalm73SanctuaryPortalEnsemble(null, pal, false);
          if (portal.sanctuaryLight) portal.group.remove(portal.sanctuaryLight);
          portal.group.scale.setScalar(0.86);
          portal.group.position.set(pt.x + 11.4, pt.y + 0.1, rz);
          portal.group.lookAt(pt.x, pt.y + 0.4, rz + 3.0);
          streetGroup.add(portal.group);
        } else if (i === 3 || i === 7) {
          const sparrowAltar = this.propBuilder.createPsalm84SparrowNestAltarEnsemble(null, pal);
          if (sparrowAltar.altarLight) sparrowAltar.group.remove(sparrowAltar.altarLight);
          sparrowAltar.group.scale.setScalar(0.88);
          sparrowAltar.group.position.set(pt.x - 8.4, pt.y + 0.08, rz);
          sparrowAltar.group.lookAt(pt.x, pt.y + 0.3, rz + 2.0);
          streetGroup.add(sparrowAltar.group);
        } else {
          const courtTree = this.propBuilder.createGreatPainterlyTree(null, pal, 0.92 + (i % 3) * 0.16);
          courtTree.position.set(pt.x + (i % 2 === 0 ? -8.8 : 10.6), pt.y, rz);
          courtTree.rotation.y = i * 0.9;
          streetGroup.add(courtTree);
        }
      }
    }

    if (biomeCfg.biome === 'breath_and_praise') {
      // District XVI: Everything That Has Breath (Psalms 107–150)
      // Desired Haven ships (Psalm 107:30), golden harvest sheaves (Psalm 126:6),
      // and open-air praise terraces with harp, timbrel, trumpet & cymbals (Psalm 150:1–6)
      for (let i = 0; i < 14; i++) {
        const rz = -16 - i * 32.0;
        const pt = this.getPathPoint(rz);
        if (i === 0) {
          const haven = this.propBuilder.createPsalm107HavenShipTerraceEnsemble(null, pal, true);
          haven.scale.setScalar(0.86);
          haven.position.set(pt.x - 8.6, pt.y + 0.06, rz);
          haven.lookAt(pt.x, pt.y + 0.3, rz + 3.0);
          streetGroup.add(haven);
        } else if (i === 5 || i === 8) {
          const sheaves = this.propBuilder.createPsalm126SowInTearsSheavesEnsemble(null, pal);
          sheaves.scale.setScalar(0.88);
          sheaves.position.set(pt.x + 10.4, pt.y + 0.06, rz);
          sheaves.lookAt(pt.x, pt.y + 0.2, rz + 2.0);
          streetGroup.add(sheaves);
        } else if (i === 11 || i === 13) {
          const praise = this.propBuilder.createPsalm150EverythingThatHasBreathEnsemble(null, pal, false);
          if (praise.praiseLight) praise.group.remove(praise.praiseLight);
          praise.group.scale.setScalar(0.85);
          praise.group.position.set(pt.x + (i % 2 === 0 ? -8.6 : 10.4), pt.y + 0.06, rz);
          praise.group.lookAt(pt.x, pt.y + 0.3, rz + 2.5);
          streetGroup.add(praise.group);
        } else {
          const praiseTree = this.propBuilder.createGreatPainterlyTree(null, pal, 0.94 + (i % 3) * 0.16);
          praiseTree.position.set(pt.x + (i % 2 === 0 ? -8.8 : 10.6), pt.y, rz);
          praiseTree.rotation.y = i * 1.05;
          streetGroup.add(praiseTree);
        }
      }
    }
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

  createPalettePlaceholderTexture(palette = {}) {
    const THREE = this.THREE;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    if (ctx && typeof ctx.createLinearGradient === 'function') {
      const grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0.0, palette.top || '#4f6278');
      grad.addColorStop(0.45, palette.horizon || '#c7a474');
      grad.addColorStop(0.75, palette.accent || '#dbb87b');
      grad.addColorStop(1.0, palette.ground || '#5e5242');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData = { isPlaceholder: true };
    return tex;
  }

  async ensureNodeTextureLoaded(node) {
    if (!node || !node.data) return null;
    if (node.textureLoaded && node.texture && !node.texture.userData?.isPlaceholder) {
      return node.texture;
    }
    if (node._loadPromise) {
      return node._loadPromise;
    }
    const url = node.data.isScene ? node.data.heroSrc : node.data.webSrc;
    node._loadPromise = this.loadTextureAsync(url).then((tex) => {
      tex.colorSpace = this.THREE.SRGBColorSpace;
      node.texture = tex;
      node.textureLoaded = true;
      const artMat = node.meshGroup?.userData?.artMat;
      if (artMat) {
        artMat.map = tex;
        artMat.needsUpdate = true;
      }
      if (typeof this.onTextureStreamed === 'function') {
        this.onTextureStreamed(node);
      }
      return tex;
    });
    return node._loadPromise;
  }

  async streamFarPaintingTextures(paintingNodes) {
    for (let i = 0; i < paintingNodes.length; i++) {
      const node = paintingNodes[i];
      if (!node || node.textureLoaded) continue;
      // Load in small concurrent pairs of 2 from near to far so the main thread & network stay silky smooth
      const pair = [this.ensureNodeTextureLoaded(node)];
      const nextNode = paintingNodes[i + 1];
      if (nextNode && !nextNode.textureLoaded) {
        pair.push(this.ensureNodeTextureLoaded(nextNode));
        i++;
      }
      await Promise.all(pair);
    }
  }

  dressPaintingSurroundings(streetGroup, wx, wy, wz, side, pData, slug = 'genesis', biomeCfg = null) {
    const THREE = this.THREE;
    const pal = pData.palette || {};
    const bCfg = biomeCfg || this.getDistrictBiomeConfig(slug);
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || bCfg.groundColor || '#686050',
      accentColor: pal.accent || bCfg.groundAccent || '#dbb87b',
      roughness: 0.92
    });

    for (let r = 0; r < 2; r++) {
      const rockGeo = this.propBuilder.displaceGeometry(new THREE.DodecahedronGeometry(0.45 + r * 0.25, 1), 0.08, 3.0);
      const rock = new THREE.Mesh(rockGeo, stoneMat);
      rock.position.set(wx + side * (1.8 + r * 0.9), wy + 0.2, wz - 0.8 + r * 1.4);
      rock.scale.set(1.4, 0.7, 1.2);
      streetGroup.add(rock);
    }

    // 1. For EVERY step-through scene painting across all 44 books, mount its 3D .glb sculpture
    //    and its 3D event focal prop right beside the painting on the street!
    const isDanielSpecialMonument =
      slug === 'greatly-beloved' && (pData.n === 11 || pData.n === 14 || pData.n === 25 || pData.n === 26);

    if (pData.isScene && this.propBuilder.tripo && !isDanielSpecialMonument) {
      const plinthGroup = new THREE.Group();
      const plinth = new THREE.Mesh(
        this.propBuilder.displaceGeometry(new THREE.CylinderGeometry(1.15, 1.35, 0.24, 18), 0.02, 3.0),
        stoneMat
      );
      plinth.position.y = 0.12;
      plinthGroup.add(plinth);

      this.propBuilder.tripo.mountSceneGlbIfAvailable(plinthGroup, slug, pData.n, {
        targetHeight: 2.35,
        yOffset: 0.22
      });
      plinthGroup.position.set(wx + side * 0.4, wy, wz - 3.4);
      plinthGroup.lookAt(wx - side * 3.0, wy, wz + 3.0);
      streetGroup.add(plinthGroup);

      if (
        pData.sceneType &&
        slug !== 'greatly-beloved' &&
        slug !== 'all-things-new' &&
        slug !== 'psalms-1' &&
        slug !== 'psalms-2' &&
        slug !== 'psalms-3' &&
        slug !== 'psalms-4' &&
        slug !== 'arise-shine' &&
        slug !== 'good-news-of-great-joy' &&
        slug !== 'i-am-with-you-always' &&
        slug !== 'peace-be-still' &&
        slug !== 'come-and-see' &&
        slug !== 'out-of-the-whirlwind' &&
        slug !== 'a-future-and-a-hope' &&
        slug !== 'can-these-bones-live' &&
        slug !== 'out-of-the-deep' &&
        slug !== 'to-the-ends-of-the-earth' &&
        slug !== 'anchor-of-the-soul' &&
        slug !== 'our-eyes-are-on-you' &&
        slug !== 'rise-up-and-build' &&
        slug !== 'for-such-a-time-as-this' &&
        slug !== 'the-beginning-of-wisdom' &&
        slug !== 'eternity-in-their-hearts' &&
        slug !== 'many-waters' &&
        slug !== 'new-every-morning'
      ) {
        const focal = this.propBuilder.createFocalPropForScene(pData.sceneType, null, pal);
        if (focal && focal.group) {
          if (focal.focalLight) focal.group.remove(focal.focalLight);
          focal.group.scale.setScalar(0.78);
          focal.group.position.set(wx + side * 2.2, wy, wz - 4.6);
          focal.group.lookAt(wx - side * 3.0, wy, wz + 2.5);
          streetGroup.add(focal.group);
        }
      }
    }

    // 1b. If this painting is the named Source Painting for the District's Hero Relic (Districts IX–XLIV),
    //     mount the Hero Relic on its sculpted Sanctuary Pedestal right beside this painting!
    const heroRelicCfg = this.propBuilder.tripo?.districtHeroRelicPlacement?.[slug];
    if (heroRelicCfg && heroRelicCfg.paintingNum === pData.n) {
      const heroPedestal = this.createHeroRelicSanctuaryPedestal(heroRelicCfg, pal);
      const offsetZ = pData.isScene ? wz - 5.2 : wz - 2.4;
      const rx = wx + side * 2.8;
      heroPedestal.position.set(rx, wy, offsetZ);
      heroPedestal.lookAt(wx - side * 2.5, wy + 0.5, wz + 2.5);
      streetGroup.add(heroPedestal);

      if (!streetGroup.userData.heroRelicNodes) {
        streetGroup.userData.heroRelicNodes = [];
      }
      const roadPt = this.getPathPoint(offsetZ);
      streetGroup.userData.heroRelicNodes.push({
        id: heroRelicCfg.id,
        paintingNum: pData.n,
        paintingData: pData,
        position: new THREE.Vector3(rx, wy, offsetZ),
        roadPosition: new THREE.Vector3(rx - side * 2.3, roadPt.y, offsetZ + 1.6),
        pedestalGroup: heroPedestal,
        isFinale: false
      });
      return;
    }

    // 2. Book-Specific Iconic Event Models along the Street
    if (slug === 'greatly-beloved') {
      // Daniel 3: Fiery Furnace paintings (#10–#15)
      if (pData.n === 11 || pData.n === 14) {
        const furnace = this.propBuilder.createBabylonFieryFurnaceLandmark(pal);
        furnace.scale.setScalar(pData.n === 14 ? 0.92 : 0.78);
        furnace.position.set(wx + side * 0.5, wy, wz - 4.2);
        furnace.lookAt(wx - side * 3.5, wy, wz + 1.2);
        streetGroup.add(furnace);
        return;
      }
      // Daniel 6: Lions' Den paintings (#25–#27)
      if (pData.n === 25 || pData.n === 26) {
        const den = this.propBuilder.createDanielLionsDenLandmark(pal);
        den.scale.setScalar(pData.n === 26 ? 0.92 : 0.78);
        den.position.set(wx + side * 0.5, wy, wz - 4.2);
        den.lookAt(wx - side * 3.5, wy, wz + 1.2);
        streetGroup.add(den);
        return;
      }
      if (pData.sceneType) {
        const focal = this.propBuilder.createFocalPropForScene(pData.sceneType, null, pal);
        if (focal && focal.group) {
          if (focal.focalLight) focal.group.remove(focal.focalLight);
          focal.group.scale.setScalar(0.88);
          focal.group.position.set(wx + side * 4.4, wy, wz - 1.0);
          focal.group.lookAt(wx - side * 2.0, wy, wz + 2.0);
          streetGroup.add(focal.group);
          return;
        }
      }
      const wall = this.propBuilder.createBabylonFortressWallSegment(pal, true);
      wall.scale.setScalar(0.65);
      wall.position.set(wx + side * 4.6, wy, wz - 1.6);
      wall.lookAt(wx, wy, wz);
      streetGroup.add(wall);
      return;
    }

    if (slug === 'exodus') {
      if (pData.n === 5 || pData.n === 6 || pData.n === 8) {
        const bush = this.propBuilder.createBurningBush(null, pal, 0.78);
        bush.position.set(wx + side * 3.2, wy, wz - 1.2);
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
      if (pData.n === 2 || pData.n === 5) {
        const altar = this.propBuilder.createPerpetualFireAltar(null, pal);
        altar.scale.setScalar(0.68);
        altar.position.set(wx + side * 3.0, wy, wz - 1.0);
        streetGroup.add(altar);
        return;
      }
      if (pData.n === 33) {
        const serpent = this.propBuilder.createBronzeSerpentPole(null, pal);
        serpent.scale.setScalar(0.75);
        serpent.position.set(wx + side * 3.2, wy, wz - 1.0);
        streetGroup.add(serpent);
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
      if (pData.n === 6 || pData.n === 8 || pData.n === 12) {
        const sheaf = this.propBuilder.createForgottenSheafField(null, pal);
        sheaf.position.set(wx + side * 2.6, wy, wz - 0.8);
        streetGroup.add(sheaf);
        return;
      }
    } else if (slug === 'samuel') {
      if (pData.n === 5) {
        const robeTable = this.propBuilder.createLinenRobeTable();
        robeTable.position.set(wx + side * 2.4, wy, wz - 0.6);
        streetGroup.add(robeTable);
        return;
      }
      if (pData.n === 8) {
        const ebenezer = this.propBuilder.createEbenezerStone(1.0);
        ebenezer.position.set(wx + side * 2.5, wy, wz - 0.6);
        streetGroup.add(ebenezer);
        return;
      }
      if (pData.n === 16) {
        const harp = this.propBuilder.createDavidHarp(1.1);
        harp.position.set(wx + side * 2.3, wy, wz - 0.5);
        streetGroup.add(harp);
        return;
      }
    } else if (slug === 'kings') {
      if (pData.n === 36) {
        const steps = this.propBuilder.createSundialSteps(0.95);
        steps.position.set(wx + side * 2.6, wy, wz - 0.5);
        streetGroup.add(steps);
        return;
      }
    } else if (slug === 'all-things-new') {
      if (pData.n === 4) {
        const lamps = this.propBuilder.createSevenGoldenLampstandsCircle(null, pal);
        if (lamps.lampLight) lamps.group.remove(lamps.lampLight);
        lamps.group.scale.setScalar(0.68);
        lamps.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        lamps.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(lamps.group);
        return;
      }
      if (pData.n === 8) {
        const door = this.propBuilder.createLaodiceaDoorAndSupperTable(null, pal);
        if (door.doorLight) door.group.remove(door.doorLight);
        door.group.scale.setScalar(0.68);
        door.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        door.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(door.group);
        return;
      }
      if (pData.n === 12 || pData.n === 13 || pData.n === 14) {
        const lambRings = this.propBuilder.createLambOnThroneRings(null, pal);
        if (lambRings.throneLight) lambRings.group.remove(lambRings.throneLight);
        lambRings.group.scale.setScalar(0.72);
        lambRings.group.position.set(wx + side * 3.0, wy, wz - 2.2);
        lambRings.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(lambRings.group);
        return;
      }
      if (pData.n === 17 || pData.n === 18) {
        const censer = this.propBuilder.createRevelation8GoldenCenserAltarEnsemble(null, pal, false);
        if (censer.censerLight) censer.group.remove(censer.censerLight);
        censer.group.scale.setScalar(0.74);
        censer.group.position.set(wx + side * 3.0, wy, wz - 2.2);
        censer.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(censer.group);
        return;
      }
      if (pData.n === 36) {
        const pearlGate = this.propBuilder.createGatesOfPearlArchway(pal);
        pearlGate.scale.setScalar(0.76);
        pearlGate.position.set(wx + side * 3.2, wy, wz - 1.2);
        pearlGate.lookAt(wx - side * 2.0, wy, wz + 2.0);
        streetGroup.add(pearlGate);
        return;
      }
      if (pData.n === 38) {
        const treeBench = this.propBuilder.createTreeOfLifeAndBenchSanctuary(null, pal, false);
        if (treeBench.sanctuaryLight) treeBench.group.remove(treeBench.sanctuaryLight);
        treeBench.group.scale.setScalar(0.72);
        treeBench.group.position.set(wx + side * 3.0, wy, wz - 2.6);
        treeBench.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(treeBench.group);
        return;
      }
    } else if (slug === 'psalms-1') {
      if (pData.n === 1) {
        const planted = this.propBuilder.createPlantedByWaterTreeEnsemble(null, pal, false);
        if (planted.streamLight) planted.group.remove(planted.streamLight);
        planted.group.scale.setScalar(0.72);
        planted.group.position.set(wx + side * 2.8, wy, wz - 2.4);
        planted.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(planted.group);
        return;
      }
      if (pData.n === 8) {
        const shepherd = this.propBuilder.createPsalm8ShepherdHillsideEnsemble(null, pal, false);
        if (shepherd.moonLight) shepherd.group.remove(shepherd.moonLight);
        shepherd.group.scale.setScalar(0.74);
        shepherd.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        shepherd.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(shepherd.group);
        return;
      }
      if (pData.n === 9) {
        const tower = this.propBuilder.createPsalm9HighTower(pal);
        tower.scale.setScalar(0.78);
        tower.position.set(wx + side * 3.2, wy, wz - 1.4);
        tower.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(tower);
        return;
      }
      if (pData.n === 12) {
        const furnace = this.propBuilder.createPsalm12RefiningFurnace(pal);
        furnace.scale.setScalar(0.84);
        furnace.position.set(wx + side * 2.6, wy, wz - 1.0);
        furnace.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(furnace);
        return;
      }
      if (pData.n === 22) {
        const valley = this.propBuilder.createPsalm23ValleyRodAndTable(null, pal);
        if (valley.valleyLight) valley.group.remove(valley.valleyLight);
        valley.group.scale.setScalar(0.72);
        valley.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        valley.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(valley.group);
        return;
      }
      if (pData.n === 26) {
        const house = this.propBuilder.createPsalm27OpenHouseThreshold(null, pal);
        if (house.sanctuaryLight) house.group.remove(house.sanctuaryLight);
        house.group.scale.setScalar(0.68);
        house.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        house.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(house.group);
        return;
      }
      if (pData.n === 32) {
        const harp = this.propBuilder.createDavidHarp(1.1);
        harp.position.set(wx + side * 2.4, wy, wz - 0.6);
        streetGroup.add(harp);
        return;
      }
      if (pData.n === 40) {
        const amenTable = this.propBuilder.createPsalm41AmenTableEnsemble(null, pal, false);
        amenTable.scale.setScalar(0.82);
        amenTable.position.set(wx + side * 2.6, wy, wz - 1.0);
        amenTable.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(amenTable);
        return;
      }
    } else if (slug === 'psalms-2') {
      if (pData.n === 1) {
        const deerBrook = this.propBuilder.createPsalm42DeerBrookEnsemble(null, pal, false);
        if (deerBrook.brookLight) deerBrook.group.remove(deerBrook.brookLight);
        deerBrook.group.scale.setScalar(0.74);
        deerBrook.group.position.set(wx + side * 2.8, wy, wz - 2.4);
        deerBrook.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(deerBrook.group);
        return;
      }
      if (pData.n === 5) {
        const beStill = this.propBuilder.createPsalm46BeStillShorelineEnsemble(null, pal);
        if (beStill.stillLight) beStill.group.remove(beStill.stillLight);
        beStill.group.scale.setScalar(0.78);
        beStill.group.position.set(wx + side * 2.6, wy, wz - 2.2);
        beStill.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(beStill.group);
        return;
      }
      if (pData.n === 15) {
        const bottle = this.propBuilder.createPsalm56TearBottleWindowEnsemble(null, pal);
        if (bottle.windowLight) bottle.group.remove(bottle.windowLight);
        bottle.group.scale.setScalar(0.70);
        bottle.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        bottle.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(bottle.group);
        return;
      }
      if (pData.n === 16) {
        const harp = this.propBuilder.createDavidHarp(1.1);
        harp.position.set(wx + side * 2.4, wy, wz - 0.6);
        streetGroup.add(harp);
        return;
      }
      if (pData.n === 20) {
        const highRock = this.propBuilder.createPsalm61RockHigherEnsemble(null, pal);
        if (highRock.rockLight) highRock.group.remove(highRock.rockLight);
        highRock.group.scale.setScalar(0.68);
        highRock.group.position.set(wx + side * 3.2, wy, wz - 2.6);
        highRock.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(highRock.group);
        return;
      }
      if (pData.n === 31) {
        const likeRain = this.propBuilder.createPsalm72LikeRainFinaleEnsemble(null, pal, false);
        likeRain.scale.setScalar(0.78);
        likeRain.position.set(wx + side * 2.8, wy, wz - 1.2);
        likeRain.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(likeRain);
        return;
      }
    } else if (slug === 'psalms-3') {
      if (pData.n === 1) {
        const portal = this.propBuilder.createPsalm73SanctuaryPortalEnsemble(null, pal, false);
        if (portal.sanctuaryLight) portal.group.remove(portal.sanctuaryLight);
        portal.group.scale.setScalar(0.68);
        portal.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        portal.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(portal.group);
        return;
      }
      if (pData.n === 12) {
        const sparrowAltar = this.propBuilder.createPsalm84SparrowNestAltarEnsemble(null, pal);
        if (sparrowAltar.altarLight) sparrowAltar.group.remove(sparrowAltar.altarLight);
        sparrowAltar.group.scale.setScalar(0.74);
        sparrowAltar.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        sparrowAltar.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(sparrowAltar.group);
        return;
      }
      if (pData.n === 19) {
        const wing = this.propBuilder.createPsalm91ShadowOfWingsEnsemble(null, pal);
        if (wing.wingLight) wing.group.remove(wing.wingLight);
        wing.group.scale.setScalar(0.74);
        wing.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        wing.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(wing.group);
        return;
      }
      if (pData.n === 28) {
        const portal = this.propBuilder.createPsalm73SanctuaryPortalEnsemble(null, pal, false);
        if (portal.sanctuaryLight) portal.group.remove(portal.sanctuaryLight);
        portal.group.scale.setScalar(0.65);
        portal.group.position.set(wx + side * 3.0, wy, wz - 1.6);
        portal.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(portal.group);
        return;
      }
      if (pData.n === 31) {
        const terrace = this.propBuilder.createPsalm103EastFromWestTerraceEnsemble(null, pal);
        if (terrace.horizonLight) terrace.group.remove(terrace.horizonLight);
        terrace.group.scale.setScalar(0.68);
        terrace.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        terrace.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(terrace.group);
        return;
      }
      if (pData.n === 34) {
        const amenShofar = this.propBuilder.createPsalm106AmenShofarAltarEnsemble(null, pal, false);
        amenShofar.scale.setScalar(0.78);
        amenShofar.position.set(wx + side * 2.8, wy, wz - 1.2);
        amenShofar.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(amenShofar);
        return;
      }
    } else if (slug === 'psalms-4') {
      if (pData.n === 1) {
        const haven = this.propBuilder.createPsalm107HavenShipTerraceEnsemble(null, pal, true);
        haven.scale.setScalar(0.72);
        haven.position.set(wx + side * 2.8, wy, wz - 2.2);
        haven.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(haven);
        return;
      }
      if (pData.n === 13) {
        const lampSheep = this.propBuilder.createPsalm119LampAndLostSheepEnsemble(null, pal);
        if (lampSheep.lampLight) lampSheep.group.remove(lampSheep.lampLight);
        lampSheep.group.scale.setScalar(0.76);
        lampSheep.group.position.set(wx + side * 2.8, wy, wz - 2.0);
        lampSheep.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(lampSheep.group);
        return;
      }
      if (pData.n === 20) {
        const sheaves = this.propBuilder.createPsalm126SowInTearsSheavesEnsemble(null, pal);
        sheaves.scale.setScalar(0.76);
        sheaves.position.set(wx + side * 2.8, wy, wz - 2.0);
        sheaves.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(sheaves);
        return;
      }
      if (pData.n === 43 || pData.n === 44) {
        const praise = this.propBuilder.createPsalm150EverythingThatHasBreathEnsemble(null, pal, false);
        if (praise.praiseLight) praise.group.remove(praise.praiseLight);
        praise.group.scale.setScalar(0.74);
        praise.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        praise.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(praise.group);
        return;
      }
    } else if (slug === 'greatly-beloved') {
      if (pData.n === 4) {
        const pulse = this.propBuilder.createDaniel1PulseTableEnsemble(null, pal);
        if (pulse.pulseLight) pulse.group.remove(pulse.pulseLight);
        pulse.group.scale.setScalar(0.74);
        pulse.group.position.set(wx + side * 2.8, wy, wz - 2.0);
        pulse.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(pulse.group);
        return;
      }
      if (pData.n === 14) {
        const furnace = this.propBuilder.createBabylonFieryFurnaceLandmark(pal);
        furnace.scale.setScalar(0.68);
        furnace.position.set(wx + side * 3.2, wy, wz - 2.2);
        furnace.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(furnace);
        return;
      }
      if (pData.n === 24) {
        const openWin = this.propBuilder.createDaniel6OpenWindowJerusalemEnsemble(null, pal, false);
        if (openWin.windowLight) openWin.group.remove(openWin.windowLight);
        openWin.group.scale.setScalar(0.72);
        openWin.group.position.set(wx + side * 2.8, wy, wz - 2.0);
        openWin.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(openWin.group);
        return;
      }
      if (pData.n === 26) {
        const den = this.propBuilder.createDanielLionsDenLandmark(pal);
        den.scale.setScalar(0.68);
        den.position.set(wx + side * 3.2, wy, wz - 2.2);
        den.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(den);
        return;
      }
      if (pData.n === 40) {
        const goYourWay = this.propBuilder.createDaniel12GoYourWayFinaleEnsemble(null, pal, false);
        goYourWay.scale.setScalar(0.78);
        goYourWay.position.set(wx + side * 2.8, wy, wz - 1.4);
        goYourWay.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(goYourWay);
        return;
      }
    } else if (slug === 'arise-shine') {
      if (pData.n === 3 || pData.n === 4) {
        const altar = this.propBuilder.createIsaiah6LiveCoalAltarEnsemble(null, pal, false);
        if (altar.coalLight) altar.group.remove(altar.coalLight);
        altar.group.scale.setScalar(0.74);
        altar.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        altar.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(altar.group);
        return;
      }
      if (pData.n === 9) {
        const meadow = this.propBuilder.createIsaiah11WolfAndLambMeadowEnsemble(null, pal, false);
        if (meadow.meadowLight) meadow.group.remove(meadow.meadowLight);
        meadow.group.scale.setScalar(0.74);
        meadow.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        meadow.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(meadow.group);
        return;
      }
      if (pData.n === 19) {
        const crag = this.propBuilder.createIsaiah40EagleWingsCragEnsemble(null, pal, false);
        if (crag.cragLight) crag.group.remove(crag.cragLight);
        crag.group.scale.setScalar(0.72);
        crag.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        crag.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(crag.group);
        return;
      }
      if (pData.n === 35 || pData.n === 40) {
        const gate = this.propBuilder.createIsaiah60AriseShineGateEnsemble(null, pal, false);
        if (gate.dawnLight) gate.group.remove(gate.dawnLight);
        gate.group.scale.setScalar(0.72);
        gate.group.position.set(wx + side * 3.0, wy, wz - 2.2);
        gate.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(gate.group);
        return;
      }
    } else if (slug === 'good-news-of-great-joy') {
      if (pData.n === 5 || pData.n === 7) {
        const manger = this.propBuilder.createLuke2BethlehemMangerEnsemble(null, pal, false);
        if (manger.mangerLight) manger.group.remove(manger.mangerLight);
        manger.group.scale.setScalar(0.74);
        manger.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        manger.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(manger.group);
        return;
      }
      if (pData.n === 19) {
        const inn = this.propBuilder.createLuke10GoodSamaritanInnEnsemble(null, pal, false);
        if (inn.innLight) inn.group.remove(inn.innLight);
        inn.group.scale.setScalar(0.72);
        inn.group.position.set(wx + side * 3.0, wy, wz - 2.2);
        inn.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(inn.group);
        return;
      }
      if (pData.n === 27) {
        const prodigal = this.propBuilder.createLuke15ProdigalWelcomeEnsemble(null, pal, false);
        if (prodigal.roadLight) prodigal.group.remove(prodigal.roadLight);
        prodigal.group.scale.setScalar(0.72);
        prodigal.group.position.set(wx + side * 3.0, wy, wz - 2.2);
        prodigal.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(prodigal.group);
        return;
      }
      if (pData.n === 40) {
        const emmaus = this.propBuilder.createLuke24EmmausTableEnsemble(null, pal, false);
        if (emmaus.tableLight) emmaus.group.remove(emmaus.tableLight);
        emmaus.group.scale.setScalar(0.76);
        emmaus.group.position.set(wx + side * 2.8, wy, wz - 2.0);
        emmaus.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(emmaus.group);
        return;
      }
    } else if (slug === 'i-am-with-you-always') {
      if (pData.n === 4 || pData.n === 5) {
        const magi = this.propBuilder.createMatthew2MagiStarGiftsEnsemble(null, pal, false);
        if (magi.starLight) magi.group.remove(magi.starLight);
        magi.group.scale.setScalar(0.74);
        magi.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        magi.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(magi.group);
        return;
      }
      if (pData.n === 13) {
        const lamp = this.propBuilder.createMatthew5LampOnStandEnsemble(null, pal, false);
        if (lamp.lampLight) lamp.group.remove(lamp.lampLight);
        lamp.group.scale.setScalar(0.76);
        lamp.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        lamp.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(lamp.group);
        return;
      }
      if (pData.n === 26) {
        const boat = this.propBuilder.createStormBoatAndCushion(null, pal);
        if (boat.lanternLight) boat.group.remove(boat.lanternLight);
        boat.group.scale.setScalar(0.72);
        boat.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        boat.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(boat.group);
        return;
      }
      if (pData.n === 39 || pData.n === 40) {
        const tomb = this.propBuilder.createMatthew28EmptyTombEnsemble(null, pal, false);
        if (tomb.tombLight) tomb.group.remove(tomb.tombLight);
        tomb.group.scale.setScalar(0.72);
        tomb.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        tomb.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(tomb.group);
        return;
      }
    } else if (slug === 'peace-be-still') {
      if (pData.n === 11 || pData.n === 12) {
        const boat = this.propBuilder.createStormBoatAndCushion(null, pal);
        if (boat.lanternLight) boat.group.remove(boat.lanternLight);
        boat.group.scale.setScalar(0.72);
        boat.group.position.set(wx + side * 3.0, wy, wz - 2.4);
        boat.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(boat.group);
        return;
      }
      if (pData.n === 18) {
        const baskets = this.propBuilder.createMark6GreenGrassBasketsEnsemble(null, pal, false);
        if (baskets.basketLight) baskets.group.remove(baskets.basketLight);
        baskets.group.scale.setScalar(0.74);
        baskets.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        baskets.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(baskets.group);
        return;
      }
      if (pData.n === 27) {
        const cloak = this.propBuilder.createMark10BartimaeusCloakEnsemble(null, pal, false);
        if (cloak.cloakLight) cloak.group.remove(cloak.cloakLight);
        cloak.group.scale.setScalar(0.76);
        cloak.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        cloak.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(cloak.group);
        return;
      }
      if (pData.n === 30) {
        const jar = this.propBuilder.createMark14AlabasterJarEnsemble(null, pal, false);
        if (jar.jarLight) jar.group.remove(jar.jarLight);
        jar.group.scale.setScalar(0.76);
        jar.group.position.set(wx + side * 2.8, wy, wz - 2.0);
        jar.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(jar.group);
        return;
      }
    } else if (slug === 'come-and-see') {
      if (pData.n === 6) {
        const jars = this.propBuilder.createJohn2CanaStoneJarsEnsemble(null, pal, false);
        if (jars.canaLight) jars.group.remove(jars.canaLight);
        jars.group.scale.setScalar(0.74);
        jars.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        jars.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(jars.group);
        return;
      }
      if (pData.n === 9) {
        const well = this.propBuilder.createJohn4JacobsWellJarEnsemble(null, pal, false);
        if (well.wellLight) well.group.remove(well.wellLight);
        well.group.scale.setScalar(0.74);
        well.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        well.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(well.group);
        return;
      }
      if (pData.n === 25) {
        const basin = this.propBuilder.createJohn13UpperRoomBasinEnsemble(null, pal, false);
        if (basin.basinLight) basin.group.remove(basin.basinLight);
        basin.group.scale.setScalar(0.74);
        basin.group.position.set(wx + side * 2.8, wy, wz - 2.0);
        basin.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(basin.group);
        return;
      }
      if (pData.n === 39 || pData.n === 40) {
        const charcoal = this.propBuilder.createJohn21CharcoalBreakfastEnsemble(null, pal, false);
        if (charcoal.fireLight) charcoal.group.remove(charcoal.fireLight);
        charcoal.group.scale.setScalar(0.76);
        charcoal.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        charcoal.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(charcoal.group);
        return;
      }
    } else if (slug === 'out-of-the-whirlwind') {
      if (pData.n === 6) {
        const ash = this.propBuilder.createJob2AshHeapPotsherdEnsemble(null, pal, false);
        if (ash.ashLight) ash.group.remove(ash.ashLight);
        ash.group.scale.setScalar(0.74);
        ash.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        ash.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(ash.group);
        return;
      }
      if (pData.n === 16) {
        const stump = this.propBuilder.createJob14ScentOfWaterStumpEnsemble(null, pal, false);
        if (stump.sproutLight) stump.group.remove(stump.sproutLight);
        stump.group.scale.setScalar(0.76);
        stump.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        stump.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(stump.group);
        return;
      }
      if (pData.n === 19) {
        const rock = this.propBuilder.createJob19RedeemerRockInscriptionEnsemble(null, pal, false);
        if (rock.rockLight) rock.group.remove(rock.rockLight);
        rock.group.scale.setScalar(0.74);
        rock.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        rock.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(rock.group);
        return;
      }
      if (pData.n === 32 || pData.n === 40) {
        const whirlwind = this.propBuilder.createJob38WhirlwindAndStarsEnsemble(null, pal, false);
        if (whirlwind.starLight) whirlwind.group.remove(whirlwind.starLight);
        whirlwind.group.scale.setScalar(0.74);
        whirlwind.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        whirlwind.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(whirlwind.group);
        return;
      }
    } else if (slug === 'a-future-and-a-hope') {
      if (pData.n === 3) {
        const almond = this.propBuilder.createJeremiah1AlmondBranchEnsemble(null, pal, false);
        if (almond.almondLight) almond.group.remove(almond.almondLight);
        almond.group.scale.setScalar(0.76);
        almond.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        almond.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(almond.group);
        return;
      }
      if (pData.n === 16) {
        const wheel = this.propBuilder.createJeremiah18PottersWheelEnsemble(null, pal, false);
        if (wheel.potterLight) wheel.group.remove(wheel.potterLight);
        wheel.group.scale.setScalar(0.74);
        wheel.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        wheel.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(wheel.group);
        return;
      }
      if (pData.n === 24) {
        const scroll = this.propBuilder.createJeremiah29ExileLetterScrollEnsemble(null, pal, false);
        if (scroll.scrollLight) scroll.group.remove(scroll.scrollLight);
        scroll.group.scale.setScalar(0.76);
        scroll.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        scroll.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(scroll.group);
        return;
      }
      if (pData.n === 30 || pData.n === 40) {
        const deed = this.propBuilder.createJeremiah32AnathothDeedJarsEnsemble(null, pal, false);
        if (deed.deedLight) deed.group.remove(deed.deedLight);
        deed.group.scale.setScalar(0.76);
        deed.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        deed.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(deed.group);
        return;
      }
    } else if (slug === 'can-these-bones-live') {
      if (pData.n === 3) {
        const wheel = this.propBuilder.createEzekiel1ChebarWheelThroneEnsemble(null, pal, false);
        if (wheel.wheelLight) wheel.group.remove(wheel.wheelLight);
        wheel.group.scale.setScalar(0.72);
        wheel.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        wheel.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(wheel.group);
        return;
      }
      if (pData.n === 30) {
        const heart = this.propBuilder.createEzekiel36HeartOfFleshAltarEnsemble(null, pal, false);
        if (heart.heartLight) heart.group.remove(heart.heartLight);
        heart.group.scale.setScalar(0.74);
        heart.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        heart.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(heart.group);
        return;
      }
      if (pData.n === 32) {
        const bones = this.propBuilder.createEzekiel37ValleyOfDryBonesEnsemble(null, pal, false);
        if (bones.breathLight) bones.group.remove(bones.breathLight);
        bones.group.scale.setScalar(0.74);
        bones.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        bones.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(bones.group);
        return;
      }
      if (pData.n === 38 || pData.n === 40) {
        const river = this.propBuilder.createEzekiel47TempleRiverTreesEnsemble(null, pal, false);
        if (river.riverLight) river.group.remove(river.riverLight);
        river.group.scale.setScalar(0.74);
        river.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        river.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(river.group);
        return;
      }
    } else if (slug === 'out-of-the-deep') {
      if (pData.n === 3) {
        const ship = this.propBuilder.createJonah1TarshishStormShipEnsemble(null, pal, false);
        if (ship.lanternLight) ship.group.remove(ship.lanternLight);
        ship.group.scale.setScalar(0.72);
        ship.group.position.set(wx + side * 3.0, wy, wz - 2.2);
        ship.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(ship.group);
        return;
      }
      if (pData.n === 8) {
        const fish = this.propBuilder.createJonah2GreatFishDepthsEnsemble(null, pal, false);
        if (fish.deepLight) fish.group.remove(fish.deepLight);
        fish.group.scale.setScalar(0.74);
        fish.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        fish.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(fish.group);
        return;
      }
      if (pData.n === 16) {
        const throne = this.propBuilder.createJonah3NinevehEmptyThroneEnsemble(null, pal, false);
        if (throne.throneLight) throne.group.remove(throne.throneLight);
        throne.group.scale.setScalar(0.74);
        throne.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        throne.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(throne.group);
        return;
      }
      if (pData.n === 22 || pData.n === 24) {
        const vine = this.propBuilder.createJonah4EastHillBoothVineEnsemble(null, pal, false);
        if (vine.vineLight) vine.group.remove(vine.vineLight);
        vine.group.scale.setScalar(0.76);
        vine.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        vine.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(vine.group);
        return;
      }
    } else if (slug === 'to-the-ends-of-the-earth') {
      if (pData.n === 5) {
        const room = this.propBuilder.createActs2PentecostUpperRoomEnsemble(null, pal, false);
        if (room.pentecostLight) room.group.remove(room.pentecostLight);
        room.group.scale.setScalar(0.74);
        room.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        room.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(room.group);
        return;
      }
      if (pData.n === 9) {
        const gate = this.propBuilder.createActs3GateCalledBeautifulEnsemble(null, pal, false);
        if (gate.gateLight) gate.group.remove(gate.gateLight);
        gate.group.scale.setScalar(0.72);
        gate.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        gate.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(gate.group);
        return;
      }
      if (pData.n === 29) {
        const prison = this.propBuilder.createActs16PhilippiMidnightPrisonEnsemble(null, pal, false);
        if (prison.prisonLight) prison.group.remove(prison.prisonLight);
        prison.group.scale.setScalar(0.74);
        prison.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        prison.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(prison.group);
        return;
      }
      if (pData.n === 37 || pData.n === 40) {
        const anchors = this.propBuilder.createActs27MaltaFourAnchorsEnsemble(null, pal, false);
        if (anchors.anchorLight) anchors.group.remove(anchors.anchorLight);
        anchors.group.scale.setScalar(0.74);
        anchors.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        anchors.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(anchors.group);
        return;
      }
    } else if (slug === 'anchor-of-the-soul') {
      if (pData.n === 16) {
        const grace = this.propBuilder.createHebrews4ThroneOfGraceEnsemble(null, pal, false);
        if (grace.graceLight) grace.group.remove(grace.graceLight);
        grace.group.scale.setScalar(0.74);
        grace.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        grace.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(grace.group);
        return;
      }
      if (pData.n === 19) {
        const anchor = this.propBuilder.createHebrews6AnchorOfTheSoulEnsemble(null, pal, false);
        if (anchor.soulLight) anchor.group.remove(anchor.soulLight);
        anchor.group.scale.setScalar(0.74);
        anchor.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        anchor.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(anchor.group);
        return;
      }
      if (pData.n === 23) {
        const veil = this.propBuilder.createHebrews10OpenedCurtainWayEnsemble(null, pal, false);
        if (veil.veilLight) veil.group.remove(veil.veilLight);
        veil.group.scale.setScalar(0.74);
        veil.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        veil.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(veil.group);
        return;
      }
      if (pData.n === 33 || pData.n === 40) {
        const arena = this.propBuilder.createHebrews12CloudOfWitnessesArenaEnsemble(null, pal, false);
        if (arena.arenaLight) arena.group.remove(arena.arenaLight);
        arena.group.scale.setScalar(0.74);
        arena.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        arena.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(arena.group);
        return;
      }
    } else if (slug === 'our-eyes-are-on-you') {
      if (pData.n === 4) {
        const thresh = this.propBuilder.createChronicles9ThresholdKeepersEnsemble(null, pal, false);
        if (thresh.thresholdLight) thresh.group.remove(thresh.thresholdLight);
        thresh.group.scale.setScalar(0.74);
        thresh.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        thresh.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(thresh.group);
        return;
      }
      if (pData.n === 8) {
        const feast = this.propBuilder.createChronicles16ArkTentFeastEnsemble(null, pal, false);
        if (feast.feastLight) feast.group.remove(feast.feastLight);
        feast.group.scale.setScalar(0.74);
        feast.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        feast.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(feast.group);
        return;
      }
      if (pData.n === 18) {
        const sound = this.propBuilder.createChronicles5OneSoundTrumpetsEnsemble(null, pal, false);
        if (sound.gloryLight) sound.group.remove(sound.gloryLight);
        sound.group.scale.setScalar(0.74);
        sound.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        sound.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(sound.group);
        return;
      }
      if (pData.n === 24 || pData.n === 36) {
        const eyes = this.propBuilder.createChronicles20EyesOnYouCourtyardEnsemble(null, pal, false);
        if (eyes.eyesLight) eyes.group.remove(eyes.eyesLight);
        eyes.group.scale.setScalar(0.74);
        eyes.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        eyes.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(eyes.group);
        return;
      }
    } else if (slug === 'rise-up-and-build') {
      if (pData.n === 4) {
        const altar = this.propBuilder.createEzra3AltarOnItsBaseEnsemble(null, pal, false);
        if (altar.altarLight) altar.group.remove(altar.altarLight);
        altar.group.scale.setScalar(0.74);
        altar.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        altar.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(altar.group);
        return;
      }
      if (pData.n === 23) {
        const ride = this.propBuilder.createNehemiah2NightRideWallEnsemble(null, pal, false);
        if (ride.nightLight) ride.group.remove(ride.nightLight);
        ride.group.scale.setScalar(0.74);
        ride.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        ride.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(ride.group);
        return;
      }
      if (pData.n === 29) {
        const wall = this.propBuilder.createNehemiah4TrowelAndSwordWallEnsemble(null, pal, false);
        if (wall.wallLight) wall.group.remove(wall.wallLight);
        wall.group.scale.setScalar(0.74);
        wall.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        wall.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(wall.group);
        return;
      }
      if (pData.n === 34 || pData.n === 40) {
        const scroll = this.propBuilder.createNehemiah8WaterGateScrollEnsemble(null, pal, false);
        if (scroll.scrollLight) scroll.group.remove(scroll.scrollLight);
        scroll.group.scale.setScalar(0.74);
        scroll.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        scroll.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(scroll.group);
        return;
      }
    } else if (slug === 'for-such-a-time-as-this') {
      if (pData.n === 4) {
        const court = this.propBuilder.createEsther2SusaMosaicCourtyardEnsemble(null, pal, false);
        if (court.courtLight) court.group.remove(court.courtLight);
        court.group.scale.setScalar(0.74);
        court.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        court.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(court.group);
        return;
      }
      if (pData.n === 16) {
        const fast = this.propBuilder.createEsther4ThreeDayFastEnsemble(null, pal, false);
        if (fast.fastLight) fast.group.remove(fast.fastLight);
        fast.group.scale.setScalar(0.74);
        fast.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        fast.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(fast.group);
        return;
      }
      if (pData.n === 18 || pData.n === 32) {
        const scepter = this.propBuilder.createEsther5GoldenScepterThroneEnsemble(null, pal, false);
        if (scepter.scepterLight) scepter.group.remove(scepter.scepterLight);
        scepter.group.scale.setScalar(0.74);
        scepter.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        scepter.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(scepter.group);
        return;
      }
      if (pData.n === 21) {
        const chron = this.propBuilder.createEsther6SleeplessChroniclesEnsemble(null, pal, false);
        if (chron.lampLight) chron.group.remove(chron.lampLight);
        chron.group.scale.setScalar(0.74);
        chron.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        chron.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(chron.group);
        return;
      }
    } else if (slug === 'the-beginning-of-wisdom') {
      if (pData.n === 6) {
        const spring = this.propBuilder.createProverbs4WellspringOfLifeEnsemble(null, pal, false);
        if (spring.springLight) spring.group.remove(spring.springLight);
        spring.group.scale.setScalar(0.74);
        spring.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        spring.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(spring.group);
        return;
      }
      if (pData.n === 14) {
        const apples = this.propBuilder.createProverbs25ApplesOfGoldEnsemble(null, pal, false);
        if (apples.applesLight) apples.group.remove(apples.applesLight);
        apples.group.scale.setScalar(0.74);
        apples.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        apples.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(apples.group);
        return;
      }
      if (pData.n === 25) {
        const iron = this.propBuilder.createProverbs27IronSharpensIronEnsemble(null, pal, false);
        if (iron.forgeLight) iron.group.remove(iron.forgeLight);
        iron.group.scale.setScalar(0.74);
        iron.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        iron.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(iron.group);
        return;
      }
      if (pData.n === 38 || pData.n === 40) {
        const dawn = this.propBuilder.createProverbs31LampBeforeDawnEnsemble(null, pal, false);
        if (dawn.dawnLight) dawn.group.remove(dawn.dawnLight);
        dawn.group.scale.setScalar(0.74);
        dawn.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        dawn.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(dawn.group);
        return;
      }
    } else if (slug === 'eternity-in-their-hearts') {
      if (pData.n === 4) {
        const sea = this.propBuilder.createEcclesiastes1RiversToTheSeaEnsemble(null, pal, false);
        if (sea.seaLight) sea.group.remove(sea.seaLight);
        sea.group.scale.setScalar(0.74);
        sea.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        sea.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(sea.group);
        return;
      }
      if (pData.n === 13 || pData.n === 36) {
        const sundial = this.propBuilder.createEcclesiastes3SundialOfSeasonsEnsemble(null, pal, false);
        if (sundial.sundialLight) sundial.group.remove(sundial.sundialLight);
        sundial.group.scale.setScalar(0.74);
        sundial.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        sundial.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(sundial.group);
        return;
      }
      if (pData.n === 16) {
        const cord = this.propBuilder.createEcclesiastes4ThreefoldCordEnsemble(null, pal, false);
        if (cord.cordLight) cord.group.remove(cord.cordLight);
        cord.group.scale.setScalar(0.74);
        cord.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        cord.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(cord.group);
        return;
      }
      if (pData.n === 34) {
        const almond = this.propBuilder.createEcclesiastes12BlossomingAlmondEnsemble(null, pal, false);
        if (almond.almondLight) almond.group.remove(almond.almondLight);
        almond.group.scale.setScalar(0.74);
        almond.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        almond.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(almond.group);
        return;
      }
    } else if (slug === 'many-waters') {
      if (pData.n === 5) {
        const banner = this.propBuilder.createSong2BannerOfLoveEnsemble(null, pal, false);
        if (banner.bannerLight) banner.group.remove(banner.bannerLight);
        banner.group.scale.setScalar(0.74);
        banner.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        banner.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(banner.group);
        return;
      }
      if (pData.n === 7) {
        const spring = this.propBuilder.createSong2WinterIsPastLatticeEnsemble(null, pal, false);
        if (spring.springLight) spring.group.remove(spring.springLight);
        spring.group.scale.setScalar(0.74);
        spring.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        spring.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(spring.group);
        return;
      }
      if (pData.n === 14) {
        const garden = this.propBuilder.createSong4EnclosedGardenFountainEnsemble(null, pal, false);
        if (garden.fountainLight) garden.group.remove(garden.fountainLight);
        garden.group.scale.setScalar(0.74);
        garden.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        garden.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(garden.group);
        return;
      }
      if (pData.n === 29 || pData.n === 32) {
        const seal = this.propBuilder.createSong8ManyWatersSealFlameEnsemble(null, pal, false);
        if (seal.sealLight) seal.group.remove(seal.sealLight);
        seal.group.scale.setScalar(0.74);
        seal.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        seal.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(seal.group);
        return;
      }
    } else if (slug === 'new-every-morning') {
      if (pData.n === 1) {
        const well = this.propBuilder.createLamentations1SolitaryCityWellEnsemble(null, pal, false);
        if (well.wellLight) well.group.remove(well.wellLight);
        well.group.scale.setScalar(0.74);
        well.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        well.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(well.group);
        return;
      }
      if (pData.n === 10 || pData.n === 22) {
        const jar = this.propBuilder.createLamentations2PourOutWaterJarEnsemble(null, pal, false);
        if (jar.watchLight) jar.group.remove(jar.watchLight);
        jar.group.scale.setScalar(0.74);
        jar.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        jar.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(jar.group);
        return;
      }
      if (pData.n === 14) {
        const dawn = this.propBuilder.createLamentations3NewEveryMorningDawnEnsemble(null, pal, false);
        if (dawn.mercyLight) dawn.group.remove(dawn.mercyLight);
        dawn.group.scale.setScalar(0.74);
        dawn.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        dawn.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(dawn.group);
        return;
      }
      if (pData.n === 28 || pData.n === 30) {
        const lyre = this.propBuilder.createLamentations5RestoredLyreDawnWallEnsemble(null, pal, false);
        if (lyre.renewLight) lyre.group.remove(lyre.renewLight);
        lyre.group.scale.setScalar(0.74);
        lyre.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        lyre.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(lyre.group);
        return;
      }
    }

    if (slug === 'a-door-of-hope') {
      if (pData.n === 1 || pData.n === 6) {
        const door = this.propBuilder.createHosea2ValleyOfAchorDoorEnsemble(null, pal, false);
        if (door.doorLight) door.group.remove(door.doorLight);
        door.group.scale.setScalar(0.74);
        door.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        door.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(door.group);
        return;
      }
      if (pData.n === 14 || pData.n === 16) {
        const lily = this.propBuilder.createHosea14DewLilyAndOliveEnsemble(null, pal, false);
        if (lily.dewLight) lily.group.remove(lily.dewLight);
        lily.group.scale.setScalar(0.74);
        lily.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        lily.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(lily.group);
        return;
      }
      if (pData.n === 22 || pData.n === 23) {
        const harvest = this.propBuilder.createJoel2RestoredHarvestBasketEnsemble(null, pal, false);
        if (harvest.harvestLight) harvest.group.remove(harvest.harvestLight);
        harvest.group.scale.setScalar(0.74);
        harvest.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        harvest.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(harvest.group);
        return;
      }
      if (pData.n === 33 || pData.n === 35) {
        const plumb = this.propBuilder.createAmos7PlumbLineWallEnsemble(null, pal, false);
        if (plumb.plumbLight) plumb.group.remove(plumb.plumbLight);
        plumb.group.scale.setScalar(0.74);
        plumb.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        plumb.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(plumb.group);
        return;
      }
    }

    if (slug === 'the-day-of-small-things') {
      if (pData.n === 3 || pData.n === 7) {
        const figTree = this.propBuilder.createMicah4FigTreeStoolAndPitcherEnsemble(null, pal, false);
        if (figTree.shadeLight) figTree.group.remove(figTree.shadeLight);
        figTree.group.scale.setScalar(0.74);
        figTree.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        figTree.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(figTree.group);
        return;
      }
      if (pData.n === 12 || pData.n === 16) {
        const watchtower = this.propBuilder.createHabakkuk2WatchtowerParapetEnsemble(null, pal, false);
        if (watchtower.watchLight) watchtower.group.remove(watchtower.watchLight);
        watchtower.group.scale.setScalar(0.74);
        watchtower.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        watchtower.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(watchtower.group);
        return;
      }
      if (pData.n === 24 || pData.n === 28) {
        const menorah = this.propBuilder.createZechariah4SevenLampsAndOliveTreesEnsemble(null, pal, false);
        if (menorah.menorahLight) menorah.group.remove(menorah.menorahLight);
        menorah.group.scale.setScalar(0.74);
        menorah.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        menorah.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(menorah.group);
        return;
      }
      if (pData.n === 38 || pData.n === 40) {
        const memoryBook = this.propBuilder.createMalachi3BookOfRemembranceEnsemble(null, pal, false);
        if (memoryBook.memoryLight) memoryBook.group.remove(memoryBook.memoryLight);
        memoryBook.group.scale.setScalar(0.74);
        memoryBook.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        memoryBook.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(memoryBook.group);
        return;
      }
    }

    if (slug === 'nothing-can-separate') {
      if (pData.n === 4 || pData.n === 9) {
        const openDoor = this.propBuilder.createRomans5OpenDoorOfGraceCourtyardEnsemble(null, pal, false);
        if (openDoor.graceLight) openDoor.group.remove(openDoor.graceLight);
        openDoor.group.scale.setScalar(0.74);
        openDoor.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        openDoor.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(openDoor.group);
        return;
      }
      if (pData.n === 14 || pData.n === 19) {
        const abbaStep = this.propBuilder.createRomans8AbbaThresholdSandalsEnsemble(null, pal, false);
        if (abbaStep.adoptionLight) abbaStep.group.remove(abbaStep.adoptionLight);
        abbaStep.group.scale.setScalar(0.74);
        abbaStep.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        abbaStep.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(abbaStep.group);
        return;
      }
      if (pData.n === 23 || pData.n === 25) {
        const parapet = this.propBuilder.createRomans8NothingCanSeparateParapetEnsemble(null, pal, false);
        if (parapet.loveLight) parapet.group.remove(parapet.loveLight);
        parapet.group.scale.setScalar(0.74);
        parapet.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        parapet.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(parapet.group);
        return;
      }
      if (pData.n === 30 || pData.n === 37) {
        const oliveGraft = this.propBuilder.createRomans11GraftedOliveTreeEnsemble(null, pal, false);
        if (oliveGraft.graftLight) oliveGraft.group.remove(oliveGraft.graftLight);
        oliveGraft.group.scale.setScalar(0.74);
        oliveGraft.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        oliveGraft.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(oliveGraft.group);
        return;
      }
    }

    if (slug === 'treasure-in-clay-jars') {
      if (pData.n === 8 || pData.n === 15) {
        const table = this.propBuilder.createCorinthians11CommunionTableAndCushionsEnsemble(null, pal, false);
        if (table.tableLight) table.group.remove(table.tableLight);
        table.group.scale.setScalar(0.74);
        table.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        table.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(table.group);
        return;
      }
      if (pData.n === 18 || pData.n === 27) {
        const mirror = this.propBuilder.createCorinthians13PolishedBronzeMirrorEnsemble(null, pal, false);
        if (mirror.mirrorLight) mirror.group.remove(mirror.mirrorLight);
        mirror.group.scale.setScalar(0.74);
        mirror.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        mirror.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(mirror.group);
        return;
      }
      if (pData.n === 23 || pData.n === 29) {
        const crackedJar = this.propBuilder.createCorinthians4CrackedClayJarLightEnsemble(null, pal, false);
        if (crackedJar.treasureLight) crackedJar.group.remove(crackedJar.treasureLight);
        crackedJar.group.scale.setScalar(0.74);
        crackedJar.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        crackedJar.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(crackedJar.group);
        return;
      }
      if (pData.n === 39 || pData.n === 40) {
        const openJar = this.propBuilder.createCorinthians12OpenJarInSunlightEnsemble(null, pal, false);
        if (openJar.weaknessLight) openJar.group.remove(openJar.weaknessLight);
        openJar.group.scale.setScalar(0.74);
        openJar.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        openJar.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(openJar.group);
        return;
      }
    }

    if (slug === 'rooted-and-free') {
      if (pData.n === 7 || pData.n === 17) {
        const fruitBowl = this.propBuilder.createGalatians5FruitOfTheSpiritBowlEnsemble({
          isFinalePlaza: false
        });
        if (fruitBowl.fruitLight) fruitBowl.group.remove(fruitBowl.fruitLight);
        fruitBowl.group.scale.setScalar(0.74);
        fruitBowl.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        fruitBowl.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(fruitBowl.group);
        return;
      }
      if (pData.n === 23 || pData.n === 27) {
        const brokenWall = this.propBuilder.createEphesians2BrokenDividingWallGapEnsemble({
          isFinalePlaza: false
        });
        if (brokenWall.peaceLight) brokenWall.group.remove(brokenWall.peaceLight);
        brokenWall.group.scale.setScalar(0.72);
        brokenWall.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        brokenWall.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(brokenWall.group);
        return;
      }
      if (pData.n === 29 || pData.n === 30) {
        const rootedTree = this.propBuilder.createEphesians3RootedOliveTreeAndBasketEnsemble({
          isFinalePlaza: false
        });
        if (rootedTree.rootedLight) rootedTree.group.remove(rootedTree.rootedLight);
        rootedTree.group.scale.setScalar(0.74);
        rootedTree.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        rootedTree.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(rootedTree.group);
        return;
      }
      if (pData.n === 35 || pData.n === 40) {
        const armorTable = this.propBuilder.createEphesians6ArmorOfGodTableEnsemble({
          isFinalePlaza: false
        });
        if (armorTable.armorLight) armorTable.group.remove(armorTable.armorLight);
        armorTable.group.scale.setScalar(0.74);
        armorTable.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        armorTable.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(armorTable.group);
        return;
      }
    }

    if (slug === 'joy-in-chains') {
      if (pData.n === 3 || pData.n === 4) {
        const guardTable = this.propBuilder.createPhilippians1PraetorianHelmetAndScrollTableEnsemble({
          isFinalePlaza: false
        });
        if (guardTable.guardLight) guardTable.group.remove(guardTable.guardLight);
        guardTable.group.scale.setScalar(0.74);
        guardTable.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        guardTable.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(guardTable.group);
        return;
      }
      if (pData.n === 7 || pData.n === 8) {
        const servantBasin = this.propBuilder.createPhilippians2ServantBasinAndTowelStairsEnsemble({
          isFinalePlaza: false
        });
        if (servantBasin.servantLight) servantBasin.group.remove(servantBasin.servantLight);
        servantBasin.group.scale.setScalar(0.74);
        servantBasin.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        servantBasin.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(servantBasin.group);
        return;
      }
      if (pData.n === 14 || pData.n === 17) {
        const stadiumTrack = this.propBuilder.createPhilippians3StadiumTrackAndFinishWreathEnsemble({
          isFinalePlaza: false
        });
        if (stadiumTrack.trackLight) stadiumTrack.group.remove(stadiumTrack.trackLight);
        stadiumTrack.group.scale.setScalar(0.72);
        stadiumTrack.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        stadiumTrack.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(stadiumTrack.group);
        return;
      }
      if (pData.n === 21 || pData.n === 24) {
        const sentryGate = this.propBuilder.createPhilippians4SentryGateAndLanternEnsemble({
          isFinalePlaza: false
        });
        if (sentryGate.sentryLight) sentryGate.group.remove(sentryGate.sentryLight);
        sentryGate.group.scale.setScalar(0.72);
        sentryGate.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        sentryGate.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(sentryGate.group);
        return;
      }
    }

    if (slug === 'held-together') {
      if (pData.n === 5 || pData.n === 7) {
        const keystoneArch = this.propBuilder.createColossians1KeystoneArchEnsemble({
          isFinalePlaza: false
        });
        if (keystoneArch.keystoneLight) keystoneArch.group.remove(keystoneArch.keystoneLight);
        keystoneArch.group.scale.setScalar(0.72);
        keystoneArch.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        keystoneArch.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(keystoneArch.group);
        return;
      }
      if (pData.n === 11 || pData.n === 12) {
        const waxTablet = this.propBuilder.createColossians2WipedCleanWaxTabletAndStylusEnsemble({
          isFinalePlaza: false
        });
        if (waxTablet.tabletLight) waxTablet.group.remove(waxTablet.tabletLight);
        waxTablet.group.scale.setScalar(0.74);
        waxTablet.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        waxTablet.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(waxTablet.group);
        return;
      }
      if (pData.n === 16 || pData.n === 19) {
        const courtyardLyre = this.propBuilder.createColossians3CourtyardLyreAndBenchesEnsemble({
          isFinalePlaza: false
        });
        if (courtyardLyre.hymnLight) courtyardLyre.group.remove(courtyardLyre.hymnLight);
        courtyardLyre.group.scale.setScalar(0.72);
        courtyardLyre.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        courtyardLyre.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(courtyardLyre.group);
        return;
      }
      if (pData.n === 28 || pData.n === 32) {
        const guestRoom = this.propBuilder.createPhilemon22PreparedGuestRoomEnsemble({
          isFinalePlaza: false
        });
        if (guestRoom.guestLight) guestRoom.group.remove(guestRoom.guestLight);
        guestRoom.group.scale.setScalar(0.74);
        guestRoom.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        guestRoom.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(guestRoom.group);
        return;
      }
    }

    if (slug === 'children-of-the-day') {
      if (pData.n === 5 || pData.n === 8) {
        const cradleTable = this.propBuilder.createThessalonians2CradleLampAndSwaddlingTableEnsemble({
          isFinalePlaza: false
        });
        if (cradleTable.lampLight) cradleTable.group.remove(cradleTable.lampLight);
        cradleTable.group.scale.setScalar(0.74);
        cradleTable.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        cradleTable.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(cradleTable.group);
        return;
      }
      if (pData.n === 10 || pData.n === 16) {
        const tentBench = this.propBuilder.createThessalonians2TentmakerWorkbenchAndNeedleEnsemble({
          isFinalePlaza: false
        });
        if (tentBench.benchLight) tentBench.group.remove(tentBench.benchLight);
        tentBench.group.scale.setScalar(0.74);
        tentBench.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        tentBench.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(tentBench.group);
        return;
      }
      if (pData.n === 21 || pData.n === 24) {
        const dawnSill = this.propBuilder.createThessalonians5DawnWindowsillLampAndScrollEnsemble({
          isFinalePlaza: false
        });
        if (dawnSill.dawnLight) dawnSill.group.remove(dawnSill.dawnLight);
        dawnSill.group.scale.setScalar(0.72);
        dawnSill.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        dawnSill.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(dawnSill.group);
        return;
      }
      if (pData.n === 30 || pData.n === 34) {
        const loafTable = this.propBuilder.create2Thessalonians3QuietWorkTableLoafAndGlovesEnsemble({
          isFinalePlaza: false
        });
        if (loafTable.tableLight) loafTable.group.remove(loafTable.tableLight);
        loafTable.group.scale.setScalar(0.74);
        loafTable.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        loafTable.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(loafTable.group);
        return;
      }
    }

    if (slug === 'grace-mercy-and-peace') {
      if (pData.n === 6 || pData.n === 7) {
        const pillarTable = this.propBuilder.createTimothy3CourtyardPillarAndTableEnsemble({
          isFinalePlaza: false
        });
        if (pillarTable.pillarLight) pillarTable.group.remove(pillarTable.pillarLight);
        pillarTable.group.scale.setScalar(0.72);
        pillarTable.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        pillarTable.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(pillarTable.group);
        return;
      }
      if (pData.n === 12 || pData.n === 18) {
        const loisTable = this.propBuilder.create2Timothy1LoisAndEuniceLampAndScrollTableEnsemble({
          isFinalePlaza: false
        });
        if (loisTable.lampLight) loisTable.group.remove(loisTable.lampLight);
        loisTable.group.scale.setScalar(0.74);
        loisTable.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        loisTable.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(loisTable.group);
        return;
      }
      if (pData.n === 27 || pData.n === 28) {
        const finishStone = this.propBuilder.create2Timothy4StadiumFinishStoneAndLaurelCrownEnsemble({
          isFinalePlaza: false
        });
        if (finishStone.crownLight) finishStone.group.remove(finishStone.crownLight);
        finishStone.group.scale.setScalar(0.74);
        finishStone.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        finishStone.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(finishStone.group);
        return;
      }
      if (pData.n === 30 || pData.n === 39) {
        const cloakBench = this.propBuilder.create2Timothy4CloakAndParchmentsStoneBenchEnsemble({
          isFinalePlaza: false
        });
        if (cloakBench.benchLight) cloakBench.group.remove(cloakBench.benchLight);
        cloakBench.group.scale.setScalar(0.74);
        cloakBench.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        cloakBench.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(cloakBench.group);
        return;
      }
    }

    if (slug === 'doers-of-the-word') {
      if (pData.n === 4 || pData.n === 6) {
        const mirrorTable = this.propBuilder.createJames1BronzeMirrorAndWaterBasinTableEnsemble({
          isFinalePlaza: false
        });
        if (mirrorTable.mirrorLight) mirrorTable.group.remove(mirrorTable.mirrorLight);
        mirrorTable.group.scale.setScalar(0.74);
        mirrorTable.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        mirrorTable.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(mirrorTable.group);
        return;
      }
      if (pData.n === 13 || pData.n === 14) {
        const rudderBoat = this.propBuilder.createJames3BoatSternAndTimberRudderEnsemble({
          isFinalePlaza: false
        });
        if (rudderBoat.rudderLight) rudderBoat.group.remove(rudderBoat.rudderLight);
        rudderBoat.group.scale.setScalar(0.72);
        rudderBoat.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        rudderBoat.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(rudderBoat.group);
        return;
      }
      if (pData.n === 17 || pData.n === 18) {
        const springPool = this.propBuilder.createJames3RockySpringPoolAndFigBoughEnsemble({
          isFinalePlaza: false
        });
        if (springPool.springLight) springPool.group.remove(springPool.springLight);
        springPool.group.scale.setScalar(0.72);
        springPool.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        springPool.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(springPool.group);
        return;
      }
      if (pData.n === 26 || pData.n === 29) {
        const barleyField = this.propBuilder.createJames5PlowedBarleyFieldAndRainStaffEnsemble({
          isFinalePlaza: false
        });
        if (barleyField.rainLight) barleyField.group.remove(barleyField.rainLight);
        barleyField.group.scale.setScalar(0.74);
        barleyField.group.position.set(wx + side * 2.8, wy, wz - 2.2);
        barleyField.group.lookAt(wx - side * 2.5, wy, wz + 2.0);
        streetGroup.add(barleyField.group);
        return;
      }
    }

    // 3. Biome-Matched Roadside Scenery (instead of placing the same meadow tree in every book)
    if (bCfg.biome === 'wilderness') {
      const crag = this.propBuilder.createWildernessCampAndCrag(pal, pData.n);
      crag.scale.setScalar(0.62);
      crag.position.set(wx + side * 3.8, wy, wz - 1.5);
      crag.rotation.y = pData.n * 0.9;
      streetGroup.add(crag);
      return;
    }

    if (bCfg.biome === 'babylon_fortress' || (bCfg.biome === 'walled_citadel' && pData.n % 2 === 0)) {
      const bastion = this.propBuilder.createBabylonFortressWallSegment(
        pal,
        slug === 'for-such-a-time-as-this'
      );
      bastion.scale.setScalar(0.58);
      bastion.position.set(wx + side * 4.4, wy, wz - 1.6);
      bastion.lookAt(wx, wy, wz);
      streetGroup.add(bastion);
      return;
    }

    if (bCfg.biome === 'maritime_sea') {
      const seaProp = this.propBuilder.createMaritimeCoastalMonument(
        pal,
        pData.n,
        slug === 'out-of-the-deep' && pData.n % 3 === 0
      );
      seaProp.scale.setScalar(0.68);
      seaProp.position.set(wx + side * 4.2, wy - 0.1, wz - 1.4);
      seaProp.lookAt(wx, wy, wz);
      streetGroup.add(seaProp);
      return;
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
      ruth: 'DISTRICT VI · WHERE YOU GO — RUTH',
      samuel: 'DISTRICT VII · THE LAMP HAD NOT GONE OUT — 1–2 SAMUEL',
      kings: 'DISTRICT VIII · A STILL SMALL VOICE — 1 & 2 KINGS',
      'psalms-1': 'DISTRICT XIII · PLANTED BY THE WATER — PSALMS 1–41',
      'psalms-2': 'DISTRICT XIV · AS THE DEER — PSALMS 42–72',
      'psalms-3': 'DISTRICT XV · A DAY IN YOUR COURTS — PSALMS 73–106',
      'psalms-4': 'DISTRICT XVI · EVERYTHING THAT HAS BREATH — PSALMS 107–150',
      'out-of-the-whirlwind': 'DISTRICT XII · OUT OF THE WHIRLWIND — JOB',
      'arise-shine': 'DISTRICT XX · ARISE, SHINE — ISAIAH',
      'a-future-and-a-hope': 'DISTRICT XXI · A FUTURE AND A HOPE — JEREMIAH',
      'new-every-morning': 'DISTRICT XXII · NEW EVERY MORNING — LAMENTATIONS',
      'a-door-of-hope': 'DISTRICT XXV · A DOOR OF HOPE — HOSEA, JOEL, AMOS & OBADIAH',
      'can-these-bones-live': 'DISTRICT XXIII · CAN THESE BONES LIVE — EZEKIEL',
      'greatly-beloved': 'DISTRICT XXIV · GREATLY BELOVED — DANIEL',
      'out-of-the-deep': 'DISTRICT XXVI · OUT OF THE DEEP — JONAH',
      'the-day-of-small-things': 'DISTRICT XXVII · THE DAY OF SMALL THINGS — MICAH TO MALACHI',
      'good-news-of-great-joy': 'DISTRICT XXVIII · GOOD NEWS OF GREAT JOY — LUKE',
      'i-am-with-you-always': 'DISTRICT XXIX · I AM WITH YOU ALWAYS — MATTHEW',
      'peace-be-still': 'DISTRICT XXX · PEACE, BE STILL — MARK',
      'come-and-see': 'DISTRICT XXXI · COME AND SEE — JOHN',
      'to-the-ends-of-the-earth': 'DISTRICT XXXII · TO THE ENDS OF THE EARTH — ACTS',
      'nothing-can-separate': 'DISTRICT XXXIII · NOTHING CAN SEPARATE — ROMANS',
      'treasure-in-clay-jars': 'DISTRICT XXXIV · TREASURE IN CLAY JARS — 1 & 2 CORINTHIANS',
      'rooted-and-free': 'DISTRICT XXXV · ROOTED AND FREE — GALATIANS & EPHESIANS',
      'joy-in-chains': 'DISTRICT XXXVI · JOY IN CHAINS — PHILIPPIANS',
      'held-together': 'DISTRICT XXXVII · HELD TOGETHER — COLOSSIANS & PHILEMON',
      'children-of-the-day': 'DISTRICT XXXVIII · CHILDREN OF THE DAY — 1 & 2 THESSALONIANS',
      'grace-mercy-and-peace': 'DISTRICT XXXIX · GRACE, MERCY, AND PEACE — 1 & 2 TIMOTHY & TITUS',
      'anchor-of-the-soul': 'DISTRICT XL · ANCHOR OF THE SOUL — HEBREWS',
      'doers-of-the-word': 'DISTRICT XLI · DOERS OF THE WORD — JAMES',
      'our-eyes-are-on-you': 'DISTRICT IX · OUR EYES ARE ON YOU — 1 & 2 CHRONICLES',
      'rise-up-and-build': 'DISTRICT X · RISE UP AND BUILD — EZRA & NEHEMIAH',
      'for-such-a-time-as-this': 'DISTRICT XI · FOR SUCH A TIME AS THIS — ESTHER',
      'the-beginning-of-wisdom': 'DISTRICT XVII · THE BEGINNING OF WISDOM — PROVERBS',
      'eternity-in-their-hearts': 'DISTRICT XVIII · ETERNITY IN THEIR HEARTS — ECCLESIASTES',
      'many-waters': 'DISTRICT XIX · MANY WATERS — SONG OF SONGS',
      'all-things-new': 'DISTRICT XLIV · ALL THINGS NEW — REVELATION'
    };

    const gatePt = this.getPathPoint(6);
    const shortSub = (manifest.subtitle || '').replace(/\s*in Poems & Pictures/i, '');
    const dynamicGateTitle = `DISTRICT #${manifest.district || ''} · ${manifest.title.toUpperCase()}${shortSub ? ' — ' + shortSub.toUpperCase() : ''}`;
    const gateArch = this.createPartBannerArch({
      index: 0,
      title: titlesBySlug[slug] || dynamicGateTitle,
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

  createPartsLightsAndVeils(streetGroup, manifest, paintingNodes = []) {
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
      ],
      samuel: [
        {
          part: 1,
          id: 'samuel-light-1',
          name: 'The Light of the Tabernacle Lamp',
          hint: 'Beside the clay lamp that had not yet gone out near “speak” & “stone of help” (Part One)',
          z: -62.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -86.0
        },
        {
          part: 2,
          id: 'samuel-light-2',
          name: 'The Light of the Stone of Help',
          hint: 'Near “among the baggage” & “Samuel mourned” (Part Two)',
          z: -136.0,
          lateral: -6.2,
          height: 1.55,
          veilZ: -154.0
        },
        {
          part: 3,
          id: 'samuel-light-3',
          name: 'The Light of the Elah Brook',
          hint: 'Where five smooth stones glisten near “the youngest” & “five smooth stones” (Part Three)',
          z: -222.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -258.0
        },
        {
          part: 4,
          id: 'samuel-light-4',
          name: 'The Light of the King’s Table',
          hint: 'Beside the place kept continually near “who am I” & “at the king’s table” (Part Four)',
          z: -312.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -335.0
        },
        {
          part: 5,
          id: 'samuel-light-5',
          name: 'The Light of the Threshing Floor Altar',
          hint: 'Glowing near “my lamp” & “nothing” before the Amen Gate (Part Five)',
          z: -398.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -426.0
        }
      ],
      kings: [
        {
          part: 1,
          id: 'kings-light-1',
          name: 'The Light of the Cedar Sanctuary',
          hint: 'Where the cloud of glory fills the house near “the cloud” & “how much less this house” (Part One)',
          z: -62.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -86.0
        },
        {
          part: 2,
          id: 'kings-light-2',
          name: 'The Light of the Unextinguished Lamp',
          hint: 'Beside the torn cloak near “twelve pieces” & “the hand restored” (Part Two)',
          z: -126.0,
          lateral: -6.2,
          height: 1.55,
          veilZ: -144.0
        },
        {
          part: 3,
          id: 'kings-light-3',
          name: 'The Light of Mount Horeb’s Cave',
          hint: 'Near “fire on Carmel” & “a still small voice” (Part Three)',
          z: -218.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -248.0
        },
        {
          part: 4,
          id: 'kings-light-4',
          name: 'The Light of the Hills of Dothan',
          hint: 'Along the ridge blazing with chariots of fire near “more with us” (Part Four)',
          z: -324.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -354.0
        },
        {
          part: 5,
          id: 'kings-light-5',
          name: 'The Light of the Exiled Table',
          hint: 'Glowing near “a tender heart” & “bread all his days” before the Amen Gate (Part Five)',
          z: -398.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -426.0
        }
      ],
      'all-things-new': [
        {
          part: 1,
          id: 'all-things-new-light-1',
          name: 'The Light of the Seven Lampstands',
          hint: 'Shining beside the white stone & knocking door near “a white stone” & “knocking” (Part One)',
          z: -62.0,
          lateral: 6.2,
          height: 1.78,
          veilZ: -82.0
        },
        {
          part: 2,
          id: 'all-things-new-light-2',
          name: 'The Light of the Emerald Throne',
          hint: 'Glowing beside the golden bowls of incense near “the Lion is a Lamb” & “golden bowls” (Part Two)',
          z: -136.0,
          lateral: -6.2,
          height: 1.65,
          veilZ: -158.0
        },
        {
          part: 3,
          id: 'all-things-new-light-3',
          name: 'The Light of the Golden Censer',
          hint: 'Resting in the stillness near “half an hour” & “what goes up” (Part Three)',
          z: -214.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -234.0
        },
        {
          part: 4,
          id: 'all-things-new-light-4',
          name: 'The Light of the Wedding Supper',
          hint: 'Shimmering by the sea of glass & wedding table near “hallelujah” & “the wedding” (Part Four)',
          z: -302.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -320.0
        },
        {
          part: 5,
          id: 'all-things-new-light-5',
          name: 'The Light of the River of Life',
          hint: 'Glowing beneath the Tree of Life near “leaves for healing” & “come, Lord Jesus” before the Amen Gate (Part Five)',
          z: -404.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -428.0
        }
      ],
      'psalms-1': [
        {
          part: 1,
          id: 'psalms-1-light-1',
          name: 'The Light of the Streams of Water',
          hint: 'Shimmering beside the stream bank & roots near “watch” & “the work of your fingers” (Part One)',
          z: -62.0,
          lateral: -6.2,
          height: 1.72,
          veilZ: -82.0
        },
        {
          part: 2,
          id: 'psalms-1-light-2',
          name: 'The Light of the Refiner’s Furnace',
          hint: 'Glowing beside the clay refining furnace near “seven times” & “how long?” (Part Two)',
          z: -136.0,
          lateral: 6.2,
          height: 1.68,
          veilZ: -168.0
        },
        {
          part: 3,
          id: 'psalms-1-light-3',
          name: 'The Light of the Shepherd’s Lamp',
          hint: 'Shining beside the shepherd’s staff and table near “my lamp” & “through the valley” (Part Three)',
          z: -224.0,
          lateral: -6.0,
          height: 1.75,
          veilZ: -254.0
        },
        {
          part: 4,
          id: 'psalms-1-light-4',
          name: 'The Light of the Open Threshold',
          hint: 'Glowing between the open doorway & the ten-string lyre near “one thing” & “a new song” (Part Four)',
          z: -312.0,
          lateral: 6.0,
          height: 1.68,
          veilZ: -340.0
        },
        {
          part: 5,
          id: 'psalms-1-light-5',
          name: 'The Light of the Spring of Life',
          hint: 'Shining by the mended vessel & spring of life near “in your light” & “amen and amen” before the Amen Gate (Part Five)',
          z: -404.0,
          lateral: -5.8,
          height: 1.75,
          veilZ: -426.0
        }
      ],
      'psalms-2': [
        {
          part: 1,
          id: 'psalms-2-light-1',
          name: 'The Light of the Water Brook',
          hint: 'Shimmering beside the deer & broken bow on the shore near “two lamps” & “be still” (Part One)',
          z: -52.0,
          lateral: -6.2,
          height: 1.72,
          veilZ: -82.0
        },
        {
          part: 2,
          id: 'psalms-2-light-2',
          name: 'The Light of the Tear-Bottle',
          hint: 'Glowing beside the sunlit window sill & terracotta bottle near “your bottle” & “I will wake the dawn” (Part Two)',
          z: -146.0,
          lateral: 6.2,
          height: 1.68,
          veilZ: -168.0
        },
        {
          part: 3,
          id: 'psalms-2-light-3',
          name: 'The Light of the High Rock',
          hint: 'Shining along the winding trail of the mesa near “higher than I” & “harvest hymn” (Part Three)',
          z: -218.0,
          lateral: -6.0,
          height: 1.75,
          veilZ: -254.0
        },
        {
          part: 4,
          id: 'psalms-2-light-4',
          name: 'The Light of the Rain on Mown Grass',
          hint: 'Glowing among the golden sheaves & Book Two scrolls near “old and gray” & “like rain” before the Amen Gate (Part Four)',
          z: -312.0,
          lateral: 5.8,
          height: 1.72,
          veilZ: -332.0
        }
      ],
      'psalms-3': [
        {
          part: 1,
          id: 'psalms-3-light-1',
          name: 'The Light of the Sanctuary Threshold',
          hint: 'Shining beside the open golden sanctuary doorway near “no footprints” & “turn us again” (Part One)',
          z: -62.0,
          lateral: 6.2,
          height: 1.75,
          veilZ: -82.0
        },
        {
          part: 2,
          id: 'psalms-3-light-2',
          name: 'The Light of the Sparrow’s Altar',
          hint: 'Glowing beside the sparrow’s nest & altar lamp near “the sparrow’s nest” & “the first line and the last” (Part Two)',
          z: -146.0,
          lateral: -6.2,
          height: 1.68,
          veilZ: -178.0
        },
        {
          part: 3,
          id: 'psalms-3-light-3',
          name: 'The Light of the Shadow of His Wings',
          hint: 'Resting beneath the gold-tipped wing & crag near “under his feathers” & “the trees sing” (Part Three)',
          z: -232.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -263.5
        },
        {
          part: 4,
          id: 'psalms-3-light-4',
          name: 'The Light of the Courts of Praise',
          hint: 'Shining by the sunlit terrace & shofar altar near “east from west” & “amen” before the Amen Gate (Part Four)',
          z: -332.0,
          lateral: -5.8,
          height: 1.72,
          veilZ: -360.0
        }
      ],
      'psalms-4': [
        {
          part: 1,
          id: 'psalms-4-light-1',
          name: 'The Light of the Desired Haven & the Cornerstone',
          hint: 'Shining beside the harbor ship & stone terrace near “because he listened” & “the cornerstone” (Part One)',
          z: -108.0,
          lateral: 6.2,
          height: 1.75,
          veilZ: -129.6
        },
        {
          part: 2,
          id: 'psalms-4-light-2',
          name: 'The Light of the Lamp to My Feet & the Golden Sheaves',
          hint: 'Glowing beside the path lamp & golden harvest sheaves near “surrounded” & “sow in tears” (Part Two)',
          z: -198.0,
          lateral: -6.2,
          height: 1.68,
          veilZ: -225.3
        },
        {
          part: 3,
          id: 'psalms-4-light-3',
          name: 'The Light of the Watchman for the Morning',
          hint: 'Resting beside the steps of ascent near “the night shift” & “forever” (Part Three)',
          z: -298.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -321.0
        },
        {
          part: 4,
          id: 'psalms-4-light-4',
          name: 'The Light of Evening Incense & Morning Mercy',
          hint: 'Shining beside the incense bowl & loom near “in the morning” & “a breath” (Part Four)',
          z: -386.0,
          lateral: -6.0,
          height: 1.72,
          veilZ: -406.9
        },
        {
          part: 5,
          id: 'psalms-4-light-5',
          name: 'The Light of Everything That Has Breath',
          hint: 'Shining beside the ten-string harp, timbrel & cymbals near “needs your feet” & “if you’re breathing” before the Amen Gate (Part Five)',
          z: -454.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -466.4
        }
      ],
      'greatly-beloved': [
        {
          part: 1,
          id: 'greatly-beloved-light-1',
          name: 'The Light of the Ten-Day Table & the Night Lamp',
          hint: 'Shining beside the table of vegetables & the four around a lamp near “the light lives with him” & “not me” (Part One)',
          z: -68.0,
          lateral: 6.2,
          height: 1.75,
          veilZ: -90.4
        },
        {
          part: 2,
          id: 'greatly-beloved-light-2',
          name: 'The Light of the Fourth in the Fire',
          hint: 'Glowing beside the blazing Babylonian furnace near “a fourth in the fire” & “not even the smell” (Part Two)',
          z: -148.0,
          lateral: -6.2,
          height: 1.72,
          veilZ: -186.1
        },
        {
          part: 3,
          id: 'greatly-beloved-light-3',
          name: 'The Light of the Open Window & the Lions’ Den',
          hint: 'Resting between the open window toward Jerusalem & the lions’ den near “windows open toward Jerusalem” & “the lions’ den” (Part Three)',
          z: -258.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -281.8
        },
        {
          part: 4,
          id: 'greatly-beloved-light-4',
          name: 'The Light of the Evening Oblation',
          hint: 'Shining beside the scroll of seventy years near “Lord, hear” & “the evening hour” (Part Four)',
          z: -348.0,
          lateral: -6.0,
          height: 1.72,
          veilZ: -367.7
        },
        {
          part: 5,
          id: 'greatly-beloved-light-5',
          name: 'The Light of those Who Shine Like the Stars',
          hint: 'Shining beside the sealed scroll on the river stone near “like the stars” & “go your way” before the Amen Gate (Part Five)',
          z: -414.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -427.2
        }
      ],
      'new-every-morning': [
        {
          part: 1,
          id: 'new-every-morning-light-1',
          name: 'The Light of the Solitary Well & Empty Street',
          hint: 'Shining beside the well-rope & open hands near “how” & “open hands” (Part One)',
          z: -39.5,
          lateral: -6.0,
          height: 1.72,
          veilZ: -52.5
        },
        {
          part: 2,
          id: 'new-every-morning-light-2',
          name: 'The Light of the Night Watch & Poured-Out Jar',
          hint: 'Glowing beside the overturned water jar at the beginning of the watches near “pour out your heart” (Part Two)',
          z: -96.0,
          lateral: 6.0,
          height: 1.70,
          veilZ: -109.0
        },
        {
          part: 3,
          id: 'new-every-morning-light-3',
          name: 'The Light of Mercies New Every Morning',
          hint: 'Rising over the dew-wet stones at the heart of the book near “new every morning” & “wait quietly” (Part Three)',
          z: -162.0,
          lateral: 6.2,
          height: 1.75,
          veilZ: -214.5
        },
        {
          part: 4,
          id: 'new-every-morning-light-4',
          name: 'The Light of the Earthenware Pitchers & Watchtower',
          hint: 'Glowing beside the scattered sanctuary stones & clay jars near “clay jars” & “the watchtower” (Part Four)',
          z: -258.0,
          lateral: -6.0,
          height: 1.70,
          veilZ: -271.0
        },
        {
          part: 5,
          id: 'new-every-morning-light-5',
          name: 'The Light of Dawn Over the Broken Walls',
          hint: 'Shining beside the lyre in the ruins near “the lyre” & “renew our days” before the Amen Gate (Part Five)',
          z: -315.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -327.6
        }
      ],
      'a-door-of-hope': [
        {
          part: 1,
          id: 'a-door-of-hope-light-1',
          name: 'The Light of the Door of Hope in the Valley of Achor',
          hint: 'Shining beside the cleft rock pass & sunlit vine near “a door of hope” & “go again” (Part One)',
          z: -62.0,
          lateral: -6.0,
          height: 1.72,
          veilZ: -81.8
        },
        {
          part: 2,
          id: 'a-door-of-hope-light-2',
          name: 'The Light of Cords of Love & Morning Dew',
          hint: 'Glowing beside the dew-covered lily & olive tree near “learning to walk” & “like the dew” (Part Two)',
          z: -148.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -167.8
        },
        {
          part: 3,
          id: 'a-door-of-hope-light-3',
          name: 'The Light of the Years Restored',
          hint: 'Shining beside the overflowing harvest basket of figs, grapes & grain near “the years the locust ate” (Part Three)',
          z: -242.0,
          lateral: -6.0,
          height: 1.75,
          veilZ: -263.5
        },
        {
          part: 4,
          id: 'a-door-of-hope-light-4',
          name: 'The Light of the Plumb Line & Justice Like Rivers',
          hint: 'Glowing beside the builder’s plumb line & raised tent near “the plumb line” & “the fallen tent” (Part Four)',
          z: -346.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -378.8
        },
        {
          part: 5,
          id: 'a-door-of-hope-light-5',
          name: 'The Light of Mount Zion & the Kingdom of Yahweh',
          hint: 'Shining above the threshold stone & olive hill near “the clefts of the rock” & “the kingdom” before the Amen Gate (Part Five)',
          z: -414.0,
          lateral: -5.8,
          height: 1.75,
          veilZ: -426.0
        }
      ],
      'the-day-of-small-things': [
        {
          part: 1,
          id: 'the-day-of-small-things-light-1',
          name: 'The Light of the Fig Tree & Humble Walk',
          hint: 'Shining beside the wooden stool & water pitcher under the fig tree near “under the fig tree” & “do justly” (Part One)',
          z: -54.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -72.0
        },
        {
          part: 2,
          id: 'the-day-of-small-things-light-2',
          name: 'The Light of the Watchtower & Quiet Joy',
          hint: 'Glowing beside the watchman’s rampart & barren fig tree near “the watchtower” & “though the fig tree” (Part Two)',
          z: -146.0,
          lateral: -6.0,
          height: 1.72,
          veilZ: -167.8
        },
        {
          part: 3,
          id: 'the-day-of-small-things-light-3',
          name: 'The Light of the Foundation Stone & From Today',
          hint: 'Shining beside the newly laid temple stone near “he will rejoice over you with singing” & “from today” (Part Three)',
          z: -232.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -253.6
        },
        {
          part: 4,
          id: 'the-day-of-small-things-light-4',
          name: 'The Light of the Golden Lampstand & Plumb Line',
          hint: 'Glowing beside the seven-branched golden lampstand, two olive trees & plumb line near “seven lamps” & “the day of small things” (Part Four)',
          z: -318.0,
          lateral: -6.0,
          height: 1.75,
          veilZ: -359.1
        },
        {
          part: 5,
          id: 'the-day-of-small-things-light-5',
          name: 'The Light of the Book of Remembrance & Rising Sun',
          hint: 'Shining beside the open scroll of memory & two clay cups near “a book of memory” & “turn the hearts” before the Amen Gate (Part Five)',
          z: -414.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -426.0
        }
      ],
      'nothing-can-separate': [
        {
          part: 1,
          id: 'nothing-can-separate-light-1',
          name: 'The Light of Free Grace & Abraham’s Stars',
          hint: 'Shining beside the unsealed pardon & starry sky near “freely” & “counted” (Part One)',
          z: -62.0,
          lateral: -6.0,
          height: 1.72,
          veilZ: -81.8
        },
        {
          part: 2,
          id: 'nothing-can-separate-light-2',
          name: 'The Light of the Open Door of Grace',
          hint: 'Glowing beside the open wooden door & sunlit courtyard fountain near “where we stand” & “the open lock” (Part Two)',
          z: -156.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -177.5
        },
        {
          part: 3,
          id: 'nothing-can-separate-light-3',
          name: 'The Light of Abba’s Threshold & Unseparable Love',
          hint: 'Shining between the child’s & father’s sandals and the starlit parapet table near “Abba” & “nothing” (Part Three)',
          z: -242.0,
          lateral: -6.0,
          height: 1.75,
          veilZ: -263.5
        },
        {
          part: 4,
          id: 'nothing-can-separate-light-4',
          name: 'The Light of the Grafted Olive Branch',
          hint: 'Glowing beside the wild olive shoot bound into the ancient trunk near “the olive tree” & “the depth” (Part Four)',
          z: -318.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -329.8
        },
        {
          part: 5,
          id: 'nothing-can-separate-light-5',
          name: 'The Light of the Welcoming Table & God of Hope',
          hint: 'Shining beside the open fellowship table & overflowing jar near “welcome” & “greet them all” before the Amen Gate (Part Five)',
          z: -414.0,
          lateral: -5.8,
          height: 1.75,
          veilZ: -426.0
        }
      ],
      'treasure-in-clay-jars': [
        {
          part: 1,
          id: 'treasure-in-clay-jars-light-1',
          name: 'The Light of the True Foundation & Tentmaker’s Lamp',
          hint: 'Shining beside the laid foundation stone & night needle lamp near “the foundation” & “with our own hands” (Part One)',
          z: -54.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -72.0
        },
        {
          part: 2,
          id: 'treasure-in-clay-jars-light-2',
          name: 'The Light of the New Loaf & Way of Escape',
          hint: 'Glowing beside the unleavened loaf & open alley gate near “the new loaf” & “the way out” (Part Two)',
          z: -126.0,
          lateral: -6.0,
          height: 1.72,
          veilZ: -148.0
        },
        {
          part: 3,
          id: 'treasure-in-clay-jars-light-3',
          name: 'The Light of the Broken Loaf & Bronze Mirror',
          hint: 'Shining between the low communion table & polished bronze mirror near “wait for one another” & “dimly” (Part Three)',
          z: -214.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -234.0
        },
        {
          part: 4,
          id: 'treasure-in-clay-jars-light-4',
          name: 'The Light of the Treasure in Clay Jars',
          hint: 'Glowing through the golden seam of the cracked clay vessel near “out of darkness” & “clay jars” (Part Four)',
          z: -312.0,
          lateral: -6.0,
          height: 1.75,
          veilZ: -329.8
        },
        {
          part: 5,
          id: 'treasure-in-clay-jars-light-5',
          name: 'The Light of Sufficient Grace in Weakness',
          hint: 'Shining beside the open clay jar resting in window sunlight near “the thorn” & “when I am weak” before the Amen Gate (Part Five)',
          z: -414.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -426.0
        }
      ],
      'rooted-and-free': [
        {
          part: 1,
          id: 'rooted-and-free-light-1',
          name: 'The Light of Christ Living in Me',
          hint: 'Shining beside the table at Antioch & baptismal garment near “who loved me” & “all one” (Part One)',
          z: -80.0,
          lateral: -6.0,
          height: 1.72,
          veilZ: -102.0
        },
        {
          part: 2,
          id: 'rooted-and-free-light-2',
          name: 'The Light of the Fruit of the Spirit & Shared Burden',
          hint: 'Glowing beside the harvest bowl of figs, grapes & pomegranate near “the fruit” & “large letters” (Part Two)',
          z: -182.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -207.2
        },
        {
          part: 3,
          id: 'rooted-and-free-light-3',
          name: 'The Light of the Broken Dividing Wall of Peace',
          hint: 'Shining beside the open gap in the stone wall & worn homeward path near “the wall” & “no longer strangers” (Part Three)',
          z: -280.0,
          lateral: -6.0,
          height: 1.75,
          veilZ: -293.2
        },
        {
          part: 4,
          id: 'rooted-and-free-light-4',
          name: 'The Light of Love Rooted & Grounded',
          hint: 'Glowing beneath the deep-rooted olive tree on the sunlit ridge near “rooted” & “before sundown” (Part Four)',
          z: -336.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -359.5
        },
        {
          part: 5,
          id: 'rooted-and-free-light-5',
          name: 'The Light of the Whole Armor of God',
          hint: 'Shining beside the timber table set with breastplate, shield, helmet & sword near “the armor on the table” & “to stand” before the Amen Gate (Part Five)',
          z: -414.0,
          lateral: -5.8,
          height: 1.75,
          veilZ: -426.0
        }
      ],
      'joy-in-chains': [
        {
          part: 1,
          id: 'joy-in-chains-light-1',
          name: 'The Light of the Palace Guard & Unhindered Gospel',
          hint: 'Shining beside the Praetorian helmet, crimson cloak & letter scroll near “the palace guard” & “two doors” (Part One)',
          z: -44.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -62.5
        },
        {
          part: 2,
          id: 'joy-in-chains-light-2',
          name: 'The Light of the Servant’s Basin & Window Lamp',
          hint: 'Glowing beside the foot-washing basin, folded towel & open shackles near “the way down” & “one window” (Part Two)',
          z: -108.0,
          lateral: -6.0,
          height: 1.72,
          veilZ: -128.8
        },
        {
          part: 3,
          id: 'joy-in-chains-light-3',
          name: 'The Light of the Upward Call & Finish-Line Wreath',
          hint: 'Shining along the stadium track toward the olive victory wreath near “one thing” & “citizens” (Part Three)',
          z: -182.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -195.2
        },
        {
          part: 4,
          id: 'joy-in-chains-light-4',
          name: 'The Light of Peace Standing Sentry',
          hint: 'Glowing from the night watch-lantern at the arched city gate near “the sentry” & “fragrance” before the Amen Gate (Part Four)',
          z: -242.0,
          lateral: -5.8,
          height: 1.75,
          veilZ: -261.5
        }
      ],
      'held-together': [
        {
          part: 1,
          id: 'held-together-light-1',
          name: 'The Light of the Keystone Holding All Things',
          hint: 'Shining beside the Roman stone arch & rose-terracotta keystone near “held together” & “the hope of glory” (Part One)',
          z: -68.0,
          lateral: -6.0,
          height: 1.72,
          veilZ: -92.0
        },
        {
          part: 2,
          id: 'held-together-light-2',
          name: 'The Light of the Wax Tablet Wiped Clean',
          hint: 'Glowing beside the smoothed golden-amber wax tablet & bronze stylus near “wiped clean” & “hidden” (Part Two)',
          z: -132.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -148.5
        },
        {
          part: 3,
          id: 'held-together-light-3',
          name: 'The Light of Psalms, Hymns & Spiritual Songs',
          hint: 'Shining in the twilight courtyard beside the seven-string lyre & oil lamp near “dwell richly” & “one of you” (Part Three)',
          z: -214.0,
          lateral: -6.0,
          height: 1.75,
          veilZ: -234.4
        },
        {
          part: 4,
          id: 'held-together-light-4',
          name: 'The Light of the Prepared Guest Room & Beloved Brother',
          hint: 'Glowing beside Philemon’s prepared guest bed, open letter & oil lamp near “put that to my account” & “the guest room” before the Amen Gate (Part Four)',
          z: -328.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -340.0
        }
      ],
      'children-of-the-day': [
        {
          part: 1,
          id: 'children-of-the-day-light-1',
          name: 'The Light of the Empty Idol Niche & Warm Lamp',
          hint: 'Shining beside the handled clay cup-lamp & swaddling cloths near “turned” & “like a nursing mother” (Part One)',
          z: -74.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -91.8
        },
        {
          part: 2,
          id: 'children-of-the-day-light-2',
          name: 'The Light of the Tentmaker’s Night-Lamp',
          hint: 'Glowing beside the tentmaker’s timber workbench, needle & coarse cloth near “night and day” & “with your own hands” (Part Two)',
          z: -150.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -167.9
        },
        {
          part: 3,
          id: 'children-of-the-day-light-3',
          name: 'The Light of the Dawn Windowsill & Helmet of Hope',
          hint: 'Shining on the stone windowsill overlooking the breaking dawn near “a thief in the night” & “breastplate and helmet” (Part Three)',
          z: -234.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -253.8
        },
        {
          part: 4,
          id: 'children-of-the-day-light-4',
          name: 'The Light of the Banked Hearth & Steadfast Hope',
          hint: 'Glowing beside the banked night-hearth & olive sapling in rocky ground near “growing” & “good hope” (Part Four)',
          z: -302.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -320.1
        },
        {
          part: 5,
          id: 'children-of-the-day-light-5',
          name: 'The Light of the Quiet Work-Table & Daily Loaf',
          hint: 'Glowing beside the workman’s crusty round loaf, olive oil bowl & leather gloves near “your own bread” & “in my own hand” before the Amen Gate (Part Five)',
          z: -368.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -386.4
        }
      ],
      'grace-mercy-and-peace': [
        {
          part: 1,
          id: 'grace-mercy-and-peace-light-1',
          name: 'The Light of the Courtyard Pillar of Truth',
          hint: 'Shining beside the sunlit limestone pillar & shared loaf table near “my true child” & “a pillar” (Part One)',
          z: -64.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -82.0
        },
        {
          part: 2,
          id: 'grace-mercy-and-peace-light-2',
          name: 'The Light of the Widow’s Night-Lamp & Contentment',
          hint: 'Glowing beside the widow’s windowsill lamp & prayer stool near “night and day” & “guard it” (Part Two)',
          z: -150.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -167.9
        },
        {
          part: 3,
          id: 'grace-mercy-and-peace-light-3',
          name: 'The Light of Lois & Eunice’s Unfeigned Faith',
          hint: 'Shining beside the family table lamp, scroll & banked embers near “Lois and Eunice” & “stir it up” (Part Three)',
          z: -234.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -253.8
        },
        {
          part: 4,
          id: 'grace-mercy-and-peace-light-4',
          name: 'The Light of the Finish-Line Crown & Troas Cloak',
          hint: 'Glowing beside the stadium laurel wreath, warm Troas cloak & parchments near “fought, finished, kept” & “the cloak and the parchments” (Part Four)',
          z: -302.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -320.1
        },
        {
          part: 5,
          id: 'grace-mercy-and-peace-light-5',
          name: 'The Light of Grace Appeared & Poured Out Richly',
          hint: 'Shining beside the overflowing water jar & Crete harbor road near “grace has appeared” & “poured out richly” before the Amen Gate (Part Five)',
          z: -406.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -425.6
        }
      ],
      'doers-of-the-word': [
        {
          part: 1,
          id: 'doers-of-the-word-light-1',
          name: 'The Light of the Polished Mirror & Water Basin',
          hint: 'Shining beside the bronze hand-mirror, water basin & open doorway near “every good gift” & “the mirror” (Part One)',
          z: -48.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -62.4
        },
        {
          part: 2,
          id: 'doers-of-the-word-light-2',
          name: 'The Light of Mercy & the Royal Law',
          hint: 'Glowing beside the open doorstep loaf & warm cloak near “mercy triumphs” & “be warmed and filled” (Part Two)',
          z: -112.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -128.7
        },
        {
          part: 3,
          id: 'doers-of-the-word-light-3',
          name: 'The Light of the Small Rudder & Fresh Spring',
          hint: 'Shining beside the harbor boat rudder & clear limestone spring near “small things steer” & “sown in peace” (Part Three)',
          z: -178.0,
          lateral: 6.0,
          height: 1.75,
          veilZ: -195.0
        },
        {
          part: 4,
          id: 'doers-of-the-word-light-4',
          name: 'The Light of Clean Hands & Morning Mist',
          hint: 'Glowing beside the clay water pitcher & stone washbasin near “come close” & “a mist that appears” (Part Four)',
          z: -244.0,
          lateral: -6.0,
          height: 1.65,
          veilZ: -261.3
        },
        {
          part: 5,
          id: 'doers-of-the-word-light-5',
          name: 'The Light of Early & Late Rain',
          hint: 'Shining beside the farmer’s staff & sprouting barley furrows near “the farmer” & “bring them back” before the Amen Gate (Part Five)',
          z: -310.0,
          lateral: 5.8,
          height: 1.75,
          veilZ: -327.6
        }
      ]
    };

    const customLightMetaBySlug = {
      'arise-shine': [
        {
          name: 'The Light of the Seraph’s Live Coal',
          hint: 'Glowing beside the smoking altar & live coal in the tongs near “undone” & “the wolf and the lamb” (Part One)'
        },
        {
          name: 'The Light of the Desert Rose & Watchman’s Wall',
          hint: 'Shining beside the blossoming desert & watchtower near “the feast on the mountain” & “blossom in the desert” (Part Two)'
        },
        {
          name: 'The Light of Comfort & Eagle’s Wings',
          hint: 'Resting beside the high mountain crag & rising eagle near “comfort” & “wings like eagles” (Part Three)'
        },
        {
          name: 'The Light of the Suffering Servant',
          hint: 'Glowing beside the tender shoot out of dry ground near “can a mother forget?” & “no beauty” (Part Four)'
        },
        {
          name: 'The Light of New Heavens & New Earth',
          hint: 'Shining before the open radiant gates of Zion near “arise, shine” & “new heavens and a new earth” before the Amen Gate (Part Five)'
        }
      ],
      'good-news-of-great-joy': [
        {
          name: 'The Light of the Bethlehem Manger',
          hint: 'Shining beside the limestone feeding trough & shepherds’ lantern near “no room” & “the sign” (Part One)'
        },
        {
          name: 'The Light of the Open Scroll & Bursting Nets',
          hint: 'Glowing beside the synagogue scroll & Galilee shore near “the scroll” & “don’t be afraid” (Part Two)'
        },
        {
          name: 'The Light of the Good Samaritan’s Inn',
          hint: 'Resting beside the Jericho road inn threshold, oil flask & two silver coins near “two denarii” & “one thing” (Part Three)'
        },
        {
          name: 'The Light of the Father’s Road Home',
          hint: 'Shining beside the open courtyard gate, best robe, ring & sandals near “a long way off” & “up in a tree” (Part Four)'
        },
        {
          name: 'The Light of the Emmaus Table & Burning Hearts',
          hint: 'Glowing beside the broken loaf & warm oil lamp near “why do you look here?” & “he broke the bread” before the Amen Gate (Part Five)'
        }
      ],
      'i-am-with-you-always': [
        {
          name: 'The Light of the Star Over the House',
          hint: 'Shining beside the gold, frankincense & myrrh caskets under the Bethlehem star near “the star” & “by night” (Part One)'
        },
        {
          name: 'The Light of the Lamp on the Stand',
          hint: 'Glowing on the Galilean hillside beside the tall wooden lampstand near “a lamp on a stand” & “consider the lilies” (Part Two)'
        },
        {
          name: 'The Light of the Easy Yoke & Rest',
          hint: 'Resting beside the carpenter’s smooth wooden yoke near “two sparrows” & “my yoke is easy” (Part Three)'
        },
        {
          name: 'The Light of the Hand on the Waves',
          hint: 'Shining above the dark Galilee swells near “Immediately Jesus stretched out his hand” & “on this rock” (Part Four)'
        },
        {
          name: 'The Light of the Rolled-Away Stone & Always',
          hint: 'Glowing beside the empty garden tomb & folded linen near “he is not here” & “always” before the Amen Gate (Part Five)'
        }
      ],
      'peace-be-still': [
        {
          name: 'The Light of the Dropped Nets & Open Roof',
          hint: 'Shining along the Capernaum shore near “immediately they left their nets” & “through the roof” (Part One)'
        },
        {
          name: 'The Light of the Cushion in the Stern',
          hint: 'Glowing beside the Galilee fishing boat & green grass baskets near “the cushion” & “twelve baskets” (Part Two)'
        },
        {
          name: 'The Light of Bartimaeus’s Thrown-Off Cloak',
          hint: 'Resting beside the Jericho roadside stone & cast-aside cloak near “help my unbelief” & “he threw off his cloak” (Part Three)'
        },
        {
          name: 'The Light of the Broken Alabaster Jar & Empty Tomb',
          hint: 'Shining beside the fragrant nard & open garden tomb near “she broke the jar” & “and Peter” before the Amen Gate (Part Four)'
        }
      ],
      'come-and-see': [
        {
          name: 'The Light of the Six Stone Jars at Cana',
          hint: 'Shining beside the six limestone waterpots brimming with ruby wine near “come and see” & “the best for last” (Part One)'
        },
        {
          name: 'The Light of Jacob’s Well at Noon',
          hint: 'Glowing beside the forgotten clay water jar on the well curb near “the jar left behind” & “five barley loaves” (Part Two)'
        },
        {
          name: 'The Light of the Good Shepherd’s Gate',
          hint: 'Resting beside the sheepfold threshold & Bethany tomb near “I was blind, now I see” & “Lazarus, come out” (Part Three)'
        },
        {
          name: 'The Light of the Basin & the Linen Towel',
          hint: 'Shining in the Upper Room beside the bronze foot-washing basin near “twelve pairs” & “the vine and the branches” (Part Four)'
        },
        {
          name: 'The Light of the Charcoal Fire on the Beach',
          hint: 'Glowing beside the Sea of Galilee embers, fish & bread near “while it was still dark” & “a charcoal fire” before the Amen Gate (Part Five)'
        }
      ],
      'out-of-the-whirlwind': [
        {
          name: 'The Light of the Seven Silent Days',
          hint: 'Glowing beside the ash-heap potsherd & three silent stones near “the ash heap” & “seven days” (Part One)'
        },
        {
          name: 'The Light of the Scent of Water',
          hint: 'Shining beside the cut stump & fresh green shoot near “at the scent of water” (Part Two)'
        },
        {
          name: 'The Light of the Words Cut in Rock',
          hint: 'Resting beside the iron stylus & gold-inlaid cliff inscription near “cut in rock” & “my Redeemer lives” (Part Three)'
        },
        {
          name: 'The Light of the Whirlwind & Orion’s Cords',
          hint: 'Shining beneath the Pleiades & whirlwind column near “God speaks” & “my eyes have seen you” before the Amen Gate (Part Four)'
        }
      ],
      'a-future-and-a-hope': [
        {
          name: 'The Light of the Watching Almond Branch',
          hint: 'Shining beside the early-blossoming almond bough near “the almond branch” (Part One)'
        },
        {
          name: 'The Light of the Weeping Prophet’s Lamp',
          hint: 'Glowing along the Jerusalem wall near “balm in Gilead” (Part Two)'
        },
        {
          name: 'The Light of the Potter’s Wheel & the Exile Letter',
          hint: 'Resting between the spinning clay vessel & the scroll of hope near “the potter’s house” & “a future and a hope” (Part Three)'
        },
        {
          name: 'The Light of the Anathoth Deed Jar',
          hint: 'Shining beside the earthenware jar of sealed deeds near “a field in Anathoth” (Part Four)'
        },
        {
          name: 'The Light of the Cistern Ropes & New Covenant',
          hint: 'Glowing near “rags and ropes” before the Amen Gate (Part Five)'
        }
      ],
      'can-these-bones-live': [
        {
          name: 'The Light of the Wheel Within a Wheel',
          hint: 'Shining beside the interlocked beryl wheels & rainbow arch near “wherever the spirit went” & “the bow in the cloud” (Part One)'
        },
        {
          name: 'The Light of the Departing & Returning Glory',
          hint: 'Glowing above the eastern threshold near “a little sanctuary” (Part Two)'
        },
        {
          name: 'The Light of the Watchman’s Wall',
          hint: 'Resting beside the breach in the wall near “someone to stand in the gap” (Part Three)'
        },
        {
          name: 'The Light of the New Heart of Flesh',
          hint: 'Shining beside the cleft stone altar & living heart near “a heart of flesh” (Part Four)'
        },
        {
          name: 'The Light of the Four Winds & the Healing River',
          hint: 'Glowing between the Valley of Dry Bones & the Temple River trees near “breath” & “leaves for healing” before the Amen Gate (Part Five)'
        }
      ],
      'out-of-the-deep': [
        {
          name: 'The Light of the Storm-Tossed Hold',
          hint: 'Glowing beside the Tarshish ship & stern lantern near “fast asleep” (Part One)'
        },
        {
          name: 'The Light of the Roots of the Mountains',
          hint: 'Shining beside the Great Fish in the deep near “prepared” & “at the bottom” (Part Two)'
        },
        {
          name: 'The Light of Nineveh’s Empty Throne',
          hint: 'Resting beside the laid-down crown & sackcloth near “the empty throne” (Part Three)'
        },
        {
          name: 'The Light of the Appointed Shade Vine',
          hint: 'Shining beneath the broad-leaved gourd vine on the east hill near “the vine” before the Amen Gate (Part Four)'
        }
      ],
      'to-the-ends-of-the-earth': [
        {
          name: 'The Light of the Pentecost Flame',
          hint: 'Blazing in the Upper Room beside the sculpted tongue of fire near “tongues like fire” (Part One)'
        },
        {
          name: 'The Light of the Gate Called Beautiful',
          hint: 'Shining beside the Corinthian bronze pillars & left-behind mat near “the gate called Beautiful” (Part Two)'
        },
        {
          name: 'The Light of the Damascus Road & Open Rooftop',
          hint: 'Glowing along the road to the nations near “why are you persecuting me?” (Part Three)'
        },
        {
          name: 'The Light of the Midnight Hymn in Philippi',
          hint: 'Shining beside the earthquake-opened prison arch & unfastened chains near “midnight” (Part Four)'
        },
        {
          name: 'The Light of the Four Stern Anchors & Unhindered Word',
          hint: 'Glowing beside the four iron anchors & Roman lamp near “four anchors” & “unhindered” before the Amen Gate (Part Five)'
        }
      ],
      'anchor-of-the-soul': [
        {
          name: 'The Light of the Radiance of His Glory',
          hint: 'Shining at the threshold of the sanctuary near “the exact representation” (Part One)'
        },
        {
          name: 'The Light of the Sabbath Rest',
          hint: 'Resting along the pilgrim road near “today, if you hear his voice” (Part Two)'
        },
        {
          name: 'The Light of the Throne of Grace & the Anchor Within the Veil',
          hint: 'Glowing beside the Mercy Seat, the Anchor of the Soul, & the parted curtain near “the throne of grace”, “anchor”, & “the veil” (Part Three)'
        },
        {
          name: 'The Light of the City with Foundations',
          hint: 'Shining along the walk of faith near “strangers and pilgrims” (Part Four)'
        },
        {
          name: 'The Light of the Great Cloud of Witnesses',
          hint: 'Glowing within the amphitheater colonnade near “cloud of witnesses” before the Amen Gate (Part Five)'
        }
      ],
      'our-eyes-are-on-you': [
        {
          name: 'The Light of the Keepers of the Thresholds',
          hint: 'Shining beside the temple threshold gate & morning key near “keepers of the thresholds” (Part One)'
        },
        {
          name: 'The Light of the Ark Tent & Feast of Joy',
          hint: 'Glowing beside the tent table of bread & raisin cakes near “a loaf and a raisin cake” (Part Two)'
        },
        {
          name: 'The Light of the House Built for His Name',
          hint: 'Resting along the cedar-lined sanctuary road near “yours is the kingdom” (Part Three)'
        },
        {
          name: 'The Light of One Sound & Eyes Upon Yahweh',
          hint: 'Shining beside the 120 silver trumpets & Jehoshaphat’s courtyard near “one sound” & “our eyes are on you” (Part Four)'
        },
        {
          name: 'The Light of the Proclamation to Go Up & Build',
          hint: 'Glowing before the Amen Gate near “whoever is among you of all his people” (Part Five)'
        }
      ],
      'rise-up-and-build': [
        {
          name: 'The Light of the Altar Set on Its Base',
          hint: 'Shining beside the rebuilt stone altar near “on its base” (Part One)'
        },
        {
          name: 'The Light of the Good Hand of Our God',
          hint: 'Resting along the return road near “the good hand of our God” (Part Two)'
        },
        {
          name: 'The Light of the Moonlit Night Ride',
          hint: 'Glowing beside the breached wall stones & lantern near “the night ride” (Part Three)'
        },
        {
          name: 'The Light of the Trowel & the Sword',
          hint: 'Shining on the rising parapet beside the builder’s trowel & bronze sword near “one hand” (Part Four)'
        },
        {
          name: 'The Light of the Water Gate Scroll & Joy of Yahweh',
          hint: 'Glowing beside the wooden platform at the Water Gate near “all the people stood” before the Amen Gate (Part Five)'
        }
      ],
      'for-such-a-time-as-this': [
        {
          name: 'The Light of the Susa Mosaic Courtyard',
          hint: 'Shining beside the palace colonnade & mosaic pavement near “every day by the court” (Part One)'
        },
        {
          name: 'The Light of the Three-Day Vigil',
          hint: 'Glowing beside the folded royal robe & fast lamp near “if I perish” (Part Two)'
        },
        {
          name: 'The Light of the Extended Golden Scepter & Sleepless Night',
          hint: 'Shining beside the golden scepter & open Book of Chronicles near “the golden scepter” & “the sleepless king” (Part Three)'
        },
        {
          name: 'The Light of Gladness & Light for the People',
          hint: 'Glowing before the Amen Gate near “light and gladness, joy and honor” (Part Four)'
        }
      ],
      'the-beginning-of-wisdom': [
        {
          name: 'The Light of the Guarded Wellspring of Life',
          hint: 'Shining beside the stone basin of living water near “the wellspring” (Part One)'
        },
        {
          name: 'The Light of Apples of Gold in Settings of Silver',
          hint: 'Glowing beside the silver filigree bowl & golden apples near “apples of gold” (Part Two)'
        },
        {
          name: 'The Light of the Just Balance & Quiet Work',
          hint: 'Resting along the colonnade of wisdom near “commit your works” (Part Three)'
        },
        {
          name: 'The Light of Iron Sharpening Iron',
          hint: 'Shining beside the forge anvil & crossed blades near “iron” (Part Four)'
        },
        {
          name: 'The Light of the Lamp That Does Not Go Out Before Dawn',
          hint: 'Glowing beside Wisdom’s loom & night lamp near “before dawn” before the Amen Gate (Part Five)'
        }
      ],
      'eternity-in-their-hearts': [
        {
          name: 'The Light of the Rivers Returning to the Sea',
          hint: 'Shining beside the stone sea-basin near “the wind and the sea” (Part One)'
        },
        {
          name: 'The Light of Eternity in Their Hearts & the Threefold Cord',
          hint: 'Glowing beside the Sundial of Seasons & braided golden cord near “eternity in their hearts” & “a threefold cord” (Part Two)'
        },
        {
          name: 'The Light of Quiet Wisdom & Bread Upon the Waters',
          hint: 'Resting along the limestone terrace near “better is the end” (Part Three)'
        },
        {
          name: 'The Light of the Blossoming Almond Tree',
          hint: 'Shining beneath the white-blossoming almond tree near “the almond tree” before the Amen Gate (Part Four)'
        }
      ],
      'many-waters': [
        {
          name: 'The Light of the Banner of Love & Blossoming Lattice',
          hint: 'Shining beneath the crimson-gold canopy & spring lattice window near “the banner” & “the winter is past” (Part One)'
        },
        {
          name: 'The Light of the Enclosed Garden Fountain',
          hint: 'Glowing beside the walled garden well of living waters near “the enclosed garden” (Part Two)'
        },
        {
          name: 'The Light of the Beloved in the Garden of Spices',
          hint: 'Resting along the vineyard terrace near “my beloved is mine” (Part Three)'
        },
        {
          name: 'The Light of the Signet Seal & Unquenchable Flame',
          hint: 'Shining beside the golden signet seal & flame over many waters near “the seal” before the Amen Gate (Part Four)'
        }
      ]
    };

    let lightConfigs = lightsBySlug[slug];
    if (!lightConfigs && manifest.parts) {
      lightConfigs = manifest.parts.map((p) => {
        const partNum = p.part || p.index || 1;
        const partNodes = paintingNodes.filter((n) => n.part === partNum);
        const lastNode = partNodes[partNodes.length - 1];
        const midNode = partNodes[Math.max(0, partNodes.length - 2)];
        const lightZ = midNode ? midNode.roadPosition.z - 2.4 : -60.0 * partNum;
        const veilZ = lastNode ? lastNode.roadPosition.z - 4.4 : lightZ - 18.0;
        const meta = customLightMetaBySlug[slug]?.[partNum - 1];
        return {
          part: partNum,
          id: `${slug}-light-${partNum}`,
          name: meta?.name || p.lightName || `The Light of ${p.title}`,
          hint: meta?.hint || p.lightHint || `Glowing near Part ${partNum}: ${p.title} (${p.epigraphRef || ''})`,
          z: lightZ,
          lateral: partNum % 2 === 1 ? 6.0 : -6.0,
          height: 1.72,
          veilZ
        };
      });
    }
    if (!lightConfigs) lightConfigs = lightsBySlug.genesis;

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
      haloSprite.scale.set(3.2, 3.2, 1);
      lightGroup.add(haloSprite);

      const pointLight = new THREE.PointLight(0xffe094, 2.6, 16);
      lightGroup.add(pointLight);
      streetGroup.add(lightGroup);

      const partNodes = paintingNodes.filter((n) => n.part === cfg.part);
      const partLastNode = partNodes[partNodes.length - 1];
      const effectiveVeilZ = partLastNode ? Math.min(cfg.veilZ, partLastNode.roadPosition.z - 4.4) : cfg.veilZ;
      const veilPt = this.getPathPoint(effectiveVeilZ);
      const veilGroup = new THREE.Group();
      veilGroup.position.set(veilPt.x, veilPt.y, veilPt.z);
      // Story Walk mode gates each part with a shimmering veil until this part's Light is kindled
      veilGroup.visible = true;

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
        veilZ: effectiveVeilZ,
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
    const totalPaintings = manifest.paintings ? manifest.paintings.length : 40;
    const totalParts = manifest.parts ? manifest.parts.length : 4;
    const computedLastZ = -9.0 - ((totalPaintings - 1) * 9.8 + (totalParts - 1) * 7.5);
    const plazaZ = slug === 'ruth'
      ? -268
      : slug === 'psalms-2'
      ? -342
      : slug === 'psalms-3'
      ? -370
      : slug === 'choose-life'
      ? -398
      : slug === 'psalms-4'
      ? -476
      : ['genesis', 'exodus', 'fire-by-night', 'joshua-judges', 'samuel', 'kings', 'psalms-1', 'greatly-beloved', 'all-things-new'].includes(slug)
      ? -436
      : computedLastZ - 14.0;
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
    } else if (slug === 'samuel') {
      const lampRig = this.propBuilder.createSamuelLampAndMat();
      lampRig.group.position.set(0, 0.1, -4.0);
      group.add(lampRig.group);
    } else if (slug === 'kings') {
      const sanctuary = this.propBuilder.createCedarTempleSanctuary();
      sanctuary.group.position.set(0, 0.1, -4.4);
      group.add(sanctuary.group);
    } else if (slug === 'psalms-1') {
      // District XIII Finale: The Amen Table of Book One (tied scroll, bread basket for the poor, clay cup)
      // paired with the Tree Planted by the Streams of Water (Psalm 1) and David's 10-String Harp
      const psalms1Finale = this.propBuilder.createPsalm41AmenTableEnsemble(
        null,
        { ground: '#786c5a', horizon: '#688252', accent: '#f5e2a8' },
        true
      );
      psalms1Finale.position.set(0, 0.1, -3.8);
      group.add(psalms1Finale);
    } else if (slug === 'psalms-2') {
      // District XIV Finale: The Rain on the Mown Grass Harvest Sheaves & Stone Table with Book Two Scrolls
      // ("The prayers of David the son of Jesse are ended", Psalm 72:20) paired with the Deer by the Water Brook (Psalm 42:1)
      const psalms2Finale = this.propBuilder.createPsalm72LikeRainFinaleEnsemble(
        null,
        { ground: '#786e5a', horizon: '#768265', accent: '#f5e6b8' },
        true
      );
      psalms2Finale.position.set(0, 0.1, -3.8);
      group.add(psalms2Finale);
    } else if (slug === 'psalms-3') {
      // District XV Finale: The Shofar & Prayer Cloth on the Temple Steps ("Let all the people say, 'Amen.' Praise Yah!", Psalm 106:48)
      // paired with the Sparrow's Nest by the Altar ("For a day in your courts is better than a thousand", Psalm 84:3, 10)
      const psalms3Finale = this.propBuilder.createPsalm106AmenShofarAltarEnsemble(
        null,
        { ground: '#8c7e65', horizon: '#b5a37e', accent: '#f5e2a8' },
        true
      );
      psalms3Finale.position.set(0, 0.1, -3.8);
      group.add(psalms3Finale);
    } else if (slug === 'psalms-4') {
      // District XVI Finale: The Symphony of Praise — 10-String Harp, Timbrel, Trumpet & Cymbals on the Circular Praise Dais
      // ("Let everything that has breath praise Yah! Praise Yah!", Psalm 150:1–6) paired with the Golden Wheat Sheaves (Psalm 126:6)
      const psalms4Finale = this.propBuilder.createPsalm150EverythingThatHasBreathEnsemble(
        null,
        { ground: '#8f7f64', horizon: '#bfa878', accent: '#ffe49e' },
        true
      );
      psalms4Finale.group.position.set(0, 0.1, -3.8);
      group.add(psalms4Finale.group);

      const finaleSheaves = this.propBuilder.createPsalm126SowInTearsSheavesEnsemble(
        null,
        { ground: '#8f7f64', horizon: '#bfa878', accent: '#ffe49e' }
      );
      finaleSheaves.scale.setScalar(0.84);
      finaleSheaves.position.set(3.2, 0.1, -4.6);
      finaleSheaves.rotation.y = -0.35;
      group.add(finaleSheaves);
    } else if (slug === 'greatly-beloved') {
      // District XXIV Finale: The Sealed Scroll on the River Stone ("But go your way until the end; for you will rest", Daniel 12:13)
      // paired with the Open Window Toward Jerusalem (Daniel 6:10) and the Peaceful Lions of the Den (Daniel 6:22)
      const danielFinale = this.propBuilder.createDaniel12GoYourWayFinaleEnsemble(
        null,
        { ground: '#3d394a', horizon: '#e6ae65', accent: '#cf9e57' },
        true
      );
      danielFinale.position.set(0, 0.1, -3.8);
      group.add(danielFinale);

      const finaleDen = this.propBuilder.createDanielLionsDenLandmark({
        ground: '#3d394a',
        horizon: '#e6ae65',
        accent: '#cf9e57'
      });
      finaleDen.scale.setScalar(0.72);
      finaleDen.position.set(-3.4, 0.1, -4.8);
      finaleDen.rotation.y = 0.38;
      group.add(finaleDen);
    } else if (slug === 'all-things-new') {
      // District XLIV Finale: The Tree of Life, the Stone Bench beneath the Tree (answering Genesis's Sabbath Bench),
      // the Great Lantern of the Lamb ("its lamp is the Lamb"), and a Gate of Pearl
      const newJerusalemFinale = this.propBuilder.createTreeOfLifeAndBenchSanctuary(
        null,
        { ground: '#786c5a', horizon: '#b8b08e', accent: '#ffeba6' },
        true
      );
      newJerusalemFinale.group.position.set(0, 0.1, -3.8);
      group.add(newJerusalemFinale.group);

      const pearlGate = this.propBuilder.createGatesOfPearlArchway({
        ground: '#c9bfab',
        accent: '#f7e6bd'
      });
      pearlGate.scale.setScalar(0.92);
      pearlGate.position.set(-5.2, 0.1, -4.5);
      pearlGate.rotation.y = 0.45;
      group.add(pearlGate);

      const censerFinale = this.propBuilder.createRevelation8GoldenCenserAltarEnsemble(
        null,
        { ground: '#786c5a', horizon: '#b8b08e', accent: '#ffeba6' },
        false
      );
      if (censerFinale.censerLight) censerFinale.group.remove(censerFinale.censerLight);
      censerFinale.group.scale.setScalar(0.76);
      censerFinale.group.position.set(-2.8, 0.1, -5.6);
      censerFinale.group.rotation.y = 0.28;
      group.add(censerFinale.group);
    } else if (slug === 'arise-shine') {
      // District XX Finale (Isaiah): The Open Gates of Zion ("Arise, shine; for your light has come", Isa 60:1)
      // paired with the Peaceable Kingdom Meadow (Wolf & Lamb, Isa 11:6)
      const isaiahGate = this.propBuilder.createIsaiah60AriseShineGateEnsemble(
        null,
        { ground: '#7c6b54', horizon: '#e6b873', accent: '#ffe69e' },
        true
      );
      isaiahGate.group.position.set(0, 0.1, -4.0);
      group.add(isaiahGate.group);

      const wolfLamb = this.propBuilder.createIsaiah11WolfAndLambMeadowEnsemble(
        null,
        { ground: '#6d7854', horizon: '#d9bc82', accent: '#f7df9c' },
        false
      );
      if (wolfLamb.meadowLight) wolfLamb.group.remove(wolfLamb.meadowLight);
      wolfLamb.group.scale.setScalar(0.78);
      wolfLamb.group.position.set(-3.4, 0.1, -4.4);
      wolfLamb.group.rotation.y = 0.35;
      group.add(wolfLamb.group);
    } else if (slug === 'good-news-of-great-joy') {
      // District XXVIII Finale (Luke): The Emmaus Supper Table ("he took the bread and blessed; and breaking it, he gave to them", Luke 24:30–32)
      // paired with the Father's Open Road Home (Luke 15:20)
      const emmausFinale = this.propBuilder.createLuke24EmmausTableEnsemble(
        null,
        { ground: '#756450', horizon: '#d9a66c', accent: '#ffe099' },
        true
      );
      emmausFinale.group.position.set(0, 0.1, -3.8);
      group.add(emmausFinale.group);

      const prodigalFinale = this.propBuilder.createLuke15ProdigalWelcomeEnsemble(
        null,
        { ground: '#786854', horizon: '#deb278', accent: '#ffe3a3' },
        false
      );
      if (prodigalFinale.roadLight) prodigalFinale.group.remove(prodigalFinale.roadLight);
      prodigalFinale.group.scale.setScalar(0.74);
      prodigalFinale.group.position.set(-3.4, 0.1, -4.6);
      prodigalFinale.group.rotation.y = 0.36;
      group.add(prodigalFinale.group);
    } else if (slug === 'i-am-with-you-always') {
      // District XXIX Finale (Matthew): The Empty Garden Tomb with Rolled-Away Stone (Matt 28:2–6)
      // paired with the Lamp on the Stand on the Mountain of Galilaean Commissioning ("I am with you always", Matt 28:20)
      const tombFinale = this.propBuilder.createMatthew28EmptyTombEnsemble(
        null,
        { ground: '#786d5c', horizon: '#dec088', accent: '#ffe8a8' },
        true
      );
      tombFinale.group.position.set(0, 0.1, -4.0);
      group.add(tombFinale.group);

      const lampStandFinale = this.propBuilder.createMatthew5LampOnStandEnsemble(
        null,
        { ground: '#786d5c', horizon: '#dec088', accent: '#ffe8a8' },
        false
      );
      if (lampStandFinale.lampLight) lampStandFinale.group.remove(lampStandFinale.lampLight);
      lampStandFinale.group.scale.setScalar(0.78);
      lampStandFinale.group.position.set(-3.4, 0.1, -4.4);
      lampStandFinale.group.rotation.y = 0.35;
      group.add(lampStandFinale.group);
    } else if (slug === 'peace-be-still') {
      // District XXX Finale (Mark): The Broken Alabaster Jar of Spikenard ("Wherever this Good News is preached...", Mark 14:3–9)
      // paired with the Galilee Boat & Stern Cushion ("Peace, be still!", Mark 4:38–39)
      const alabasterFinale = this.propBuilder.createMark14AlabasterJarEnsemble(
        null,
        { ground: '#736553', horizon: '#c9a878', accent: '#ffe29e' },
        true
      );
      alabasterFinale.group.position.set(0, 0.1, -3.8);
      group.add(alabasterFinale.group);

      const markBoatFinale = this.propBuilder.createStormBoatAndCushion(
        null,
        { ground: '#5c5244', horizon: '#9cb0b8', accent: '#ffe29e' }
      );
      if (markBoatFinale.lanternLight) markBoatFinale.group.remove(markBoatFinale.lanternLight);
      markBoatFinale.group.scale.setScalar(0.68);
      markBoatFinale.group.position.set(-3.4, 0.1, -4.6);
      markBoatFinale.group.rotation.y = 0.38;
      group.add(markBoatFinale.group);
    } else if (slug === 'come-and-see') {
      // District XXXI Finale (John): The Charcoal Fire on the Galilee Beach ("Come and eat breakfast", John 21:9–12)
      // paired with the Six Stone Jars of Cana (John 2:6–10)
      const charcoalFinale = this.propBuilder.createJohn21CharcoalBreakfastEnsemble(
        null,
        { ground: '#756856', horizon: '#cfa974', accent: '#ffe4a0' },
        true
      );
      charcoalFinale.group.position.set(0, 0.1, -3.8);
      group.add(charcoalFinale.group);

      const canaFinale = this.propBuilder.createJohn2CanaStoneJarsEnsemble(
        null,
        { ground: '#786c5a', horizon: '#cfa974', accent: '#ffe4a0' },
        false
      );
      if (canaFinale.canaLight) canaFinale.group.remove(canaFinale.canaLight);
      canaFinale.group.scale.setScalar(0.74);
      canaFinale.group.position.set(-3.4, 0.1, -4.6);
      canaFinale.group.rotation.y = 0.36;
      group.add(canaFinale.group);
    } else if (slug === 'out-of-the-whirlwind') {
      // District XII Finale (Job): The Whirlwind & Orion/Pleiades Star Rings (Job 38:1, 31)
      // paired with the Hewn Stump Budding at the Scent of Water (Job 14:7–9)
      const jobFinale = this.propBuilder.createJob38WhirlwindAndStarsEnsemble(
        null,
        { ground: '#665b4c', horizon: '#cfa96e', accent: '#ffe69e' },
        true
      );
      jobFinale.group.position.set(0, 0.1, -3.8);
      group.add(jobFinale.group);

      const jobStump = this.propBuilder.createJob14ScentOfWaterStumpEnsemble(
        null,
        { ground: '#665b4c', horizon: '#cfa96e', accent: '#ffe69e' },
        false
      );
      if (jobStump.sproutLight) jobStump.group.remove(jobStump.sproutLight);
      jobStump.group.scale.setScalar(0.76);
      jobStump.group.position.set(-3.4, 0.1, -4.6);
      jobStump.group.rotation.y = 0.36;
      group.add(jobStump.group);
    } else if (slug === 'a-future-and-a-hope') {
      // District XXI Finale (Jeremiah): The Potter's Wheel & Reshaped Vessel (Jer 18:4)
      // paired with the Earthenware Jar Holding the Anathoth Deeds (Jer 32:14)
      const potterFinale = this.propBuilder.createJeremiah18PottersWheelEnsemble(
        null,
        { ground: '#736452', horizon: '#d9ac72', accent: '#ffe29c' },
        true
      );
      potterFinale.group.position.set(0, 0.1, -3.8);
      group.add(potterFinale.group);

      const deedFinale = this.propBuilder.createJeremiah32AnathothDeedJarsEnsemble(
        null,
        { ground: '#736452', horizon: '#d9ac72', accent: '#ffe29c' },
        false
      );
      if (deedFinale.deedLight) deedFinale.group.remove(deedFinale.deedLight);
      deedFinale.group.scale.setScalar(0.76);
      deedFinale.group.position.set(-3.4, 0.1, -4.6);
      deedFinale.group.rotation.y = 0.35;
      group.add(deedFinale.group);
    } else if (slug === 'can-these-bones-live') {
      // District XXIII Finale (Ezekiel): The Temple River & Trees Bearing Leaves for Healing (Ezek 47:9, 12)
      // paired with the Valley of Dry Bones Rising in the Breath (Ezek 37:9–10)
      const riverFinale = this.propBuilder.createEzekiel47TempleRiverTreesEnsemble(
        null,
        { ground: '#756856', horizon: '#c9b07c', accent: '#ffea9e' },
        true
      );
      riverFinale.group.position.set(0, 0.1, -3.8);
      group.add(riverFinale.group);

      const bonesFinale = this.propBuilder.createEzekiel37ValleyOfDryBonesEnsemble(
        null,
        { ground: '#756856', horizon: '#c9b07c', accent: '#ffea9e' },
        false
      );
      if (bonesFinale.breathLight) bonesFinale.group.remove(bonesFinale.breathLight);
      bonesFinale.group.scale.setScalar(0.74);
      bonesFinale.group.position.set(-3.4, 0.1, -4.6);
      bonesFinale.group.rotation.y = 0.36;
      group.add(bonesFinale.group);
    } else if (slug === 'out-of-the-deep') {
      // District XXVI Finale (Jonah): The East Hill Branch Shelter & Shade Vine (Jonah 4:6)
      // paired with Nineveh's Empty Throne & Crown in the Ashes (Jonah 3:6)
      const vineFinale = this.propBuilder.createJonah4EastHillBoothVineEnsemble(
        null,
        { ground: '#635c4e', horizon: '#b5a87e', accent: '#ffe49c' },
        true
      );
      vineFinale.group.position.set(0, 0.1, -3.8);
      group.add(vineFinale.group);

      const ninevehFinale = this.propBuilder.createJonah3NinevehEmptyThroneEnsemble(
        null,
        { ground: '#635c4e', horizon: '#b5a87e', accent: '#ffe49c' },
        false
      );
      if (ninevehFinale.throneLight) ninevehFinale.group.remove(ninevehFinale.throneLight);
      ninevehFinale.group.scale.setScalar(0.74);
      ninevehFinale.group.position.set(-3.4, 0.1, -4.6);
      ninevehFinale.group.rotation.y = 0.36;
      group.add(ninevehFinale.group);
    } else if (slug === 'to-the-ends-of-the-earth') {
      // District XXXII Finale (Acts): The Upper Room Pentecost Circle & Twelve Flames (Acts 2:3)
      // paired with the Four Stern Anchors of Malta (Acts 27:29)
      const pentecostFinale = this.propBuilder.createActs2PentecostUpperRoomEnsemble(
        null,
        { ground: '#736553', horizon: '#d9a86c', accent: '#ffe299' },
        true
      );
      pentecostFinale.group.position.set(0, 0.1, -3.8);
      group.add(pentecostFinale.group);

      const anchorsFinale = this.propBuilder.createActs27MaltaFourAnchorsEnsemble(
        null,
        { ground: '#736553', horizon: '#d9a86c', accent: '#ffe299' },
        false
      );
      if (anchorsFinale.anchorLight) anchorsFinale.group.remove(anchorsFinale.anchorLight);
      anchorsFinale.group.scale.setScalar(0.74);
      anchorsFinale.group.position.set(-3.4, 0.1, -4.6);
      anchorsFinale.group.rotation.y = 0.36;
      group.add(anchorsFinale.group);
    } else if (slug === 'anchor-of-the-soul') {
      // District XL Finale (Hebrews): The Great Cloud of Witnesses Amphitheater (Heb 12:1–2)
      // paired with the Parted Temple Curtain & Throne of Grace (Heb 4:16, 10:19–20)
      const arenaFinale = this.propBuilder.createHebrews12CloudOfWitnessesArenaEnsemble(
        null,
        { ground: '#7a6c58', horizon: '#dec088', accent: '#ffea9e' },
        true
      );
      arenaFinale.group.position.set(0, 0.1, -3.8);
      group.add(arenaFinale.group);

      const veilFinale = this.propBuilder.createHebrews10OpenedCurtainWayEnsemble(
        null,
        { ground: '#7a6c58', horizon: '#dec088', accent: '#ffea9e' },
        false
      );
      if (veilFinale.veilLight) veilFinale.group.remove(veilFinale.veilLight);
      veilFinale.group.scale.setScalar(0.74);
      veilFinale.group.position.set(-3.4, 0.1, -4.6);
      veilFinale.group.rotation.y = 0.36;
      group.add(veilFinale.group);
    } else if (slug === 'our-eyes-are-on-you') {
      const chronFinale = this.propBuilder.createChronicles20EyesOnYouCourtyardEnsemble(
        null,
        { ground: '#7a6c58', horizon: '#dfc08a', accent: '#ffe699' },
        true
      );
      chronFinale.group.position.set(0, 0.1, -3.8);
      group.add(chronFinale.group);

      const soundFinale = this.propBuilder.createChronicles5OneSoundTrumpetsEnsemble(
        null,
        { ground: '#7a6c58', horizon: '#dfc08a', accent: '#ffe699' },
        false
      );
      if (soundFinale.gloryLight) soundFinale.group.remove(soundFinale.gloryLight);
      soundFinale.group.scale.setScalar(0.74);
      soundFinale.group.position.set(-3.4, 0.1, -4.6);
      soundFinale.group.rotation.y = 0.36;
      group.add(soundFinale.group);
    } else if (slug === 'rise-up-and-build') {
      const scrollFinale = this.propBuilder.createNehemiah8WaterGateScrollEnsemble(
        null,
        { ground: '#7a6a55', horizon: '#deb97e', accent: '#ffe69c' },
        true
      );
      scrollFinale.group.position.set(0, 0.1, -3.8);
      group.add(scrollFinale.group);

      const wallFinale = this.propBuilder.createNehemiah4TrowelAndSwordWallEnsemble(
        null,
        { ground: '#7a6a55', horizon: '#deb97e', accent: '#ffe69c' },
        false
      );
      if (wallFinale.wallLight) wallFinale.group.remove(wallFinale.wallLight);
      wallFinale.group.scale.setScalar(0.74);
      wallFinale.group.position.set(-3.4, 0.1, -4.6);
      wallFinale.group.rotation.y = 0.36;
      group.add(wallFinale.group);
    } else if (slug === 'for-such-a-time-as-this') {
      const scepterFinale = this.propBuilder.createEsther5GoldenScepterThroneEnsemble(
        null,
        { ground: '#382c42', horizon: '#d9b571', accent: '#ffea96' },
        true
      );
      scepterFinale.group.position.set(0, 0.1, -3.8);
      group.add(scepterFinale.group);

      const chronBookFinale = this.propBuilder.createEsther6SleeplessChroniclesEnsemble(
        null,
        { ground: '#382c42', horizon: '#d9b571', accent: '#ffea96' },
        false
      );
      if (chronBookFinale.lampLight) chronBookFinale.group.remove(chronBookFinale.lampLight);
      chronBookFinale.group.scale.setScalar(0.74);
      chronBookFinale.group.position.set(-3.4, 0.1, -4.6);
      chronBookFinale.group.rotation.y = 0.36;
      group.add(chronBookFinale.group);
    } else if (slug === 'the-beginning-of-wisdom') {
      const dawnFinale = this.propBuilder.createProverbs31LampBeforeDawnEnsemble(
        null,
        { ground: '#786b59', horizon: '#dfc38d', accent: '#ffe28a' },
        true
      );
      dawnFinale.group.position.set(0, 0.1, -3.8);
      group.add(dawnFinale.group);

      const applesFinale = this.propBuilder.createProverbs25ApplesOfGoldEnsemble(
        null,
        { ground: '#786b59', horizon: '#dfc38d', accent: '#ffe28a' },
        false
      );
      if (applesFinale.applesLight) applesFinale.group.remove(applesFinale.applesLight);
      applesFinale.group.scale.setScalar(0.74);
      applesFinale.group.position.set(-3.4, 0.1, -4.6);
      applesFinale.group.rotation.y = 0.36;
      group.add(applesFinale.group);
    } else if (slug === 'eternity-in-their-hearts') {
      const sundialFinale = this.propBuilder.createEcclesiastes3SundialOfSeasonsEnsemble(
        null,
        { ground: '#7a6c58', horizon: '#e3c58d', accent: '#ffea96' },
        true
      );
      sundialFinale.group.position.set(0, 0.1, -3.8);
      group.add(sundialFinale.group);

      const almondFinale = this.propBuilder.createEcclesiastes12BlossomingAlmondEnsemble(
        null,
        { ground: '#7a6c58', horizon: '#e3c58d', accent: '#ffea96' },
        false
      );
      if (almondFinale.almondLight) almondFinale.group.remove(almondFinale.almondLight);
      almondFinale.group.scale.setScalar(0.74);
      almondFinale.group.position.set(-3.4, 0.1, -4.6);
      almondFinale.group.rotation.y = 0.36;
      group.add(almondFinale.group);
    } else if (slug === 'many-waters') {
      const sealFinale = this.propBuilder.createSong8ManyWatersSealFlameEnsemble(
        null,
        { ground: '#7a6d5a', horizon: '#e0c48e', accent: '#ffc966' },
        true
      );
      sealFinale.group.position.set(0, 0.1, -3.8);
      group.add(sealFinale.group);

      const gardenFinale = this.propBuilder.createSong4EnclosedGardenFountainEnsemble(
        null,
        { ground: '#7a6d5a', horizon: '#e0c48e', accent: '#ffc966' },
        false
      );
      if (gardenFinale.fountainLight) gardenFinale.group.remove(gardenFinale.fountainLight);
      gardenFinale.group.scale.setScalar(0.74);
      gardenFinale.group.position.set(-3.4, 0.1, -4.6);
      gardenFinale.group.rotation.y = 0.36;
      group.add(gardenFinale.group);
    } else if (slug === 'new-every-morning') {
      const dawnFinale = this.propBuilder.createLamentations3NewEveryMorningDawnEnsemble(
        null,
        { ground: '#665a4c', horizon: '#e6c687', accent: '#ffe48c' },
        true
      );
      dawnFinale.group.position.set(0, 0.1, -3.8);
      group.add(dawnFinale.group);

      const lyreFinale = this.propBuilder.createLamentations5RestoredLyreDawnWallEnsemble(
        null,
        { ground: '#665a4c', horizon: '#e6c687', accent: '#ffe48c' },
        false
      );
      if (lyreFinale.renewLight) lyreFinale.group.remove(lyreFinale.renewLight);
      lyreFinale.group.scale.setScalar(0.74);
      lyreFinale.group.position.set(-3.4, 0.1, -4.6);
      lyreFinale.group.rotation.y = 0.36;
      group.add(lyreFinale.group);
    } else if (slug === 'a-door-of-hope') {
      const doorFinale = this.propBuilder.createHosea2ValleyOfAchorDoorEnsemble(
        null,
        { ground: '#665942', horizon: '#a69673', accent: '#fef0bb' },
        true
      );
      doorFinale.group.position.set(0, 0.1, -3.8);
      group.add(doorFinale.group);

      const lilyFinale = this.propBuilder.createHosea14DewLilyAndOliveEnsemble(
        null,
        { ground: '#726954', horizon: '#a79a7e', accent: '#e3d4b0' },
        false
      );
      if (lilyFinale.dewLight) lilyFinale.group.remove(lilyFinale.dewLight);
      lilyFinale.group.scale.setScalar(0.74);
      lilyFinale.group.position.set(-3.4, 0.1, -4.6);
      lilyFinale.group.rotation.y = 0.36;
      group.add(lilyFinale.group);
    } else if (slug === 'the-day-of-small-things') {
      const menorahFinale = this.propBuilder.createZechariah4SevenLampsAndOliveTreesEnsemble(
        null,
        { ground: '#817557', horizon: '#928562', accent: '#f8e6a6' },
        true
      );
      menorahFinale.group.position.set(0, 0.1, -3.8);
      group.add(menorahFinale.group);

      const memoryFinale = this.propBuilder.createMalachi3BookOfRemembranceEnsemble(
        null,
        { ground: '#564a35', horizon: '#84785d', accent: '#dbc79d' },
        false
      );
      if (memoryFinale.memoryLight) memoryFinale.group.remove(memoryFinale.memoryLight);
      memoryFinale.group.scale.setScalar(0.74);
      memoryFinale.group.position.set(-3.4, 0.1, -4.6);
      memoryFinale.group.rotation.y = 0.36;
      group.add(memoryFinale.group);
    } else if (slug === 'nothing-can-separate') {
      const oliveFinale = this.propBuilder.createRomans11GraftedOliveTreeEnsemble(
        null,
        { ground: '#817665', horizon: '#9c917a', accent: '#eee2c0' },
        true
      );
      oliveFinale.group.position.set(0, 0.1, -3.8);
      group.add(oliveFinale.group);

      const graceDoorFinale = this.propBuilder.createRomans5OpenDoorOfGraceCourtyardEnsemble(
        null,
        { ground: '#685f53', horizon: '#716654', accent: '#d9b36f' },
        false
      );
      if (graceDoorFinale.graceLight) graceDoorFinale.group.remove(graceDoorFinale.graceLight);
      graceDoorFinale.group.scale.setScalar(0.74);
      graceDoorFinale.group.position.set(-3.4, 0.1, -4.6);
      graceDoorFinale.group.rotation.y = 0.36;
      group.add(graceDoorFinale.group);
    } else if (slug === 'treasure-in-clay-jars') {
      const jarFinale = this.propBuilder.createCorinthians4CrackedClayJarLightEnsemble(
        null,
        { ground: '#6e634e', horizon: '#80755d', accent: '#e9cb8b' },
        true
      );
      jarFinale.group.position.set(0, 0.1, -3.8);
      group.add(jarFinale.group);

      const mirrorFinale = this.propBuilder.createCorinthians13PolishedBronzeMirrorEnsemble(
        null,
        { ground: '#a38f6e', horizon: '#8e7b5b', accent: '#ffe3af' },
        false
      );
      if (mirrorFinale.mirrorLight) mirrorFinale.group.remove(mirrorFinale.mirrorLight);
      mirrorFinale.group.scale.setScalar(0.74);
      mirrorFinale.group.position.set(-3.4, 0.1, -4.6);
      mirrorFinale.group.rotation.y = 0.36;
      group.add(mirrorFinale.group);
    } else if (slug === 'rooted-and-free') {
      const rootedFinale = this.propBuilder.createEphesians3RootedOliveTreeAndBasketEnsemble({
        isFinalePlaza: true
      });
      rootedFinale.group.position.set(0, 0.1, -3.8);
      group.add(rootedFinale.group);

      const armorFinale = this.propBuilder.createEphesians6ArmorOfGodTableEnsemble({
        isFinalePlaza: false
      });
      if (armorFinale.armorLight) armorFinale.group.remove(armorFinale.armorLight);
      armorFinale.group.scale.setScalar(0.74);
      armorFinale.group.position.set(-3.4, 0.1, -4.6);
      armorFinale.group.rotation.y = 0.36;
      group.add(armorFinale.group);
    } else if (slug === 'joy-in-chains') {
      const sentryFinale = this.propBuilder.createPhilippians4SentryGateAndLanternEnsemble({
        isFinalePlaza: true
      });
      sentryFinale.group.position.set(0, 0.1, -3.8);
      group.add(sentryFinale.group);

      const basinFinale = this.propBuilder.createPhilippians2ServantBasinAndTowelStairsEnsemble({
        isFinalePlaza: false
      });
      if (basinFinale.servantLight) basinFinale.group.remove(basinFinale.servantLight);
      basinFinale.group.scale.setScalar(0.74);
      basinFinale.group.position.set(-3.4, 0.1, -4.6);
      basinFinale.group.rotation.y = 0.36;
      group.add(basinFinale.group);
    } else if (slug === 'held-together') {
      const keystoneFinale = this.propBuilder.createColossians1KeystoneArchEnsemble({
        isFinalePlaza: true
      });
      keystoneFinale.group.position.set(0, 0.1, -3.8);
      group.add(keystoneFinale.group);

      const tabletFinale = this.propBuilder.createColossians2WipedCleanWaxTabletAndStylusEnsemble({
        isFinalePlaza: false
      });
      if (tabletFinale.tabletLight) tabletFinale.group.remove(tabletFinale.tabletLight);
      tabletFinale.group.scale.setScalar(0.74);
      tabletFinale.group.position.set(-3.4, 0.1, -4.6);
      tabletFinale.group.rotation.y = 0.36;
      group.add(tabletFinale.group);
    } else if (slug === 'children-of-the-day') {
      const dawnFinale = this.propBuilder.createThessalonians5DawnWindowsillLampAndScrollEnsemble({
        isFinalePlaza: true
      });
      dawnFinale.group.position.set(0, 0.1, -3.8);
      group.add(dawnFinale.group);

      const loafFinale = this.propBuilder.create2Thessalonians3QuietWorkTableLoafAndGlovesEnsemble({
        isFinalePlaza: false
      });
      if (loafFinale.tableLight) loafFinale.group.remove(loafFinale.tableLight);
      loafFinale.group.scale.setScalar(0.74);
      loafFinale.group.position.set(-3.4, 0.1, -4.6);
      loafFinale.group.rotation.y = 0.36;
      group.add(loafFinale.group);
    } else if (slug === 'grace-mercy-and-peace') {
      const cloakFinale = this.propBuilder.create2Timothy4CloakAndParchmentsStoneBenchEnsemble({
        isFinalePlaza: true
      });
      cloakFinale.group.position.set(0, 0.1, -3.8);
      group.add(cloakFinale.group);

      const crownFinale = this.propBuilder.create2Timothy4StadiumFinishStoneAndLaurelCrownEnsemble({
        isFinalePlaza: false
      });
      if (crownFinale.crownLight) crownFinale.group.remove(crownFinale.crownLight);
      crownFinale.group.scale.setScalar(0.74);
      crownFinale.group.position.set(-3.4, 0.1, -4.6);
      crownFinale.group.rotation.y = 0.36;
      group.add(crownFinale.group);
    } else if (slug === 'doers-of-the-word') {
      const mirrorFinale = this.propBuilder.createJames1BronzeMirrorAndWaterBasinTableEnsemble({
        isFinalePlaza: true
      });
      mirrorFinale.group.position.set(0, 0.1, -3.8);
      group.add(mirrorFinale.group);

      const rainFieldFinale = this.propBuilder.createJames5PlowedBarleyFieldAndRainStaffEnsemble({
        isFinalePlaza: false
      });
      if (rainFieldFinale.rainLight) rainFieldFinale.group.remove(rainFieldFinale.rainLight);
      rainFieldFinale.group.scale.setScalar(0.74);
      rainFieldFinale.group.position.set(-3.4, 0.1, -4.6);
      rainFieldFinale.group.rotation.y = 0.36;
      group.add(rainFieldFinale.group);
    } else if (slug !== 'genesis') {
      const finaleCenterpiece = this.propBuilder.createBookFinaleProp(slug, {
        ground: '#6e5c46',
        horizon: '#c7a474',
        accent: '#ffe29c'
      });
      finaleCenterpiece.position.set(0, 0.1, -4.2);
      group.add(finaleCenterpiece);
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

    // Mount the District's Hero Relic in the Finale Plaza to rhyme with the book's culmination
    // (For XLIV Revelation, place the White Stone right beside the Tree of Life Stone Bench!)
    const finaleRelicCfg = this.propBuilder.tripo?.districtHeroRelicPlacement?.[slug];
    if (finaleRelicCfg) {
      const lastPainting = manifest.paintings && manifest.paintings[manifest.paintings.length - 1];
      const sourcePainting =
        (manifest.paintings || []).find((p) => p.n === finaleRelicCfg.paintingNum) || lastPainting;
      const finalePal = (sourcePainting && sourcePainting.palette) || {
        ground: '#786c5a',
        accent: '#f0d298',
        horizon: '#c9a874'
      };
      const finaleRelicPedestal = this.createHeroRelicSanctuaryPedestal(finaleRelicCfg, finalePal);
      const relX = slug === 'all-things-new' ? 2.4 : 4.2;
      const relZ = slug === 'all-things-new' ? -2.8 : -3.4;
      if (slug === 'all-things-new') {
        finaleRelicPedestal.scale.setScalar(0.82);
        finaleRelicPedestal.position.set(relX, 0.1, relZ);
        finaleRelicPedestal.rotation.y = -0.35;
      } else {
        finaleRelicPedestal.scale.setScalar(0.95);
        finaleRelicPedestal.position.set(relX, 0.1, relZ);
        finaleRelicPedestal.lookAt(0, 0.5, 4.0);
      }
      group.add(finaleRelicPedestal);

      group.userData.finaleHeroRelicNode = {
        id: finaleRelicCfg.id,
        paintingNum: finaleRelicCfg.paintingNum,
        paintingData: sourcePainting,
        position: new THREE.Vector3(pt.x + relX, pt.y + 0.1, pt.z + relZ),
        roadPosition: new THREE.Vector3(pt.x + relX * 0.35, pt.y, pt.z + relZ + 2.8),
        pedestalGroup: finaleRelicPedestal,
        isFinale: true
      };
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
        epigraphRef: 'APPROACH & PRESS [E] TO CONTINUE TO DISTRICT VII: THE LAMP HAD NOT GONE OUT'
      },
      samuel: {
        title: 'AMEN GATE · THE LAMP HAD NOT GONE OUT COMPLETED',
        epigraph: 'For you are my lamp, Yahweh. Yahweh will light up my darkness',
        epigraphRef: 'APPROACH & PRESS [E] TO CONTINUE TO DISTRICT VIII: A STILL SMALL VOICE'
      },
      kings: {
        title: 'AMEN GATE · A STILL SMALL VOICE COMPLETED',
        epigraph: 'After the fire, there was a still small voice — a lamp still burning',
        epigraphRef: 'APPROACH & PRESS [E] TO CONTINUE TO DISTRICT IX: OUR EYES ARE ON YOU'
      },
      'psalms-1': {
        title: 'AMEN GATE · PLANTED BY THE WATER COMPLETED',
        epigraph: 'Blessed be Yahweh, the God of Israel, from everlasting and to everlasting! Amen and amen.',
        epigraphRef: 'PSALM 41:13 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XIV: AS THE DEER'
      },
      'psalms-2': {
        title: 'AMEN GATE · AS THE DEER COMPLETED',
        epigraph: 'He will come down like rain on the mown grass — The prayers of David the son of Jesse are ended.',
        epigraphRef: 'PSALM 72:6–20 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XV: A DAY IN YOUR COURTS'
      },
      'psalms-3': {
        title: 'AMEN GATE · A DAY IN YOUR COURTS COMPLETED',
        epigraph: 'Blessed be Yahweh, the God of Israel, from everlasting even to everlasting! Let all the people say, “Amen.” Praise Yah!',
        epigraphRef: 'PSALM 106:48 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XVI: EVERYTHING THAT HAS BREATH'
      },
      'psalms-4': {
        title: 'AMEN GATE · EVERYTHING THAT HAS BREATH COMPLETED',
        epigraph: 'Praise him with harp and lyre! Praise him with tambourine and dancing! Let everything that has breath praise Yah! Praise Yah!',
        epigraphRef: 'PSALM 150:3–6 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XVII: PROVERBS'
      },
      'greatly-beloved': {
        title: 'AMEN GATE · GREATLY BELOVED COMPLETED',
        epigraph: 'But go your way until the end; for you will rest, and will stand in your allotted inheritance at the end of the days.',
        epigraphRef: 'DANIEL 12:13 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXV: A DOOR OF HOPE'
      },
      'arise-shine': {
        title: 'AMEN GATE · ARISE, SHINE COMPLETED',
        epigraph: 'Arise, shine; for your light has come, and Yahweh’s glory has risen on you — Behold, I create new heavens and a new earth.',
        epigraphRef: 'ISAIAH 60:1 & 65:17 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXI: A FUTURE AND A HOPE'
      },
      'good-news-of-great-joy': {
        title: 'AMEN GATE · GOOD NEWS OF GREAT JOY COMPLETED',
        epigraph: 'Weren’t our hearts burning within us, while he spoke to us along the way, and while he opened the Scriptures to us?',
        epigraphRef: 'LUKE 24:32 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXIX: I AM WITH YOU ALWAYS'
      },
      'i-am-with-you-always': {
        title: 'AMEN GATE · I AM WITH YOU ALWAYS COMPLETED',
        epigraph: 'Behold, I am with you always, even to the end of the age. Amen.',
        epigraphRef: 'MATTHEW 28:20 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXX: PEACE, BE STILL'
      },
      'peace-be-still': {
        title: 'AMEN GATE · PEACE, BE STILL COMPLETED',
        epigraph: 'Don’t be amazed. You seek Jesus, the Nazarene, who has been crucified. He has risen! Go, tell his disciples and Peter.',
        epigraphRef: 'MARK 16:6–7 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXXI: COME AND SEE'
      },
      'come-and-see': {
        title: 'AMEN GATE · COME AND SEE COMPLETED',
        epigraph: 'Jesus said to them, “Come and eat breakfast.” — These are written, that you may believe that Jesus is the Christ, the Son of God.',
        epigraphRef: 'JOHN 20:31 & 21:12 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXXII: TO THE ENDS OF THE EARTH'
      },
      'out-of-the-whirlwind': {
        title: 'AMEN GATE · OUT OF THE WHIRLWIND COMPLETED',
        epigraph: 'I had heard of you by the hearing of the ear, but now my eye sees you.',
        epigraphRef: 'JOB 42:5 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XIII: PLANTED BY THE WATER'
      },
      'a-future-and-a-hope': {
        title: 'AMEN GATE · A FUTURE AND A HOPE COMPLETED',
        epigraph: 'For I know the thoughts that I think toward you, says Yahweh, thoughts of peace, and not of evil, to give you hope and a future.',
        epigraphRef: 'JEREMIAH 29:11 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXII: NEW EVERY MORNING'
      },
      'new-every-morning': {
        title: 'AMEN GATE · NEW EVERY MORNING COMPLETED',
        epigraph: 'They are new every morning. Great is your faithfulness — Turn us to yourself, Yahweh, and we will be turned. Renew our days as of old.',
        epigraphRef: 'LAMENTATIONS 3:23 & 5:21 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXIII: CAN THESE BONES LIVE'
      },
      'a-door-of-hope': {
        title: 'AMEN GATE · A DOOR OF HOPE COMPLETED',
        epigraph: 'I will give her vineyards from there, and the valley of Achor for a door of hope — And the kingdom will be Yahweh’s.',
        epigraphRef: 'HOSEA 2:15 & OBADIAH 1:21 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXVI: OUT OF THE DEEP'
      },
      'can-these-bones-live': {
        title: 'AMEN GATE · CAN THESE BONES LIVE COMPLETED',
        epigraph: 'Everything will live wherever the river comes — and the name of the city from that day shall be, “Yahweh is there.”',
        epigraphRef: 'EZEKIEL 47:9 & 48:35 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXIV: GREATLY BELOVED'
      },
      'out-of-the-deep': {
        title: 'AMEN GATE · OUT OF THE DEEP COMPLETED',
        epigraph: 'Salvation belongs to Yahweh! — Shouldn’t I be concerned for Nineveh, that great city?',
        epigraphRef: 'JONAH 2:9 & 4:11 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXVII: THE DAY OF SMALL THINGS'
      },
      'the-day-of-small-things': {
        title: 'AMEN GATE · THE DAY OF SMALL THINGS COMPLETED',
        epigraph: 'Not by might, nor by power, but by my Spirit — But to you who fear my name shall the sun of righteousness arise with healing in its wings.',
        epigraphRef: 'ZECHARIAH 4:6 & MALACHI 4:2 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXVIII: GOOD NEWS OF GREAT JOY'
      },
      'to-the-ends-of-the-earth': {
        title: 'AMEN GATE · TO THE ENDS OF THE EARTH COMPLETED',
        epigraph: 'Preaching the Kingdom of God, and teaching the things concerning the Lord Jesus Christ with all boldness, without hindrance.',
        epigraphRef: 'ACTS 28:31 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXXIII: NOTHING CAN SEPARATE'
      },
      'nothing-can-separate': {
        title: 'AMEN GATE · NOTHING CAN SEPARATE COMPLETED',
        epigraph: 'Nor height, nor depth, nor any other created thing will be able to separate us from God’s love which is in Christ Jesus our Lord.',
        epigraphRef: 'ROMANS 8:39 & 15:13 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXXIV: TREASURE IN CLAY JARS'
      },
      'treasure-in-clay-jars': {
        title: 'AMEN GATE · TREASURE IN CLAY JARS COMPLETED',
        epigraph: 'We have this treasure in clay vessels — My grace is sufficient for you, for my power is made perfect in weakness.',
        epigraphRef: '2 CORINTHIANS 4:7 & 12:9 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXXV: ROOTED AND FREE'
      },
      'rooted-and-free': {
        title: 'AMEN GATE · ROOTED AND FREE COMPLETED',
        epigraph: 'Being rooted and grounded in love — take up the whole armor of God, and having done all, to stand.',
        epigraphRef: 'EPHESIANS 3:17 & 6:13 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXXVI: JOY IN CHAINS'
      },
      'joy-in-chains': {
        title: 'AMEN GATE · JOY IN CHAINS COMPLETED',
        epigraph: 'Rejoice in the Lord always! And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus.',
        epigraphRef: 'PHILIPPIANS 4:4–7 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXXVII: HELD TOGETHER'
      },
      'held-together': {
        title: 'AMEN GATE · HELD TOGETHER COMPLETED',
        epigraph: 'He is before all things, and in him all things are held together — no longer as a slave, but more than a slave, a beloved brother.',
        epigraphRef: 'COLOSSIANS 1:17 & PHILEMON 1:16 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXXVIII: CHILDREN OF THE DAY'
      },
      'children-of-the-day': {
        title: 'AMEN GATE · CHILDREN OF THE DAY COMPLETED',
        epigraph: 'You are all children of light and children of the day — Now may the Lord of peace himself give you peace at all times in all ways.',
        epigraphRef: '1 THESSALONIANS 5:5 & 2 THESSALONIANS 3:16 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XXXIX: GRACE, MERCY, AND PEACE'
      },
      'grace-mercy-and-peace': {
        title: 'AMEN GATE · GRACE, MERCY, AND PEACE COMPLETED',
        epigraph: 'I have fought the good fight. I have finished the course. I have kept the faith — For the grace of God has appeared, bringing salvation to all men.',
        epigraphRef: '2 TIMOTHY 4:7 & TITUS 2:11 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XL: ANCHOR OF THE SOUL'
      },
      'anchor-of-the-soul': {
        title: 'AMEN GATE · ANCHOR OF THE SOUL COMPLETED',
        epigraph: 'This hope we have as an anchor of the soul, a hope both sure and steadfast — looking to Jesus, the author and perfecter of faith.',
        epigraphRef: 'HEBREWS 6:19 & 12:2 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XLI: DOERS OF THE WORD'
      },
      'doers-of-the-word': {
        title: 'AMEN GATE · DOERS OF THE WORD COMPLETED',
        epigraph: 'Be doers of the word, and not only hearers — The fruit of righteousness is sown in peace by those who make peace.',
        epigraphRef: 'JAMES 1:22 & 3:18 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XLII: A LIVING HOPE'
      },
      'our-eyes-are-on-you': {
        title: 'AMEN GATE · OUR EYES ARE ON YOU COMPLETED',
        epigraph: 'We don’t know what to do, but our eyes are on you — Yahweh your God is with you; let him go up!',
        epigraphRef: '2 CHRONICLES 20:12 & 36:23 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT X: RISE UP AND BUILD'
      },
      'rise-up-and-build': {
        title: 'AMEN GATE · RISE UP AND BUILD COMPLETED',
        epigraph: 'So we built the wall… Don’t be grieved, for the joy of Yahweh is your strength.',
        epigraphRef: 'NEHEMIAH 4:6 & 8:10 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XI: FOR SUCH A TIME AS THIS'
      },
      'for-such-a-time-as-this': {
        title: 'AMEN GATE · FOR SUCH A TIME AS THIS COMPLETED',
        epigraph: 'Who knows if you haven’t come to the kingdom for such a time as this? — The Jews had light and gladness, joy and honor.',
        epigraphRef: 'ESTHER 4:14 & 8:16 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XII: OUT OF THE WHIRLWIND'
      },
      'the-beginning-of-wisdom': {
        title: 'AMEN GATE · THE BEGINNING OF WISDOM COMPLETED',
        epigraph: 'Trust in Yahweh with all your heart… Keep your heart with all diligence, for out of it is the wellspring of life.',
        epigraphRef: 'PROVERBS 3:5 & 4:23 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XVIII: ETERNITY IN THEIR HEARTS'
      },
      'eternity-in-their-hearts': {
        title: 'AMEN GATE · ETERNITY IN THEIR HEARTS COMPLETED',
        epigraph: 'He has made everything beautiful in its time. He has also set eternity in their hearts.',
        epigraphRef: 'ECCLESIASTES 3:11 & 12:13 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XIX: MANY WATERS'
      },
      'many-waters': {
        title: 'AMEN GATE · MANY WATERS COMPLETED',
        epigraph: 'Set me as a seal on your heart… Many waters can’t quench love, neither can floods drown it.',
        epigraphRef: 'SONG OF SONGS 8:6–7 · APPROACH & PRESS [E] TO CONTINUE TO DISTRICT XX: ARISE, SHINE'
      },
      'all-things-new': {
        title: 'AMEN GATE · ALL THINGS NEW COMPLETED',
        epigraph: 'Yes, come, Lord Jesus — The grace of the Lord Jesus be with all the saints. Amen.',
        epigraphRef: 'REVELATION 22:20–21 · APPROACH & PRESS [E] TO KINDLE THE GREAT LANTERN'
      }
    };

    const lastPart = manifest.parts && manifest.parts.length
      ? manifest.parts[manifest.parts.length - 1]
      : { epigraph: 'The word of our God stands forever.' };
    const dynamicAmenCfg = {
      title: `AMEN GATE · ${manifest.title.toUpperCase()} COMPLETED`,
      epigraph: lastPart.epigraph || manifest.subtitle,
      epigraphRef: 'APPROACH & PRESS [E] TO COMPLETE THIS BOOK & CONTINUE THE PILGRIMAGE'
    };

    const amenArch = this.createPartBannerArch({
      index: 5,
      ...(amenConfigs[slug] || dynamicAmenCfg)
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
  async buildGatehouseHubWorld(routeData, coversData, saveData, playableRouteSlugs, isDistrictUnlockedFn = null) {
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
      const isUnlocked = internalSlug ? (isDistrictUnlockedFn ? isDistrictUnlockedFn(internalSlug) : true) : false;
      const isPlayable = isUnlocked;
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

      // Upgrade 1: Mount each book's 3D Hero Relic landmark on a Sanctuary Pedestal beside its Book Gate!
      const primaryRelic = internalSlug && this.propBuilder.tripo
        ? this.propBuilder.tripo.getDistrictPrimaryRelicInfo(internalSlug)
        : null;
      let relicPedestal = null;
      if (primaryRelic && primaryRelic.id) {
        relicPedestal = this.createHeroRelicSanctuaryPedestal(
          {
            id: primaryRelic.id,
            scale: 0.72,
            yOffset: 0.24,
            deferLoad: i >= 8
          },
          { ground: '#85755e', accent: '#ebd09a' }
        );
        relicPedestal.scale.setScalar(0.58);
        const rx = gx + (isLeft ? 2.15 : -2.15);
        const rz = gz + 1.52;
        relicPedestal.position.set(rx, 0, rz);
        relicPedestal.lookAt(0, 0.5, rz + 1.2);
        hubGroup.add(relicPedestal);
      }

      gateNodes.push({
        routeItem: d,
        bookData: d,
        internalSlug,
        playableSlug: internalSlug,
        isPlayable,
        isCompleted,
        relicId: primaryRelic ? primaryRelic.id : null,
        relicTitle: primaryRelic ? primaryRelic.title : null,
        relicPedestal,
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
      group: hubGroup,
      hubGroup,
      gateNodes,
      riverMat: poolMat,
      poolMat,
      minZ: -112,
      maxZ: 14
    };
  }

  createHeroRelicSanctuaryPedestal(relicCfg, pal = {}) {
    const THREE = this.THREE;
    const outer = new THREE.Group();
    outer.name = `HeroRelicPedestal_${relicCfg.id}`;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#786a56',
      accentColor: pal.accent || '#e6c687',
      roughness: 0.86,
      bumpScale: 0.05
    });
    const goldMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.accent || '#dfb870',
      accentColor: '#fff1c2',
      roughness: 0.42
    });

    // Stepped sanctuary plinth grounded at y = 0
    const basePlinth = new THREE.Mesh(
      this.propBuilder.displaceGeometry(new THREE.CylinderGeometry(1.18, 1.38, 0.24, 20), 0.02, 3.0),
      stoneMat
    );
    basePlinth.position.y = 0.12;
    basePlinth.userData.keepWithGlb = true;
    outer.add(basePlinth);

    const trimRing = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.032, 10, 32), goldMat);
    trimRing.rotation.x = Math.PI / 2;
    trimRing.position.y = 0.24;
    trimRing.userData.keepWithGlb = true;
    outer.add(trimRing);

    // Carved brass & limestone inscription plaque on the front of the sanctuary pedestal (+Z facing the street)
    const plaqueStand = new THREE.Mesh(
      this.propBuilder.displaceGeometry(new THREE.BoxGeometry(0.68, 0.24, 0.14, 3, 2, 2), 0.01, 2.5),
      stoneMat
    );
    plaqueStand.position.set(0, 0.18, 1.24);
    plaqueStand.rotation.x = -0.36;
    plaqueStand.userData.keepWithGlb = true;
    outer.add(plaqueStand);

    const brassFace = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.03), goldMat);
    brassFace.position.set(0, 0.20, 1.30);
    brassFace.rotation.x = -0.36;
    brassFace.userData.keepWithGlb = true;
    outer.add(brassFace);

    const mountGroup = new THREE.Group();
    if (relicCfg.royalCushion) {
      // Royal Persian lapis-and-gold fringed cushion base for Esther's Golden Scepter
      const cushionMat = this.painterly.createPainterlyMaterial({
        baseColor: '#2c4a7a',
        accentColor: pal.accent || '#f0c86e',
        roughness: 0.68
      });
      const cushion = new THREE.Mesh(
        this.propBuilder.displaceGeometry(new THREE.BoxGeometry(1.15, 0.22, 1.15, 6, 3, 6), 0.025, 3.2),
        cushionMat
      );
      cushion.position.y = 0.32;
      cushion.userData.keepWithGlb = true;
      outer.add(cushion);

      const cordRim = new THREE.Mesh(
        this.propBuilder.displaceGeometry(new THREE.BoxGeometry(1.22, 0.06, 1.22, 4, 2, 4), 0.015, 2.5),
        goldMat
      );
      cordRim.position.y = 0.32;
      cordRim.userData.keepWithGlb = true;
      outer.add(cordRim);

      // Angle the king's extended golden scepter upward from the royal cushion
      mountGroup.rotation.x = -0.62;
    }

    outer.add(mountGroup);

    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountRelic(mountGroup, relicCfg.id, {
        scale: relicCfg.scale || 1.0,
        yOffset: relicCfg.yOffset ?? 0.24,
        deferLoad: Boolean(relicCfg.deferLoad)
      });
    }

    return outer;
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

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

      this.dressPaintingSurroundings(streetGroup, worldX, worldY, worldZ, side, p, slug, biomeCfg);

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
        slug !== 'come-and-see'
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
      'arise-shine': 'DISTRICT XX · ARISE, SHINE — ISAIAH',
      'greatly-beloved': 'DISTRICT XXIV · GREATLY BELOVED — DANIEL',
      'good-news-of-great-joy': 'DISTRICT XXVIII · GOOD NEWS OF GREAT JOY — LUKE',
      'i-am-with-you-always': 'DISTRICT XXIX · I AM WITH YOU ALWAYS — MATTHEW',
      'peace-be-still': 'DISTRICT XXX · PEACE, BE STILL — MARK',
      'come-and-see': 'DISTRICT XXXI · COME AND SEE — JOHN',
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
          z: -218.0,
          lateral: 6.0,
          height: 1.72,
          veilZ: -254.0
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

      gateNodes.push({
        routeItem: d,
        bookData: d,
        internalSlug,
        playableSlug: internalSlug,
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
        yOffset: relicCfg.yOffset ?? 0.24
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

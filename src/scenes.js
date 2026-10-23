// ============================================================================
// THE PILGRIM WALK — Step-Through Scene Builder (§2 & §6, Komorebi Upgrade)
// Builds the three full-quality prototype scenes of Genesis directly from
// Timothy Holt's paintings with Komorebi atmospheric depth:
//   - Layered parallax silhouettes & carved relief backdrop
//   - Animated reflective water with sun glints & shoreline foam
//   - Thousands of wind-swaying instanced grass & wildflower tufts
//   - Angled 3D volumetric sunbeam / god-ray cones filtering through canopies
//   - Floating river lanterns & glowing golden threshold rings
// ============================================================================

import { createKomorebiWaterMaterial } from './postprocess.js?v=44_2';

export class StepThroughSceneManager {
  constructor(THREE, painterly, propBuilder) {
    this.THREE = THREE;
    this.painterly = painterly;
    this.propBuilder = propBuilder;
    this.activeScene = null;
  }

  buildStepThroughWorld(paintingData, rawTexture, skyDome, districtSlug = 'genesis') {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const n = paintingData.n;
    const pal = paintingData.palette || {};
    const kind = paintingData.sceneKind || paintingData.sceneType || (n === 1 ? 'light' : n === 4 ? 'garden' : 'bow');

    // Derive depth map, 360° outpainted surround texture, ground texture, prop texture & multi-plane cutouts from the painting
    const img = rawTexture.image;
    const derived = this.painterly.deriveSceneMapsFromImage(img, kind);

    // 1. Update Sky Dome to match this painting's sampled sky/horizon/ground/accent colors
    skyDome.material.uniforms.uTopColor.value.set(pal.top || '#312f2b');
    skyDome.material.uniforms.uHorizonColor.value.set(pal.horizon || '#88765c');
    skyDome.material.uniforms.uGroundColor.value.set(pal.ground || '#504232');
    skyDome.material.uniforms.uAccentColor.value.set(pal.accent || '#dbb87b');
    skyDome.material.uniforms.uStarIntensity.value =
      (kind === 'light' || kind === 'passover' || kind === 'tabernacle') ? 0.55 : 0.0;
    skyDome.material.uniforms.uRainbowIntensity.value = kind === 'bow' ? 0.48 : 0.0;

    // 2. 360° Outpainted Painterly Surround Cylinder (the player stands *inside* the extended painting)
    const surroundRadius = 48;
    const surroundHeight = 36;
    const surroundGeo = new THREE.CylinderGeometry(surroundRadius, surroundRadius, surroundHeight, 64, 24, true);
    const pos = surroundGeo.attributes.position;
    const uv = surroundGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i);
      const v = uv.getY(i);
      const wave = Math.sin(u * Math.PI * 8) * 1.8 + Math.cos(v * Math.PI * 4) * 1.2;
      const radScale = (surroundRadius - wave * (1.0 - Math.abs(v - 0.5))) / surroundRadius;
      pos.setX(i, pos.getX(i) * radScale);
      pos.setZ(i, pos.getZ(i) * radScale);
    }
    surroundGeo.computeVertexNormals();

    const surroundMat = new THREE.MeshBasicMaterial({
      map: derived.panoTex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.90
    });
    const surroundMesh = new THREE.Mesh(surroundGeo, surroundMat);
    surroundMesh.position.y = surroundHeight * 0.36;
    group.add(surroundMesh);

    // 3. Wrap-Around 200° Curved 3D Sculpted Painting Amphitheater + Multi-Plane Walk-Through Painting Wings
    // So stepping through the frame surrounds the player with the actual layered artwork of this exact painting!
    const dioramaGroup = this.createLayeredPaintingDiorama(rawTexture, derived, pal);
    group.add(dioramaGroup);

    // 4. Sculpted Painterly Terrain Floor derived from the bottom of the painting
    const terrainGeo = new THREE.PlaneGeometry(92, 92, 72, 72);
    terrainGeo.rotateX(-Math.PI / 2);
    const tPos = terrainGeo.attributes.position;
    const getTerrainHeight = (x, z) => {
      const distFromWalkway = Math.sqrt(x * x + z * z);
      if (kind === 'light') {
        const shoreMask = smoothstep(-4, 6, x + z * 0.35);
        return shoreMask * (0.35 + Math.sin(x * 0.3) * 0.15) - (1.0 - shoreMask) * 0.28;
      } else if (kind === 'garden') {
        const treeHill = Math.exp(-((x - 4.5) * (x - 4.5) + (z + 6.5) * (z + 6.5)) / 38.0) * 0.85;
        return treeHill + Math.sin(x * 0.18) * Math.cos(z * 0.18) * 0.22 * smoothstep(2, 14, distFromWalkway);
      } else {
        const arkRidge = smoothstep(-2, 18, x - z * 0.4) * 2.4;
        const altarSlope = Math.exp(-((x + 3.5) * (x + 3.5) + (z + 5.5) * (z + 5.5)) / 28.0) * 0.55;
        return arkRidge * smoothstep(4, 16, distFromWalkway) + altarSlope;
      }
    };

    for (let i = 0; i < tPos.count; i++) {
      const x = tPos.getX(i);
      const z = tPos.getZ(i);
      tPos.setY(i, getTerrainHeight(x, z));
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = this.painterly.createPainterlyMaterial({
      map: derived.groundTex,
      baseColor: pal.ground || '#686050',
      accentColor: pal.accent || '#d9b08b',
      roughness: kind === 'bow' ? 0.52 : 0.88,
      bumpScale: 0.06
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    group.add(terrainMesh);

    // 5. Low-lying Komorebi Mist / Valley Fog Planes drifting softly above the ground/water
    const mistGroup = this.createValleyMistLayers(pal.horizon || '#cfc3ac', pal.accent || '#dbb87b');
    group.add(mistGroup);

    // 6. THE ORIGINAL PAINTING ANCHOR & UNMISSABLE LIT EXIT DOORWAY (§5 & §6)
    const anchorGroup = new THREE.Group();
    anchorGroup.position.set(-2.6, 0, 3.8);
    anchorGroup.rotation.y = Math.PI - 0.25;
    const anchorMonument = this.propBuilder.createPaintingMonument(paintingData, rawTexture, false);
    anchorGroup.add(anchorMonument);
    group.add(anchorGroup);

    const exitDoorway = this.createLitExitDoorway(pal);
    exitDoorway.position.set(2.2, 0, 4.2);
    exitDoorway.rotation.y = Math.PI + 0.15;
    group.add(exitDoorway);

    // 7. Floating Golden Pollen / Light Motes sampled from the painting's accent color
    const motes = this.createAtmosphericMotes(pal.accent || '#ffe4a8', 220);
    group.add(motes);

    // 8. SCENE-SPECIFIC SIGNATURE INTERACTABLE ELEMENTS (§6 Bench Principle)
    let signatureState = {};
    if (kind === 'light') {
      signatureState = this.populateGenesis1LightScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'garden') {
      signatureState = this.populateGenesis4SeventhDayScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'bow') {
      signatureState = this.populateGenesis11RainbowScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'bush') {
      signatureState = this.populateExodus5BurningBushScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'passover') {
      signatureState = this.populateExodus14PassoverScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'redsea') {
      signatureState = this.populateExodus20RedSeaScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'tabernacle') {
      signatureState = this.populateExodus40TabernacleScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'altar_fire') {
      signatureState = this.populateFireByNightAltarScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'menorah') {
      signatureState = this.populateFireByNightMenorahScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'rock_water') {
      signatureState = this.populateFireByNightRockWaterScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'bronze_serpent') {
      signatureState = this.populateFireByNightBronzeSerpentScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'mezuzah') {
      signatureState = this.populateChooseLifeDoorpostScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'sheaf') {
      signatureState = this.populateChooseLifeForgottenSheafScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'two_roads') {
      signatureState = this.populateChooseLifeTwoRoadsScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'nebo') {
      signatureState = this.populateChooseLifeNeboScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'scarlet_line') {
      signatureState = this.populateJoshuaScarletLineScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'jordan_stones') {
      signatureState = this.populateJoshuaJordanStonesScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'jericho_walls') {
      signatureState = this.populateJoshuaJerichoShofarScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'torches_jars') {
      signatureState = this.populateJudgesTorchesJarsScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'ruth_road') {
      signatureState = this.populateRuthRoadScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'ruth_gleaning') {
      signatureState = this.populateRuthGleaningScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'threshing_cloak') {
      signatureState = this.populateRuthThreshingCloakScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'kinsman_sandal') {
      signatureState = this.populateRuthKinsmanSandalScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'samuel_lamp') {
      signatureState = this.populateSamuelLampScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'anointing_horn') {
      signatureState = this.populateSamuelAnointingHornScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'five_smooth_stones') {
      signatureState = this.populateSamuelSmoothStonesScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'kings_table') {
      signatureState = this.populateSamuelKingsTableScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'temple_cloud') {
      signatureState = this.populateKingsTempleCloudScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'carmel_fire') {
      signatureState = this.populateKingsCarmelFireScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'still_small_voice') {
      signatureState = this.populateKingsStillSmallVoiceScene(group, derived, pal, getTerrainHeight);
    } else if (kind === 'chariots_of_fire') {
      signatureState = this.populateKingsChariotsOfFireScene(group, derived, pal, getTerrainHeight);
    } else {
      signatureState = this.populateBook9To44StepThroughScene(
        kind,
        paintingData,
        group,
        derived,
        pal,
        getTerrainHeight,
        skyDome,
        districtSlug
      );
    }

    // For Book 1-8 custom scenes that don't go through populateBook9To44StepThroughScene,
    // also mount a scene-specific 3D GLB model at the signatureTarget if one exists in assets/models/scenes/<slug>-<n>.glb
    if (
      this.propBuilder &&
      this.propBuilder.tripo &&
      districtSlug &&
      paintingData &&
      paintingData.n &&
      signatureState &&
      signatureState.signatureTarget &&
      ![
        'light', 'garden', 'bow', 'bush', 'passover', 'redsea', 'tabernacle',
        'altar_fire', 'menorah', 'rock_water', 'bronze_serpent',
        'mezuzah', 'sheaf', 'two_roads', 'nebo', 'jordan_stones', 'jericho_walls',
        'ruth_gleaning', 'samuel_lamp', 'five_smooth_stones', 'temple_cloud', 'carmel_fire'
      ].includes(kind)
    ) {
      const customSceneGlbHolder = new THREE.Group();
      customSceneGlbHolder.position.copy(signatureState.signatureTarget);
      group.add(customSceneGlbHolder);
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        customSceneGlbHolder,
        districtSlug,
        paintingData.n,
        { targetHeight: 3.0, yOffset: 0.25 }
      );
    }

    return {
      group,
      kind,
      paintingData,
      exitPosition: new THREE.Vector3(2.2, 0, 4.2),
      anchorPosition: new THREE.Vector3(-2.6, 0, 3.8),
      motes,
      mistGroup,
      ...signatureState
    };
  }

  // ==========================================================================
  // LAYERED 3D PAINTING DIORAMA (Curved 3D Relief Amphitheater + Walk-Through Wings)
  // Surrounds the pilgrim with multi-plane 3D artwork extracted from the exact painting
  // ==========================================================================
  createLayeredPaintingDiorama(rawTexture, derived, pal) {
    const THREE = this.THREE;
    const dGroup = new THREE.Group();

    // 1. 210° Wrap-Around Curved 3D Sculpted Painting Amphitheater
    // Instead of a flat distant rectangle, the painting wraps around the front, left, and right
    const radius = 14.8;
    const height = 17.5;
    const arcGeo = new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      96,
      48,
      true,
      Math.PI * 0.42,
      Math.PI * 1.16
    );
    // Flip U horizontally so inside of cylinder shows painting right-way-round
    const arcUv = arcGeo.attributes.uv;
    for (let i = 0; i < arcUv.count; i++) {
      arcUv.setX(i, 1.0 - arcUv.getX(i));
    }
    const arcMat = new THREE.MeshStandardMaterial({
      map: rawTexture,
      displacementMap: derived.depthTex,
      displacementScale: -2.4,
      displacementBias: 0.8,
      roughness: 0.78,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);
    arcMesh.position.set(0, height * 0.44 - 0.5, -2.2);
    dGroup.add(arcMesh);

    // 2. Multi-Plane Walk-Through 3D Painting Cutout Wings (Left & Right Foreground & Midground)
    const makeWing = (tex, w, h, x, y, z, rotY, dispScale = 1.1) => {
      if (!tex) return;
      const geo = new THREE.PlaneGeometry(w, h, 40, 40);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        displacementMap: derived.depthTex,
        displacementScale: dispScale,
        displacementBias: -dispScale * 0.4,
        roughness: 0.80,
        metalness: 0.04,
        transparent: true,
        alphaTest: 0.03,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotY;
      dGroup.add(mesh);
    };

    // Near foreground left & right painting wings (player walks right between them)
    makeWing(derived.leftWingTex, 7.2, 9.2, -5.6, 4.1, -3.0, 0.42, 1.05);
    makeWing(derived.rightWingTex, 7.2, 9.2, 5.6, 4.1, -3.0, -0.42, 1.05);

    // Mid-depth left & right painting wings framing the central sanctuary
    makeWing(derived.midLeftTex, 8.8, 10.8, -6.8, 4.8, -7.8, 0.34, 1.35);
    makeWing(derived.midRightTex, 8.8, 10.8, 6.8, 4.8, -7.8, -0.34, 1.35);

    // Deep-mid framing wings behind the central sculpture
    makeWing(derived.leftWingTex, 9.5, 11.5, -5.2, 5.2, -11.6, 0.20, 1.55);
    makeWing(derived.rightWingTex, 9.5, 11.5, 5.2, 5.2, -11.6, -0.20, 1.55);

    // 3. Overhead Painted Canopy / Vault Arch from the top of the painting
    if (derived.canopyArchTex) {
      const archVaultGeo = new THREE.PlaneGeometry(18.0, 9.5, 36, 24);
      const vPos = archVaultGeo.attributes.position;
      for (let i = 0; i < vPos.count; i++) {
        const vx = vPos.getX(i);
        const vy = vPos.getY(i);
        // Curve gently downward at the left/right edges like a vaulted ceiling
        const drop = (vx * vx) * 0.045;
        vPos.setZ(i, -drop + Math.sin(vy * 0.5) * 0.3);
      }
      archVaultGeo.computeVertexNormals();
      const archVaultMat = new THREE.MeshStandardMaterial({
        map: derived.canopyArchTex,
        roughness: 0.85,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide
      });
      const archVault = new THREE.Mesh(archVaultGeo, archVaultMat);
      archVault.rotation.x = Math.PI * 0.44;
      archVault.position.set(0, 8.6, -5.4);
      dGroup.add(archVault);
    }

    // 4. Sculpted Painting-Textured Foreground Rock Outcrops / Sanctuary Plinth Stones along the sides
    const outcropMat = this.painterly.createPainterlyMaterial({
      map: derived.propTex,
      baseColor: pal.ground || '#5c4e3e',
      accentColor: pal.accent || '#deb878',
      roughness: 0.88,
      bumpScale: 0.08
    });
    const outcropCoords = [
      { x: -4.4, z: -2.2, sx: 1.5, sy: 0.9, sz: 1.3 },
      { x: 4.5, z: -2.4, sx: 1.6, sy: 0.85, sz: 1.4 },
      { x: -5.8, z: -5.6, sx: 2.1, sy: 1.35, sz: 1.7 },
      { x: 5.9, z: -5.5, sx: 2.0, sy: 1.30, sz: 1.6 },
      { x: -4.8, z: -9.4, sx: 2.4, sy: 1.65, sz: 1.9 },
      { x: 4.9, z: -9.2, sx: 2.3, sy: 1.60, sz: 1.8 }
    ];
    outcropCoords.forEach((oc, idx) => {
      const geo = this.propBuilder.displaceGeometry(
        new THREE.DodecahedronGeometry(1.0, 2),
        0.14,
        2.4 + idx * 0.3
      );
      const mesh = new THREE.Mesh(geo, outcropMat);
      mesh.position.set(oc.x, oc.sy * 0.42, oc.z);
      mesh.scale.set(oc.sx, oc.sy, oc.sz);
      mesh.rotation.y = idx * 1.1;
      dGroup.add(mesh);
    });

    // Warm gallery stage lights illuminating the curved painting wings
    const leftWingLight = new THREE.PointLight(pal.accent || 0xffe29c, 1.6, 22);
    leftWingLight.position.set(-4.5, 4.2, -4.5);
    dGroup.add(leftWingLight);

    const rightWingLight = new THREE.PointLight(pal.accent || 0xffe29c, 1.6, 22);
    rightWingLight.position.set(4.5, 4.2, -4.5);
    dGroup.add(rightWingLight);

    return dGroup;
  }

  // Creates drifting translucent Komorebi valley mist layers hugging the ground/water
  createValleyMistLayers(hexHorizon, hexAccent) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const mistTex = this.painterly.createGlowSpriteTexture(hexHorizon);

    for (let i = 0; i < 18; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: mistTex,
          color: new THREE.Color(hexHorizon).lerp(new THREE.Color(hexAccent), (i % 3) * 0.25),
          transparent: true,
          opacity: 0.16,
          depthWrite: false
        })
      );
      const ang = (i / 18) * Math.PI * 2;
      const rad = 7 + (i % 4) * 4.5;
      sp.position.set(Math.cos(ang) * rad, 0.85 + (i % 3) * 0.45, Math.sin(ang) * rad - 4.0);
      sp.scale.set(14 + (i % 3) * 5, 3.2, 1);
      group.add(sp);
    }
    return group;
  }

  // Creates the unmissable, warmly lit Exit Portal Archway back to the street (§5b)
  createLitExitDoorway(pal) {
    const THREE = this.THREE;
    const doorGroup = new THREE.Group();

    const archMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8f754f',
      accentColor: '#ffe4a0',
      roughness: 0.7,
      emissive: '#3d2c14',
      emissiveIntensity: 0.4
    });

    for (const sx of [-1.1, 1.1]) {
      const postGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(0.32, 3.4, 0.36, 4, 10, 4), 0.025, 3.5);
      const post = new THREE.Mesh(postGeo, archMat);
      post.position.set(sx, 1.7, 0);
      doorGroup.add(post);
    }
    const lintelGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(2.7, 0.34, 0.42, 8, 3, 4), 0.025, 3.5);
    const lintel = new THREE.Mesh(lintelGeo, archMat);
    lintel.position.set(0, 3.5, 0);
    doorGroup.add(lintel);

    const portalGeo = new THREE.PlaneGeometry(2.05, 3.3);
    const portalMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color('#ffe29c') }
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
        varying vec2 vUv;
        void main() {
          float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) * smoothstep(0.0, 0.15, vUv.y);
          float ripple = 0.5 + 0.5 * sin((vUv.y * 10.0 - uTime * 2.0) + sin(vUv.x * 8.0));
          float alpha = (0.32 + 0.20 * ripple) * edge;
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    });
    const portalPlane = new THREE.Mesh(portalGeo, portalMat);
    portalPlane.position.set(0, 1.68, 0);
    doorGroup.add(portalPlane);
    doorGroup.userData.portalMat = portalMat;

    const exitLight = new THREE.PointLight(0xffdfa0, 2.4, 14);
    exitLight.position.set(0, 2.6, 0.6);
    doorGroup.add(exitLight);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = '#2b2319';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#d9b471';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#f7e9cd';
    ctx.font = 'bold 30px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('← BACK TO THE STREET', 256, 58);
    ctx.fillStyle = '#dbb87b';
    ctx.font = '22px Georgia, serif';
    ctx.fillText('Walk through or press [E] / [Esc]', 256, 96);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 0.58),
      new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
    );
    signMesh.position.set(0, 4.05, 0.06);
    doorGroup.add(signMesh);

    return doorGroup;
  }

  // ==========================================================================
  // SCENE 1: Genesis No. 1 — "let there be" (Genesis 1:1–3)
  // ==========================================================================
  populateGenesis1LightScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Dark primordial water plane with animated golden wave reflections & sparkles
    const waterGeo = new THREE.PlaneGeometry(88, 88, 72, 72);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#16191e',
      shallowColor: '#3a342a',
      sunColor: '#f7d388',
      opacity: 0.92
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.y = -0.04;
    group.add(waterMesh);

    // Floating lights/lanterns on the primordial water surface leading toward the First Light column
    const floatingOrbs = [];
    for (let i = 0; i < 9; i++) {
      const lantern = this.propBuilder.createFloatingRiverLantern('#ffe29c');
      const ang = (i / 9) * Math.PI * 1.4 - 2.2;
      const rad = 4.5 + (i % 3) * 3.8;
      lantern.position.set(-1.2 + Math.cos(ang) * rad, -0.02, -8.5 + Math.sin(ang) * rad);
      group.add(lantern);
      floatingOrbs.push(lantern);
    }

    // 2. Foreground shoreline props matching Timothy's painting No. 1
    const shoreProps = this.propBuilder.createStoneBench(derived.propTex, pal);
    shoreProps.position.set(2.8, -0.22, -2.5);
    shoreProps.rotation.y = -0.5;
    group.add(shoreProps);

    // Shepherd's lean-to tent shelter on the right embankment
    const tentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d684d',
      accentColor: '#c9a978',
      roughness: 0.94,
      side: THREE.DoubleSide
    });
    const tentGeo = this.propBuilder.displaceGeometry(new THREE.ConeGeometry(2.1, 2.3, 4, 6, true), 0.06, 2.5);
    const tent = new THREE.Mesh(tentGeo, tentMat);
    tent.position.set(5.4, 1.15, -4.2);
    tent.rotation.y = 0.6;
    group.add(tent);

    // Shoreline wind-swaying reeds/grass on the right embankment
    const shoreGrass = this.propBuilder.createInstancedMeadowGrass(
      260,
      () => {
        const x = 1.5 + Math.random() * 14.0;
        const z = -12.0 + Math.random() * 16.0;
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(shoreGrass);

    // 3. SIGNATURE ELEMENT: The Column of First Light breaking onto the deep at (-1.2, 0, -8.5)
    const columnPos = new THREE.Vector3(-1.2, 0, -8.5);
    const columnGroup = new THREE.Group();
    columnGroup.position.copy(columnPos);

    const beamGeo = new THREE.CylinderGeometry(1.2, 2.8, 28, 32, 1, true);
    const beamMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.62 },
        uColor: { value: new THREE.Color('#ffe4a3') }
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
        uniform float uIntensity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float vFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
          float shimmer = 0.75 + 0.25 * sin(vUv.y * 18.0 - uTime * 2.2 + cos(vUv.x * 12.0));
          gl_FragColor = vec4(uColor, vFade * shimmer * uIntensity * 0.52);
        }
      `
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.position.y = 13.5;
    columnGroup.add(beamMesh);

    const innerGeo = new THREE.CylinderGeometry(0.48, 1.2, 28, 24, 1, true);
    const innerMesh = new THREE.Mesh(innerGeo, beamMat);
    innerMesh.position.y = 13.5;
    columnGroup.add(innerMesh);

    // Concentric golden light rings on the water surface
    const ringGeo = new THREE.RingGeometry(0.6, 3.8, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe4a3,
      transparent: true,
      opacity: 0.44,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.08;
    columnGroup.add(ringMesh);

    const dawnLight = new THREE.PointLight(0xffe29c, 2.8, 42);
    dawnLight.position.set(0, 3.5, 0);
    columnGroup.add(dawnLight);

    group.add(columnGroup);

    return {
      signatureTarget: columnPos,
      signatureRadius: 4.2,
      signatureLabel: 'Step into the Column of First Light',
      signatureActivatedText: '“God said, ‘Let there be light,’ and there was light.” — First dawn spreads across the deep.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        beamMat.uniforms.uTime.value = time;

        floatingOrbs.forEach((orb, idx) => {
          orb.position.y = -0.02 + Math.sin(time * 1.8 + idx) * 0.04;
        });

        const inLight = distToSignature < 4.2;
        if (inLight) this._dawnLatched = Math.min(1.0, (this._dawnLatched || 0) + dt * 0.45);
        const curDawn = this._dawnLatched || 0;

        beamMat.uniforms.uIntensity.value = 0.62 + curDawn * 0.78;
        dawnLight.intensity = 2.8 + curDawn * 4.8;
        ringMesh.scale.setScalar(1.0 + curDawn * 0.85 + Math.sin(time * 2.0) * 0.08);

        skyDome.material.uniforms.uTopColor.value.lerpColors(
          new THREE.Color('#23221f'),
          new THREE.Color('#635847'),
          curDawn
        );
        skyDome.material.uniforms.uHorizonColor.value.lerpColors(
          new THREE.Color('#705f48'),
          new THREE.Color('#e6c07e'),
          curDawn
        );
        skyDome.material.uniforms.uStarIntensity.value = 0.35 + curDawn * 0.65;
        return inLight || curDawn > 0.85;
      }
    };
  }

  // ==========================================================================
  // SCENE 2: Genesis No. 4 — "the seventh day" (Genesis 2:1–3)
  // Full Komorebi Golden-Hour Garden:
  //   - Shimmering Komorebi river on the left with floating lanterns & arched stone footbridge
  //   - Grove of olive & oak trees framing the Great Tree of the Seventh Day
  //   - 900+ wind-swaying golden meadow grass & wildflower tufts
  //   - Volumetric Komorebi sunbeam shafts slanting through the branches onto the Stone Bench
  // ==========================================================================
  populateGenesis4SeventhDayScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Shimmering Komorebi river on the left horizon (matching painting No. 4)
    const riverGeo = new THREE.PlaneGeometry(54, 22, 48, 48);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#695c49',
      shallowColor: '#b89a78',
      sunColor: '#ffdfa3',
      opacity: 0.90
    });
    const river = new THREE.Mesh(riverGeo, riverMat);
    river.position.set(-11, 0.04, -12.5);
    group.add(river);

    // Arched stone footbridge over the river edge & floating river lanterns
    const bridge = this.propBuilder.createStoneFootbridge(pal);
    bridge.position.set(-8.5, 0.0, -9.5);
    bridge.rotation.y = 0.45;
    group.add(bridge);

    const riverLanterns = [];
    for (let i = 0; i < 6; i++) {
      const l = this.propBuilder.createFloatingRiverLantern('#ffe09e');
      l.position.set(-14 + i * 2.6, 0.06, -12.5 + Math.sin(i * 1.5) * 2.2);
      group.add(l);
      riverLanterns.push(l);
    }

    // 2. THE GREAT TREE OF THE SEVENTH DAY on the gentle rise + surrounding olive grove
    const treePos = new THREE.Vector3(3.4, 0.4, -6.8);
    const greatTree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.42);
    if (this.propBuilder && this.propBuilder.tripo) {
      this.propBuilder.tripo.mountRelic(greatTree, 'sabbath-olive-tree', { scale: 1.0, yOffset: 0 });
    }
    greatTree.position.copy(treePos);
    group.add(greatTree);

    // Secondary olive trees framing the meadow (giving rich 3D parallax like Komorebi's forest)
    const groveCoords = [
      { x: 10.5, z: -9.5, s: 0.95 },
      { x: -6.8, z: -5.2, s: 0.78 },
      { x: 8.8, z: -2.0, s: 0.82 },
      { x: -3.5, z: -15.5, s: 1.05 },
      { x: 6.5, z: -15.0, s: 0.90 }
    ];
    groveCoords.forEach((g) => {
      const t = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, g.s);
      t.position.set(g.x, getTerrainHeight(g.x, g.z), g.z);
      t.rotation.y = g.x * 0.7;
      group.add(t);
    });

    // 3. THE SIGNATURE ELEMENT: THE STONE BENCH UNDER THE GREAT TREE
    const benchPos = new THREE.Vector3(1.5, 0.35, -5.2);
    const stoneBench = this.propBuilder.createStoneBench(derived.propTex, pal);
    stoneBench.position.copy(benchPos);
    stoneBench.rotation.y = -0.35;
    group.add(stoneBench);

    // 4. Angled 3D Komorebi Sunbeam Shafts pouring through the Great Tree canopy onto the bench
    const sunShafts = [];
    for (let i = 0; i < 5; i++) {
      const shaft = this.propBuilder.createKomorebiSunbeamShaft(
        15,
        0.65,
        2.6,
        '#ffe0a3'
      );
      shaft.position.set(1.2 + (i - 2) * 1.35, 5.8, -5.4 + (i % 2) * 0.9);
      group.add(shaft);
      sunShafts.push(shaft);
    }

    const sabbathLight = new THREE.PointLight(0xffd794, 2.5, 25);
    sabbathLight.position.set(1.5, 3.4, -4.8);
    group.add(sabbathLight);

    // 5. 950 Wind-Swaying Instanced Golden Meadow Grass & Wildflower Tufts
    const meadowGrass = this.propBuilder.createInstancedMeadowGrass(
      950,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 1.8 + Math.pow(Math.random(), 0.75) * 17.5;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 3.5;
        // Leave a small clear footpath right around the bench & exit doorway
        if (Math.hypot(x - 1.5, z + 5.2) < 1.5 || Math.hypot(x, z - 2.2) < 1.8) {
          return { x: x + 3.2, y: getTerrainHeight(x + 3.2, z), z };
        }
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(meadowGrass);

    return {
      signatureTarget: benchPos,
      signatureRadius: 3.4,
      signatureLabel: 'Rest at the Stone Bench under the Great Tree',
      signatureActivatedText: '“God blessed the seventh day, and made it holy.” — You rest beneath the shade of the tree.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        riverMat.uniforms.uTime.value = time;
        if (cameraPos) riverMat.uniforms.uCameraPos.value.copy(cameraPos);

        riverLanterns.forEach((l, idx) => {
          l.position.y = 0.06 + Math.sin(time * 1.6 + idx) * 0.03;
          l.position.x += Math.sin(time * 0.3 + idx) * 0.002;
        });

        const isResting = distToSignature < 3.4;
        if (isResting) this._restLatched = Math.min(1.0, (this._restLatched || 0) + dt * 0.4);
        const restVal = this._restLatched || 0;

        sabbathLight.intensity = 2.5 + restVal * 2.4 + Math.sin(time * 1.5) * 0.2;
        sunShafts.forEach((sh, idx) => {
          sh.material.uniforms.uOpacity.value = (0.20 + restVal * 0.18) * (0.85 + 0.15 * Math.sin(time * 1.1 + idx));
        });
        return isResting || restVal > 0.85;
      }
    };
  }

  // ==========================================================================
  // SCENE 3: Genesis No. 11 — "the bow in the cloud" (Genesis 9:13–15)
  // ==========================================================================
  populateGenesis11RainbowScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Shining wet post-flood Komorebi water channel & reflective puddles in the valley floor
    const floodWaterGeo = new THREE.PlaneGeometry(46, 28, 40, 40);
    floodWaterGeo.rotateX(-Math.PI / 2);
    const floodWaterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#58635e',
      shallowColor: '#9ba398',
      sunColor: '#f5ead4',
      opacity: 0.88
    });
    const floodWater = new THREE.Mesh(floodWaterGeo, floodWaterMat);
    floodWater.position.set(-9.5, 0.04, -10.5);
    group.add(floodWater);

    // 2. Sculpted Timber Ark resting high on the right slope (matching painting No. 11)
    const arkGroup = new THREE.Group();
    const timberMat = this.painterly.createPainterlyMaterial({
      map: derived.propTex,
      baseColor: '#78664e',
      accentColor: '#b59f82',
      roughness: 0.92,
      bumpScale: 0.07
    });
    const hullGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(9.5, 2.6, 2.8, 16, 6, 6), 0.06, 2.0);
    const hull = new THREE.Mesh(hullGeo, timberMat);
    hull.position.y = 1.3;
    arkGroup.add(hull);
    const roofGeo = this.propBuilder.displaceGeometry(new THREE.BoxGeometry(8.6, 0.6, 2.2, 12, 2, 4), 0.04, 2.5);
    const roof = new THREE.Mesh(roofGeo, timberMat);
    roof.position.y = 2.8;
    arkGroup.add(roof);
    arkGroup.position.set(10.5, 2.1, -14.5);
    arkGroup.rotation.y = -0.45;
    arkGroup.rotation.z = 0.04;
    group.add(arkGroup);

    // 3. THE SIGNATURE ELEMENT: NOAH'S STONE ALTAR on the slope at (-2.4, 0.35, -5.8)
    const altarPos = new THREE.Vector3(-2.4, 0.35, -5.8);
    const stoneAltar = this.propBuilder.createStoneAltar(derived.propTex, pal);
    stoneAltar.position.copy(altarPos);
    group.add(stoneAltar);

    // Angled sunbeam shafts breaking through the post-storm clouds onto the Stone Altar
    const altarShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 3.0, '#fff0c4');
    altarShaft.position.set(-2.4, 6.2, -5.8);
    group.add(altarShaft);

    // Fresh green olive saplings & wind-swaying hillside grass after the rain
    const hillsideGrass = this.propBuilder.createInstancedMeadowGrass(
      650,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.2 + Math.random() * 15.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 3.0;
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(hillsideGrass);

    // 4. Great 3D Painterly Rainbow Arch spanning the sky over the valley & altar
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0, -1.5, -18.5);
    const bowColors = [0xd96b52, 0xe69d56, 0xe8cf6b, 0x7fb872, 0x6ba3c7, 0x8574b5];
    const bowMeshes = [];

    bowColors.forEach((hex, idx) => {
      const rInner = 16.5 + idx * 0.44;
      const rOuter = rInner + 0.50;
      const arcGeo = new THREE.RingGeometry(rInner, rOuter, 64, 1, 0.15, Math.PI - 0.3);
      const arcMat = new THREE.MeshBasicMaterial({
        color: hex,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const arc = new THREE.Mesh(arcGeo, arcMat);
      bowGroup.add(arc);
      bowMeshes.push(arc);
    });
    group.add(bowGroup);

    const altarLight = new THREE.PointLight(0xffe8b0, 2.0, 22);
    altarLight.position.set(-2.4, 2.5, -5.8);
    group.add(altarLight);

    return {
      signatureTarget: altarPos,
      signatureRadius: 3.6,
      signatureLabel: 'Approach the Stone Altar of Remembrance',
      signatureActivatedText: '“I set my rainbow in the cloud… when I see it, I will remember.” — The bow brightens across the sky.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        floodWaterMat.uniforms.uTime.value = time;
        if (cameraPos) floodWaterMat.uniforms.uCameraPos.value.copy(cameraPos);

        const nearAltar = distToSignature < 3.6;
        if (nearAltar) this._bowLatched = Math.min(1.0, (this._bowLatched || 0) + dt * 0.45);
        const bowVal = this._bowLatched || 0;

        skyDome.material.uniforms.uRainbowIntensity.value = 0.45 + bowVal * 0.55;
        bowMeshes.forEach((m, i) => {
          m.material.opacity = 0.25 + bowVal * 0.45 + Math.sin(time * 1.4 + i * 0.4) * 0.03;
        });
        altarLight.intensity = 2.0 + bowVal * 3.4;
        altarShaft.material.uniforms.uOpacity.value = 0.22 + bowVal * 0.25;
        if (stoneAltar.userData.emberSprite) {
          stoneAltar.userData.emberSprite.scale.setScalar(1.8 + bowVal * 1.4 + Math.sin(time * 3.0) * 0.15);
        }
        return nearAltar || bowVal > 0.85;
      }
    };
  }

  // ==========================================================================
  // EXODUS SCENE 1: Exodus No. 5 — "turn aside" (Exodus 3:1–3, The Burning Bush)
  // ==========================================================================
  populateExodus5BurningBushScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. Rocky Mount Horeb boulders and crags framing the slope
    const rockMat = this.painterly.createPainterlyMaterial({
      map: derived.propTex,
      baseColor: pal.ground || '#694e38',
      accentColor: pal.accent || '#f0b865',
      roughness: 0.92,
      bumpScale: 0.07
    });

    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      const rad = 6.5 + (i % 4) * 3.2;
      const rGeo = this.propBuilder.displaceGeometry(new THREE.DodecahedronGeometry(1.1 + (i % 3) * 0.65, 1), 0.12, 2.5);
      const rock = new THREE.Mesh(rGeo, rockMat);
      const rx = Math.cos(ang) * rad;
      const rz = Math.sin(ang) * rad - 5.5;
      rock.position.set(rx, getTerrainHeight(rx, rz) + 0.45, rz);
      rock.scale.set(1.3, 0.85 + (i % 3) * 0.35, 1.15);
      group.add(rock);
    }

    // 2. THE SIGNATURE ELEMENT: THE BURNING BUSH on Horeb's slope at (0.0, 0.35, -6.5)
    const bushPos = new THREE.Vector3(0.0, 0.35, -6.5);
    const burningBush = this.propBuilder.createBurningBush(derived.propTex, pal, 1.35);
    burningBush.position.copy(bushPos);
    group.add(burningBush);

    // Volumetric holy light shaft descending onto the Burning Bush
    const holyShaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.75, 3.2, '#ffd478');
    holyShaft.position.set(0.0, 6.8, -6.5);
    group.add(holyShaft);

    const bushLight = new THREE.PointLight(0xffb84d, 3.4, 30);
    bushLight.position.set(0.0, 2.5, -6.0);
    group.add(bushLight);

    return {
      signatureTarget: bushPos,
      signatureRadius: 4.0,
      signatureLabel: 'Turn aside to the Burning Bush on Holy Ground',
      signatureActivatedText: '“Take your sandals off your feet, for the place you stand on is holy ground.” — The bush burns and is not consumed.',
      updateScene: (dt, time, distToSignature) => {
        const nearBush = distToSignature < 4.0;
        if (nearBush) this._bushLatched = Math.min(1.0, (this._bushLatched || 0) + dt * 0.5);
        const val = this._bushLatched || 0;

        bushLight.intensity = 3.4 + val * 3.8 + Math.sin(time * 5.2) * 0.45;
        holyShaft.material.uniforms.uOpacity.value = 0.22 + val * 0.26;
        if (burningBush.userData.fireMat) {
          burningBush.userData.fireMat.uniforms.uIntensity.value = 1.15 + val * 0.65;
        }
        if (burningBush.userData.glowSprite) {
          burningBush.userData.glowSprite.scale.setScalar(5.2 + val * 2.2 + Math.sin(time * 4.0) * 0.25);
        }
        return nearBush || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // EXODUS SCENE 2: Exodus No. 14 — "when I see" (Exodus 12:7–13, Passover Doorway)
  // ==========================================================================
  populateExodus14PassoverScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;

    // 1. THE SIGNATURE ELEMENT: THE MARKED PASSOVER DOORWAY in Goshen at (0.0, 0.0, -6.2)
    const doorPos = new THREE.Vector3(0.0, 0.0, -6.2);
    const passoverDoor = this.propBuilder.createPassoverDoorway(derived.propTex, pal);
    passoverDoor.position.copy(doorPos);
    group.add(passoverDoor);

    // Neighboring Goshen mud-brick dwellings & date palms on left and right
    const wallMat = this.painterly.createPainterlyMaterial({
      map: derived.propTex,
      baseColor: '#4a3a2c',
      accentColor: '#8c6d50',
      roughness: 0.94
    });
    for (const sx of [-7.5, 7.5]) {
      const house = new THREE.Mesh(
        this.propBuilder.displaceGeometry(new THREE.BoxGeometry(4.5, 3.6, 3.8, 6, 6, 6), 0.05, 2.5),
        wallMat
      );
      house.position.set(sx, 1.8, -8.5);
      house.rotation.y = sx > 0 ? -0.35 : 0.35;
      group.add(house);
    }

    const thresholdLight = new THREE.PointLight(0xffcf78, 2.6, 22);
    thresholdLight.position.set(0, 2.4, -4.8);
    group.add(thresholdLight);

    const moonlightShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 2.8, '#e8d9b5');
    moonlightShaft.position.set(0, 6.2, -5.8);
    group.add(moonlightShaft);

    return {
      signatureTarget: doorPos,
      signatureRadius: 3.8,
      signatureLabel: 'Stand beneath the Blood-Marked Lintel & Doorposts',
      signatureActivatedText: '“When I see the blood, I will pass over you.” — Warm lamp-light shelters the household within.',
      updateScene: (dt, time, distToSignature) => {
        const nearDoor = distToSignature < 3.8;
        if (nearDoor) this._passoverLatched = Math.min(1.0, (this._passoverLatched || 0) + dt * 0.5);
        const val = this._passoverLatched || 0;

        thresholdLight.intensity = 2.6 + val * 3.2 + Math.sin(time * 2.8) * 0.2;
        if (passoverDoor.userData.lampSprite) {
          passoverDoor.userData.lampSprite.scale.set(2.8 + val * 1.4, 3.4 + val * 1.4, 1);
        }
        return nearDoor || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // EXODUS SCENE 3: Exodus No. 20 — "a road through" (Exodus 14:21–22, Red Sea Crossing)
  // ==========================================================================
  populateExodus20RedSeaScene(group, derived, pal) {
    const THREE = this.THREE;

    // 1. Towering Parted Walls of Water on the Left and Right of the dry seabed corridor
    const leftWall = this.propBuilder.createPartedSeaWall(44, 12.0, -1, pal);
    leftWall.position.set(-5.8, -0.2, -7.5);
    group.add(leftWall);

    const rightWall = this.propBuilder.createPartedSeaWall(44, 12.0, 1, pal);
    rightWall.position.set(5.8, -0.2, -7.5);
    group.add(rightWall);

    // 2. Reflective wet seabed puddles along the dry path through the sea
    const puddleGeo = new THREE.PlaneGeometry(9.5, 42, 32, 32);
    puddleGeo.rotateX(-Math.PI / 2);
    const puddleMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#264654',
      shallowColor: '#8c7758',
      sunColor: '#ffe29c',
      opacity: 0.55
    });
    const puddleMesh = new THREE.Mesh(puddleGeo, puddleMat);
    puddleMesh.position.set(0, 0.03, -7.5);
    group.add(puddleMesh);

    // 3. THE SIGNATURE ELEMENT: The Mid-Sea Threshold & Guiding Pillar of Fire at (0.0, 0.0, -8.5)
    const seaRoadPos = new THREE.Vector3(0.0, 0.0, -8.5);
    const dawnShaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.9, 3.6, '#ffe4a0');
    dawnShaft.position.set(0, 7.2, -9.5);
    group.add(dawnShaft);

    const seaLight = new THREE.PointLight(0xffe099, 3.0, 32);
    seaLight.position.set(0, 3.5, -8.5);
    group.add(seaLight);

    // Exposed seabed boulders & coral rocks along the base of the water walls
    const rockMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4c524e',
      accentColor: '#c9b38c',
      roughness: 0.85
    });
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const rock = new THREE.Mesh(
        this.propBuilder.displaceGeometry(new THREE.DodecahedronGeometry(0.45 + (i % 3) * 0.2, 1), 0.05, 3.5),
        rockMat
      );
      rock.position.set(side * (4.2 + (i % 3) * 0.5), 0.2, -16 + i * 2.2);
      rock.scale.set(1.3, 0.65, 1.1);
      group.add(rock);
    }

    return {
      signatureTarget: seaRoadPos,
      signatureRadius: 4.2,
      signatureLabel: 'Walk the Dry Road Between the Walls of the Sea',
      signatureActivatedText: '“The children of Israel went into the midst of the sea on the dry ground; and the waters were a wall to them on their right hand, and on their left.”',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        puddleMat.uniforms.uTime.value = time;
        if (cameraPos) puddleMat.uniforms.uCameraPos.value.copy(cameraPos);

        const inCorridor = distToSignature < 4.2;
        if (inCorridor) this._seaLatched = Math.min(1.0, (this._seaLatched || 0) + dt * 0.45);
        const val = this._seaLatched || 0;

        seaLight.intensity = 3.0 + val * 3.5;
        dawnShaft.material.uniforms.uOpacity.value = 0.24 + val * 0.25;
        return inCorridor || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // EXODUS SCENE 4: Exodus No. 40 — "moving in" (Exodus 40:34–38, Tabernacle & Pillar)
  // ==========================================================================
  populateExodus40TabernacleScene(group, derived, pal) {
    const THREE = this.THREE;

    // 1. THE SIGNATURE ELEMENT: THE TABERNACLE & PILLAR OF CLOUD AND FIRE at (0.0, 0.0, -9.5)
    const tabernaclePos = new THREE.Vector3(0.0, 0.0, -5.2);
    const tabernacle = this.propBuilder.createTabernacleAndPillar(derived.propTex, pal, 1.0);
    tabernacle.position.set(0.0, 0.0, -10.5);
    group.add(tabernacle);

    const gloryLight = new THREE.PointLight(0xffd885, 3.5, 38);
    gloryLight.position.set(0.0, 4.5, -7.5);
    group.add(gloryLight);

    // Floating golden incense/fire lanterns flanking the forecourt approach
    for (const sx of [-2.8, 2.8]) {
      for (let z = -3.5; z >= -7.5; z -= 4.0) {
        const lantern = this.propBuilder.createFloatingRiverLantern('#ffe094');
        lantern.position.set(sx, 0.08, z);
        group.add(lantern);
      }
    }

    return {
      signatureTarget: tabernaclePos,
      signatureRadius: 4.2,
      signatureLabel: 'Approach the Forecourt of the Tabernacle & Pillar of Fire',
      signatureActivatedText: '“Then the cloud covered the Tent of Meeting, and Yahweh’s glory filled the tabernacle.” — The Pillar of Cloud and Fire shines over the camp.',
      updateScene: (dt, time, distToSignature) => {
        const nearTent = distToSignature < 4.2;
        if (nearTent) this._tentLatched = Math.min(1.0, (this._tentLatched || 0) + dt * 0.45);
        const val = this._tentLatched || 0;

        gloryLight.intensity = 3.5 + val * 4.2 + Math.sin(time * 3.2) * 0.35;
        if (tabernacle.userData.pillarMat) {
          tabernacle.userData.pillarMat.uniforms.uIntensity.value = 1.15 + val * 0.65;
        }
        if (tabernacle.userData.glorySprite) {
          tabernacle.userData.glorySprite.scale.setScalar(9.5 + val * 3.5 + Math.sin(time * 2.5) * 0.35);
        }
        return nearTent || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // FIRE BY NIGHT SCENE 1: No. 5 — "it shall not go out" (Leviticus 6:12–13)
  // ==========================================================================
  populateFireByNightAltarScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const altarPos = new THREE.Vector3(0.0, 0.0, -6.2);
    const altar = this.propBuilder.createPerpetualFireAltar(derived.propTex, pal);
    altar.position.copy(altarPos);
    group.add(altar);

    const dawnShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 3.0, '#ffd480');
    dawnShaft.position.set(0, 6.5, -6.2);
    group.add(dawnShaft);

    const fireLight = new THREE.PointLight(0xffb854, 3.2, 26);
    fireLight.position.set(0, 2.6, -6.2);
    group.add(fireLight);

    return {
      signatureTarget: altarPos,
      signatureRadius: 4.0,
      signatureLabel: 'Tend the Morning Wood on the Altar of Perpetual Fire',
      signatureActivatedText: '“The fire on the altar shall be kept burning on it, it shall not go out; and the priest shall burn wood on it every morning.”',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._altarLatched = Math.min(1.0, (this._altarLatched || 0) + dt * 0.5);
        const val = this._altarLatched || 0;
        fireLight.intensity = 3.2 + val * 3.5 + Math.sin(time * 4.5) * 0.35;
        if (altar.userData.fireMat) {
          altar.userData.fireMat.uniforms.uIntensity.value = 1.15 + val * 0.7;
        }
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // FIRE BY NIGHT SCENE 2: No. 21 — "seven lamps" (Numbers 8:2–3)
  // ==========================================================================
  populateFireByNightMenorahScene(group, derived, pal) {
    const THREE = this.THREE;
    const menorahPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const menorah = this.propBuilder.createGoldenMenorah(derived.propTex, pal);
    menorah.position.copy(menorahPos);
    group.add(menorah);

    const lampLight = new THREE.PointLight(0xffe094, 3.0, 24);
    lampLight.position.set(0, 2.8, -5.2);
    group.add(lampLight);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(14, 0.65, 2.8, '#ffe29c');
    shaft.position.set(0, 5.8, -5.8);
    group.add(shaft);

    return {
      signatureTarget: menorahPos,
      signatureRadius: 3.8,
      signatureLabel: 'Stand Before the Seven Lamps Shining Forward',
      signatureActivatedText: '“The seven lamps shall give light in front of the lamp stand.” — A light is not for looking at; it’s for seeing by.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 3.8;
        if (near) this._menorahLatched = Math.min(1.0, (this._menorahLatched || 0) + dt * 0.5);
        const val = this._menorahLatched || 0;
        lampLight.intensity = 3.0 + val * 3.4 + Math.sin(time * 3.2) * 0.2;
        if (menorah.userData.flameSprites) {
          menorah.userData.flameSprites.forEach((sp, idx) => {
            const s = 0.55 + val * 0.32 + Math.sin(time * 5.0 + idx) * 0.05;
            sp.scale.set(s, s * 1.35, 1);
          });
        }
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // FIRE BY NIGHT SCENE 3: No. 32 — "abundantly" (Numbers 20:11)
  // ==========================================================================
  populateFireByNightRockWaterScene(group, derived, pal) {
    const THREE = this.THREE;
    const rockPos = new THREE.Vector3(0.0, 0.0, -7.2);
    const crag = this.propBuilder.createWaterFromRockCrag(derived.propTex, pal);
    crag.position.copy(rockPos);
    group.add(crag);

    // Gushing turquoise desert stream flowing toward the player
    const streamGeo = new THREE.PlaneGeometry(5.5, 22, 32, 32);
    streamGeo.rotateX(-Math.PI / 2);
    const streamMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#1f5a6e',
      shallowColor: '#6cb8c4',
      sunColor: '#fff2cc',
      opacity: 0.88
    });
    const stream = new THREE.Mesh(streamGeo, streamMat);
    stream.position.set(0, 0.05, -2.5);
    group.add(stream);

    const waterLight = new THREE.PointLight(0xa8e8f0, 2.6, 24);
    waterLight.position.set(0, 2.8, -5.5);
    group.add(waterLight);

    return {
      signatureTarget: new THREE.Vector3(0.0, 0.0, -4.8),
      signatureRadius: 4.0,
      signatureLabel: 'Drink from the Water Pouring Abundantly from the Rock',
      signatureActivatedText: '“Water came out abundantly, and the congregation drank.” — God did not let the people go thirsty.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        streamMat.uniforms.uTime.value = time;
        if (cameraPos) streamMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.0;
        if (near) this._rockWaterLatched = Math.min(1.0, (this._rockWaterLatched || 0) + dt * 0.5);
        return near || (this._rockWaterLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // FIRE BY NIGHT SCENE 4: No. 33 — "look and live" (Numbers 21:8–9)
  // ==========================================================================
  populateFireByNightBronzeSerpentScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const polePos = new THREE.Vector3(0.0, 0.0, -6.5);
    const pole = this.propBuilder.createBronzeSerpentPole(derived.propTex, pal);
    pole.position.copy(polePos);
    group.add(pole);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.75, 3.2, '#ffe298');
    shaft.position.set(0, 6.8, -6.5);
    group.add(shaft);

    const bronzeLight = new THREE.PointLight(0xffd478, 3.0, 28);
    bronzeLight.position.set(0, 4.5, -5.5);
    group.add(bronzeLight);

    return {
      signatureTarget: polePos,
      signatureRadius: 4.2,
      signatureLabel: 'Lift Your Eyes to the Bronze Serpent on the Pole',
      signatureActivatedText: '“When he looked at the serpent of bronze, he lived.” — Turn your eyes, and live.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._serpentLatched = Math.min(1.0, (this._serpentLatched || 0) + dt * 0.5);
        const val = this._serpentLatched || 0;
        bronzeLight.intensity = 3.0 + val * 3.6;
        if (pole.userData.glow) {
          pole.userData.glow.scale.setScalar(3.2 + val * 2.0 + Math.sin(time * 2.5) * 0.2);
        }
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // CHOOSE LIFE SCENE 1: No. 10 — "the doorpost" (Deuteronomy 6:6–9)
  // ==========================================================================
  populateChooseLifeDoorpostScene(group, derived, pal) {
    const THREE = this.THREE;
    const doorPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const doorpost = this.propBuilder.createMezuzahDoorpost(derived.propTex, pal);
    doorpost.position.copy(doorPos);
    group.add(doorpost);

    const oliveTree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 0.92);
    oliveTree.position.set(4.5, 0.0, -7.2);
    group.add(oliveTree);

    const doorLight = new THREE.PointLight(0xffe09c, 2.8, 22);
    doorLight.position.set(0, 2.4, -4.8);
    group.add(doorLight);

    return {
      signatureTarget: doorPos,
      signatureRadius: 3.8,
      signatureLabel: 'Touch the Words Written on the Doorpost',
      signatureActivatedText: '“You shall write them on the door posts of your house and on your gates.” — Faith isn’t a room in the house; it’s the doorway to all of them.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 3.8;
        if (near) this._mezuzahLatched = Math.min(1.0, (this._mezuzahLatched || 0) + dt * 0.5);
        const val = this._mezuzahLatched || 0;
        doorLight.intensity = 2.8 + val * 3.0;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // CHOOSE LIFE SCENE 2: No. 25 — "the forgotten sheaf" (Deuteronomy 24:19–21)
  // ==========================================================================
  populateChooseLifeForgottenSheafScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const sheafPos = new THREE.Vector3(1.2, 0.0, -5.8);
    const sheaf = this.propBuilder.createForgottenSheafField(derived.propTex, pal);
    sheaf.position.copy(sheafPos);
    group.add(sheaf);

    const oliveTree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.15);
    oliveTree.position.set(-3.8, 0.0, -6.5);
    group.add(oliveTree);

    const wheatField = this.propBuilder.createInstancedMeadowGrass(
      880,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.0 + Math.random() * 15.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight(x, z), z, scale: 0.9 + Math.random() * 0.55 };
      },
      { ground: '#a68546', accent: '#f5d88c', horizon: pal.horizon || '#ccb288' }
    );
    group.add(wheatField);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 3.0, '#ffe49c');
    shaft.position.set(1.2, 6.2, -5.8);
    group.add(shaft);

    return {
      signatureTarget: sheafPos,
      signatureRadius: 3.8,
      signatureLabel: 'Pause Beside the Forgotten Sheaf Left for the Stranger',
      signatureActivatedText: '“It shall be for the foreigner, for the fatherless, and for the widow.” — What you forget is how God remembers them.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 3.8;
        if (near) this._sheafLatched = Math.min(1.0, (this._sheafLatched || 0) + dt * 0.5);
        return near || (this._sheafLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // CHOOSE LIFE SCENE 3: No. 30 — "choose" (Deuteronomy 30:19–20, Two Roads Fork)
  // ==========================================================================
  populateChooseLifeTwoRoadsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const forkPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const fork = this.propBuilder.createTwoRoadsForkAndWitness(derived.propTex, pal);
    fork.position.copy(forkPos);
    group.add(fork);

    // Lush olive trees & golden sunbeams along the right-hand Road of Life
    for (let i = 0; i < 3; i++) {
      const tree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 0.85 + i * 0.1);
      tree.position.set(5.2 + i * 1.8, 0, -6.5 - i * 3.5);
      group.add(tree);
    }

    const lifeShaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.8, 3.2, '#ffe49c');
    lifeShaft.position.set(3.2, 6.5, -8.5);
    group.add(lifeShaft);

    const grass = this.propBuilder.createInstancedMeadowGrass(
      520,
      () => {
        const x = 1.0 + Math.random() * 14.0;
        const z = -16.0 + Math.random() * 16.0;
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(grass);

    return {
      signatureTarget: forkPos,
      signatureRadius: 4.0,
      signatureLabel: 'Stand at the Stone of Witness & Choose the Road of Life',
      signatureActivatedText: '“I have set before you life and death, the blessing and the curse. Therefore choose life, that you may live.”',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._chooseLatched = Math.min(1.0, (this._chooseLatched || 0) + dt * 0.5);
        const val = this._chooseLatched || 0;
        lifeShaft.material.uniforms.uOpacity.value = 0.22 + val * 0.26;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // CHOOSE LIFE SCENE 4: No. 35 — "Nebo" (Deuteronomy 34:1–4, Mount Nebo Overlook)
  // ==========================================================================
  populateChooseLifeNeboScene(group, derived, pal) {
    const THREE = this.THREE;
    const neboPos = new THREE.Vector3(0.0, 0.4, -6.0);

    // Rocky Mount Nebo summit ledge + Moses' staff resting on the cairn
    const cairn = this.propBuilder.createStoneAltar(derived.propTex, pal);
    cairn.position.copy(neboPos);
    group.add(cairn);

    // Winding Jordan River shimmering in the valley below
    const jordanGeo = new THREE.PlaneGeometry(64, 18, 48, 32);
    jordanGeo.rotateX(-Math.PI / 2);
    const jordanMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#3a5d66',
      shallowColor: '#b59d78',
      sunColor: '#ffe4a3',
      opacity: 0.88
    });
    const jordan = new THREE.Mesh(jordanGeo, jordanMat);
    jordan.position.set(0, -0.35, -15.5);
    group.add(jordan);

    const vistaShaft = this.propBuilder.createKomorebiSunbeamShaft(18, 0.9, 3.8, '#ffe6a3');
    vistaShaft.position.set(0, 7.2, -10.5);
    group.add(vistaShaft);

    return {
      signatureTarget: neboPos,
      signatureRadius: 4.0,
      signatureLabel: 'Look Out from Mount Nebo Across the Promised Land',
      signatureActivatedText: '“I have caused you to see it with your eyes… Gilead to Dan, Judah to the sea, the palms of Jericho.” — A promise you know will be kept.',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        jordanMat.uniforms.uTime.value = time;
        if (cameraPos) jordanMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.0;
        if (near) this._neboLatched = Math.min(1.0, (this._neboLatched || 0) + dt * 0.5);
        return near || (this._neboLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT V (JOSHUA & JUDGES) SCENE 1: No. 3 — "the scarlet line" (Joshua 2:8–21)
  // ==========================================================================
  populateJoshuaScarletLineScene(group, derived, pal) {
    const THREE = this.THREE;
    const wallPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const rahab = this.propBuilder.createRahabScarletWindowWall();
    rahab.group.position.copy(wallPos);
    group.add(rahab.group);

    for (const sx of [-4.2, 4.2]) {
      const palm = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 0.9);
      palm.position.set(sx, 0, -6.5);
      group.add(palm);
    }

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 2.8, '#ffcfb0');
    shaft.position.set(0.1, 6.2, -5.5);
    group.add(shaft);

    return {
      signatureTarget: wallPos,
      signatureRadius: 4.0,
      signatureLabel: 'Touch the Scarlet Cord Knotted in the Window',
      signatureActivatedText: '“Then she tied the scarlet line in the window.” — A woman on the wall tying a red thread like a knot in a promise: remember me, remember my house.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._scarletLatched = Math.min(1.0, (this._scarletLatched || 0) + dt * 0.5);
        const val = this._scarletLatched || 0;
        rahab.cordLight.intensity = 1.6 + val * 2.4 + Math.sin(time * 3.0) * 0.2;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT V (JOSHUA & JUDGES) SCENE 2: No. 6 — "what these stones mean" (Joshua 4:1–24)
  // ==========================================================================
  populateJoshuaJordanStonesScene(group, derived, pal) {
    const THREE = this.THREE;
    const cairnPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const cairn = this.propBuilder.createTwelveJordanStones();
    cairn.group.position.copy(cairnPos);
    group.add(cairn.group);

    // Shimmering Jordan river shallows around the 12 stones
    const waterGeo = new THREE.PlaneGeometry(36, 18, 32, 32);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = createKomorebiWaterMaterial(THREE, {
      deepColor: '#365459',
      shallowColor: '#8fa69e',
      sunColor: '#ffe4a8',
      opacity: 0.86
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, 0.04, -8.5);
    group.add(water);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.75, 3.0, '#ffe4a3');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    return {
      signatureTarget: cairnPos,
      signatureRadius: 4.0,
      signatureLabel: 'Place Your Hand on the Twelve Stones from the Jordan Riverbed',
      signatureActivatedText: '“What do these stones mean? … Israel came over this Jordan on dry land.”',
      updateScene: (dt, time, distToSignature, skyDome, cameraPos) => {
        waterMat.uniforms.uTime.value = time;
        if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        const near = distToSignature < 4.0;
        if (near) this._jordanStonesLatched = Math.min(1.0, (this._jordanStonesLatched || 0) + dt * 0.5);
        cairn.cairnLight.intensity = 1.8 + (this._jordanStonesLatched || 0) * 2.5;
        return near || (this._jordanStonesLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT V (JOSHUA & JUDGES) SCENE 3: No. 10 — "the wall fell down flat" (Joshua 6:15–20)
  // ==========================================================================
  populateJoshuaJerichoShofarScene(group, derived, pal) {
    const THREE = this.THREE;
    const shofarPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const shofar = this.propBuilder.createJerichoShofarAndFallenStones();
    shofar.group.position.copy(shofarPos);
    group.add(shofar.group);

    const oliveTree = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.05);
    oliveTree.position.set(-4.2, 0, -7.2);
    group.add(oliveTree);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(17, 0.8, 3.2, '#ffe49e');
    shaft.position.set(0, 6.4, -5.6);
    group.add(shaft);

    return {
      signatureTarget: shofarPos,
      signatureRadius: 4.0,
      signatureLabel: 'Sound the Ram’s Horn Shofar Among the Fallen Stones of Jericho',
      signatureActivatedText: '“The people shouted with a great shout, and the wall fell down flat.” — Not pushed. Not climbed. Just told.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._shofarLatched = Math.min(1.0, (this._shofarLatched || 0) + dt * 0.5);
        shofar.hornLight.intensity = 1.8 + (this._shofarLatched || 0) * 2.8;
        return near || (this._shofarLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT V (JOSHUA & JUDGES) SCENE 4: No. 33 — "torches in jars" (Judges 7:16–21)
  // ==========================================================================
  populateJudgesTorchesJarsScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const jarPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const gideon = this.propBuilder.createGideonBrokenPitcherAndTorch();
    gideon.group.position.copy(jarPos);
    group.add(gideon.group);

    // Circle of 12 distant blazing torches around the valley rim ("three hundred small lights blazing all at once")
    const rimLights = [];
    const glowTex = this.painterly.createGlowSpriteTexture('#ffae42');
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 1.4 - Math.PI * 1.2;
      const rad = 14.5;
      const x = Math.cos(ang) * rad;
      const z = Math.sin(ang) * rad - 4.0;
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffc466,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending
        })
      );
      sp.position.set(x, getTerrainHeight(x, z) + 1.2, z);
      sp.scale.set(1.4, 1.8, 1);
      group.add(sp);
      rimLights.push(sp);
    }

    return {
      signatureTarget: jarPos,
      signatureRadius: 4.0,
      signatureLabel: 'Stand by the Broken Clay Pitcher & Blazing Torch',
      signatureActivatedText: '“They broke the pitchers, and held the torches in their left hands… Sometimes the light only gets out when the jar breaks.”',
      updateScene: (dt, time, distToSignature, skyDome) => {
        const near = distToSignature < 4.0;
        if (near) this._gideonLatched = Math.min(1.0, (this._gideonLatched || 0) + dt * 0.5);
        const val = this._gideonLatched || 0;
        if (skyDome && skyDome.material.uniforms.uStarIntensity) {
          skyDome.material.uniforms.uStarIntensity.value = 0.65 + val * 0.35;
        }
        gideon.torchLight.intensity = 2.8 + val * 3.2 + Math.sin(time * 6.0) * 0.35;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VI (RUTH) SCENE 1: No. 4 — "where you go" (Ruth 1:14–17)
  // ==========================================================================
  populateRuthRoadScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const roadPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const fork = this.propBuilder.createRuthRoadForkAndMilestone();
    fork.group.position.copy(roadPos);
    group.add(fork.group);

    for (const sx of [-3.8, 4.2]) {
      const olive = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 0.95);
      olive.position.set(sx, 0, -6.8);
      group.add(olive);
    }

    const grass = this.propBuilder.createInstancedMeadowGrass(
      480,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 3.0 + Math.random() * 14.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight(x, z), z };
      },
      pal
    );
    group.add(grass);

    return {
      signatureTarget: roadPos,
      signatureRadius: 4.0,
      signatureLabel: 'Walk the Bethlehem Road Beside Naomi & Ruth',
      signatureActivatedText: '“Where you go, I will go; and where you stay, I will stay; your people shall be my people, and your God my God.”',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._ruthRoadLatched = Math.min(1.0, (this._ruthRoadLatched || 0) + dt * 0.5);
        fork.roadLight.intensity = 1.8 + (this._ruthRoadLatched || 0) * 2.5;
        return near || (this._ruthRoadLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VI (RUTH) SCENE 2: No. 8 — "the edges" (Ruth 2:2–7)
  // ==========================================================================
  populateRuthGleaningScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const sheafPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const sheaf = this.propBuilder.createForgottenSheafField(derived.propTex, pal);
    sheaf.position.copy(sheafPos);
    group.add(sheaf);

    const barleyField = this.propBuilder.createInstancedMeadowGrass(
      920,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.0 + Math.random() * 15.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight(x, z), z, scale: 0.95 + Math.random() * 0.55 };
      },
      { ground: '#b08f4f', accent: '#f7de94', horizon: pal.horizon || '#d4ba8c' }
    );
    group.add(barleyField);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.75, 3.2, '#ffe6a3');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    return {
      signatureTarget: sheafPos,
      signatureRadius: 4.0,
      signatureLabel: 'Gather Golden Barley at the Field’s Edge',
      signatureActivatedText: '“Let me glean and gather after the reapers among the sheaves.” — Not ashamed to begin with leftovers; so much grace starts at the edges.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._ruthGleanLatched = Math.min(1.0, (this._ruthGleanLatched || 0) + dt * 0.5);
        return near || (this._ruthGleanLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VI (RUTH) SCENE 3: No. 15 — "the corner of the cloak" (Ruth 3:9)
  // ==========================================================================
  populateRuthThreshingCloakScene(group, derived, pal) {
    const THREE = this.THREE;
    const cloakPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const threshing = this.propBuilder.createThreshingFloorCloak();
    threshing.group.position.copy(cloakPos);
    group.add(threshing.group);

    const moonShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.7, 3.0, '#ffe8b0');
    moonShaft.position.set(0.3, 6.2, -5.6);
    group.add(moonShaft);

    return {
      signatureTarget: cloakPos,
      signatureRadius: 4.0,
      signatureLabel: 'Stand by the Starlit Threshing Floor & Kinsman’s Cloak',
      signatureActivatedText: '“Spread the corner of your garment over your servant; for you are a near kinsman.” — Sometimes God’s wings look like a person willing to be the answer.',
      updateScene: (dt, time, distToSignature, skyDome) => {
        const near = distToSignature < 4.0;
        if (near) this._ruthCloakLatched = Math.min(1.0, (this._ruthCloakLatched || 0) + dt * 0.5);
        const val = this._ruthCloakLatched || 0;
        if (skyDome && skyDome.material.uniforms.uStarIntensity) {
          skyDome.material.uniforms.uStarIntensity.value = 0.75 + val * 0.25;
        }
        threshing.cloakLight.intensity = 1.8 + val * 2.6;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VI (RUTH) SCENE 4: No. 20 — "the sandal" (Ruth 4:6–8)
  // ==========================================================================
  populateRuthKinsmanSandalScene(group, derived, pal) {
    const THREE = this.THREE;
    const sandalPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const gateSandal = this.propBuilder.createBethlehemGateAndSandal();
    gateSandal.group.position.copy(sandalPos);
    group.add(gateSandal.group);

    const olive = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.0);
    olive.position.set(3.8, 0, -6.5);
    group.add(olive);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.75, 3.0, '#ffe49e');
    shaft.position.set(0, 6.2, -5.3);
    group.add(shaft);

    return {
      signatureTarget: sandalPos,
      signatureRadius: 4.0,
      signatureLabel: 'Witness the Kinsman’s Sandal of Redemption at the Gate',
      signatureActivatedText: '“A man took off his sandal, and gave it to his neighbor.” — One man kept his inheritance safe; the other gave himself away, and his is the name we still say.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._ruthSandalLatched = Math.min(1.0, (this._ruthSandalLatched || 0) + dt * 0.5);
        gateSandal.sandalLight.intensity = 1.8 + (this._ruthSandalLatched || 0) * 2.8;
        return near || (this._ruthSandalLatched || 0) > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VII (1–2 SAMUEL) SCENE 1: No. 6 — "speak" (1 Samuel 3:1–10)
  // ==========================================================================
  populateSamuelLampScene(group, derived, pal) {
    const THREE = this.THREE;
    const lampPos = new THREE.Vector3(0.0, 0.0, -5.4);
    const lampRig = this.propBuilder.createSamuelLampAndMat();
    lampRig.group.position.copy(lampPos);
    group.add(lampRig.group);

    // Hannah's little linen robe table nearby in Shiloh sanctuary
    const robeTable = this.propBuilder.createLinenRobeTable();
    robeTable.position.set(2.8, 0, -6.4);
    robeTable.rotation.y = -0.35;
    group.add(robeTable);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.72, 2.8, '#ffda85');
    shaft.position.set(0.2, 6.2, -5.4);
    group.add(shaft);

    return {
      signatureTarget: lampPos,
      signatureRadius: 4.0,
      signatureLabel: 'Kneel Beside the Lamp That Had Not Gone Out',
      signatureActivatedText: '“Speak; for your servant hears.” — The lamp had not yet gone out, and God was not waiting for him to be older, only to be listening.',
      updateScene: (dt, time, distToSignature, skyDome) => {
        const near = distToSignature < 4.0;
        if (near) this._samuelLampLatched = Math.min(1.0, (this._samuelLampLatched || 0) + dt * 0.5);
        const val = this._samuelLampLatched || 0;
        const pulse = 1.0 + Math.sin(time * 5.2) * 0.12;
        lampRig.lampLight.intensity = (2.2 + val * 3.0) * pulse;
        lampRig.flameMesh.scale.set(1.0 + val * 0.3, (1.0 + val * 0.45) * pulse, 1.0 + val * 0.3);
        if (skyDome && skyDome.material.uniforms.uStarIntensity) {
          skyDome.material.uniforms.uStarIntensity.value = 0.65 + val * 0.25;
        }
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VII (1–2 SAMUEL) SCENE 2: No. 15 — "the youngest" (1 Samuel 16:6–13)
  // ==========================================================================
  populateSamuelAnointingHornScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const hornPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const hornRig = this.propBuilder.createAnointingHornPedestal();
    hornRig.group.position.copy(hornPos);
    group.add(hornRig.group);

    // David's harp leaning near an olive tree on the Bethlehem pasture ridge
    const harp = this.propBuilder.createDavidHarp(1.1);
    harp.position.set(-2.4, 0, -5.2);
    harp.rotation.y = 0.4;
    group.add(harp);

    const olive = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, 1.05);
    olive.position.set(3.9, 0, -7.2);
    group.add(olive);

    const pastureGrass = this.propBuilder.createInstancedMeadowGrass(
      800,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.2 + Math.random() * 14.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight ? getTerrainHeight(x, z) : 0, z, scale: 0.85 + Math.random() * 0.45 };
      },
      pal
    );
    group.add(pastureGrass);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.78, 3.1, '#ffe28c');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    return {
      signatureTarget: hornPos,
      signatureRadius: 4.0,
      signatureLabel: 'Lift the Horn of Anointing Oil in the Shepherd’s Field',
      signatureActivatedText: '“Man looks at the outward appearance, but Yahweh looks at the heart.” — The whole feast stood waiting until the youngest came in from the sheep.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._samuelHornLatched = Math.min(1.0, (this._samuelHornLatched || 0) + dt * 0.5);
        const val = this._samuelHornLatched || 0;
        hornRig.hornLight.intensity = 2.1 + val * 2.8;
        hornRig.hornGroup.position.y = 0.84 + Math.sin(time * 2.2) * 0.03 * (1 + val);
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VII (1–2 SAMUEL) SCENE 3: No. 18 — "five smooth stones" (1 Samuel 17:40–50)
  // ==========================================================================
  populateSamuelSmoothStonesScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const brookPos = new THREE.Vector3(0.0, 0.0, -5.5);
    const brookRig = this.propBuilder.createSmoothStonesBrook();
    brookRig.group.position.copy(brookPos);
    group.add(brookRig.group);

    const valleyGrass = this.propBuilder.createInstancedMeadowGrass(
      760,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.8 + Math.random() * 14.0;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight ? getTerrainHeight(x, z) : 0, z, scale: 0.8 + Math.random() * 0.5 };
      },
      pal
    );
    group.add(valleyGrass);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.8, 3.2, '#ffe89e');
    shaft.position.set(0, 6.2, -5.5);
    group.add(shaft);

    return {
      signatureTarget: brookPos,
      signatureRadius: 4.0,
      signatureLabel: 'Reach into the Brook for the Five Smooth Stones',
      signatureActivatedText: '“Chose for himself five smooth stones out of the brook.” — Stones the water had been shaping for years, like the boy choosing them. One stone was enough.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._samuelStonesLatched = Math.min(1.0, (this._samuelStonesLatched || 0) + dt * 0.5);
        const val = this._samuelStonesLatched || 0;
        brookRig.brookLight.intensity = 2.2 + val * 2.8;
        brookRig.stones.forEach((st, idx) => {
          st.position.y = 0.13 + Math.sin(time * 2.6 + idx * 0.9) * 0.025 * val;
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VII (1–2 SAMUEL) SCENE 4: No. 30 — "at the king's table" (2 Samuel 9:1–13)
  // ==========================================================================
  populateSamuelKingsTableScene(group, derived, pal) {
    const THREE = this.THREE;
    const tablePos = new THREE.Vector3(0.0, 0.0, -5.6);
    const tableRig = this.propBuilder.createKingsTablePlace();
    tableRig.group.position.copy(tablePos);
    group.add(tableRig.group);

    // David's harp standing beside the banquet hall column
    const harp = this.propBuilder.createDavidHarp(1.15);
    harp.position.set(2.4, 0, -5.8);
    harp.rotation.y = -0.45;
    group.add(harp);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.75, 3.0, '#ffde8a');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    return {
      signatureTarget: tablePos,
      signatureRadius: 4.0,
      signatureLabel: 'Sit at the Place Kept Continually for Jonathan’s Son',
      signatureActivatedText: '“You will eat bread at my table continually.” — A place set every day for a promise made to a friend long after the friend was gone.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.0;
        if (near) this._samuelTableLatched = Math.min(1.0, (this._samuelTableLatched || 0) + dt * 0.5);
        const val = this._samuelTableLatched || 0;
        tableRig.tableLight.intensity = 2.4 + val * 2.8;
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VIII (1 & 2 KINGS) SCENE 1: No. 6 — "the cloud" (1 Kings 8:6–11)
  // ==========================================================================
  populateKingsTempleCloudScene(group, derived, pal) {
    const THREE = this.THREE;
    const templePos = new THREE.Vector3(0.0, 0.0, -5.8);
    const sanctuary = this.propBuilder.createCedarTempleSanctuary();
    sanctuary.group.position.copy(templePos);
    group.add(sanctuary.group);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.9, 3.6, '#ffea9c');
    shaft.position.set(0, 6.4, -5.8);
    group.add(shaft);

    return {
      signatureTarget: templePos,
      signatureRadius: 4.2,
      signatureLabel: 'Stand Before the Cloud of Glory Filling the House',
      signatureActivatedText: '“The cloud filled Yahweh’s house, so that the priests could not stand to minister.” — All that cedar, all that gold, and the best moment was when nobody could do anything at all.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._kingsCloudLatched = Math.min(1.0, (this._kingsCloudLatched || 0) + dt * 0.5);
        const val = this._kingsCloudLatched || 0;
        sanctuary.gloryLight.intensity = 2.8 + val * 3.4;
        sanctuary.cloudSprites.forEach((sp, i) => {
          sp.material.opacity = (0.38 + val * 0.28) * (0.85 + 0.15 * Math.sin(time * 1.6 + i));
          sp.position.y = 1.45 + (i % 3) * 0.55 + Math.sin(time * 0.9 + i) * 0.15;
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VIII (1 & 2 KINGS) SCENE 2: No. 18 — "fire on Carmel" (1 Kings 18:30–39)
  // ==========================================================================
  populateKingsCarmelFireScene(group, derived, pal) {
    const THREE = this.THREE;
    const altarPos = new THREE.Vector3(0.0, 0.0, -5.6);
    const carmel = this.propBuilder.createCarmelAltar();
    carmel.group.position.copy(altarPos);
    group.add(carmel.group);

    const fireShaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.65, 2.6, '#ff9c38');
    fireShaft.position.set(0, 6.2, -5.6);
    group.add(fireShaft);

    return {
      signatureTarget: altarPos,
      signatureRadius: 4.2,
      signatureLabel: 'Approach the Twelve-Stone Altar & Water-Filled Trench',
      signatureActivatedText: '“Yahweh, he is God! Yahweh, he is God!” — One short prayer at the evening offering, and the fire fell and licked up even the water.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._kingsCarmelLatched = Math.min(1.0, (this._kingsCarmelLatched || 0) + dt * 0.5);
        const val = this._kingsCarmelLatched || 0;
        const flicker = 1.0 + Math.sin(time * 7.5) * 0.15;
        carmel.fireLight.intensity = (2.8 + val * 3.8) * flicker;
        carmel.fireSprites.forEach((sp, idx) => {
          sp.scale.x = (2.4 - idx * 0.18 + val * 0.6) * flicker;
          sp.position.y = 1.25 + idx * 0.55 + Math.sin(time * 4.5 + idx) * 0.12;
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VIII (1 & 2 KINGS) SCENE 3: No. 21 — "a still small voice" (1 Kings 19:9–13)
  // ==========================================================================
  populateKingsStillSmallVoiceScene(group, derived, pal) {
    const THREE = this.THREE;
    const cavePos = new THREE.Vector3(0.0, 0.0, -5.8);
    const caveRig = this.propBuilder.createHorebCaveArch();
    caveRig.group.position.copy(cavePos);
    group.add(caveRig.group);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.8, 3.2, '#ffefd1');
    shaft.position.set(0, 6.2, -5.4);
    group.add(shaft);

    return {
      signatureTarget: cavePos,
      signatureRadius: 4.2,
      signatureLabel: 'Stand at the Mouth of Horeb’s Cave in the Stillness',
      signatureActivatedText: '“After the fire, there was a still small voice.” — God doesn’t always shout. Sometimes he asks a gentle question, and waits.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._kingsVoiceLatched = Math.min(1.0, (this._kingsVoiceLatched || 0) + dt * 0.5);
        const val = this._kingsVoiceLatched || 0;
        const breathe = 0.9 + 0.1 * Math.sin(time * 1.8);
        caveRig.caveLight.intensity = (2.0 + val * 2.6) * breathe;
        caveRig.whisperHalo.scale.setScalar((3.2 + val * 1.4) * breathe);
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICT VIII (1 & 2 KINGS) SCENE 4: No. 32 — "more with us" (2 Kings 6:15–17)
  // ==========================================================================
  populateKingsChariotsOfFireScene(group, derived, pal, getTerrainHeight) {
    const THREE = this.THREE;
    const chariotPos = new THREE.Vector3(0.0, 0.0, -5.8);
    const fieryRig = this.propBuilder.createChariotOfFireCluster();
    fieryRig.group.position.copy(chariotPos);
    group.add(fieryRig.group);

    const hillGrass = this.propBuilder.createInstancedMeadowGrass(
      780,
      () => {
        const ang = Math.random() * Math.PI * 2;
        const rad = 2.4 + Math.random() * 14.5;
        const x = Math.cos(ang) * rad;
        const z = Math.sin(ang) * rad - 4.0;
        return { x, y: getTerrainHeight ? getTerrainHeight(x, z) : 0, z, scale: 0.85 + Math.random() * 0.45 };
      },
      pal
    );
    group.add(hillGrass);

    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.85, 3.5, '#ffbe59');
    shaft.position.set(0, 6.2, -5.8);
    group.add(shaft);

    return {
      signatureTarget: chariotPos,
      signatureRadius: 4.2,
      signatureLabel: 'Open Your Eyes to the Hills Full of Chariots of Fire',
      signatureActivatedText: '“Don’t be afraid; for those who are with us are more than those who are with them.” — The danger was real; so was everything he couldn’t see.',
      updateScene: (dt, time, distToSignature) => {
        const near = distToSignature < 4.2;
        if (near) this._kingsChariotsLatched = Math.min(1.0, (this._kingsChariotsLatched || 0) + dt * 0.5);
        const val = this._kingsChariotsLatched || 0;
        fieryRig.chariotLight.intensity = 2.8 + val * 3.6;
        fieryRig.chariots.forEach((ch, idx) => {
          ch.cGroup.position.y += Math.sin(time * 2.5 + idx) * 0.002;
          ch.halo.scale.set((2.8 + val * 1.1), (2.2 + val * 0.9), 1);
        });
        return near || val > 0.85;
      }
    };
  }

  // ==========================================================================
  // DISTRICTS IX–XLIV (BOOKS #9 TO #44) — 144 WALKABLE 3D STEP-THROUGH SCENES
  // ==========================================================================
  populateBook9To44StepThroughScene(
    kind,
    paintingData,
    group,
    derived,
    pal,
    getTerrainHeight,
    skyDome,
    districtSlug = 'genesis'
  ) {
    const THREE = this.THREE;
    const focalPos = new THREE.Vector3(0.0, 0.0, -5.6);

    // 1. Build the bespoke 3D Symbolic Focal Prop Assembly at the heart of the clearing
    const focalRig = this.propBuilder.createFocalPropForScene(kind, derived.propTex, pal);
    focalRig.group.position.copy(focalPos);
    group.add(focalRig.group);

    // Mount 3D GLB Sculpture generated from this exact painting (if present in assets/models/scenes/<slug>-<n>.glb)
    if (this.propBuilder && this.propBuilder.tripo && paintingData && paintingData.n) {
      this.propBuilder.tripo.mountSceneGlbIfAvailable(
        focalRig.group,
        districtSlug,
        paintingData.n,
        { targetHeight: 3.1, yOffset: 0.28 }
      );
    }

    // 2. Water / River / Brook / Sea / Well / Fountain Scenes: Add shimmering Komorebi water & floating lanterns
    const isWaterScene =
      (derived.waterRatio && derived.waterRatio > 0.22) ||
      [
        'streams_of_water', 'scent_of_water', 'deer_brook', 'be_still_waters',
        'storm_stilled_haven', 'wellspring_of_life', 'rivers_to_the_sea',
        'locked_garden_fountain', 'many_waters_flame', 'night_watch_water',
        'temple_river_trees', 'tarshish_storm_ship', 'depths_of_the_sea',
        'walking_on_the_sea', 'peace_be_still_boat', 'jacob_well_jar',
        'galilee_charcoal_fire', 'malta_four_anchors', 'fresh_spring_well',
        'cast_your_cares_shore', 'river_of_life_new_jerusalem'
      ].includes(kind);

    let waterMat = null;
    const riverLanterns = [];
    if (isWaterScene) {
      const waterGeo = new THREE.PlaneGeometry(54, 28, 48, 48);
      waterGeo.rotateX(-Math.PI / 2);
      waterMat = createKomorebiWaterMaterial(THREE, {
        deepColor: pal.ground || '#364d54',
        shallowColor: pal.horizon || '#7a948e',
        sunColor: pal.accent || '#ffe29c',
        opacity: 0.90
      });
      const waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.position.set(-7.5, 0.05, -10.5);
      group.add(waterMesh);

      for (let i = 0; i < 6; i++) {
        const l = this.propBuilder.createFloatingRiverLantern(pal.accent || '#ffe29c');
        l.position.set(-10.5 + i * 2.8, 0.08, -10.0 + Math.sin(i * 1.4) * 2.4);
        group.add(l);
        riverLanterns.push(l);
      }
    }

    // 3. Night / Starlight / Lamp / Watchtower / Upper Room Scenes: Starry sky & nocturnal glow
    const isNightScene = [
      'nehemiah_night_ride', 'sleepless_chronicles', 'whirlwind_stars',
      'moon_and_stars', 'lamp_to_my_feet', 'lamp_before_dawn',
      'solitary_city_lantern', 'night_watch_water', 'fiery_furnace',
      'lions_den_light', 'habakkuk_watchtower', 'bethlehem_manger',
      'magi_star_gifts', 'upper_room_basin', 'pentecost_upper_room',
      'philippi_midnight_chains', 'peace_on_guard_lantern', 'tentmaker_loom_lamp',
      'morning_star_lamp', 'seven_golden_lampstands'
    ].includes(kind);

    if (skyDome && skyDome.material && skyDome.material.uniforms) {
      if (isNightScene && skyDome.material.uniforms.uStarIntensity) {
        skyDome.material.uniforms.uStarIntensity.value = 0.78;
      }
      if ((kind === 'chebar_rainbow_throne' || kind === 'emerald_rainbow_throne') && skyDome.material.uniforms.uRainbowIntensity) {
        skyDome.material.uniforms.uRainbowIntensity.value = 0.62;
      }
    }

    // 4. Painting-Matched 3D Surrounding Architecture / Rocks / Trees (NO generic moving grass on non-garden scenes!)
    const isGardenOrTreeScene = [
      'streams_of_water', 'scent_of_water', 'cedar_of_lebanon', 'apple_tree_shade',
      'locked_garden_fountain', 'fig_blossom', 'shoot_of_jesse', 'temple_river_trees',
      'cedar_top_twig', 'almond_branch', 'plumb_line_olive_trees', 'mustard_seed_tree',
      'true_vine_branches', 'garden_empty_tomb', 'wild_olive_graft', 'sower_good_soil',
      'patient_farmer_rain', 'river_of_life_new_jerusalem'
    ].includes(kind);

    const isSanctuaryOrHallScene = [
      'solomon_prayer_scroll', 'eyes_upon_you_banner', 'temple_foundations',
      'kings_scepter_scroll', 'banquet_banner', 'wisdom_seven_pillars',
      'throne_seraphim_coal', 'baruch_scroll', 'Open_scroll_daniel',
      'upper_room_basin', 'pentecost_upper_room', 'Emmaus_breaking_bread',
      'royal_priesthood_cornerstone', 'holiest_curtain_anchor',
      'seven_golden_lampstands', 'emerald_rainbow_throne', 'open_door_philadelphia'
    ].includes(kind);

    if (isGardenOrTreeScene) {
      const grovePositions = [
        { x: -4.6, z: -7.0, s: 0.94 },
        { x: 4.6, z: -6.8, s: 1.00 }
      ];
      grovePositions.forEach((gp) => {
        const t = this.propBuilder.createGreatPainterlyTree(derived.propTex, pal, gp.s);
        t.position.set(gp.x, getTerrainHeight ? getTerrainHeight(gp.x, gp.z) : 0, gp.z);
        t.rotation.y = gp.x * 0.6;
        group.add(t);
      });
    } else if (isSanctuaryOrHallScene) {
      // Sculpted Sanctuary Columns textured from the painting's palette & brushwork
      const colMat = this.painterly.createPainterlyMaterial({
        map: derived.propTex,
        baseColor: pal.ground || '#705e4a',
        accentColor: pal.accent || '#e6c587',
        roughness: 0.68,
        bumpScale: 0.06
      });
      const colCoords = [
        { x: -3.8, z: -3.8, h: 4.8 },
        { x: 3.8, z: -3.8, h: 4.8 },
        { x: -4.4, z: -8.2, h: 5.6 },
        { x: 4.4, z: -8.2, h: 5.6 }
      ];
      colCoords.forEach((cc) => {
        const cGeo = this.propBuilder.displaceGeometry(
          new THREE.CylinderGeometry(0.34, 0.42, cc.h, 16, 12),
          0.025,
          3.0
        );
        const col = new THREE.Mesh(cGeo, colMat);
        const by = getTerrainHeight ? getTerrainHeight(cc.x, cc.z) : 0;
        col.position.set(cc.x, by + cc.h * 0.5, cc.z);
        group.add(col);

        const capGeo = new THREE.BoxGeometry(0.98, 0.28, 0.98);
        const cap = new THREE.Mesh(capGeo, colMat);
        cap.position.set(cc.x, by + cc.h + 0.1, cc.z);
        group.add(cap);
      });
    } else {
      // Sculpted Painting-Textured Monoliths & Cairns flanking the sanctuary path
      const monoMat = this.painterly.createPainterlyMaterial({
        map: derived.propTex,
        baseColor: pal.ground || '#615141',
        accentColor: pal.accent || '#dfb97a',
        roughness: 0.86,
        bumpScale: 0.08
      });
      const monoCoords = [
        { x: -4.2, z: -4.6, sx: 1.1, sy: 2.3, sz: 1.0 },
        { x: 4.2, z: -4.6, sx: 1.1, sy: 2.2, sz: 1.0 },
        { x: -5.4, z: -8.6, sx: 1.5, sy: 3.1, sz: 1.3 },
        { x: 5.4, z: -8.6, sx: 1.5, sy: 3.0, sz: 1.3 }
      ];
      monoCoords.forEach((mc, idx) => {
        const mGeo = this.propBuilder.displaceGeometry(
          new THREE.DodecahedronGeometry(1.0, 2),
          0.12,
          2.6 + idx * 0.4
        );
        const mono = new THREE.Mesh(mGeo, monoMat);
        const by = getTerrainHeight ? getTerrainHeight(mc.x, mc.z) : 0;
        mono.position.set(mc.x, by + mc.sy * 0.42, mc.z);
        mono.scale.set(mc.sx, mc.sy, mc.sz);
        mono.rotation.y = idx * 0.9;
        group.add(mono);
      });
    }

    // 5. Angled 3D Komorebi Volumetric Sunbeam / Starlight Shafts onto the Focal Centerpiece
    const shaft = this.propBuilder.createKomorebiSunbeamShaft(16, 0.82, 3.3, pal.accent || '#ffe49e');
    shaft.position.set(0, 6.2, -5.6);
    group.add(shaft);

    // 6. Signature Prompt & Poetic Activation Insight derived from Timothy Holt's poem & Scripture
    const pTitle = paintingData && paintingData.title ? paintingData.title : 'the Sacred Threshold';
    const pRef = paintingData && paintingData.ref ? paintingData.ref : '';
    const pEpi = paintingData && paintingData.epigraph ? paintingData.epigraph : '';
    const firstStanza = paintingData && paintingData.poem
      ? paintingData.poem.split('\n\n').slice(-1)[0].replace(/\n/g, ' ')
      : '';

    const signatureLabel = `Approach “${pTitle}” (${pRef})`;
    const signatureActivatedText = `${pEpi} (${pRef}) — ${firstStanza}`;

    const latchKey = `_latch_${kind}`;
    return {
      signatureTarget: focalPos,
      signatureRadius: 4.2,
      signatureLabel,
      signatureActivatedText,
      updateScene: (dt, time, distToSignature, activeSkyDome, cameraPos) => {
        if (waterMat) {
          waterMat.uniforms.uTime.value = time;
          if (cameraPos) waterMat.uniforms.uCameraPos.value.copy(cameraPos);
        }
        riverLanterns.forEach((l, idx) => {
          l.position.y = 0.08 + Math.sin(time * 1.7 + idx) * 0.03;
        });

        const near = distToSignature < 4.2;
        if (near) {
          this[latchKey] = Math.min(1.0, (this[latchKey] || 0) + dt * 0.5);
        }
        const val = this[latchKey] || 0;
        const pulse = 1.0 + Math.sin(time * 2.6) * 0.08;

        focalRig.focalLight.intensity = (2.4 + val * 3.0) * pulse;
        focalRig.focalHalo.scale.setScalar((2.8 + val * 1.1) * pulse);
        focalRig.animatedParts.forEach((mesh, idx) => {
          mesh.rotation.y += dt * (0.25 + idx * 0.1) * (0.4 + val * 0.8);
        });

        return near || val > 0.85;
      }
    };
  }

  createAtmosphericMotes(hexColor, count = 200) {
    const THREE = this.THREE;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 36;
      pos[i * 3 + 1] = 0.4 + Math.random() * 8.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 36 - 4;
      phases[i] = Math.random() * Math.PI * 2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

    const spriteTex = this.painterly.createGlowSpriteTexture(hexColor);
    const mat = new THREE.PointsMaterial({
      map: spriteTex,
      size: 0.34,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const points = new THREE.Points(geo, mat);
    points.userData.updateMotes = (time) => {
      const pAttr = geo.attributes.position;
      for (let i = 0; i < count; i++) {
        const ph = phases[i];
        pAttr.setY(i, pAttr.getY(i) + Math.sin(time * 0.8 + ph) * 0.003);
        pAttr.setX(i, pAttr.getX(i) + Math.cos(time * 0.5 + ph) * 0.002);
      }
      pAttr.needsUpdate = true;
    };
    return points;
  }
}

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

// ============================================================================
// THE PILGRIM WALK — Painterly Props, Instanced Komorebi Foliage & Biome Kit
// Upgrades the 3D world to the atmospheric standard of "Komorebi: A Forest Flight":
//   - Wind-animated instanced wild grass & golden meadow flowers (GPU vertex sway)
//   - Volumetric angled sunbeam / god-ray cones filtering through canopies
//   - Floating river lanterns & glowing golden threshold rings
//   - Painterly stone bridges, olive/oak groves, Sabbath stone bench, Noah's altar
// ============================================================================

export class PainterlyPropBuilder {
  constructor(THREE, painterlyEngine) {
    this.THREE = THREE;
    this.painterly = painterlyEngine;
    this.windMaterials = [];
  }

  // Updates all wind-swaying foliage and sunbeam shaders each frame
  updateWindShaders(time) {
    for (let i = 0; i < this.windMaterials.length; i++) {
      const m = this.windMaterials[i];
      if (m.userData && m.userData.uTime) {
        m.userData.uTime.value = time;
      } else if (m.uniforms && m.uniforms.uTime) {
        m.uniforms.uTime.value = time;
      }
    }
  }

  // Displaces geometry vertices organically using deterministic pseudo-noise so nothing is a flat box/cylinder
  displaceGeometry(geo, amount = 0.08, freq = 2.5) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n =
        Math.sin(x * freq + y * 1.7) * 0.45 +
        Math.cos(z * freq - x * 2.1) * 0.35 +
        Math.sin((x + y + z) * freq * 1.9) * 0.2;
      pos.setXYZ(i, x + n * amount, y + n * amount * 0.6, z + n * amount);
    }
    geo.computeVertexNormals();
    return geo;
  }

  // Creates an InstancedMesh of ribuan wind-swaying painterly grass & wildflower tufts
  // (The signature living-ground feel of Komorebi)
  createInstancedMeadowGrass(count, placementFn, palette = {}) {
    const THREE = this.THREE;

    // Crossed double-plane tuft so grass has volume from every viewing angle
    const p1 = new THREE.PlaneGeometry(0.65, 0.72, 1, 2);
    p1.translate(0, 0.34, 0);
    const p2 = new THREE.PlaneGeometry(0.65, 0.72, 1, 2);
    p2.rotateY(Math.PI / 2.2);
    p2.translate(0, 0.34, 0);

    // Merge p1 and p2 into one tuft geometry
    const tuftGeo = new THREE.BufferGeometry();
    const pos1 = p1.attributes.position.array;
    const pos2 = p2.attributes.position.array;
    const uv1 = p1.attributes.uv.array;
    const uv2 = p2.attributes.uv.array;
    const norm1 = p1.attributes.normal.array;
    const norm2 = p2.attributes.normal.array;

    const combinedPos = new Float32Array(pos1.length + pos2.length);
    combinedPos.set(pos1, 0);
    combinedPos.set(pos2, pos1.length);

    const combinedUv = new Float32Array(uv1.length + uv2.length);
    combinedUv.set(uv1, 0);
    combinedUv.set(uv2, uv1.length);

    const combinedNorm = new Float32Array(norm1.length + norm2.length);
    combinedNorm.set(norm1, 0);
    combinedNorm.set(norm2, norm1.length);

    const idx1 = Array.from(p1.index.array);
    const vOffset = pos1.length / 3;
    const idx2 = Array.from(p2.index.array).map((k) => k + vOffset);
    tuftGeo.setAttribute('position', new THREE.BufferAttribute(combinedPos, 3));
    tuftGeo.setAttribute('uv', new THREE.BufferAttribute(combinedUv, 2));
    tuftGeo.setAttribute('normal', new THREE.BufferAttribute(combinedNorm, 3));
    tuftGeo.setIndex(idx1.concat(idx2));

    // Paint a brushstroke grass-and-wildflower texture
    const grassTex = this.createGrassBladeTexture(
      palette.ground || '#646848',
      palette.accent || '#e2bd84'
    );

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: grassTex },
        uTime: { value: 0.0 },
        uSunColor: { value: new THREE.Color(palette.accent || '#ffe3a8') },
        uFogColor: { value: new THREE.Color(palette.horizon || '#b69375') }
      },
      side: THREE.DoubleSide,
      transparent: true,
      alphaTest: 0.22,
      vertexShader: /* glsl */`
        uniform float uTime;
        varying vec2 vUv;
        varying float vHeight;
        varying float vFogDepth;
        void main() {
          vUv = uv;
          vHeight = clamp(position.y / 0.72, 0.0, 1.0);
          vec4 worldPos = instanceMatrix * vec4(position, 1.0);
          // Wind wave ripples across the meadow based on world coordinates
          float breeze = sin(uTime * 2.1 + worldPos.x * 0.45 + worldPos.z * 0.35) * 0.16
                       + cos(uTime * 1.4 - worldPos.z * 0.6) * 0.08;
          worldPos.x += breeze * vHeight * vHeight;
          worldPos.z += breeze * 0.5 * vHeight * vHeight;
          vec4 mvPos = viewMatrix * worldPos;
          vFogDepth = -mvPos.z;
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D uMap;
        uniform vec3 uSunColor;
        uniform vec3 uFogColor;
        varying vec2 vUv;
        varying float vHeight;
        varying float vFogDepth;
        void main() {
          vec4 texCol = texture2D(uMap, vUv);
          if (texCol.a < 0.25) discard;
          // Warm golden-hour subsurface translucency at grass tips
          vec3 col = mix(texCol.rgb * 0.78, texCol.rgb * uSunColor * 1.25, vHeight * 0.75);
          float fogFactor = 1.0 - exp(-0.012 * 0.012 * vFogDepth * vFogDepth);
          col = mix(col, uFogColor, clamp(fogFactor, 0.0, 0.85));
          gl_FragColor = vec4(col, texCol.a);
        }
      `
    });
    this.windMaterials.push(mat);

    const instMesh = new THREE.InstancedMesh(tuftGeo, mat, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const t = placementFn(i, count);
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.rotY || Math.random() * Math.PI * 2, 0);
      const s = t.scale || (0.75 + Math.random() * 0.65);
      dummy.scale.set(s, s * (0.85 + Math.random() * 0.35), s);
      dummy.updateMatrix();
      instMesh.setMatrixAt(i, dummy.matrix);
    }
    instMesh.instanceMatrix.needsUpdate = true;
    return instMesh;
  }

  createGrassBladeTexture(hexBase = '#646848', hexTip = '#e2bd84') {
    const THREE = this.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 128);

    const cBase = new THREE.Color(hexBase);
    const cTip = new THREE.Color(hexTip);
    const temp = new THREE.Color();

    // Paint 22 organic tapered brushstrokes rising from bottom
    for (let i = 0; i < 22; i++) {
      const bx = 14 + (i / 21) * 100 + (Math.random() - 0.5) * 6;
      const topX = bx + (Math.random() - 0.5) * 26;
      const topY = 10 + Math.random() * 42;

      const grad = ctx.createLinearGradient(bx, 128, topX, topY);
      temp.copy(cBase).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
      grad.addColorStop(0, `#${temp.getHexString()}`);
      temp.copy(cTip).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
      grad.addColorStop(1, `#${temp.getHexString()}`);

      ctx.strokeStyle = grad;
      ctx.lineWidth = 3.5 + Math.random() * 3.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, 128);
      ctx.quadraticCurveTo((bx + topX) * 0.5 + (Math.random() - 0.5) * 12, (128 + topY) * 0.5, topX, topY);
      ctx.stroke();

      // Occasional warm wildflower blossom dab at tip
      if (i % 5 === 0) {
        ctx.fillStyle = '#f5dfb3';
        ctx.beginPath();
        ctx.arc(topX, topY, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Creates angled Komorebi Volumetric Sunbeam Shafts (3D translucent light cones filtering through trees)
  createKomorebiSunbeamShaft(height = 18, topRadius = 0.8, bottomRadius = 3.4, hexColor = '#ffe4a3') {
    const THREE = this.THREE;
    const geo = new THREE.ConeGeometry(bottomRadius, height, 24, 1, true);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0.0 },
        uColor: { value: new THREE.Color(hexColor) },
        uOpacity: { value: 0.22 }
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
          float vFade = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.15, vUv.y);
          float rays = 0.65 + 0.35 * sin(vUv.x * 25.13 + uTime * 0.6) * cos(vUv.x * 12.56 - uTime * 0.4);
          gl_FragColor = vec4(uColor, vFade * rays * uOpacity);
        }
      `
    });
    this.windMaterials.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    // Tilt shaft slightly toward the sun angle
    mesh.rotation.z = -0.22;
    mesh.rotation.x = 0.14;
    return mesh;
  }

  // Creates a floating wooden & parchment River Lantern (Komorebi river lantern vibe)
  createFloatingRiverLantern(hexColor = '#ffd88a') {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4f3d2b',
      accentColor: '#9c7a54',
      roughness: 0.88
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.48), woodMat);
    group.add(base);

    const shadeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(hexColor),
      transparent: true,
      opacity: 0.92
    });
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.34, 8), shadeMat);
    shade.position.y = 0.2;
    group.add(shade);

    const glowTex = this.painterly.createGlowSpriteTexture(hexColor);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: new THREE.Color(hexColor),
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending
      })
    );
    sprite.scale.set(1.65, 1.65, 1);
    sprite.position.y = 0.24;
    group.add(sprite);

    return group;
  }

  // Creates an arched, weathered Stone Footbridge over the river/stream
  createStoneFootbridge(palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: palette.ground || '#756856',
      accentColor: palette.accent || '#dbb87b',
      roughness: 0.9,
      bumpScale: 0.06
    });

    // Arched bridge deck made of 9 stone segments
    for (let i = -4; i <= 4; i++) {
      const frac = i / 4;
      const y = (1.0 - frac * frac) * 0.95;
      const segGeo = this.displaceGeometry(new THREE.BoxGeometry(1.15, 0.28, 2.4, 4, 2, 4), 0.025, 3.5);
      const seg = new THREE.Mesh(segGeo, stoneMat);
      seg.position.set(i * 1.02, y, 0);
      seg.rotation.z = -frac * 0.22;
      group.add(seg);

      // Low stone parapet posts along both sides
      if (i % 2 === 0) {
        for (const sz of [-1.05, 1.05]) {
          const postGeo = this.displaceGeometry(new THREE.BoxGeometry(0.26, 0.65, 0.26, 3, 4, 3), 0.02, 4.0);
          const post = new THREE.Mesh(postGeo, stoneMat);
          post.position.set(i * 1.02, y + 0.42, sz);
          group.add(post);
        }
      }
    }

    return group;
  }

  // Creates a weathered, carved stone bench with linen scroll/cloth detail (The Sabbath Bench under the Great Tree)
  createStoneBench(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#786e5c',
      accentColor: palette.accent || '#d9b08b',
      roughness: 0.92,
      bumpScale: 0.06
    });

    // Main carved limestone slab seat
    const seatGeo = this.displaceGeometry(new THREE.BoxGeometry(2.6, 0.28, 0.95, 16, 4, 8), 0.035, 3.2);
    const seat = new THREE.Mesh(seatGeo, stoneMat);
    seat.position.y = 0.56;
    seat.castShadow = true;
    seat.receiveShadow = true;
    group.add(seat);

    // Two weathered stone supports
    for (const sx of [-0.95, 0.95]) {
      const legGeo = this.displaceGeometry(new THREE.BoxGeometry(0.42, 0.52, 0.82, 8, 6, 6), 0.03, 4.0);
      const leg = new THREE.Mesh(legGeo, stoneMat);
      leg.position.set(sx, 0.26, 0);
      leg.castShadow = true;
      leg.receiveShadow = true;
      group.add(leg);
    }

    // Surrounding natural mossy stones at base
    for (let i = 0; i < 5; i++) {
      const rGeo = this.displaceGeometry(new THREE.DodecahedronGeometry(0.18 + (i % 3) * 0.07, 1), 0.04, 4.5);
      const rock = new THREE.Mesh(rGeo, stoneMat);
      const ang = (i / 5) * Math.PI * 2;
      rock.position.set(Math.cos(ang) * 1.35, 0.1, Math.sin(ang) * 0.55);
      rock.scale.set(1.3, 0.65, 1.1);
      group.add(rock);
    }

    // Painterly woven linen cloth & scroll resting on the right corner of the bench (matching painting No. 4)
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d8c5a5',
      accentColor: '#efe3cb',
      roughness: 0.95,
      bumpScale: 0.04
    });
    const clothGeo = this.displaceGeometry(new THREE.BoxGeometry(0.75, 0.06, 0.88, 10, 2, 10), 0.025, 5.0);
    const cloth = new THREE.Mesh(clothGeo, linenMat);
    cloth.position.set(0.65, 0.71, 0.02);
    group.add(cloth);

    // Rolled parchment scroll on the linen cloth
    const scrollGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.52, 12);
    const scroll = new THREE.Mesh(scrollGeo, linenMat);
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = 0.28;
    scroll.position.set(0.58, 0.78, -0.05);
    group.add(scroll);

    // Earthenware water jug beside the bench (matching painting No. 4)
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b5844',
      accentColor: '#9c8265',
      roughness: 0.86,
      bumpScale: 0.05
    });
    const jugPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.14, 0.02),
      new THREE.Vector2(0.22, 0.18),
      new THREE.Vector2(0.20, 0.34),
      new THREE.Vector2(0.09, 0.44),
      new THREE.Vector2(0.11, 0.52),
      new THREE.Vector2(0.08, 0.52)
    ];
    const jugGeo = new THREE.LatheGeometry(jugPoints, 16);
    const jug = new THREE.Mesh(jugGeo, clayMat);
    jug.position.set(1.02, 0.70, 0.12);
    group.add(jug);

    return group;
  }

  // Creates the Great gnarled Olive/Oak Tree with wind-swaying painterly foliage cards & roots
  createGreatPainterlyTree(propTex = null, palette = {}, scale = 1.0) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const barkMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#544838',
      accentColor: palette.horizon || '#948067',
      roughness: 0.94,
      bumpScale: 0.08
    });

    // Gnarled trunk + flaring roots built from displaced tapered cylinders
    const trunkGeo = this.displaceGeometry(new THREE.CylinderGeometry(0.55, 1.05, 4.6, 14, 12), 0.12, 1.8);
    const trunk = new THREE.Mesh(trunkGeo, barkMat);
    trunk.position.y = 2.2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // 5 spreading main boughs
    const boughConfigs = [
      { rotZ: 0.55, rotY: 0.2, len: 3.8, r1: 0.22, r2: 0.44, y: 3.8 },
      { rotZ: -0.62, rotY: 0.8, len: 4.1, r1: 0.20, r2: 0.42, y: 3.9 },
      { rotZ: 0.48, rotY: -1.1, len: 3.5, r1: 0.18, r2: 0.38, y: 3.6 },
      { rotZ: -0.45, rotY: -0.5, len: 3.6, r1: 0.18, r2: 0.36, y: 4.1 },
      { rotZ: 0.25, rotY: 2.1, len: 3.2, r1: 0.16, r2: 0.34, y: 4.2 }
    ];

    const foliageTex = this.painterly.createPainterlyFoliageTexture('#585e42', palette.accent || '#d9b08b');
    const foliageMat = new THREE.MeshStandardMaterial({
      map: foliageTex,
      alphaTest: 0.18,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.88,
      bumpMap: this.painterly.canvasNoiseTex,
      bumpScale: 0.03
    });

    // Inject gentle Komorebi wind-sway into the tree canopy vertex shader
    const uTimeUniform = { value: 0.0 };
    foliageMat.userData.uTime = uTimeUniform;
    foliageMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTimeUniform;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float leafSway = sin(uTime * 1.6 + position.x * 1.5 + position.y * 1.2) * 0.11;
        transformed.x += leafSway;
        transformed.z += cos(uTime * 1.3 + position.y * 1.4) * 0.08;
        `
      );
    };
    this.windMaterials.push(foliageMat);

    boughConfigs.forEach((b) => {
      const boughPivot = new THREE.Group();
      boughPivot.position.set(0, b.y, 0);
      boughPivot.rotation.y = b.rotY;
      boughPivot.rotation.z = b.rotZ;

      const bGeo = this.displaceGeometry(new THREE.CylinderGeometry(b.r1, b.r2, b.len, 10, 8), 0.08, 2.2);
      const bMesh = new THREE.Mesh(bGeo, barkMat);
      bMesh.position.y = b.len * 0.5;
      boughPivot.add(bMesh);

      // Attach intersecting painterly brushstroke canopy clusters (not spheres!)
      for (let c = 0; c < 8; c++) {
        const cardSize = 2.8 + (c % 3) * 0.85;
        const cardGeo = new THREE.PlaneGeometry(cardSize, cardSize * 0.78, 2, 2);
        const card = new THREE.Mesh(cardGeo, foliageMat);
        const ca = (c / 8) * Math.PI * 2;
        card.position.set(
          Math.cos(ca) * 1.15,
          b.len * (0.62 + (c % 3) * 0.18),
          Math.sin(ca) * 1.15
        );
        card.rotation.set(
          (Math.random() - 0.5) * 0.7,
          ca + 0.5,
          (Math.random() - 0.5) * 0.5
        );
        boughPivot.add(card);
      }

      group.add(boughPivot);
    });

    // Crown canopy clusters at top of tree
    for (let k = 0; k < 16; k++) {
      const w = 3.4 + (k % 3) * 0.9;
      const pGeo = new THREE.PlaneGeometry(w, w * 0.75, 2, 2);
      const pMesh = new THREE.Mesh(pGeo, foliageMat);
      const ang = (k / 16) * Math.PI * 2;
      const rad = 1.2 + (k % 3) * 1.15;
      pMesh.position.set(Math.cos(ang) * rad, 5.6 + (k % 4) * 0.55, Math.sin(ang) * rad);
      pMesh.rotation.set((k % 3 - 1) * 0.35, ang, ((k + 1) % 3 - 1) * 0.25);
      group.add(pMesh);
    }

    group.scale.setScalar(scale);
    return group;
  }

  // Creates Noah's Stone Altar of twelve fieldstones on the wet slope (Genesis No. 11 "the bow in the cloud")
  createStoneAltar(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#645844',
      accentColor: palette.accent || '#efe3cb',
      roughness: 0.9,
      bumpScale: 0.07
    });

    // Tiered unhewn fieldstones forming an ancient altar cairn
    const tiers = [
      { count: 7, radius: 0.95, y: 0.22, size: 0.42 },
      { count: 5, radius: 0.68, y: 0.58, size: 0.38 },
      { count: 3, radius: 0.38, y: 0.92, size: 0.34 },
      { count: 1, radius: 0.0, y: 1.22, size: 0.46 }
    ];

    tiers.forEach((t, ti) => {
      for (let i = 0; i < t.count; i++) {
        const ang = (i / Math.max(1, t.count)) * Math.PI * 2 + ti * 0.5;
        const rGeo = this.displaceGeometry(new THREE.DodecahedronGeometry(t.size, 1), 0.055, 3.8);
        const stone = new THREE.Mesh(rGeo, stoneMat);
        stone.position.set(Math.cos(ang) * t.radius, t.y, Math.sin(ang) * t.radius);
        stone.scale.set(1.25, 0.72, 1.15);
        stone.rotation.y = ang;
        stone.castShadow = true;
        stone.receiveShadow = true;
        group.add(stone);
      }
    });

    // Warm glowing ember/incense light at top of altar
    const glowTex = this.painterly.createGlowSpriteTexture('#ffdfa0');
    const spriteMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffebb8,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });
    const emberSprite = new THREE.Sprite(spriteMat);
    emberSprite.scale.set(1.8, 1.8, 1);
    emberSprite.position.set(0, 1.55, 0);
    group.add(emberSprite);
    group.userData.emberSprite = emberSprite;

    return group;
  }

  // Creates a carved painterly museum-in-a-garden frame & pedestal for each painting along the street
  createPaintingMonument(paintingData, tex, isStepThrough = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const pal = paintingData.palette || {};

    // Weathered limestone base plinth & arch
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#685c4c',
      accentColor: pal.horizon || '#b69375',
      roughness: 0.9,
      bumpScale: 0.05
    });

    // Aged bronze/warm wood frame
    const frameMat = this.painterly.createPainterlyMaterial({
      baseColor: isStepThrough ? '#8c6d3f' : '#574633',
      accentColor: pal.accent || '#dbb87b',
      roughness: isStepThrough ? 0.55 : 0.78,
      metalness: isStepThrough ? 0.35 : 0.1,
      bumpScale: 0.03
    });

    const frameW = isStepThrough ? 3.5 : 2.7;
    const frameH = isStepThrough ? 3.5 : 2.7;
    const centerY = isStepThrough ? 2.15 : 2.05;

    // Stone pedestal base
    const baseGeo = this.displaceGeometry(new THREE.BoxGeometry(frameW + 0.7, 0.45, 0.9, 10, 3, 4), 0.03, 3.5);
    const baseMesh = new THREE.Mesh(baseGeo, stoneMat);
    baseMesh.position.y = 0.225;
    group.add(baseMesh);

    // Two stone side pillars
    for (const sx of [-1, 1]) {
      const pGeo = this.displaceGeometry(new THREE.BoxGeometry(0.26, frameH + 0.3, 0.32, 4, 10, 4), 0.02, 4.0);
      const pillar = new THREE.Mesh(pGeo, stoneMat);
      pillar.position.set(sx * (frameW * 0.5 + 0.14), centerY, 0);
      group.add(pillar);
    }

    // Top lintel beam
    const lintelGeo = this.displaceGeometry(new THREE.BoxGeometry(frameW + 0.65, 0.28, 0.38, 10, 3, 4), 0.025, 3.5);
    const lintel = new THREE.Mesh(lintelGeo, frameMat);
    lintel.position.set(0, centerY + frameH * 0.5 + 0.14, 0);
    group.add(lintel);

    // THE PAINTING ITSELF — untouched, byte-for-byte Timothy's image on its canvas plane
    const artGeo = new THREE.PlaneGeometry(frameW, frameH);
    const artMat = new THREE.MeshBasicMaterial({
      map: tex,
      side: THREE.DoubleSide
    });
    const artMesh = new THREE.Mesh(artGeo, artMat);
    artMesh.position.set(0, centerY, 0.03);
    group.add(artMesh);

    // Subtle back-panel so frame isn't hollow from behind
    const backGeo = new THREE.BoxGeometry(frameW + 0.08, frameH + 0.08, 0.08);
    const backMesh = new THREE.Mesh(backGeo, frameMat);
    backMesh.position.set(0, centerY, -0.03);
    group.add(backMesh);

    // If this is a Step-Through Scene doorway (§6), add a glowing Komorebi golden lantern ring & sunbeam shaft
    if (isStepThrough) {
      const glowTex = this.painterly.createGlowSpriteTexture(pal.accent || '#ffe29e');
      const portalGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: new THREE.Color(pal.accent || '#ffe29e'),
          transparent: true,
          opacity: 0.48,
          blending: THREE.AdditiveBlending
        })
      );
      portalGlow.scale.set(frameW * 1.75, frameH * 1.75, 1);
      portalGlow.position.set(0, centerY, -0.1);
      group.add(portalGlow);
      group.userData.portalGlow = portalGlow;

      // Glowing golden ring halo framing the doorway (like the golden lantern rings in Komorebi)
      const ringGeo = new THREE.TorusGeometry(frameW * 0.66, 0.045, 12, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffe4a0,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(0, centerY, 0.12);
      group.add(ringMesh);

      // Angled sunbeam shaft pouring down onto the doorway threshold
      const shaft = this.createKomorebiSunbeamShaft(11, 0.6, 2.5, pal.accent || '#ffe4a3');
      shaft.position.set(0, 5.2, 0.6);
      group.add(shaft);

      // Threshold stepping stones inviting the pilgrim into the frame
      for (let s = 0; s < 3; s++) {
        const stepGeo = this.displaceGeometry(new THREE.CylinderGeometry(0.45 - s * 0.06, 0.5 - s * 0.06, 0.08, 10), 0.02, 4.0);
        const step = new THREE.Mesh(stepGeo, stoneMat);
        step.position.set((s - 1) * 0.15, 0.04, 0.75 + s * 0.55);
        group.add(step);
      }
    }

    return group;
  }

  // ============================================================================
  // DISTRICT 2 (EXODUS — "LET MY PEOPLE GO") PAINTERLY BIOME & SCENE PROPS
  // ============================================================================

  // Nile Papyrus Reed Cluster (with optional woven basket for Moses in Part 1)
  createPapyrusReedCluster(palette = {}, withBasket = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stalkMat = this.painterly.createPainterlyMaterial({
      baseColor: palette.ground || '#546340',
      accentColor: palette.accent || '#d6b87c',
      roughness: 0.86
    });

    const plumeTex = this.createGrassBladeTexture('#5e7044', palette.accent || '#e8cd92');
    const plumeMat = new THREE.MeshStandardMaterial({
      map: plumeTex,
      transparent: true,
      alphaTest: 0.2,
      side: THREE.DoubleSide,
      roughness: 0.85
    });

    const uTimeUniform = { value: 0.0 };
    plumeMat.userData.uTime = uTimeUniform;
    plumeMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTimeUniform;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        transformed.x += sin(uTime * 1.9 + position.y * 2.0) * 0.14;
        `
      );
    };
    this.windMaterials.push(plumeMat);

    const reedCount = 11;
    for (let i = 0; i < reedCount; i++) {
      const ang = (i / reedCount) * Math.PI * 2 + (i % 3) * 0.2;
      const rad = 0.15 + (i % 4) * 0.22;
      const h = 1.9 + (i % 5) * 0.38;

      const stalkGeo = new THREE.CylinderGeometry(0.022, 0.042, h, 6);
      const stalk = new THREE.Mesh(stalkGeo, stalkMat);
      stalk.position.set(Math.cos(ang) * rad, h * 0.5, Math.sin(ang) * rad);
      stalk.rotation.z = (Math.cos(ang) * 0.12);
      stalk.rotation.x = (Math.sin(ang) * 0.12);
      group.add(stalk);

      // Feathery papyrus umbel crown at top of stalk
      const umbel = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.65), plumeMat);
      umbel.position.set(
        Math.cos(ang) * (rad + h * 0.06),
        h + 0.15,
        Math.sin(ang) * (rad + h * 0.06)
      );
      umbel.rotation.y = ang;
      group.add(umbel);
    }

    if (withBasket) {
      const basketMat = this.painterly.createPainterlyMaterial({
        baseColor: '#7a5c3c',
        accentColor: '#cfa772',
        roughness: 0.9,
        bumpScale: 0.06
      });
      const basketGeo = this.displaceGeometry(new THREE.SphereGeometry(0.42, 12, 8), 0.025, 4.0);
      const basket = new THREE.Mesh(basketGeo, basketMat);
      basket.scale.set(1.35, 0.65, 0.95);
      basket.position.set(0.55, 0.18, 0.35);
      group.add(basket);

      // Warm linen swaddling cloth inside the basket
      const clothMat = this.painterly.createPainterlyMaterial({
        baseColor: '#e8d7b9',
        accentColor: '#fff3dc',
        roughness: 0.92
      });
      const cloth = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.28, 10, 8), 0.02, 5.0),
        clothMat
      );
      cloth.scale.set(1.2, 0.5, 0.85);
      cloth.position.set(0.55, 0.32, 0.35);
      group.add(cloth);
    }

    return group;
  }

  // The Burning Bush on Mount Horeb (Exodus 3:1-5 — "the bush burned with fire, and the bush was not consumed")
  createBurningBush(propTex = null, palette = {}, scale = 1.0) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const barkMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: '#4a3525',
      accentColor: '#c87d32',
      roughness: 0.9,
      bumpScale: 0.07
    });

    // Rocky Horeb cairn base
    const rockMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#6b533e',
      accentColor: palette.accent || '#f0b865',
      roughness: 0.92,
      bumpScale: 0.06
    });
    for (let r = 0; r < 7; r++) {
      const ang = (r / 7) * Math.PI * 2;
      const rockGeo = this.displaceGeometry(new THREE.DodecahedronGeometry(0.45 + (r % 3) * 0.18, 1), 0.06, 3.5);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(Math.cos(ang) * 0.95, 0.24, Math.sin(ang) * 0.95);
      rock.scale.set(1.3, 0.75, 1.15);
      group.add(rock);
    }

    // Gnarled desert acacia/thornbush branches spreading upward
    for (let b = 0; b < 9; b++) {
      const ang = (b / 9) * Math.PI * 2;
      const tilt = 0.28 + (b % 3) * 0.22;
      const len = 2.2 + (b % 4) * 0.45;
      const branchPivot = new THREE.Group();
      branchPivot.position.set(0, 0.35, 0);
      branchPivot.rotation.y = ang;
      branchPivot.rotation.z = tilt;

      const bGeo = this.displaceGeometry(new THREE.CylinderGeometry(0.04, 0.14, len, 8, 6), 0.05, 3.2);
      const bMesh = new THREE.Mesh(bGeo, barkMat);
      bMesh.position.y = len * 0.5;
      branchPivot.add(bMesh);
      group.add(branchPivot);
    }

    // Unconsuming Living Flame Shader (intersecting painterly fire planes inside the bush)
    const fireMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0.0 },
        uIntensity: { value: 1.15 }
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float sway = sin(uTime * 4.2 + pos.y * 2.5 + pos.x * 2.0) * 0.14 * uv.y;
          pos.x += sway;
          pos.z += cos(uTime * 3.5 + pos.y * 2.2) * 0.12 * uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          p.x *= 1.15;
          // Painterly flame tongues rising upward
          float n = sin(p.x * 5.0 + uTime * 3.8) * 0.18
                  + cos(p.y * 6.0 - uTime * 5.2) * 0.15
                  + sin((p.x + p.y) * 8.0 - uTime * 4.5) * 0.1;
          float shape = 1.0 - length(vec2(p.x + n * 0.55, (p.y + 0.15) * 0.85));
          float alpha = smoothstep(0.08, 0.62, shape) * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
          vec3 outerCol = vec3(0.95, 0.36, 0.06);
          vec3 midCol = vec3(1.0, 0.72, 0.18);
          vec3 coreCol = vec3(1.0, 0.96, 0.78);
          vec3 col = mix(outerCol, midCol, smoothstep(0.2, 0.55, shape));
          col = mix(col, coreCol, smoothstep(0.55, 0.88, shape));
          gl_FragColor = vec4(col * uIntensity, alpha * 0.85);
        }
      `
    });
    this.windMaterials.push(fireMat);
    group.userData.fireMat = fireMat;

    for (let f = 0; f < 10; f++) {
      const fPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.1, 4, 6), fireMat);
      const ang = (f / 10) * Math.PI;
      fPlane.position.set(Math.cos(ang) * 0.25, 1.75 + (f % 3) * 0.2, Math.sin(ang) * 0.25);
      fPlane.rotation.y = ang;
      group.add(fPlane);
    }

    // Golden holy glow halo at heart of bush
    const glowTex = this.painterly.createGlowSpriteTexture('#ffcf70');
    const glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffd478,
        transparent: true,
        opacity: 0.82,
        blending: THREE.AdditiveBlending
      })
    );
    glowSprite.scale.set(5.2, 5.2, 1);
    glowSprite.position.set(0, 1.85, 0);
    group.add(glowSprite);
    group.userData.glowSprite = glowSprite;

    // Moses' removed leather sandals & shepherd staff on the holy ground in front (Exodus 3:5)
    const leatherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c3c24',
      accentColor: '#a67b51',
      roughness: 0.88
    });
    for (const sx of [-0.22, 0.18]) {
      const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.34), leatherMat);
      sandal.position.set(sx, 0.04, 2.15 + (sx > 0 ? 0.08 : 0));
      sandal.rotation.y = sx * 0.6;
      group.add(sandal);
    }

    group.scale.setScalar(scale);
    return group;
  }

  // The Passover Marked Doorway in Goshen (Exodus 12:7-13 — "when I see the blood, I will pass over you")
  createPassoverDoorway(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const mudBrickMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#5e4937',
      accentColor: palette.horizon || '#9e7c5c',
      roughness: 0.94,
      bumpScale: 0.07
    });

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#3d291a',
      accentColor: '#7a5538',
      roughness: 0.88,
      bumpScale: 0.05
    });

    // Mud-brick house facade left, right, and top walls framing the doorway
    const leftWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.4, 4.2, 0.85, 8, 10, 4), 0.04, 3.0),
      mudBrickMat
    );
    leftWall.position.set(-2.1, 2.1, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.4, 4.2, 0.85, 8, 10, 4), 0.04, 3.0),
      mudBrickMat
    );
    rightWall.position.set(2.1, 2.1, 0);
    group.add(rightWall);

    const topWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(6.6, 1.35, 0.85, 14, 4, 4), 0.04, 3.0),
      mudBrickMat
    );
    topWall.position.set(0, 3.65, 0);
    group.add(topWall);

    // Heavy wooden doorposts & lintel beam
    for (const sx of [-0.88, 0.88]) {
      const post = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.24, 3.0, 0.92, 3, 8, 3), 0.02, 4.0),
        woodMat
      );
      post.position.set(sx, 1.5, 0);
      group.add(post);
    }
    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.25, 0.28, 0.96, 8, 3, 3), 0.02, 4.0),
      woodMat
    );
    lintel.position.set(0, 3.05, 0);
    group.add(lintel);

    // Recessed wooden door with warm golden oil-lamp light glowing through the cracks
    const door = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.58, 2.92, 0.14, 6, 8, 2), 0.015, 4.0),
      woodMat
    );
    door.position.set(0, 1.46, -0.18);
    group.add(door);

    // Painterly crimson blood brushstrokes on the lintel and two doorposts (Exodus 12:7)
    const bloodMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#8f1d18'),
      emissive: new THREE.Color('#4a0806'),
      roughness: 0.65,
      bumpMap: this.painterly.canvasNoiseTex,
      bumpScale: 0.04
    });
    group.userData.bloodMat = bloodMat;

    // Top lintel crimson brushstroke
    const topStroke = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.75, 0.19, 0.04, 8, 2, 1), 0.015, 6.0),
      bloodMat
    );
    topStroke.position.set(0, 3.05, 0.48);
    group.add(topStroke);

    // Left and right doorpost crimson brushstrokes
    for (const sx of [-0.88, 0.88]) {
      const sideStroke = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.18, 2.1, 0.04, 2, 8, 1), 0.015, 6.0),
        bloodMat
      );
      sideStroke.position.set(sx, 1.65, 0.48);
      group.add(sideStroke);
    }

    // Clay basin & hyssop branch at the threshold (Exodus 12:22)
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a5238',
      accentColor: '#b8825c',
      roughness: 0.88
    });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.16, 14), clayMat);
    basin.position.set(-0.92, 0.08, 0.72);
    group.add(basin);

    // Warm golden interior lamp glow sprite
    const glowTex = this.painterly.createGlowSpriteTexture('#ffd384');
    const lampSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffd384,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending
      })
    );
    lampSprite.scale.set(2.8, 3.4, 1);
    lampSprite.position.set(0, 1.55, 0.25);
    group.add(lampSprite);
    group.userData.lampSprite = lampSprite;

    return group;
  }

  // Towering Parted Red Sea Water Wall (Exodus 14:21-22 — "the waters were a wall to them on their right hand, and on their left")
  createPartedSeaWall(length = 44, height = 11.5, side = 1, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const wallGeo = new THREE.PlaneGeometry(length, height, 48, 20);
    const pos = wallGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const hFrac = (y + height * 0.5) / height;
      // Curve the top of the water wall inward like a cresting wave frozen by the east wind
      const curl = Math.pow(hFrac, 2.2) * 2.2 + Math.sin(x * 0.22) * 0.65;
      pos.setZ(i, curl);
    }
    wallGeo.computeVertexNormals();

    const waterWallMat = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uTime: { value: 0.0 },
        uDeepColor: { value: new THREE.Color('#13334c') },
        uCrestColor: { value: new THREE.Color('#3b7e96') },
        uFoamColor: { value: new THREE.Color(palette.accent || '#f2e4c9') }
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 p = position;
          float wave = sin(p.x * 0.45 + uTime * 2.4) * 0.28
                     + cos(p.y * 0.85 - uTime * 3.1) * 0.22;
          p.z += wave;
          vWave = wave;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uCrestColor;
        uniform vec3 uFoamColor;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          float bands = sin(vUv.x * 28.0 + uTime * 2.2 + sin(vUv.y * 12.0)) * 0.5 + 0.5;
          float streaks = sin(vUv.y * 22.0 - uTime * 3.8 + vUv.x * 6.0) * 0.5 + 0.5;
          vec3 col = mix(uDeepColor, uCrestColor, vUv.y * 0.85 + bands * 0.2);
          // Foaming white crest at top and base of the parted wall
          float foamMask = smoothstep(0.76, 0.98, vUv.y + bands * 0.12)
                         + smoothstep(0.18, 0.0, vUv.y) * 0.75
                         + smoothstep(0.78, 0.95, streaks * bands) * 0.35;
          col = mix(col, uFoamColor, clamp(foamMask, 0.0, 1.0));
          gl_FragColor = vec4(col, 0.92);
        }
      `
    });
    this.windMaterials.push(waterWallMat);

    const mesh = new THREE.Mesh(wallGeo, waterWallMat);
    mesh.position.y = height * 0.48;
    mesh.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(mesh);

    return group;
  }

  // The Wilderness Tabernacle & Towering Pillar of Cloud and Fire (Exodus 40:34-38, District 2 signature element)
  createTabernacleAndPillar(propTex = null, palette = {}, scale = 1.0) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const linenMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: '#d9c6a3',
      accentColor: '#f5e8ce',
      roughness: 0.9,
      bumpScale: 0.04
    });

    const tentMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: '#4a3548',
      accentColor: '#d49b54',
      roughness: 0.86,
      bumpScale: 0.06
    });

    const goldMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b88b3b',
      accentColor: '#ffe094',
      roughness: 0.45,
      metalness: 0.55
    });

    // Sanctuary Tent of Meeting
    const tentBody = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(4.2, 2.8, 6.8, 8, 6, 10), 0.04, 2.5),
      tentMat
    );
    tentBody.position.set(0, 1.4, 0);
    group.add(tentBody);

    // Pitched woven covering roof
    const roofGeo = new THREE.CylinderGeometry(0.1, 2.6, 7.2, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.rotateX(Math.PI / 2);
    const roof = new THREE.Mesh(roofGeo, linenMat);
    roof.scale.set(1.15, 0.45, 1.0);
    roof.position.set(0, 3.05, 0);
    group.add(roof);

    // Gold-plated acacia entrance pillars at the front of the tent
    for (let p = -2; p <= 2; p++) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.85, 10), goldMat);
      pillar.position.set(p * 0.85, 1.42, 3.45);
      group.add(pillar);
    }

    // Linen courtyard curtains & bronze posts surrounding the Tabernacle
    for (const sx of [-5.2, 5.2]) {
      const fence = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.12, 1.65, 11.5, 2, 4, 14), 0.03, 3.0),
        linenMat
      );
      fence.position.set(sx, 0.82, 1.2);
      group.add(fence);
    }

    // Bronze Altar of Burnt Offering in the forecourt with glowing coals
    const altar = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.6, 1.05, 1.6, 4, 4, 4), 0.025, 4.0),
      goldMat
    );
    altar.position.set(0, 0.52, 5.6);
    group.add(altar);

    // THE TOWERING PILLAR OF CLOUD AND FIRE (Exodus 13:21-22 & 40:34-38)
    const pillarGeo = new THREE.CylinderGeometry(2.4, 1.35, 26.0, 24, 24, true);
    const pillarMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0.0 },
        uIntensity: { value: 1.15 }
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          float swirl = sin(uTime * 1.8 + p.y * 0.35) * 0.45 * uv.y;
          p.x += swirl;
          p.z += cos(uTime * 1.5 + p.y * 0.3) * 0.45 * uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        void main() {
          float swirl = sin(vUv.x * 18.84 + vUv.y * 10.0 - uTime * 2.4) * 0.5 + 0.5;
          float billow = cos(vUv.y * 16.0 - uTime * 3.1 + sin(vUv.x * 12.56)) * 0.5 + 0.5;
          float edgeFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.18, vUv.y);
          vec3 fireCol = vec3(1.0, 0.62, 0.18);
          vec3 goldCore = vec3(1.0, 0.92, 0.68);
          vec3 cloudCol = vec3(0.88, 0.82, 0.74);
          vec3 col = mix(fireCol, goldCore, swirl * 0.7);
          col = mix(col, cloudCol, smoothstep(0.55, 0.95, vUv.y) * 0.5);
          float alpha = (0.35 + 0.45 * swirl * billow) * edgeFade;
          gl_FragColor = vec4(col * uIntensity, alpha);
        }
      `
    });
    this.windMaterials.push(pillarMat);
    group.userData.pillarMat = pillarMat;

    const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
    pillarMesh.position.set(0, 14.5, 0);
    group.add(pillarMesh);

    // Glory glow filling the Tabernacle
    const glowTex = this.painterly.createGlowSpriteTexture('#ffd984');
    const glorySprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffe29c,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      })
    );
    glorySprite.scale.set(9.5, 9.5, 1);
    glorySprite.position.set(0, 3.2, 1.2);
    group.add(glorySprite);
    group.userData.glorySprite = glorySprite;

    group.scale.setScalar(scale);
    return group;
  }

  // ============================================================================
  // DISTRICT 3 (FIRE BY NIGHT — LEVITICUS & NUMBERS) PROPS
  // ============================================================================

  // Perpetual Fire Altar with stacked morning firewood (Leviticus 6:12-13 — "it shall not go out")
  createPerpetualFireAltar(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#6c5a46',
      accentColor: palette.accent || '#e8b66b',
      roughness: 0.9,
      bumpScale: 0.06
    });

    // Three-tiered hewn stone altar (matching painting No. 5)
    for (let t = 0; t < 3; t++) {
      const w = 2.8 - t * 0.14;
      const tier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(w, 0.36, w, 8, 3, 8), 0.03, 3.5),
        stoneMat
      );
      tier.position.y = 0.18 + t * 0.36;
      group.add(tier);
    }

    // Stacked morning firewood beside the altar
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4f3824',
      accentColor: '#9c744c',
      roughness: 0.88
    });
    for (let l = 0; l < 9; l++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.05, 7), woodMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = 0.25 + (l % 3) * 0.08;
      log.position.set(-1.75 + (l % 3) * 0.16, 0.08 + Math.floor(l / 3) * 0.11, 0.85 + (l % 2) * 0.12);
      group.add(log);
    }

    // Glowing coals & unquenchable flame on top of the altar
    const bushFire = this.createBurningBush(propTex, palette, 0.65);
    bushFire.position.set(0, 0.95, 0);
    group.add(bushFire);
    group.userData.fireMat = bushFire.userData.fireMat;

    if (this.tripo) {
      this.tripo.mountRelic(group, 'bronze-altar-horns', { scale: 1.0, yOffset: 0 });
    }
    return group;
  }

  // The Seven-Branched Golden Lampstand (Menorah — Numbers 8:2-3 "seven lamps")
  createGoldenMenorah(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#665847',
      accentColor: palette.horizon || '#b89f7a',
      roughness: 0.9
    });
    const table = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.6, 0.85, 1.4, 8, 4, 6), 0.025, 3.5),
      stoneMat
    );
    table.position.y = 0.425;
    group.add(table);

    const goldMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b88c32',
      accentColor: '#ffe494',
      roughness: 0.35,
      metalness: 0.72
    });

    // Stepped golden base + central shaft
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, 0.22, 16), goldMat);
    base.position.y = 0.96;
    group.add(base);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.05, 12), goldMat);
    stem.position.y = 1.48;
    group.add(stem);

    // Three curved branches on each side + 7 lamp cups & glowing flames
    for (const r of [0.28, 0.54, 0.80]) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 10, 28, Math.PI), goldMat);
      arc.rotation.z = Math.PI;
      arc.position.set(0, 1.98, 0);
      group.add(arc);
    }

    const glowTex = this.painterly.createGlowSpriteTexture('#ffe294');
    const flameSprites = [];
    for (let i = -3; i <= 3; i++) {
      const lx = i * 0.27;
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.035, 0.09, 12), goldMat);
      cup.position.set(lx, 2.02, 0);
      group.add(cup);

      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: 0xffe49c,
          transparent: true,
          opacity: 0.92,
          blending: THREE.AdditiveBlending
        })
      );
      sp.scale.set(0.55, 0.75, 1);
      sp.position.set(lx, 2.22, 0);
      group.add(sp);
      flameSprites.push(sp);
    }
    group.userData.flameSprites = flameSprites;

    if (this.tripo) {
      this.tripo.mountRelic(group, 'golden-menorah', { scale: 1.0, yOffset: 0 });
    }
    return group;
  }

  // The Split Desert Rock gushing water (Numbers 20:11 — "water came out abundantly")
  createWaterFromRockCrag(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const rockMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#78654e',
      accentColor: palette.horizon || '#c7ae89',
      roughness: 0.92,
      bumpScale: 0.08
    });

    // Two towering cleft rock halves with a dark fissure down the middle
    for (const sx of [-1.25, 1.25]) {
      const cragGeo = this.displaceGeometry(new THREE.DodecahedronGeometry(2.3, 2), 0.22, 1.8);
      const crag = new THREE.Mesh(cragGeo, rockMat);
      crag.position.set(sx, 2.1, 0);
      crag.scale.set(0.95, 1.45, 0.95);
      group.add(crag);
    }

    // Animated turquoise waterfall pouring out of the cleft
    const fallGeo = new THREE.PlaneGeometry(1.15, 3.2, 12, 24);
    const fallMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0.0 }
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.z += sin(p.y * 2.5 - uTime * 5.0) * 0.08 + (1.0 - uv.y) * 0.65;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float flow = sin(vUv.y * 24.0 + uTime * 8.5 + sin(vUv.x * 14.0)) * 0.5 + 0.5;
          vec3 waterCol = mix(vec3(0.18, 0.52, 0.62), vec3(0.88, 0.96, 0.98), flow * 0.75 + (1.0 - vUv.y) * 0.35);
          float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x);
          gl_FragColor = vec4(waterCol, edge * 0.9);
        }
      `
    });
    this.windMaterials.push(fallMat);

    const fallMesh = new THREE.Mesh(fallGeo, fallMat);
    fallMesh.position.set(0, 1.55, 0.85);
    group.add(fallMesh);

    return group;
  }

  // The Bronze Serpent on a Pole (Numbers 21:8-9 — "look and live")
  createBronzeSerpentPole(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#756149',
      accentColor: '#c9a87a',
      roughness: 0.92
    });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const rock = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.35 + (i % 3) * 0.12, 1), 0.04, 3.5),
        stoneMat
      );
      rock.position.set(Math.cos(ang) * 0.55, 0.18, Math.sin(ang) * 0.55);
      group.add(rock);
    }

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#543d28',
      accentColor: '#9c7852',
      roughness: 0.88,
      bumpScale: 0.06
    });
    const pole = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.14, 0.19, 5.4, 12, 12), 0.025, 3.0),
      woodMat
    );
    pole.position.y = 2.7;
    group.add(pole);

    const bronzeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e6324',
      accentColor: '#ffd27d',
      roughness: 0.32,
      metalness: 0.78
    });

    // Coiled helical bronze serpent wrapped around the top of the pole
    const curvePts = [];
    for (let i = 0; i <= 36; i++) {
      const t = i / 36;
      const ang = t * Math.PI * 5.2;
      const rad = 0.22 + Math.sin(t * Math.PI) * 0.08;
      curvePts.push(new THREE.Vector3(Math.cos(ang) * rad, 3.6 + t * 1.65, Math.sin(ang) * rad));
    }
    const curve = new THREE.CatmullRomCurve3(curvePts);
    const serpentGeo = new THREE.TubeGeometry(curve, 64, 0.068, 10, false);
    const serpentMesh = new THREE.Mesh(serpentGeo, bronzeMat);
    group.add(serpentMesh);

    const glowTex = this.painterly.createGlowSpriteTexture('#ffd984');
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0xffe29c,
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending
      })
    );
    glow.scale.set(3.2, 3.2, 1);
    glow.position.set(0, 4.8, 0);
    group.add(glow);
    group.userData.glow = glow;

    if (this.tripo) {
      this.tripo.mountRelic(group, 'nehushtan-bronze-serpent', { scale: 1.0, yOffset: 0 });
    }
    return group;
  }

  // District 3 Signature Street Element: The Pillar of Fire that goes BEFORE the pilgrim at night (§7)
  createGuidingPillarOfFire() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const colGeo = new THREE.CylinderGeometry(0.95, 0.55, 14.0, 20, 16, true);
    const colMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0.0 }
      },
      vertexShader: /* glsl */`
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 p = position;
          p.x += sin(uTime * 2.4 + p.y * 0.6) * 0.22 * uv.y;
          p.z += cos(uTime * 2.0 + p.y * 0.5) * 0.22 * uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float s = sin(vUv.x * 12.56 + vUv.y * 10.0 - uTime * 3.0) * 0.5 + 0.5;
          float fade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.2, vUv.y);
          vec3 col = mix(vec3(1.0, 0.55, 0.12), vec3(1.0, 0.92, 0.65), s);
          gl_FragColor = vec4(col, fade * (0.38 + 0.35 * s));
        }
      `
    });
    this.windMaterials.push(colMat);

    const mesh = new THREE.Mesh(colGeo, colMat);
    mesh.position.y = 7.0;
    group.add(mesh);

    const light = new THREE.PointLight(0xffc966, 2.6, 24);
    light.position.set(0, 2.8, 0);
    group.add(light);

    return group;
  }

  // ============================================================================
  // DISTRICT 4 (CHOOSE LIFE — DEUTERONOMY) PROPS
  // ============================================================================

  // The Doorpost with the Bound Scroll of the Shema (Deuteronomy 6:6-9 — "the doorpost")
  createMezuzahDoorpost(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: palette.ground || '#857359',
      accentColor: '#dfc69e',
      roughness: 0.9
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b533b',
      accentColor: '#b5946d',
      roughness: 0.88
    });

    // Stone house wall & timber doorframes
    for (const sx of [-1.2, 1.2]) {
      const wall = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.4, 3.6, 0.65, 6, 8, 4), 0.03, 3.5),
        stoneMat
      );
      wall.position.set(sx * 1.45, 1.8, 0);
      group.add(wall);

      const post = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.28, 3.2, 0.72, 3, 8, 3), 0.02, 4.0),
        woodMat
      );
      post.position.set(sx * 0.78, 1.6, 0);
      group.add(post);
    }

    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.4, 0.32, 0.76, 8, 3, 3), 0.02, 4.0),
      woodMat
    );
    lintel.position.set(0, 3.25, 0);
    group.add(lintel);

    // Rolled parchment scroll tied to the right doorpost (matching painting No. 10)
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#e6d4b3',
      accentColor: '#fff4dc',
      roughness: 0.9
    });
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 12), parchmentMat);
    scroll.position.set(-0.78, 1.75, 0.39);
    scroll.rotation.z = -0.12;
    group.add(scroll);

    return group;
  }

  // The Forgotten Sheaf in the Field (Deuteronomy 24:19-21 & Ruth — "the forgotten sheaf")
  createForgottenSheafField(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const wheatMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: '#ba924a',
      accentColor: '#f5d98e',
      roughness: 0.86,
      bumpScale: 0.06
    });

    // Hourglass-bundled golden wheat sheaf standing upright
    const lowerSheaf = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.26, 0.52, 1.15, 14, 6), 0.035, 5.0),
      wheatMat
    );
    lowerSheaf.position.y = 0.57;
    group.add(lowerSheaf);

    const upperSheaf = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.55, 0.26, 1.05, 14, 6), 0.045, 5.0),
      wheatMat
    );
    upperSheaf.position.y = 1.62;
    group.add(upperSheaf);

    // Cord tied around the waist of the sheaf
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 8, 24), wheatMat);
    cord.rotation.x = Math.PI / 2;
    cord.position.y = 1.12;
    group.add(cord);

    return group;
  }

  // District 4 Signature Element: Fork of Two Gates (Blessing & Curse) + Stone of Witness (§7, Deuteronomy 30:19)
  createTwoRoadsForkAndWitness(propTex = null, palette = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    // Central Stone Cairn of Witness with staff, water jar, and scroll (matching painting No. 30)
    const witnessCairn = this.createStoneAltar(propTex, palette);
    witnessCairn.scale.setScalar(0.95);
    if (this.tripo) {
      this.tripo.mountRelic(witnessCairn, 'shechem-witness-stone', { scale: 1.0, yOffset: 0 });
    }
    group.add(witnessCairn);

    // Shepherd's staff leaning against the Stone of Witness
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4f3924',
      accentColor: '#9c7852',
      roughness: 0.88
    });
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.2, 8), woodMat);
    staff.position.set(-0.25, 1.1, 0.25);
    staff.rotation.z = 0.22;
    group.add(staff);

    // Right Gate: The Way of Life & Blessing (warm golden olive-crowned arch)
    const blessingGate = new THREE.Group();
    blessingGate.position.set(3.8, 0, -3.5);
    blessingGate.rotation.y = -0.25;
    const goldStone = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7654',
      accentColor: '#ffe094',
      roughness: 0.82
    });
    for (const sx of [-1.4, 1.4]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 3.4, 10), goldStone);
      col.position.set(sx, 1.7, 0);
      blessingGate.add(col);
    }
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.32, 0.4), goldStone);
    topBeam.position.set(0, 3.45, 0);
    blessingGate.add(topBeam);
    group.add(blessingGate);

    // Left Gate: The Barren Way of Warning (weathered desert stone posts)
    const curseGate = new THREE.Group();
    curseGate.position.set(-3.8, 0, -3.5);
    curseGate.rotation.y = 0.25;
    const darkStone = this.painterly.createPainterlyMaterial({
      baseColor: '#544a3f',
      accentColor: '#8a7b68',
      roughness: 0.94
    });
    for (const sx of [-1.4, 1.4]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 3.1, 10), darkStone);
      col.position.set(sx, 1.55, 0);
      curseGate.add(col);
    }
    group.add(curseGate);

    return group;
  }

  // Creates one of the 44 Book Gates in the 3D Walkable Gatehouse Courtyard (§4)
  createGatehouseBookGate(routeItem, coverTex, isPlayable, isCompleted, lightsKindledCount = 0) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: isCompleted ? '#8c734b' : isPlayable ? '#78664e' : '#594e40',
      accentColor: isCompleted ? '#ffe49e' : '#d6b47c',
      roughness: 0.86
    });

    // Two carved gate pillars + lintel arch
    for (const sx of [-1.15, 1.15]) {
      const col = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.28, 2.9, 0.32, 3, 6, 3), 0.02, 4.0),
        stoneMat
      );
      col.position.set(sx, 1.45, 0);
      group.add(col);
    }
    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.8, 0.3, 0.38, 6, 2, 3), 0.02, 4.0),
      stoneMat
    );
    lintel.position.set(0, 2.95, 0);
    group.add(lintel);

    // Real Book Cover displayed in the gate
    if (coverTex) {
      const coverPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(1.75, 1.75),
        new THREE.MeshBasicMaterial({ map: coverTex, side: THREE.DoubleSide })
      );
      coverPlane.position.set(0, 1.55, 0.04);
      group.add(coverPlane);
    }

    // Overhead carved plaque with Book # and Title
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');
    ctx.fillStyle = isPlayable ? '#292016' : '#1f1a14';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = isCompleted ? '#ffe08c' : isPlayable ? '#d6b47c' : '#6e5d45';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#f7ead0';
    ctx.font = 'bold 28px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${routeItem.n}. ${routeItem.title}`, 256, 54);

    ctx.fillStyle = isCompleted ? '#ffe08c' : isPlayable ? '#dbb87b' : '#9c8b70';
    ctx.font = '20px Georgia, serif';
    const statusText = isCompleted
      ? `✦ Completed · ${lightsKindledCount} Lights`
      : isPlayable
      ? `✦ Open Gate — Press [E] to Enter`
      : routeItem.subtitle;
    ctx.fillText(statusText.slice(0, 44), 256, 94);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 0.58),
      new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide })
    );
    signMesh.position.set(0, 3.45, 0.06);
    group.add(signMesh);

    // Warm golden light spilling out of playable & completed gates (§4)
    if (isPlayable || isCompleted) {
      const glowTex = this.painterly.createGlowSpriteTexture('#ffe29c');
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: isCompleted ? 0xffeaad : 0xffd984,
          transparent: true,
          opacity: isCompleted ? 0.72 : 0.48,
          blending: THREE.AdditiveBlending
        })
      );
      sp.scale.set(3.4, 3.4, 1);
      sp.position.set(0, 1.6, -0.1);
      group.add(sp);
    }

    return group;
  }

  setTripoManager(tripoManager) {
    this.tripo = tripoManager;
  }

  // ==========================================================================
  // DISTRICT V (JOSHUA & JUDGES) & DISTRICT VI (RUTH) PROPS + TRIPO HOOKS
  // ==========================================================================

  // Joshua & Judges No. 3: Rahab's Window on the Jericho Wall with the Scarlet Line
  createRahabScarletWindowWall() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const wallMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b59d79',
      accentColor: '#dfc8a2',
      roughness: 0.9
    });
    const timberMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4631',
      accentColor: '#87694b',
      roughness: 0.88
    });
    const scarletMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e2420',
      accentColor: '#df453b',
      emissive: '#380907',
      roughness: 0.72
    });

    // Tall limestone wall section with window opening
    const lowerWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(4.4, 2.5, 0.9, 8, 6, 3), 0.04, 2.2),
      wallMat
    );
    lowerWall.position.set(0, 1.25, 0);
    group.add(lowerWall);

    for (const sx of [-1.35, 1.35]) {
      const pier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.7, 1.8, 0.9, 5, 5, 3), 0.04, 2.2),
        wallMat
      );
      pier.position.set(sx, 3.4, 0);
      group.add(pier);
    }

    const topWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(4.4, 1.1, 0.9, 8, 3, 3), 0.04, 2.2),
      wallMat
    );
    topWall.position.set(0, 4.85, 0);
    group.add(topWall);

    // Timber window sill & lintel
    const sill = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.14, 0.98), timberMat);
    sill.position.set(0, 2.52, 0.02);
    group.add(sill);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.16, 0.98), timberMat);
    lintel.position.set(0, 4.25, 0.02);
    group.add(lintel);

    // The Scarlet Line knotted to the sill and hanging down the wall
    const knot = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.032, 8, 16), scarletMat);
    knot.position.set(0.12, 2.52, 0.48);
    knot.rotation.x = Math.PI / 2;
    group.add(knot);

    const cordCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.12, 2.5, 0.5),
      new THREE.Vector3(0.15, 1.9, 0.52),
      new THREE.Vector3(0.09, 1.3, 0.51),
      new THREE.Vector3(0.14, 0.65, 0.52)
    ]);
    const cordMesh = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 24, 0.032, 8, false), scarletMat);
    group.add(cordMesh);

    const cordLight = new THREE.PointLight('#ff6e54', 1.6, 7);
    cordLight.position.set(0.12, 1.8, 0.85);
    group.add(cordLight);

    return { group, cordMesh, cordLight };
  }

  // Joshua & Judges No. 6: Twelve Wet River Stones Stacked at the Jordan Bank
  createTwelveJordanStones() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const wetStoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#595347',
      accentColor: '#968b76',
      roughness: 0.68
    });

    const stones = [];
    let currentY = 0.08;
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const radX = 0.72 * (1 - t * 0.48);
      const radZ = 0.62 * (1 - t * 0.48);
      const height = 0.21 * (1 - t * 0.25);

      const geom = new THREE.SphereGeometry(1.0, 16, 12);
      geom.scale(radX, height * 0.58, radZ);
      this.displaceGeometry(geom, 0.035, 3.5, i * 13);

      const stone = new THREE.Mesh(geom, wetStoneMat);
      stone.position.set(
        Math.sin(i * 1.9) * 0.03,
        currentY + height * 0.5,
        Math.cos(i * 2.3) * 0.03
      );
      stone.rotation.y = i * 0.55;
      group.add(stone);
      stones.push(stone);
      currentY += height * 0.88;
    }

    const cairnLight = new THREE.PointLight('#ffdca0', 1.8, 8);
    cairnLight.position.set(0, 1.8, 0.9);
    group.add(cairnLight);

    return { group, stones, cairnLight };
  }

  // Joshua & Judges No. 10: Carved Ram's Horn Shofar & Fallen Stones of Jericho
  createJerichoShofarAndFallenStones() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#baa382',
      accentColor: '#e3d0b2',
      roughness: 0.9
    });
    const hornMat = this.painterly.createPainterlyMaterial({
      baseColor: '#cdb48a',
      accentColor: '#f5e2be',
      roughness: 0.65
    });
    const bandMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7248',
      accentColor: '#d9bc82',
      roughness: 0.55
    });

    // Tumbled Jericho limestone blocks
    const blockSpecs = [
      [-0.9, 0.28, -0.3, 1.1, 0.55, 0.85, 0.2, 0.1],
      [0.7, 0.32, -0.25, 1.2, 0.62, 0.9, -0.35, -0.12],
      [0.0, 0.24, 0.25, 1.35, 0.48, 0.85, 0.08, 0.05],
      [-1.5, 0.2, 0.4, 0.85, 0.4, 0.7, 0.5, -0.15],
      [1.45, 0.22, 0.35, 0.9, 0.44, 0.75, -0.4, 0.14]
    ];
    blockSpecs.forEach(([x, y, z, w, h, d, ry, rz], idx) => {
      const b = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(w, h, d, 4, 3, 4), 0.035, 3.0, idx * 7),
        stoneMat
      );
      b.position.set(x, y, z);
      b.rotation.set(0.05, ry, rz);
      group.add(b);
    });

    // Hero Relic Mount Group for the Carved Ram's Horn Shofar
    const shofarGroup = new THREE.Group();
    shofarGroup.position.set(0, 0.52, 0.22);

    const curvePts = [];
    const segs = 28;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = -0.75 + t * 1.55;
      const y = Math.pow(1 - t, 2.2) * 0.62 + Math.sin(t * Math.PI) * 0.06;
      const z = Math.sin(t * Math.PI * 1.15) * 0.22;
      curvePts.push(new THREE.Vector3(x, y, z));
    }
    const hornCurve = new THREE.CatmullRomCurve3(curvePts);
    const tubeGeom = new THREE.TubeGeometry(hornCurve, 32, 0.14, 14, false);
    // Taper from wide bell (t=0) to narrow mouthpiece (t=1)
    const pos = tubeGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const ringIdx = Math.floor(i / 15);
      const t = Math.min(1, ringIdx / 32);
      const center = hornCurve.getPointAt(t);
      const taper = 1.15 * (1 - t * 0.78);
      pos.setXYZ(
        i,
        center.x + (pos.getX(i) - center.x) * taper,
        center.y + (pos.getY(i) - center.y) * taper,
        center.z + (pos.getZ(i) - center.z) * taper
      );
    }
    pos.needsUpdate = true;
    tubeGeom.computeVertexNormals();

    const shofarMesh = new THREE.Mesh(tubeGeom, hornMat);
    shofarGroup.add(shofarMesh);

    // Decorative bronze collar bands
    for (const bt of [0.12, 0.72]) {
      const pt = hornCurve.getPointAt(bt);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15 * (1 - bt * 0.72), 0.02, 8, 16), bandMat);
      ring.position.copy(pt);
      ring.rotation.y = Math.PI / 2;
      shofarGroup.add(ring);
    }

    if (this.tripo) {
      this.tripo.mountRelic(shofarGroup, 'jericho-rams-horn-shofar', { scale: 1.0, yOffset: -0.05 });
    }
    group.add(shofarGroup);

    const hornLight = new THREE.PointLight('#ffe09e', 1.8, 8);
    hornLight.position.set(0, 1.5, 0.6);
    group.add(hornLight);

    return { group, shofarGroup, hornLight };
  }

  // Joshua & Judges No. 33: Gideon's Shattered Clay Pitcher & Blazing Torch
  createGideonBrokenPitcherAndTorch() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8f6848',
      accentColor: '#c9986d',
      roughness: 0.86
    });

    const relicGroup = new THREE.Group();

    // Ring of broken terracotta pitcher shards around the central torch
    for (let i = 0; i < 9; i++) {
      const ang = (i / 9) * Math.PI * 2;
      const dist = 0.42 + (i % 3) * 0.14;
      const shardGeom = new THREE.CylinderGeometry(0.28, 0.34, 0.42, 8, 1, true, 0, 0.95);
      const shard = new THREE.Mesh(shardGeom, clayMat);
      shard.position.set(Math.cos(ang) * dist, 0.16, Math.sin(ang) * dist);
      shard.rotation.set(0.55 + (i % 2) * 0.25, -ang, 0.2);
      relicGroup.add(shard);
    }

    // Neck & handle of the broken pitcher on the left
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.38, 12, 1, true), clayMat);
    neck.position.set(-0.58, 0.22, 0.1);
    neck.rotation.z = 1.15;
    relicGroup.add(neck);

    if (this.tripo) {
      this.tripo.mountRelic(relicGroup, 'gideon-broken-pitcher', { scale: 1.0, yOffset: 0 });
    }
    group.add(relicGroup);

    // Blazing torch flame in the center
    const glowTex = this.painterly.createGlowSpriteTexture('#ffae42');
    const flameSprites = [];
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: i % 2 === 0 ? 0xffdf85 : 0xff7b29,
          transparent: true,
          opacity: 0.82,
          blending: THREE.AdditiveBlending
        })
      );
      sp.position.set((Math.random() - 0.5) * 0.12, 0.35 + i * 0.18, (Math.random() - 0.5) * 0.12);
      sp.scale.set(0.95 - i * 0.1, 1.35 + i * 0.12, 1);
      group.add(sp);
      flameSprites.push(sp);
    }

    const torchLight = new THREE.PointLight('#ff9c3b', 2.8, 12);
    torchLight.position.set(0, 0.9, 0);
    group.add(torchLight);

    return { group, flameSprites, torchLight };
  }

  // Joshua No. 20 / Genesis No. 40: Carved Cedar Chest of Joseph's Bones
  createJosephChestAtShechem() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#593e25',
      accentColor: '#8c6640',
      roughness: 0.85
    });

    const box = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.45, 0.72, 0.82, 4, 3, 3), 0.012, 5.0),
      woodMat
    );
    box.position.y = 0.36;
    group.add(box);

    const lid = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.52, 0.12, 0.88, 4, 2, 3), 0.01, 5.0),
      woodMat
    );
    lid.position.y = 0.76;
    group.add(lid);

    if (this.tripo) {
      this.tripo.mountRelic(group, 'joseph-coffin-chest', { scale: 1.0, yOffset: 0 });
    }
    return group;
  }

  // Ruth No. 4: Fork on the Bethlehem Road with Footprints & Milestone
  createRuthRoadForkAndMilestone() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c7d56',
      accentColor: '#cfa97a',
      roughness: 0.88
    });

    const milestone = new THREE.Mesh(
      this.displaceGeometry(new THREE.ConeGeometry(0.42, 1.55, 7), 0.035, 3.0),
      stoneMat
    );
    milestone.position.set(0, 0.75, 0);
    group.add(milestone);

    // Low fieldstone wall & wellhead beside the fork
    const wellWall = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.15, 0.68, 14, 1, true),
      stoneMat
    );
    wellWall.position.set(2.8, 0.34, -1.2);
    group.add(wellWall);

    const roadLight = new THREE.PointLight('#ffe0a3', 1.8, 9);
    roadLight.position.set(-1.2, 1.6, 0.5);
    group.add(roadLight);

    return { group, milestone, roadLight };
  }

  // Ruth No. 15: Starlight Threshing Floor & Crimson-Fringed Kinsman's Cloak
  createThreshingFloorCloak() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const grainMat = this.painterly.createPainterlyMaterial({
      baseColor: '#cbb077',
      accentColor: '#f0d89c',
      roughness: 0.9
    });
    const cloakMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b8a88e',
      accentColor: '#dfd1b8',
      roughness: 0.88
    });
    const crimsonMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a251f',
      accentColor: '#b83e35',
      roughness: 0.85
    });

    // Golden heap of winnowed barley
    const heapGeom = new THREE.ConeGeometry(1.55, 0.95, 18);
    this.displaceGeometry(heapGeom, 0.04, 3.0);
    const heap = new THREE.Mesh(heapGeom, grainMat);
    heap.position.set(-0.6, 0.45, -0.3);
    group.add(heap);

    // Draped woven wool cloak with crimson border at the corner
    const cloakGeom = new THREE.PlaneGeometry(1.75, 1.35, 14, 14);
    cloakGeom.rotateX(-Math.PI / 2);
    const pos = cloakGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const fold = Math.sin(x * 4.5 + z * 2.0) * 0.06 + Math.max(0, (0.6 - z) * 0.22);
      pos.setY(i, 0.08 + fold);
    }
    pos.needsUpdate = true;
    cloakGeom.computeVertexNormals();
    const cloakMesh = new THREE.Mesh(cloakGeom, cloakMat);
    cloakMesh.position.set(0.55, 0.05, 0.35);
    group.add(cloakMesh);

    const borderStrip = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.06, 0.28),
      crimsonMat
    );
    borderStrip.position.set(0.55, 0.11, 0.95);
    group.add(borderStrip);

    // Wooden winnowing fork leaning against the low stone wall
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#73573b',
      accentColor: '#a6825b',
      roughness: 0.86
    });
    const forkHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 2.1, 8), woodMat);
    forkHandle.position.set(1.35, 1.0, -0.6);
    forkHandle.rotation.z = -0.32;
    group.add(forkHandle);

    const cloakLight = new THREE.PointLight('#ffdfa0', 1.8, 8);
    cloakLight.position.set(0.3, 1.4, 0.5);
    group.add(cloakLight);

    return { group, cloakMesh, cloakLight };
  }

  // Ruth No. 20: Town Gate of Bethlehem & The Kinsman's Leather Sandal
  createBethlehemGateAndSandal() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b59f7e',
      accentColor: '#dfd0b4',
      roughness: 0.88
    });
    const leatherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#694528',
      accentColor: '#9e6d43',
      roughness: 0.76
    });

    // Bethlehem Town Gate stone piers & elders' bench step
    for (const sx of [-1.8, 1.8]) {
      const pier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.95, 3.4, 1.2, 4, 6, 4), 0.035, 2.5),
        stoneMat
      );
      pier.position.set(sx, 1.7, -0.8);
      group.add(pier);
    }
    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(4.7, 0.55, 1.25, 8, 2, 4), 0.035, 2.5),
      stoneMat
    );
    lintel.position.set(0, 3.6, -0.8);
    group.add(lintel);

    // Carved stone step/pedestal in foreground where the Kinsman's Sandal rests
    const pedestal = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.35, 0.62, 0.95, 5, 3, 4), 0.025, 3.5),
      stoneMat
    );
    pedestal.position.set(0, 0.31, 0.35);
    group.add(pedestal);

    // Hero Relic Mount Group for the Kinsman-Redeemer's Sandal
    const sandalGroup = new THREE.Group();
    sandalGroup.position.set(0, 0.63, 0.35);

    const soleGeom = new THREE.BoxGeometry(0.58, 0.045, 0.26, 6, 1, 4);
    this.displaceGeometry(soleGeom, 0.008, 6.0);
    const sole = new THREE.Mesh(soleGeom, leatherMat);
    sole.position.y = 0.025;
    sandalGroup.add(sole);

    for (const xOff of [-0.14, 0.02, 0.16]) {
      const strap = new THREE.Mesh(
        new THREE.TorusGeometry(0.13, 0.022, 8, 16, Math.PI),
        leatherMat
      );
      strap.position.set(xOff, 0.04, 0);
      strap.rotation.y = Math.PI / 2;
      sandalGroup.add(strap);
    }

    if (this.tripo) {
      this.tripo.mountRelic(sandalGroup, 'ruth-kinsman-sandal', { scale: 1.0, yOffset: 0 });
    }
    group.add(sandalGroup);

    const sandalLight = new THREE.PointLight('#ffe09c', 1.8, 8);
    sandalLight.position.set(0, 1.4, 0.5);
    group.add(sandalLight);

    return { group, sandalGroup, sandalLight };
  }

  // 1 Samuel 2:18–21: Hannah's Little Woven Linen Robe on a Cedar Table with Bone Needle & Red Thread
  createLinenRobeTable() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#664930',
      accentColor: '#9b734e',
      roughness: 0.86
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9cbb3',
      accentColor: '#f5ead6',
      roughness: 0.88
    });
    const crimsonMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c2822',
      accentColor: '#c9453c',
      roughness: 0.8
    });

    const tableTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.5, 0.09, 1.0, 6, 2, 4), 0.015, 4.0),
      woodMat
    );
    tableTop.position.set(0, 0.78, 0);
    group.add(tableTop);

    for (const [lx, lz] of [[-0.62, -0.38], [0.62, -0.38], [-0.62, 0.38], [0.62, 0.38]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.78, 8), woodMat);
      leg.position.set(lx, 0.39, lz);
      group.add(leg);
    }

    // Folded little linen robe with sleeves
    const robeBody = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.62, 0.08, 0.52, 6, 2, 6), 0.012, 5.0),
      linenMat
    );
    robeBody.position.set(-0.08, 0.86, 0);
    group.add(robeBody);

    for (const sx of [-0.42, 0.26]) {
      const sleeve = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.22, 0.06, 0.26, 4, 2, 4), 0.01, 5.0),
        linenMat
      );
      sleeve.position.set(sx, 0.85, -0.06);
      sleeve.rotation.y = sx < 0 ? 0.28 : -0.28;
      group.add(sleeve);
    }

    // Crimson stitched collar border & spool of thread
    const hem = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.02, 0.06), crimsonMat);
    hem.position.set(-0.08, 0.905, 0.22);
    group.add(hem);

    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 12), crimsonMat);
    spool.position.set(0.42, 0.88, 0.18);
    group.add(spool);

    return group;
  }

  // 1 Samuel 3:1–10: The Clay Lamp That Had Not Yet Gone Out & Young Samuel's Sleeping Mat
  createSamuelLampAndMat() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c5044',
      accentColor: '#8c7a67',
      roughness: 0.9
    });
    const matMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a88d67',
      accentColor: '#d9be96',
      roughness: 0.92
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c5338',
      accentColor: '#c77d57',
      roughness: 0.78
    });

    // Low stone pedestal beside the woven reed sleeping mat
    const lampStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.45, 0.52, 0.34, 14), 0.02, 4.0),
      stoneMat
    );
    lampStone.position.set(0, 0.17, 0);
    group.add(lampStone);

    // Woven sleeping mat & folded linen blanket beside the lamp
    const sleepMat = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.45, 0.04, 2.25, 8, 1, 10), 0.015, 4.5),
      matMat
    );
    sleepMat.position.set(-1.35, 0.03, 0.35);
    sleepMat.rotation.y = 0.15;
    group.add(sleepMat);

    // Sculpted terracotta oil lamp body with pinched spout
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0, 0.35, 0);

    const bowl = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.22, 16, 12), 0.01, 6.0),
      clayMat
    );
    bowl.scale.set(1.25, 0.52, 0.95);
    lampGroup.add(bowl);

    const spout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.08, 0.18, 10),
      clayMat
    );
    spout.rotation.z = -Math.PI / 2.6;
    spout.position.set(0.24, 0.04, 0);
    lampGroup.add(spout);

    if (this.tripo) {
      this.tripo.mountRelic(lampGroup, 'samuel-clay-lamp', { scale: 1.0, yOffset: 0 });
    }
    group.add(lampGroup);

    // Living golden flame on the wick
    const flameMat = new THREE.MeshBasicMaterial({
      color: '#ffdf80',
      transparent: true,
      opacity: 0.95
    });
    const flameMesh = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 12), flameMat);
    flameMesh.position.set(0.30, 0.52, 0);
    group.add(flameMesh);

    const glowTex = this.painterly.createGlowSpriteTexture('#ffcf6e');
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#ffd275',
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      })
    );
    halo.position.set(0.30, 0.56, 0);
    halo.scale.set(1.65, 1.65, 1);
    group.add(halo);

    const lampLight = new THREE.PointLight('#ffcb6b', 2.4, 14);
    lampLight.position.set(0.30, 0.72, 0);
    group.add(lampLight);

    return { group, flameMesh, halo, lampLight };
  }

  // 1 Samuel 7:12: Ebenezer — The Upright "Stone of Help"
  createEbenezerStone(scale = 1.0) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a7265',
      accentColor: '#b8ac99',
      roughness: 0.89
    });

    const monolith = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.95, 2.35, 0.58, 6, 12, 5), 0.06, 2.6),
      stoneMat
    );
    monolith.position.set(0, 1.15, 0);
    monolith.rotation.z = 0.03;
    group.add(monolith);

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      const baseRock = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.32, 1), 0.04, 3.5),
        stoneMat
      );
      baseRock.position.set(Math.cos(a) * 0.58, 0.18, Math.sin(a) * 0.45);
      group.add(baseRock);
    }

    group.scale.setScalar(scale);
    return group;
  }

  // 1 Samuel 16:1–13: Samuel's Carved Horn of Anointing Oil on a Bethlehem Field Stone
  createAnointingHornPedestal() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#85755e',
      accentColor: '#baa688',
      roughness: 0.88
    });
    const hornMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d4be94',
      accentColor: '#f5e4bf',
      roughness: 0.62
    });
    const goldMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c99738',
      accentColor: '#ffda75',
      roughness: 0.38
    });

    // Pasture stone ledge
    const ledge = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.92, 1.15, 0.72, 14), 0.045, 3.0),
      stoneMat
    );
    ledge.position.set(0, 0.36, 0);
    group.add(ledge);

    // Curved carved ram's horn of oil
    const hornGroup = new THREE.Group();
    hornGroup.position.set(0, 0.84, 0);

    const hornArch = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.095, 12, 24, Math.PI * 0.82),
      hornMat
    );
    hornArch.rotation.z = Math.PI * 0.12;
    hornGroup.add(hornArch);

    const brassBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.105, 0.018, 8, 16),
      goldMat
    );
    brassBand.position.set(0.36, 0.08, 0);
    brassBand.rotation.x = Math.PI / 2;
    hornGroup.add(brassBand);

    // Glistening golden olive oil pool at the mouth of the horn
    const oilDrop = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 14, 14),
      new THREE.MeshBasicMaterial({ color: '#ffcf5c' })
    );
    oilDrop.position.set(0.37, 0.11, 0);
    hornGroup.add(oilDrop);

    if (this.tripo) {
      this.tripo.mountRelic(hornGroup, 'samuel-anointing-horn', { scale: 1.0, yOffset: 0 });
    }
    group.add(hornGroup);

    const hornLight = new THREE.PointLight('#ffd670', 2.1, 11);
    hornLight.position.set(0.2, 1.45, 0.3);
    group.add(hornLight);

    return { group, hornGroup, oilDrop, hornLight };
  }

  // 1 Samuel 16:23: David's Wooden Harp (Kinnor) Leaning Beside an Oil Lamp
  createDavidHarp(scale = 1.0) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e4726',
      accentColor: '#b07846',
      roughness: 0.78
    });
    const stringMat = new THREE.MeshBasicMaterial({ color: '#f5deb3' });

    const soundbox = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.56, 0.38, 0.14, 4, 4, 2), 0.01, 5.0),
      woodMat
    );
    soundbox.position.set(0, 0.22, 0);
    group.add(soundbox);

    for (const sx of [-0.24, 0.24]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.72, 8), woodMat);
      arm.position.set(sx, 0.68, 0);
      arm.rotation.z = sx < 0 ? 0.14 : -0.14;
      group.add(arm);
    }

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.68, 8), woodMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 1.02, 0);
    group.add(crossbar);

    for (let i = -3; i <= 3; i++) {
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.65, 4), stringMat);
      str.position.set(i * 0.055, 0.68, 0);
      group.add(str);
    }

    group.scale.setScalar(scale);
    return group;
  }

  // 1 Samuel 17:40: Five Smooth Stones in the Brook of Elah with Leather Sling & Shepherd's Pouch
  createSmoothStonesBrook() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a69c8a',
      accentColor: '#e6dfd1',
      roughness: 0.52
    });
    const leatherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#694425',
      accentColor: '#a36e40',
      roughness: 0.82
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#3f7687',
      emissive: '#173842',
      roughness: 0.22,
      metalness: 0.15,
      transparent: true,
      opacity: 0.82
    });

    // Clear brook water surface
    const brookBed = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.4, 0.08, 24),
      waterMat
    );
    brookBed.position.set(0, 0.04, 0);
    group.add(brookBed);

    // Five smooth river stones arranged in a gentle arc in the shallow brook
    const stones = [];
    const coords = [
      [-0.52, 0.12, 0.18],
      [-0.26, 0.13, -0.05],
      [0.02, 0.14, -0.14],
      [0.30, 0.13, -0.03],
      [0.54, 0.12, 0.20]
    ];
    for (let i = 0; i < 5; i++) {
      const [sx, sy, sz] = coords[i];
      const pebble = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.135, 16, 12), 0.008, 5.0),
        stoneMat.clone()
      );
      pebble.scale.set(1.25, 0.62, 1.05);
      pebble.position.set(sx, sy, sz);
      pebble.rotation.y = i * 0.55;
      group.add(pebble);
      stones.push(pebble);
    }

    // Shepherd's leather pouch & woven sling on the mossy bank rock
    const bankRock = new THREE.Mesh(
      this.displaceGeometry(new THREE.DodecahedronGeometry(0.55, 1), 0.04, 3.0),
      this.painterly.createPainterlyMaterial({ baseColor: '#6e6454', accentColor: '#9c8f79', roughness: 0.9 })
    );
    bankRock.scale.set(1.3, 0.55, 1.1);
    bankRock.position.set(-1.15, 0.22, 0.65);
    group.add(bankRock);

    const pouch = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.24, 12, 10), 0.02, 4.0),
      leatherMat
    );
    pouch.position.set(-1.12, 0.48, 0.62);
    group.add(pouch);

    const slingLoop = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.022, 8, 20, Math.PI * 1.45),
      leatherMat
    );
    slingLoop.rotation.x = Math.PI / 2;
    slingLoop.position.set(-0.78, 0.36, 0.74);
    group.add(slingLoop);

    const brookLight = new THREE.PointLight('#ffe59e', 2.2, 11);
    brookLight.position.set(0, 1.35, 0.2);
    group.add(brookLight);

    return { group, stones, brookBed, brookLight };
  }

  // 2 Samuel 9:1–13: At the King's Table — Mephibosheth's Place Set Continually & Wooden Crutch
  createKingsTablePlace() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const cedarMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5e3a20',
      accentColor: '#96613b',
      roughness: 0.78
    });
    const runnerMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9c8a9',
      accentColor: '#f5ead4',
      roughness: 0.86
    });
    const goldMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c79332',
      accentColor: '#ffda73',
      roughness: 0.35
    });
    const breadMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b57b3b',
      accentColor: '#e3a862',
      roughness: 0.84
    });

    // Long royal cedar table
    const tabletop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.6, 0.12, 1.25, 8, 2, 4), 0.015, 4.0),
      cedarMat
    );
    tabletop.position.set(0, 0.86, 0);
    group.add(tabletop);

    for (const [lx, lz] of [[-1.08, -0.46], [1.08, -0.46], [-1.08, 0.46], [1.08, 0.46]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.86, 10), cedarMat);
      leg.position.set(lx, 0.43, lz);
      group.add(leg);
    }

    // Woven linen table runner
    const runner = new THREE.Mesh(new THREE.BoxGeometry(2.64, 0.02, 0.48), runnerMat);
    runner.position.set(0, 0.925, 0);
    group.add(runner);

    // Warm round loaves of bread, brass goblet, and pomegranate bowl
    for (const [bx, bz] of [[-0.38, 0.08], [0.25, -0.06]]) {
      const loaf = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.18, 14, 10), 0.012, 5.0),
        breadMat
      );
      loaf.scale.set(1.2, 0.58, 1.0);
      loaf.position.set(bx, 0.99, bz);
      group.add(loaf);
    }

    const goblet = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.05, 0.24, 12), goldMat);
    goblet.position.set(0.02, 1.05, 0.24);
    group.add(goblet);

    // Carved wooden armchair at the place of honor & Mephibosheth's wooden crutch leaning against it
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.58), cedarMat);
    chairSeat.position.set(0, 0.52, 0.82);
    group.add(chairSeat);

    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.68, 0.07), cedarMat);
    chairBack.position.set(0, 0.88, 1.08);
    group.add(chairBack);

    const crutchShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 1.28, 8), cedarMat);
    crutchShaft.position.set(0.46, 0.62, 0.92);
    crutchShaft.rotation.z = -0.24;
    group.add(crutchShaft);

    const crutchRest = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, 0.07), cedarMat);
    crutchRest.position.set(0.32, 1.22, 0.92);
    crutchRest.rotation.z = -0.24;
    group.add(crutchRest);

    const tableLight = new THREE.PointLight('#ffd478', 2.4, 12);
    tableLight.position.set(0, 1.65, 0.15);
    group.add(tableLight);

    return { group, goblet, tableLight };
  }

  // 1 Kings 8:6–11: Solomon's Gold-and-Cedar Sanctuary & The Cloud of Glory
  createCedarTempleSanctuary() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const goldMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c9932e',
      accentColor: '#ffe07d',
      roughness: 0.34
    });
    const cedarMat = this.painterly.createPainterlyMaterial({
      baseColor: '#633c1e',
      accentColor: '#9e6638',
      roughness: 0.76
    });

    // Gold-overlaid Ark of the Covenant at the center of the Inner Sanctuary
    const arkChest = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.45, 0.82, 0.88, 6, 4, 4), 0.012, 4.0),
      goldMat
    );
    arkChest.position.set(0, 0.62, 0);
    group.add(arkChest);

    // Carrying poles extending forward
    for (const sx of [-0.52, 0.52]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 2.8, 10), goldMat);
      pole.rotation.x = Math.PI / 2;
      pole.position.set(sx, 0.55, 0.15);
      group.add(pole);
    }

    // Two tall olive-wood-and-gold Cherubim wings arching overhead (1 Kings 6:23–28)
    for (const sx of [-0.85, 0.85]) {
      const wing = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.15, 1.65, 0.12, 6, 8, 2), 0.025, 3.5),
        goldMat
      );
      wing.position.set(sx * 0.55, 1.75, -0.15);
      wing.rotation.z = sx < 0 ? -0.38 : 0.38;
      group.add(wing);
    }

    // Tall carved cedar columns framing the sanctuary
    for (const [cx, cz] of [[-2.8, -1.8], [2.8, -1.8], [-2.8, 1.8], [2.8, 1.8]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 4.8, 14), cedarMat);
      col.position.set(cx, 2.4, cz);
      group.add(col);
    }

    // Volumetric luminous Cloud of Glory billboards
    const glowTex = this.painterly.createGlowSpriteTexture('#fff0b8');
    const cloudSprites = [];
    for (let i = 0; i < 9; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: i % 2 === 0 ? '#ffe89e' : '#fff7d6',
          transparent: true,
          opacity: 0.42,
          blending: THREE.AdditiveBlending
        })
      );
      const a = (i / 9) * Math.PI * 2;
      sp.position.set(Math.cos(a) * 1.4, 1.45 + (i % 3) * 0.55, Math.sin(a) * 1.1);
      sp.scale.set(3.8, 2.9, 1);
      group.add(sp);
      cloudSprites.push(sp);
    }

    const gloryLight = new THREE.PointLight('#ffe494', 2.8, 16);
    gloryLight.position.set(0, 2.2, 0.4);
    group.add(gloryLight);

    return { group, cloudSprites, gloryLight };
  }

  // 1 Kings 18:30–39: Elijah's Twelve-Stone Altar on Mount Carmel & Water-Filled Trench
  createCarmelAltar() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e6559',
      accentColor: '#a69986',
      roughness: 0.9
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4f3522',
      accentColor: '#875c3d',
      roughness: 0.88
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#3b6e82',
      emissive: '#294854',
      roughness: 0.2,
      metalness: 0.25,
      transparent: true,
      opacity: 0.85
    });

    // Circular water-filled trench around the altar (1 Kings 18:32–35)
    const trenchWater = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 2.15, 28),
      waterMat
    );
    trenchWater.rotation.x = -Math.PI / 2;
    trenchWater.position.y = 0.04;
    group.add(trenchWater);

    // Twelve unhewn stones stacked in two rings (one for each tribe of Jacob)
    for (let i = 0; i < 12; i++) {
      const ring = i < 7 ? 0 : 1;
      const count = ring === 0 ? 7 : 5;
      const idx = ring === 0 ? i : i - 7;
      const ang = (idx / count) * Math.PI * 2 + ring * 0.35;
      const rad = ring === 0 ? 0.82 : 0.48;
      const stone = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.38, 1), 0.045, 3.2),
        stoneMat
      );
      stone.scale.set(1.15, 0.78, 1.0);
      stone.position.set(Math.cos(ang) * rad, 0.28 + ring * 0.42, Math.sin(ang) * rad);
      group.add(stone);
    }

    // Split wood laid in order on top of the twelve stones
    for (let w = 0; w < 5; w++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.25, 8), woodMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (w / 5) * Math.PI;
      log.position.set(0, 0.96 + (w % 2) * 0.1, 0);
      group.add(log);
    }

    // Descending Fire from Heaven column & golden-orange blaze
    const glowTex = this.painterly.createGlowSpriteTexture('#ff9d3b');
    const fireSprites = [];
    for (let f = 0; f < 6; f++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: f < 2 ? '#fff2b2' : '#ff7b24',
          transparent: true,
          opacity: 0.78,
          blending: THREE.AdditiveBlending
        })
      );
      sp.position.set(0, 1.25 + f * 0.55, 0);
      sp.scale.set(2.4 - f * 0.18, 2.6, 1);
      group.add(sp);
      fireSprites.push(sp);
    }

    const fireLight = new THREE.PointLight('#ff9436', 2.8, 16);
    fireLight.position.set(0, 2.1, 0);
    group.add(fireLight);

    return { group, trenchWater, fireSprites, fireLight };
  }

  // 1 Kings 19:9–13: Mouth of Mount Horeb's Cave & Elijah's Mantle at the Threshold
  createHorebCaveArch() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const rockMat = this.painterly.createPainterlyMaterial({
      baseColor: '#594e45',
      accentColor: '#8c7b6b',
      roughness: 0.92
    });
    const mantleMat = this.painterly.createPainterlyMaterial({
      baseColor: '#785a3c',
      accentColor: '#ad855d',
      roughness: 0.88
    });

    // Sculpted granite cave arch framing the quiet morning valley beyond
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const ang = t * Math.PI;
      const rx = Math.cos(ang) * 2.35;
      const ry = Math.sin(ang) * 2.65 + 0.5;
      const boulder = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.85, 1), 0.08, 2.4),
        rockMat
      );
      boulder.scale.set(1.2, 1.1, 1.35);
      boulder.position.set(rx, ry, -0.5);
      group.add(boulder);
    }

    // Flat threshold stone where Elijah stood wrapped in his mantle
    const threshold = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.6, 0.24, 1.5, 8, 2, 6), 0.03, 3.5),
      rockMat
    );
    threshold.position.set(0, 0.12, 0.35);
    group.add(threshold);

    // Folded prophet's wool mantle resting on the threshold rock
    const mantle = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.78, 0.14, 0.55, 6, 2, 6), 0.02, 4.5),
      mantleMat
    );
    mantle.position.set(0.35, 0.28, 0.42);
    mantle.rotation.y = -0.25;
    group.add(mantle);

    if (this.tripo) {
      this.tripo.mountRelic(group, 'elijah-folded-mantle', { scale: 1.0, yOffset: 0.25 });
    }

    // Soft silver-gold whisper halo at the mouth of the cave
    const glowTex = this.painterly.createGlowSpriteTexture('#ffeac2');
    const whisperHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#ffefd1',
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      })
    );
    whisperHalo.position.set(0, 1.65, 0.2);
    whisperHalo.scale.set(3.2, 3.2, 1);
    group.add(whisperHalo);

    const caveLight = new THREE.PointLight('#ffebd1', 2.0, 14);
    caveLight.position.set(0, 1.85, 0.6);
    group.add(caveLight);

    return { group, whisperHalo, caveLight };
  }

  // 2 Kings 6:15–17: Luminous Horses and Chariots of Fire on the Hills of Dothan
  createChariotOfFireCluster() {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const fireGoldMat = new THREE.MeshStandardMaterial({
      color: '#ffcf66',
      emissive: '#ff7b1c',
      emissiveIntensity: 1.35,
      roughness: 0.3,
      metalness: 0.4
    });

    const glowTex = this.painterly.createGlowSpriteTexture('#ffae42');
    const chariots = [];

    for (let c = 0; c < 5; c++) {
      const cGroup = new THREE.Group();
      const ang = ((c - 2) / 4) * 1.35;
      const dist = c === 2 ? 0 : 3.2 + Math.abs(c - 2) * 1.4;
      cGroup.position.set(Math.sin(ang) * dist, (c === 2 ? 0.35 : 0.75 + Math.abs(c - 2) * 0.45), -Math.cos(ang) * (dist * 0.45));
      cGroup.rotation.y = -ang * 0.5;

      // Chariot body & blazing spoked wheels
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.42, 0.65, 12, 1, true, 0, Math.PI),
        fireGoldMat
      );
      body.rotation.y = Math.PI / 2;
      body.position.set(0, 0.48, 0);
      cGroup.add(body);

      for (const wx of [-0.52, 0.52]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.04, 8, 18), fireGoldMat);
        wheel.rotation.y = Math.PI / 2;
        wheel.position.set(wx, 0.34, 0);
        cGroup.add(wheel);
      }

      // Stylized rearing fiery steed silhouette in front of chariot
      const steedBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.52, 6, 10), fireGoldMat);
      steedBody.rotation.x = Math.PI / 3;
      steedBody.position.set(0, 0.62, 0.78);
      cGroup.add(steedBody);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: '#ffb84d',
          transparent: true,
          opacity: 0.82,
          blending: THREE.AdditiveBlending
        })
      );
      halo.position.set(0, 0.65, 0.35);
      halo.scale.set(2.8, 2.2, 1);
      cGroup.add(halo);

      group.add(cGroup);
      chariots.push({ cGroup, halo });
    }

    const chariotLight = new THREE.PointLight('#ffaa3b', 2.8, 18);
    chariotLight.position.set(0, 2.0, 0.8);
    group.add(chariotLight);

    return { group, chariots, chariotLight };
  }

  // 2 Kings 20:9–11: The Sundial Steps of Ahaz Where the Shadow Went Back Ten Steps
  createSundialSteps(scale = 1.0) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b59d7e',
      accentColor: '#e3cca8',
      roughness: 0.86
    });

    for (let s = 0; s < 10; s++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.14, 0.28),
        stoneMat
      );
      step.position.set(0, 0.07 + s * 0.14, -s * 0.24);
      group.add(step);
    }

    const gnomon = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 1.35, 10), stoneMat);
    gnomon.position.set(0.65, 1.85, -2.1);
    group.add(gnomon);

    group.scale.setScalar(scale);
    return group;
  }

  // ============================================================================
  // DISTRICTS IX–XLIV (BOOKS #9 TO #44) — SACRED 3D FOCAL PROP ASSEMBLIES
  // Covers all 144 Step-Through Scenes across Books #9–#44 + Finale Plaza Props
  // ============================================================================

  createFocalPropForScene(kind, propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#7d6e59',
      accentColor: pal.accent || '#e8c889',
      roughness: 0.86,
      bumpScale: 0.05
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#694b30',
      accentColor: '#a67c52',
      roughness: 0.85,
      bumpScale: 0.04
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#efe4ce',
      accentColor: '#fff8ea',
      roughness: 0.9
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a86743',
      accentColor: '#d99b6c',
      roughness: 0.82
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#f2ca68',
      emissive: '#593b08',
      emissiveIntensity: 0.55,
      roughness: 0.3,
      metalness: 0.78
    });
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: '#b88449',
      roughness: 0.42,
      metalness: 0.65
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: '#4e5259',
      roughness: 0.52,
      metalness: 0.72
    });

    // Base stone dais / sanctuary hearth circle (preserved underneath imported .glb sculptures)
    const dais = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.85, 2.05, 0.18, 28), 0.025, 3.0),
      stoneMat
    );
    dais.position.y = 0.09;
    dais.userData.keepWithGlb = true;
    group.add(dais);

    const innerPlinth = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.15, 1.32, 0.14, 24), 0.02, 3.5),
      stoneMat
    );
    innerPlinth.position.y = 0.22;
    innerPlinth.userData.keepWithGlb = true;
    group.add(innerPlinth);

    const glowTex = this.painterly.createGlowSpriteTexture(pal.accent || '#ffe29c');
    const focalHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: pal.accent || '#ffe29c',
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending
      })
    );
    focalHalo.position.set(0, 1.55, 0);
    focalHalo.scale.set(2.8, 2.8, 1);
    group.add(focalHalo);

    const focalLight = new THREE.PointLight(pal.accent || '#ffde8a', 2.4, 16);
    focalLight.position.set(0, 1.85, 0.4);
    group.add(focalLight);

    const animatedParts = [];

    // Category 1: Thresholds, Gates, Open Doors, Pillars & Veils
    if ([
      'chron_thresholds', 'chron_one_sound', 'valley_of_achor_door',
      'gate_called_beautiful', 'broken_dividing_wall', 'finish_line_pillar',
      'pillar_of_truth', 'opened_curtain_way', 'open_door_compassion',
      'behold_i_stand_and_knock'
    ].includes(kind)) {
      for (const sx of [-1.05, 1.05]) {
        const col = new THREE.Mesh(
          this.displaceGeometry(new THREE.CylinderGeometry(0.24, 0.28, 2.8, 14), 0.02, 3.5),
          kind === 'gate_called_beautiful' ? bronzeMat : stoneMat
        );
        col.position.set(sx, 1.48, 0);
        group.add(col);
      }
      if (kind !== 'broken_dividing_wall') {
        const lintel = new THREE.Mesh(
          this.displaceGeometry(new THREE.BoxGeometry(2.65, 0.32, 0.48, 8, 2, 4), 0.02, 3.5),
          stoneMat
        );
        lintel.position.set(0, 2.95, 0);
        group.add(lintel);
      }
      if (kind === 'behold_i_stand_and_knock' || kind === 'open_door_compassion' || kind === 'chron_thresholds') {
        const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.92, 2.45, 0.12), woodMat);
        doorLeaf.position.set(-0.48, 1.38, 0.15);
        doorLeaf.rotation.y = kind === 'behold_i_stand_and_knock' ? 0.35 : 0.72;
        group.add(doorLeaf);
        const ringKnocker = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 18), goldMat);
        ringKnocker.position.set(-0.22, 1.42, 0.25);
        group.add(ringKnocker);
        animatedParts.push(ringKnocker);
      } else if (kind === 'opened_curtain_way') {
        for (const sx of [-0.65, 0.65]) {
          const curtain = new THREE.Mesh(
            this.displaceGeometry(new THREE.BoxGeometry(0.55, 2.55, 0.08, 4, 12, 2), 0.03, 4.0),
            this.painterly.createPainterlyMaterial({ baseColor: '#4c2c5e', accentColor: '#d9b26f', roughness: 0.85 })
          );
          curtain.position.set(sx, 1.45, 0.08);
          curtain.rotation.z = sx * -0.14;
          group.add(curtain);
        }
      } else if (kind === 'chron_one_sound') {
        for (const sx of [-0.45, 0.45]) {
          const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.15, 14, 1, true), goldMat);
          horn.position.set(sx, 1.45, 0.25);
          horn.rotation.x = -Math.PI / 3;
          horn.rotation.z = sx * -0.25;
          group.add(horn);
          animatedParts.push(horn);
        }
      } else if (kind === 'broken_dividing_wall') {
        for (let b = 0; b < 7; b++) {
          const blk = new THREE.Mesh(this.displaceGeometry(new THREE.BoxGeometry(0.52, 0.32, 0.38), 0.03, 3.5), stoneMat);
          blk.position.set((b - 3) * 0.42, 0.26 + (b % 2) * 0.14, (b % 3 - 1) * 0.25);
          blk.rotation.set(b * 0.2, b * 0.5, b * 0.15);
          group.add(blk);
        }
      }
    }

    // Category 2: Tables of Bread, Cup, Hospitality & Fellowship
    else if ([
      'chron_ark_feast', 'daniel_pulse_table', 'emmaus_table_bread',
      'communion_cup_loaf', 'psalms_hymns_table', 'philemon_guest_room',
      'quiet_table_loaf', 'face_to_face_table', 'doers_mirror_table',
      'armor_of_god_table'
    ].includes(kind)) {
      const tableTop = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.85, 0.12, 1.15, 8, 2, 6), 0.015, 4.0),
        woodMat
      );
      tableTop.position.y = 0.88;
      group.add(tableTop);
      for (const lx of [-0.75, 0.75]) {
        for (const lz of [-0.42, 0.42]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.78, 8), woodMat);
          leg.position.set(lx, 0.48, lz);
          group.add(leg);
        }
      }
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.03, 1.18), linenMat);
      cloth.position.set(0, 0.94, 0);
      group.add(cloth);

      if (kind === 'armor_of_god_table') {
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), bronzeMat);
        helmet.position.set(-0.38, 1.02, 0);
        group.add(helmet);
        const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 20), bronzeMat);
        shield.rotation.x = Math.PI / 2 - 0.35;
        shield.position.set(0.45, 1.12, -0.15);
        group.add(shield);
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.88), goldMat);
        sword.position.set(0.05, 0.98, 0.12);
        sword.rotation.y = 0.4;
        group.add(sword);
        animatedParts.push(sword);
      } else if (kind === 'doers_mirror_table') {
        const mirrorDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 24), bronzeMat);
        mirrorDisk.rotation.x = Math.PI / 3;
        mirrorDisk.position.set(0, 1.18, -0.1);
        group.add(mirrorDisk);
        animatedParts.push(mirrorDisk);
      } else {
        // Broken bread halves + cup / pitcher
        for (const bx of [-0.24, 0.08]) {
          const loaf = new THREE.Mesh(
            this.displaceGeometry(new THREE.SphereGeometry(0.18, 12, 10), 0.015, 5.0),
            this.painterly.createPainterlyMaterial({ baseColor: '#c98e4b', accentColor: '#f0c486', roughness: 0.85 })
          );
          loaf.scale.set(1.2, 0.58, 0.95);
          loaf.position.set(bx, 1.01, 0.08);
          group.add(loaf);
        }
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.07, 0.24, 14), kind === 'daniel_pulse_table' ? clayMat : goldMat);
        cup.position.set(0.42, 1.07, -0.08);
        group.add(cup);
        animatedParts.push(cup);
      }
    }

    // Category 3: Illuminated Scrolls, Books of Remembrance, Parchments & Lecterns
    else if ([
      'water_gate_scroll', 'sleepless_chronicles', 'exile_letter_scroll',
      'anathoth_deed_jars', 'book_of_remembrance', 'praetorian_scroll_chain',
      'cancelled_scroll_cross', 'lois_eunice_scrolls', 'cloak_and_parchments'
    ].includes(kind)) {
      const pedestal = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.15, 0.95, 0.85, 6, 6, 6), 0.02, 3.5),
        kind === 'water_gate_scroll' ? woodMat : stoneMat
      );
      pedestal.position.y = 0.56;
      group.add(pedestal);

      // Unrolled scroll with wooden rollers
      const scrollSheet = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.03, 0.58), linenMat);
      scrollSheet.position.set(0, 1.06, 0);
      scrollSheet.rotation.x = 0.18;
      group.add(scrollSheet);
      for (const rx of [-0.44, 0.44]) {
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.66, 12), woodMat);
        roller.rotation.x = Math.PI / 2 + 0.18;
        roller.position.set(rx, 1.08, 0);
        group.add(roller);
      }
      if (kind === 'anathoth_deed_jars') {
        const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.58, 14), clayMat);
        jar.position.set(0.75, 0.46, 0.25);
        group.add(jar);
      } else if (kind === 'cloak_and_parchments') {
        const cloak = new THREE.Mesh(
          this.displaceGeometry(new THREE.BoxGeometry(0.65, 0.18, 0.52, 6, 2, 6), 0.02, 4.0),
          this.painterly.createPainterlyMaterial({ baseColor: '#6e4730', accentColor: '#b3815b', roughness: 0.88 })
        );
        cloak.position.set(-0.72, 0.28, 0.25);
        group.add(cloak);
      } else if (kind === 'cancelled_scroll_cross') {
        const beamV = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.55, 0.18), woodMat);
        beamV.position.set(0, 1.45, -0.45);
        group.add(beamV);
        const beamH = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.16, 0.16), woodMat);
        beamH.position.set(0, 2.05, -0.45);
        group.add(beamH);
      }
      animatedParts.push(scrollSheet);
    }

    // Category 4: Rebuilt Stone Walls, Altars, Trowel & Sword, Plumb Line, Cornerstone
    else if ([
      'ezra_altar', 'nehemiah_night_ride', 'trowel_and_sword',
      'amos_plumb_line', 'living_stones_cornerstone', 'redeemer_rock',
      'rock_higher', 'nothing_can_separate_rock', 'chron_eyes_on_you'
    ].includes(kind)) {
      for (let r = 0; r < 3; r++) {
        for (let c = -1; c <= 1; c++) {
          const block = new THREE.Mesh(
            this.displaceGeometry(new THREE.BoxGeometry(0.68, 0.38, 0.52, 4, 3, 3), 0.025, 3.5),
            r === 2 && c === 0 && kind === 'living_stones_cornerstone' ? goldMat : stoneMat
          );
          block.position.set(c * 0.70 + (r % 2) * 0.18, 0.36 + r * 0.39, 0);
          group.add(block);
          if (r === 2 && c === 0) animatedParts.push(block);
        }
      }
      if (kind === 'trowel_and_sword') {
        const sword = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.92, 0.03), ironMat);
        sword.position.set(0.65, 0.72, 0.34);
        sword.rotation.z = 0.25;
        group.add(sword);
        const trowel = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 4), ironMat);
        trowel.position.set(-0.25, 1.42, 0.1);
        trowel.rotation.z = Math.PI / 2;
        group.add(trowel);
      } else if (kind === 'amos_plumb_line') {
        const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.65, 8), goldMat);
        cord.position.set(0, 1.85, 0.38);
        group.add(cord);
        const bob = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 12), bronzeMat);
        bob.rotation.x = Math.PI;
        bob.position.set(0, 0.95, 0.38);
        group.add(bob);
        animatedParts.push(bob);
      }
    }

    // Category 5: Royal Scepter, Throne of Grace, Crown of Righteousness, Servant Towel
    else if ([
      'susa_courtyard', 'esther_fast', 'golden_scepter',
      'nineveh_sackcloth_throne', 'servant_towel_crown', 'throne_of_grace',
      'crown_of_righteousness'
    ].includes(kind)) {
      const throneSeat = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.25, 0.65, 0.95, 6, 4, 4), 0.02, 3.5),
        stoneMat
      );
      throneSeat.position.set(0, 0.48, -0.1);
      group.add(throneSeat);
      const throneBack = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.25, 1.45, 0.22, 6, 6, 2), 0.02, 3.5),
        stoneMat
      );
      throneBack.position.set(0, 1.35, -0.48);
      group.add(throneBack);

      if (kind === 'golden_scepter' || kind === 'susa_courtyard' || kind === 'esther_fast') {
        const scepter = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 1.45, 12), goldMat);
        scepter.rotation.x = Math.PI / 2.6;
        scepter.position.set(0, 1.05, 0.32);
        group.add(scepter);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 14), goldMat);
        orb.position.set(0, 1.32, 0.92);
        group.add(orb);
        animatedParts.push(scepter, orb);
      } else {
        const crown = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 10, 24), goldMat);
        crown.rotation.x = Math.PI / 2;
        crown.position.set(0, 0.92, 0.05);
        group.add(crown);
        animatedParts.push(crown);
      }
      if (kind === 'servant_towel_crown') {
        const towel = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.42), linenMat);
        towel.position.set(-0.35, 0.85, 0.25);
        group.add(towel);
      }
    }

    // Category 6: Living Trees by Water, Blossoming Almond, Vine & Fig, Olive Tree, River of Life
    else if ([
      'streams_of_water', 'green_pastures', 'scent_of_water',
      'blossoming_almond', 'winter_is_past', 'watching_almond_branch',
      'lily_and_olive_dew', 'vine_and_fig_tree', 'grafted_olive_tree',
      'fruit_of_the_spirit_grove', 'rooted_in_love_tree', 'river_of_life_new_jerusalem',
      'jonah_booth_vine'
    ].includes(kind)) {
      const tree = this.createGreatPainterlyTree(propTex, {
        ground: '#5d4732',
        horizon: ['blossoming_almond', 'watching_almond_branch', 'winter_is_past'].includes(kind) ? '#f5d9e2' : '#6c8752',
        accent: pal.accent || '#ffe29c'
      }, 0.95);
      tree.position.set(0, 0.15, -0.2);
      group.add(tree);

      // Glowing golden fruits / blossoms in the boughs
      for (let f = 0; f < 9; f++) {
        const ang = (f / 9) * Math.PI * 2;
        const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.10, 10, 10), goldMat);
        blossom.position.set(Math.cos(ang) * 1.15, 1.85 + (f % 3) * 0.35, Math.sin(ang) * 1.15 - 0.2);
        group.add(blossom);
        animatedParts.push(blossom);
      }
    }

    // Category 7: Wellsprings, Stone Water Jars, Fountains, Basin & Towel, Charcoal Fire
    else if ([
      'deer_brook', 'be_still_waters', 'wellspring_of_life',
      'locked_garden_fountain', 'night_watch_water', 'cana_stone_jars',
      'jacob_well_jar', 'fresh_spring_well', 'upper_room_basin',
      'galilee_charcoal_fire'
    ].includes(kind)) {
      if (kind === 'galilee_charcoal_fire') {
        for (let r = 0; r < 9; r++) {
          const ang = (r / 9) * Math.PI * 2;
          const st = new THREE.Mesh(this.displaceGeometry(new THREE.DodecahedronGeometry(0.22, 1), 0.03, 3.0), stoneMat);
          st.position.set(Math.cos(ang) * 0.65, 0.24, Math.sin(ang) * 0.65);
          group.add(st);
        }
        const coals = new THREE.Mesh(
          new THREE.CylinderGeometry(0.48, 0.55, 0.16, 16),
          new THREE.MeshStandardMaterial({ color: '#ff6e24', emissive: '#ff4500', emissiveIntensity: 1.4 })
        );
        coals.position.y = 0.24;
        group.add(coals);
        animatedParts.push(coals);
      } else {
        const wellWall = new THREE.Mesh(
          this.displaceGeometry(new THREE.CylinderGeometry(0.95, 1.05, 0.78, 22, 1, true), 0.03, 3.5),
          stoneMat
        );
        wellWall.position.y = 0.52;
        group.add(wellWall);
        const waterDisk = new THREE.Mesh(
          new THREE.CircleGeometry(0.88, 22),
          new THREE.MeshStandardMaterial({ color: '#4c8896', roughness: 0.15, metalness: 0.35 })
        );
        waterDisk.rotation.x = -Math.PI / 2;
        waterDisk.position.y = 0.72;
        group.add(waterDisk);

        const jarCount = kind === 'cana_stone_jars' ? 6 : 2;
        for (let j = 0; j < jarCount; j++) {
          const ang = (j / jarCount) * Math.PI * 1.4 - 1.1;
          const rad = kind === 'cana_stone_jars' ? 1.25 : 1.15;
          const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.56, 14), kind === 'cana_stone_jars' ? stoneMat : clayMat);
          jar.position.set(Math.cos(ang) * rad, 0.45, Math.sin(ang) * rad);
          group.add(jar);
        }
      }
    }

    // Category 8: Golden Lampstands, Sanctuary Lamps, Live Coal Altar, Seven Lampstands
    else if ([
      'house_of_the_lord', 'sanctuary_lamps', 'sparrow_altar',
      'lamp_to_my_feet', 'lamp_before_dawn', 'solitary_city_lantern',
      'seraph_live_coal', 'zechariah_olive_lampstand', 'sermon_mount_lamp',
      'morning_star_lamp', 'seven_golden_lampstands', 'cradle_lamp_warmth',
      'tentmaker_loom_lamp', 'peace_on_guard_lantern'
    ].includes(kind)) {
      const lampCount = kind === 'seven_golden_lampstands' ? 7 : 1;
      for (let l = 0; l < lampCount; l++) {
        const ang = (l / lampCount) * Math.PI * 2;
        const rad = lampCount === 1 ? 0 : 1.18;
        const lx = lampCount === 1 ? 0 : Math.cos(ang) * rad;
        const lz = lampCount === 1 ? 0 : Math.sin(ang) * rad;

        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 1.35, 12), goldMat);
        stand.position.set(lx, 0.82, lz);
        group.add(stand);

        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.10, 0.16, 14), goldMat);
        bowl.position.set(lx, 1.54, lz);
        group.add(bowl);

        const flame = new THREE.Mesh(
          new THREE.ConeGeometry(0.09, 0.28, 10),
          new THREE.MeshBasicMaterial({ color: '#fff3b8' })
        );
        flame.position.set(lx, 1.72, lz);
        group.add(flame);
        animatedParts.push(flame);
      }
    }

    // Category 9: Boats on the Sea, Rudders, Anchors of the Soul
    else if ([
      'storm_stilled_haven', 'rivers_to_the_sea', 'tarshish_storm_ship',
      'depths_of_the_sea', 'walking_on_the_sea', 'peace_be_still_boat',
      'malta_four_anchors', 'anchor_of_the_soul', 'wooden_rudder_helm',
      'cast_your_cares_shore'
    ].includes(kind)) {
      if (kind === 'anchor_of_the_soul' || kind === 'malta_four_anchors') {
        const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.75, 12), goldMat);
        shank.position.y = 1.15;
        group.add(shank);
        const stock = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15, 10), woodMat);
        stock.rotation.z = Math.PI / 2;
        stock.position.y = 1.72;
        group.add(stock);
        const flukeArc = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.075, 10, 24, Math.PI), goldMat);
        flukeArc.rotation.z = Math.PI;
        flukeArc.position.y = 0.88;
        group.add(flukeArc);
        animatedParts.push(shank, flukeArc);
      } else {
        const hull = new THREE.Mesh(
          this.displaceGeometry(new THREE.BoxGeometry(2.65, 0.62, 1.25, 10, 4, 6), 0.04, 2.5),
          woodMat
        );
        hull.position.y = 0.45;
        group.add(hull);
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.35, 10), woodMat);
        mast.position.set(0.15, 1.55, 0);
        group.add(mast);
        const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.65), linenMat);
        cushion.position.set(-0.88, 0.78, 0);
        group.add(cushion);
        animatedParts.push(hull);
      }
    }

    // Category 10: Potter's Wheel, Treasure in Clay Jars, Crucible of Gold, Alabaster Jar
    else if ([
      'tears_in_bottle', 'apples_of_gold', 'iron_sharpens_iron',
      'jeremiah_potter_wheel', 'alabaster_jar', 'treasure_in_clay_jars',
      'crucible_of_gold'
    ].includes(kind)) {
      const wheelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.78, 0.16, 20), woodMat);
      wheelBase.position.y = 0.58;
      group.add(wheelBase);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.55, 10), woodMat);
      axle.position.y = 0.35;
      group.add(axle);

      for (let v = 0; v < 3; v++) {
        const ang = (v / 3) * Math.PI * 2;
        const rad = v === 0 ? 0 : 0.68;
        const vessel = new THREE.Mesh(
          this.displaceGeometry(new THREE.CylinderGeometry(0.20, 0.28, 0.68, 16), 0.015, 4.0),
          v === 0 && kind === 'crucible_of_gold' ? goldMat : clayMat
        );
        vessel.position.set(Math.cos(ang) * rad, v === 0 ? 0.98 : 0.52, Math.sin(ang) * rad);
        group.add(vessel);
        if (v === 0) animatedParts.push(vessel);
      }
    }

    // Category 11: Empty Tomb & Rolled Stone, Valley of Dry Bones, Dawn Resurrection
    else if ([
      'rolled_away_stone', 'valley_of_dry_bones',
      'new_every_morning_dawn', 'children_of_the_day_dawn'
    ].includes(kind)) {
      const archRock = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(1.45, 1), 0.08, 2.5),
        stoneMat
      );
      archRock.scale.set(1.35, 1.1, 0.85);
      archRock.position.set(-0.35, 1.25, -0.55);
      group.add(archRock);

      const millstone = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.88, 0.88, 0.28, 24), 0.03, 3.5),
        stoneMat
      );
      millstone.rotation.x = Math.PI / 2;
      millstone.position.set(1.18, 0.96, 0.25);
      group.add(millstone);

      const foldedCloth = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.38), linenMat);
      foldedCloth.position.set(-0.25, 0.32, 0.15);
      group.add(foldedCloth);
      animatedParts.push(millstone);
    }

    // Category 12: Bethlehem Manger & Star, Magi Gifts, Fiery Furnace, Lions' Den, Emerald Rainbow Throne & All Remaining
    else {
      if (kind === 'bethlehem_manger' || kind === 'magi_star_gifts') {
        const trough = new THREE.Mesh(
          this.displaceGeometry(new THREE.BoxGeometry(1.35, 0.56, 0.82, 6, 4, 4), 0.025, 3.5),
          stoneMat
        );
        trough.position.y = 0.45;
        group.add(trough);
        const swaddling = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), linenMat);
        swaddling.scale.set(1.4, 0.55, 0.9);
        swaddling.position.y = 0.78;
        group.add(swaddling);
        animatedParts.push(swaddling);
      } else {
        // Luminous Sanctuary Pillar / Emerald Rainbow / Whirlwind / Watchtower Centerpiece
        const pillar = new THREE.Mesh(
          this.displaceGeometry(new THREE.CylinderGeometry(0.48, 0.62, 1.45, 18), 0.025, 3.5),
          stoneMat
        );
        pillar.position.y = 0.85;
        group.add(pillar);

        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.045, 12, 36), goldMat);
        ring1.position.y = 1.65;
        group.add(ring1);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 10, 32), goldMat);
        ring2.rotation.x = Math.PI / 3;
        ring2.position.y = 1.65;
        group.add(ring2);
        animatedParts.push(ring1, ring2);
      }
    }

    return { group, focalLight, focalHalo, animatedParts };
  }

  createBookFinaleProp(slug, pal = {}) {
    const map = {
      'our-eyes-are-on-you': 'chron_one_sound',
      'rise-up-and-build': 'water_gate_scroll',
      'for-such-a-time-as-this': 'golden_scepter',
      'out-of-the-whirlwind': 'whirlwind_stars',
      'psalms-1': 'streams_of_water',
      'psalms-2': 'deer_brook',
      'psalms-3': 'sparrow_altar',
      'psalms-4': 'lamp_to_my_feet',
      'the-beginning-of-wisdom': 'wellspring_of_life',
      'eternity-in-their-hearts': 'blossoming_almond',
      'many-waters': 'locked_garden_fountain',
      'arise-shine': 'arise_shine_light',
      'a-future-and-a-hope': 'jeremiah_potter_wheel',
      'new-every-morning': 'new_every_morning_dawn',
      'can-these-bones-live': 'temple_river_trees',
      'greatly-beloved': 'open_window_jerusalem',
      'a-door-of-hope': 'valley_of_achor_door',
      'out-of-the-deep': 'jonah_booth_vine',
      'the-day-of-small-things': 'zechariah_olive_lampstand',
      'good-news-of-great-joy': 'emmaus_table_bread',
      'i-am-with-you-always': 'rolled_away_stone',
      'peace-be-still': 'peace_be_still_boat',
      'come-and-see': 'upper_room_basin',
      'to-the-ends-of-the-earth': 'pentecost_upper_room',
      'nothing-can-separate': 'nothing_can_separate_rock',
      'treasure-in-clay-jars': 'treasure_in_clay_jars',
      'rooted-and-free': 'armor_of_god_table',
      'joy-in-chains': 'peace_on_guard_lantern',
      'held-together': 'held_together_cosmos',
      'children-of-the-day': 'children_of_the_day_dawn',
      'grace-mercy-and-peace': 'crown_of_righteousness',
      'anchor-of-the-soul': 'anchor_of_the_soul',
      'doers-of-the-word': 'fresh_spring_well',
      'a-living-hope': 'living_stones_cornerstone',
      'little-children': 'open_door_compassion',
      'all-things-new': 'river_of_life_new_jerusalem'
    };
    const kind = map[slug] || 'river_of_life_new_jerusalem';
    return this.createFocalPropForScene(kind, null, pal).group;
  }
}

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
      fPlane.userData.keepWithGlb = true;
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
      sandal.userData.keepWithGlb = true;
      group.add(sandal);
    }

    if (this.tripo) {
      this.tripo.mountRelic(group, 'burning-bush-crag', { scale: 1.0, yOffset: 0 });
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
      rock.userData.keepWithGlb = true;
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

  // ============================================================================
  // BOOK-SPECIFIC STREET BIOME LANDMARKS & FORTIFIED EVENT MONUMENTS
  // Populates the street background & roadside overlooks so each Bible book's
  // street environment matches its setting and iconic events (e.g. Daniel's
  // Fiery Furnace & Lions' Den, Wilderness Camps & Crags, Fortified Walls, etc.)
  // ============================================================================

  // Daniel 3:19–25 — Large-scale Babylonian Vaulted Brick Fiery Furnace with
  // Roaring Flames and Four Figures Walking Unharmed in the Midst of the Fire
  createBabylonFieryFurnaceLandmark(pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const brickMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8f4326',
      accentColor: '#eb8346',
      roughness: 0.78,
      bumpScale: 0.06
    });
    brickMat.emissive = new THREE.Color('#4d1f0c');
    brickMat.emissiveIntensity = 0.65;
    const lapisMat = this.painterly.createPainterlyMaterial({
      baseColor: '#284d8a',
      accentColor: '#f5c463',
      roughness: 0.62
    });
    lapisMat.emissive = new THREE.Color('#162c52');
    lapisMat.emissiveIntensity = 0.6;
    const ironMat = new THREE.MeshStandardMaterial({
      color: '#2e2b29',
      roughness: 0.45,
      metalness: 0.78
    });
    const coalMat = new THREE.MeshStandardMaterial({
      color: '#ff6a00',
      emissive: '#ff3c00',
      emissiveIntensity: 1.8,
      roughness: 0.4
    });

    // Stepped Babylonian brick plinth
    const plinth = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(5.6, 0.48, 4.4, 8, 2, 6), 0.03, 3.0),
      lapisMat
    );
    plinth.position.y = 0.24;
    group.add(plinth);

    // Massive vaulted brick furnace chamber (wide open archway so the 4 figures in the fire are clearly visible)
    for (const sx of [-2.1, 2.1]) {
      const pier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.15, 3.8, 1.65, 4, 8, 4), 0.04, 2.8),
        brickMat
      );
      pier.position.set(sx, 2.1, -0.2);
      group.add(pier);
    }
    const backWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(5.2, 3.8, 0.85, 8, 8, 3), 0.04, 2.8),
      brickMat
    );
    backWall.position.set(0, 2.1, -1.15);
    group.add(backWall);

    const archTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.1, 2.55, 1.4, 18), 0.04, 3.0),
      brickMat
    );
    archTop.position.set(0, 4.35, -0.2);
    group.add(archTop);

    // Chimney crown with lapis & gold crenellations
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(1.45, 1.75, 1.2, 16, 1, true),
      lapisMat
    );
    crown.position.set(0, 5.45, -0.2);
    group.add(crown);

    // Glowing bed of roaring coals inside the furnace mouth
    const coalBed = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.75, 1.9, 0.38, 18), 0.04, 4.0),
      coalMat
    );
    coalBed.position.set(0, 0.62, 0.25);
    group.add(coalBed);

    // Iron furnace bars framing the lower opening
    for (const bx of [-1.45, -0.85, 0.85, 1.45]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.15, 8), ironMat);
      bar.position.set(bx, 1.02, 1.15);
      group.add(bar);
    }

    // Four luminous figures walking unharmed inside the fire (Daniel 3:25 — "the fourth is like a son of the gods")
    const figureMat = new THREE.MeshBasicMaterial({
      color: '#ffe08c',
      transparent: true,
      opacity: 0.95
    });
    const fourthMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 1.0
    });
    const figPositions = [
      [-0.95, 1.62, 0.35, false],
      [-0.35, 1.68, 0.50, false],
      [0.28, 1.85, 0.62, true], // The radiant Fourth Figure in the fire
      [0.92, 1.65, 0.40, false]
    ];
    figPositions.forEach(([fx, fy, fz, isFourth]) => {
      const mat = isFourth ? fourthMat : figureMat;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(isFourth ? 0.18 : 0.15, isFourth ? 0.88 : 0.76, 6, 10), mat);
      body.position.set(fx, fy, fz);
      group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(isFourth ? 0.16 : 0.13, 10, 10), mat);
      head.position.set(fx, fy + (isFourth ? 0.66 : 0.58), fz);
      group.add(head);
    });

    // Roaring volumetric fire sprites inside the furnace & rising out of the chimney
    const glowTex = this.painterly.createGlowSpriteTexture('#ff8c24');
    for (let f = 0; f < 8; f++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: f === 2 ? '#fff6cc' : f % 2 === 0 ? '#ffae38' : '#ff5514',
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending
        })
      );
      sp.position.set(
        (f % 3 - 1) * 0.55,
        1.45 + f * 0.58,
        f < 5 ? 0.45 : -0.15
      );
      sp.scale.set(2.8 - f * 0.12, 3.1, 1);
      group.add(sp);
    }

    // Also mount the 3D GLB model alongside on the flanking plinth so the furnace mouth stays completely open
    if (this.tripo) {
      const glbSlot = new THREE.Group();
      glbSlot.position.set(-3.1, 0.25, 0.65);
      group.add(glbSlot);
      this.tripo.mountSceneGlbIfAvailable(glbSlot, 'greatly-beloved', 14, {
        targetHeight: 2.2,
        yOffset: 0.1
      });
    }

    return group;
  }

  // Daniel 6:16–22 — Sunken Stone Lions' Den with Sculpted Golden Lions,
  // Rolled Stone Rim, and Heavenly Angel Shaft of Light
  createDanielLionsDenLandmark(pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7a62',
      accentColor: '#e3c698',
      roughness: 0.82,
      bumpScale: 0.06
    });
    stoneMat.emissive = new THREE.Color('#3b3226');
    stoneMat.emissiveIntensity = 0.55;
    const lionFurMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d99e4c',
      accentColor: '#ffe094',
      roughness: 0.72
    });
    lionFurMat.emissive = new THREE.Color('#66461b');
    lionFurMat.emissiveIntensity = 0.65;
    const maneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#965d25',
      accentColor: '#e8a858',
      roughness: 0.78
    });
    maneMat.emissive = new THREE.Color('#472a0e');
    maneMat.emissiveIntensity = 0.6;

    // Low stone pit curb in front & rocky cavern arch behind so the Golden Lions are in full view
    const pitWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.8, 3.1, 0.42, 24), 0.04, 3.0),
      stoneMat
    );
    pitWall.position.y = 0.21;
    group.add(pitWall);

    // Cavern back-arch & boulders rising behind the pit
    for (let i = 0; i < 7; i++) {
      const ang = (i / 6) * Math.PI;
      const rx = Math.cos(ang) * 2.55;
      const ry = Math.sin(ang) * 2.4 + 1.1;
      const boulder = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.85, 1), 0.08, 2.5),
        stoneMat
      );
      boulder.position.set(rx, ry, -1.2 - Math.sin(ang) * 0.5);
      boulder.scale.set(1.25, 1.1, 1.1);
      group.add(boulder);
    }

    // The great round sealing stone rolled to the side (Daniel 6:17)
    const sealStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.05, 1.05, 0.34, 24), 0.04, 3.5),
      stoneMat
    );
    sealStone.rotation.x = Math.PI / 2;
    sealStone.rotation.y = -0.35;
    sealStone.position.set(2.35, 1.15, 0.65);
    group.add(sealStone);

    // Sculpted Resting Lions with peaceful closed mouths in the foreground of the den
    const buildLion = (lx, ly, lz, rotY) => {
      const lGroup = new THREE.Group();
      lGroup.position.set(lx, ly, lz);
      lGroup.rotation.y = rotY;
      lGroup.scale.setScalar(1.25);

      const body = new THREE.Mesh(
        this.displaceGeometry(new THREE.CapsuleGeometry(0.32, 0.75, 8, 12), 0.02, 4.0),
        lionFurMat
      );
      body.rotation.x = Math.PI / 2;
      body.position.set(0, 0.34, 0);
      lGroup.add(body);

      const mane = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.42, 14, 12), 0.035, 4.5),
        maneMat
      );
      mane.scale.set(1.0, 1.15, 0.85);
      mane.position.set(0, 0.58, 0.42);
      lGroup.add(mane);

      const head = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.26, 12, 10), 0.02, 5.0),
        lionFurMat
      );
      head.scale.set(0.95, 0.9, 1.15);
      head.position.set(0, 0.58, 0.60);
      lGroup.add(head);

      // Front paws stretched peacefully forward
      for (const px of [-0.16, 0.16]) {
        const paw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.45), lionFurMat);
        paw.position.set(px, 0.10, 0.68);
        lGroup.add(paw);
      }
      return lGroup;
    };

    group.add(buildLion(-1.15, 0.42, 0.55, 0.35));
    group.add(buildLion(1.12, 0.42, 0.50, -0.35));
    group.add(buildLion(0.0, 0.55, -0.25, 0.0));

    // Heavenly Angel Shaft of Golden Light + Halo descending into the Lions' Den
    const angelShaft = this.createKomorebiSunbeamShaft(11, 0.65, 2.5, '#ffeaa3');
    angelShaft.position.set(0, 4.8, 0.2);
    group.add(angelShaft);

    const glowTex = this.painterly.createGlowSpriteTexture('#ffe294');
    const angelHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#ffefb8',
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      })
    );
    angelHalo.position.set(0, 1.45, 0.25);
    angelHalo.scale.set(3.8, 3.2, 1);
    group.add(angelHalo);

    // Mount the 3D GLB sculpture of the Lions' Den on the flanking ledge so the 3 sculpted lions are unobstructed
    if (this.tripo) {
      const glbSlot = new THREE.Group();
      glbSlot.position.set(-2.95, 0.25, 0.65);
      group.add(glbSlot);
      this.tripo.mountSceneGlbIfAvailable(glbSlot, 'greatly-beloved', 26, {
        targetHeight: 2.3,
        yOffset: 0.1
      });
    }

    return group;
  }

  // Babylonian / Royal Fortress Wall & Crenellated Tower Segment (Daniel, Esther, Kings, Chronicles)
  createBabylonFortressWallSegment(pal = {}, isLapis = true) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const wallMat = this.painterly.createPainterlyMaterial({
      baseColor: isLapis ? '#263b5e' : '#857158',
      accentColor: isLapis ? '#e3b459' : '#dec398',
      roughness: 0.78,
      bumpScale: 0.05
    });
    wallMat.emissive = new THREE.Color(isLapis ? '#142238' : '#382f24');
    wallMat.emissiveIntensity = 0.55;
    const goldMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c99636',
      accentColor: '#ffe28a',
      roughness: 0.42
    });
    goldMat.emissive = new THREE.Color('#5c4214');
    goldMat.emissiveIntensity = 0.6;

    const wall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(5.8, 4.2, 1.15, 8, 6, 3), 0.03, 3.0),
      wallMat
    );
    wall.position.y = 2.1;
    group.add(wall);

    // Decorative gold relief frieze band across the wall
    const frieze = new THREE.Mesh(new THREE.BoxGeometry(5.9, 0.36, 1.22), goldMat);
    frieze.position.y = 3.2;
    group.add(frieze);

    // Stepped battlements / merlons along the top
    for (let m = -2; m <= 2; m++) {
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 1.18), wallMat);
      merlon.position.set(m * 1.15, 4.5, 0);
      group.add(merlon);
    }

    // Flanking fortress watchtower with blazing fire-brazier on top
    const tower = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.1, 5.6, 2.1, 4, 8, 4), 0.03, 3.0),
      wallMat
    );
    tower.position.set(3.2, 2.8, 0.15);
    group.add(tower);

    const glowTex = this.painterly.createGlowSpriteTexture('#ffae38');
    const flame = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#ffb84d',
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
      })
    );
    flame.position.set(3.2, 6.2, 0.15);
    flame.scale.set(2.2, 2.6, 1);
    group.add(flame);

    return group;
  }

  // Wilderness Encampment Tent, Sandstone Crag & Bronze Fire-Brazier (Exodus, Leviticus/Numbers, Deuteronomy, Job)
  createWildernessCampAndCrag(pal = {}, idx = 0) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const tentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#544332',
      accentColor: '#b89468',
      roughness: 0.92,
      bumpScale: 0.06
    });
    const rockMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#8c6946',
      accentColor: pal.accent || '#e0b478',
      roughness: 0.9,
      bumpScale: 0.07
    });

    // Sculpted desert sandstone hoodoo / crag
    const crag = new THREE.Mesh(
      this.displaceGeometry(new THREE.ConeGeometry(1.65, 4.2 + (idx % 3) * 1.1, 9, 6), 0.18, 2.2),
      rockMat
    );
    crag.position.set(-1.4, 2.0, -0.8);
    crag.scale.set(1.2, 1.0, 0.9);
    group.add(crag);

    // Nomad goat-hair tent pitched beside the rock crag
    if (idx % 2 === 0) {
      const tentRoof = new THREE.Mesh(
        this.displaceGeometry(new THREE.ConeGeometry(2.1, 1.65, 6), 0.05, 3.0),
        tentMat
      );
      tentRoof.position.set(1.35, 1.15, 0.35);
      tentRoof.scale.set(1.35, 0.85, 1.0);
      group.add(tentRoof);

      const glowTex = this.painterly.createGlowSpriteTexture('#ffae42');
      const campfire = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: '#ffc25c',
          transparent: true,
          opacity: 0.78,
          blending: THREE.AdditiveBlending
        })
      );
      campfire.position.set(1.35, 0.55, 1.65);
      campfire.scale.set(1.4, 1.6, 1);
      group.add(campfire);
    }

    return group;
  }

  // Maritime Sea-Stack, Great Fish Breach & Harbor Anchor Monument (Jonah, Mark, Acts, James)
  createMaritimeCoastalMonument(pal = {}, idx = 0, isJonah = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const basaltMat = this.painterly.createPainterlyMaterial({
      baseColor: '#3d4c54',
      accentColor: '#9eb3b8',
      roughness: 0.84
    });

    if (isJonah && idx % 3 === 1) {
      // Sculpted Great Whale / Leviathan arching out of the sea waves (Jonah 1:17 / 2:10)
      const whaleMat = this.painterly.createPainterlyMaterial({
        baseColor: '#2b4759',
        accentColor: '#8cb8c9',
        roughness: 0.62
      });
      const bodyCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.2, -0.4, 0),
        new THREE.Vector3(-0.8, 1.85, 0.2),
        new THREE.Vector3(0.9, 1.55, -0.1),
        new THREE.Vector3(2.4, -0.3, 0)
      ]);
      const whaleBody = new THREE.Mesh(
        new THREE.TubeGeometry(bodyCurve, 24, 0.68, 14, false),
        whaleMat
      );
      group.add(whaleBody);

      const flukeL = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), whaleMat);
      flukeL.position.set(2.3, 0.45, 0.42);
      flukeL.rotation.x = 0.6;
      group.add(flukeL);
      const flukeR = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 8), whaleMat);
      flukeR.position.set(2.3, 0.45, -0.42);
      flukeR.rotation.x = -0.6;
      group.add(flukeR);
      return group;
    }

    // Coastal sea-stack arch & lighthouse beacon
    const stack = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.95, 1.55, 3.8, 12, 6), 0.14, 2.5),
      basaltMat
    );
    stack.position.y = 1.9;
    group.add(stack);

    const glowTex = this.painterly.createGlowSpriteTexture('#ffe29c');
    const beacon = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#ffe8a8',
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending
      })
    );
    beacon.position.set(0, 4.1, 0);
    beacon.scale.set(2.1, 2.1, 1);
    group.add(beacon);

    return group;
  }

  // ============================================================================
  // DISTRICT XLIV (REVELATION — "ALL THINGS NEW") BESPOKE SANCTUARY PROPS
  // Matching Timothy Holt's paintings #4, #8, #13, #36, #38 & the Finale Plaza:
  //   1. Seven Golden Lampstands & Unrolled Prophecy Scroll (Rev 1:12–20, #4)
  //   2. Laodicea Threshold Door, Wall Niche Lamp & Supper Table (Rev 3:14–20, #8)
  //   3. The Lamb Standing in Concentric Golden Rings + Emerald Rainbow (Rev 5:5–6, #13)
  //   4. New Jerusalem Twelve-Foundation Wall & Gate of Pearl Archway (Rev 21:14–21, #36)
  //   5. Tree of Life with 12 Monthly Fruits, Stone Bench of Rest & Great Lantern (Rev 22:1–5, #38)
  // ============================================================================

  // Revelation 1:12–20 (#4 "among the lampstands"): Semicircle of Seven Tall Ornate
  // Golden Lampstands with living flames and the Unrolled Prophecy Scroll on a linen cloth
  createSevenGoldenLampstandsCircle(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#85775f',
      accentColor: pal.accent || '#eecb8c',
      roughness: 0.86,
      bumpScale: 0.05
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#e8dec8',
      accentColor: '#faf3e3',
      roughness: 0.9
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4128',
      accentColor: '#9e744b',
      roughness: 0.8
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#e5bc63',
      emissive: '#594214',
      emissiveIntensity: 0.58,
      roughness: 0.32,
      metalness: 0.78
    });

    const dais = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(3.4, 3.7, 0.18, 36), 0.025, 3.0),
      stoneMat
    );
    dais.position.y = 0.09;
    dais.userData.keepWithGlb = true;
    group.add(dais);

    const glowTex = this.painterly.createGlowSpriteTexture('#ffe294');
    const flames = [];
    const halos = [];

    // Seven ornate pedestal lampstands arranged in a welcoming semicircle (matching painting #4)
    for (let i = 0; i < 7; i++) {
      const t = (i - 3) / 3; // -1 .. +1
      const ang = t * 1.18;
      const rad = 2.45;
      const lx = Math.sin(ang) * rad;
      const lz = -Math.cos(ang) * rad * 0.72;
      const heightBoost = (1.0 - Math.abs(t) * 0.16);

      const standGroup = new THREE.Group();
      standGroup.position.set(lx, 0.18, lz);
      standGroup.userData.keepWithGlb = true;

      // Stepped ornate round base
      const baseFoot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.16, 18), goldMat);
      baseFoot.position.y = 0.08;
      standGroup.add(baseFoot);

      const baseTier = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.14, 16), goldMat);
      baseTier.position.y = 0.22;
      standGroup.add(baseTier);

      // Baluster stem with three carved knops
      const stemH = 1.48 * heightBoost;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, stemH, 14), goldMat);
      stem.position.y = 0.28 + stemH * 0.5;
      standGroup.add(stem);

      for (const kf of [0.28, 0.55, 0.82]) {
        const knop = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), goldMat);
        knop.scale.set(1.15, 0.68, 1.15);
        knop.position.y = 0.28 + stemH * kf;
        standGroup.add(knop);
      }

      // Flared oil basin bowl at top with four rimwick prongs
      const bowlY = 0.28 + stemH + 0.08;
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.11, 0.20, 18), goldMat);
      bowl.position.y = bowlY;
      standGroup.add(bowl);

      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.022, 8, 22), goldMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = bowlY + 0.09;
      standGroup.add(rim);

      // Living golden flame & warm halo
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.085, 0.30, 12),
        new THREE.MeshBasicMaterial({ color: '#fff3ba' })
      );
      flame.position.y = bowlY + 0.24;
      standGroup.add(flame);
      flames.push(flame);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: '#ffd882',
          transparent: true,
          opacity: 0.84,
          blending: THREE.AdditiveBlending
        })
      );
      halo.position.y = bowlY + 0.28;
      halo.scale.set(1.55, 1.55, 1);
      standGroup.add(halo);
      halos.push(halo);

      group.add(standGroup);
    }

    // Foreground linen cloth & unrolled Prophecy Scroll ("Blessed is he who reads", matching painting #4)
    const scrollGroup = new THREE.Group();
    scrollGroup.position.set(-0.68, 0.20, 1.15);
    scrollGroup.rotation.y = 0.48;
    scrollGroup.userData.keepWithGlb = true;

    const cloth = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.35, 0.04, 0.92, 8, 2, 6), 0.015, 4.0),
      linenMat
    );
    scrollGroup.add(cloth);

    const scrollRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 1.05, 16), linenMat);
    scrollRoll.rotation.z = Math.PI / 2;
    scrollRoll.position.set(0, 0.11, 0);
    scrollGroup.add(scrollRoll);

    for (const sx of [-0.56, 0.56]) {
      const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.18, 12), woodMat);
      finial.rotation.z = Math.PI / 2;
      finial.position.set(sx, 0.11, 0);
      scrollGroup.add(finial);
    }
    group.add(scrollGroup);

    const lampLight = new THREE.PointLight('#ffdf94', 2.9, 18);
    lampLight.position.set(0, 2.2, 0.2);
    group.add(lampLight);

    return { group, flames, halos, lampLight };
  }

  // Revelation 3:14–20 (#8 "knocking"): Weathered Wooden Threshold Door with Golden Light
  // Streaming Under the Crack, Arched Wall Niche Oil Lamp, and Supper Table Set with Bread, Olives & Lantern
  createLaodiceaDoorAndSupperTable(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const plasterMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.horizon || '#b8a282',
      accentColor: pal.accent || '#f5d79c',
      roughness: 0.88,
      bumpScale: 0.05
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c432b',
      accentColor: '#96704c',
      roughness: 0.84,
      bumpScale: 0.05
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: '#3a352f',
      roughness: 0.5,
      metalness: 0.72
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#966846',
      accentColor: '#cfa078',
      roughness: 0.82
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#dfd3bc',
      accentColor: '#f7efe0',
      roughness: 0.9
    });

    // Plastered stone wall framing the wooden door (matching painting #8)
    const leftWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.65, 3.5, 0.42, 6, 8, 3), 0.025, 3.0),
      plasterMat
    );
    leftWall.position.set(-1.65, 1.75, -0.4);
    leftWall.userData.keepWithGlb = true;
    group.add(leftWall);

    const rightWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.65, 3.5, 0.42, 6, 8, 3), 0.025, 3.0),
      plasterMat
    );
    rightWall.position.set(1.65, 1.75, -0.4);
    rightWall.userData.keepWithGlb = true;
    group.add(rightWall);

    const lintelWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(4.95, 0.68, 0.44, 10, 3, 3), 0.025, 3.0),
      plasterMat
    );
    lintelWall.position.set(0, 3.65, -0.4);
    lintelWall.userData.keepWithGlb = true;
    group.add(lintelWall);

    // Timber door with iron straps & latch bar slightly ajar, warm golden light glowing along the bottom & edge
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.82, 0.08, -0.36);
    doorPivot.userData.keepWithGlb = true;

    const doorPlanks = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.62, 3.18, 0.14, 6, 10, 2), 0.015, 4.0),
      woodMat
    );
    doorPlanks.position.set(0.81, 1.59, 0);
    doorPivot.add(doorPlanks);

    for (const by of [0.58, 2.65]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.10, 0.17), ironMat);
      strap.position.set(0.81, by, 0);
      doorPivot.add(strap);
    }
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.20), ironMat);
    latch.position.set(1.38, 1.52, 0.02);
    doorPivot.add(latch);
    doorPivot.rotation.y = 0.14;
    group.add(doorPivot);

    // Golden light crack along the threshold and right door seam (matching painting #8)
    const crackMat = new THREE.MeshBasicMaterial({
      color: '#ffd97d',
      transparent: true,
      opacity: 0.95
    });
    const bottomCrack = new THREE.Mesh(new THREE.PlaneGeometry(1.68, 0.18), crackMat);
    bottomCrack.rotation.x = -Math.PI / 2;
    bottomCrack.position.set(0, 0.03, -0.25);
    bottomCrack.userData.keepWithGlb = true;
    group.add(bottomCrack);

    const sideCrack = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 3.15), crackMat);
    sideCrack.position.set(0.80, 1.62, -0.35);
    sideCrack.userData.keepWithGlb = true;
    group.add(sideCrack);

    // Wall niche clay oil lamp on the left wall + terracotta amphora below (matching painting #8)
    const nicheLampFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.22, 10),
      new THREE.MeshBasicMaterial({ color: '#ffea9f' })
    );
    nicheLampFlame.position.set(-1.62, 1.78, -0.14);
    nicheLampFlame.userData.keepWithGlb = true;
    group.add(nicheLampFlame);

    const nicheBowl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), clayMat);
    nicheBowl.scale.set(1.3, 0.55, 0.95);
    nicheBowl.position.set(-1.62, 1.62, -0.14);
    nicheBowl.userData.keepWithGlb = true;
    group.add(nicheBowl);

    const leftJar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.86, 16), clayMat);
    leftJar.position.set(-1.65, 0.45, 0.22);
    leftJar.userData.keepWithGlb = true;
    group.add(leftJar);

    // Foreground right: Wooden Supper Table with fringed linen runner, bread, olives, glass lantern & olive branch in pitcher
    const tableGroup = new THREE.Group();
    tableGroup.position.set(1.22, 0, 0.92);
    tableGroup.userData.keepWithGlb = true;

    const tableTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.55, 0.10, 1.12, 6, 2, 6), 0.015, 4.0),
      woodMat
    );
    tableTop.position.y = 0.84;
    tableGroup.add(tableTop);

    for (const [lx, lz] of [[-0.65, -0.44], [0.65, -0.44], [-0.65, 0.44], [0.65, 0.44]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.84, 0.11), woodMat);
      leg.position.set(lx, 0.42, lz);
      tableGroup.add(leg);
    }

    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.03, 1.16), linenMat);
    runner.position.set(-0.22, 0.90, 0);
    tableGroup.add(runner);

    // Hexagonal glass-and-iron table lantern with glowing candle inside
    const lanternFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.54, 6), ironMat);
    lanternFrame.position.set(0.05, 1.18, -0.08);
    tableGroup.add(lanternFrame);

    const lanternGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.46, 6),
      new THREE.MeshBasicMaterial({ color: '#ffd97d', transparent: true, opacity: 0.88 })
    );
    lanternGlass.position.set(0.05, 1.18, -0.08);
    tableGroup.add(lanternGlass);

    // Plate of flat loaves & bowl of olives
    const breadLoaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), linenMat);
    breadLoaf.scale.set(1.3, 0.35, 1.0);
    breadLoaf.position.set(0.34, 0.95, 0.22);
    tableGroup.add(breadLoaf);

    const oliveBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.10, 0.09, 14), clayMat);
    oliveBowl.position.set(-0.34, 0.95, 0.18);
    tableGroup.add(oliveBowl);

    const rightPitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.48, 14), clayMat);
    rightPitcher.position.set(0.45, 1.14, -0.25);
    tableGroup.add(rightPitcher);

    group.add(tableGroup);

    const doorLight = new THREE.PointLight('#ffd275', 2.8, 18);
    doorLight.position.set(0.2, 1.6, 0.5);
    group.add(doorLight);

    return { group, doorPivot, doorLight, lanternGlass, bottomCrack };
  }

  // Revelation 5:5–8 (#13 "the Lion is a Lamb"): The Lamb Standing at the Center of
  // Concentric Golden Rings on the Sea of Glass, flanked by Shepherd's Staff on White Linen,
  // Golden Bowls of Incense (Prayers of the Saints), Olive Branch & Twenty-Four Crowns
  createLambOnThroneRings(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#ede4cf',
      accentColor: '#fff9eb',
      roughness: 0.88
    });
    const woolMat = this.painterly.createPainterlyMaterial({
      baseColor: '#f5efe0',
      accentColor: '#ffffff',
      roughness: 0.92,
      bumpScale: 0.06
    });
    woolMat.emissive = new THREE.Color('#6e6248');
    woolMat.emissiveIntensity = 0.45;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e5034',
      accentColor: '#b38960',
      roughness: 0.82
    });
    const oliveLeafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c6e49',
      accentColor: '#a8ba88',
      roughness: 0.8
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#f2ca68',
      emissive: '#6e4c14',
      emissiveIntensity: 0.65,
      roughness: 0.28,
      metalness: 0.8
    });

    // Concentric golden light rings on the ground (matching painting #13)
    const rings = [];
    for (const r of [0.95, 1.55, 2.25, 2.95]) {
      const rMesh = new THREE.Mesh(
        new THREE.RingGeometry(r, r + 0.055, 48),
        new THREE.MeshBasicMaterial({
          color: '#ffdf88',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.78,
          blending: THREE.AdditiveBlending
        })
      );
      rMesh.rotation.x = -Math.PI / 2;
      rMesh.position.y = 0.04;
      rMesh.userData.keepWithGlb = true;
      group.add(rMesh);
      rings.push(rMesh);
    }

    // Sculpted Gentle Lamb standing in the center of the golden rings (fallback & companion to GLB)
    const lambGroup = new THREE.Group();
    lambGroup.position.set(0, 0.06, 0);

    const torso = new THREE.Mesh(
      this.displaceGeometry(new THREE.CapsuleGeometry(0.28, 0.58, 8, 14), 0.025, 6.0),
      woolMat
    );
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 0.68, 0);
    lambGroup.add(torso);

    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.28, 6, 10), woolMat);
    neck.position.set(0, 0.92, 0.28);
    neck.rotation.x = -0.35;
    lambGroup.add(neck);

    const head = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.21, 14, 12), 0.015, 5.0),
      woolMat
    );
    head.scale.set(0.92, 0.95, 1.22);
    head.position.set(0, 1.12, 0.42);
    lambGroup.add(head);

    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), woolMat);
      ear.scale.set(1.6, 0.45, 0.65);
      ear.position.set(sx * 0.22, 1.16, 0.36);
      ear.rotation.z = sx * -0.25;
      lambGroup.add(ear);
    }

    for (const [lx, lz] of [[-0.15, 0.22], [0.15, 0.22], [-0.15, -0.24], [0.15, -0.24]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.62, 8), woolMat);
      leg.position.set(lx, 0.31, lz);
      lambGroup.add(leg);
    }
    group.add(lambGroup);

    // Foreground Left: Draped white linen garment & wooden shepherd's staff (matching painting #13)
    const leftRelic = new THREE.Group();
    leftRelic.position.set(-1.55, 0.08, 1.10);
    leftRelic.userData.keepWithGlb = true;

    const linenFold = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.52, 14, 10), 0.06, 3.5),
      linenMat
    );
    linenFold.scale.set(1.35, 0.36, 1.1);
    leftRelic.add(linenFold);

    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 1.65, 10), woodMat);
    staff.rotation.z = Math.PI / 2 - 0.18;
    staff.rotation.y = 0.55;
    staff.position.set(0.12, 0.18, 0.05);
    leftRelic.add(staff);
    group.add(leftRelic);

    // Foreground Right: Golden Bowls of Incense (Rev 5:8), White Linen & Green Olive Branch (matching painting #13)
    const rightRelic = new THREE.Group();
    rightRelic.position.set(1.52, 0.08, 1.05);
    rightRelic.userData.keepWithGlb = true;

    const incenseBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.16, 0.22, 18), goldMat);
    incenseBowl.position.set(0, 0.14, 0);
    rightRelic.add(incenseBowl);

    const branchStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.85, 8), woodMat);
    branchStem.rotation.z = Math.PI / 2;
    branchStem.rotation.y = -0.45;
    branchStem.position.set(-0.22, 0.06, 0.38);
    rightRelic.add(branchStem);

    for (let l = 0; l < 7; l++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), oliveLeafMat);
      leaf.scale.set(1.8, 0.25, 0.7);
      leaf.position.set(-0.45 + l * 0.11, 0.08, 0.35 + (l % 2 === 0 ? 0.08 : -0.08));
      rightRelic.add(leaf);
    }
    group.add(rightRelic);

    // Golden crowns cast down around the outer ring (Revelation 4:10 — "crowns on the floor")
    const crowns = [];
    for (let c = 0; c < 6; c++) {
      const ang = (c / 6) * Math.PI * 1.4 - 0.7 + Math.PI;
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.038, 8, 18), goldMat);
      crown.rotation.x = Math.PI / 2 + 0.15;
      crown.position.set(Math.sin(ang) * 2.55, 0.09, Math.cos(ang) * 2.25);
      crown.userData.keepWithGlb = true;
      group.add(crown);
      crowns.push(crown);
    }

    const throneLight = new THREE.PointLight('#fff0ba', 3.2, 22);
    throneLight.position.set(0, 2.6, 0.4);
    group.add(throneLight);

    return { group, rings, crowns, throneLight };
  }

  // Revelation 21:14–21 (#36 "gates of pearl"): Luminous Archway of Single Pearl
  // set upon Twelve Jewel-Toned Foundation Stones along the New Jerusalem Street
  createGatesOfPearlArchway(pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c9bfab',
      accentColor: '#f7e6bd',
      roughness: 0.76
    });
    const pearlMat = new THREE.MeshStandardMaterial({
      color: '#fcf8ee',
      emissive: '#80755c',
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.25
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#f2ca68',
      emissive: '#593b08',
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.8
    });

    // Stepped jasper & gold foundation wall
    for (const sx of [-1.45, 1.45]) {
      const pier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.95, 3.2, 0.95, 4, 8, 4), 0.025, 3.0),
        stoneMat
      );
      pier.position.set(sx, 1.6, 0);
      group.add(pier);
    }

    // Iridescent Pearl Arch & Crown Sphere
    const pearlRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.28, 16, 36, Math.PI), pearlMat);
    pearlRing.position.set(0, 3.1, 0);
    group.add(pearlRing);

    const pearlOrb = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), pearlMat);
    pearlOrb.position.set(0, 4.78, 0);
    group.add(pearlOrb);

    const goldBand = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 10, 24), goldMat);
    goldBand.rotation.x = Math.PI / 2;
    goldBand.position.set(0, 4.55, 0);
    group.add(goldBand);

    return group;
  }

  // Revelation 22:1–5 (#38 "leaves for healing" & Finale Plaza):
  // The Tree of Life with Twelve Manner of Golden-Green Fruits, the Stone Bench of Rest
  // beneath its boughs (answering Genesis No. 4's Sabbath Bench), Terracotta Water Jars,
  // Unrolled Scroll, Bronze Bowl of Healing Leaves, and the Great Lantern of the Lamb
  createTreeOfLifeAndBenchSanctuary(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    // 1. The Great Tree of Life rising on the terraced stone embankment (matching painting #38)
    const tree = this.createGreatPainterlyTree(
      propTex,
      {
        ground: '#594a38',
        horizon: '#687d4e',
        accent: '#e8dfa8'
      },
      isFinalePlaza ? 1.52 : 1.38
    );
    tree.position.set(isFinalePlaza ? 0 : 2.35, 0.15, isFinalePlaza ? -2.2 : -1.4);
    tree.userData.keepWithGlb = true;
    group.add(tree);

    // Twelve luminous golden-green fruits hanging from the boughs ("fruit every month", Rev 22:2)
    const fruitMat = new THREE.MeshStandardMaterial({
      color: '#d9e38a',
      emissive: '#6a7526',
      emissiveIntensity: 0.72,
      roughness: 0.35,
      metalness: 0.15
    });
    const fruits = [];
    for (let f = 0; f < 12; f++) {
      const ang = (f / 12) * Math.PI * 2;
      const rad = 1.55 + (f % 3) * 0.55;
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), fruitMat);
      fruit.position.set(
        tree.position.x + Math.cos(ang) * rad,
        2.75 + (f % 4) * 0.45,
        tree.position.z + Math.sin(ang) * rad
      );
      fruit.userData.keepWithGlb = true;
      group.add(fruit);
      fruits.push(fruit);
    }

    // 2. THE SIGNATURE BOOKEND ELEMENT: The Stone Bench beneath the Tree of Life
    // Answers Genesis No. 4's Sabbath Bench — with woven linen cloth, unrolled scroll, water jars & bowl of healing leaves
    const bench = this.createStoneBench(propTex, {
      ground: '#827968',
      accent: '#f0dfba'
    });
    bench.position.set(isFinalePlaza ? 0 : 0.65, 0.12, isFinalePlaza ? 0.65 : 0.45);
    bench.rotation.y = isFinalePlaza ? 0 : -0.28;
    bench.userData.keepWithGlb = true;
    group.add(bench);

    // Bronze bowl filled with green healing leaves ("The leaves of the tree were for the healing of the nations", painting #38)
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: '#a87d46',
      roughness: 0.42,
      metalness: 0.68
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#567042',
      accentColor: '#9eb87d',
      roughness: 0.78
    });
    const bowlGroup = new THREE.Group();
    bowlGroup.position.set(bench.position.x - 0.85, 0.22, bench.position.z + 0.68);
    bowlGroup.userData.keepWithGlb = true;

    const leafBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.18, 0.12, 18), bronzeMat);
    bowlGroup.add(leafBowl);
    for (let l = 0; l < 9; l++) {
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), leafMat);
      lf.scale.set(1.7, 0.25, 0.85);
      const a = (l / 9) * Math.PI * 2;
      lf.position.set(Math.cos(a) * 0.14, 0.06 + (l % 2) * 0.02, Math.sin(a) * 0.14);
      lf.rotation.y = a;
      bowlGroup.add(lf);
    }
    group.add(bowlGroup);

    // Classical stone fountain basin on the opposite bank of the River of Life (matching painting #38 left side)
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#968d7a',
      accentColor: '#e6dcc5',
      roughness: 0.84
    });
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(isFinalePlaza ? -3.6 : -2.85, 0.12, -0.85);
    fountainGroup.userData.keepWithGlb = true;

    const fPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 1.25, 16), stoneMat);
    fPedestal.position.y = 0.62;
    fountainGroup.add(fPedestal);

    const fBasin = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.38, 0.28, 22), stoneMat);
    fBasin.position.y = 1.32;
    fountainGroup.add(fBasin);
    group.add(fountainGroup);

    // 3. The Great Lantern of the Lamb ("its lamp is the Lamb", Rev 21:23)
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#f7d474',
      emissive: '#785314',
      emissiveIntensity: 0.75,
      roughness: 0.25,
      metalness: 0.82
    });
    const greatLantern = new THREE.Group();
    greatLantern.position.set(isFinalePlaza ? 2.85 : -1.45, 0.15, isFinalePlaza ? 0.35 : 0.85);
    greatLantern.userData.keepWithGlb = true;

    const lPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.95, 14), stoneMat);
    lPillar.position.y = 0.98;
    greatLantern.add(lPillar);

    const lCage = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.28, 0.68, 8), goldMat);
    lCage.position.y = 2.25;
    greatLantern.add(lCage);

    const lCore = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 16, 16),
      new THREE.MeshBasicMaterial({ color: '#fff8d6' })
    );
    lCore.position.y = 2.25;
    greatLantern.add(lCore);

    const glowTex = this.painterly.createGlowSpriteTexture('#ffe6a3');
    const lHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#ffe8a8',
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending
      })
    );
    lHalo.position.y = 2.28;
    lHalo.scale.set(3.6, 3.6, 1);
    greatLantern.add(lHalo);
    group.add(greatLantern);

    const sanctuaryLight = new THREE.PointLight('#ffe8a3', 3.4, 26);
    sanctuaryLight.position.set(0, 3.4, 0.5);
    group.add(sanctuaryLight);

    return { group, bench, fruits, greatLantern, lHalo, sanctuaryLight };
  }

  // ============================================================================
  // DISTRICT XIII: PLANTED BY THE WATER (PSALMS 1–41) BESPOKE 3D PROP ENSEMBLES
  // Crafted directly from Timothy Holt's paintings (#1, #8, #9, #12, #22, #26, #40)
  // ============================================================================

  // Psalm 1:1–3 (#1 "planted" — Signature Symbolic Element of District XIII):
  // Great fruit-bearing fig tree planted on a dry-stone riverbank wall with roots reaching
  // into the clear pebble stream, green-gold figs in the canopy, a woven harvest basket with
  // white linen cloth on the stone wall beside the trunk, a riverside stone seat, and a
  // stone well with a wooden tripod frame across the stream (matching assets/psalms-1/web/b-013-001.jpg)
  createPlantedByWaterTreeEnsemble(propTex = null, pal = {}, includeWell = true) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#7d7560',
      accentColor: pal.accent || '#e0d3b4',
      roughness: 0.90
    });
    const barkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#544535',
      accentColor: '#8c775c',
      roughness: 0.92
    });
    const figMat = new THREE.MeshStandardMaterial({
      color: '#9db058',
      emissive: '#3b4518',
      emissiveIntensity: 0.35,
      roughness: 0.48
    });
    const basketMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a5c38',
      accentColor: '#ba9662',
      roughness: 0.86
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#ede6d6',
      accentColor: '#ffffff',
      roughness: 0.82
    });

    // 1. Dry-stone retaining wall & bank on the right side of the stream (matching painting #1)
    const bankGroup = new THREE.Group();
    bankGroup.userData.keepWithGlb = true;
    for (let s = 0; s < 14; s++) {
      const rock = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.32 + (s % 3) * 0.12, 1), 0.04, 3.2),
        stoneMat
      );
      rock.scale.set(1.35, 0.72, 1.15);
      rock.position.set(1.25 + (s % 4) * 0.52, 0.18 + Math.floor(s / 5) * 0.24, -1.2 + (s % 5) * 0.55);
      bankGroup.add(rock);
    }
    group.add(bankGroup);

    // 2. The Great Tree Planted by the Streams of Water
    const tree = this.createGreatPainterlyTree(
      propTex,
      {
        ground: '#4f4132',
        horizon: '#556e3d',
        accent: '#c7d485'
      },
      1.36
    );
    tree.position.set(1.55, 0.22, -0.45);
    tree.userData.keepWithGlb = true;
    group.add(tree);

    // Exposed gnarled roots reaching down from the trunk into the stream water (matching painting #1)
    const rootsGroup = new THREE.Group();
    rootsGroup.userData.keepWithGlb = true;
    for (let r = 0; r < 8; r++) {
      const rootGeo = this.displaceGeometry(new THREE.CylinderGeometry(0.06, 0.14, 1.85 + (r % 3) * 0.35, 8, 8), 0.03, 3.8);
      const root = new THREE.Mesh(rootGeo, barkMat);
      const spread = -0.55 + (r / 7) * 1.1;
      root.position.set(0.75 - (r % 2) * 0.22, 0.22, -0.45 + spread * 1.25);
      root.rotation.z = 1.08 + (r % 3) * 0.08;
      root.rotation.y = spread * 0.55;
      rootsGroup.add(root);
    }
    group.add(rootsGroup);

    // Seasonal green-gold figs hanging among the boughs ("produces its fruit in its season")
    const figs = [];
    for (let f = 0; f < 16; f++) {
      const ang = (f / 16) * Math.PI * 2;
      const rad = 1.25 + (f % 3) * 0.52;
      const fig = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), figMat);
      fig.scale.set(0.9, 1.25, 0.9);
      fig.position.set(
        tree.position.x + Math.cos(ang) * rad,
        2.45 + (f % 4) * 0.38,
        tree.position.z + Math.sin(ang) * rad
      );
      fig.userData.keepWithGlb = true;
      group.add(fig);
      figs.push(fig);
    }

    // 3. Woven Harvest Basket with White Linen Cloth resting on the stone ledge beside the trunk (exact match to painting #1 right side)
    const basketGroup = new THREE.Group();
    basketGroup.position.set(2.55, 0.56, 0.25);
    basketGroup.userData.keepWithGlb = true;

    const basketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.26, 0.44, 16), basketMat);
    basketBody.position.y = 0.22;
    basketGroup.add(basketBody);

    const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 20), basketMat);
    basketRim.rotation.x = Math.PI / 2;
    basketRim.position.y = 0.44;
    basketGroup.add(basketRim);

    const cloth = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.31, 12, 10), 0.03, 4.0),
      linenMat
    );
    cloth.scale.set(1.1, 0.55, 1.0);
    cloth.position.set(0.02, 0.44, 0.02);
    basketGroup.add(cloth);
    group.add(basketGroup);

    // 4. Riverside Stone Bench / Step where the pilgrim can rest near the water
    const bench = this.createStoneBench(propTex, {
      ground: '#7d7560',
      accent: '#e8dec3'
    });
    bench.scale.setScalar(0.84);
    bench.position.set(0.45, 0.08, 1.15);
    bench.rotation.y = -0.35;
    bench.userData.keepWithGlb = true;
    group.add(bench);

    // 5. Judean Stone Well with Wooden Tripod Frame across the stream (matching painting #1 left middleground)
    if (includeWell) {
      const wellGroup = new THREE.Group();
      wellGroup.position.set(-2.95, 0.08, -2.25);
      wellGroup.userData.keepWithGlb = true;

      const wellPlatform = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(2.4, 0.28, 2.2, 6, 2, 6), 0.02, 3.0),
        stoneMat
      );
      wellPlatform.position.y = 0.14;
      wellGroup.add(wellPlatform);

      const wellCurb = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.64, 0.48, 16), stoneMat);
      wellCurb.position.y = 0.48;
      wellGroup.add(wellCurb);

      for (let p = 0; p < 3; p++) {
        const pAng = (p / 3) * Math.PI * 2 + 0.3;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 2.15, 8), barkMat);
        pole.position.set(Math.cos(pAng) * 0.38, 1.32, Math.sin(pAng) * 0.38);
        pole.rotation.z = Math.cos(pAng) * 0.26;
        pole.rotation.x = -Math.sin(pAng) * 0.26;
        wellGroup.add(pole);
      }
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.25, 6), linenMat);
      rope.position.set(0, 1.55, 0);
      wellGroup.add(rope);

      group.add(wellGroup);
    }

    const streamLight = new THREE.PointLight('#fff0be', 2.8, 20);
    streamLight.position.set(0.8, 2.6, 0.2);
    group.add(streamLight);

    return { group, tree, figs, basketGroup, bench, streamLight };
  }

  // Psalm 8:3–4 (#8 "the work of your fingers"):
  // Nocturnal Bethlehem hillside beneath an ancient olive tree (left), shepherd's boulder seat
  // with woven cloak & curved wooden shepherd's crook, peaceful flock of 7 woolly sheep resting
  // in the grass, and a luminous full moon & star cluster overhead (matching assets/psalms-1/web/b-013-008.jpg)
  createPsalm8ShepherdHillsideEnsemble(propTex = null, pal = {}, includeSkyMoon = true) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#666156',
      accentColor: '#b5aa96',
      roughness: 0.90
    });
    const woolMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9d1c1',
      accentColor: '#f5efe2',
      roughness: 0.92
    });
    const darkWoolMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c5449',
      accentColor: '#8f8474',
      roughness: 0.90
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#59432e',
      accentColor: '#9c7b56',
      roughness: 0.84
    });
    const cloakMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b5b47',
      accentColor: '#bca688',
      roughness: 0.88
    });

    // 1. Shepherd's rocky seat, draped cloak & curved shepherd's crook on the left (matching painting #8)
    const seatGroup = new THREE.Group();
    seatGroup.position.set(-1.35, 0.08, 0.35);
    seatGroup.userData.keepWithGlb = true;

    const seatRock = new THREE.Mesh(
      this.displaceGeometry(new THREE.DodecahedronGeometry(0.68, 1), 0.06, 3.0),
      stoneMat
    );
    seatRock.scale.set(1.35, 0.72, 1.15);
    seatRock.position.y = 0.36;
    seatGroup.add(seatRock);

    const cloak = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.88, 0.14, 0.76, 6, 2, 6), 0.03, 3.5),
      cloakMat
    );
    cloak.position.set(0.05, 0.72, 0.02);
    cloak.rotation.z = -0.12;
    seatGroup.add(cloak);

    // Curved shepherd's crook leaning beside the boulder (exact match to painting #8)
    const crookGroup = new THREE.Group();
    crookGroup.position.set(-0.42, 0.1, -0.18);
    crookGroup.rotation.z = 0.24;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 2.05, 10), woodMat);
    shaft.position.y = 1.02;
    crookGroup.add(shaft);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 8, 18, Math.PI * 1.25), woodMat);
    hook.position.set(-0.14, 2.04, 0);
    crookGroup.add(hook);
    seatGroup.add(crookGroup);

    // Low dry-stone sheepfold wall behind the olive tree (matching painting #8 left side)
    for (let w = 0; w < 8; w++) {
      const wStone = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.28 + (w % 2) * 0.08, 1), 0.04, 3.0),
        stoneMat
      );
      wStone.scale.set(1.3, 0.75, 1.0);
      wStone.position.set(-1.35 + w * 0.36, 0.24 + (w % 2) * 0.14, -1.15);
      seatGroup.add(wStone);
    }
    group.add(seatGroup);

    // 2. Peaceful Flock of 7 Woolly Sheep resting & grazing on the hillside (matching painting #8 foreground & midground)
    const sheepPositions = [
      [-1.85, 1.25, 0.35, 1.05],
      [-2.45, 0.45, 0.85, 0.92],
      [0.15, 0.65, -0.35, 0.96],
      [1.85, 0.95, -0.65, 1.08],
      [1.35, -0.45, -2.65, 0.94],
      [-0.45, -1.35, 0.25, 0.86],
      [0.65, -1.85, -0.45, 0.82]
    ];
    const sheepFlock = [];
    sheepPositions.forEach(([sx, sz, sRot, sScale], idx) => {
      const sheep = new THREE.Group();
      sheep.position.set(sx, 0.08, sz);
      sheep.rotation.y = sRot;
      sheep.scale.setScalar(sScale);
      sheep.userData.keepWithGlb = true;

      const fleece = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.42, 14, 12), 0.045, 4.2),
         woolMat
      );
      fleece.scale.set(1.35, 0.88, 0.95);
      fleece.position.y = 0.34;
      sheep.add(fleece);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), idx % 3 === 0 ? darkWoolMat : woolMat);
      head.scale.set(1.15, 0.92, 0.85);
      head.position.set(0.46, 0.48, 0);
      sheep.add(head);

      for (const earZ of [-0.14, 0.14]) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), woolMat);
        ear.scale.set(0.7, 0.35, 1.35);
        ear.position.set(0.42, 0.48, earZ);
        sheep.add(ear);
      }

      group.add(sheep);
      sheepFlock.push(sheep);
    });

    // 3. Luminous Full Moon & "The Work of Your Fingers" Star Halo overhead (matching painting #8 sky)
    let moonOrb = null;
    let moonHalo = null;
    const starSprites = [];
    if (includeSkyMoon) {
      const moonGroup = new THREE.Group();
      moonGroup.position.set(-1.6, 5.4, -4.2);
      moonGroup.userData.keepWithGlb = true;

      moonOrb = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 24, 24),
        new THREE.MeshBasicMaterial({ color: '#fff8e3' })
      );
      moonGroup.add(moonOrb);

      const glowTex = this.painterly.createGlowSpriteTexture('#fff0c4');
      moonHalo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: '#ffefc2',
          transparent: true,
          opacity: 0.88,
          blending: THREE.AdditiveBlending
        })
      );
      moonHalo.scale.set(4.4, 4.4, 1);
      moonGroup.add(moonHalo);

      // Sparkling prominent star beside the moon (matching the bright 8-point star in painting #8)
      const starCoords = [
        [2.2, 0.3, 0.2, 1.35],
        [3.6, 0.8, -0.4, 0.75],
        [1.1, 1.1, 0.3, 0.68],
        [4.8, 0.2, -0.6, 0.82],
        [-1.8, 0.9, 0.2, 0.72]
      ];
      starCoords.forEach(([stx, sty, stz, stScale]) => {
        const st = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glowTex,
            color: '#ffffff',
            transparent: true,
            opacity: 0.92,
            blending: THREE.AdditiveBlending
          })
        );
        st.position.set(stx, sty, stz);
        st.scale.set(stScale, stScale, 1);
        moonGroup.add(st);
        starSprites.push(st);
      });

      group.add(moonGroup);
    }

    const moonLight = new THREE.PointLight('#dce6ff', 2.8, 24);
    moonLight.position.set(-1.2, 4.8, -2.0);
    group.add(moonLight);

    return { group, sheepFlock, moonOrb, moonHalo, starSprites, moonLight };
  }

  // Psalm 9:9–10 (#9 "a high tower"):
  // Cylindrical stone watchtower of refuge ("Yahweh will also be a high tower for the oppressed")
  // with crenelated battlements and an open wooden door at its base atop a stepped stone terrace
  // (matching assets/psalms-1/web/b-013-009.jpg)
  createPsalm9HighTower(pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#9c8e73',
      accentColor: pal.accent || '#ebdab5',
      roughness: 0.88
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4329',
      accentColor: '#99754d',
      roughness: 0.84
    });

    // Stepped circular dry-stone terrace base
    const terrace1 = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.1, 2.35, 0.42, 20), 0.03, 3.0),
      stoneMat
    );
    terrace1.position.y = 0.21;
    group.add(terrace1);

    const terrace2 = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.65, 1.85, 0.36, 20), 0.025, 3.0),
      stoneMat
    );
    terrace2.position.y = 0.56;
    group.add(terrace2);

    // Cylindrical ashlar stone tower shaft
    const towerShaft = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.18, 1.32, 3.65, 22, 10), 0.025, 3.5),
      stoneMat
    );
    towerShaft.position.y = 2.52;
    group.add(towerShaft);

    // Crenelated stone battlements at the crown (matching painting #9)
    for (let b = 0; b < 10; b++) {
      const ang = (b / 10) * Math.PI * 2;
      const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.34, 0.26), stoneMat);
      merlon.position.set(Math.cos(ang) * 1.12, 4.48, Math.sin(ang) * 1.12);
      merlon.rotation.y = -ang + Math.PI / 2;
      group.add(merlon);
    }

    // Open refuge doorway at the base with warm interior glow ("a high tower for the oppressed")
    const doorwayVoid = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 1.15, 0.18),
      new THREE.MeshBasicMaterial({ color: '#261c12' })
    );
    doorwayVoid.position.set(0, 1.32, 1.24);
    group.add(doorwayVoid);

    const openDoor = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.12, 0.08), woodMat);
    openDoor.position.set(0.36, 1.32, 1.42);
    openDoor.rotation.y = -0.85;
    group.add(openDoor);

    return group;
  }

  // Psalm 12:1–6 (#12 "seven times"):
  // Domed clay refining furnace ("silver refined in a clay furnace, purified seven times")
  // with glowing crucible of molten silver inside, iron smith's tongs on the right, and clay water bowl on the left
  // (matching assets/psalms-1/web/b-013-012.jpg)
  createPsalm12RefiningFurnace(pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7e68',
      accentColor: '#cbbba0',
      roughness: 0.90
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: '#3b3936',
      roughness: 0.55,
      metalness: 0.72
    });
    const moltenSilverMat = new THREE.MeshBasicMaterial({ color: '#fff3ba' });

    // Circular clay hearth base & domed furnace body
    const hearthBase = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.05, 1.15, 0.36, 20), 0.025, 3.5),
      clayMat
    );
    hearthBase.position.y = 0.18;
    group.add(hearthBase);

    const dome = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.88, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), 0.03, 3.5),
      clayMat
    );
    dome.position.y = 0.34;
    group.add(dome);

    // Crucible with glowing molten silver inside the furnace mouth
    const crucible = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.38, 16), clayMat);
    crucible.position.set(0, 0.48, 0.32);
    group.add(crucible);

    const moltenSurface = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 16), moltenSilverMat);
    moltenSurface.position.set(0, 0.66, 0.32);
    group.add(moltenSurface);

    // Iron smith's tongs on the right & clay water bowl on the left (exact match to painting #12)
    for (const s of [-0.04, 0.04]) {
      const tongArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.25), ironMat);
      tongArm.position.set(0.88 + s, 0.08, 0.28);
      tongArm.rotation.y = -0.42 + s * 1.2;
      group.add(tongArm);
    }

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.18, 0.24, 16), clayMat);
    bowl.position.set(-1.12, 0.14, 0.18);
    group.add(bowl);

    return group;
  }

  // Psalm 23:1–6 (#22 "through the valley"):
  // Looking through the shadowed canyon toward sunlit green pastures:
  //   - Left rocky crag & stone ledge draped with a fringed striped shepherd's tallit/cloak
  //   - Both the wooden ROD and curved SHEPHERD'S STAFF leaning against the rock ("your rod and your staff, they comfort me")
  //   - Two-handled clay anointing oil jug, overflowing cup, and bronze dish ("you prepare a table before me… my cup runs over")
  //   - Circular dry-stone sheepfold/well rim on the right bank (matching assets/psalms-1/web/b-013-022.jpg)
  createPsalm23ValleyRodAndTable(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const cragMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4c4940',
      accentColor: '#8c8370',
      roughness: 0.92
    });
    const clothMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b8aa8c',
      accentColor: '#e8dec6',
      roughness: 0.85
    });
    const stripeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#424742',
      accentColor: '#6d736a',
      roughness: 0.86
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e5032',
      accentColor: '#b3895b',
      roughness: 0.80
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d6347',
      accentColor: '#ba9870',
      roughness: 0.84
    });
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: '#b88d4f',
      roughness: 0.38,
      metalness: 0.68
    });

    // 1. Left rocky crag & flat stone table ledge (matching painting #22 left foreground)
    const leftLedge = new THREE.Group();
    leftLedge.position.set(-1.55, 0.05, 0.25);
    leftLedge.userData.keepWithGlb = true;

    const boulderBack = new THREE.Mesh(
      this.displaceGeometry(new THREE.DodecahedronGeometry(1.25, 1), 0.08, 2.8),
      cragMat
    );
    boulderBack.scale.set(0.95, 1.55, 1.15);
    boulderBack.position.set(-0.65, 1.35, -0.35);
    leftLedge.add(boulderBack);

    const tableRock = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.55, 0.82, 1.35, 6, 4, 6), 0.04, 3.2),
      cragMat
    );
    tableRock.position.set(0.12, 0.41, 0.15);
    leftLedge.add(tableRock);

    // Draped striped shepherd's tallit/cloak cascading down the rock ledge (exact match to painting #22)
    const tallitTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.08, 0.08, 0.96, 6, 2, 6), 0.015, 4.0),
      clothMat
    );
    tallitTop.position.set(0.22, 0.84, 0.18);
    leftLedge.add(tallitTop);

    const tallitHang = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.76, 0.78, 0.12, 6, 6, 2), 0.02, 4.0),
      clothMat
    );
    tallitHang.position.set(0.32, 0.46, 0.66);
    tallitHang.rotation.x = 0.18;
    leftLedge.add(tallitHang);

    for (const sy of [0.24, 0.34]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.05, 0.13), stripeMat);
      stripe.position.set(0.32, sy, 0.69);
      stripe.rotation.x = 0.18;
      leftLedge.add(stripe);
    }

    // Rolled scroll on the draped cloth
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.58, 12), clothMat);
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = 0.28;
    scroll.position.set(0.18, 0.90, 0.35);
    leftLedge.add(scroll);

    // Anointing oil jug, overflowing cup & shallow bronze plate on the stone ledge ("a table, oil, a full cup")
    const oilJug = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.20, 0.46, 16), clayMat);
    oilJug.position.set(-0.22, 1.05, 0.12);
    leftLedge.add(oilJug);

    const fullCup = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.22, 14), bronzeMat);
    fullCup.position.set(0.45, 0.94, -0.05);
    leftLedge.add(fullCup);

    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.05, 18), bronzeMat);
    plate.position.set(-0.32, 0.86, 0.45);
    leftLedge.add(plate);

    // Shepherd's Curved Staff AND Wooden Rod leaning side-by-side against the boulder (exact match to painting #22)
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0.75, 0.02, 0.52);
    staffGroup.rotation.z = 0.28;

    const staffPole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 2.75, 12), woodMat);
    staffPole.position.y = 1.38;
    staffGroup.add(staffPole);

    const staffHook = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.032, 10, 20, Math.PI * 1.28), woodMat);
    staffHook.position.set(-0.16, 2.74, 0);
    staffGroup.add(staffHook);

    // Shorter shepherd's rod beside the staff
    const rodPole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 2.15, 10), woodMat);
    rodPole.position.set(0.08, 1.08, -0.06);
    staffGroup.add(rodPole);

    leftLedge.add(staffGroup);
    group.add(leftLedge);

    // 2. Circular dry-stone sheepfold/well rim on the right bank (matching painting #22 lower right)
    const rightFold = new THREE.Group();
    rightFold.position.set(1.95, 0.05, -0.65);
    rightFold.userData.keepWithGlb = true;

    const foldBase = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.88, 1.05, 0.28, 18), 0.03, 3.0),
      cragMat
    );
    foldBase.position.y = 0.14;
    rightFold.add(foldBase);

    const foldRim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.12, 10, 22), cragMat);
    foldRim.rotation.x = Math.PI / 2;
    foldRim.position.y = 0.32;
    rightFold.add(foldRim);
    group.add(rightFold);

    const valleyLight = new THREE.PointLight('#ffe8a6', 3.0, 22);
    valleyLight.position.set(0.0, 2.8, -0.5);
    group.add(valleyLight);

    return { group, leftLedge, staffGroup, rightFold, valleyLight };
  }

  // Psalm 27:4 (#26 "one thing"):
  // Warm ashlar stone doorway ("the habitation of your house") with two stone threshold steps:
  //   - Left stone step outside: tall terracotta water jar & fresh green olive branch on the lower step
  //   - Heavy iron-strapped timber door swung open inward
  //   - Inside the vaulted stone room: three-chain hanging bronze sanctuary oil lamp with a living flame,
  //     rolled woven reed mat on the stone floor, and an inner table draped in golden linen with vessels
  // (matching assets/psalms-1/web/b-013-026.jpg)
  createPsalm27OpenHouseThreshold(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a6967a',
      accentColor: '#e6d8be',
      roughness: 0.86
    });
    const timberMat = this.painterly.createPainterlyMaterial({
      baseColor: '#543f29',
      accentColor: '#8f6f4b',
      roughness: 0.82
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: '#38342f',
      roughness: 0.52,
      metalness: 0.75
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6852',
      accentColor: '#b8a286',
      roughness: 0.85
    });
    const goldClothMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c99b42',
      accentColor: '#f5d47a',
      roughness: 0.78
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#55663e',
      accentColor: '#98ab76',
      roughness: 0.80
    });

    // 1. Stone Threshold Steps & Ashlar Doorway Wall (matching painting #26)
    const wallGroup = new THREE.Group();
    wallGroup.userData.keepWithGlb = true;

    const lowerStep = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(3.2, 0.18, 1.35, 8, 2, 4), 0.02, 3.0),
      stoneMat
    );
    lowerStep.position.set(0, 0.09, 0.55);
    wallGroup.add(lowerStep);

    const upperStep = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(3.8, 0.24, 1.65, 8, 2, 4), 0.02, 3.0),
      stoneMat
    );
    upperStep.position.set(0, 0.22, -0.15);
    wallGroup.add(upperStep);

    for (const sx of [-1.38, 1.38]) {
      const jamb = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.12, 3.35, 0.68, 4, 8, 4), 0.025, 3.2),
        stoneMat
      );
      jamb.position.set(sx, 1.85, -0.15);
      wallGroup.add(jamb);
    }

    const lintelStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(3.9, 0.55, 0.72, 8, 2, 4), 0.025, 3.2),
      stoneMat
    );
    lintelStone.position.set(0, 3.72, -0.15);
    wallGroup.add(lintelStone);

    const timberLintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.45, 0.24, 0.76, 8, 2, 4), 0.02, 4.0),
      timberMat
    );
    timberLintel.position.set(0, 3.42, -0.15);
    wallGroup.add(timberLintel);

    // Tall clay water jar on the left stone step & fresh olive branch on the lower step (exact match to painting #26)
    const waterJar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.88, 18), clayMat);
    waterJar.position.set(-1.32, 0.76, 0.32);
    wallGroup.add(waterJar);

    const jarRim = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.032, 8, 18), clayMat);
    jarRim.rotation.x = Math.PI / 2;
    jarRim.position.set(-1.32, 1.20, 0.32);
    wallGroup.add(jarRim);

    const branchGroup = new THREE.Group();
    branchGroup.position.set(-1.05, 0.20, 0.85);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.75, 6), timberMat);
    stem.rotation.z = Math.PI / 2 - 0.12;
    stem.rotation.y = 0.25;
    branchGroup.add(stem);
    for (let l = 0; l < 9; l++) {
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), leafMat);
      lf.scale.set(1.9, 0.22, 0.65);
      lf.position.set(-0.28 + l * 0.07, 0.02, (l % 2 === 0 ? 1 : -1) * 0.07);
      lf.rotation.y = (l % 2 === 0 ? 0.5 : -0.5);
      branchGroup.add(lf);
    }
    wallGroup.add(branchGroup);
    group.add(wallGroup);

    // 2. Heavy Iron-Strapped Timber Door swung open inward on the right jamb (matching painting #26)
    const doorPivot = new THREE.Group();
    doorPivot.position.set(0.80, 0.34, -0.18);
    doorPivot.rotation.y = 1.05;
    doorPivot.userData.keepWithGlb = true;

    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.56, 2.95, 0.11), timberMat);
    doorPanel.position.set(-0.78, 1.48, 0);
    doorPivot.add(doorPanel);

    for (const sy of [0.45, 2.52]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.12, 0.13), ironMat);
      strap.position.set(-0.78, sy, 0);
      doorPivot.add(strap);
    }
    const ironRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.024, 8, 18), ironMat);
    ironRing.position.set(-1.32, 1.45, 0.08);
    doorPivot.add(ironRing);
    group.add(doorPivot);

    // 3. Interior Sanctuary Chamber: Rolled Reed Mat, Draped Table with Vessels & Hanging 3-Chain Bronze Lamp
    const interiorGroup = new THREE.Group();
    interiorGroup.position.set(0, 0.34, -1.65);
    interiorGroup.userData.keepWithGlb = true;

    const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 2.8), stoneMat);
    floorSlab.position.set(0, 0.04, 0);
    interiorGroup.add(floorSlab);

    // Rolled woven reed mat on the left interior floor (matching painting #26)
    const rolledMat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.95, 14), goldClothMat);
    rolledMat.rotation.z = Math.PI / 2;
    rolledMat.rotation.y = 0.38;
    rolledMat.position.set(-0.55, 0.22, 0.45);
    interiorGroup.add(rolledMat);

    // Inner sanctuary table draped in fringed golden cloth with clay vessels
    const innerTable = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.78, 0.72), goldClothMat);
    innerTable.position.set(-0.28, 0.42, -0.65);
    interiorGroup.add(innerTable);

    for (let v = 0; v < 3; v++) {
      const vessel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06 + v * 0.02, 0.09 + v * 0.02, 0.22 + v * 0.05, 12),
        clayMat
      );
      vessel.position.set(-0.52 + v * 0.26, 0.92, -0.65);
      interiorGroup.add(vessel);
    }

    // Hanging Three-Chain Bronze Sanctuary Lamp with living flame (centerpiece of painting #26)
    const hangingLamp = new THREE.Group();
    hangingLamp.position.set(-0.18, 2.35, -0.15);

    const lampBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.10, 0.16, 18), ironMat);
    hangingLamp.add(lampBowl);

    for (let c = 0; c < 3; c++) {
      const cAng = (c / 3) * Math.PI * 2;
      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.88, 6), ironMat);
      chain.position.set(Math.cos(cAng) * 0.14, 0.44, Math.sin(cAng) * 0.14);
      chain.rotation.z = Math.cos(cAng) * 0.26;
      chain.rotation.x = -Math.sin(cAng) * 0.26;
      hangingLamp.add(chain);
    }

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.07, 0.22, 12),
      new THREE.MeshBasicMaterial({ color: '#fff4ba' })
    );
    flame.position.y = 0.16;
    hangingLamp.add(flame);

    const glowTex = this.painterly.createGlowSpriteTexture('#ffe294');
    const lampHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: '#ffe08c',
        transparent: true,
        opacity: 0.90,
        blending: THREE.AdditiveBlending
      })
    );
    lampHalo.position.y = 0.18;
    lampHalo.scale.set(2.4, 2.4, 1);
    hangingLamp.add(lampHalo);

    interiorGroup.add(hangingLamp);
    group.add(interiorGroup);

    const sanctuaryLight = new THREE.PointLight('#ffdf8e', 3.2, 22);
    sanctuaryLight.position.set(-0.18, 2.65, -1.5);
    group.add(sanctuaryLight);

    return { group, doorPivot, hangingLamp, flame, lampHalo, sanctuaryLight };
  }

  // Psalm 41:1–13 (#40 "amen and amen" & District XIII Finale Plaza):
  // Weathered wooden table beside a Judean stone parapet holding:
  //   - The tied parchment Scroll of Book One of the Psalms ("Blessed be Yahweh… Amen and amen")
  //   - A woven basket lined with a striped linen cloth holding broken loaves of warm bread ("Blessed is he who considers the poor", Psalm 41:1)
  //   - A terracotta cup/pitcher
  //   - When isFinalePlaza = true, pairs with the Tree Planted by the Streams of Water & David's 10-string harp
  // (matching assets/psalms-1/web/b-013-040.jpg)
  createPsalm41AmenTableEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#695239',
      accentColor: '#a68763',
      roughness: 0.86
    });
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8f7d60',
      accentColor: '#e3cc9d',
      roughness: 0.88
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9c59a',
      accentColor: '#f5e7c6',
      roughness: 0.78
    });
    const cordMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4428',
      accentColor: '#96744c',
      roughness: 0.88
    });
    const breadMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e723e',
      accentColor: '#e8c892',
      roughness: 0.84
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#826b52',
      accentColor: '#c2a786',
      roughness: 0.84
    });

    // 1. Weathered Wooden Table & Stone Parapet Ledge (matching painting #40 foreground)
    const tableGroup = new THREE.Group();
    tableGroup.position.set(isFinalePlaza ? -1.15 : 0, 0.08, isFinalePlaza ? 0.55 : 0);
    tableGroup.userData.keepWithGlb = true;

    const tabletop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.15, 0.12, 1.25, 8, 2, 6), 0.015, 4.0),
      woodMat
    );
    tabletop.position.y = 0.82;
    tableGroup.add(tabletop);

    for (const [lx, lz] of [[-0.88, -0.46], [0.88, -0.46], [-0.88, 0.46], [0.88, 0.46]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.80, 0.14), woodMat);
      leg.position.set(lx, 0.40, lz);
      tableGroup.add(leg);
    }

    // Low stone parapet blocks behind the table (matching painting #40 middleground)
    for (let b = 0; b < 2; b++) {
      const block = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.15, 0.42, 0.55, 6, 2, 4), 0.025, 3.2),
        stoneMat
      );
      block.position.set(-0.55 + b * 1.18, 0.92, -0.68);
      tableGroup.add(block);
    }

    // Tied Parchment Scroll of Book One of the Psalms (foreground centerpiece of painting #40)
    const scrollGroup = new THREE.Group();
    scrollGroup.position.set(-0.28, 0.99, 0.16);
    scrollGroup.rotation.z = Math.PI / 2;
    scrollGroup.rotation.y = -0.36;

    const scrollRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.96, 18), parchmentMat);
    scrollGroup.add(scrollRoll);

    for (const cy of [-0.04, 0.0, 0.04]) {
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.014, 8, 20), cordMat);
      cord.rotation.x = Math.PI / 2;
      cord.position.y = cy;
      scrollGroup.add(cord);
    }
    tableGroup.add(scrollGroup);

    // Woven Basket lined with linen cloth & broken loaves of bread ("on the one who notices the poor", painting #40)
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.18, 18), cordMat);
    basket.position.set(0.45, 0.96, -0.05);
    tableGroup.add(basket);

    for (let l = 0; l < 3; l++) {
      const loaf = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.16, 12, 10), 0.025, 4.0),
        breadMat
      );
      loaf.scale.set(1.25, 0.78, 1.0);
      loaf.position.set(0.34 + l * 0.12, 1.06 + (l % 2) * 0.04, -0.08 + (l - 1) * 0.09);
      tableGroup.add(loaf);
    }

    // Clay Cup / Pitcher on the right (matching painting #40 right edge)
    const clayPitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.36, 16), clayMat);
    clayPitcher.position.set(0.88, 1.06, -0.18);
    tableGroup.add(clayPitcher);

    group.add(tableGroup);

    // 2. If Finale Plaza, pair with the Tree Planted by the Streams of Water (Psalm 1) & 10-String Harp (Psalm 33)
    if (isFinalePlaza) {
      const plantedEnsemble = this.createPlantedByWaterTreeEnsemble(propTex, pal, false);
      plantedEnsemble.group.position.set(1.15, 0, -1.35);
      group.add(plantedEnsemble.group);

      const harp = this.createDavidHarp(1.15);
      harp.position.set(-2.45, 0.08, -0.35);
      harp.rotation.y = 0.45;
      group.add(harp);
    }

    return group;
  }

  // ============================================================================
  // DISTRICT XIV: AS THE DEER (PSALMS 42–72) BESPOKE 3D PROP ENSEMBLES
  // Crafted directly from Timothy Holt's paintings (#1, #5, #15, #20, #31)
  // ============================================================================

  // Psalm 42:1–5 (#1 "preach to yourself" — Signature Symbolic Element of District XIV):
  //   - Graceful sculpted doe/deer on the left rocky bank bending down to drink from the brook
  //   - Right-bank stone boulder ledge draped with plaid/striped pilgrim cloak, open scroll,
  //     two woven baskets, leaning walking staff, and rustic stone porch shelter
  // (matching assets/psalms-2/web/b-014-001.jpg)
  createPsalm42DeerBrookEnsemble(propTex = null, pal = {}, includePorch = true) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const coatMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7252',
      accentColor: '#c9ad86',
      roughness: 0.84
    });
    const underbellyMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9cbb4',
      accentColor: '#f5ede0',
      roughness: 0.86
    });
    const hoofMat = this.painterly.createPainterlyMaterial({
      baseColor: '#3d3328',
      accentColor: '#635443',
      roughness: 0.78
    });
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#857d6d',
      accentColor: pal.accent || '#dfd7c4',
      roughness: 0.90
    });
    const cloakMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e6455',
      accentColor: '#bfb39e',
      roughness: 0.86
    });
    const basketMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d6340',
      accentColor: '#baa077',
      roughness: 0.86
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4630',
      accentColor: '#9c7c58',
      roughness: 0.84
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#dfd3ba',
      accentColor: '#f7f0df',
      roughness: 0.78
    });

    // 1. The Signature Deer at the Water Brook on the left bank (exact match to painting #1)
    const deerGroup = new THREE.Group();
    deerGroup.position.set(-1.15, 0.08, -0.25);
    deerGroup.rotation.y = 0.48;
    deerGroup.userData.keepWithGlb = true;

    const torso = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.28, 0.32, 1.18, 14), 0.018, 4.0),
      coatMat
    );
    torso.rotation.z = Math.PI / 2 - 0.14;
    torso.position.set(0, 0.92, 0);
    deerGroup.add(torso);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.30, 14, 12), underbellyMat);
    chest.scale.set(1.1, 0.95, 0.88);
    chest.position.set(0.46, 0.84, 0);
    deerGroup.add(chest);

    const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), coatMat);
    haunch.scale.set(1.1, 1.05, 0.92);
    haunch.position.set(-0.48, 0.98, 0);
    deerGroup.add(haunch);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 8), underbellyMat);
    tail.position.set(-0.78, 1.02, 0);
    tail.rotation.z = 0.65;
    deerGroup.add(tail);

    // Four slender legs standing on the creek bank stones
    const legCoords = [
      [0.44, 0.45, -0.14, 0.08],
      [0.38, 0.45, 0.14, 0.02],
      [-0.44, 0.48, -0.15, -0.06],
      [-0.50, 0.48, 0.15, -0.10]
    ];
    legCoords.forEach(([lx, ly, lz, lTilt]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.036, 0.92, 10), coatMat);
      leg.position.set(lx, ly, lz);
      leg.rotation.z = lTilt;
      deerGroup.add(leg);

      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.08, 8), hoofMat);
      hoof.position.set(lx + lTilt * 0.3, 0.04, lz);
      deerGroup.add(hoof);
    });

    // Neck & Head pivot dipping down to touch the brook water (matching painting #1)
    const neckPivot = new THREE.Group();
    neckPivot.position.set(0.56, 0.82, 0);
    neckPivot.rotation.z = -1.08;

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.17, 0.72, 12), coatMat);
    neck.position.set(0, 0.34, 0);
    neckPivot.add(neck);

    const head = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.42, 12), coatMat);
    head.rotation.z = -Math.PI / 2 - 0.32;
    head.position.set(0.16, 0.68, 0);
    neckPivot.add(head);

    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), hoofMat);
    muzzle.position.set(0.35, 0.62, 0);
    neckPivot.add(muzzle);

    for (const ez of [-0.11, 0.11]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), coatMat);
      ear.scale.set(0.65, 1.85, 0.45);
      ear.position.set(-0.02, 0.78, ez);
      ear.rotation.z = 0.45;
      ear.rotation.x = ez * 2.2;
      neckPivot.add(ear);
    }

    deerGroup.add(neckPivot);
    group.add(deerGroup);

    // 2. Right-Bank Stone Ledge with Draped Pilgrim Cloak, Open Scroll, Baskets & Walking Staff (exact match to painting #1 right foreground)
    const rightBank = new THREE.Group();
    rightBank.position.set(1.55, 0.06, 0.35);
    rightBank.userData.keepWithGlb = true;

    const mainBoulder = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.65, 0.92, 1.45, 6, 4, 6), 0.04, 3.0),
      stoneMat
    );
    mainBoulder.position.set(0.25, 0.46, 0);
    rightBank.add(mainBoulder);

    const lowerStep = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.15, 0.42, 1.05, 6, 2, 6), 0.03, 3.2),
      stoneMat
    );
    lowerStep.position.set(-0.32, 0.21, 0.55);
    rightBank.add(lowerStep);

    // Draped woven cloak cascading down the boulder face
    const cloakDrape = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.74, 0.86, 0.14, 6, 6, 2), 0.02, 4.0),
      cloakMat
    );
    cloakDrape.position.set(-0.18, 0.56, 0.68);
    cloakDrape.rotation.x = -0.18;
    rightBank.add(cloakDrape);

    // Open parchment pages on the lower stone step ("preach to yourself", painting #1)
    const openScroll = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.42), parchmentMat);
    openScroll.position.set(-0.38, 0.43, 0.62);
    openScroll.rotation.y = 0.28;
    rightBank.add(openScroll);

    // Woven baskets & leaning wooden walking staff
    const topBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.22, 16), basketMat);
    topBasket.position.set(-0.12, 1.02, 0.18);
    rightBank.add(topBasket);

    const lowBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.20, 0.28, 16), basketMat);
    lowBasket.position.set(0.22, 0.56, 0.72);
    rightBank.add(lowBasket);

    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 1.65, 10), woodMat);
    staff.position.set(0.18, 0.78, 0.66);
    staff.rotation.z = -0.22;
    rightBank.add(staff);

    // Rustic stone shelter & wooden porch posts in the upper right (matching painting #1 right midground)
    if (includePorch) {
      const porchWall = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.8, 2.35, 1.4, 4, 6, 4), 0.03, 3.0),
        stoneMat
      );
      porchWall.position.set(1.65, 1.35, -1.35);
      rightBank.add(porchWall);

      for (const pz of [-0.65, -1.95]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 2.15, 8), woodMat);
        post.position.set(0.65, 1.25, pz);
        rightBank.add(post);
      }
      const roofBeam = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.14, 1.65), woodMat);
      roofBeam.position.set(1.15, 2.35, -1.30);
      roofBeam.rotation.z = 0.18;
      rightBank.add(roofBeam);
    }

    group.add(rightBank);

    const brookLight = new THREE.PointLight('#fff0c4', 2.9, 22);
    brookLight.position.set(-0.4, 2.6, 0.2);
    group.add(brookLight);

    return { group, deerGroup, neckPivot, rightBank, brookLight };
  }

  // Psalm 46:1–11 (#5 "be still"):
  // Mirror-still lake shore with:
  //   - Broken wooden bow ("He breaks the bow")
  //   - Shattered/laid-down iron-tipped spear bound with cord ("and shatters the spear", Psalm 46:9)
  //   - Discarded dark slate warrior's cloak on the shore stones
  // (matching assets/psalms-2/web/b-014-005.jpg)
  createPsalm46BeStillShorelineEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#59442e',
      accentColor: '#967653',
      roughness: 0.85
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: '#52585e',
      roughness: 0.42,
      metalness: 0.78
    });
    const slateClothMat = this.painterly.createPainterlyMaterial({
      baseColor: '#3f4852',
      accentColor: '#737e8a',
      roughness: 0.88
    });
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#756e5f',
      accentColor: pal.accent || '#d6ccb8',
      roughness: 0.90
    });

    const shoreGroup = new THREE.Group();
    shoreGroup.userData.keepWithGlb = true;

    // 1. Broken Wooden Bow on the left shore (exact match to foreground of painting #5)
    const bowHalf1 = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.048, 10, 22, Math.PI * 0.45),
      woodMat
    );
    bowHalf1.rotation.x = Math.PI / 2;
    bowHalf1.rotation.z = -0.35;
    bowHalf1.position.set(-0.95, 0.08, 0.35);
    shoreGroup.add(bowHalf1);

    const bowHalf2 = new THREE.Mesh(
      new THREE.TorusGeometry(0.88, 0.046, 10, 22, Math.PI * 0.42),
      woodMat
    );
    bowHalf2.rotation.x = Math.PI / 2;
    bowHalf2.rotation.z = 0.55;
    bowHalf2.position.set(-0.42, 0.07, -0.45);
    shoreGroup.add(bowHalf2);

    // 2. Iron-Tipped Spear laid down across the center shore (matching painting #5)
    const spearGroup = new THREE.Group();
    spearGroup.position.set(0.15, 0.08, 0.25);
    spearGroup.rotation.y = 0.52;

    const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 2.45, 10), woodMat);
    spearShaft.rotation.z = Math.PI / 2;
    spearGroup.add(spearShaft);

    const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.38, 4), ironMat);
    spearHead.rotation.z = Math.PI / 2;
    spearHead.scale.set(0.35, 1.0, 1.0);
    spearHead.position.set(-1.38, 0, 0);
    spearGroup.add(spearHead);

    shoreGroup.add(spearGroup);

    // 3. Discarded dark blue-slate cloak & shoreline stones on the right (matching painting #5 lower right)
    const cloak = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.56, 14, 10), 0.06, 3.8),
      slateClothMat
    );
    cloak.scale.set(1.35, 0.28, 1.05);
    cloak.position.set(1.12, 0.14, 0.52);
    shoreGroup.add(cloak);

    for (let r = 0; r < 7; r++) {
      const rock = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.28 + (r % 3) * 0.12, 1), 0.04, 3.2),
        stoneMat
      );
      rock.scale.set(1.35, 0.62, 1.15);
      rock.position.set(-1.6 + r * 0.56, 0.12, -0.55 + (r % 2) * 0.85);
      shoreGroup.add(rock);
    }

    group.add(shoreGroup);

    const stillLight = new THREE.PointLight('#e8f0ff', 2.8, 22);
    stillLight.position.set(0, 2.6, -0.4);
    group.add(stillLight);

    return { group, shoreGroup, spearGroup, stillLight };
  }

  // Psalm 56:3–8 (#15 "your bottle"):
  // Sunlit plastered stone window sill ("You put my tears into your container. Aren't they in your book?")
  //   - Slender terracotta lachrymatory tear-bottle at the center of the stone sill with a glistening teardrop at its rim
  //   - Fringed woven cloth on the right holding the rolled Book of Remembrance scroll & shallow clay dish
  //   - Olive branch framing the left window opening (matching assets/psalms-2/web/b-014-015.jpg)
  createPsalm56TearBottleWindowEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const plasterMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9ceb4',
      accentColor: '#f5ebd4',
      roughness: 0.86
    });
    const terracottaMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a66338',
      accentColor: '#de9868',
      roughness: 0.68
    });
    const clothMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d8b78',
      accentColor: '#c9c6b2',
      roughness: 0.86
    });
    const scrollMat = this.painterly.createPainterlyMaterial({
      baseColor: '#bda982',
      accentColor: '#e8d8b5',
      roughness: 0.80
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c6e46',
      accentColor: '#9eb082',
      roughness: 0.80
    });
    const tearMat = new THREE.MeshPhysicalMaterial({
      color: '#e8f6ff',
      transmission: 0.75,
      opacity: 0.92,
      transparent: true,
      roughness: 0.08,
      metalness: 0.1
    });

    // 1. Plastered Stone Window Frame & Deep Sill (matching painting #15)
    const windowGroup = new THREE.Group();
    windowGroup.userData.keepWithGlb = true;

    const sill = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(3.4, 0.88, 1.35, 8, 4, 6), 0.02, 3.2),
      plasterMat
    );
    sill.position.set(0, 0.44, 0);
    windowGroup.add(sill);

    for (const sx of [-1.42, 1.42]) {
      const jamb = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.68, 2.25, 1.15, 4, 6, 4), 0.02, 3.2),
        plasterMat
      );
      jamb.position.set(sx, 1.95, -0.05);
      windowGroup.add(jamb);
    }

    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(3.5, 0.52, 1.18, 8, 2, 4), 0.02, 3.2),
      plasterMat
    );
    lintel.position.set(0, 3.28, -0.05);
    windowGroup.add(lintel);

    // 2. The Terracotta Tear-Bottle (Lachrymatory) standing in the sunlight at the center of the sill (exact match to painting #15)
    const bottleGroup = new THREE.Group();
    bottleGroup.position.set(-0.15, 0.88, 0.12);

    const bottleBelly = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), terracottaMat);
    bottleBelly.scale.set(1.0, 1.28, 1.0);
    bottleBelly.position.y = 0.32;
    bottleGroup.add(bottleBelly);

    const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.18, 0.56, 18), terracottaMat);
    bottleNeck.position.y = 0.72;
    bottleGroup.add(bottleNeck);

    const bottleRim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.026, 10, 20), terracottaMat);
    bottleRim.rotation.x = Math.PI / 2;
    bottleRim.position.y = 1.00;
    bottleGroup.add(bottleRim);

    // Glistening teardrop on the rim (exact detail from painting #15)
    const teardrop = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), tearMat);
    teardrop.scale.set(0.85, 1.35, 0.85);
    teardrop.position.set(0.04, 0.97, 0.11);
    bottleGroup.add(teardrop);

    windowGroup.add(bottleGroup);

    // 3. Fringed Cloth, Rolled Book of Remembrance Scroll & Small Clay Dish on the right sill (matching painting #15 right side)
    const cloth = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.05, 0.06, 0.82, 6, 2, 6), 0.015, 4.0),
      clothMat
    );
    cloth.position.set(0.76, 0.90, 0.22);
    windowGroup.add(cloth);

    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.82, 16), scrollMat);
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = 0.26;
    scroll.position.set(0.68, 0.99, 0.05);
    windowGroup.add(scroll);

    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.07, 16), scrollMat);
    dish.position.set(0.92, 0.96, 0.32);
    windowGroup.add(dish);

    // 4. Olive foliage outside the left side of the window opening (matching painting #15 left window view)
    const foliageGroup = new THREE.Group();
    foliageGroup.position.set(-0.78, 1.65, -0.58);
    for (let l = 0; l < 18; l++) {
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), leafMat);
      lf.scale.set(2.1, 0.28, 0.75);
      lf.position.set((l % 3) * 0.22 - 0.15, (l % 6) * 0.18 - 0.35, (l % 2) * 0.12);
      lf.rotation.z = (l % 2 === 0 ? 0.45 : -0.45);
      foliageGroup.add(lf);
    }
    windowGroup.add(foliageGroup);

    group.add(windowGroup);

    const windowLight = new THREE.PointLight('#fff0c2', 3.1, 22);
    windowLight.position.set(-0.15, 2.2, 0.8);
    group.add(windowLight);

    return { group, windowGroup, bottleGroup, teardrop, windowLight };
  }

  // Psalm 61:1–3 (#20 "higher than I"):
  //   - Towering sunlit flat-topped cliff/mesa ("the rock that is higher than I") with a winding footpath
  //     climbing up its face to olive trees at the summit
  //   - Foreground terraced stone courtyard with circular winnowing grain ring on woven reed mats,
  //     two clay storage amphorae against the dry-stone wall, and shaded arbor
  // (matching assets/psalms-2/web/b-014-020.jpg)
  createPsalm61RockHigherEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const cliffMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c8a6b',
      accentColor: '#ebd09b',
      roughness: 0.88
    });
    const pathMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9c59e',
      accentColor: '#f7ead0',
      roughness: 0.84
    });
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8a7d67',
      accentColor: '#dfd2b8',
      roughness: 0.90
    });
    const grainMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c9a65b',
      accentColor: '#f2d994',
      roughness: 0.82
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#82674a',
      accentColor: '#bfa07d',
      roughness: 0.84
    });

    // 1. The Towering Flat-Topped Rock Higher Than I with Winding Footpath & Summit Olive Trees (matching painting #20 center)
    const highRockGroup = new THREE.Group();
    highRockGroup.position.set(0.35, 0.0, -2.45);
    highRockGroup.userData.keepWithGlb = true;

    const mesaCore = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.85, 2.85, 4.45, 22, 12), 0.09, 2.6),
      cliffMat
    );
    mesaCore.position.y = 2.22;
    highRockGroup.add(mesaCore);

    // Winding stepped trail ascending the cliff face ("one higher than me, and a hand to lead me up")
    for (let s = 0; s < 16; s++) {
      const t = s / 15;
      const ang = -0.35 + Math.sin(t * Math.PI * 1.6) * 0.55;
      const rad = 2.65 - t * 0.82;
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.10, 0.34), pathMat);
      step.position.set(Math.sin(ang) * rad, 0.25 + t * 4.15, Math.cos(ang) * rad);
      step.rotation.y = ang;
      highRockGroup.add(step);
    }

    // Olive trees crowning the summit plateau (exact match to painting #20 top of mesa)
    for (const [tx, tz, ts] of [[-0.35, 0.15, 0.52], [0.55, -0.22, 0.44]]) {
      const summitTree = this.createGreatPainterlyTree(propTex, pal, ts);
      summitTree.position.set(tx, 4.42, tz);
      highRockGroup.add(summitTree);
    }
    group.add(highRockGroup);

    // 2. Foreground Terraced Stone Courtyard with Circular Grain Ring, Woven Mats & Clay Jars (matching painting #20 lower foreground)
    const terraceGroup = new THREE.Group();
    terraceGroup.position.set(0.0, 0.06, 0.65);
    terraceGroup.userData.keepWithGlb = true;

    // Woven reed mats & circular grain sieve ring in the center foreground
    const matSlab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.03, 1.15), pathMat);
    matSlab.position.set(-0.25, 0.02, 0.25);
    terraceGroup.add(matSlab);

    const sieveRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 10, 24), stoneMat);
    sieveRing.rotation.x = Math.PI / 2;
    sieveRing.position.set(-0.25, 0.07, 0.18);
    terraceGroup.add(sieveRing);

    const grainDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.04, 20), grainMat);
    grainDisk.position.set(-0.25, 0.06, 0.18);
    terraceGroup.add(grainDisk);

    // Dry-stone wall & two terracotta storage jars on the right (matching painting #20 lower right)
    for (let w = 0; w < 7; w++) {
      const wStone = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.42, 0.32, 0.36, 4, 2, 4), 0.025, 3.2),
        stoneMat
      );
      wStone.position.set(0.75 + w * 0.24, 0.18, 0.55 - w * 0.28);
      wStone.rotation.y = 0.72;
      terraceGroup.add(wStone);
    }

    for (let j = 0; j < 2; j++) {
      const jar = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), clayMat);
      jar.scale.set(0.95, 1.25, 0.95);
      jar.position.set(1.65 + j * 0.36, 0.32, -0.25 - j * 0.15);
      terraceGroup.add(jar);
    }

    group.add(terraceGroup);

    const rockLight = new THREE.PointLight('#ffe8a6', 3.2, 24);
    rockLight.position.set(0.35, 4.9, -1.8);
    group.add(rockLight);

    return { group, highRockGroup, terraceGroup, rockLight };
  }

  // Psalm 72:6–20 (#31 "like rain" & District XIV Finale Plaza):
  //   - Left stone slab table under an olive tree holding a cloth-draped woven basket,
  //     clay pitcher, and the rolled scroll of Book Two ("The prayers of David the son of Jesse are ended")
  //   - Four golden bound grain sheaves standing in the mown rain-washed meadow ("like rain on the mown grass")
  //   - When isFinalePlaza = true, pairs with the signature Deer by the Water Brook (Psalm 42:1)
  // (matching assets/psalms-2/web/b-014-031.jpg)
  createPsalm72LikeRainFinaleEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#827966',
      accentColor: '#dfd5be',
      roughness: 0.88
    });
    const sheafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a89258',
      accentColor: '#e6d396',
      roughness: 0.84
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d684f',
      accentColor: '#bfa686',
      roughness: 0.82
    });
    const scrollMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9c8a3',
      accentColor: '#f5ebd2',
      roughness: 0.78
    });

    // 1. Left Stone Slab Table atop Dry-Stone Terrace Wall with Basket, Pitcher & Scroll of Book Two (matching painting #31 left foreground)
    const tableGroup = new THREE.Group();
    tableGroup.position.set(isFinalePlaza ? -1.45 : -0.85, 0.06, 0.45);
    tableGroup.userData.keepWithGlb = true;

    const stoneSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.85, 0.36, 1.35, 6, 2, 6), 0.025, 3.2),
      stoneMat
    );
    stoneSlab.position.y = 0.32;
    tableGroup.add(stoneSlab);

    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.26, 16), clayMat);
    basket.position.set(-0.38, 0.63, 0.08);
    tableGroup.add(basket);

    const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.44, 16), clayMat);
    pitcher.position.set(0.08, 0.72, -0.12);
    tableGroup.add(pitcher);

    for (let s = 0; s < 2; s++) {
      const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.56, 14), scrollMat);
      scroll.rotation.z = Math.PI / 2;
      scroll.rotation.y = 0.32 + s * 0.18;
      scroll.position.set(0.32 + s * 0.10, 0.56, 0.18 + s * 0.08);
      tableGroup.add(scroll);
    }

    group.add(tableGroup);

    // 2. Four Bound Golden Grain Sheaves standing in a row across the mown meadow (exact match to center of painting #31)
    const sheavesGroup = new THREE.Group();
    sheavesGroup.position.set(isFinalePlaza ? 0.85 : 0.65, 0.05, -0.35);
    sheavesGroup.userData.keepWithGlb = true;

    for (let i = 0; i < 4; i++) {
      const sheaf = new THREE.Group();
      sheaf.position.set(-0.95 + i * 0.68, 0, -i * 0.25);

      const lowerCone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 0.48, 12), sheafMat);
      lowerCone.position.y = 0.24;
      sheaf.add(lowerCone);

      const upperCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.12, 0.38, 12), sheafMat);
      upperCrown.position.y = 0.64;
      sheaf.add(upperCrown);

      sheavesGroup.add(sheaf);
    }
    group.add(sheavesGroup);

    // 3. When isFinalePlaza = true, pair with the signature Deer by the Water Brook (Psalm 42:1) & Olive Tree
    if (isFinalePlaza) {
      const deerEnsemble = this.createPsalm42DeerBrookEnsemble(propTex, pal, false);
      deerEnsemble.group.position.set(1.25, 0, -1.55);
      group.add(deerEnsemble.group);

      const oliveTree = this.createGreatPainterlyTree(propTex, pal, 1.25);
      oliveTree.position.set(-2.35, 0.1, -1.15);
      group.add(oliveTree);
    }

    return group;
  }

  // ============================================================================
  // DISTRICT XV: A DAY IN YOUR COURTS (PSALMS 73–106) BESPOKE 3D PROP ENSEMBLES
  // Crafted directly from Timothy Holt's paintings (#1, #12, #19, #31, #34)
  // ============================================================================

  // Psalm 73:13–26 (#1 "until I walked in"):
  //   - Monumental Jerusalem limestone sanctuary portal flanked by carved columns
  //   - Tall golden-paneled sanctuary door standing open on the right, revealing the glowing
  //     7-branched Golden Menorah inside the temple
  //   - Forecourt merchant/offering table on the right under a linen canopy with clay amphorae & woven baskets
  //   - Carved wooden temple cart on the left with spoked wheels & golden corner finials
  // (matching assets/psalms-3/web/b-015-001.jpg)
  createPsalm73SanctuaryPortalEnsemble(propTex = null, pal = {}, includeCart = true) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const limestoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a69a82',
      accentColor: '#ede2ca',
      roughness: 0.86
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: '#e8bd5a',
      emissive: '#b8821e',
      emissiveIntensity: 0.42,
      roughness: 0.28,
      metalness: 0.82
    });
    const darkWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4f3e2b',
      accentColor: '#8c7252',
      roughness: 0.82
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#876d4f',
      accentColor: '#c7ab88',
      roughness: 0.84
    });

    // 1. Limestone Sanctuary Portal & Open Golden Doorway on the right (matching painting #1 right architecture)
    const portalGroup = new THREE.Group();
    portalGroup.position.set(includeCart ? 0.65 : 0.0, 0, -0.35);
    portalGroup.userData.keepWithGlb = true;

    for (const sx of [-1.45, 1.45]) {
      const wallPier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.95, 3.85, 1.15, 4, 8, 4), 0.025, 3.2),
        limestoneMat
      );
      wallPier.position.set(sx, 1.92, 0);
      portalGroup.add(wallPier);

      const column = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.22, 0.26, 3.25, 16), 0.015, 3.5),
        limestoneMat
      );
      column.position.set(sx * 0.68, 1.78, 0.56);
      portalGroup.add(column);
    }

    const entablature = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(3.95, 0.72, 1.32, 8, 3, 4), 0.025, 3.2),
      limestoneMat
    );
    entablature.position.set(0, 4.15, 0.05);
    portalGroup.add(entablature);

    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(3.25 + s * 0.35, 0.14, 0.95 + s * 0.36, 8, 2, 4), 0.015, 3.5),
        limestoneMat
      );
      step.position.set(0, (3 - s) * 0.12 - 0.05, 0.35 + s * 0.22);
      portalGroup.add(step);
    }

    // Open golden-paneled sanctuary door leaf ("until I entered God's sanctuary")
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.78, 0.36, 0.12);
    doorPivot.rotation.y = 1.12;
    const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.88, 3.10, 0.10), goldMat);
    doorLeaf.position.set(0.44, 1.55, 0);
    doorPivot.add(doorLeaf);
    portalGroup.add(doorPivot);

    // 7-Branched Golden Menorah glowing inside the sanctuary threshold (matching painting #1 open doorway)
    const innerMenorah = this.createGoldenMenorah(propTex, pal);
    innerMenorah.scale.setScalar(0.58);
    innerMenorah.position.set(0.18, 0.52, -0.55);
    portalGroup.add(innerMenorah);

    // Forecourt offering table with clay jars & baskets on the right (matching painting #1 lower right)
    const tableBench = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 0.72), darkWoodMat);
    tableBench.position.set(1.55, 0.34, 1.15);
    portalGroup.add(tableBench);

    for (let j = 0; j < 3; j++) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.36, 14), clayMat);
      jar.position.set(1.25 + j * 0.28, 0.84, 1.12 + (j % 2) * 0.12);
      portalGroup.add(jar);
    }

    group.add(portalGroup);

    // 2. Carved Wooden Temple Cart with Golden Corner Finials & Spoked Wheels on the left (matching painting #1 left)
    if (includeCart) {
      const cartGroup = new THREE.Group();
      cartGroup.position.set(-1.65, 0.04, 0.35);
      cartGroup.rotation.y = 0.38;
      cartGroup.userData.keepWithGlb = true;

      const cartChest = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.05, 1.05), darkWoodMat);
      cartChest.position.y = 0.88;
      cartGroup.add(cartChest);

      // Golden rosette medallion & corner finials on the cart chest
      const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 20), goldMat);
      rosette.rotation.x = Math.PI / 2;
      rosette.position.set(0, 0.88, 0.54);
      cartGroup.add(rosette);

      for (const [fx, fz] of [[-0.64, -0.48], [0.64, -0.48], [-0.64, 0.48], [0.64, 0.48]]) {
        const finial = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.18, 10), goldMat);
        finial.position.set(fx, 1.48, fz);
        cartGroup.add(finial);
      }

      for (const wz of [-0.58, 0.58]) {
        const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.048, 10, 24), darkWoodMat);
        wheel.position.set(0, 0.48, wz);
        cartGroup.add(wheel);
      }

      group.add(cartGroup);
    }

    const sanctuaryLight = new THREE.PointLight('#ffe28a', 3.4, 24);
    sanctuaryLight.position.set(includeCart ? 0.65 : 0.0, 2.35, -0.15);
    group.add(sanctuaryLight);

    return { group, portalGroup, doorPivot, innerMenorah, sanctuaryLight };
  }

  // Psalm 84:1–6 (#12 "the sparrow's nest" — Signature Symbolic Element of District XV):
  //   - Carved limestone altar ledge on the left with a burning clay oil lamp, two rolled scrolls
  //     on a fringed white linen cloth, and two clay vessels (round jar & slender flask)
  //   - Weathered temple limestone wall on the right with a recessed stone niche holding the
  //     woven twig Sparrow's Nest ("the sparrow has found a home, and the swallow a nest for herself... near your altars")
  //   - Olive branch framing the right edge (matching assets/psalms-3/web/b-015-012.jpg)
  createPsalm84SparrowNestAltarEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const limestoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a89d86',
      accentColor: '#ede4cf',
      roughness: 0.88
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#ded5bf',
      accentColor: '#faf4e6',
      roughness: 0.82
    });
    const twigMat = this.painterly.createPainterlyMaterial({
      baseColor: '#544531',
      accentColor: '#968060',
      roughness: 0.92
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7a61',
      accentColor: '#ccb99b',
      roughness: 0.82
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c6b47',
      accentColor: '#9cad80',
      roughness: 0.80
    });

    // 1. Left Carved Temple Altar Ledge with Burning Clay Lamp, Fringed Cloth, Two Scrolls & Clay Vessels (exact match to painting #12 left)
    const altarLedgeGroup = new THREE.Group();
    altarLedgeGroup.position.set(-0.92, 0.0, 0.15);
    altarLedgeGroup.userData.keepWithGlb = true;

    const pillar = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.32, 0.36, 1.35, 16), 0.02, 3.5),
      limestoneMat
    );
    pillar.position.set(-0.15, 0.68, 0);
    altarLedgeGroup.add(pillar);

    const corniceSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.75, 0.28, 1.25, 6, 2, 6), 0.018, 3.5),
      limestoneMat
    );
    corniceSlab.position.set(0, 1.42, 0);
    altarLedgeGroup.add(corniceSlab);

    // Fringed white linen altar cloth hanging down the front edge
    const clothHang = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.05), linenMat);
    clothHang.position.set(0.22, 1.24, 0.62);
    altarLedgeGroup.add(clothHang);

    const clothTop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.03, 0.76), linenMat);
    clothTop.position.set(0.22, 1.57, 0.24);
    altarLedgeGroup.add(clothTop);

    // Two rolled Torah scrolls resting on the linen cloth (matching painting #12 center-left)
    for (let s = 0; s < 2; s++) {
      const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.72, 14), linenMat);
      scroll.rotation.z = Math.PI / 2;
      scroll.rotation.y = 0.28;
      scroll.position.set(0.18 + s * 0.14, 1.63, 0.24 + s * 0.10);
      altarLedgeGroup.add(scroll);
    }

    // Burning clay oil lamp on the left corner of the altar slab (matching painting #12 left)
    const oilLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.11, 16), clayMat);
    oilLamp.position.set(-0.52, 1.61, 0.22);
    altarLedgeGroup.add(oilLamp);

    const flameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 0.14, 10),
      new THREE.MeshBasicMaterial({ color: '#ffefb0' })
    );
    flameMesh.position.set(-0.52, 1.72, 0.22);
    altarLedgeGroup.add(flameMesh);

    // Round clay jar & slender long-necked flask behind the scrolls (matching painting #12)
    const roundJar = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), clayMat);
    roundJar.scale.set(1.0, 1.18, 1.0);
    roundJar.position.set(-0.12, 1.78, -0.18);
    altarLedgeGroup.add(roundJar);

    const tallFlask = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.16, 0.56, 16), clayMat);
    tallFlask.position.set(0.22, 1.84, -0.12);
    altarLedgeGroup.add(tallFlask);

    group.add(altarLedgeGroup);

    // 2. Right Weathered Temple Stone Wall with the Recessed Niche & Woven Twig Sparrow's Nest (exact match to painting #12 right)
    const nestWallGroup = new THREE.Group();
    nestWallGroup.position.set(0.78, 0.0, -0.10);
    nestWallGroup.userData.keepWithGlb = true;

    const stoneWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.75, 2.85, 1.15, 8, 10, 6), 0.045, 2.8),
      limestoneMat
    );
    stoneWall.position.set(0, 1.42, 0);
    nestWallGroup.add(stoneWall);

    // Woven twig Sparrow's Nest tucked in the stone niche at eye level (matching painting #12)
    const nestGroup = new THREE.Group();
    nestGroup.position.set(-0.12, 1.56, 0.54);

    const nestBowl = new THREE.Mesh(
      this.displaceGeometry(new THREE.TorusGeometry(0.32, 0.14, 12, 24), 0.035, 5.0),
      twigMat
    );
    nestBowl.rotation.x = Math.PI / 2 - 0.22;
    nestGroup.add(nestBowl);

    for (let t = 0; t < 18; t++) {
      const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.010, 0.56, 6), twigMat);
      const ang = (t / 18) * Math.PI * 2;
      twig.position.set(Math.cos(ang) * 0.28, (t % 3) * 0.04 - 0.04, Math.sin(ang) * 0.24);
      twig.rotation.set(Math.sin(ang) * 0.4, ang, Math.PI / 2 + 0.25);
      nestGroup.add(twig);
    }

    // Small sculpted sparrow resting inside the nest near the altar
    const sparrowBody = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), clayMat);
    sparrowBody.scale.set(1.25, 0.88, 0.92);
    sparrowBody.position.set(0, 0.06, 0.04);
    nestGroup.add(sparrowBody);

    const sparrowHead = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), clayMat);
    sparrowHead.position.set(-0.10, 0.14, 0.06);
    nestGroup.add(sparrowHead);

    nestWallGroup.add(nestGroup);

    // Olive branch framing the right side of the stone wall (matching painting #12 right)
    for (let l = 0; l < 14; l++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), leafMat);
      leaf.scale.set(2.2, 0.26, 0.72);
      leaf.position.set(0.68 + (l % 2) * 0.14, 0.65 + l * 0.14, 0.58);
      leaf.rotation.z = l % 2 === 0 ? 0.52 : -0.48;
      nestWallGroup.add(leaf);
    }

    group.add(nestWallGroup);

    const altarLight = new THREE.PointLight('#ffe599', 3.0, 20);
    altarLight.position.set(-0.52, 2.05, 0.55);
    group.add(altarLight);

    return { group, altarLedgeGroup, nestWallGroup, nestGroup, flameMesh, altarLight };
  }

  // Psalm 91:1–15 (#19 "under his feathers"):
  //   - Rocky cliff-top sanctuary crag overlooking the walled city & terraced hills
  //   - Large overarching gold-tipped eagle/mother-bird wing ("He will cover you with his feathers. Under his wings you will take refuge")
  //     curving protectively over a twig nest holding three nestled chicks
  //   - Foreground draped cloth, rolled scroll of Psalm 91, and olive branch with olives (matching assets/psalms-3/web/b-015-019.jpg)
  createPsalm91ShadowOfWingsEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const rockMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8f8167',
      accentColor: '#dfd0b2',
      roughness: 0.90
    });
    const featherDarkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4f493e',
      accentColor: '#8c8068',
      roughness: 0.76
    });
    const featherGoldMat = new THREE.MeshStandardMaterial({
      color: '#deb864',
      emissive: '#8f6b1e',
      emissiveIntensity: 0.32,
      roughness: 0.38,
      metalness: 0.62
    });
    const twigMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4b35',
      accentColor: '#9e8664',
      roughness: 0.92
    });
    const chickMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e9482',
      accentColor: '#ded5c3',
      roughness: 0.86
    });
    const clothMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6d7060',
      accentColor: '#aeb39d',
      roughness: 0.86
    });
    const scrollMat = this.painterly.createPainterlyMaterial({
      baseColor: '#bda373',
      accentColor: '#e8d3a7',
      roughness: 0.80
    });

    const cragGroup = new THREE.Group();
    cragGroup.userData.keepWithGlb = true;

    // 1. Sculpted Limestone Crag Ledge (matching painting #19 lower half)
    const cragBase = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.65, 2.15, 1.12, 18, 6), 0.08, 3.0),
      rockMat
    );
    cragBase.position.y = 0.56;
    cragGroup.add(cragBase);

    // 2. Woven Twig Nest & Three Sheltered Chicks on the Crag (exact match to center of painting #19)
    const nestRing = new THREE.Mesh(
      this.displaceGeometry(new THREE.TorusGeometry(0.68, 0.18, 12, 28), 0.04, 4.5),
      twigMat
    );
    nestRing.rotation.x = Math.PI / 2;
    nestRing.position.set(0, 1.18, 0);
    cragGroup.add(nestRing);

    const chickOffsets = [
      [-0.22, 1.28, 0.14],
      [0.14, 1.32, -0.06],
      [0.32, 1.26, 0.16]
    ];
    chickOffsets.forEach(([cx, cy, cz], idx) => {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), chickMat);
      body.scale.set(1.25, 0.92, 1.0);
      body.position.set(cx, cy, cz);
      cragGroup.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), chickMat);
      head.position.set(cx - 0.14, cy + 0.12, cz + 0.04);
      cragGroup.add(head);
    });

    // 3. Overarching Gold-Edged Wing Canopy curving over the Nest ("He will cover you with his feathers", painting #19)
    const wingCanopy = new THREE.Group();
    wingCanopy.position.set(0, 1.32, -0.12);

    const mainWingShell = new THREE.Mesh(
      this.displaceGeometry(
        new THREE.SphereGeometry(1.12, 24, 16, 0, Math.PI * 1.15, 0, Math.PI * 0.58),
        0.03,
        4.0
      ),
      featherDarkMat
    );
    mainWingShell.rotation.x = -0.25;
    mainWingShell.scale.set(1.32, 0.95, 1.08);
    wingCanopy.add(mainWingShell);

    // Layered gold-tipped flight feathers cascading down the arch
    for (let f = 0; f < 14; f++) {
      const ang = -0.85 + (f / 13) * 1.85;
      const feather = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.78, 8), f % 2 === 0 ? featherGoldMat : featherDarkMat);
      feather.scale.set(1.0, 1.0, 0.25);
      feather.position.set(Math.sin(ang) * 0.96, 0.38 - Math.abs(ang) * 0.28, Math.cos(ang) * 0.55);
      feather.rotation.z = -ang * 0.75;
      feather.rotation.x = 0.35;
      wingCanopy.add(feather);
    }

    cragGroup.add(wingCanopy);

    // 4. Foreground Draped Cloth & Rolled Scroll of Psalm 91 on the lower-left rock (matching painting #19 bottom left)
    const clothDrape = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.35, 0.14, 0.85, 6, 2, 6), 0.03, 3.8),
      clothMat
    );
    clothDrape.position.set(-0.48, 0.98, 0.86);
    clothDrape.rotation.z = -0.18;
    cragGroup.add(clothDrape);

    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.86, 16), scrollMat);
    scroll.rotation.z = Math.PI / 2 - 0.22;
    scroll.rotation.y = -0.52;
    scroll.position.set(-0.62, 1.08, 0.92);
    cragGroup.add(scroll);

    group.add(cragGroup);

    const wingLight = new THREE.PointLight('#ffe396', 3.2, 22);
    wingLight.position.set(0, 2.45, 0.45);
    group.add(wingLight);

    return { group, cragGroup, wingCanopy, wingLight };
  }

  // Psalm 103:1–14 (#31 "east from west"):
  //   - Two stone rooftop/hillside terraces overlooking a vast sunlit plain stretching from east to west
  //   - Left stone parapet wall under an olive tree with two clay jars, a shallow clay bowl, and a striped woven prayer shawl
  //   - Right stone threshing/rooftop platform with golden grain, woven winnowing basket, blue-slate garment, and wooden shade arbor
  // (matching assets/psalms-3/web/b-015-031.jpg)
  createPsalm103EastFromWestTerraceEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#877a63',
      accentColor: '#dfd1b4',
      roughness: 0.88
    });
    const shawlMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b5a282',
      accentColor: '#ede0c7',
      roughness: 0.84
    });
    const grainMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c9a959',
      accentColor: '#f5dc93',
      roughness: 0.82
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d684f',
      accentColor: '#bfa685',
      roughness: 0.84
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#59452f',
      accentColor: '#967856',
      roughness: 0.85
    });

    // 1. Left Stone Parapet Wall with Olive Tree, Striped Shawl, Clay Bowl & Two Jars (matching painting #31 lower left)
    const leftParapet = new THREE.Group();
    leftParapet.position.set(-1.35, 0.0, 0.35);
    leftParapet.userData.keepWithGlb = true;

    const wallBlock = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.85, 0.88, 1.15, 6, 4, 4), 0.03, 3.2),
      stoneMat
    );
    wallBlock.position.y = 0.44;
    leftParapet.add(wallBlock);

    const shawl = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.82, 0.08), shawlMat);
    shawl.position.set(0.32, 0.48, 0.58);
    shawl.rotation.x = -0.14;
    leftParapet.add(shawl);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.12, 18), clayMat);
    bowl.position.set(0.18, 0.94, 0.18);
    leftParapet.add(bowl);

    for (let j = 0; j < 2; j++) {
      const jar = new THREE.Mesh(new THREE.SphereGeometry(0.18 - j * 0.03, 14, 12), clayMat);
      jar.scale.set(1.0, 1.22, 1.0);
      jar.position.set(-0.48 + j * 0.34, 1.02, 0.22);
      leftParapet.add(jar);
    }

    const oliveTree = this.createGreatPainterlyTree(propTex, pal, 0.95);
    oliveTree.position.set(-0.65, 0.85, -0.25);
    leftParapet.add(oliveTree);

    group.add(leftParapet);

    // 2. Right Stone Terrace Platform with Golden Grain Carpet, Woven Basket & Wooden Shade Arbor (matching painting #31 lower right)
    const rightTerrace = new THREE.Group();
    rightTerrace.position.set(1.25, 0.0, -0.15);
    rightTerrace.userData.keepWithGlb = true;

    const platform = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.35, 0.72, 1.95, 8, 3, 8), 0.025, 3.0),
      stoneMat
    );
    platform.position.y = 0.36;
    rightTerrace.add(platform);

    const grainCarpet = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.04, 1.25), grainMat);
    grainCarpet.position.set(0.05, 0.74, 0.05);
    rightTerrace.add(grainCarpet);

    const winnowBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.20, 0.12, 16), clayMat);
    winnowBasket.position.set(-0.52, 0.79, 0.18);
    rightTerrace.add(winnowBasket);

    for (const [px, pz] of [[0.45, -0.65], [1.05, -0.65], [0.85, 0.45]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.85, 8), woodMat);
      pole.position.set(px, 1.62, pz);
      rightTerrace.add(pole);
    }

    const shadeCloth = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 1.18), shawlMat);
    shadeCloth.position.set(0.78, 2.48, -0.10);
    shadeCloth.rotation.z = -0.12;
    rightTerrace.add(shadeCloth);

    group.add(rightTerrace);

    const horizonLight = new THREE.PointLight('#ffe08c', 3.4, 26);
    horizonLight.position.set(0.0, 2.8, -1.2);
    group.add(horizonLight);

    return { group, leftParapet, rightTerrace, horizonLight };
  }

  // Psalm 106:1–48 (#34 "amen" & District XV Finale Plaza):
  //   - Circular stone pedestal on the temple court steps holding a large curved ram's horn Shofar
  //     with an engraved silver-gold mouthpiece collar ("Let all the people say, 'Amen.' Praise Yah!")
  //   - Right stone altar block draped with a fringed tallit/prayer cloth and a carved stone offering bowl
  //   - When isFinalePlaza = true, pairs with the signature Sparrow's Nest by the Altar (Psalm 84:3)
  // (matching assets/psalms-3/web/b-015-034.jpg)
  createPsalm106AmenShofarAltarEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7e65',
      accentColor: '#e3d4b6',
      roughness: 0.88
    });
    const hornMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e5a3e',
      accentColor: '#bfa47a',
      roughness: 0.72
    });
    const collarMat = new THREE.MeshStandardMaterial({
      color: '#c9b077',
      roughness: 0.35,
      metalness: 0.78
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d6c8ad',
      accentColor: '#f5ecda',
      roughness: 0.82
    });

    // 1. Foreground Circular Stone Pedestal & Curved Ram's Horn Shofar (exact match to painting #34 foreground)
    const shofarGroup = new THREE.Group();
    shofarGroup.position.set(isFinalePlaza ? -0.85 : 0.0, 0.02, 0.35);
    shofarGroup.userData.keepWithGlb = true;

    const roundSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.18, 1.24, 0.24, 28), 0.02, 3.2),
      stoneMat
    );
    roundSlab.position.y = 0.12;
    shofarGroup.add(roundSlab);

    // Sculpted curved Shofar horn resting on the circular stone slab
    const hornCurve = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.11, 14, 28, Math.PI * 0.72),
      hornMat
    );
    hornCurve.rotation.z = Math.PI * 0.82;
    hornCurve.position.set(0.05, 0.68, 0.08);
    shofarGroup.add(hornCurve);

    const mouthpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.068, 0.38, 14), collarMat);
    mouthpiece.rotation.z = Math.PI / 2 - 0.22;
    mouthpiece.position.set(-0.56, 0.38, 0.08);
    shofarGroup.add(mouthpiece);

    group.add(shofarGroup);

    // 2. Right Stone Altar Block with Draped Fringed Prayer Cloth & Stone Bowl (exact match to painting #34 right)
    const altarBlockGroup = new THREE.Group();
    altarBlockGroup.position.set(isFinalePlaza ? 0.55 : 0.95, 0.02, -0.45);
    altarBlockGroup.userData.keepWithGlb = true;

    const altarBlock = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.65, 1.48, 1.18, 6, 6, 6), 0.025, 3.0),
      stoneMat
    );
    altarBlock.position.y = 0.74;
    altarBlockGroup.add(altarBlock);

    const altarCap = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.82, 0.22, 1.32, 6, 2, 6), 0.02, 3.2),
      stoneMat
    );
    altarCap.position.y = 1.56;
    altarBlockGroup.add(altarCap);

    const drapedTallit = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.68, 1.18, 0.12, 6, 8, 2), 0.02, 4.0),
      linenMat
    );
    drapedTallit.position.set(0.18, 1.08, 0.62);
    drapedTallit.rotation.z = -0.08;
    altarBlockGroup.add(drapedTallit);

    const stoneBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.14, 18), stoneMat);
    stoneBowl.position.set(-0.38, 1.74, 0.12);
    altarBlockGroup.add(stoneBowl);

    group.add(altarBlockGroup);

    // 3. When isFinalePlaza = true, pair with the signature Sparrow's Nest by the Altar (Psalm 84:3)
    if (isFinalePlaza) {
      const sparrowAltar = this.createPsalm84SparrowNestAltarEnsemble(propTex, pal);
      if (sparrowAltar.altarLight) sparrowAltar.group.remove(sparrowAltar.altarLight);
      sparrowAltar.group.scale.setScalar(0.88);
      sparrowAltar.group.position.set(1.75, 0, -1.35);
      group.add(sparrowAltar.group);
    }

    return group;
  }

  // =========================================================================
  // DISTRICT XVI (EVERYTHING THAT HAS BREATH — PSALMS 107–150) BESPOKE PROPS
  // Crafted directly from Timothy's paintings for Book 16 (Psalms Book Five):
  //   - #1 "say so" (Psalm 107:23–30, b-016-001.jpg): Sunlit stone harbor terrace
  //     with wooden sailing ship & square sail gliding into the calm Desired Haven,
  //     striped cloth on a low stone bench, basket of olives, clay amphorae, and
  //     circular grain sieve tray on a stone pedestal.
  //   - #13 "come find me" (Psalm 119:105–176, b-016-013.jpg): Nocturnal stone-walled
  //     hillside path with a glowing terracotta oil lamp on a flat stone ("a lamp
  //     to my feet") and a lone white-fleeced sheep looking back up the path.
  //   - #20 "sow in tears" (Psalm 126:1–6, b-016-020.jpg): Dark rain-furrowed
  //     plowed earth on the left with a sower's seed bag & scattered grain seeds,
  //     and 6 bound golden wheat sheaves standing in the sunlight on the right.
  //   - #44 "if you're breathing" (Psalm 150:1–6, b-016-044.jpg) & #43 "needs your
  //     feet" (Psalm 149:3–4, b-016-043.jpg): Sunlit stone rooftop & circular praise
  //     courtyard dressed with the instruments of Psalm 149–150 — carved 10-string
  //     harp/lyre, brass-jingle tambourine/timbrel, curved trumpet/horn, clashing
  //     bronze cymbals, scattered white & rose praise petals, and woven baskets.
  // =========================================================================

  // Painting #1: "say so" (Psalm 107:23–30) — Desired Haven Ship & Harbor Terrace
  createPsalm107HavenShipTerraceEnsemble(propTex, pal, includeShip = true) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xa89272,
      map: propTex || null,
      roughness: 0.88
    });
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a20,
      map: propTex || null,
      roughness: 0.85
    });
    const sailMat = new THREE.MeshStandardMaterial({
      color: 0xf4ead2,
      map: propTex || null,
      roughness: 0.78,
      emissive: 0xffe098,
      emissiveIntensity: 0.16,
      side: THREE.DoubleSide
    });
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0x9c6238,
      map: propTex || null,
      roughness: 0.84
    });
    const clothMat = new THREE.MeshStandardMaterial({
      color: 0xd8c49e,
      map: propTex || null,
      roughness: 0.82
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d5e,
      roughness: 0.82
    });

    // 1. Left Harbor Terrace Wall, Low Bench, Striped Cloth, Basket of Olives & Amphorae
    const leftTerrace = new THREE.Group();
    leftTerrace.position.set(-1.35, 0.02, 0.25);
    leftTerrace.userData.keepWithGlb = true;

    const benchSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.75, 0.56, 0.88, 6, 3, 4), 0.022, 3.2),
      stoneMat
    );
    benchSlab.position.y = 0.28;
    leftTerrace.add(benchSlab);

    const stripedCloth = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.96, 0.06, 0.78, 5, 2, 4), 0.012, 4.0),
      clothMat
    );
    stripedCloth.position.set(-0.22, 0.58, 0.04);
    leftTerrace.add(stripedCloth);

    for (const sx of [-0.46, 0.02]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.065, 0.79), stripeMat);
      stripe.position.set(sx, 0.582, 0.04);
      leftTerrace.add(stripe);
    }

    const oliveBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.20, 0.26, 16), clayMat);
    oliveBasket.position.set(0.42, 0.68, 0.02);
    leftTerrace.add(oliveBasket);

    const amphora = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.68, 16), clayMat);
    amphora.position.set(-0.98, 0.34, 0.35);
    amphora.rotation.z = 0.14;
    leftTerrace.add(amphora);

    group.add(leftTerrace);

    // 2. Right Stone Block & Circular Winnowing Sieve Tray (exact match to painting #1 lower right)
    const rightBlockGroup = new THREE.Group();
    rightBlockGroup.position.set(1.42, 0.02, 0.35);
    rightBlockGroup.userData.keepWithGlb = true;

    const stonePedestal = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.18, 0.64, 0.96, 5, 3, 5), 0.022, 3.0),
      stoneMat
    );
    stonePedestal.position.y = 0.32;
    rightBlockGroup.add(stonePedestal);

    const sieveTray = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.42, 0.10, 22), clayMat);
    sieveTray.position.set(0, 0.69, 0.02);
    rightBlockGroup.add(sieveTray);

    group.add(rightBlockGroup);

    // 3. Wooden Sailing Ship with Mast & Square Sail in the Calm Harbor (exact match to painting #1 center-left bay)
    if (includeShip) {
      const shipGroup = new THREE.Group();
      shipGroup.position.set(-0.45, 0.08, -2.65);
      shipGroup.rotation.y = 0.28;
      shipGroup.userData.keepWithGlb = true;

      const hull = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(2.35, 0.52, 0.78, 8, 3, 4), 0.025, 2.8),
        hullMat
      );
      hull.position.y = 0.26;
      shipGroup.add(hull);

      const prow = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.78, 8), hullMat);
      prow.rotation.z = -Math.PI / 2 + 0.25;
      prow.position.set(1.38, 0.38, 0);
      shipGroup.add(prow);

      const stern = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.68, 8), hullMat);
      stern.rotation.z = Math.PI / 2 - 0.25;
      stern.position.set(-1.32, 0.38, 0);
      shipGroup.add(stern);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 2.65, 12), hullMat);
      mast.position.set(0.05, 1.52, 0);
      shipGroup.add(mast);

      const yardarm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.85, 10), hullMat);
      yardarm.rotation.x = Math.PI / 2;
      yardarm.position.set(0.05, 2.38, 0);
      shipGroup.add(yardarm);

      const squareSail = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.14, 1.48, 1.68, 3, 6, 8), 0.035, 2.5),
        sailMat
      );
      squareSail.position.set(0.16, 1.62, 0);
      shipGroup.add(squareSail);

      group.add(shipGroup);
    }

    return group;
  }

  // Painting #13: "come find me" (Psalm 119:105–176) — Terracotta Lamp to My Feet & Lost Sheep on the Path
  createPsalm119LampAndLostSheepEnsemble(propTex, pal) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x6e5e4c,
      map: propTex || null,
      roughness: 0.90
    });
    const lampClayMat = new THREE.MeshStandardMaterial({
      color: 0xb86832,
      map: propTex || null,
      roughness: 0.78,
      emissive: 0x4a2008,
      emissiveIntensity: 0.24
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xfff2b2,
      emissive: 0xffaa28,
      emissiveIntensity: 1.75,
      roughness: 0.18
    });
    const fleeceMat = new THREE.MeshStandardMaterial({
      color: 0xf4eee0,
      map: propTex || null,
      roughness: 0.85,
      emissive: 0xffe2a0,
      emissiveIntensity: 0.15
    });
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x3e3228,
      roughness: 0.88
    });

    // 1. Right Foreground Flat Path Stone & Glowing Terracotta Oil Lamp ("Your word is a lamp to my feet")
    const lampStoneGroup = new THREE.Group();
    lampStoneGroup.position.set(0.88, 0.02, 0.55);
    lampStoneGroup.userData.keepWithGlb = true;

    const flatStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.72, 0.84, 0.34, 16, 2), 0.028, 3.2),
      stoneMat
    );
    flatStone.position.y = 0.17;
    lampStoneGroup.add(flatStone);

    const lampBowl = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.26, 0.18, 0.16, 18), 0.012, 4.0),
      lampClayMat
    );
    lampBowl.position.set(-0.06, 0.42, 0.04);
    lampStoneGroup.add(lampBowl);

    const lampNozzle = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.24, 12), lampClayMat);
    lampNozzle.rotation.z = Math.PI / 2 - 0.18;
    lampNozzle.position.set(-0.26, 0.44, 0.04);
    lampStoneGroup.add(lampNozzle);

    const lampHandle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.024, 10, 16), lampClayMat);
    lampHandle.position.set(0.18, 0.46, 0.04);
    lampStoneGroup.add(lampHandle);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.28, 12), flameMat);
    flame.position.set(-0.34, 0.60, 0.04);
    lampStoneGroup.add(flame);

    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffbe44,
      transparent: true,
      opacity: 0.30,
      depthWrite: false
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), haloMat);
    halo.position.set(-0.34, 0.58, 0.04);
    lampStoneGroup.add(halo);

    group.add(lampStoneGroup);

    // 2. Left Dry-Stone Hillside Wall Along the Path (exact match to painting #13 left wall)
    const wallGroup = new THREE.Group();
    wallGroup.position.set(-1.45, 0.02, -0.35);
    wallGroup.rotation.y = 0.26;
    wallGroup.userData.keepWithGlb = true;

    const wallMesh = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.62, 0.92, 2.85, 4, 4, 8), 0.038, 3.0),
      stoneMat
    );
    wallMesh.position.y = 0.46;
    wallGroup.add(wallMesh);
    group.add(wallGroup);

    // 3. Lone White-Fleeced Sheep Standing Further Up the Path Looking Back ("I have gone astray like a lost sheep")
    const sheepGroup = new THREE.Group();
    sheepGroup.position.set(-0.18, 0.02, -1.35);
    sheepGroup.rotation.y = 0.42;
    sheepGroup.userData.keepWithGlb = true;

    const body = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.42, 16, 12), 0.025, 4.2),
      fleeceMat
    );
    body.scale.set(1.38, 0.92, 0.88);
    body.position.set(0, 0.62, 0);
    sheepGroup.add(body);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.36, 12), fleeceMat);
    neck.position.set(0.42, 0.82, 0.08);
    neck.rotation.z = -0.35;
    sheepGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), legMat);
    head.scale.set(1.25, 0.88, 0.82);
    head.position.set(0.54, 0.98, 0.16);
    head.rotation.y = 0.48; // looking back toward the lamp & pilgrim
    sheepGroup.add(head);

    const woolCrown = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), fleeceMat);
    woolCrown.position.set(0.48, 1.08, 0.14);
    sheepGroup.add(woolCrown);

    for (const [lx, lz] of [[-0.32, -0.18], [-0.32, 0.18], [0.30, -0.18], [0.30, 0.18]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.038, 0.56, 10), legMat);
      leg.position.set(lx, 0.28, lz);
      sheepGroup.add(leg);
    }

    group.add(sheepGroup);

    const lampLight = new THREE.PointLight(0xffb438, 1.35, 9.5);
    lampLight.position.set(0.54, 0.72, 0.58);
    group.add(lampLight);

    return { group, lampLight, flame };
  }

  // Painting #20: "sow in tears" (Psalm 126:1–6) — Furrowed Seed Earth & Six Bound Golden Wheat Sheaves
  createPsalm126SowInTearsSheavesEnsemble(propTex, pal) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const furrowMat = new THREE.MeshStandardMaterial({
      color: 0x3e2d1e,
      map: propTex || null,
      roughness: 0.94
    });
    const sackMat = new THREE.MeshStandardMaterial({
      color: 0xc8b08a,
      map: propTex || null,
      roughness: 0.84
    });
    const sheafMat = new THREE.MeshStandardMaterial({
      color: 0xe8b844,
      map: propTex || null,
      roughness: 0.72,
      emissive: 0xd8961e,
      emissiveIntensity: 0.24
    });
    const cordMat = new THREE.MeshStandardMaterial({
      color: 0x7c4e20,
      roughness: 0.80
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x8c7a62,
      map: propTex || null,
      roughness: 0.90
    });

    // 1. Left Rain-Furrowed Plowed Earth with Sower's Seed Bag & Golden Seeds (exact match to painting #20 left)
    const furrowGroup = new THREE.Group();
    furrowGroup.position.set(-1.35, 0.02, 0.15);
    furrowGroup.userData.keepWithGlb = true;

    for (let i = 0; i < 4; i++) {
      const ridge = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.36, 0.22, 2.35, 3, 2, 8), 0.025, 3.5),
        furrowMat
      );
      ridge.position.set(-0.54 + i * 0.38, 0.11, 0);
      furrowGroup.add(ridge);
    }

    const seedBag = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.32, 14, 12), 0.025, 4.0),
      sackMat
    );
    seedBag.scale.set(1.12, 0.85, 0.95);
    seedBag.position.set(0.18, 0.34, 0.45);
    furrowGroup.add(seedBag);

    // Scattered golden seeds along the furrows
    for (let s = 0; s < 14; s++) {
      const seed = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), sheafMat);
      seed.position.set(-0.45 + (s % 4) * 0.28, 0.23, -0.75 + Math.floor(s / 4) * 0.42);
      furrowGroup.add(seed);
    }

    group.add(furrowGroup);

    // 2. Right Sunlit Harvest Field with 6 Bound Golden Grain Sheaves & Stone Cairn (exact match to painting #20 right)
    const harvestGroup = new THREE.Group();
    harvestGroup.position.set(1.25, 0.02, -0.15);
    harvestGroup.userData.keepWithGlb = true;

    const sheafPositions = [
      [0.0, 0.35, 1.08, 0.04],
      [-0.56, 0.12, 0.96, -0.08],
      [0.58, 0.08, 1.02, 0.09],
      [-0.28, -0.52, 1.12, -0.05],
      [0.34, -0.56, 1.05, 0.06],
      [0.04, -1.08, 0.98, -0.03]
    ];

    for (const [sx, sz, sc, tilt] of sheafPositions) {
      const sheaf = new THREE.Group();
      sheaf.position.set(sx, 0, sz);
      sheaf.scale.setScalar(sc);
      sheaf.rotation.z = tilt;
      sheaf.userData.keepWithGlb = true;

      const lowerStalks = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.18, 0.32, 0.68, 14, 3), 0.022, 4.2),
        sheafMat
      );
      lowerStalks.position.y = 0.34;
      sheaf.add(lowerStalks);

      const upperHeads = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.34, 0.18, 0.72, 14, 3), 0.028, 4.2),
        sheafMat
      );
      upperHeads.position.y = 0.98;
      sheaf.add(upperHeads);

      const tieCord = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.032, 10, 18), cordMat);
      tieCord.rotation.x = Math.PI / 2;
      tieCord.position.y = 0.66;
      sheaf.add(tieCord);

      harvestGroup.add(sheaf);
    }

    // Dry-stone cairn wall & olive branch on the far right (matching painting #20 lower right)
    const cairn = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.82, 0.68, 0.74, 5, 4, 4), 0.035, 3.2),
      stoneMat
    );
    cairn.position.set(0.95, 0.34, 0.48);
    harvestGroup.add(cairn);

    group.add(harvestGroup);
    return group;
  }

  // Painting #44: "if you're breathing" (Psalm 150:1–6) & #43: "needs your feet" (Psalm 149:3–4)
  // Signature Symbolic Element of District XVI — The Symphony of Praise (10-String Harp, Timbrel, Trumpet & Cymbals)
  createPsalm150EverythingThatHasBreathEnsemble(propTex, pal, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xd4be98,
      map: propTex || null,
      roughness: 0.85
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6e3e1c,
      map: propTex || null,
      roughness: 0.72,
      emissive: 0x3a1c08,
      emissiveIntensity: 0.14
    });
    const goldBronzeMat = new THREE.MeshStandardMaterial({
      color: 0xe8b43c,
      roughness: 0.28,
      metalness: 0.68,
      emissive: 0xd4921c,
      emissiveIntensity: 0.32
    });
    const drumheadMat = new THREE.MeshStandardMaterial({
      color: 0xf4ead2,
      map: propTex || null,
      roughness: 0.74
    });
    const stringMat = new THREE.MeshStandardMaterial({
      color: 0xfff0b8,
      emissive: 0xffd264,
      emissiveIntensity: 0.45,
      roughness: 0.30
    });
    const petalRoseMat = new THREE.MeshStandardMaterial({
      color: 0xd85868,
      roughness: 0.75,
      emissive: 0x6a1c28,
      emissiveIntensity: 0.20
    });
    const petalWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xfaf4e8,
      roughness: 0.75,
      emissive: 0xffe8b0,
      emissiveIntensity: 0.18
    });

    // 1. Circular Sunlit Praise Terrace Dais with Scattered White & Rose Petals (matching #43 & #44)
    const daisRadius = isFinalePlaza ? 2.45 : 2.05;
    const dais = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(daisRadius, daisRadius + 0.22, 0.28, 28, 2), 0.018, 3.0),
      stoneMat
    );
    dais.position.y = 0.14;
    group.add(dais);

    for (let p = 0; p < 22; p++) {
      const angle = (p / 22) * Math.PI * 2 + (p % 3) * 0.18;
      const rad = 0.45 + (p % 5) * 0.32;
      const petal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.015, 8),
        p % 2 === 0 ? petalRoseMat : petalWhiteMat
      );
      petal.position.set(Math.cos(angle) * rad, 0.29, Math.sin(angle) * rad);
      group.add(petal);
    }

    // 2. Left Stone Bench with Carved 10-String Kinnor Harp/Lyre & Timbrel/Tambourine (exact match to #44 foreground)
    const harpBenchGroup = new THREE.Group();
    harpBenchGroup.position.set(isFinalePlaza ? -0.95 : -1.12, 0.28, 0.18);
    harpBenchGroup.rotation.y = 0.24;
    harpBenchGroup.userData.keepWithGlb = true;

    const stoneBench = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.48, 0.56, 0.78, 6, 3, 4), 0.02, 3.2),
      stoneMat
    );
    stoneBench.position.y = 0.28;
    harpBenchGroup.add(stoneBench);

    // Carved wooden 10-string harp (Kinnor) resting on the bench
    const harpGroup = new THREE.Group();
    harpGroup.position.set(-0.22, 0.56, 0);
    harpGroup.rotation.z = -0.14;
    harpGroup.userData.keepWithGlb = true;

    const soundbox = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.58, 0.32, 0.22, 4, 3, 3), 0.012, 4.0),
      woodMat
    );
    soundbox.position.y = 0.16;
    harpGroup.add(soundbox);

    for (const [ax, rotZ] of [[-0.26, 0.16], [0.26, -0.16]]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.042, 0.88, 12), woodMat);
      arm.position.set(ax, 0.68, 0);
      arm.rotation.z = rotZ;
      harpGroup.add(arm);
    }

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.78, 12), goldBronzeMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 1.08, 0);
    harpGroup.add(crossbar);

    for (let s = 0; s < 10; s++) {
      const sx = -0.22 + (s / 9) * 0.44;
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.78, 6), stringMat);
      str.position.set(sx, 0.68, 0);
      harpGroup.add(str);
    }

    harpBenchGroup.add(harpGroup);

    // Tambourine / Timbrel with brass jingles resting beside the harp ("Praise him with tambourine and dancing!")
    const timbrelGroup = new THREE.Group();
    timbrelGroup.position.set(0.42, 0.68, 0.12);
    timbrelGroup.rotation.set(0.45, 0.22, -0.35);
    timbrelGroup.userData.keepWithGlb = true;

    const drumRim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.045, 12, 24), woodMat);
    timbrelGroup.add(drumRim);

    const drumSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.02, 22), drumheadMat);
    drumSkin.rotation.x = Math.PI / 2;
    timbrelGroup.add(drumSkin);

    for (let j = 0; j < 6; j++) {
      const ja = (j / 6) * Math.PI * 2;
      const jingle = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.018, 12), goldBronzeMat);
      jingle.position.set(Math.cos(ja) * 0.26, Math.sin(ja) * 0.26, 0.035);
      timbrelGroup.add(jingle);
    }

    harpBenchGroup.add(timbrelGroup);
    group.add(harpBenchGroup);

    // 3. Right Stone Pedestal with Bronze Cymbals & Curved Praise Trumpet/Horn ("Praise him with the sounding of the trumpet… Praise him with loud cymbals!")
    const rightPraiseGroup = new THREE.Group();
    rightPraiseGroup.position.set(isFinalePlaza ? 0.98 : 1.15, 0.28, -0.12);
    rightPraiseGroup.rotation.y = -0.24;
    rightPraiseGroup.userData.keepWithGlb = true;

    const rightPedestal = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.56, 0.64, 0.62, 18, 2), 0.02, 3.2),
      stoneMat
    );
    rightPedestal.position.y = 0.31;
    rightPraiseGroup.add(rightPedestal);

    // Pair of Clashing Bronze Cymbals
    for (const [cx, cy, cz, rx, rz] of [[-0.18, 0.72, 0.08, 0.35, 0.28], [0.16, 0.76, -0.06, -0.32, -0.24]]) {
      const cymbal = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.08, 22), goldBronzeMat);
      cymbal.position.set(cx, cy, cz);
      cymbal.rotation.set(rx, 0, rz);
      rightPraiseGroup.add(cymbal);
    }

    // Curved Praise Trumpet / Shofar Horn
    const trumpetCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.38, 0.66, -0.22),
      new THREE.Vector3(0.02, 0.74, -0.18),
      new THREE.Vector3(0.36, 0.96, -0.08),
      new THREE.Vector3(0.54, 1.24, 0.04)
    ]);
    const trumpetTube = new THREE.Mesh(
      new THREE.TubeGeometry(trumpetCurve, 20, 0.048, 12, false),
      goldBronzeMat
    );
    rightPraiseGroup.add(trumpetTube);

    const trumpetBell = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 16, 1, true), goldBronzeMat);
    trumpetBell.position.set(0.56, 1.28, 0.05);
    trumpetBell.rotation.z = 2.45;
    rightPraiseGroup.add(trumpetBell);

    group.add(rightPraiseGroup);

    const praiseLight = new THREE.PointLight(0xffd268, 1.25, 11.0);
    praiseLight.position.set(0, 1.65, 0.25);
    group.add(praiseLight);

    return { group, praiseLight, harpGroup, timbrelGroup };
  }
}

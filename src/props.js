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
    group.userData.artMesh = artMesh;
    group.userData.artMat = artMat;

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

  // =========================================================================
  // DISTRICT XXIV (GREATLY BELOVED — DANIEL) BESPOKE PROPS
  // Crafted directly from Timothy's paintings for Book 24 (Daniel):
  //   - #4 "ten days" (Daniel 1:12–15, b-024-004.jpg): Weathered wooden table
  //     beside a blue-glazed Babylonian brick wall & sandstone column; wide
  //     terracotta bowl filled with green lentils/pulse, cucumber slices & fresh
  //     herbs on the left; tall handled water pitcher, fringed linen cloth &
  //     rolled Hebrew scroll on the right.
  //   - #14 "a fourth in the fire" (Daniel 3:24–25, b-024-014.jpg): Babylonian
  //     lapis-brick Fiery Furnace with 4 figures walking unbound in the golden
  //     fire + foreground courtyard jars, woven basket & rolled scrolls.
  //   - #24 "windows open toward Jerusalem" (Daniel 6:10, b-024-024.jpg):
  //     Upstairs chamber with blue-glazed tile dado, wide open window framed by
  //     carved wooden mashrabiya lattice shutters looking toward Jerusalem,
  //     woven reed prayer mat on the floor, low wooden scroll table on the left,
  //     and large woven basket with clay jars & prayer shawl on the right.
  //   - #26 "the lions' den" (Daniel 6:21–23, b-024-026.jpg): Stone cavern of
  //     the Lions' Den with resting golden-maned lions, rolled seal stone,
  //     overhead sunbeam shaft, and right stone ledge with jars & scroll.
  //   - #40 "go your way" (Daniel 12:8–13, b-024-040.jpg): Flat-topped river
  //     boulder beside the Ulai/Tigris river road holding the Sealed Scroll of
  //     the End of Days bound with a golden cord & wax seal.
  // =========================================================================

  // Painting #4: "ten days" (Daniel 1:12–15) — Table of Pulse/Vegetables, Water Pitcher & Scroll
  createDaniel1PulseTableEnsemble(propTex, pal) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x624830,
      map: propTex || null,
      roughness: 0.88
    });
    const lapisWallMat = new THREE.MeshStandardMaterial({
      color: 0x3b5268,
      map: propTex || null,
      roughness: 0.80
    });
    const stoneColMat = new THREE.MeshStandardMaterial({
      color: 0xc8b28c,
      map: propTex || null,
      roughness: 0.84
    });
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0xb8966e,
      map: propTex || null,
      roughness: 0.80
    });
    const herbGreenMat = new THREE.MeshStandardMaterial({
      color: 0x486e34,
      roughness: 0.78,
      emissive: 0x1c3210,
      emissiveIntensity: 0.16
    });
    const lentilMat = new THREE.MeshStandardMaterial({
      color: 0x6e6832,
      roughness: 0.82
    });
    const linenMat = new THREE.MeshStandardMaterial({
      color: 0xe6dac0,
      map: propTex || null,
      roughness: 0.84
    });

    // 1. Left Blue-Glazed Babylonian Brick Wall & Right Sandstone Balcony Column (exact match to painting #4 backdrop)
    const wallGroup = new THREE.Group();
    wallGroup.position.set(-1.35, 0.02, -0.85);
    wallGroup.userData.keepWithGlb = true;

    const brickWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.65, 2.45, 0.36, 6, 8, 2), 0.018, 3.5),
      lapisWallMat
    );
    brickWall.position.y = 1.22;
    wallGroup.add(brickWall);

    const sandstoneTrim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 2.48, 0.40), stoneColMat);
    sandstoneTrim.position.set(0.84, 1.24, 0);
    wallGroup.add(sandstoneTrim);
    group.add(wallGroup);

    const colGroup = new THREE.Group();
    colGroup.position.set(1.45, 0.02, -0.95);
    colGroup.userData.keepWithGlb = true;
    const colBase = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.36, 0.76), stoneColMat);
    colBase.position.y = 0.18;
    colGroup.add(colBase);
    const colShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 2.35, 18), stoneColMat);
    colShaft.position.y = 1.48;
    colGroup.add(colShaft);
    group.add(colGroup);

    // 2. Foreground Weathered Wooden Table with Pulse Bowl, Water Pitcher & Hebrew Scroll (exact match to painting #4)
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0, 0.02, 0.25);
    tableGroup.userData.keepWithGlb = true;

    const tableTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.65, 0.14, 1.28, 8, 2, 5), 0.015, 3.8),
      woodMat
    );
    tableTop.position.y = 0.86;
    tableGroup.add(tableTop);

    for (const [lx, lz] of [[-1.12, -0.48], [1.12, -0.48], [-1.12, 0.48], [1.12, 0.48]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.86, 0.14), woodMat);
      leg.position.set(lx, 0.43, lz);
      tableGroup.add(leg);
    }

    // Wide Terracotta Bowl of Pulse (Lentils, Cucumbers & Fresh Herbs) on the left
    const pulseBowl = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.52, 0.32, 0.28, 24, 2), 0.012, 4.0),
      clayMat
    );
    pulseBowl.position.set(-0.52, 1.06, 0.06);
    tableGroup.add(pulseBowl);

    const lentilMound = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.44, 18, 12), 0.025, 5.0),
      lentilMat
    );
    lentilMound.scale.set(1.0, 0.32, 1.0);
    lentilMound.position.set(-0.56, 1.16, 0.08);
    tableGroup.add(lentilMound);

    for (let h = 0; h < 6; h++) {
      const herbCluster = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.16, 10, 8), 0.028, 4.5),
        herbGreenMat
      );
      herbCluster.position.set(-0.36 + (h % 3) * 0.12, 1.26 + (h % 2) * 0.06, -0.04 + Math.floor(h / 3) * 0.14);
      tableGroup.add(herbCluster);
    }

    // Tall Handled Terracotta Water Pitcher on the right
    const pitcherBody = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.28, 18, 14), 0.012, 4.0),
      clayMat
    );
    pitcherBody.scale.set(1.0, 1.28, 1.0);
    pitcherBody.position.set(0.48, 1.22, -0.08);
    tableGroup.add(pitcherBody);

    const pitcherNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.28, 18), clayMat);
    pitcherNeck.position.set(0.48, 1.56, -0.08);
    tableGroup.add(pitcherNeck);

    const pitcherHandle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.032, 10, 18, Math.PI), clayMat);
    pitcherHandle.rotation.z = -Math.PI / 2;
    pitcherHandle.position.set(0.72, 1.36, -0.08);
    tableGroup.add(pitcherHandle);

    // Fringed Linen Cloth & Rolled Hebrew Scroll on the lower right corner of the table
    const cloth = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.86, 0.03, 0.72, 5, 2, 5), 0.01, 4.2),
      linenMat
    );
    cloth.position.set(0.56, 0.94, 0.28);
    cloth.rotation.y = 0.22;
    tableGroup.add(cloth);

    const scrollRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.68, 16), linenMat);
    scrollRoll.rotation.z = Math.PI / 2;
    scrollRoll.rotation.y = 0.38;
    scrollRoll.position.set(0.64, 1.01, 0.30);
    tableGroup.add(scrollRoll);

    group.add(tableGroup);

    const pulseLight = new THREE.PointLight(0xffe098, 1.35, 10.0);
    pulseLight.position.set(0, 1.85, 0.45);
    group.add(pulseLight);

    return { group, pulseLight };
  }

  // Painting #24: "windows open toward Jerusalem" (Daniel 6:10) — Open Latticework Window, Prayer Mat & Scroll Table
  // Signature Symbolic Element of District XXIV (Daniel)
  createDaniel6OpenWindowJerusalemEnsemble(propTex, pal, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const brickMat = new THREE.MeshStandardMaterial({
      color: 0x8e795e,
      map: propTex || null,
      roughness: 0.88
    });
    const glazedTileMat = new THREE.MeshStandardMaterial({
      color: 0x2b4c62,
      map: propTex || null,
      roughness: 0.72
    });
    const latticeWoodMat = new THREE.MeshStandardMaterial({
      color: 0x5c4228,
      map: propTex || null,
      roughness: 0.82
    });
    const matStrawMat = new THREE.MeshStandardMaterial({
      color: 0xc8ad78,
      map: propTex || null,
      roughness: 0.90,
      emissive: 0x5a4218,
      emissiveIntensity: 0.18
    });
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0x9c683c,
      map: propTex || null,
      roughness: 0.82
    });
    const linenMat = new THREE.MeshStandardMaterial({
      color: 0xe8dcc2,
      map: propTex || null,
      roughness: 0.84
    });

    // 1. Upstairs Chamber Wall with Blue-Glazed Tile Dado & Wide Open Window Framed by Carved Lattice Shutters
    const windowWallGroup = new THREE.Group();
    windowWallGroup.position.set(0, 0.02, -0.95);
    windowWallGroup.userData.keepWithGlb = true;

    // Lower sill wall with blue-glazed Babylonian tile dado (exact match to painting #24)
    const lowerWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(3.85, 0.96, 0.42, 8, 3, 2), 0.018, 3.2),
      brickMat
    );
    lowerWall.position.y = 0.48;
    windowWallGroup.add(lowerWall);

    const tileDado = new THREE.Mesh(new THREE.BoxGeometry(3.88, 0.52, 0.45), glazedTileMat);
    tileDado.position.y = 0.34;
    windowWallGroup.add(tileDado);

    // Left & right window piers + upper lintel leaving the wide Jerusalem window open in the center
    for (const wx of [-1.48, 1.48]) {
      const pier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.88, 2.35, 0.42, 3, 6, 2), 0.018, 3.2),
        brickMat
      );
      pier.position.set(wx, 2.12, 0);
      windowWallGroup.add(pier);
    }

    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(3.85, 0.44, 0.44, 8, 2, 2), 0.018, 3.2),
      brickMat
    );
    lintel.position.set(0, 3.42, 0);
    windowWallGroup.add(lintel);

    // Carved Wooden Mashrabiya Lattice Shutters swung open on left and right of the window frame
    for (const [sx, rotY] of [[-0.96, 0.52], [0.96, -0.52]]) {
      const shutter = new THREE.Group();
      shutter.position.set(sx, 2.10, 0.18);
      shutter.rotation.y = rotY;
      shutter.userData.keepWithGlb = true;

      const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(0.56, 2.18, 0.06), latticeWoodMat);
      shutter.add(frameOuter);

      for (let r = -3; r <= 3; r++) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.52, 8), latticeWoodMat);
        rung.rotation.z = Math.PI / 2;
        rung.position.y = r * 0.28;
        shutter.add(rung);
      }
      windowWallGroup.add(shutter);
    }

    group.add(windowWallGroup);

    // 2. Woven Reed Prayer Mat on the Chamber Floor Bathed in Golden Light Toward Jerusalem (exact match to painting #24 center)
    const prayerMat = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.75, 0.035, 1.38, 8, 2, 6), 0.012, 4.5),
      matStrawMat
    );
    prayerMat.position.set(-0.08, 0.03, 0.32);
    prayerMat.rotation.y = -0.08;
    prayerMat.userData.keepWithGlb = true;
    group.add(prayerMat);

    // 3. Left Low Wooden Prayer Table with Rolled & Open Scrolls (exact match to painting #24 lower left)
    const leftTable = new THREE.Group();
    leftTable.position.set(-1.32, 0.02, 0.65);
    leftTable.rotation.y = 0.24;
    leftTable.userData.keepWithGlb = true;

    const tTop = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.64), latticeWoodMat);
    tTop.position.y = 0.42;
    leftTable.add(tTop);

    for (const [lx, lz] of [[-0.36, -0.24], [0.36, -0.24], [-0.36, 0.24], [0.36, 0.24]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.42, 10), latticeWoodMat);
      leg.position.set(lx, 0.21, lz);
      leftTable.add(leg);
    }

    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.54, 14), linenMat);
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = 0.35;
    scroll.position.set(0.06, 0.50, 0.04);
    leftTable.add(scroll);
    group.add(leftTable);

    // 4. Right Woven Basket with Clay Jars & Draped Prayer Shawl (exact match to painting #24 lower right)
    const rightBasketGroup = new THREE.Group();
    rightBasketGroup.position.set(1.28, 0.02, 0.42);
    rightBasketGroup.userData.keepWithGlb = true;

    const wideBasket = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.48, 0.38, 0.52, 20, 2), 0.018, 4.0),
      latticeWoodMat
    );
    wideBasket.position.y = 0.26;
    rightBasketGroup.add(wideBasket);

    const tallJar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.58, 16), clayMat);
    tallJar.position.set(-0.14, 0.62, -0.06);
    rightBasketGroup.add(tallJar);

    const drapedShawl = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.52, 0.48, 0.38, 4, 4, 4), 0.022, 3.8),
      glazedTileMat
    );
    drapedShawl.position.set(0.24, 0.28, 0.28);
    rightBasketGroup.add(drapedShawl);

    group.add(rightBasketGroup);

    const windowLight = new THREE.PointLight(0xffd878, 1.55, 12.0);
    windowLight.position.set(0, 2.05, -0.35);
    group.add(windowLight);

    return { group, windowLight, prayerMat };
  }

  // Painting #40: "go your way" (Daniel 12:8–13) — Flat River Stone & Sealed Scroll of the End of Days
  createDaniel12GoYourWayFinaleEnsemble(propTex, pal, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x8e8068,
      map: propTex || null,
      roughness: 0.88
    });
    const parchmentMat = new THREE.MeshStandardMaterial({
      color: 0xf0e2be,
      map: propTex || null,
      roughness: 0.78,
      emissive: 0xffe098,
      emissiveIntensity: 0.18
    });
    const cordMat = new THREE.MeshStandardMaterial({
      color: 0x9c6e28,
      roughness: 0.65,
      metalness: 0.35
    });
    const sealWaxMat = new THREE.MeshStandardMaterial({
      color: 0xb87828,
      roughness: 0.45,
      metalness: 0.48,
      emissive: 0x6e3e08,
      emissiveIntensity: 0.28
    });

    // 1. Flat-Topped River Boulder by the Ulai/Tigris Road with the Sealed Scroll & Wax Seal (exact match to painting #40 foreground)
    const stoneScrollGroup = new THREE.Group();
    stoneScrollGroup.position.set(isFinalePlaza ? -0.85 : 0.45, 0.02, 0.45);
    stoneScrollGroup.userData.keepWithGlb = true;

    const riverBoulder = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.92, 1.08, 0.64, 22, 3), 0.038, 3.0),
      stoneMat
    );
    riverBoulder.position.y = 0.32;
    stoneScrollGroup.add(riverBoulder);

    const sealedScroll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.095, 0.88, 20),
      parchmentMat
    );
    sealedScroll.rotation.z = Math.PI / 2;
    sealedScroll.rotation.y = -0.38;
    sealedScroll.position.set(0.04, 0.72, 0.02);
    stoneScrollGroup.add(sealedScroll);

    const tieRing = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.022, 10, 20), cordMat);
    tieRing.rotation.y = -0.38 + Math.PI / 2;
    tieRing.position.set(0.04, 0.72, 0.02);
    stoneScrollGroup.add(tieRing);

    const waxSeal = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.028, 16), sealWaxMat);
    waxSeal.rotation.x = Math.PI / 3;
    waxSeal.position.set(-0.04, 0.69, 0.12);
    stoneScrollGroup.add(waxSeal);

    group.add(stoneScrollGroup);

    // 2. When isFinalePlaza = true, pair with the Open Window Toward Jerusalem (Daniel 6:10) & the Lions' Den Landmark (Daniel 6:22)
    if (isFinalePlaza) {
      const openWin = this.createDaniel6OpenWindowJerusalemEnsemble(propTex, pal, true);
      if (openWin.windowLight) openWin.group.remove(openWin.windowLight);
      openWin.group.scale.setScalar(0.84);
      openWin.group.position.set(0.85, 0, -1.25);
      group.add(openWin.group);
    }

    return group;
  }

  // =========================================================================
  // DISTRICT XX: ARISE, SHINE (ISAIAH) BESPOKE 3D PROP ENSEMBLES
  // =========================================================================

  // Isaiah 6:1–7 (#3 "undone") — Temple Threshold Pillars, Horned Incense Altar & Live Coal in Golden Tongs
  createIsaiah6LiveCoalAltarEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#786958',
      accentColor: pal.accent || '#f0cc84',
      roughness: 0.86
    });
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xb88642,
      roughness: 0.38,
      metalness: 0.72
    });
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0xff6e1a,
      emissive: 0xff3b00,
      emissiveIntensity: 1.35,
      roughness: 0.25
    });

    for (const sx of [-1.85, 1.85]) {
      const col = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.32, 0.38, 3.6, 16, 8), 0.02, 3.2),
        stoneMat
      );
      col.position.set(sx, 1.8, -0.65);
      col.userData.keepWithGlb = true;
      group.add(col);
    }

    const altar = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.35, 1.08, 1.35, 6, 4, 6), 0.025, 3.2),
      stoneMat
    );
    altar.position.set(0, 0.54, 0);
    altar.userData.keepWithGlb = true;
    group.add(altar);

    for (const [hx, hz] of [[-0.58, -0.58], [0.58, -0.58], [-0.58, 0.58], [0.58, 0.58]]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 8), bronzeMat);
      horn.position.set(hx, 1.22, hz);
      horn.userData.keepWithGlb = true;
      group.add(horn);
    }

    for (const side of [-1, 1]) {
      const tong = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 1.15, 10), bronzeMat);
      tong.position.set(side * 0.14, 1.48, 0);
      tong.rotation.z = side * -0.22;
      tong.userData.keepWithGlb = true;
      group.add(tong);
    }

    const liveCoal = new THREE.Mesh(
      this.displaceGeometry(new THREE.DodecahedronGeometry(0.24, 1), 0.03, 4.0),
      coalMat
    );
    liveCoal.position.set(0, 1.72, 0);
    liveCoal.userData.keepWithGlb = true;
    group.add(liveCoal);

    const emberLight = new THREE.PointLight(0xff8c38, 2.6, 16);
    emberLight.position.set(0, 1.95, 0.25);
    group.add(emberLight);

    return { group, liveCoal, emberLight };
  }

  // Isaiah 11:1–9 (#9 "the wolf and the lamb") — Shoot from the Stump of Jesse & Wolf and Lamb Resting Together
  createIsaiah11WolfAndLambMeadowEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const barkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4630',
      accentColor: '#9c7d58',
      roughness: 0.9
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4c7538',
      accentColor: '#9ed468',
      roughness: 0.72
    });
    const wolfMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b6e75',
      accentColor: '#aeb3bd',
      roughness: 0.85
    });
    const lambMat = this.painterly.createPainterlyMaterial({
      baseColor: '#ede6d6',
      accentColor: '#ffffff',
      roughness: 0.88
    });

    const stump = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.56, 0.74, 0.78, 16, 4), 0.04, 3.2),
      barkMat
    );
    stump.position.set(-1.15, 0.39, -0.35);
    stump.userData.keepWithGlb = true;
    group.add(stump);

    const shootStem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 1.25, 10), leafMat);
    shootStem.position.set(-0.95, 1.18, -0.28);
    shootStem.rotation.z = -0.22;
    shootStem.userData.keepWithGlb = true;
    group.add(shootStem);

    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), leafMat);
      leaf.scale.set(1.8, 0.28, 0.85);
      leaf.position.set(-0.88 + Math.cos(i) * 0.22, 1.15 + i * 0.1, -0.28 + Math.sin(i) * 0.22);
      leaf.rotation.y = i * 0.9;
      leaf.userData.keepWithGlb = true;
      group.add(leaf);
    }

    // Sculpted resting wolf on the left-center
    const wolfBody = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.46, 14, 12), 0.03, 3.5),
      wolfMat
    );
    wolfBody.scale.set(1.45, 0.78, 0.92);
    wolfBody.position.set(0.35, 0.36, -0.15);
    wolfBody.userData.keepWithGlb = true;
    group.add(wolfBody);

    const wolfHead = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.48, 10), wolfMat);
    wolfHead.rotation.z = Math.PI / 2 - 0.25;
    wolfHead.position.set(0.88, 0.62, -0.05);
    wolfHead.userData.keepWithGlb = true;
    group.add(wolfHead);

    // Sculpted white lamb nestled peacefully beside the wolf
    const lambBody = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.34, 14, 12), 0.035, 4.0),
      lambMat
    );
    lambBody.scale.set(1.3, 0.82, 0.9);
    lambBody.position.set(0.95, 0.28, 0.48);
    lambBody.userData.keepWithGlb = true;
    group.add(lambBody);

    const lambHead = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 10), lambMat);
    lambHead.position.set(0.58, 0.44, 0.52);
    lambHead.userData.keepWithGlb = true;
    group.add(lambHead);

    const meadowLight = new THREE.PointLight(0xffe69c, 2.2, 15);
    meadowLight.position.set(0, 2.2, 0.2);
    group.add(meadowLight);

    return { group, meadowLight };
  }

  // Isaiah 40:28–31 (#19 "wings like eagles") — High Mountain Aerie Crag, Bronze-Gold Eagle Wings & Pilgrim Staff
  createIsaiah40EagleWingsCragEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const rockMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#6b5e4c',
      accentColor: pal.accent || '#f0cf88',
      roughness: 0.88
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xd9a84e,
      emissive: 0x5c3d0c,
      emissiveIntensity: 0.38,
      roughness: 0.36,
      metalness: 0.64
    });

    const summitRock = new THREE.Mesh(
      this.displaceGeometry(new THREE.DodecahedronGeometry(1.18, 1), 0.1, 2.8),
      rockMat
    );
    summitRock.scale.set(1.45, 0.92, 1.15);
    summitRock.position.set(0, 0.58, 0);
    summitRock.userData.keepWithGlb = true;
    group.add(summitRock);

    const wingsGroup = new THREE.Group();
    wingsGroup.position.set(0, 1.65, -0.15);
    wingsGroup.userData.keepWithGlb = true;
    for (const side of [-1, 1]) {
      for (let f = 0; f < 6; f++) {
        const feather = new THREE.Mesh(new THREE.BoxGeometry(0.95 - f * 0.1, 0.12, 0.22), wingMat);
        feather.position.set(side * (0.48 + f * 0.22), f * 0.14, -f * 0.04);
        feather.rotation.z = side * (0.32 + f * 0.08);
        feather.userData.keepWithGlb = true;
        wingsGroup.add(feather);
      }
    }
    group.add(wingsGroup);

    const eagleLight = new THREE.PointLight(0xffe294, 2.4, 16);
    eagleLight.position.set(0, 2.6, 0.35);
    group.add(eagleLight);

    return { group, wingsGroup, eagleLight };
  }

  // Isaiah 60:1–3 (#35 "arise, shine" & Finale Plaza) — Eastern Gate of Zion Sunrise Arch & Seven Parapet Lamps
  createIsaiah60AriseShineGateEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#8c7a62',
      accentColor: pal.accent || '#ffdf94',
      roughness: 0.84
    });
    const sunGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffd86b,
      emissive: 0xff9d1a,
      emissiveIntensity: 0.95,
      roughness: 0.22,
      metalness: 0.78
    });

    for (const sx of [-1.75, 1.75]) {
      const pier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.88, 3.4, 0.88, 4, 8, 4), 0.025, 3.2),
        stoneMat
      );
      pier.position.set(sx, 1.7, -0.4);
      pier.userData.keepWithGlb = true;
      group.add(pier);
    }

    const sunArch = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.22, 14, 36, Math.PI), sunGoldMat);
    sunArch.position.set(0, 3.2, -0.4);
    sunArch.userData.keepWithGlb = true;
    group.add(sunArch);

    for (let r = 0; r < 7; r++) {
      const ang = (r / 6) * Math.PI;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.15, 8), sunGoldMat);
      ray.position.set(Math.cos(ang) * 2.25, 3.2 + Math.sin(ang) * 2.25, -0.4);
      ray.rotation.z = ang - Math.PI / 2;
      ray.userData.keepWithGlb = true;
      group.add(ray);
    }

    const shineLight = new THREE.PointLight(0xffe28a, isFinalePlaza ? 3.2 : 2.5, 20);
    shineLight.position.set(0, 3.0, 0.5);
    group.add(shineLight);

    return { group, sunArch, shineLight };
  }

  // =========================================================================
  // DISTRICTS XXVIII–XXXI: THE FOUR GOSPELS BESPOKE 3D PROP ENSEMBLES
  // =========================================================================

  // Luke 2:7 (#5 "no room") — Bethlehem Limestone Cave-Stable Arch, Feeding Trough & Oil Lamp
  createLuke2BethlehemMangerEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#706250',
      accentColor: pal.accent || '#f0cc82',
      roughness: 0.88
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b4c30',
      accentColor: '#b5895a',
      roughness: 0.84
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#f2ead8',
      accentColor: '#ffffff',
      roughness: 0.82
    });

    const caveArch = new THREE.Mesh(
      this.displaceGeometry(new THREE.TorusGeometry(2.15, 0.46, 12, 28, Math.PI), 0.06, 2.8),
      stoneMat
    );
    caveArch.position.set(0, 1.2, -1.15);
    caveArch.userData.keepWithGlb = true;
    group.add(caveArch);

    const trough = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.28, 0.48, 0.74, 6, 3, 4), 0.02, 3.5),
      woodMat
    );
    trough.position.set(0, 0.56, 0.15);
    trough.userData.keepWithGlb = true;
    group.add(trough);

    const swaddling = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.36, 14, 10), 0.025, 4.0),
      linenMat
    );
    swaddling.scale.set(1.45, 0.45, 0.85);
    swaddling.position.set(0, 0.84, 0.15);
    swaddling.userData.keepWithGlb = true;
    group.add(swaddling);

    const mangerLight = new THREE.PointLight(0xffdf8c, 2.6, 16);
    mangerLight.position.set(0, 2.1, 0.35);
    group.add(mangerLight);

    return { group, mangerLight };
  }

  // Luke 10:33–34 (#19 "the Samaritan") — Lantern-Lit Roadside Inn Arch, Oil & Wine Flasks & Two Silver Denarii
  createLuke10GoodSamaritanInnEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#85745e',
      accentColor: pal.accent || '#f0cf8e',
      roughness: 0.86
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a66540',
      accentColor: '#de9f73',
      roughness: 0.8
    });
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xe6ecf5,
      roughness: 0.28,
      metalness: 0.85
    });

    const ledge = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.75, 0.76, 1.05, 6, 4, 4), 0.025, 3.2),
      stoneMat
    );
    ledge.position.set(0, 0.38, 0);
    ledge.userData.keepWithGlb = true;
    group.add(ledge);

    for (const [fx, fz, sc] of [[-0.45, 0.05, 1.0], [-0.12, -0.12, 0.88]]) {
      const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * sc, 0.2 * sc, 0.52 * sc, 16), clayMat);
      flask.position.set(fx, 0.76 + 0.26 * sc, fz);
      flask.userData.keepWithGlb = true;
      group.add(flask);
    }

    for (const cx of [0.32, 0.52]) {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16), silverMat);
      coin.position.set(cx, 0.78, 0.14);
      coin.userData.keepWithGlb = true;
      group.add(coin);
    }

    const innLight = new THREE.PointLight(0xffdc88, 2.4, 15);
    innLight.position.set(0, 2.0, 0.3);
    group.add(innLight);

    return { group, innLight };
  }

  // Luke 15:20–22 (#27 "while still far off") — Father's Courtyard Gate, Best Robe, Signet Ring & Sandals
  createLuke15ProdigalWelcomeEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#87765e',
      accentColor: pal.accent || '#f5d996',
      roughness: 0.86
    });
    const robeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a2e2e',
      accentColor: '#e8b668',
      roughness: 0.82
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf7ce65,
      roughness: 0.28,
      metalness: 0.82
    });

    const bench = this.createStoneBench(propTex, pal);
    bench.position.set(0, 0.06, 0);
    bench.userData.keepWithGlb = true;
    group.add(bench);

    const robe = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.78, 0.18, 0.56, 6, 2, 6), 0.02, 3.8),
      robeMat
    );
    robe.position.set(-0.28, 0.68, 0.04);
    robe.userData.keepWithGlb = true;
    group.add(robe);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.022, 10, 22), goldMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0.36, 0.66, 0.08);
    ring.userData.keepWithGlb = true;
    group.add(ring);

    const welcomeLight = new THREE.PointLight(0xffe296, 2.5, 16);
    welcomeLight.position.set(0, 2.2, 0.35);
    group.add(welcomeLight);

    return { group, welcomeLight };
  }

  // Luke 24:30–32 (#40 "burning hearts" & Finale Plaza) — Emmaus Table with Broken Bread Halves, Cup & Oil Lamp
  createLuke24EmmausTableEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#694a2e',
      accentColor: '#b38556',
      roughness: 0.84
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#f5ecda',
      accentColor: '#ffffff',
      roughness: 0.86
    });
    const breadMat = new THREE.MeshStandardMaterial({
      color: 0xd99b4e,
      emissive: 0xffb84d,
      emissiveIntensity: 0.42,
      roughness: 0.65
    });

    const tableTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.95, 0.12, 1.18, 8, 2, 6), 0.015, 4.0),
      woodMat
    );
    tableTop.position.y = 0.86;
    tableTop.userData.keepWithGlb = true;
    group.add(tableTop);

    for (const [lx, lz] of [[-0.8, -0.45], [0.8, -0.45], [-0.8, 0.45], [0.8, 0.45]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.82, 10), woodMat);
      leg.position.set(lx, 0.42, lz);
      leg.userData.keepWithGlb = true;
      group.add(leg);
    }

    const runner = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.03, 1.22), linenMat);
    runner.position.set(0, 0.93, 0);
    runner.userData.keepWithGlb = true;
    group.add(runner);

    for (const bx of [-0.22, 0.16]) {
      const halfLoaf = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.2, 14, 10), 0.02, 4.2),
        breadMat
      );
      halfLoaf.scale.set(1.15, 0.62, 0.95);
      halfLoaf.position.set(bx, 1.02, 0.06);
      halfLoaf.userData.keepWithGlb = true;
      group.add(halfLoaf);
    }

    const emmausLight = new THREE.PointLight(0xffdc84, isFinalePlaza ? 3.0 : 2.5, 16);
    emmausLight.position.set(0, 2.0, 0.25);
    group.add(emmausLight);

    return { group, emmausLight };
  }

  // Matthew 2:1–11 (#4 "the star") — Radiant Bethlehem Star & Three Open Coffers of Gold, Frankincense & Myrrh
  createMatthew2MagiStarGiftsEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#5c5248',
      accentColor: pal.accent || '#f5d488',
      roughness: 0.86
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd466,
      emissive: 0x8c5e10,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.84
    });

    const plinth = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.65, 1.85, 0.24, 24), 0.02, 3.0),
      stoneMat
    );
    plinth.position.y = 0.12;
    plinth.userData.keepWithGlb = true;
    group.add(plinth);

    for (const [cx, cz, ry] of [[-0.68, 0.22, 0.35], [0, -0.28, 0], [0.68, 0.22, -0.35]]) {
      const coffer = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.32, 0.34), goldMat);
      coffer.position.set(cx, 0.4, cz);
      coffer.rotation.y = ry;
      coffer.userData.keepWithGlb = true;
      group.add(coffer);
    }

    const starLight = new THREE.PointLight(0xffe89e, 2.8, 18);
    starLight.position.set(0, 2.6, 0);
    group.add(starLight);

    return { group, starLight };
  }

  // Matthew 5:14–16 (#13 "on a stand") — Tall Lampstand with Blazing Oil Lamp & Overturned Bushel Basket
  createMatthew5LampOnStandEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xc49248,
      roughness: 0.35,
      metalness: 0.72
    });
    const basketMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d5e3b',
      accentColor: '#c49e6c',
      roughness: 0.88
    });

    const standShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.24, 1.65, 14), bronzeMat);
    standShaft.position.set(0, 0.85, 0);
    standShaft.userData.keepWithGlb = true;
    group.add(standShaft);

    const lampBody = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), bronzeMat);
    lampBody.scale.set(1.35, 0.62, 0.95);
    lampBody.position.set(0, 1.72, 0);
    lampBody.userData.keepWithGlb = true;
    group.add(lampBody);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.32, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff0a8 })
    );
    flame.position.set(0.22, 1.92, 0);
    flame.userData.keepWithGlb = true;
    group.add(flame);

    const bushel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.48, 16), basketMat);
    bushel.position.set(-0.85, 0.28, 0.25);
    bushel.rotation.z = 1.15;
    bushel.userData.keepWithGlb = true;
    group.add(bushel);

    const lampStandLight = new THREE.PointLight(0xffe08c, 2.6, 16);
    lampStandLight.position.set(0.22, 2.05, 0);
    group.add(lampStandLight);

    return { group, flame, lampStandLight };
  }

  // Matthew 28:1–10 (#39 "just like he said" & Finale Plaza) — Garden Tomb Facade & Rolled-Away Circular Stone
  createMatthew28EmptyTombEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#8a7c66',
      accentColor: pal.accent || '#f7dfa0',
      roughness: 0.86
    });

    const tombFacade = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(3.4, 2.65, 1.45, 8, 6, 4), 0.045, 2.8),
      stoneMat
    );
    tombFacade.position.set(-0.35, 1.32, -0.65);
    tombFacade.userData.keepWithGlb = true;
    group.add(tombFacade);

    const rolledStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.98, 0.98, 0.34, 28), 0.025, 3.2),
      stoneMat
    );
    rolledStone.rotation.x = Math.PI / 2;
    rolledStone.rotation.z = -0.18;
    rolledStone.position.set(1.25, 0.98, 0.24);
    rolledStone.userData.keepWithGlb = true;
    group.add(rolledStone);

    const tombLight = new THREE.PointLight(0xffe89e, isFinalePlaza ? 3.1 : 2.6, 18);
    tombLight.position.set(-0.35, 1.65, 0.35);
    group.add(tombLight);

    return { group, rolledStone, tombLight };
  }

  // Mark 6:37–42 (#18 "green grass") — Five Barley Loaves, Two Fish & Twelve Overflowing Wicker Baskets
  createMark6GreenGrassBasketsEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const basketMat = this.painterly.createPainterlyMaterial({
      baseColor: '#82613c',
      accentColor: '#c9a16b',
      roughness: 0.86
    });
    const loafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c78c46',
      accentColor: '#f5ca86',
      roughness: 0.8
    });

    for (let i = 0; i < 12; i++) {
      const ang = (i / 11) * Math.PI * 1.15 - 0.18;
      const rad = 1.45 + (i % 2) * 0.32;
      const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.17, 0.34, 14), basketMat);
      basket.position.set(Math.cos(ang) * rad, 0.17, -Math.sin(ang) * rad + 0.35);
      basket.userData.keepWithGlb = true;
      group.add(basket);

      const topBread = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), loafMat);
      topBread.scale.set(1.1, 0.55, 1.0);
      topBread.position.set(basket.position.x, 0.35, basket.position.z);
      topBread.userData.keepWithGlb = true;
      group.add(topBread);
    }

    const basketsLight = new THREE.PointLight(0xffe296, 2.4, 16);
    basketsLight.position.set(0, 2.1, 0);
    group.add(basketsLight);

    return { group, basketsLight };
  }

  // Mark 10:46–52 (#27 "the cloak") — Jericho Roadside Stone, Cast-Off Striped Cloak & Walking Stick
  createMark10BartimaeusCloakEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#8a7962',
      accentColor: pal.accent || '#f0cf88',
      roughness: 0.88
    });
    const cloakMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a4e32',
      accentColor: '#d9a46c',
      roughness: 0.86
    });

    const roadStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.DodecahedronGeometry(0.76, 1), 0.05, 3.0),
      stoneMat
    );
    roadStone.scale.set(1.4, 0.72, 1.15);
    roadStone.position.set(-0.35, 0.38, 0);
    roadStone.userData.keepWithGlb = true;
    group.add(roadStone);

    const cloak = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.15, 0.22, 0.88, 8, 3, 6), 0.035, 3.8),
      cloakMat
    );
    cloak.position.set(0.12, 0.62, 0.14);
    cloak.rotation.z = -0.22;
    cloak.userData.keepWithGlb = true;
    group.add(cloak);

    const cloakLight = new THREE.PointLight(0xffe294, 2.4, 15);
    cloakLight.position.set(0, 2.1, 0.25);
    group.add(cloakLight);

    return { group, cloakLight };
  }

  // Mark 14:3–9 (#30 "broken open" & Finale Plaza) — Broken Alabaster Flask & Pooling Golden Nard Oil
  createMark14AlabasterJarEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#7d6e5a',
      accentColor: pal.accent || '#f2d290',
      roughness: 0.86
    });
    const alabasterMat = new THREE.MeshStandardMaterial({
      color: 0xfaf5eb,
      emissive: 0xffe8b8,
      emissiveIntensity: 0.28,
      roughness: 0.26,
      metalness: 0.08
    });
    const nardMat = new THREE.MeshStandardMaterial({
      color: 0xf5be42,
      emissive: 0xd98c14,
      emissiveIntensity: 0.62,
      roughness: 0.18,
      metalness: 0.35
    });

    const table = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.35, 1.52, 0.42, 24), 0.02, 3.2),
      stoneMat
    );
    table.position.y = 0.21;
    table.userData.keepWithGlb = true;
    group.add(table);

    const flaskBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.68, 18), alabasterMat);
    flaskBody.position.set(-0.22, 0.62, 0);
    flaskBody.rotation.z = 0.95;
    flaskBody.userData.keepWithGlb = true;
    group.add(flaskBody);

    const brokenNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.28, 14), alabasterMat);
    brokenNeck.position.set(0.34, 0.5, 0.18);
    brokenNeck.rotation.z = -1.2;
    brokenNeck.userData.keepWithGlb = true;
    group.add(brokenNeck);

    const nardPool = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.58, 0.03, 24), nardMat);
    nardPool.position.set(0.12, 0.43, 0.04);
    nardPool.userData.keepWithGlb = true;
    group.add(nardPool);

    const nardLight = new THREE.PointLight(0xffdc80, isFinalePlaza ? 2.9 : 2.5, 16);
    nardLight.position.set(0, 2.0, 0.25);
    group.add(nardLight);

    return { group, nardLight };
  }

  // John 2:1–10 (#6 "the good wine") — Six Carved Limestone Waterpots at Cana Brimming with Ruby-Gold Wine
  createJohn2CanaStoneJarsEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#9c8d74',
      accentColor: pal.accent || '#f5dfab',
      roughness: 0.84
    });
    const wineMat = new THREE.MeshStandardMaterial({
      color: 0x8c1d2e,
      emissive: 0x59101c,
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.25
    });

    for (let i = 0; i < 6; i++) {
      const ang = (i / 5) * Math.PI * 0.85 + 0.22;
      const rad = 1.38;
      const jx = Math.cos(ang) * rad;
      const jz = -Math.sin(ang) * rad + 0.35;

      const jar = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.24, 0.28, 0.82, 18, 4), 0.018, 3.5),
        stoneMat
      );
      jar.position.set(jx, 0.41, jz);
      jar.userData.keepWithGlb = true;
      group.add(jar);

      const wineTop = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.03, 16), wineMat);
      wineTop.position.set(jx, 0.82, jz);
      wineTop.userData.keepWithGlb = true;
      group.add(wineTop);
    }

    const canaLight = new THREE.PointLight(0xffdc8c, 2.5, 16);
    canaLight.position.set(0, 2.1, 0.2);
    group.add(canaLight);

    return { group, canaLight };
  }

  // John 4:13–28 (#9 "the jar left behind") — Stone-Curbed Well of Jacob & Left-Behind Terracotta Water Jar
  createJohn4JacobsWellJarEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#8c7d66',
      accentColor: pal.accent || '#f2d89c',
      roughness: 0.86
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b06b42',
      accentColor: '#e8a87c',
      roughness: 0.8
    });

    const wellCurb = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.05, 1.18, 0.78, 22, 3), 0.03, 3.0),
      stoneMat
    );
    wellCurb.position.y = 0.39;
    wellCurb.userData.keepWithGlb = true;
    group.add(wellCurb);

    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.62, 18), clayMat);
    jar.position.set(0.72, 0.96, 0.35);
    jar.rotation.z = -0.18;
    jar.userData.keepWithGlb = true;
    group.add(jar);

    const wellLight = new THREE.PointLight(0xffe296, 2.5, 16);
    wellLight.position.set(0, 2.1, 0.25);
    group.add(wellLight);

    return { group, wellLight };
  }

  // John 13:3–5 (#25 "twelve pairs") — Upper Room Foot-Washing Basin, Linen Towel & Circle of Sandals
  createJohn13UpperRoomBasinEnsemble(propTex = null, pal = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xc28e46,
      roughness: 0.34,
      metalness: 0.72
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#f5ede0',
      accentColor: '#ffffff',
      roughness: 0.84
    });
    const leatherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#69482c',
      accentColor: '#ab7e54',
      roughness: 0.86
    });

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.38, 0.24, 24), bronzeMat);
    basin.position.set(0, 0.28, 0);
    basin.userData.keepWithGlb = true;
    group.add(basin);

    const towel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.58, 0.08, 0.36, 6, 2, 4), 0.015, 4.0),
      linenMat
    );
    towel.position.set(0.56, 0.26, 0.14);
    towel.rotation.y = -0.35;
    towel.userData.keepWithGlb = true;
    group.add(towel);

    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const rad = 1.48;
      const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.32), leatherMat);
      sandal.position.set(Math.cos(ang) * rad, 0.08, Math.sin(ang) * rad);
      sandal.rotation.y = -ang + Math.PI / 2;
      sandal.userData.keepWithGlb = true;
      group.add(sandal);
    }

    const basinLight = new THREE.PointLight(0xffdc88, 2.5, 16);
    basinLight.position.set(0, 2.0, 0.2);
    group.add(basinLight);

    return { group, basinLight };
  }

  // John 21:9–12 (#39 "breakfast" & Finale Plaza) — Galilee Beach Charcoal Fire, Fish & Round Barley Loaf
  createJohn21CharcoalBreakfastEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      map: propTex,
      baseColor: pal.ground || '#6b655c',
      accentColor: pal.accent || '#f5cf86',
      roughness: 0.88
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff6a18,
      emissive: 0xff3b00,
      emissiveIntensity: 1.35,
      roughness: 0.3
    });
    const loafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c98e46',
      accentColor: '#f5ca86',
      roughness: 0.82
    });

    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2;
      const rStone = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.22, 1), 0.03, 3.5),
        stoneMat
      );
      rStone.position.set(Math.cos(ang) * 0.68, 0.16, Math.sin(ang) * 0.68);
      rStone.userData.keepWithGlb = true;
      group.add(rStone);
    }

    const coals = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.54, 0.58, 0.16, 18), 0.03, 4.0),
      emberMat
    );
    coals.position.y = 0.12;
    coals.userData.keepWithGlb = true;
    group.add(coals);

    const breadLoaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), loafMat);
    breadLoaf.scale.set(1.2, 0.55, 1.0);
    breadLoaf.position.set(0.95, 0.24, 0.25);
    breadLoaf.userData.keepWithGlb = true;
    group.add(breadLoaf);

    const charcoalLight = new THREE.PointLight(0xff9438, isFinalePlaza ? 3.0 : 2.6, 16);
    charcoalLight.position.set(0, 1.65, 0.15);
    group.add(charcoalLight);

    return { group, coals, charcoalLight, fireLight: charcoalLight };
  }

  // Revelation 8:3–5 (#17 "golden censer") — Horned Golden Altar & Angel's Censer of Prayers
  createRevelation8GoldenCenserAltarEnsemble(propTex = null, pal = {}, withLight = true) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf7d26a,
      emissive: 0x7a5410,
      emissiveIntensity: 0.65,
      roughness: 0.25,
      metalness: 0.84
    });

    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff6e24,
      emissive: 0xff4500,
      emissiveIntensity: 1.5,
      roughness: 0.35
    });

    const altar = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.05, 1.25, 1.05, 4, 6, 4), 0.02, 4.0),
      goldMat
    );
    altar.position.y = 0.62;
    altar.userData.keepWithGlb = true;
    group.add(altar);

    // Four golden altar horns
    for (const [hx, hz] of [[-0.46, -0.46], [0.46, -0.46], [-0.46, 0.46], [0.46, 0.46]]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.28, 8), goldMat);
      horn.position.set(hx, 1.36, hz);
      horn.userData.keepWithGlb = true;
      group.add(horn);
    }

    const censer = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), goldMat);
    censer.position.set(0, 1.54, 0);
    censer.userData.keepWithGlb = true;
    group.add(censer);

    const coals = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), emberMat);
    coals.scale.set(1.1, 0.5, 1.1);
    coals.position.set(0, 1.68, 0);
    coals.userData.keepWithGlb = true;
    group.add(coals);

    let censerLight = null;
    if (withLight) {
      censerLight = new THREE.PointLight(0xffb84d, 2.5, 15);
      censerLight.position.set(0, 2.0, 0);
      group.add(censerLight);
    }

    return { group, censer, coals, censerLight };
  }

  // Mark 4:38 / Matthew 14:24 — Galilee Wooden Fishing Boat with Stern Cushion & Lantern
  createStormBoatAndCushion(propTex = null, pal = {}, withLight = true) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c422c',
      accentColor: '#9e7852',
      roughness: 0.88,
      map: propTex
    });
    const cushionMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c3b2b',
      accentColor: '#e09a6c',
      roughness: 0.84
    });

    const hull = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.95, 0.65, 2.8, 14), 0.03, 3.0),
      woodMat
    );
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(0.55, 1.0, 0.85);
    hull.position.y = 0.42;
    hull.userData.keepWithGlb = true;
    group.add(hull);

    const cushion = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.58, 0.22, 0.68, 4, 2, 4), 0.02, 4.0),
      cushionMat
    );
    cushion.position.set(-0.78, 0.56, 0);
    cushion.userData.keepWithGlb = true;
    group.add(cushion);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.1, 8), woodMat);
    mast.position.set(0.2, 1.35, 0);
    mast.userData.keepWithGlb = true;
    group.add(mast);

    let lanternLight = null;
    if (withLight) {
      lanternLight = new THREE.PointLight(0xffe299, 2.4, 15);
      lanternLight.position.set(-0.5, 1.4, 0);
      group.add(lanternLight);
    }

    return { group, hull, cushion, lanternLight };
  }

  // ============================================================================
  // DEEPENING THE 6 VISUAL POWERHOUSE BOOKS:
  // XII Job, XXI Jeremiah, XXIII Ezekiel, XXVI Jonah, XXXII Acts, XL Hebrews
  // ============================================================================

  // 1. Job 2:7–13 (#6 "seven days") — Ash-Heap Mound, Monumental Cracked Potsherd, & 3 Silent Stones
  createJob2AshHeapPotsherdEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const ashMat = this.painterly.createPainterlyMaterial({
      baseColor: '#545250',
      accentColor: '#8c867e',
      roughness: 0.96,
      map: propTex
    });
    const terraMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c5234',
      accentColor: '#d98a5b',
      roughness: 0.86
    });
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#696258',
      accentColor: pal.accent || '#d6b882',
      roughness: 0.92
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xff6a24,
      emissive: 0xff3b00,
      emissiveIntensity: 1.4,
      roughness: 0.4
    });

    const mound = new THREE.Mesh(
      this.displaceGeometry(new THREE.ConeGeometry(1.75, 0.72, 22, 4), 0.05, 3.2),
      ashMat
    );
    mound.position.y = 0.34;
    mound.userData.keepWithGlb = true;
    group.add(mound);

    const potsherd = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.62, 0.44, 1.05, 16, 4, true, 0, Math.PI * 1.35), 0.03, 3.8),
      terraMat
    );
    potsherd.position.set(0, 0.85, 0);
    potsherd.rotation.set(0.28, 0.35, -0.18);
    potsherd.userData.keepWithGlb = true;
    group.add(potsherd);

    const embers = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), emberMat);
    embers.scale.set(1.3, 0.4, 1.3);
    embers.position.set(0.28, 0.58, 0.34);
    embers.userData.keepWithGlb = true;
    group.add(embers);

    for (let i = 0; i < 3; i++) {
      const ang = -0.75 + i * 0.75;
      const seat = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.36, 1), 0.04, 3.5),
        stoneMat
      );
      seat.scale.set(1.2, 0.68, 1.1);
      seat.position.set(Math.sin(ang) * 1.95, 0.24, Math.cos(ang) * 1.75);
      seat.userData.keepWithGlb = true;
      group.add(seat);
    }

    const ashLight = new THREE.PointLight(0xffa454, isFinalePlaza ? 2.8 : 2.3, 15);
    ashLight.position.set(0, 1.65, 0.3);
    group.add(ashLight);

    return { group, potsherd, embers, ashLight };
  }

  // 2. Job 14:7–9 (#16 "at the scent of water") — Hewn Stump Sending Up a Fresh Green Shoot by a Spring
  createJob14ScentOfWaterStumpEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const barkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#59422e',
      accentColor: '#967352',
      roughness: 0.9,
      map: propTex
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4c7a3b',
      accentColor: '#a6d672',
      roughness: 0.72
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x5ca8c4,
      emissive: 0x1e4c63,
      emissiveIntensity: 0.55,
      roughness: 0.22
    });

    const pool = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.14, 24), waterMat);
    pool.position.set(0.35, 0.07, 0.25);
    pool.userData.keepWithGlb = true;
    group.add(pool);

    const stump = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.56, 0.78, 0.88, 16), 0.04, 3.6),
      barkMat
    );
    stump.position.set(-0.2, 0.44, -0.1);
    stump.userData.keepWithGlb = true;
    group.add(stump);

    const shootGroup = new THREE.Group();
    shootGroup.position.set(0.12, 0.85, 0.05);
    shootGroup.userData.keepWithGlb = true;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.95, 8), leafMat);
    stem.position.y = 0.46;
    shootGroup.add(stem);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), leafMat);
      leaf.scale.set(1.5, 0.45, 0.8);
      leaf.position.set(Math.cos(i * 1.25) * 0.22, 0.35 + i * 0.14, Math.sin(i * 1.25) * 0.22);
      shootGroup.add(leaf);
    }
    group.add(shootGroup);

    const sproutLight = new THREE.PointLight(0xd8f598, isFinalePlaza ? 2.8 : 2.4, 15);
    sproutLight.position.set(0.1, 1.85, 0.2);
    group.add(sproutLight);

    return { group, stump, shootGroup, sproutLight };
  }

  // 3. Job 19:23–25 (#19 "cut in rock") — Desert Monolith with Gold-Inlaid Inscription & Iron Stylus
  createJob19RedeemerRockInscriptionEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const rockMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b5b4b',
      accentColor: '#bfa282',
      roughness: 0.9,
      map: propTex
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffdf80,
      emissive: 0xd49b2a,
      emissiveIntensity: 0.95,
      roughness: 0.28,
      metalness: 0.78
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x454a52,
      roughness: 0.45,
      metalness: 0.82
    });

    const monolith = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.65, 2.35, 0.75, 6, 8, 4), 0.05, 3.2),
      rockMat
    );
    monolith.position.y = 1.18;
    monolith.userData.keepWithGlb = true;
    group.add(monolith);

    for (let r = 0; r < 4; r++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(1.05 - r * 0.12, 0.05, 0.04), goldMat);
      line.position.set(0, 1.62 - r * 0.22, 0.39);
      line.userData.keepWithGlb = true;
      group.add(line);
    }

    const stylus = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.01, 0.72, 10), ironMat);
    stylus.position.set(0.55, 0.32, 0.55);
    stylus.rotation.set(0.4, 0.2, -0.95);
    stylus.userData.keepWithGlb = true;
    group.add(stylus);

    const rockLight = new THREE.PointLight(0xffe28a, isFinalePlaza ? 2.9 : 2.5, 16);
    rockLight.position.set(0, 1.65, 0.95);
    group.add(rockLight);

    return { group, monolith, stylus, rockLight };
  }

  // 4. Job 38:1, 31 (#32 "God speaks") — Spiraling Whirlwind Vortex & Orion/Pleiades Star Rings
  createJob38WhirlwindAndStarsEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#5e5549',
      accentColor: pal.accent || '#e0c084',
      roughness: 0.88,
      map: propTex
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffe89e,
      emissive: 0xdba23b,
      emissiveIntensity: 1.1,
      roughness: 0.25,
      metalness: 0.75
    });

    const base = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.25, 1.48, 0.28, 20), 0.03, 3.2),
      stoneMat
    );
    base.position.y = 0.14;
    base.userData.keepWithGlb = true;
    group.add(base);

    const vortexGroup = new THREE.Group();
    vortexGroup.position.y = 0.3;
    vortexGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42 + i * 0.18, 0.028, 10, 32), goldMat);
      ring.rotation.x = Math.PI / 2 + (i % 2 === 0 ? 0.14 : -0.14);
      ring.position.y = i * 0.42;
      vortexGroup.add(ring);
    }
    group.add(vortexGroup);

    const starLight = new THREE.PointLight(0xffe8a3, isFinalePlaza ? 3.2 : 2.7, 18);
    starLight.position.set(0, 2.35, 0);
    group.add(starLight);

    return { group, vortexGroup, starLight };
  }

  // 5. Jeremiah 1:11–12 (#3 "the almond branch") — Blossoming Almond Branch on a Stone Sill
  createJeremiah1AlmondBranchEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#786a58',
      accentColor: pal.accent || '#e6c88e',
      roughness: 0.88,
      map: propTex
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c402b',
      accentColor: '#9c7454',
      roughness: 0.85
    });
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xffeef2,
      emissive: 0xd98fa3,
      emissiveIntensity: 0.55,
      roughness: 0.38
    });

    const sill = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.55, 0.68, 0.92, 6, 4, 4), 0.03, 3.2),
      stoneMat
    );
    sill.position.y = 0.34;
    sill.userData.keepWithGlb = true;
    group.add(sill);

    const branchGroup = new THREE.Group();
    branchGroup.position.set(0, 0.72, 0);
    branchGroup.userData.keepWithGlb = true;
    const bough = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 1.65, 10), woodMat);
    bough.rotation.z = -0.52;
    bough.position.y = 0.55;
    branchGroup.add(bough);

    for (let i = 0; i < 7; i++) {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), blossomMat);
      petal.position.set(-0.45 + i * 0.16, 0.28 + i * 0.12, (i % 2 === 0 ? 1 : -1) * 0.12);
      branchGroup.add(petal);
    }
    group.add(branchGroup);

    const almondLight = new THREE.PointLight(0xffe3eb, isFinalePlaza ? 2.8 : 2.4, 15);
    almondLight.position.set(0, 1.75, 0.35);
    group.add(almondLight);

    return { group, branchGroup, almondLight };
  }

  // 6. Jeremiah 18:1–6 (#16 "the potter's house") — Stone Potter's Wheel & Wet Clay Vessel
  createJeremiah18PottersWheelEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#736654',
      accentColor: '#d9bc8c',
      roughness: 0.88,
      map: propTex
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a85838',
      accentColor: '#e6986c',
      roughness: 0.65
    });

    const bench = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.75, 0.72, 1.15, 6, 4, 4), 0.03, 3.2),
      stoneMat
    );
    bench.position.y = 0.36;
    bench.userData.keepWithGlb = true;
    group.add(bench);

    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 0.78, 0);
    wheelGroup.userData.keepWithGlb = true;

    const upperWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.08, 24), stoneMat);
    wheelGroup.add(upperWheel);

    const vessel = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.26, 0.34, 0.68, 18), 0.02, 4.0),
      clayMat
    );
    vessel.position.y = 0.38;
    wheelGroup.add(vessel);
    group.add(wheelGroup);

    const potterLight = new THREE.PointLight(0xffd896, isFinalePlaza ? 2.8 : 2.4, 15);
    potterLight.position.set(0, 1.85, 0.35);
    group.add(potterLight);

    return { group, wheelGroup, vessel, potterLight };
  }

  // 7. Jeremiah 29:11 (#24 "a future and a hope") — Exile Letter Scroll, Clay Bullae Seal, & Fig Basket
  createJeremiah29ExileLetterScrollEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#756652',
      accentColor: pal.accent || '#e6c88c',
      roughness: 0.88,
      map: propTex
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#ebd9b5',
      accentColor: '#fff2d6',
      roughness: 0.74
    });
    const sealMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e3828',
      accentColor: '#e06c54',
      roughness: 0.78
    });

    const table = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.12, 1.28, 0.78, 18), 0.03, 3.2),
      stoneMat
    );
    table.position.y = 0.39;
    table.userData.keepWithGlb = true;
    group.add(table);

    const scroll = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.05, 0.62), parchmentMat);
    scroll.position.set(0, 0.82, 0);
    scroll.userData.keepWithGlb = true;
    group.add(scroll);

    const seal = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 14), sealMat);
    seal.position.set(0.24, 0.86, 0.16);
    seal.userData.keepWithGlb = true;
    group.add(seal);

    const scrollLight = new THREE.PointLight(0xffe49e, isFinalePlaza ? 2.9 : 2.4, 15);
    scrollLight.position.set(0, 1.75, 0.25);
    group.add(scrollLight);

    return { group, scroll, seal, scrollLight };
  }

  // 8. Jeremiah 32:14 (#30 "a field in Anathoth") — Earthenware Jar Holding the Sealed & Open Deeds + Scales
  createJeremiah32AnathothDeedJarsEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e5c3b',
      accentColor: '#de9a6f',
      roughness: 0.84,
      map: propTex
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#eddcb9',
      accentColor: '#fff4dc',
      roughness: 0.72
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe6be65,
      emissive: 0x6b4c12,
      emissiveIntensity: 0.45,
      roughness: 0.32,
      metalness: 0.78
    });

    const jar = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.46, 0.58, 1.24, 18), 0.03, 3.5),
      clayMat
    );
    jar.position.set(-0.28, 0.62, 0);
    jar.userData.keepWithGlb = true;
    group.add(jar);

    for (const [dx, dz, rotZ] of [[-0.36, -0.05, 0.14], [-0.18, 0.06, -0.18]]) {
      const deed = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.68, 12), parchmentMat);
      deed.position.set(dx, 1.32, dz);
      deed.rotation.z = rotZ;
      deed.userData.keepWithGlb = true;
      group.add(deed);
    }

    const scaleStand = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.16, 0.96, 12), brassMat);
    scaleStand.position.set(0.48, 0.48, 0.12);
    scaleStand.userData.keepWithGlb = true;
    group.add(scaleStand);

    const deedLight = new THREE.PointLight(0xffe299, isFinalePlaza ? 2.8 : 2.4, 15);
    deedLight.position.set(0, 1.85, 0.3);
    group.add(deedLight);

    return { group, jar, scaleStand, deedLight };
  }

  // 9. Ezekiel 1:16, 28 (#3 "the bow in the cloud") — Interlocked Beryl Gyre Wheels & Rainbow Sapphire Arch
  createEzekiel1ChebarWheelThroneEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const berylMat = new THREE.MeshStandardMaterial({
      color: 0xffd978,
      emissive: 0xc4821d,
      emissiveIntensity: 0.95,
      roughness: 0.24,
      metalness: 0.82
    });
    const sapphireMat = new THREE.MeshStandardMaterial({
      color: 0x3b78c4,
      emissive: 0x1a3e78,
      emissiveIntensity: 0.75,
      roughness: 0.28,
      metalness: 0.55
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.42, 0.24, 24), sapphireMat);
    base.position.y = 0.12;
    base.userData.keepWithGlb = true;
    group.add(base);

    const wheelsGroup = new THREE.Group();
    wheelsGroup.position.set(0, 1.38, 0);
    wheelsGroup.userData.keepWithGlb = true;

    const wheelA = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.08, 14, 36), berylMat);
    const wheelB = new THREE.Mesh(new THREE.TorusGeometry(0.96, 0.08, 14, 36), berylMat);
    wheelB.rotation.y = Math.PI / 2;
    wheelsGroup.add(wheelA, wheelB);
    group.add(wheelsGroup);

    const wheelLight = new THREE.PointLight(0xffe89e, isFinalePlaza ? 3.2 : 2.7, 18);
    wheelLight.position.set(0, 1.85, 0.4);
    group.add(wheelLight);

    return { group, wheelsGroup, wheelLight };
  }

  // 10. Ezekiel 36:25–27 (#30 "a heart of flesh") — Cleft Stone Altar & Living Carnelian Heart in Clean Water
  createEzekiel36HeartOfFleshAltarEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#69625a',
      accentColor: '#bdb2a2',
      roughness: 0.92,
      map: propTex
    });
    const heartMat = new THREE.MeshStandardMaterial({
      color: 0xe64d4d,
      emissive: 0xb82424,
      emissiveIntensity: 0.95,
      roughness: 0.32
    });

    const leftStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.68, 1.15, 0.85, 4, 6, 4), 0.04, 3.5),
      stoneMat
    );
    leftStone.position.set(-0.52, 0.58, 0);
    leftStone.rotation.z = 0.16;
    leftStone.userData.keepWithGlb = true;
    group.add(leftStone);

    const rightStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.68, 1.15, 0.85, 4, 6, 4), 0.04, 3.5),
      stoneMat
    );
    rightStone.position.set(0.52, 0.58, 0);
    rightStone.rotation.z = -0.16;
    rightStone.userData.keepWithGlb = true;
    group.add(rightStone);

    const heartCore = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), heartMat);
    heartCore.scale.set(1.0, 1.18, 0.82);
    heartCore.position.set(0, 1.05, 0);
    heartCore.userData.keepWithGlb = true;
    group.add(heartCore);

    const heartLight = new THREE.PointLight(0xff8c82, isFinalePlaza ? 2.9 : 2.5, 16);
    heartLight.position.set(0, 1.45, 0.35);
    group.add(heartLight);

    return { group, heartCore, heartLight };
  }

  // 11. Ezekiel 37:1–10 (#32 "breath") — Valley Dry Stones & Rising Ivory Ribs in the Four Winds
  createEzekiel37ValleyOfDryBonesEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const boneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#e8dec8',
      accentColor: '#fff8e8',
      roughness: 0.78,
      map: propTex
    });
    const earthMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#6e5e4b',
      accentColor: pal.accent || '#d9b882',
      roughness: 0.92
    });

    const mound = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.45, 1.68, 0.24, 22), 0.03, 3.2),
      earthMat
    );
    mound.position.y = 0.12;
    mound.userData.keepWithGlb = true;
    group.add(mound);

    const ribsGroup = new THREE.Group();
    ribsGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.055, 8, 20, Math.PI), boneMat);
      arch.position.set(Math.cos(ang) * 0.45, 0.25 + (i % 2) * 0.22, Math.sin(ang) * 0.45);
      arch.rotation.y = ang;
      ribsGroup.add(arch);
    }
    group.add(ribsGroup);

    const breathLight = new THREE.PointLight(0xffebb0, isFinalePlaza ? 3.0 : 2.6, 17);
    breathLight.position.set(0, 1.85, 0);
    group.add(breathLight);

    return { group, ribsGroup, breathLight };
  }

  // 12. Ezekiel 47:1–12 (#38 "leaves for healing") — Temple Spring Threshold & Healing Fruit Trees
  createEzekiel47TempleRiverTreesEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7d65',
      accentColor: '#edd29f',
      roughness: 0.85,
      map: propTex
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3ea8c4,
      emissive: 0x165e78,
      emissiveIntensity: 0.68,
      roughness: 0.2
    });

    const thresholdArch = new THREE.Mesh(
      this.displaceGeometry(new THREE.TorusGeometry(1.25, 0.18, 10, 24, Math.PI), 0.02, 3.5),
      stoneMat
    );
    thresholdArch.position.set(0, 0.2, -0.35);
    thresholdArch.userData.keepWithGlb = true;
    group.add(thresholdArch);

    const stream = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 2.45), waterMat);
    stream.position.set(0, 0.06, 0.35);
    stream.userData.keepWithGlb = true;
    group.add(stream);

    const riverLight = new THREE.PointLight(0x9eeeff, isFinalePlaza ? 3.0 : 2.5, 16);
    riverLight.position.set(0, 1.75, 0.35);
    group.add(riverLight);

    return { group, thresholdArch, stream, riverLight };
  }

  // 13. Jonah 1:4–6 (#3 "fast asleep") — Timber Tarshish Ship Pitching in the Storm with Hold Lantern
  createJonah1TarshishStormShipEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    return this.createStormBoatAndCushion(propTex, pal, true);
  }

  // 14. Jonah 2:1–6 (#8 "at the bottom") — Breaching Great Fish & Roots of the Mountains in the Deep
  createJonah2GreatFishDepthsEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const deepMat = this.painterly.createPainterlyMaterial({
      baseColor: '#233d4f',
      accentColor: '#5c94ab',
      roughness: 0.82,
      map: propTex
    });
    const rockMat = this.painterly.createPainterlyMaterial({
      baseColor: '#36454f',
      accentColor: '#7896a3',
      roughness: 0.92
    });

    for (const [rx, rz, h] of [[-1.05, -0.35, 1.45], [1.05, -0.35, 1.32]]) {
      const crag = new THREE.Mesh(
        this.displaceGeometry(new THREE.ConeGeometry(0.55, h, 10), 0.04, 3.5),
        rockMat
      );
      crag.position.set(rx, h * 0.5, rz);
      crag.userData.keepWithGlb = true;
      group.add(crag);
    }

    const whaleArc = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.45, 0.68, 1.85, 16), 0.03, 3.2),
      deepMat
    );
    whaleArc.position.set(0, 0.95, 0);
    whaleArc.rotation.x = -0.45;
    whaleArc.userData.keepWithGlb = true;
    group.add(whaleArc);

    const deepLight = new THREE.PointLight(0x8ae6ff, isFinalePlaza ? 2.9 : 2.5, 16);
    deepLight.position.set(0, 1.95, 0.35);
    group.add(deepLight);

    return { group, whaleArc, deepLight };
  }

  // 15. Jonah 3:6 (#16 "the empty throne") — Empty Assyrian Stone Throne & Crown on Sackcloth
  createJonah3NinevehEmptyThroneEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#706556',
      accentColor: '#ccb492',
      roughness: 0.88,
      map: propTex
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf2c864,
      emissive: 0x735214,
      emissiveIntensity: 0.55,
      roughness: 0.32,
      metalness: 0.82
    });

    const throneSeat = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.18, 0.72, 0.95, 4, 4, 4), 0.02, 3.2),
      stoneMat
    );
    throneSeat.position.set(0, 0.36, -0.15);
    throneSeat.userData.keepWithGlb = true;
    group.add(throneSeat);

    const throneBack = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.18, 1.65, 0.24, 4, 6, 2), 0.02, 3.2),
      stoneMat
    );
    throneBack.position.set(0, 0.82, -0.52);
    throneBack.userData.keepWithGlb = true;
    group.add(throneBack);

    const crown = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 10, 20), goldMat);
    crown.rotation.x = Math.PI / 2;
    crown.position.set(0.35, 0.14, 0.58);
    crown.userData.keepWithGlb = true;
    group.add(crown);

    const throneLight = new THREE.PointLight(0xffe09c, isFinalePlaza ? 2.8 : 2.4, 15);
    throneLight.position.set(0, 1.85, 0.45);
    group.add(throneLight);

    return { group, throneSeat, crown, throneLight };
  }

  // 16. Jonah 4:5–6 (#22 "the vine") — East Hill Branch Shelter & Broad-Leaved Gourd Vine
  createJonah4EastHillBoothVineEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#664a32',
      accentColor: '#a6805b',
      roughness: 0.88,
      map: propTex
    });
    const vineMat = this.painterly.createPainterlyMaterial({
      baseColor: '#487838',
      accentColor: '#9ed46e',
      roughness: 0.74
    });

    for (const [px, pz] of [[-0.68, -0.48], [0.68, -0.48], [-0.68, 0.48], [0.68, 0.48]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.65, 8), woodMat);
      post.position.set(px, 0.82, pz);
      post.userData.keepWithGlb = true;
      group.add(post);
    }

    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(0, 1.65, 0);
    canopyGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), vineMat);
      leaf.scale.set(1.3, 0.35, 1.1);
      leaf.position.set(Math.cos(i * 0.9) * 0.48, (i % 2) * 0.12, Math.sin(i * 0.9) * 0.42);
      canopyGroup.add(leaf);
    }
    group.add(canopyGroup);

    const vineLight = new THREE.PointLight(0xffe69c, isFinalePlaza ? 2.8 : 2.4, 15);
    vineLight.position.set(0, 1.95, 0.25);
    group.add(vineLight);

    return { group, canopyGroup, vineLight };
  }

  // 17. Acts 2:2–4 (#5 "tongues like fire") — Upper Room Circle & Twelve Living Tongues of Fire
  createActs2PentecostUpperRoomEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#756654',
      accentColor: pal.accent || '#e6c68a',
      roughness: 0.86,
      map: propTex
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff9424,
      emissive: 0xff4d00,
      emissiveIntensity: 1.55,
      roughness: 0.25
    });

    const dais = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.35, 1.52, 0.26, 24), 0.02, 3.2),
      stoneMat
    );
    dais.position.y = 0.13;
    dais.userData.keepWithGlb = true;
    group.add(dais);

    const flamesGroup = new THREE.Group();
    flamesGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const tongue = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.42, 10), flameMat);
      tongue.position.set(Math.cos(ang) * 0.92, 1.38 + (i % 2) * 0.12, Math.sin(ang) * 0.92);
      flamesGroup.add(tongue);
    }
    group.add(flamesGroup);

    const pentecostLight = new THREE.PointLight(0xffa63b, isFinalePlaza ? 3.2 : 2.8, 18);
    pentecostLight.position.set(0, 1.95, 0);
    group.add(pentecostLight);

    return { group, flamesGroup, pentecostLight };
  }

  // 18. Acts 3:2–8 (#9 "the gate called Beautiful") — Corinthian Bronze Pillars & Beggar's Left-Behind Mat
  createActs3GateCalledBeautifulEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xdea84f,
      emissive: 0x6b4812,
      emissiveIntensity: 0.55,
      roughness: 0.28,
      metalness: 0.82
    });
    const matCloth = this.painterly.createPainterlyMaterial({
      baseColor: '#8c6d4b',
      accentColor: '#cfa97e',
      roughness: 0.9,
      map: propTex
    });

    for (const sx of [-0.92, 0.92]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 2.55, 16), bronzeMat);
      col.position.set(sx, 1.28, -0.2);
      col.userData.keepWithGlb = true;
      group.add(col);
    }

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.28, 0.45), bronzeMat);
    lintel.position.set(0, 2.62, -0.2);
    lintel.userData.keepWithGlb = true;
    group.add(lintel);

    const wovenMat = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.54), matCloth);
    wovenMat.position.set(0.25, 0.08, 0.45);
    wovenMat.rotation.y = 0.28;
    wovenMat.userData.keepWithGlb = true;
    group.add(wovenMat);

    const gateLight = new THREE.PointLight(0xffe296, isFinalePlaza ? 2.9 : 2.5, 16);
    gateLight.position.set(0, 2.05, 0.35);
    group.add(gateLight);

    return { group, wovenMat, gateLight };
  }

  // 19. Acts 16:25–26 (#29 "midnight") — Philippian Prison Archway & Sprung Open Iron Chains
  createActs16PhilippiMidnightPrisonEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4f4d54',
      accentColor: '#9c9284',
      roughness: 0.92,
      map: propTex
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x3b4048,
      roughness: 0.45,
      metalness: 0.84
    });

    const arch = new THREE.Mesh(
      this.displaceGeometry(new THREE.TorusGeometry(1.18, 0.22, 10, 24, Math.PI), 0.03, 3.5),
      stoneMat
    );
    arch.position.set(0, 0.2, -0.25);
    arch.userData.keepWithGlb = true;
    group.add(arch);

    for (const [cx, cz, rotZ] of [[-0.42, 0.35, 0.45], [0.42, 0.35, -0.45]]) {
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.038, 10, 18, Math.PI * 1.45), ironMat);
      cuff.position.set(cx, 0.22, cz);
      cuff.rotation.set(Math.PI / 2, 0, rotZ);
      cuff.userData.keepWithGlb = true;
      group.add(cuff);
    }

    const prisonLight = new THREE.PointLight(0xffcf78, isFinalePlaza ? 2.9 : 2.5, 16);
    prisonLight.position.set(0, 1.85, 0.25);
    group.add(prisonLight);

    return { group, arch, prisonLight };
  }

  // 20. Acts 27:29 (#37 "four anchors") — Four Stern Iron Anchors Cast into the Stormy Sea
  createActs27MaltaFourAnchorsEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x464e59,
      roughness: 0.42,
      metalness: 0.85
    });
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#585c63',
      accentColor: pal.accent || '#d9bd86',
      roughness: 0.9,
      map: propTex
    });

    const reef = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.32, 1.55, 0.26, 20), 0.04, 3.5),
      stoneMat
    );
    reef.position.y = 0.13;
    reef.userData.keepWithGlb = true;
    group.add(reef);

    for (let i = 0; i < 4; i++) {
      const ax = -0.66 + i * 0.44;
      const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.92, 10), ironMat);
      shank.position.set(ax, 0.68, 0);
      shank.userData.keepWithGlb = true;
      const fluke = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 16, Math.PI), ironMat);
      fluke.rotation.z = Math.PI;
      fluke.position.set(ax, 0.42, 0);
      fluke.userData.keepWithGlb = true;
      group.add(shank, fluke);
    }

    const anchorLight = new THREE.PointLight(0xffe09c, isFinalePlaza ? 2.9 : 2.4, 16);
    anchorLight.position.set(0, 1.75, 0.35);
    group.add(anchorLight);

    return { group, reef, anchorLight };
  }

  // 21. Hebrews 4:16 (#16 "the throne of grace") — Golden Mercy Seat & Open Sanctuary Steps
  createHebrews4ThroneOfGraceEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7e68',
      accentColor: '#ebd2a0',
      roughness: 0.84,
      map: propTex
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd970,
      emissive: 0x996b18,
      emissiveIntensity: 0.78,
      roughness: 0.25,
      metalness: 0.85
    });

    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.1 - s * 0.32, 0.18, 1.5 - s * 0.24), stoneMat);
      step.position.y = 0.09 + s * 0.18;
      step.userData.keepWithGlb = true;
      group.add(step);
    }

    const mercySeat = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.65, 0.72), goldMat);
    mercySeat.position.set(0, 0.86, 0);
    mercySeat.userData.keepWithGlb = true;
    group.add(mercySeat);

    const graceLight = new THREE.PointLight(0xffea9c, isFinalePlaza ? 3.2 : 2.7, 18);
    graceLight.position.set(0, 1.95, 0.35);
    group.add(graceLight);

    return { group, mercySeat, graceLight };
  }

  // 22. Hebrews 6:19 (#19 "anchor") — Monumental Anchor of the Soul Reaching Behind the Veil
  createHebrews6AnchorOfTheSoulEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd4a24c,
      emissive: 0x5c3e10,
      emissiveIntensity: 0.55,
      roughness: 0.32,
      metalness: 0.84
    });
    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: pal.ground || '#736552',
      accentColor: pal.accent || '#e6c68a',
      roughness: 0.88,
      map: propTex
    });

    const rock = new THREE.Mesh(
      this.displaceGeometry(new THREE.DodecahedronGeometry(0.82, 1), 0.05, 3.2),
      stoneMat
    );
    rock.scale.set(1.35, 0.62, 1.15);
    rock.position.y = 0.35;
    rock.userData.keepWithGlb = true;
    group.add(rock);

    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 1.68, 14), bronzeMat);
    shank.position.set(0, 1.15, 0);
    shank.userData.keepWithGlb = true;
    group.add(shank);

    const arms = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.08, 12, 24, Math.PI), bronzeMat);
    arms.rotation.z = Math.PI;
    arms.position.set(0, 0.82, 0);
    arms.userData.keepWithGlb = true;
    group.add(arms);

    const soulLight = new THREE.PointLight(0xffe69c, isFinalePlaza ? 3.0 : 2.6, 17);
    soulLight.position.set(0, 1.95, 0.35);
    group.add(soulLight);

    return { group, shank, arms, soulLight };
  }

  // 23. Hebrews 10:19–20 (#23 "the veil") — Parted Blue-Purple-Crimson Temple Curtain & Golden Path
  createHebrews10OpenedCurtainWayEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const veilMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4c2c6e',
      accentColor: '#cf5a6c',
      roughness: 0.78,
      map: propTex
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffe28a,
      emissive: 0xa6741e,
      emissiveIntensity: 0.8,
      roughness: 0.28,
      metalness: 0.82
    });

    for (const [vx, rotZ] of [[-0.82, 0.18], [0.82, -0.18]]) {
      const drape = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.28, 0.42, 2.55, 14), 0.03, 3.8),
        veilMat
      );
      drape.position.set(vx, 1.28, 0);
      drape.rotation.z = rotZ;
      drape.userData.keepWithGlb = true;
      group.add(drape);
    }

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.45, 12), goldMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 2.58, 0);
    crossbar.userData.keepWithGlb = true;
    group.add(crossbar);

    const veilLight = new THREE.PointLight(0xffea9c, isFinalePlaza ? 3.1 : 2.6, 17);
    veilLight.position.set(0, 1.85, 0.25);
    group.add(veilLight);

    return { group, crossbar, veilLight };
  }

  // 24. Hebrews 12:1–2 (#33 "cloud of witnesses") — Amphitheater Colonnade & Glowing Witness Lanterns
  createHebrews12CloudOfWitnessesArenaEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#857763',
      accentColor: '#e8cfa0',
      roughness: 0.85,
      map: propTex
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffea9e,
      emissive: 0xffb838,
      emissiveIntensity: 1.45,
      roughness: 0.25
    });

    const track = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.16, 10, 32), stoneMat);
    track.rotation.x = Math.PI / 2;
    track.position.y = 0.08;
    track.userData.keepWithGlb = true;
    group.add(track);

    const witnessesGroup = new THREE.Group();
    witnessesGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI * 0.85 + (i / 7) * Math.PI * 1.7;
      const px = Math.sin(ang) * 1.45;
      const pz = -Math.cos(ang) * 1.45;
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 1.65, 10), stoneMat);
      pillar.position.set(px, 0.82, pz);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), flameMat);
      orb.position.set(px, 1.78, pz);
      witnessesGroup.add(pillar, orb);
    }
    group.add(witnessesGroup);

    const arenaLight = new THREE.PointLight(0xffea9e, isFinalePlaza ? 3.2 : 2.7, 18);
    arenaLight.position.set(0, 2.05, 0);
    group.add(arenaLight);

    return { group, witnessesGroup, arenaLight };
  }

  // ============================================================================
  // BATCH 3 DEEPENING: BOOKS IX, X, XI, XVII, XVIII, XIX (24 BESPOKE ENSEMBLES)
  // ============================================================================

  // 1. 1 Chronicles 9:22–27 (#4 "keepers of the thresholds") — Temple Threshold Gate & Morning Key
  createChronicles9ThresholdKeepersEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d6e5a',
      accentColor: '#dfc08a',
      roughness: 0.85,
      map: propTex
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xe6b85c,
      emissive: 0x996a1c,
      emissiveIntensity: 0.85,
      roughness: 0.3,
      metalness: 0.82
    });

    const thresholdSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.6, 0.22, 1.4, 8, 2, 6), 0.02, 3.2),
      stoneMat
    );
    thresholdSlab.position.y = 0.11;
    thresholdSlab.userData.keepWithGlb = true;
    group.add(thresholdSlab);

    for (const px of [-0.95, 0.95]) {
      const pillar = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.38, 2.35, 0.38, 4, 8, 4), 0.02, 3.5),
        stoneMat
      );
      pillar.position.set(px, 1.28, 0);
      pillar.userData.keepWithGlb = true;
      group.add(pillar);
    }

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.28, 0.48), stoneMat);
    lintel.position.set(0, 2.52, 0);
    lintel.userData.keepWithGlb = true;
    group.add(lintel);

    const keyGroup = new THREE.Group();
    keyGroup.userData.keepWithGlb = true;
    const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 10, 24), brassMat);
    const keyShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.62, 10), brassMat);
    keyShaft.position.y = -0.45;
    const keyBit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.04), brassMat);
    keyBit.position.set(0.08, -0.66, 0);
    keyGroup.add(keyRing, keyShaft, keyBit);
    keyGroup.position.set(0, 1.55, 0.22);
    group.add(keyGroup);

    const thresholdLight = new THREE.PointLight(0xffe296, isFinalePlaza ? 2.9 : 2.4, 15);
    thresholdLight.position.set(0, 1.85, 0.45);
    group.add(thresholdLight);

    return { group, keyGroup, thresholdLight };
  }

  // 2. 1 Chronicles 16:1–3 (#8 "a loaf and a raisin cake") — Tent of David & Feast Basket of Bread & Raisin Cakes
  createChronicles16ArkTentFeastEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#69492a',
      accentColor: '#c99b5e',
      roughness: 0.78,
      map: propTex
    });
    const breadMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c4883d',
      accentColor: '#f5d293',
      roughness: 0.65
    });
    const raisinMat = this.painterly.createPainterlyMaterial({
      baseColor: '#59292c',
      accentColor: '#b36252',
      roughness: 0.58
    });

    const table = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 0.96, 0.78, 18), woodMat);
    table.position.y = 0.39;
    table.userData.keepWithGlb = true;
    group.add(table);

    const feastGroup = new THREE.Group();
    feastGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), breadMat);
      loaf.scale.set(1.2, 0.58, 1.0);
      loaf.position.set(Math.cos(ang) * 0.36, 0.86, Math.sin(ang) * 0.36);
      const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.11, 12), raisinMat);
      cake.position.set(Math.cos(ang + 1.0) * 0.34, 0.84, Math.sin(ang + 1.0) * 0.34);
      feastGroup.add(loaf, cake);
    }
    group.add(feastGroup);

    const feastLight = new THREE.PointLight(0xffdf91, isFinalePlaza ? 2.8 : 2.3, 15);
    feastLight.position.set(0, 1.65, 0);
    group.add(feastLight);

    return { group, feastGroup, feastLight };
  }

  // 3. 2 Chronicles 5:12–14 (#18 "one sound") — 120 Silver Trumpets & Golden Cloud of Glory
  createChronicles5OneSoundTrumpetsEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xf4efe1,
      emissive: 0x9c824c,
      emissiveIntensity: 0.65,
      roughness: 0.24,
      metalness: 0.88
    });
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffecb0,
      emissive: 0xffb93b,
      emissiveIntensity: 1.25,
      transparent: true,
      opacity: 0.84,
      roughness: 0.32
    });

    const trumpetsGroup = new THREE.Group();
    trumpetsGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 1.15, 14, 1, true), silverMat);
      horn.position.set(Math.cos(ang) * 0.55, 1.15, Math.sin(ang) * 0.55);
      horn.rotation.z = -Math.cos(ang) * 0.38;
      horn.rotation.x = Math.sin(ang) * 0.38;
      trumpetsGroup.add(horn);
    }
    group.add(trumpetsGroup);

    const gloryCloud = new THREE.Group();
    gloryCloud.userData.keepWithGlb = true;
    for (let i = 0; i < 5; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.36 + (i % 2) * 0.12, 14, 12), cloudMat);
      puff.position.set(Math.cos(i * 1.25) * 0.38, 2.05 + (i % 2) * 0.16, Math.sin(i * 1.25) * 0.38);
      gloryCloud.add(puff);
    }
    group.add(gloryCloud);

    const gloryLight = new THREE.PointLight(0xffea9c, isFinalePlaza ? 3.2 : 2.7, 17);
    gloryLight.position.set(0, 2.15, 0);
    group.add(gloryLight);

    return { group, trumpetsGroup, gloryCloud, gloryLight };
  }

  // 4. 2 Chronicles 20:2–13 (#24 "our eyes are on you") — Jehoshaphat's Temple Courtyard & Open Scroll
  createChronicles20EyesOnYouCourtyardEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#82725c',
      accentColor: '#e6c892',
      roughness: 0.84,
      map: propTex
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd97d,
      emissive: 0xb87e1c,
      emissiveIntensity: 0.95,
      roughness: 0.28,
      metalness: 0.8
    });

    const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.5, 0.34, 24), stoneMat);
    dais.position.y = 0.17;
    dais.userData.keepWithGlb = true;
    group.add(dais);

    const lectern = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 1.18, 14), stoneMat);
    lectern.position.y = 0.88;
    lectern.userData.keepWithGlb = true;
    group.add(lectern);

    const beaconOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 1), goldMat);
    beaconOrb.position.set(0, 1.78, 0);
    beaconOrb.userData.keepWithGlb = true;
    group.add(beaconOrb);

    const eyesLight = new THREE.PointLight(0xffe699, isFinalePlaza ? 3.1 : 2.6, 17);
    eyesLight.position.set(0, 2.0, 0);
    group.add(eyesLight);

    return { group, beaconOrb, eyesLight };
  }

  // 5. Ezra 3:2–3 (#4 "on its base") — Rebuilt Stone Altar Set on Its Base Amid Rubble
  createEzra3AltarOnItsBaseEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6a55',
      accentColor: '#deb97e',
      roughness: 0.88,
      map: propTex
    });
    const fireMat = new THREE.MeshStandardMaterial({
      color: 0xffd269,
      emissive: 0xff7b1c,
      emissiveIntensity: 1.5,
      roughness: 0.25
    });

    const baseSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.1, 0.32, 2.1, 6, 2, 6), 0.03, 3.4),
      stoneMat
    );
    baseSlab.position.y = 0.16;
    baseSlab.userData.keepWithGlb = true;
    group.add(baseSlab);

    const altarBody = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.45, 0.96, 1.45, 6, 4, 6), 0.03, 3.8),
      stoneMat
    );
    altarBody.position.y = 0.78;
    altarBody.userData.keepWithGlb = true;
    group.add(altarBody);

    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.78, 12), fireMat);
    flame.position.y = 1.58;
    flame.userData.keepWithGlb = true;
    group.add(flame);

    const altarLight = new THREE.PointLight(0xffb84d, isFinalePlaza ? 3.0 : 2.5, 16);
    altarLight.position.set(0, 1.85, 0);
    group.add(altarLight);

    return { group, flame, altarLight };
  }

  // 6. Nehemiah 2:12–15 (#23 "the night ride") — Moonlit Breached Wall & Guiding Lantern
  createNehemiah2NightRideWallEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const wallMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c5349',
      accentColor: '#c9ae82',
      roughness: 0.9,
      map: propTex
    });
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffea9c,
      emissive: 0xffaa2b,
      emissiveIntensity: 1.45,
      roughness: 0.25
    });

    for (let i = 0; i < 5; i++) {
      const block = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.68, 0.52 + (i % 3) * 0.34, 0.56, 4, 4, 4), 0.03, 3.6),
        wallMat
      );
      block.position.set((i - 2) * 0.56, 0.35 + (i % 2) * 0.22, (i % 2) * 0.18 - 0.1);
      block.rotation.y = (i - 2) * 0.12;
      block.userData.keepWithGlb = true;
      group.add(block);
    }

    const lanternOrb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), lanternMat);
    lanternOrb.position.set(0, 1.62, 0.28);
    lanternOrb.userData.keepWithGlb = true;
    group.add(lanternOrb);

    const nightLight = new THREE.PointLight(0xffd27a, isFinalePlaza ? 2.9 : 2.4, 15);
    nightLight.position.set(0, 1.75, 0.35);
    group.add(nightLight);

    return { group, lanternOrb, nightLight };
  }

  // 7. Nehemiah 4:16–18 (#29 "one hand") — Builder's Trowel, Bronze Sword & Shofar on Rising Wall
  createNehemiah4TrowelAndSwordWallEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7d6c56',
      accentColor: '#dfc08e',
      roughness: 0.86,
      map: propTex
    });
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xdfa855,
      emissive: 0x8c5c16,
      emissiveIntensity: 0.72,
      roughness: 0.32,
      metalness: 0.8
    });

    const wallParapet = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.2, 1.25, 0.86, 6, 4, 4), 0.03, 3.5),
      stoneMat
    );
    wallParapet.position.y = 0.62;
    wallParapet.userData.keepWithGlb = true;
    group.add(wallParapet);

    const toolsGroup = new THREE.Group();
    toolsGroup.userData.keepWithGlb = true;
    const trowelBlade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.48, 4), bronzeMat);
    trowelBlade.position.set(-0.42, 1.48, 0.12);
    trowelBlade.rotation.z = 0.45;
    const swordBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.92, 0.03), bronzeMat);
    swordBlade.position.set(0.42, 1.56, 0.12);
    swordBlade.rotation.z = -0.35;
    toolsGroup.add(trowelBlade, swordBlade);
    group.add(toolsGroup);

    const wallLight = new THREE.PointLight(0xffdf94, isFinalePlaza ? 2.9 : 2.4, 16);
    wallLight.position.set(0, 1.85, 0.35);
    group.add(wallLight);

    return { group, toolsGroup, wallLight };
  }

  // 8. Nehemiah 8:1–6 (#34 "all the people stood") — Timber Platform at the Water Gate & Open Scroll
  createNehemiah8WaterGateScrollEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const cedarMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b492b',
      accentColor: '#cfa063',
      roughness: 0.78,
      map: propTex
    });
    const parchmentMat = new THREE.MeshStandardMaterial({
      color: 0xfff3d1,
      emissive: 0xc9963b,
      emissiveIntensity: 0.75,
      roughness: 0.42
    });

    const platform = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.72, 1.65), cedarMat);
    platform.position.y = 0.36;
    platform.userData.keepWithGlb = true;
    group.add(platform);

    const desk = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.85, 0.58), cedarMat);
    desk.position.set(0, 1.12, 0);
    desk.userData.keepWithGlb = true;
    group.add(desk);

    const scrollGroup = new THREE.Group();
    scrollGroup.userData.keepWithGlb = true;
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.04, 0.48), parchmentMat);
    sheet.position.set(0, 1.58, 0);
    sheet.rotation.x = 0.28;
    scrollGroup.add(sheet);
    group.add(scrollGroup);

    const scrollLight = new THREE.PointLight(0xffe69c, isFinalePlaza ? 3.1 : 2.6, 17);
    scrollLight.position.set(0, 2.05, 0.25);
    group.add(scrollLight);

    return { group, scrollGroup, scrollLight };
  }

  // 9. Esther 2:11 (#4 "every day by the court") — Susa Palace Colonnade & Mother-of-Pearl Mosaic Pavement
  createEsther2SusaMosaicCourtyardEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const marbleMat = this.painterly.createPainterlyMaterial({
      baseColor: '#2d4b5e',
      accentColor: '#e6c98a',
      roughness: 0.52,
      map: propTex
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf2c66d,
      emissive: 0x996b1d,
      emissiveIntensity: 0.78,
      roughness: 0.28,
      metalness: 0.84
    });

    const mosaicFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.65, 0.18, 28), marbleMat);
    mosaicFloor.position.y = 0.09;
    mosaicFloor.userData.keepWithGlb = true;
    group.add(mosaicFloor);

    const mosaicRing = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.05, 10, 32), goldMat);
    mosaicRing.rotation.x = Math.PI / 2;
    mosaicRing.position.y = 0.19;
    mosaicRing.userData.keepWithGlb = true;
    group.add(mosaicRing);

    for (const px of [-0.95, 0.95]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.35, 16), marbleMat);
      col.position.set(px, 1.25, -0.35);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.48), goldMat);
      cap.position.set(px, 2.48, -0.35);
      col.userData.keepWithGlb = true;
      cap.userData.keepWithGlb = true;
      group.add(col, cap);
    }

    const courtLight = new THREE.PointLight(0xffe194, isFinalePlaza ? 2.9 : 2.4, 16);
    courtLight.position.set(0, 1.95, 0.25);
    group.add(courtLight);

    return { group, mosaicRing, courtLight };
  }

  // 10. Esther 4:16 (#16 "if I perish") — Three-Day Fast Chamber, Folded Royal Robe & Quiet Vigil Lamp
  createEsther4ThreeDayFastEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4e43',
      accentColor: '#c7a97e',
      roughness: 0.84,
      map: propTex
    });
    const robeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#3f274d',
      accentColor: '#d9b16c',
      roughness: 0.68
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffdf88,
      emissive: 0xff9d2e,
      emissiveIntensity: 1.4,
      roughness: 0.25
    });

    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.48, 0.88), stoneMat);
    bench.position.y = 0.24;
    bench.userData.keepWithGlb = true;
    group.add(bench);

    const foldedRobe = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.78, 0.24, 0.56, 6, 3, 6), 0.02, 3.8),
      robeMat
    );
    foldedRobe.position.set(-0.32, 0.58, 0);
    foldedRobe.userData.keepWithGlb = true;
    group.add(foldedRobe);

    const vigilFlame = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), flameMat);
    vigilFlame.position.set(0.45, 0.72, 0);
    vigilFlame.userData.keepWithGlb = true;
    group.add(vigilFlame);

    const fastLight = new THREE.PointLight(0xffd67d, isFinalePlaza ? 2.8 : 2.3, 15);
    fastLight.position.set(0.45, 1.25, 0.2);
    group.add(fastLight);

    return { group, vigilFlame, fastLight };
  }

  // 11. Esther 5:2 (#18 "the golden scepter") — Extended Golden Scepter Over the Inner Court Threshold
  createEsther5GoldenScepterThroneEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const daisMat = this.painterly.createPainterlyMaterial({
      baseColor: '#382c42',
      accentColor: '#d9b571',
      roughness: 0.65,
      map: propTex
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd875,
      emissive: 0xb87e19,
      emissiveIntensity: 1.05,
      roughness: 0.22,
      metalness: 0.88
    });

    const steps = new THREE.Mesh(new THREE.CylinderGeometry(1.38, 1.58, 0.42, 24), daisMat);
    steps.position.y = 0.21;
    steps.userData.keepWithGlb = true;
    group.add(steps);

    const scepterGroup = new THREE.Group();
    scepterGroup.userData.keepWithGlb = true;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.032, 1.78, 14), goldMat);
    shaft.rotation.x = Math.PI / 2.6;
    const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 1), goldMat);
    finial.position.set(0, 0.32, 0.82);
    scepterGroup.add(shaft, finial);
    scepterGroup.position.set(0, 1.38, 0.15);
    group.add(scepterGroup);

    const scepterLight = new THREE.PointLight(0xffea96, isFinalePlaza ? 3.2 : 2.7, 17);
    scepterLight.position.set(0, 1.75, 0.75);
    group.add(scepterLight);

    return { group, scepterGroup, scepterLight };
  }

  // 12. Esther 6:1 (#21 "the sleepless king") — Open Book of the Chronicles & Midnight Lampstand
  createEsther6SleeplessChroniclesEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4f3824',
      accentColor: '#c79b5e',
      roughness: 0.72,
      map: propTex
    });
    const scrollMat = new THREE.MeshStandardMaterial({
      color: 0xfff1cf,
      emissive: 0xc28e32,
      emissiveIntensity: 0.82,
      roughness: 0.38
    });

    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 0.92, 16), woodMat);
    stand.position.y = 0.46;
    stand.userData.keepWithGlb = true;
    group.add(stand);

    const chronicleBook = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.08, 0.62), scrollMat);
    chronicleBook.position.set(0, 0.98, 0);
    chronicleBook.rotation.x = 0.24;
    chronicleBook.userData.keepWithGlb = true;
    group.add(chronicleBook);

    const lampLight = new THREE.PointLight(0xffe08c, isFinalePlaza ? 2.9 : 2.4, 15);
    lampLight.position.set(0, 1.65, 0.2);
    group.add(lampLight);

    return { group, chronicleBook, lampLight };
  }

  // 13. Proverbs 4:23 (#6 "the wellspring") — Guarded Stone Wellspring of Living Water
  createProverbs4WellspringOfLifeEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#786b59',
      accentColor: '#dfc38d',
      roughness: 0.84,
      map: propTex
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x6fd4e8,
      emissive: 0x29869e,
      emissiveIntensity: 1.05,
      roughness: 0.18,
      transparent: true,
      opacity: 0.88
    });

    const basin = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.24, 14, 28), stoneMat);
    basin.rotation.x = Math.PI / 2;
    basin.position.y = 0.32;
    basin.userData.keepWithGlb = true;
    group.add(basin);

    const springDome = new THREE.Mesh(new THREE.SphereGeometry(0.88, 20, 14), waterMat);
    springDome.scale.set(1, 0.45, 1);
    springDome.position.y = 0.36;
    springDome.userData.keepWithGlb = true;
    group.add(springDome);

    const springLight = new THREE.PointLight(0xa6f0ff, isFinalePlaza ? 3.0 : 2.5, 16);
    springLight.position.set(0, 1.65, 0);
    group.add(springLight);

    return { group, springDome, springLight };
  }

  // 14. Proverbs 25:11 (#14 "apples of gold") — Apples of Gold in Settings of Silver Filigree
  createProverbs25ApplesOfGoldEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xf2eee4,
      emissive: 0x8a7955,
      emissiveIntensity: 0.55,
      roughness: 0.26,
      metalness: 0.86
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd666,
      emissive: 0xc48418,
      emissiveIntensity: 1.05,
      roughness: 0.22,
      metalness: 0.88
    });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 0.86, 18), silverMat);
    pedestal.position.y = 0.43;
    pedestal.userData.keepWithGlb = true;
    group.add(pedestal);

    const filigreeBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.48, 0.28, 22), silverMat);
    filigreeBowl.position.y = 0.96;
    filigreeBowl.userData.keepWithGlb = true;
    group.add(filigreeBowl);

    const applesGroup = new THREE.Group();
    applesGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const r = i === 0 ? 0 : 0.34;
      const apple = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 14), goldMat);
      apple.position.set(Math.cos(ang) * r, 1.18 + (i === 0 ? 0.1 : 0), Math.sin(ang) * r);
      applesGroup.add(apple);
    }
    group.add(applesGroup);

    const applesLight = new THREE.PointLight(0xffe48f, isFinalePlaza ? 3.0 : 2.5, 16);
    applesLight.position.set(0, 1.85, 0);
    group.add(applesLight);

    return { group, applesGroup, applesLight };
  }

  // 15. Proverbs 27:17 (#25 "iron") — Iron Sharpens Iron Anvil, Crossed Blades & Golden Sparks
  createProverbs27IronSharpensIronEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x7a828c,
      emissive: 0x453823,
      emissiveIntensity: 0.45,
      roughness: 0.34,
      metalness: 0.84
    });
    const sparkMat = new THREE.MeshStandardMaterial({
      color: 0xffe484,
      emissive: 0xff8c1a,
      emissiveIntensity: 1.5,
      roughness: 0.2
    });

    const anvil = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.76, 0.64), ironMat);
    anvil.position.y = 0.38;
    anvil.userData.keepWithGlb = true;
    group.add(anvil);

    const bladesGroup = new THREE.Group();
    bladesGroup.userData.keepWithGlb = true;
    for (const rotZ of [-0.52, 0.52]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.15, 0.03), ironMat);
      blade.position.set(0, 1.24, 0);
      blade.rotation.z = rotZ;
      bladesGroup.add(blade);
    }
    const sparkCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 1), sparkMat);
    sparkCore.position.set(0, 1.24, 0.08);
    bladesGroup.add(sparkCore);
    group.add(bladesGroup);

    const forgeLight = new THREE.PointLight(0xffc966, isFinalePlaza ? 2.9 : 2.4, 15);
    forgeLight.position.set(0, 1.65, 0.25);
    group.add(forgeLight);

    return { group, bladesGroup, forgeLight };
  }

  // 16. Proverbs 31:13–15 (#38 "before dawn") — Wisdom's Loom, Distaff Spindle & Unextinguished Lamp
  createProverbs31LampBeforeDawnEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#69482a',
      accentColor: '#cfa165',
      roughness: 0.76,
      map: propTex
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffea99,
      emissive: 0xffa629,
      emissiveIntensity: 1.5,
      roughness: 0.22
    });

    const loomFrame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.68, 0.24), woodMat);
    loomFrame.position.set(-0.22, 0.84, 0);
    loomFrame.userData.keepWithGlb = true;
    group.add(loomFrame);

    const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.26, 1.25, 12), woodMat);
    lampStand.position.set(0.68, 0.62, 0.22);
    lampStand.userData.keepWithGlb = true;
    group.add(lampStand);

    const dawnFlame = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 14), flameMat);
    dawnFlame.position.set(0.68, 1.38, 0.22);
    dawnFlame.userData.keepWithGlb = true;
    group.add(dawnFlame);

    const dawnLight = new THREE.PointLight(0xffe28a, isFinalePlaza ? 3.1 : 2.6, 17);
    dawnLight.position.set(0.68, 1.65, 0.3);
    group.add(dawnLight);

    return { group, dawnFlame, dawnLight };
  }

  // 17. Ecclesiastes 1:6–7 (#4 "the wind and the sea") — Winding Rivers Flowing Into the Sea Basin
  createEcclesiastes1RiversToTheSeaEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6d6558',
      accentColor: '#cfb68a',
      roughness: 0.86,
      map: propTex
    });
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x5ab8d4,
      emissive: 0x1f6b85,
      emissiveIntensity: 0.92,
      roughness: 0.2
    });

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.55, 0.28, 28), stoneMat);
    basin.position.y = 0.14;
    basin.userData.keepWithGlb = true;
    group.add(basin);

    const seaWheel = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.16, 12, 32), seaMat);
    seaWheel.rotation.x = Math.PI / 2;
    seaWheel.position.y = 0.34;
    seaWheel.userData.keepWithGlb = true;
    group.add(seaWheel);

    const seaLight = new THREE.PointLight(0x9ce8ff, isFinalePlaza ? 2.9 : 2.4, 16);
    seaLight.position.set(0, 1.65, 0);
    group.add(seaLight);

    return { group, seaWheel, seaLight };
  }

  // 18. Ecclesiastes 3:11 (#13 "eternity in their hearts") — Sundial of the Seasons & Celestial Ring
  createEcclesiastes3SundialOfSeasonsEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6c58',
      accentColor: '#e3c58d',
      roughness: 0.82,
      map: propTex
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffda78,
      emissive: 0xb87e1c,
      emissiveIntensity: 0.95,
      roughness: 0.25,
      metalness: 0.85
    });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.92, 0.96, 20), stoneMat);
    pedestal.position.y = 0.48;
    pedestal.userData.keepWithGlb = true;
    group.add(pedestal);

    const eternityRings = new THREE.Group();
    eternityRings.userData.keepWithGlb = true;
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.045, 12, 32), goldMat);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.04, 12, 28), goldMat);
    ring2.rotation.y = Math.PI / 2;
    eternityRings.add(ring1, ring2);
    eternityRings.position.set(0, 1.56, 0);
    group.add(eternityRings);

    const sundialLight = new THREE.PointLight(0xffea96, isFinalePlaza ? 3.1 : 2.6, 17);
    sundialLight.position.set(0, 1.95, 0);
    group.add(sundialLight);

    return { group, eternityRings, sundialLight };
  }

  // 19. Ecclesiastes 4:9–12 (#16 "a threefold cord") — Threefold Braided Golden Cord Monument
  createEcclesiastes4ThreefoldCordEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf5c869,
      emissive: 0x9e6a18,
      emissiveIntensity: 0.88,
      roughness: 0.28,
      metalness: 0.82
    });

    const cordGroup = new THREE.Group();
    cordGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const strand = new THREE.Mesh(new THREE.TorusKnotGeometry(0.48, 0.065, 48, 10, 2, 3), goldMat);
      strand.rotation.z = ang;
      cordGroup.add(strand);
    }
    cordGroup.position.set(0, 1.28, 0);
    group.add(cordGroup);

    const cordLight = new THREE.PointLight(0xffe28f, isFinalePlaza ? 2.9 : 2.4, 16);
    cordLight.position.set(0, 1.75, 0);
    group.add(cordLight);

    return { group, cordGroup, cordLight };
  }

  // 20. Ecclesiastes 12:3–5 (#34 "the almond tree") — White Blossoming Almond Tree & Golden Bowl
  createEcclesiastes12BlossomingAlmondEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const barkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#594330',
      accentColor: '#b8946a',
      roughness: 0.85,
      map: propTex
    });
    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xfff7eb,
      emissive: 0xffe0b5,
      emissiveIntensity: 0.78,
      roughness: 0.38
    });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.65, 12), barkMat);
    trunk.position.y = 0.82;
    trunk.userData.keepWithGlb = true;
    group.add(trunk);

    const canopyGroup = new THREE.Group();
    canopyGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const r = i === 0 ? 0 : 0.48;
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), blossomMat);
      bloom.position.set(Math.cos(ang) * r, 1.78 + (i === 0 ? 0.18 : 0), Math.sin(ang) * r);
      canopyGroup.add(bloom);
    }
    group.add(canopyGroup);

    const almondLight = new THREE.PointLight(0xfff0c9, isFinalePlaza ? 3.1 : 2.6, 17);
    almondLight.position.set(0, 2.15, 0);
    group.add(almondLight);

    return { group, canopyGroup, almondLight };
  }

  // 21. Song of Songs 2:4 (#5 "the banner") — Banqueting House & Crimson-Gold Banner of Love
  createSong2BannerOfLoveEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#69472b',
      accentColor: '#cfa166',
      roughness: 0.76,
      map: propTex
    });
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0xb83748,
      emissive: 0x85202d,
      emissiveIntensity: 0.85,
      roughness: 0.42,
      side: THREE.DoubleSide
    });

    for (const px of [-0.95, 0.95]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.45, 12), woodMat);
      post.position.set(px, 1.22, 0);
      post.userData.keepWithGlb = true;
      group.add(post);
    }

    const bannerCanopy = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.15, 0.18, 1.35, 8, 2, 6), 0.03, 3.6),
      bannerMat
    );
    bannerCanopy.position.set(0, 2.38, 0);
    bannerCanopy.userData.keepWithGlb = true;
    group.add(bannerCanopy);

    const bannerLight = new THREE.PointLight(0xffd699, isFinalePlaza ? 2.9 : 2.4, 16);
    bannerLight.position.set(0, 1.95, 0);
    group.add(bannerLight);

    return { group, bannerCanopy, bannerLight };
  }

  // 22. Song of Songs 2:10–13 (#7 "the winter is past") — Carved Lattice Window, Blossoming Vine & Turtledoves
  createSong2WinterIsPastLatticeEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#82735e',
      accentColor: '#e6c995',
      roughness: 0.82,
      map: propTex
    });
    const bloomMat = new THREE.MeshStandardMaterial({
      color: 0xffd9e6,
      emissive: 0xd97596,
      emissiveIntensity: 0.75,
      roughness: 0.36
    });

    const archFrame = new THREE.Mesh(new THREE.BoxGeometry(1.85, 2.15, 0.34), stoneMat);
    archFrame.position.y = 1.08;
    archFrame.userData.keepWithGlb = true;
    group.add(archFrame);

    const blossomsGroup = new THREE.Group();
    blossomsGroup.userData.keepWithGlb = true;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 5) * Math.PI;
      const bud = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), bloomMat);
      bud.position.set(Math.cos(ang) * 0.72, 1.15 + Math.sin(ang) * 0.72, 0.22);
      blossomsGroup.add(bud);
    }
    group.add(blossomsGroup);

    const springLight = new THREE.PointLight(0xffe6b3, isFinalePlaza ? 2.9 : 2.4, 16);
    springLight.position.set(0, 1.75, 0.45);
    group.add(springLight);

    return { group, blossomsGroup, springLight };
  }

  // 23. Song of Songs 4:12 (#14 "the enclosed garden") — Walled Garden Fountain of Living Waters
  createSong4EnclosedGardenFountainEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6d5a',
      accentColor: '#e0c48e',
      roughness: 0.84,
      map: propTex
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x7be3f5,
      emissive: 0x2c8da1,
      emissiveIntensity: 1.05,
      roughness: 0.18
    });

    const gardenWall = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.22, 12, 28), stoneMat);
    gardenWall.rotation.x = Math.PI / 2;
    gardenWall.position.y = 0.24;
    gardenWall.userData.keepWithGlb = true;
    group.add(gardenWall);

    const tierFountain = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.65, 1.18, 18), stoneMat);
    tierFountain.position.y = 0.59;
    tierFountain.userData.keepWithGlb = true;
    group.add(tierFountain);

    const waterCrown = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 14), waterMat);
    waterCrown.position.y = 1.32;
    waterCrown.userData.keepWithGlb = true;
    group.add(waterCrown);

    const fountainLight = new THREE.PointLight(0xb8f4ff, isFinalePlaza ? 3.0 : 2.5, 16);
    fountainLight.position.set(0, 1.85, 0);
    group.add(fountainLight);

    return { group, waterCrown, fountainLight };
  }

  // 24. Song of Songs 8:6–7 (#29 "the seal") — Golden Signet Seal & Unquenchable Flame Over Many Waters
  createSong8ManyWatersSealFlameEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd873,
      emissive: 0xb87b16,
      emissiveIntensity: 0.95,
      roughness: 0.24,
      metalness: 0.88
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffdf7a,
      emissive: 0xff6e1a,
      emissiveIntensity: 1.6,
      roughness: 0.2
    });

    const signetRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.11, 14, 32), goldMat);
    signetRing.position.y = 1.25;
    signetRing.userData.keepWithGlb = true;
    group.add(signetRing);

    const sealFlame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.88, 14), flameMat);
    sealFlame.position.y = 1.28;
    sealFlame.userData.keepWithGlb = true;
    group.add(sealFlame);

    const sealLight = new THREE.PointLight(0xffc966, isFinalePlaza ? 3.2 : 2.7, 18);
    sealLight.position.set(0, 1.85, 0);
    group.add(sealLight);

    return { group, signetRing, sealFlame, sealLight };
  }

  // ============================================================================
  // DISTRICT XXII — NEW EVERY MORNING (LAMENTATIONS) BESPOKE ENSEMBLES
  // ============================================================================

  // 1. Lamentations 1:1 (#1 "how") — Empty Market Stall Arch, Stone Well with Rope & Solitary Lantern
  createLamentations1SolitaryCityWellEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5e554b',
      accentColor: '#c4ab82',
      roughness: 0.88,
      map: propTex
    });
    const ropeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c7c50',
      accentColor: '#dfc292',
      roughness: 0.82
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffdf8c,
      emissive: 0xff9424,
      emissiveIntensity: 1.45,
      roughness: 0.24
    });

    const wellCurb = new THREE.Mesh(
      this.displaceGeometry(new THREE.TorusGeometry(0.76, 0.22, 12, 24), 0.02, 3.4),
      stoneMat
    );
    wellCurb.rotation.x = Math.PI / 2;
    wellCurb.position.set(-0.35, 0.28, 0);
    wellCurb.userData.keepWithGlb = true;
    group.add(wellCurb);

    for (const px of [-0.95, 0.25]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.75, 0.16), stoneMat);
      post.position.set(px, 0.88, 0);
      post.userData.keepWithGlb = true;
      group.add(post);
    }
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.16, 0.2), stoneMat);
    crossBeam.position.set(-0.35, 1.78, 0);
    crossBeam.userData.keepWithGlb = true;
    group.add(crossBeam);

    const ropeGroup = new THREE.Group();
    ropeGroup.userData.keepWithGlb = true;
    const hangingRope = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.15, 8), ropeMat);
    hangingRope.position.set(-0.35, 1.12, 0);
    const coil = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.045, 8, 18), ropeMat);
    coil.rotation.x = Math.PI / 2;
    coil.position.set(-0.35, 0.48, 0.56);
    ropeGroup.add(hangingRope, coil);
    group.add(ropeGroup);

    const lanternFlame = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), flameMat);
    lanternFlame.position.set(0.68, 0.65, 0.22);
    lanternFlame.userData.keepWithGlb = true;
    group.add(lanternFlame);

    const wellLight = new THREE.PointLight(0xffd27d, isFinalePlaza ? 2.9 : 2.4, 15);
    wellLight.position.set(0.45, 1.45, 0.25);
    group.add(wellLight);

    return { group, ropeGroup, lanternFlame, wellLight };
  }

  // 2. Lamentations 2:19 (#10 "pour out your heart") — Overturned Earthenware Jar Pouring Water in the Night Watch
  createLamentations2PourOutWaterJarEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8f5536',
      accentColor: '#deb07e',
      roughness: 0.78,
      map: propTex
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x8ae6ff,
      emissive: 0x3596b5,
      emissiveIntensity: 1.15,
      roughness: 0.16,
      transparent: true,
      opacity: 0.88
    });

    const stoneSlab = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.38, 0.22, 24), clayMat);
    stoneSlab.position.y = 0.11;
    stoneSlab.userData.keepWithGlb = true;
    group.add(stoneSlab);

    const jarBody = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, 0.88, 16), clayMat);
    jarBody.position.set(-0.32, 0.92, 0);
    jarBody.rotation.z = -1.18;
    jarBody.userData.keepWithGlb = true;
    group.add(jarBody);

    const streamGroup = new THREE.Group();
    streamGroup.userData.keepWithGlb = true;
    const pourArc = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 0.82, 14), waterMat);
    pourArc.position.set(0.18, 0.56, 0);
    pourArc.rotation.z = -0.32;
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.06, 22), waterMat);
    pool.position.set(0.28, 0.24, 0);
    streamGroup.add(pourArc, pool);
    group.add(streamGroup);

    const watchLight = new THREE.PointLight(0xb8f2ff, isFinalePlaza ? 3.0 : 2.5, 16);
    watchLight.position.set(0.18, 1.55, 0.2);
    group.add(watchLight);

    return { group, streamGroup, watchLight };
  }

  // 3. Lamentations 3:22–23 (#14 "new every morning") — Dew-Wet Ruined Stones & Rising Golden Sun of Mercy
  createLamentations3NewEveryMorningDawnEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const rubbleMat = this.painterly.createPainterlyMaterial({
      baseColor: '#665a4c',
      accentColor: '#e6c687',
      roughness: 0.86,
      map: propTex
    });
    const dawnMat = new THREE.MeshStandardMaterial({
      color: 0xffea94,
      emissive: 0xffa826,
      emissiveIntensity: 1.55,
      roughness: 0.2
    });

    for (let i = 0; i < 5; i++) {
      const block = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.66, 0.44 + (i % 2) * 0.28, 0.54, 4, 4, 4), 0.03, 3.6),
        rubbleMat
      );
      const ang = (i / 5) * Math.PI * 1.4 - Math.PI * 0.7;
      block.position.set(Math.sin(ang) * 0.85, 0.26 + (i % 2) * 0.14, Math.cos(ang) * 0.55 - 0.2);
      block.rotation.y = ang * 0.5;
      block.userData.keepWithGlb = true;
      group.add(block);
    }

    const dawnSunGroup = new THREE.Group();
    dawnSunGroup.userData.keepWithGlb = true;
    const sunOrb = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 18), dawnMat);
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.045, 12, 32), dawnMat);
    dawnSunGroup.add(sunOrb, haloRing);
    dawnSunGroup.position.set(0, 1.48, -0.15);
    group.add(dawnSunGroup);

    const mercyLight = new THREE.PointLight(0xffe48c, isFinalePlaza ? 3.3 : 2.8, 18);
    mercyLight.position.set(0, 1.85, 0.2);
    group.add(mercyLight);

    return { group, dawnSunGroup, mercyLight };
  }

  // 4. Lamentations 5:21–22 (#30 "renew our days") — Restored Ten-String Lyre Against Broken Wall in Morning Light
  createLamentations5RestoredLyreDawnWallEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const wallMat = this.painterly.createPainterlyMaterial({
      baseColor: '#736452',
      accentColor: '#e3c388',
      roughness: 0.86,
      map: propTex
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#784e2b',
      accentColor: '#dfb06d',
      roughness: 0.68
    });
    const goldStringMat = new THREE.MeshStandardMaterial({
      color: 0xffdf82,
      emissive: 0xc4871e,
      emissiveIntensity: 0.95,
      roughness: 0.25,
      metalness: 0.85
    });

    const brokenWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.95, 1.18, 0.62, 6, 4, 4), 0.03, 3.6),
      wallMat
    );
    brokenWall.position.set(0, 0.59, -0.25);
    brokenWall.userData.keepWithGlb = true;
    group.add(brokenWall);

    const lyreGroup = new THREE.Group();
    lyreGroup.userData.keepWithGlb = true;
    const soundbox = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.36, 0.18), woodMat);
    soundbox.position.y = 0.82;
    for (const lx of [-0.28, 0.28]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.72, 10), woodMat);
      arm.position.set(lx, 1.28, 0);
      arm.rotation.z = lx < 0 ? 0.15 : -0.15;
      lyreGroup.add(arm);
    }
    const yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.78, 10), woodMat);
    yoke.rotation.z = Math.PI / 2;
    yoke.position.set(0, 1.62, 0);
    lyreGroup.add(soundbox, yoke);

    for (let s = -2; s <= 2; s++) {
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.66, 6), goldStringMat);
      str.position.set(s * 0.09, 1.28, 0);
      lyreGroup.add(str);
    }
    lyreGroup.position.set(0, 0.35, 0.16);
    group.add(lyreGroup);

    const renewLight = new THREE.PointLight(0xffe696, isFinalePlaza ? 3.2 : 2.7, 17);
    renewLight.position.set(0, 1.95, 0.35);
    group.add(renewLight);

    return { group, lyreGroup, renewLight };
  }

  // ============================================================================
  // DISTRICT XXV — A DOOR OF HOPE (HOSEA, JOEL, AMOS & OBADIAH) BESPOKE ENSEMBLES
  // ============================================================================

  // 1. Hosea 2:15 (#6 "a door of hope") — Valley of Achor Cleft Rock Pass, Sunlit Vineyard Shoot & Threshold Table
  createHosea2ValleyOfAchorDoorEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const cliffMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6b53',
      accentColor: '#ebd59b',
      roughness: 0.88,
      map: propTex
    });
    const vineMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c7838',
      accentColor: '#e8d868',
      roughness: 0.72
    });
    const dawnMat = new THREE.MeshStandardMaterial({
      color: 0xfff0b3,
      emissive: 0xffb838,
      emissiveIntensity: 1.5,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });

    // Twin cleft limestone crags framing the narrow Door of Hope pass
    for (const side of [-1, 1]) {
      const crag = new THREE.Mesh(
        this.displaceGeometry(new THREE.ConeGeometry(0.88, 2.75, 9), 0.08, 3.2),
        cliffMat
      );
      crag.position.set(side * 1.05, 1.35, -0.35);
      crag.rotation.z = side * -0.12;
      crag.userData.keepWithGlb = true;
      group.add(crag);
    }

    // Golden sun-portal glowing in the cleft between the rocks
    const doorPortalGroup = new THREE.Group();
    doorPortalGroup.userData.keepWithGlb = true;
    const portalDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.65, 2.15, 16), dawnMat);
    portalDisc.scale.set(0.75, 1.0, 0.22);
    portalDisc.position.set(0, 1.15, -0.45);
    doorPortalGroup.add(portalDisc);
    group.add(doorPortalGroup);

    // Young sunlit grapevine shoot & stone threshold table with grain platter and clay jar
    const vineGroup = new THREE.Group();
    vineGroup.userData.keepWithGlb = true;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.048, 1.32, 8), vineMat);
    stem.position.set(0.32, 0.66, 0.35);
    vineGroup.add(stem);
    for (let l = 0; l < 6; l++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), vineMat);
      leaf.scale.set(1.2, 0.45, 1.0);
      leaf.position.set(0.32 + Math.sin(l * 1.4) * 0.18, 0.45 + l * 0.16, 0.35 + Math.cos(l * 1.4) * 0.14);
      vineGroup.add(leaf);
    }
    group.add(vineGroup);

    const tableStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.95, 0.42, 0.68, 4, 3, 4), 0.025, 3.5),
      cliffMat
    );
    tableStone.position.set(-0.62, 0.21, 0.48);
    tableStone.userData.keepWithGlb = true;
    group.add(tableStone);

    const doorLight = new THREE.PointLight(0xffe69c, isFinalePlaza ? 3.3 : 2.8, 18);
    doorLight.position.set(0, 1.75, 0.2);
    group.add(doorLight);

    return { group, doorPortalGroup, vineGroup, doorLight };
  }

  // 2. Hosea 14:4–7 (#16 "like the dew") — Dew-Covered White Lily, Gnarled Olive Tree & Morning Dewdrops
  createHosea14DewLilyAndOliveEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#786d58',
      accentColor: '#e0d0ad',
      roughness: 0.88,
      map: propTex
    });
    const stemMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4e6642',
      accentColor: '#b8cfa0',
      roughness: 0.74
    });
    const petalMat = new THREE.MeshStandardMaterial({
      color: 0xfcf9ef,
      emissive: 0xd9cfa8,
      emissiveIntensity: 0.45,
      roughness: 0.28
    });
    const dewMat = new THREE.MeshStandardMaterial({
      color: 0xe6f9ff,
      emissive: 0x8ad4eb,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      transparent: true,
      opacity: 0.9
    });

    const cairnBase = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.15, 1.32, 0.26, 20), 0.025, 3.4),
      stoneMat
    );
    cairnBase.position.y = 0.13;
    cairnBase.userData.keepWithGlb = true;
    group.add(cairnBase);

    const lilyGroup = new THREE.Group();
    lilyGroup.userData.keepWithGlb = true;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.055, 1.25, 10), stemMat);
    stalk.position.y = 0.72;
    lilyGroup.add(stalk);

    // 6 sculpted white lily petals opening in a trumpet crown
    for (let p = 0; p < 6; p++) {
      const ang = (p / 6) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.56, 8), petalMat);
      petal.scale.set(0.85, 1.0, 0.28);
      petal.position.set(Math.cos(ang) * 0.22, 1.38, Math.sin(ang) * 0.22);
      petal.rotation.z = -Math.cos(ang) * 0.72;
      petal.rotation.x = Math.sin(ang) * 0.72;
      lilyGroup.add(petal);

      const dewdrop = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), dewMat);
      dewdrop.position.set(Math.cos(ang) * 0.34, 1.42 + (p % 2) * 0.06, Math.sin(ang) * 0.34);
      lilyGroup.add(dewdrop);
    }
    group.add(lilyGroup);

    const dewLight = new THREE.PointLight(0xfff4cc, isFinalePlaza ? 3.1 : 2.6, 16);
    dewLight.position.set(0, 1.85, 0.25);
    group.add(dewLight);

    return { group, lilyGroup, dewLight };
  }

  // 3. Joel 2:25–26 (#23 "the years the locust ate") — Restored Harvest Basket of Figs, Grapes, Bread Loaves & Oil Jar
  createJoel2RestoredHarvestBasketEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e583f',
      accentColor: '#d9be8c',
      roughness: 0.85,
      map: propTex
    });
    const wickerMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c6b43',
      accentColor: '#edd49f',
      roughness: 0.8
    });
    const figMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4f3854',
      accentColor: '#b58ea8',
      roughness: 0.62
    });
    const goldGrainMat = new THREE.MeshStandardMaterial({
      color: 0xf7dc88,
      emissive: 0xc49228,
      emissiveIntensity: 0.75,
      roughness: 0.35
    });

    const tableBench = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.95, 0.52, 0.92, 6, 3, 4), 0.02, 3.2),
      woodMat
    );
    tableBench.position.set(0, 0.26, 0);
    tableBench.userData.keepWithGlb = true;
    group.add(tableBench);

    const basketGroup = new THREE.Group();
    basketGroup.userData.keepWithGlb = true;
    const basketBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.42, 0.38, 18), wickerMat);
    basketBowl.position.set(-0.28, 0.71, 0);
    basketGroup.add(basketBowl);

    for (let f = 0; f < 7; f++) {
      const ang = (f / 7) * Math.PI * 2;
      const fig = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), f % 2 === 0 ? figMat : goldGrainMat);
      fig.position.set(-0.28 + Math.cos(ang) * 0.26, 0.94 + (f % 2) * 0.06, Math.sin(ang) * 0.24);
      basketGroup.add(fig);
    }

    // Tall earthenware oil & new-wine amphora beside the overflowing basket
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.28, 0.78, 16), wickerMat);
    jar.position.set(0.54, 0.91, -0.05);
    basketGroup.add(jar);
    group.add(basketGroup);

    const harvestLight = new THREE.PointLight(0xffe396, isFinalePlaza ? 3.2 : 2.7, 17);
    harvestLight.position.set(0, 1.85, 0.3);
    group.add(harvestLight);

    return { group, basketGroup, harvestLight };
  }

  // 4. Amos 7:7–8 (#33 "the plumb line") — Ashlar Stone Wall, Wooden Bracket, Cord & Suspended Lead Plumb Bob
  createAmos7PlumbLineWallEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e9278',
      accentColor: '#e6d9b8',
      roughness: 0.88,
      map: propTex
    });
    const beamMat = this.painterly.createPainterlyMaterial({
      baseColor: '#695036',
      accentColor: '#c9a677',
      roughness: 0.82
    });
    const leadMat = new THREE.MeshStandardMaterial({
      color: 0x6e7882,
      emissive: 0x3b4854,
      emissiveIntensity: 0.65,
      roughness: 0.28,
      metalness: 0.85
    });

    const wall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.15, 2.35, 0.95, 6, 8, 6), 0.025, 3.6),
      stoneMat
    );
    wall.position.set(0.38, 1.18, -0.15);
    wall.userData.keepWithGlb = true;
    group.add(wall);

    const bracketBeam = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.14, 0.14), beamMat);
    bracketBeam.position.set(-0.18, 2.18, -0.15);
    bracketBeam.userData.keepWithGlb = true;
    group.add(bracketBeam);

    const plumbGroup = new THREE.Group();
    plumbGroup.position.set(-0.48, 2.18, -0.15);
    plumbGroup.userData.keepWithGlb = true;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.42, 8), beamMat);
    cord.position.y = -0.71;
    const bob = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 16), leadMat);
    bob.rotation.x = Math.PI;
    bob.position.y = -1.55;
    plumbGroup.add(cord, bob);
    group.add(plumbGroup);

    const plumbLight = new THREE.PointLight(0xffebb3, isFinalePlaza ? 3.1 : 2.6, 16);
    plumbLight.position.set(-0.35, 1.65, 0.35);
    group.add(plumbLight);

    return { group, plumbGroup, plumbLight };
  }

  // ============================================================================
  // DISTRICT XXVII (MICAH – MALACHI): THE DAY OF SMALL THINGS — BESPOKE ENSEMBLES
  // ============================================================================

  // 1. Micah 4:3–4 (#3 "under the fig tree") — Broad-Leaved Fig Tree, Dry-Laid Terrace Wall, Rough-Hewn Wooden Stool & Terracotta Water Pitcher
  createMicah4FigTreeStoolAndPitcherEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a69a83',
      accentColor: '#e8dabb',
      roughness: 0.88,
      map: propTex
    });
    const barkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#695845',
      accentColor: '#c9b495',
      roughness: 0.85,
      map: propTex
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4a573b',
      accentColor: '#9fb079',
      roughness: 0.65
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c694a',
      accentColor: '#deb992',
      roughness: 0.72
    });
    const figGoldMat = new THREE.MeshStandardMaterial({
      color: 0xc2cf70,
      emissive: 0x7e8c2b,
      emissiveIntensity: 0.65,
      roughness: 0.38
    });

    // Dry-laid Judean terrace stone wall behind the stool
    const terraceWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.15, 1.25, 0.48, 8, 5, 4), 0.032, 3.6),
      stoneMat
    );
    terraceWall.position.set(-0.22, 0.62, -0.42);
    terraceWall.userData.keepWithGlb = true;
    group.add(terraceWall);

    // Gnarled fig tree trunk & overarching canopy on the right
    const treeGroup = new THREE.Group();
    treeGroup.position.set(0.68, 0, -0.18);
    treeGroup.userData.keepWithGlb = true;

    const trunk = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.24, 0.36, 2.25, 12, 6), 0.025, 3.4),
      barkMat
    );
    trunk.position.y = 1.12;
    treeGroup.add(trunk);

    const canopyPositions = [
      [0, 2.25, 0, 0.92],
      [-0.65, 2.08, 0.25, 0.78],
      [-1.18, 1.92, 0.35, 0.68],
      [0.42, 2.15, 0.22, 0.72]
    ];
    for (const [cx, cy, cz, cr] of canopyPositions) {
      const bough = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(cr, 12, 10), 0.04, 2.8),
        leafMat
      );
      bough.scale.set(1.25, 0.68, 1.15);
      bough.position.set(cx, cy, cz);
      treeGroup.add(bough);
    }

    // Green-gold figs hanging under the boughs
    for (let f = 0; f < 5; f++) {
      const fig = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 8), figGoldMat);
      fig.position.set(-0.85 + f * 0.28, 1.65 + (f % 2) * 0.12, 0.28);
      treeGroup.add(fig);
    }
    group.add(treeGroup);

    // Four-legged rough-hewn wooden stool with stretchers in the shade
    const stoolGroup = new THREE.Group();
    stoolGroup.position.set(-0.28, 0, 0.16);
    stoolGroup.userData.keepWithGlb = true;
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.56), barkMat);
    seat.position.y = 0.52;
    stoolGroup.add(seat);
    for (const [lx, lz] of [[-0.28, -0.20], [0.28, -0.20], [-0.28, 0.20], [0.28, 0.20]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.52, 8), barkMat);
      leg.position.set(lx, 0.26, lz);
      stoolGroup.add(leg);
    }
    group.add(stoolGroup);

    // Round-bellied terracotta water pitcher beside the trunk
    const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.64, 16), clayMat);
    pitcher.position.set(0.32, 0.32, 0.24);
    pitcher.userData.keepWithGlb = true;
    group.add(pitcher);

    const shadeLight = new THREE.PointLight(0xffeab3, isFinalePlaza ? 3.1 : 2.6, 17);
    shadeLight.position.set(-0.15, 1.78, 0.42);
    group.add(shadeLight);

    return { group, treeGroup, stoolGroup, shadeLight };
  }

  // 2. Habakkuk 2:1–3 (#12 "the watchtower") — Creneled Stone Watchtower Parapet, Tattered Blue Pennant, Staff, Clay Tablets & Earthen Jar
  createHabakkuk2WatchtowerParapetEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d806d',
      accentColor: '#e2d2b8',
      roughness: 0.88,
      map: propTex
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#634d36',
      accentColor: '#c9a97c',
      roughness: 0.82
    });
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0x3b526b,
      emissive: 0x22344a,
      emissiveIntensity: 0.55,
      roughness: 0.62,
      side: THREE.DoubleSide
    });
    const tabletMat = new THREE.MeshStandardMaterial({
      color: 0xf5e2b8,
      emissive: 0xc4943d,
      emissiveIntensity: 0.72,
      roughness: 0.42
    });

    // Stepped stone watchtower parapet & battlements
    const basePlatform = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.15, 0.44, 1.48, 6, 3, 5), 0.025, 3.4),
      stoneMat
    );
    basePlatform.position.y = 0.22;
    basePlatform.userData.keepWithGlb = true;
    group.add(basePlatform);

    const parapetWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.92, 1.18, 0.46, 8, 5, 4), 0.028, 3.6),
      stoneMat
    );
    parapetWall.position.set(0, 0.98, -0.36);
    parapetWall.userData.keepWithGlb = true;
    group.add(parapetWall);

    // Narrow embrasure turret on the left
    const turret = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.68, 2.05, 0.62, 5, 7, 5), 0.028, 3.5),
      stoneMat
    );
    turret.position.set(-0.68, 1.24, -0.34);
    turret.userData.keepWithGlb = true;
    group.add(turret);

    // Tall lance pole & tattered indigo-blue watchman pennant
    const bannerGroup = new THREE.Group();
    bannerGroup.position.set(-0.56, 2.24, -0.34);
    bannerGroup.userData.keepWithGlb = true;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 1.28, 8), woodMat);
    pole.position.y = 0.58;
    pole.rotation.z = -0.14;
    const pennant = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.36, 6, 3), bannerMat);
    pennant.position.set(0.36, 0.96, 0);
    bannerGroup.add(pole, pennant);
    group.add(bannerGroup);

    // Inscribed vision tablets & scroll laid on the right merlon ledge ("Write the vision, and make it plain on tablets")
    const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.32), tabletMat);
    tablet.position.set(0.48, 1.60, -0.34);
    tablet.rotation.y = 0.18;
    tablet.userData.keepWithGlb = true;
    group.add(tablet);

    // Watchman's wooden staff & water jar resting against the inside of the parapet
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 1.42, 8), woodMat);
    staff.position.set(-0.12, 1.05, -0.08);
    staff.rotation.z = -0.16;
    staff.userData.keepWithGlb = true;
    group.add(staff);

    const watchLight = new THREE.PointLight(0xffdfa0, isFinalePlaza ? 3.1 : 2.6, 17);
    watchLight.position.set(0.25, 1.95, 0.35);
    group.add(watchLight);

    return { group, bannerGroup, watchLight };
  }

  // 3. Zechariah 4:1–6 (#28 "seven lamps") — Seven-Branched Golden Menorah Lampstand Flanked by Two Olive Trees Pouring Living Gold Oil
  createZechariah4SevenLampsAndOliveTreesEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf7d368,
      emissive: 0xc78d1e,
      emissiveIntensity: 0.92,
      roughness: 0.22,
      metalness: 0.88
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xfff8cc,
      emissive: 0xffb833,
      emissiveIntensity: 1.75,
      roughness: 0.15
    });
    const barkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c523e',
      accentColor: '#baa87c',
      roughness: 0.86,
      map: propTex
    });
    const oliveLeafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4d573d',
      accentColor: '#b5ba82',
      roughness: 0.65
    });

    // Central seven-branched golden lampstand (menorah)
    const lampstandGroup = new THREE.Group();
    lampstandGroup.userData.keepWithGlb = true;

    // Stepped ornate golden pedestal base & central shaft
    const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.46, 0.16, 24), goldMat);
    base1.position.y = 0.08;
    const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.30, 0.22, 20), goldMat);
    base2.position.y = 0.26;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 1.36, 16), goldMat);
    shaft.position.y = 0.98;
    lampstandGroup.add(base1, base2, shaft);

    // Three concentric semicircular golden branches (6 outer + 1 center = 7 lamps)
    for (const radius of [0.24, 0.46, 0.68]) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.032, 10, 28, Math.PI), goldMat);
      arc.rotation.z = Math.PI;
      arc.position.y = 1.66;
      lampstandGroup.add(arc);
    }

    const flamesGroup = new THREE.Group();
    flamesGroup.userData.keepWithGlb = true;
    const lampOffsets = [-0.68, -0.46, -0.24, 0, 0.24, 0.46, 0.68];
    for (const lx of lampOffsets) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.036, 0.09, 14), goldMat);
      cup.position.set(lx, 1.68, 0);
      lampstandGroup.add(cup);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.15, 10), flameMat);
      flame.position.set(lx, 1.80, 0);
      flamesGroup.add(flame);
    }
    lampstandGroup.add(flamesGroup);
    group.add(lampstandGroup);

    // Two gnarled olive trees flanking left and right, dripping golden threads of oil without pressing
    for (const side of [-1, 1]) {
      const tree = new THREE.Group();
      tree.position.set(side * 1.18, 0, -0.14);
      tree.userData.keepWithGlb = true;

      const trunk = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.18, 0.28, 2.05, 10, 6), 0.028, 3.6),
        barkMat
      );
      trunk.position.y = 1.02;
      trunk.rotation.z = -side * 0.14;
      tree.add(trunk);

      const crown = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.68, 12, 10), 0.035, 3.0),
        oliveLeafMat
      );
      crown.scale.set(1.15, 0.78, 0.95);
      crown.position.set(-side * 0.24, 2.05, 0.05);
      tree.add(crown);

      // Golden oil stream threads pouring directly from the olive boughs toward the bowl
      for (const streamOffset of [-0.14, 0.12]) {
        const oilThread = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 1.18, 8), flameMat);
        oilThread.position.set(-side * 0.34 + streamOffset, 1.32, 0.08);
        tree.add(oilThread);
      }
      group.add(tree);
    }

    const menorahLight = new THREE.PointLight(0xffe680, isFinalePlaza ? 3.5 : 3.0, 18);
    menorahLight.position.set(0, 1.95, 0.35);
    group.add(menorahLight);

    return { group, lampstandGroup, flamesGroup, menorahLight };
  }

  // 4. Malachi 3:14–17 (#38 "a book of memory") — Wooden Table with Unrolled Scroll of Remembrance, Two Clay Fellowship Cups & Lit Oil Lamp
  createMalachi3BookOfRemembranceEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const tableMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b5539',
      accentColor: '#cfb182',
      roughness: 0.84,
      map: propTex
    });
    const parchmentMat = new THREE.MeshStandardMaterial({
      color: 0xf7e7be,
      emissive: 0xc29238,
      emissiveIntensity: 0.72,
      roughness: 0.42
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d7a5e',
      accentColor: '#dfd0b0',
      roughness: 0.74
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xfff5bf,
      emissive: 0xffaa2b,
      emissiveIntensity: 1.65,
      roughness: 0.2
    });

    // Heavy wooden table by the window ledge
    const tableTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.95, 0.14, 1.12, 6, 2, 5), 0.015, 3.2),
      tableMat
    );
    tableTop.position.set(0, 0.78, 0);
    tableTop.userData.keepWithGlb = true;
    group.add(tableTop);

    for (const [lx, lz] of [[-0.78, -0.38], [0.78, -0.38], [-0.78, 0.38], [0.78, 0.38]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.78, 0.12), tableMat);
      leg.position.set(lx, 0.39, lz);
      leg.userData.keepWithGlb = true;
      group.add(leg);
    }

    // Unrolled double-roller parchment Book of Remembrance
    const scrollGroup = new THREE.Group();
    scrollGroup.position.set(-0.24, 0.88, -0.04);
    scrollGroup.rotation.y = 0.28;
    scrollGroup.userData.keepWithGlb = true;

    const parchmentSheet = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.03, 0.62), parchmentMat);
    scrollGroup.add(parchmentSheet);

    for (const rx of [-0.40, 0.40]) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.76, 14), tableMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(rx, 0.04, 0);
      scrollGroup.add(roller);
    }
    group.add(scrollGroup);

    // Two handleless clay conversation cups side by side ("those who feared Yahweh spoke one with another")
    for (const [cx, cz] of [[0.28, 0.24], [0.54, 0.20]]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.068, 0.16, 14), clayMat);
      cup.position.set(cx, 0.93, cz);
      cup.userData.keepWithGlb = true;
      group.add(cup);
    }

    // Small terracotta spouted oil lamp & saucer with warm living flame
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0.62, 0.88, -0.18);
    lampGroup.userData.keepWithGlb = true;
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, 0.04, 16), clayMat);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.06, 0.08, 16), clayMat);
    bowl.position.y = 0.05;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.14, 10), flameMat);
    flame.position.set(-0.02, 0.15, 0);
    lampGroup.add(saucer, bowl, flame);
    group.add(lampGroup);

    const memoryLight = new THREE.PointLight(0xffe49e, isFinalePlaza ? 3.1 : 2.6, 16);
    memoryLight.position.set(0.35, 1.55, 0.25);
    group.add(memoryLight);

    return { group, scrollGroup, lampGroup, memoryLight };
  }

  // ============================================================================
  // DISTRICT XXXIII (ROMANS): NOTHING CAN SEPARATE — BESPOKE ENSEMBLES
  // ============================================================================

  // 1. Romans 5:1–2 (#9 "where we stand") — Open Iron-Studded Wooden Door, Hanging Chain Oil Lamp, Table with Pitcher & Sunlit Courtyard Fountain
  createRomans5OpenDoorOfGraceCourtyardEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a7060',
      accentColor: '#dfd2b5',
      roughness: 0.88,
      map: propTex
    });
    const oakMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c452d',
      accentColor: '#c9a675',
      roughness: 0.82,
      map: propTex
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#857056',
      accentColor: '#dec8a4',
      roughness: 0.74
    });
    const sunBeamMat = new THREE.MeshStandardMaterial({
      color: 0xfff3c4,
      emissive: 0xd9a038,
      emissiveIntensity: 0.92,
      roughness: 0.28,
      transparent: true,
      opacity: 0.85
    });

    // Stone doorway frame (left & right jambs + lintel + threshold step)
    const threshold = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.15, 0.20, 0.86, 6, 2, 4), 0.02, 3.2),
      stoneMat
    );
    threshold.position.set(0.15, 0.10, -0.15);
    threshold.userData.keepWithGlb = true;
    group.add(threshold);

    for (const jx of [-0.62, 0.92]) {
      const jamb = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.32, 2.45, 0.42, 4, 8, 4), 0.025, 3.5),
        stoneMat
      );
      jamb.position.set(jx, 1.25, -0.15);
      jamb.userData.keepWithGlb = true;
      group.add(jamb);
    }

    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.96, 0.32, 0.46, 6, 3, 4), 0.025, 3.5),
      stoneMat
    );
    lintel.position.set(0.15, 2.52, -0.15);
    lintel.userData.keepWithGlb = true;
    group.add(lintel);

    // Heavy iron-studded wooden door swung wide open inward ("a door that doesn't close behind you")
    const doorGroup = new THREE.Group();
    doorGroup.position.set(-0.46, 0.20, -0.05);
    doorGroup.rotation.y = 0.92;
    doorGroup.userData.keepWithGlb = true;
    const doorSlab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.18, 0.10), oakMat);
    doorSlab.position.set(0.47, 1.09, 0);
    doorGroup.add(doorSlab);
    group.add(doorGroup);

    // Sunlit stone courtyard fountain basin beyond the open doorway
    const fountainGroup = new THREE.Group();
    fountainGroup.position.set(0.28, 0, -0.82);
    fountainGroup.userData.keepWithGlb = true;
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.56, 14), stoneMat);
    pedestal.position.y = 0.28;
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.32, 0.26, 18), stoneMat);
    basin.position.y = 0.64;
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.38, 12), sunBeamMat);
    spout.position.y = 0.88;
    fountainGroup.add(pedestal, basin, spout);
    group.add(fountainGroup);

    // Wooden side table on the left with terracotta water pitcher & folded linen cloth
    const sideTable = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 0.54), oakMat);
    sideTable.position.set(-0.96, 0.32, 0.32);
    sideTable.userData.keepWithGlb = true;
    group.add(sideTable);

    const pitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.19, 0.46, 14), clayMat);
    pitcher.position.set(-0.96, 0.86, 0.32);
    pitcher.userData.keepWithGlb = true;
    group.add(pitcher);

    const graceLight = new THREE.PointLight(0xffe8a3, isFinalePlaza ? 3.2 : 2.7, 17);
    graceLight.position.set(0.18, 1.92, 0.25);
    group.add(graceLight);

    return { group, doorGroup, fountainGroup, graceLight };
  }

  // 2. Romans 8:15–16 (#19 "Abba") — Sunlit Stone Threshold Step with Child's & Father's Sandals Side by Side, Clay Water Jar & Folded Linen
  createRomans8AbbaThresholdSandalsEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a6987e',
      accentColor: '#efe2c5',
      roughness: 0.88,
      map: propTex
    });
    const leatherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#755336',
      accentColor: '#d4ab7d',
      roughness: 0.76
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c8b70',
      accentColor: '#e8d9bc',
      roughness: 0.72
    });

    // Broad sunlit limestone threshold step
    const stepStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.18, 0.38, 1.16, 8, 3, 5), 0.022, 3.4),
      stoneMat
    );
    stepStone.position.set(0, 0.19, 0);
    stepStone.userData.keepWithGlb = true;
    group.add(stepStone);

    // Doorjamb posts framing the threshold
    for (const jx of [-0.96, 0.96]) {
      const post = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.28, 1.85, 0.36, 4, 6, 4), 0.02, 3.2),
        stoneMat
      );
      post.position.set(jx, 1.10, -0.34);
      post.userData.keepWithGlb = true;
      group.add(post);
    }

    const sandalsGroup = new THREE.Group();
    sandalsGroup.userData.keepWithGlb = true;

    // Helper to build a sculpted leather sandal with sole & straps
    const makeSandal = (scale, x, z, rotY) => {
      const s = new THREE.Group();
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.22 * scale, 0.035, 0.48 * scale), leatherMat);
      const strap1 = new THREE.Mesh(new THREE.TorusGeometry(0.10 * scale, 0.018 * scale, 8, 16, Math.PI), leatherMat);
      strap1.position.set(0, 0.02, 0.06 * scale);
      const strap2 = new THREE.Mesh(new THREE.TorusGeometry(0.10 * scale, 0.018 * scale, 8, 16, Math.PI), leatherMat);
      strap2.position.set(0, 0.02, -0.08 * scale);
      s.add(sole, strap1, strap2);
      s.position.set(x, 0.40, z);
      s.rotation.y = rotY;
      return s;
    };

    // Small child's sandals on the left + father's larger sandals beside them on the stone step
    sandalsGroup.add(
      makeSandal(0.68, -0.58, 0.12, 0.06),
      makeSandal(0.68, -0.34, 0.12, -0.04),
      makeSandal(1.08, -0.02, 0.08, 0.08),
      makeSandal(1.08, 0.30, 0.08, -0.05)
    );
    group.add(sandalsGroup);

    // Round-bellied clay water jar & folded linen towel on the right side of the threshold
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.58, 16), clayMat);
    jar.position.set(0.68, 0.67, -0.08);
    jar.userData.keepWithGlb = true;
    group.add(jar);

    const adoptionLight = new THREE.PointLight(0xffeac2, isFinalePlaza ? 3.1 : 2.6, 16);
    adoptionLight.position.set(0, 1.75, 0.32);
    group.add(adoptionLight);

    return { group, sandalsGroup, adoptionLight };
  }

  // 3. Romans 8:38–39 (#25 "nothing") — Coastal Parapet Table Under Starry Sky & Dawn Horizon with Unrolled Letter Scroll, Lit Clay Lamp & Amphora
  createRomans8NothingCanSeparateParapetEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c5547',
      accentColor: '#c9b38c',
      roughness: 0.88,
      map: propTex
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5e4831',
      accentColor: '#c7a477',
      roughness: 0.82
    });
    const parchmentMat = new THREE.MeshStandardMaterial({
      color: 0xf7e7be,
      emissive: 0xc49238,
      emissiveIntensity: 0.78,
      roughness: 0.38
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xfff5c0,
      emissive: 0xffaa2b,
      emissiveIntensity: 1.75,
      roughness: 0.18
    });

    // Low stone coastal terrace parapet wall overlooking the sea & stars
    const parapet = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.25, 0.68, 0.44, 8, 4, 4), 0.025, 3.5),
      stoneMat
    );
    parapet.position.set(0, 0.34, -0.46);
    parapet.userData.keepWithGlb = true;
    group.add(parapet);

    // Round wooden writing table beside the parapet
    const tableGroup = new THREE.Group();
    tableGroup.position.set(-0.28, 0, 0.12);
    tableGroup.userData.keepWithGlb = true;

    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.08, 20), woodMat);
    tableTop.position.y = 0.76;
    tableGroup.add(tableTop);

    for (const [lx, lz] of [[-0.36, -0.36], [0.36, -0.36], [-0.36, 0.36], [0.36, 0.36]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.76, 8), woodMat);
      leg.position.set(lx, 0.38, lz);
      tableGroup.add(leg);
    }

    // Unrolled Romans 8 parchment scroll, clay cup & glowing oil lamp on the table
    const scroll = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.025, 0.38), parchmentMat);
    scroll.position.set(-0.08, 0.82, 0.12);
    scroll.rotation.y = 0.32;
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.42, 12), parchmentMat);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(0.16, 0.83, 0.18);
    roller.rotation.z = 0.32;
    tableGroup.add(scroll, roller);

    const lampBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.07, 14), stoneMat);
    lampBowl.position.set(-0.18, 0.83, -0.18);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.15, 10), flameMat);
    flame.position.set(-0.18, 0.93, -0.18);
    tableGroup.add(lampBowl, flame);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.056, 0.14, 12), woodMat);
    cup.position.set(0.28, 0.87, 0.04);
    tableGroup.add(cup);
    group.add(tableGroup);

    // Terracotta planter amphora on the right side of the terrace
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.68, 16), stoneMat);
    planter.position.set(0.76, 0.34, 0.08);
    planter.userData.keepWithGlb = true;
    group.add(planter);

    const loveLight = new THREE.PointLight(0xffe08c, isFinalePlaza ? 3.4 : 2.9, 18);
    loveLight.position.set(-0.22, 1.65, 0.25);
    group.add(loveLight);

    return { group, tableGroup, loveLight };
  }

  // 4. Romans 11:17–24 (#30 "the olive tree") — Ancient Gnarled Olive Trunk with Bound Wild Olive Shoot Grafted In & Wicker Pruning Basket
  createRomans11GraftedOliveTreeEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const barkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#695e4e',
      accentColor: '#cfc2a9',
      roughness: 0.88,
      map: propTex
    });
    const cordMat = new THREE.MeshStandardMaterial({
      color: 0xd9bf8c,
      emissive: 0x8c6d32,
      emissiveIntensity: 0.55,
      roughness: 0.55
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#566347',
      accentColor: '#c2cc9b',
      roughness: 0.62
    });
    const wickerMat = this.painterly.createPainterlyMaterial({
      baseColor: '#786246',
      accentColor: '#d9c098',
      roughness: 0.82
    });

    // Ancient deep-rooted olive tree trunk ("it is not you who support the root, but the root supports you")
    const trunk = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.42, 0.64, 2.35, 14, 8), 0.042, 3.6),
      barkMat
    );
    trunk.position.set(0, 1.18, -0.12);
    trunk.userData.keepWithGlb = true;
    group.add(trunk);

    // Grafted wild olive branch bound tightly to the trunk with hemp twine
    const graftGroup = new THREE.Group();
    graftGroup.position.set(0.06, 0.85, 0.32);
    graftGroup.userData.keepWithGlb = true;

    const scionStem = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.72, 10), barkMat);
    scionStem.rotation.z = -0.10;
    graftGroup.add(scionStem);

    // Five wraps of hemp grafting twine binding the wild shoot into the ancient trunk
    for (let w = 0; w < 5; w++) {
      const twine = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.016, 8, 20), cordMat);
      twine.rotation.x = Math.PI / 2 + (w % 2 === 0 ? 0.14 : -0.14);
      twine.position.y = -0.16 + w * 0.08;
      graftGroup.add(twine);
    }

    // Living green-silver olive shoots & leaves springing upward from the graft
    for (const [lx, ly, rotZ] of [[-0.18, 0.62, 0.38], [0, 0.78, -0.05], [0.20, 0.58, -0.42]]) {
      const shoot = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.58, 10), leafMat);
      shoot.position.set(lx, ly, 0.05);
      shoot.rotation.z = rotZ;
      graftGroup.add(shoot);
    }
    group.add(graftGroup);

    // Wicker basket of olive twigs & terracotta oil jar on the left
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 0.34, 16), wickerMat);
    basket.position.set(-0.78, 0.17, 0.18);
    basket.userData.keepWithGlb = true;
    group.add(basket);

    const graftLight = new THREE.PointLight(0xffebb5, isFinalePlaza ? 3.2 : 2.7, 17);
    graftLight.position.set(0.12, 1.75, 0.48);
    group.add(graftLight);

    return { group, graftGroup, graftLight };
  }

  // ============================================================================
  // DISTRICT XXXIV (1 & 2 CORINTHIANS): TREASURE IN CLAY JARS — BESPOKE ENSEMBLES
  // ============================================================================

  // 1. 1 Corinthians 11:21–26 (#15 "wait for one another") — Low Wooden Communion Table Surrounded by Floor Cushions with Broken Loaf & Clay Chalice
  createCorinthians11CommunionTableAndCushionsEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#66523b',
      accentColor: '#c9ab80',
      roughness: 0.84,
      map: propTex
    });
    const cushionMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c8c72',
      accentColor: '#e6d7ba',
      roughness: 0.78
    });
    const breadMat = new THREE.MeshStandardMaterial({
      color: 0xe6be7e,
      emissive: 0xa6742b,
      emissiveIntensity: 0.65,
      roughness: 0.55
    });
    const cupMat = this.painterly.createPainterlyMaterial({
      baseColor: '#825638',
      accentColor: '#d99e6c',
      roughness: 0.68
    });

    // Low Corinthian fellowship wooden table
    const tableGroup = new THREE.Group();
    tableGroup.userData.keepWithGlb = true;
    const plankTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.68, 0.09, 1.12, 6, 2, 5), 0.015, 3.2),
      woodMat
    );
    plankTop.position.y = 0.42;
    tableGroup.add(plankTop);

    for (const [lx, lz] of [[-0.68, -0.42], [0.68, -0.42], [-0.68, 0.42], [0.68, 0.42]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), woodMat);
      leg.position.set(lx, 0.21, lz);
      tableGroup.add(leg);
    }

    // Broken loaf of bread & footed terracotta chalice in the center ("remember him by leaving room")
    const loafHalf1 = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.17, 12, 10), 0.02, 3.2),
      breadMat
    );
    loafHalf1.scale.set(1.25, 0.68, 0.95);
    loafHalf1.position.set(-0.14, 0.52, 0.04);
    const loafHalf2 = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.13, 10, 8), 0.02, 3.2),
      breadMat
    );
    loafHalf2.scale.set(1.1, 0.62, 0.85);
    loafHalf2.position.set(0.06, 0.50, 0.08);

    const chaliceStem = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.068, 0.14, 14), cupMat);
    chaliceStem.position.set(0.18, 0.53, -0.06);
    const chaliceBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.045, 0.14, 16), cupMat);
    chaliceBowl.position.set(0.18, 0.65, -0.06);
    tableGroup.add(loafHalf1, loafHalf2, chaliceStem, chaliceBowl);
    group.add(tableGroup);

    // Woven floor cushions arranged around the low table with room left for the latecomer
    const cushionCoords = [
      [-1.18, -0.28, 0.08],
      [-1.18, 0.28, -0.06],
      [1.18, -0.28, -0.05],
      [1.18, 0.28, 0.06],
      [0, 0.86, 0.02],
      [0, -0.82, -0.04]
    ];
    for (const [cx, cz, rotY] of cushionCoords) {
      const cushion = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.56, 0.15, 0.46, 5, 2, 5), 0.018, 3.0),
        cushionMat
      );
      cushion.position.set(cx, 0.08, cz);
      cushion.rotation.y = rotY;
      cushion.userData.keepWithGlb = true;
      group.add(cushion);
    }

    const tableLight = new THREE.PointLight(0xffe2a0, isFinalePlaza ? 3.1 : 2.6, 17);
    tableLight.position.set(0, 1.65, 0.25);
    group.add(tableLight);

    return { group, tableGroup, tableLight };
  }

  // 2. 1 Corinthians 13:12 (#18 "dimly") — Polished Ancient Bronze Hand Mirror on Draped Linen with Olive Sprig, Scroll & Clay Jar
  createCorinthians13PolishedBronzeMirrorEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d7a5c',
      accentColor: '#dec8a0',
      roughness: 0.86,
      map: propTex
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#cfc2a6',
      accentColor: '#f7eed8',
      roughness: 0.74
    });
    const bronzeRimMat = new THREE.MeshStandardMaterial({
      color: 0xb88b4a,
      emissive: 0x6e4b1a,
      emissiveIntensity: 0.65,
      roughness: 0.32,
      metalness: 0.82
    });
    const mirrorFaceMat = new THREE.MeshStandardMaterial({
      color: 0xffdf96,
      emissive: 0xc98f2e,
      emissiveIntensity: 0.95,
      roughness: 0.18,
      metalness: 0.92
    });

    // Workbench plinth draped with soft linen cloth
    const bench = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.92, 0.62, 1.08, 6, 3, 5), 0.02, 3.2),
      stoneMat
    );
    bench.position.y = 0.31;
    bench.userData.keepWithGlb = true;
    group.add(bench);

    const cloth = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.42, 0.10, 0.88, 8, 2, 6), 0.025, 3.6),
      linenMat
    );
    cloth.position.set(0, 0.65, 0.04);
    cloth.userData.keepWithGlb = true;
    group.add(cloth);

    // Tilted ancient Corinthian polished bronze hand mirror (circular disc, raised bezel rim & turned handle)
    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(-0.06, 0.92, 0.06);
    mirrorGroup.rotation.set(-0.62, 0.18, -0.46);
    mirrorGroup.userData.keepWithGlb = true;

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 28), mirrorFaceMat);
    disc.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 12, 32), bronzeRimMat);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.072, 0.48, 14), bronzeRimMat);
    handle.position.set(0, -0.66, 0);
    mirrorGroup.add(disc, rim, handle);
    group.add(mirrorGroup);

    // Earthenware jar on the left rear corner
    const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.58, 16), stoneMat);
    jar.position.set(-0.68, 0.91, -0.22);
    jar.userData.keepWithGlb = true;
    group.add(jar);

    const mirrorLight = new THREE.PointLight(0xffe3af, isFinalePlaza ? 3.2 : 2.7, 17);
    mirrorLight.position.set(0.12, 1.75, 0.38);
    group.add(mirrorLight);

    return { group, mirrorGroup, mirrorLight };
  }

  // 3. 2 Corinthians 4:7 (#29 "clay jars") — Cracked Terracotta Vessel Radiating Golden Light Through Its Seam on a Wooden Ledge with Scroll
  createCorinthians4CrackedClayJarLightEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#69563e',
      accentColor: '#c9b086',
      roughness: 0.85,
      map: propTex
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6c56',
      accentColor: '#d4c2a1',
      roughness: 0.82,
      map: propTex
    });
    const goldSeamMat = new THREE.MeshStandardMaterial({
      color: 0xfff6c4,
      emissive: 0xffb830,
      emissiveIntensity: 1.95,
      roughness: 0.14
    });
    const parchmentMat = new THREE.MeshStandardMaterial({
      color: 0xe8d7b0,
      emissive: 0xa67c2e,
      emissiveIntensity: 0.55,
      roughness: 0.45
    });

    // Potter's wooden table ledge
    const ledge = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.96, 0.58, 1.04, 6, 3, 5), 0.02, 3.2),
      woodMat
    );
    ledge.position.y = 0.29;
    ledge.userData.keepWithGlb = true;
    group.add(ledge);

    // Central round-bellied clay vessel with glowing interior & radiant vertical crack seam ("if you're cracked, that's just where it gets out")
    const jarGroup = new THREE.Group();
    jarGroup.position.set(0, 0.58, 0);
    jarGroup.userData.keepWithGlb = true;

    const belly = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.48, 20, 16), 0.018, 3.4),
      clayMat
    );
    belly.scale.set(1.0, 1.08, 1.0);
    belly.position.y = 0.48;
    jarGroup.add(belly);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.18, 20), clayMat);
    neck.position.y = 0.96;
    jarGroup.add(neck);

    // Radiant golden treasure light pool inside the open mouth of the jar
    const innerGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 20), goldSeamMat);
    innerGlow.position.y = 1.02;
    jarGroup.add(innerGlow);

    // Jagged vertical kintsugi-like crack of living light down the front belly of the clay jar
    const crackSegments = [
      [0.02, 0.84, 0.44, 0.16, 0.18],
      [-0.03, 0.68, 0.47, 0.18, -0.24],
      [-0.01, 0.50, 0.48, 0.20, 0.28],
      [0.05, 0.32, 0.45, 0.18, -0.20],
      [0.03, 0.18, 0.39, 0.14, 0.15]
    ];
    for (const [cx, cy, cz, len, rotZ] of crackSegments) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.026, len, 0.04), goldSeamMat);
      seam.position.set(cx, cy, cz);
      seam.rotation.z = rotZ;
      jarGroup.add(seam);
    }
    group.add(jarGroup);

    // Rolled parchment scroll on the right & shallow clay bowl on the left
    const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.56, 14), parchmentMat);
    scroll.rotation.z = Math.PI / 2;
    scroll.position.set(0.58, 0.65, 0.22);
    scroll.userData.keepWithGlb = true;
    group.add(scroll);

    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.14, 0.14, 16), clayMat);
    bowl.position.set(-0.64, 0.65, 0.14);
    bowl.userData.keepWithGlb = true;
    group.add(bowl);

    const treasureLight = new THREE.PointLight(0xffe082, isFinalePlaza ? 3.5 : 3.0, 18);
    treasureLight.position.set(0, 1.48, 0.45);
    group.add(treasureLight);

    return { group, jarGroup, treasureLight };
  }

  // 4. 2 Corinthians 12:9–10 (#40 "when I am weak") — Open Earthenware Jar Resting on Its Side in Window Sunlight with Linen Cloth & Olive Bowl
  createCorinthians12OpenJarInSunlightEnsemble(propTex = null, pal = {}, isFinalePlaza = false) {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.userData.keepWithGlb = true;

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c8b6e',
      accentColor: '#e6d4b0',
      roughness: 0.86,
      map: propTex
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a68f68',
      accentColor: '#f0d8a8',
      roughness: 0.76,
      map: propTex
    });
    const goldInteriorMat = new THREE.MeshStandardMaterial({
      color: 0xffe49c,
      emissive: 0xc98e2b,
      emissiveIntensity: 1.05,
      roughness: 0.25
    });

    // Sunlit stone floor plinth & window sill wall
    const floorSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.05, 0.24, 1.24, 6, 2, 5), 0.02, 3.2),
      stoneMat
    );
    floorSlab.position.y = 0.12;
    floorSlab.userData.keepWithGlb = true;
    group.add(floorSlab);

    const windowWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.95, 1.15, 0.34, 6, 4, 3), 0.022, 3.4),
      stoneMat
    );
    windowWall.position.set(0, 0.78, -0.46);
    windowWall.userData.keepWithGlb = true;
    group.add(windowWall);

    // Open two-handled clay amphora resting on its side, its wide mouth glowing with warm golden light ("the open jar fills")
    const openJarGroup = new THREE.Group();
    openJarGroup.position.set(0.08, 0.56, 0.08);
    openJarGroup.rotation.set(1.18, -0.34, 0.22);
    openJarGroup.userData.keepWithGlb = true;

    const jarBody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.72, 20), clayMat);
    const jarRim = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.042, 12, 24), clayMat);
    jarRim.rotation.x = Math.PI / 2;
    jarRim.position.y = 0.36;
    const innerSunPool = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 18), goldInteriorMat);
    innerSunPool.position.y = 0.28;
    openJarGroup.add(jarBody, jarRim, innerSunPool);

    for (const hx of [-0.30, 0.30]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.024, 8, 16, Math.PI), clayMat);
      handle.position.set(hx, 0.18, 0);
      handle.rotation.z = hx < 0 ? Math.PI / 2 : -Math.PI / 2;
      openJarGroup.add(handle);
    }
    group.add(openJarGroup);

    // Shallow clay bowl with olive sprigs on the left
    const oliveBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.16, 0.14, 16), stoneMat);
    oliveBowl.position.set(-0.68, 0.31, -0.08);
    oliveBowl.userData.keepWithGlb = true;
    group.add(oliveBowl);

    const weaknessLight = new THREE.PointLight(0xffe294, isFinalePlaza ? 3.2 : 2.7, 17);
    weaknessLight.position.set(0.05, 1.68, 0.38);
    group.add(weaknessLight);

    return { group, openJarGroup, weaknessLight };
  }

  // =========================================================================
  // DISTRICT XXXV: ROOTED AND FREE (Galatians & Ephesians)
  // =========================================================================

  /**
   * Galatians 5:22–23 (#17 "the fruit"):
   * A warm limestone table holding a wide carved wooden bowl overflowing with the Fruit of
   * the Spirit harvest — golden-green and purple grapes, ripe figs, olive sprigs, and a split
   * ruby-seeded pomegranate — flanked by a tall clay pitcher, a small stone bowl, a burning
   * terracotta oil lamp, and a folded linen cloth.
   */
  createGalatians5FruitOfTheSpiritBowlEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Galatians5FruitOfTheSpiritBowlEnsemble';

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b3a384',
      accentColor: '#e2d0a6',
      roughness: 0.85,
      map: propTex
    });
    const woodBowlMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a5d3b',
      accentColor: '#b59264',
      roughness: 0.72,
      map: propTex
    });
    const clayPitcherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a68f6d',
      accentColor: '#dbc9a8',
      roughness: 0.78,
      map: propTex
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9ceb4',
      accentColor: '#f2e8cf',
      roughness: 0.68,
      map: propTex
    });
    const pomegranateRindMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d3b2b',
      accentColor: '#c96f53',
      roughness: 0.65,
      map: propTex
    });
    const pomegranateSeedMat = new THREE.MeshStandardMaterial({
      color: 0x8f1d18,
      emissive: 0x4a0c08,
      emissiveIntensity: 0.35,
      roughness: 0.28,
      metalness: 0.12
    });
    const goldenGrapeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#bca96b',
      accentColor: '#e3d398',
      roughness: 0.45,
      map: propTex
    });
    const purpleGrapeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4c424c',
      accentColor: '#786b78',
      roughness: 0.48,
      map: propTex
    });
    const figMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7b7852',
      accentColor: '#a8a477',
      roughness: 0.62,
      map: propTex
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#69704e',
      accentColor: '#98a178',
      roughness: 0.72,
      map: propTex
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffeb9c,
      emissive: 0xe69c24,
      emissiveIntensity: 1.35,
      roughness: 0.2
    });

    // Warm limestone table slab
    const tableSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.25, 0.68, 1.35, 6, 3, 5), 0.022, 3.2),
      stoneMat
    );
    tableSlab.position.y = 0.34;
    tableSlab.userData.keepWithGlb = true;
    group.add(tableSlab);

    // Wide carved wooden harvest bowl in center
    const harvestBowlGroup = new THREE.Group();
    harvestBowlGroup.position.set(0.0, 0.72, 0.04);
    harvestBowlGroup.userData.keepWithGlb = true;

    const bowlBase = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.32, 0.22, 24), woodBowlMat);
    bowlBase.position.y = 0.11;
    const bowlRim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.038, 12, 28), woodBowlMat);
    bowlRim.rotation.x = Math.PI / 2;
    bowlRim.position.y = 0.21;
    harvestBowlGroup.add(bowlBase, bowlRim);

    // Split-open ruby-seeded pomegranate resting at the front-right of the bowl
    const pomGroup = new THREE.Group();
    pomGroup.position.set(0.18, 0.31, 0.16);
    pomGroup.rotation.set(0.32, -0.24, 0.12);
    const pomRind = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), pomegranateRindMat);
    pomRind.rotation.x = -Math.PI * 0.42;
    const pomInterior = new THREE.Mesh(new THREE.CircleGeometry(0.17, 18), linenMat);
    pomInterior.position.z = 0.03;
    pomGroup.add(pomRind, pomInterior);

    for (const [sx, sy] of [[-0.06, 0.04], [0.06, 0.04], [0.0, -0.06]]) {
      const seedCluster = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), pomegranateSeedMat);
      seedCluster.scale.set(1.1, 0.95, 0.45);
      seedCluster.position.set(sx, sy, 0.045);
      pomGroup.add(seedCluster);
    }
    harvestBowlGroup.add(pomGroup);

    // Ripe figs nestled in the center
    for (const [fx, fy, fz, mat] of [
      [-0.14, 0.28, 0.14, purpleGrapeMat],
      [-0.22, 0.31, -0.02, figMat],
      [0.04, 0.34, -0.05, figMat],
      [-0.04, 0.30, 0.06, purpleGrapeMat]
    ]) {
      const fig = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.20, 12), mat);
      fig.position.set(fx, fy, fz);
      harvestBowlGroup.add(fig);
    }

    // Golden-green grape clusters on left & dark purple grape clusters at back-top
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 1.3 + 1.6;
      const r = 0.16 + (i % 3) * 0.09;
      const gSphere = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), goldenGrapeMat);
      gSphere.position.set(Math.cos(angle) * r - 0.12, 0.28 + (i % 4) * 0.045, Math.sin(angle) * r * 0.8);
      harvestBowlGroup.add(gSphere);
    }
    for (let i = 0; i < 12; i++) {
      const pSphere = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), purpleGrapeMat);
      pSphere.position.set(0.06 + ((i % 4) - 1.5) * 0.08, 0.36 + Math.floor(i / 4) * 0.055, -0.14 - (i % 2) * 0.06);
      harvestBowlGroup.add(pSphere);
    }

    // Olive sprigs radiating from the bowl and resting on the stone table
    for (const [lx, ly, lz, ry] of [
      [-0.52, 0.04, 0.36, 0.45],
      [0.46, 0.22, 0.10, -0.52],
      [-0.44, 0.26, -0.18, 0.85]
    ]) {
      const sprig = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.09), leafMat);
      sprig.position.set(lx, ly, lz);
      sprig.rotation.y = ry;
      harvestBowlGroup.add(sprig);
    }
    group.add(harvestBowlGroup);

    // Tall earthenware pitcher & small stone bowl on the left
    const pitcherGroup = new THREE.Group();
    pitcherGroup.position.set(-0.66, 0.68, -0.22);
    pitcherGroup.userData.keepWithGlb = true;
    const pitcherBelly = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), clayPitcherMat);
    pitcherBelly.scale.set(1, 1.25, 1);
    pitcherBelly.position.y = 0.26;
    const pitcherNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.32, 14), clayPitcherMat);
    pitcherNeck.position.y = 0.54;
    const pitcherHandle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.026, 8, 16, Math.PI * 1.15), clayPitcherMat);
    pitcherHandle.position.set(-0.16, 0.48, 0);
    pitcherHandle.rotation.z = Math.PI * 0.48;
    pitcherGroup.add(pitcherBelly, pitcherNeck, pitcherHandle);
    group.add(pitcherGroup);

    const smallLeftBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.12, 0.15, 16), stoneMat);
    smallLeftBowl.position.set(-0.86, 0.76, 0.08);
    smallLeftBowl.userData.keepWithGlb = true;
    group.add(smallLeftBowl);

    // Burning terracotta oil lamp on the back-right & folded linen cloth in front-right
    const oilLampGroup = new THREE.Group();
    oilLampGroup.position.set(0.74, 0.76, -0.10);
    oilLampGroup.userData.keepWithGlb = true;
    const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.11, 0.14, 16), clayPitcherMat);
    const lampFlame = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.13, 10), flameMat);
    lampFlame.position.set(0.06, 0.13, 0.02);
    oilLampGroup.add(lampBody, lampFlame);
    group.add(oilLampGroup);

    const foldedLinen = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.56, 0.045, 0.46, 5, 1, 4), 0.014, 4.2),
      linenMat
    );
    foldedLinen.position.set(0.62, 0.71, 0.34);
    foldedLinen.rotation.y = -0.28;
    foldedLinen.userData.keepWithGlb = true;
    group.add(foldedLinen);

    const fruitLight = new THREE.PointLight(0xffe096, isFinalePlaza ? 3.2 : 2.7, 17);
    fruitLight.position.set(0.15, 1.75, 0.35);
    group.add(fruitLight);

    return { group, harvestBowlGroup, oilLampGroup, fruitLight };
  }

  /**
   * Ephesians 2:13–14 (#27 "the wall"):
   * A weathered dry-stone dividing wall broken wide open in the center, with a sunlit dirt
   * footpath worn smooth through the gap ("by all the feet coming home from both sides"),
   * a tall terracotta water jar, folded cream linen cloak, and woven basket beside the left
   * wall-stump, and scattered stones in the grass.
   */
  createEphesians2BrokenDividingWallGapEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Ephesians2BrokenDividingWallGapEnsemble';

    const stoneWallMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e937b',
      accentColor: '#d9ccb0',
      roughness: 0.88,
      map: propTex
    });
    const pathMat = this.painterly.createPainterlyMaterial({
      baseColor: '#cbbd9c',
      accentColor: '#fdedcc',
      roughness: 0.82,
      map: propTex
    });
    const clayJarMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c6643',
      accentColor: '#c79b6d',
      roughness: 0.72,
      map: propTex
    });
    const linenCloakMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d8cdb4',
      accentColor: '#f5ebd3',
      roughness: 0.70,
      map: propTex
    });

    // Sunlit worn footpath slab passing right through the broken wall gap
    const wornPath = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.45, 0.08, 3.2, 5, 1, 8), 0.016, 2.8),
      pathMat
    );
    wornPath.position.y = 0.04;
    wornPath.userData.keepWithGlb = true;
    group.add(wornPath);

    // Left stepped dry-stone wall section ending at the central breach
    const leftWallGroup = new THREE.Group();
    leftWallGroup.position.set(-1.38, 0, 0);
    leftWallGroup.userData.keepWithGlb = true;

    for (let row = 0; row < 4; row++) {
      const blocksInRow = row === 3 ? 2 : 4;
      for (let col = 0; col < blocksInRow; col++) {
        const bw = 0.42 + ((row + col) % 2) * 0.06;
        const bh = 0.28;
        const block = new THREE.Mesh(
          this.displaceGeometry(new THREE.BoxGeometry(bw, bh, 0.46, 3, 2, 2), 0.018, 4.0),
          stoneWallMat
        );
        const xOff = -0.68 + col * 0.44 + (row % 2) * 0.10;
        block.position.set(xOff, 0.14 + row * 0.27, 0);
        leftWallGroup.add(block);
      }
    }
    group.add(leftWallGroup);

    // Right stepped dry-stone wall section across the open gap
    const rightWallGroup = new THREE.Group();
    rightWallGroup.position.set(1.38, 0, 0);
    rightWallGroup.userData.keepWithGlb = true;

    for (let row = 0; row < 4; row++) {
      const blocksInRow = row === 3 ? 1 : (row === 2 ? 3 : 4);
      for (let col = 0; col < blocksInRow; col++) {
        const bw = 0.42 + ((row + col) % 2) * 0.05;
        const bh = 0.28;
        const block = new THREE.Mesh(
          this.displaceGeometry(new THREE.BoxGeometry(bw, bh, 0.46, 3, 2, 2), 0.018, 4.0),
          stoneWallMat
        );
        const xOff = -0.64 + col * 0.44;
        block.position.set(xOff, 0.14 + row * 0.27, 0);
        rightWallGroup.add(block);
      }
    }
    group.add(rightWallGroup);

    // Fallen stones in the grass beside the gap
    for (const [sx, sz, rotY] of [
      [-0.68, 0.28, 0.35],
      [0.66, 0.24, -0.42],
      [0.52, -0.26, 0.22],
      [-0.58, -0.22, -0.18]
    ]) {
      const fallenStone = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.28, 0.18, 0.24, 2, 2, 2), 0.02, 4.5),
        stoneWallMat
      );
      fallenStone.position.set(sx, 0.09, sz);
      fallenStone.rotation.y = rotY;
      fallenStone.userData.keepWithGlb = true;
      group.add(fallenStone);
    }

    // Tall terracotta water jar, folded linen cloak, and low woven basket resting in front of left wall
    const waterJar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.56, 16), clayJarMat);
    waterJar.position.set(-1.72, 0.28, 0.42);
    waterJar.userData.keepWithGlb = true;
    group.add(waterJar);

    const drapedCloak = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.58, 0.12, 0.44, 5, 2, 4), 0.024, 3.8),
      linenCloakMat
    );
    drapedCloak.position.set(-1.26, 0.08, 0.48);
    drapedCloak.rotation.y = 0.24;
    drapedCloak.userData.keepWithGlb = true;
    group.add(drapedCloak);

    const lowBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.15, 0.12, 16), clayJarMat);
    lowBasket.position.set(-0.92, 0.07, 0.42);
    lowBasket.userData.keepWithGlb = true;
    group.add(lowBasket);

    const peaceLight = new THREE.PointLight(0xffe7ab, isFinalePlaza ? 3.2 : 2.7, 19);
    peaceLight.position.set(0, 1.85, 0.35);
    group.add(peaceLight);

    return { group, leftWallGroup, rightWallGroup, peaceLight };
  }

  /**
   * Ephesians 3:17–19 (#30 "rooted"):
   * An ancient gnarled olive tree on a sunlit coastal limestone ridge with deep braided roots
   * gripping the stone, and a woven basket of fresh olives, a handled clay pitcher, a small
   * terracotta dish, and a folded linen cloth resting beside the roots.
   */
  createEphesians3RootedOliveTreeAndBasketEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Ephesians3RootedOliveTreeAndBasketEnsemble';

    const barkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e6555',
      accentColor: '#aba08b',
      roughness: 0.88,
      map: propTex
    });
    const leafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#677052',
      accentColor: '#a2ad87',
      roughness: 0.76,
      map: propTex
    });
    const rockMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c927d',
      accentColor: '#d9ceb4',
      roughness: 0.88,
      map: propTex
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#91836c',
      accentColor: '#cfc1a7',
      roughness: 0.78,
      map: propTex
    });
    const basketMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8a7656',
      accentColor: '#bfa882',
      roughness: 0.82,
      map: propTex
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d1c6ae',
      accentColor: '#f2e8cf',
      roughness: 0.70,
      map: propTex
    });

    // Sunlit limestone ridge mound
    const ridgeMound = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.25, 1.55, 0.42, 16, 3), 0.045, 2.8),
      rockMat
    );
    ridgeMound.position.y = 0.21;
    ridgeMound.userData.keepWithGlb = true;
    group.add(ridgeMound);

    // Ancient gnarled olive trunk & deep braided roots gripping the rock ("roots don't understand the soil. they just go down.")
    const oliveTreeGroup = new THREE.Group();
    oliveTreeGroup.position.set(0.08, 0.38, -0.08);
    oliveTreeGroup.userData.keepWithGlb = true;

    const mainTrunk = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.32, 0.52, 1.65, 14, 5), 0.045, 3.6),
      barkMat
    );
    mainTrunk.position.y = 0.82;
    mainTrunk.rotation.z = 0.08;
    oliveTreeGroup.add(mainTrunk);

    // Deep braided surface roots reaching down into the limestone
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.25;
      const rootTendril = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.08, 0.16, 0.95, 10, 3), 0.025, 4.0),
        barkMat
      );
      rootTendril.position.set(Math.cos(angle) * 0.44, 0.18, Math.sin(angle) * 0.44);
      rootTendril.rotation.z = -Math.cos(angle) * 0.72;
      rootTendril.rotation.x = Math.sin(angle) * 0.72;
      oliveTreeGroup.add(rootTendril);
    }

    // Spreading silver-green olive canopy domes
    for (const [cx, cy, cz, r] of [
      [0.0, 2.05, 0.0, 0.76],
      [-0.58, 1.85, 0.16, 0.58],
      [0.54, 1.92, -0.14, 0.62],
      [-0.22, 2.28, -0.26, 0.54]
    ]) {
      const canopyCluster = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(r, 14, 12), 0.055, 2.6),
        leafMat
      );
      canopyCluster.scale.set(1.18, 0.74, 1.12);
      canopyCluster.position.set(cx, cy, cz);
      oliveTreeGroup.add(canopyCluster);
    }
    group.add(oliveTreeGroup);

    // Foreground still-life beside the roots: woven olive basket, clay pitcher, small dish & folded linen
    const oliveBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.18, 16), basketMat);
    oliveBasket.position.set(0.46, 0.49, 0.52);
    oliveBasket.userData.keepWithGlb = true;
    group.add(oliveBasket);

    const clayPitcher = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.42, 16), clayMat);
    clayPitcher.position.set(0.78, 0.61, 0.46);
    clayPitcher.userData.keepWithGlb = true;
    group.add(clayPitcher);

    const smallDish = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.09, 0.07, 14), basketMat);
    smallDish.position.set(0.14, 0.44, 0.66);
    smallDish.userData.keepWithGlb = true;
    group.add(smallDish);

    const linenCloth = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.54, 0.04, 0.36, 4, 1, 3), 0.012, 4.0),
      linenMat
    );
    linenCloth.position.set(0.68, 0.43, 0.68);
    linenCloth.rotation.y = -0.22;
    linenCloth.userData.keepWithGlb = true;
    group.add(linenCloth);

    const rootedLight = new THREE.PointLight(0xffe6a3, isFinalePlaza ? 3.2 : 2.7, 18);
    rootedLight.position.set(0.15, 2.15, 0.55);
    group.add(rootedLight);

    return { group, oliveTreeGroup, rootedLight };
  }

  /**
   * Ephesians 6:10–11 (#39 "the armor on the table"):
   * A heavy timber table where the whole Armor of God is laid out piece by piece:
   * an upright sculpted bronze breastplate of righteousness at center, a round bronze-rimmed
   * shield of faith leaning behind it, a crested bronze helmet of salvation on a linen cloth
   * to the right, a sheathed sword of the Spirit in front, and a buckled leather belt of truth
   * and pair of strapped sandals of peace on the left.
   */
  createEphesians6ArmorOfGodTableEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Ephesians6ArmorOfGodTableEnsemble';

    const woodTableMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e5c45',
      accentColor: '#a69172',
      roughness: 0.84,
      map: propTex
    });
    const bronzeArmorMat = new THREE.MeshStandardMaterial({
      color: 0x8f7748,
      emissive: 0x291e0b,
      emissiveIntensity: 0.24,
      roughness: 0.36,
      metalness: 0.72
    });
    const shieldFieldMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4e5246',
      accentColor: '#858a78',
      roughness: 0.62,
      map: propTex
    });
    const leatherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4d3927',
      accentColor: '#826449',
      roughness: 0.74,
      map: propTex
    });
    const crestPlumeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#2b241c',
      accentColor: '#544739',
      roughness: 0.88,
      map: propTex
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b5a68c',
      accentColor: '#dfd1b6',
      roughness: 0.76,
      map: propTex
    });

    // Heavy timber table top & sturdy legs
    const tableTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.25, 0.14, 1.32, 6, 2, 4), 0.014, 3.4),
      woodTableMat
    );
    tableTop.position.y = 0.74;
    tableTop.userData.keepWithGlb = true;
    group.add(tableTop);

    for (const [lx, lz] of [[-0.86, -0.44], [0.86, -0.44], [-0.86, 0.44], [0.86, 0.44]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.68, 0.18), woodTableMat);
      leg.position.set(lx, 0.34, lz);
      leg.userData.keepWithGlb = true;
      group.add(leg);
    }

    // 1. Breastplate of Righteousness standing upright at center
    const breastplateGroup = new THREE.Group();
    breastplateGroup.position.set(-0.08, 1.18, -0.04);
    breastplateGroup.rotation.y = 0.18;
    breastplateGroup.userData.keepWithGlb = true;

    const cuirassTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.72, 18), bronzeArmorMat);
    cuirassTorso.scale.set(1.12, 1.0, 0.72);
    breastplateGroup.add(cuirassTorso);

    for (const sx of [-0.18, 0.18]) {
      const shoulderStrap = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.16, 0.24), bronzeArmorMat);
      shoulderStrap.position.set(sx, 0.38, 0);
      breastplateGroup.add(shoulderStrap);
    }
    group.add(breastplateGroup);

    // 2. Round Bronze-Rimmed Shield of Faith leaning behind the breastplate & helmet
    const shieldGroup = new THREE.Group();
    shieldGroup.position.set(0.46, 1.28, -0.34);
    shieldGroup.rotation.set(-0.22, -0.26, 0.06);
    shieldGroup.userData.keepWithGlb = true;

    const shieldDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.045, 28), shieldFieldMat);
    shieldDisc.rotation.x = Math.PI / 2;
    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.032, 12, 32), bronzeArmorMat);
    const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), bronzeArmorMat);
    shieldBoss.rotation.x = Math.PI / 2;
    shieldBoss.position.z = 0.02;
    shieldGroup.add(shieldDisc, shieldRim, shieldBoss);
    group.add(shieldGroup);

    // 3. Crested Bronze Helmet of Salvation on a folded linen cloth to the right
    const helmetLinen = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.68, 0.05, 0.54, 4, 1, 4), 0.015, 4.0),
      linenMat
    );
    helmetLinen.position.set(0.48, 0.83, 0.08);
    helmetLinen.userData.keepWithGlb = true;
    group.add(helmetLinen);

    const helmetGroup = new THREE.Group();
    helmetGroup.position.set(0.46, 0.98, 0.10);
    helmetGroup.rotation.y = -0.38;
    helmetGroup.userData.keepWithGlb = true;

    const helmetDome = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), bronzeArmorMat);
    const helmetBrow = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.022, 8, 22), bronzeArmorMat);
    helmetBrow.rotation.x = Math.PI / 2;
    const helmetCrest = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.055, 8, 16, Math.PI * 0.95), crestPlumeMat);
    helmetCrest.position.y = 0.06;
    helmetCrest.rotation.y = Math.PI / 2;
    helmetGroup.add(helmetDome, helmetBrow, helmetCrest);

    for (const cx of [-0.17, 0.17]) {
      const cheekGuard = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.14), bronzeArmorMat);
      cheekGuard.position.set(cx, -0.09, 0.08);
      helmetGroup.add(cheekGuard);
    }
    group.add(helmetGroup);

    // 4. Sheathed Sword of the Spirit (gladius) lying across the front-right of the table
    const swordGroup = new THREE.Group();
    swordGroup.position.set(0.32, 0.85, 0.42);
    swordGroup.rotation.set(0, -0.14, Math.PI / 2);
    swordGroup.userData.keepWithGlb = true;

    const scabbard = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.032, 0.72, 12), leatherMat);
    const chape = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.16, 12), bronzeArmorMat);
    chape.position.y = -0.42;
    chape.rotation.x = Math.PI;
    const hiltGrip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.18, 10), leatherMat);
    hiltGrip.position.y = 0.45;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.044, 12, 10), bronzeArmorMat);
    pommel.position.y = 0.55;
    swordGroup.add(scabbard, chape, hiltGrip, pommel);
    group.add(swordGroup);

    // 5. Coiled Leather Belt of Truth with bronze buckle & Pair of Sandals of Peace on the left
    const beltCoil = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.038, 10, 22), leatherMat);
    beltCoil.rotation.x = Math.PI / 2;
    beltCoil.position.set(-0.42, 0.85, 0.34);
    beltCoil.userData.keepWithGlb = true;
    group.add(beltCoil);

    const beltBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.05), bronzeArmorMat);
    beltBuckle.position.set(-0.34, 0.85, 0.49);
    beltBuckle.userData.keepWithGlb = true;
    group.add(beltBuckle);

    for (const [sx, sz, rotY] of [[-0.78, 0.14, 0.36], [-0.58, 0.18, 0.32]]) {
      const sandalSole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.36), leatherMat);
      sandalSole.position.set(sx, 0.825, sz);
      sandalSole.rotation.y = rotY;
      sandalSole.userData.keepWithGlb = true;
      const sandalStraps = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.12, 10, 1, true), leatherMat);
      sandalStraps.position.set(sx, 0.89, sz - 0.03);
      sandalStraps.rotation.y = rotY;
      sandalStraps.userData.keepWithGlb = true;
      group.add(sandalSole, sandalStraps);
    }

    const armorLight = new THREE.PointLight(0xffe099, isFinalePlaza ? 3.2 : 2.7, 18);
    armorLight.position.set(-0.1, 1.88, 0.45);
    group.add(armorLight);

    return { group, breastplateGroup, shieldGroup, helmetGroup, swordGroup, armorLight };
  }

  // =========================================================================
  // DISTRICT XXXVI: JOY IN CHAINS (Philippians)
  // =========================================================================

  /**
   * Philippians 1:13 (#4 "the palace guard"):
   * A heavy wooden table beside an open sunlit doorway into the Roman courtyard; resting on
   * the table are a Roman Praetorian guard's bronze helmet with a tall crimson-red plume crest,
   * a draped crimson military cloak on the left, a small clay cup, and an unrolled parchment
   * letter scroll on the right.
   */
  createPhilippians1PraetorianHelmetAndScrollTableEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Philippians1PraetorianHelmetAndScrollTableEnsemble';

    const woodTableMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4b37',
      accentColor: '#917a5c',
      roughness: 0.84,
      map: propTex
    });
    const bronzeHelmetMat = new THREE.MeshStandardMaterial({
      color: 0x8f805c,
      emissive: 0x261f10,
      emissiveIntensity: 0.22,
      roughness: 0.35,
      metalness: 0.74
    });
    const crimsonCrestMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e342d',
      accentColor: '#a65449',
      roughness: 0.78,
      map: propTex
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#dfd1b2',
      accentColor: '#f7eed8',
      roughness: 0.65,
      map: propTex
    });
    const clayCupMat = this.painterly.createPainterlyMaterial({
      baseColor: '#756046',
      accentColor: '#ab916f',
      roughness: 0.80,
      map: propTex
    });

    // Heavy wooden guardroom table top & legs
    const tableTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.15, 0.14, 1.25, 6, 2, 4), 0.015, 3.4),
      woodTableMat
    );
    tableTop.position.y = 0.76;
    tableTop.userData.keepWithGlb = true;
    group.add(tableTop);

    for (const [lx, lz] of [[-0.82, -0.42], [0.82, -0.42], [-0.82, 0.42], [0.82, 0.42]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.70, 0.18), woodTableMat);
      leg.position.set(lx, 0.35, lz);
      leg.userData.keepWithGlb = true;
      group.add(leg);
    }

    // Draped crimson Praetorian cloak cascading over the left edge of the table
    const cloakTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.76, 0.18, 0.92, 5, 2, 5), 0.025, 3.6),
      crimsonCrestMat
    );
    cloakTop.position.set(-0.68, 0.88, 0.04);
    cloakTop.rotation.y = 0.14;
    cloakTop.userData.keepWithGlb = true;
    group.add(cloakTop);

    const cloakDrape = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.32, 0.64, 0.78, 3, 5, 4), 0.028, 3.8),
      crimsonCrestMat
    );
    cloakDrape.position.set(-0.98, 0.56, 0.08);
    cloakDrape.rotation.z = 0.16;
    cloakDrape.userData.keepWithGlb = true;
    group.add(cloakDrape);

    // Roman Praetorian bronze helmet with tall crimson plume crest at center-left
    const helmetGroup = new THREE.Group();
    helmetGroup.position.set(-0.14, 1.06, 0.04);
    helmetGroup.rotation.y = 0.32;
    helmetGroup.userData.keepWithGlb = true;

    const helmetBowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.58),
      bronzeHelmetMat
    );
    const browRidge = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.026, 10, 24), bronzeHelmetMat);
    browRidge.rotation.x = Math.PI / 2;
    const neckGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.12, 16, 1, true, Math.PI * 0.65, Math.PI * 0.7), bronzeHelmetMat);
    neckGuard.position.set(0, -0.06, -0.05);
    helmetGroup.add(helmetBowl, browRidge, neckGuard);

    // Cheek guards (bucculae)
    for (const cx of [-0.22, 0.22]) {
      const cheekGuard = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.24, 0.18), bronzeHelmetMat);
      cheekGuard.position.set(cx, -0.12, 0.10);
      cheekGuard.rotation.y = cx < 0 ? 0.18 : -0.18;
      helmetGroup.add(cheekGuard);
    }

    // Bronze crest holder & tall crimson horsehair plume arc
    const crestHolder = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 8, 18, Math.PI * 0.85), bronzeHelmetMat);
    crestHolder.rotation.y = Math.PI / 2;
    crestHolder.rotation.z = 0.12;
    const crimsonPlume = new THREE.Mesh(
      this.displaceGeometry(new THREE.TorusGeometry(0.36, 0.095, 10, 24, Math.PI * 0.92), 0.012, 5.0),
      crimsonCrestMat
    );
    crimsonPlume.scale.set(1.0, 1.0, 0.42);
    crimsonPlume.rotation.y = Math.PI / 2;
    crimsonPlume.rotation.z = 0.08;
    helmetGroup.add(crestHolder, crimsonPlume);
    group.add(helmetGroup);

    // Small clay bowl & unrolled parchment letter scroll on the right side of the table
    const clayBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.12, 16), clayCupMat);
    clayBowl.position.set(0.28, 0.89, -0.12);
    clayBowl.userData.keepWithGlb = true;
    group.add(clayBowl);

    const scrollGroup = new THREE.Group();
    scrollGroup.position.set(0.56, 0.85, 0.12);
    scrollGroup.rotation.y = -0.24;
    scrollGroup.userData.keepWithGlb = true;

    const parchmentSheet = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.48, 0.025, 0.36, 4, 1, 4), 0.008, 4.2),
      parchmentMat
    );
    const scrollRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.38, 14), parchmentMat);
    scrollRoll.rotation.x = Math.PI / 2;
    scrollRoll.position.set(0.22, 0.02, 0);
    scrollGroup.add(parchmentSheet, scrollRoll);
    group.add(scrollGroup);

    const guardLight = new THREE.PointLight(0xffe3a3, isFinalePlaza ? 3.2 : 2.7, 18);
    guardLight.position.set(0.25, 1.85, 0.45);
    group.add(guardLight);

    return { group, helmetGroup, scrollGroup, guardLight };
  }

  /**
   * Philippians 2:6–8 (#8 "the way down"):
   * At the foot of sunlit descending stone steps sits a wide terracotta foot-washing basin
   * filled with clear water, a softly folded fringed cream linen servant's towel resting on
   * the stone floor in front-right, and a tall clay water amphora with an olive branch.
   */
  createPhilippians2ServantBasinAndTowelStairsEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Philippians2ServantBasinAndTowelStairsEnsemble';

    const stoneStepMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b5a990',
      accentColor: '#ebe0c5',
      roughness: 0.86,
      map: propTex
    });
    const terracottaMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8f7555',
      accentColor: '#c9b08e',
      roughness: 0.76,
      map: propTex
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x566c75,
      emissive: 0x1b282e,
      emissiveIntensity: 0.25,
      roughness: 0.16,
      metalness: 0.22,
      transparent: true,
      opacity: 0.90
    });
    const linenTowelMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9ceb4',
      accentColor: '#fcf3e0',
      roughness: 0.68,
      map: propTex
    });
    const oliveLeafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#697352',
      accentColor: '#9da882',
      roughness: 0.74,
      map: propTex
    });

    // Flagstone landing & three descending limestone steps in the background ("came down the stairs")
    const floorLanding = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.35, 0.14, 1.85, 6, 2, 6), 0.016, 3.2),
      stoneStepMat
    );
    floorLanding.position.set(0, 0.07, 0.15);
    floorLanding.userData.keepWithGlb = true;
    group.add(floorLanding);

    for (let s = 0; s < 3; s++) {
      const step = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(1.95, 0.22, 0.42, 6, 2, 3), 0.018, 3.6),
        stoneStepMat
      );
      step.position.set(-0.08, 0.24 + s * 0.21, -0.48 - s * 0.36);
      step.userData.keepWithGlb = true;
      group.add(step);
    }

    // Wide terracotta foot-washing basin filled with water at center-left
    const basinGroup = new THREE.Group();
    basinGroup.position.set(-0.14, 0.14, 0.24);
    basinGroup.userData.keepWithGlb = true;

    const basinWall = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.36, 0.28, 28), terracottaMat);
    basinWall.position.y = 0.14;
    const basinRim = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.038, 12, 28), terracottaMat);
    basinRim.rotation.x = Math.PI / 2;
    basinRim.position.y = 0.27;
    const waterDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.50, 0.04, 26), waterMat);
    waterDisc.position.y = 0.22;
    basinGroup.add(basinWall, basinRim, waterDisc);
    group.add(basinGroup);

    // Softly folded fringed cream linen servant's towel resting on the stone landing in front-right
    const towelGroup = new THREE.Group();
    towelGroup.position.set(0.32, 0.22, 0.56);
    towelGroup.rotation.y = -0.34;
    towelGroup.userData.keepWithGlb = true;

    const towelLowerFold = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.68, 0.11, 0.54, 6, 2, 5), 0.022, 3.8),
      linenTowelMat
    );
    const towelUpperCrest = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.54, 0.14, 0.42, 5, 2, 4), 0.025, 4.2),
      linenTowelMat
    );
    towelUpperCrest.position.set(-0.06, 0.10, -0.04);
    towelUpperCrest.rotation.z = 0.18;
    towelGroup.add(towelLowerFold, towelUpperCrest);
    group.add(towelGroup);

    // Tall clay water amphora with olive branch on the right
    const amphoraGroup = new THREE.Group();
    amphoraGroup.position.set(0.84, 0.14, -0.12);
    amphoraGroup.userData.keepWithGlb = true;

    const jarBody = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 14), terracottaMat);
    jarBody.scale.set(1.0, 1.38, 1.0);
    jarBody.position.y = 0.36;
    const jarRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.032, 10, 20), terracottaMat);
    jarRim.rotation.x = Math.PI / 2;
    jarRim.position.y = 0.72;
    const oliveSprig = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.08), oliveLeafMat);
    oliveSprig.position.set(-0.08, 0.92, 0);
    oliveSprig.rotation.z = 0.35;
    amphoraGroup.add(jarBody, jarRim, oliveSprig);
    group.add(amphoraGroup);

    const servantLight = new THREE.PointLight(0xfff0c4, isFinalePlaza ? 3.2 : 2.7, 18);
    servantLight.position.set(0.0, 1.88, 0.35);
    group.add(servantLight);

    return { group, basinGroup, towelGroup, waterDisc, servantLight };
  }

  /**
   * Philippians 3:13–14 (#17 "one thing"):
   * A sunlit stadium track bordered by stone seating tiers on the left, leading to twin
   * finish-line stone pillars crowned with a suspended olive victory wreath; in the foreground
   * sit a wooden bench draped with a white linen tunic, kicked-off leather sandals, and a fresh
   * olive branch beside runner's footprints pressing toward the goal.
   */
  createPhilippians3StadiumTrackAndFinishWreathEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Philippians3StadiumTrackAndFinishWreathEnsemble';

    const trackSandMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b8aa8c',
      accentColor: '#ebe0c5',
      roughness: 0.86,
      map: propTex
    });
    const stoneTierMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a3967a',
      accentColor: '#dfd3b8',
      roughness: 0.88,
      map: propTex
    });
    const woodBenchMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e5b43',
      accentColor: '#a38c6d',
      roughness: 0.82,
      map: propTex
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#dfd5be',
      accentColor: '#faf3e1',
      roughness: 0.68,
      map: propTex
    });
    const leatherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4631',
      accentColor: '#8f7255',
      roughness: 0.76,
      map: propTex
    });
    const oliveWreathMat = this.painterly.createPainterlyMaterial({
      baseColor: '#596343',
      accentColor: '#98a679',
      roughness: 0.68,
      map: propTex
    });

    // Sunlit stadium track bed with stepped stone stadium wall on the left
    const trackSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.45, 0.12, 3.1, 6, 1, 8), 0.015, 3.0),
      trackSandMat
    );
    trackSlab.position.y = 0.06;
    trackSlab.userData.keepWithGlb = true;
    group.add(trackSlab);

    for (let t = 0; t < 2; t++) {
      const tierWall = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.42, 0.34 + t * 0.24, 2.85, 2, 2, 6), 0.018, 3.6),
        stoneTierMat
      );
      tierWall.position.set(-0.98 - t * 0.34, 0.23 + t * 0.12, 0);
      tierWall.userData.keepWithGlb = true;
      group.add(tierWall);
    }

    // Twin finish-line pillars at the far end of the track with suspended olive victory wreath ("the prize of the high calling")
    const finishGateGroup = new THREE.Group();
    finishGateGroup.position.set(0.18, 0.12, -1.15);
    finishGateGroup.userData.keepWithGlb = true;

    for (const px of [-0.68, 0.68]) {
      const pillar = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.11, 0.13, 1.95, 12, 4), 0.012, 3.5),
        stoneTierMat
      );
      pillar.position.set(px, 0.97, 0);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.10, 0.30), stoneTierMat);
      cap.position.set(px, 1.96, 0);
      finishGateGroup.add(pillar, cap);
    }

    const garlandCord = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.36, 8), oliveWreathMat);
    garlandCord.rotation.z = Math.PI / 2;
    garlandCord.position.set(0, 1.82, 0);
    const victoryWreath = new THREE.Mesh(new THREE.TorusGeometry(0.20, 0.045, 10, 24), oliveWreathMat);
    victoryWreath.position.set(0, 1.58, 0);
    finishGateGroup.add(garlandCord, victoryWreath);
    group.add(finishGateGroup);

    // Foreground wooden bench with draped white linen tunic & kicked-off runner's sandals ("forgetting the things which are behind")
    const benchTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.92), woodBenchMat);
    benchTop.position.set(-0.62, 0.48, 0.68);
    benchTop.userData.keepWithGlb = true;
    group.add(benchTop);

    for (const bz of [0.34, 1.02]) {
      const bLeg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.44, 0.10), woodBenchMat);
      bLeg.position.set(-0.62, 0.22, bz);
      bLeg.userData.keepWithGlb = true;
      group.add(bLeg);
    }

    const runnerTunic = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.42, 0.38, 0.46, 4, 4, 4), 0.022, 4.0),
      linenMat
    );
    runnerTunic.position.set(-0.56, 0.44, 0.78);
    runnerTunic.rotation.z = -0.18;
    runnerTunic.userData.keepWithGlb = true;
    group.add(runnerTunic);

    for (const [sx, sz, rotY] of [[-0.28, 0.68, 0.42], [-0.14, 0.76, -0.25]]) {
      const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.30), leatherMat);
      sandal.position.set(sx, 0.14, sz);
      sandal.rotation.y = rotY;
      sandal.userData.keepWithGlb = true;
      group.add(sandal);
    }

    const trackLight = new THREE.PointLight(0xffe6a6, isFinalePlaza ? 3.2 : 2.7, 19);
    trackLight.position.set(0.18, 2.05, 0.25);
    group.add(trackLight);

    return { group, finishGateGroup, victoryWreath, trackLight };
  }

  /**
   * Philippians 4:6–7 (#21 "the sentry"):
   * A tall arched stone city gate with closed iron-strapped double wooden doors under a starry
   * night watch; a warm glowing iron wall lantern mounted on the left stone pier casts golden
   * light across the cobblestones, flanked by a small stone sentry guardhouse niche and spear.
   */
  createPhilippians4SentryGateAndLanternEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Philippians4SentryGateAndLanternEnsemble';

    const gateStoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c584d',
      accentColor: '#b89b6a',
      roughness: 0.88,
      map: propTex
    });
    const timberDoorMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4a3d2b',
      accentColor: '#7d684a',
      roughness: 0.84,
      map: propTex
    });
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x2e2b27,
      roughness: 0.48,
      metalness: 0.68
    });
    const lanternGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffefc2,
      emissive: 0xe69f2e,
      emissiveIntensity: 1.55,
      roughness: 0.18
    });

    // Cobblestone threshold & twin stone gate piers supporting the arched parapet wall
    const cobbleSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.65, 0.14, 1.65, 7, 2, 5), 0.018, 3.4),
      gateStoneMat
    );
    cobbleSlab.position.y = 0.07;
    cobbleSlab.userData.keepWithGlb = true;
    group.add(cobbleSlab);

    for (const px of [-0.92, 0.92]) {
      const pier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.62, 2.35, 0.58, 4, 6, 4), 0.022, 3.6),
        gateStoneMat
      );
      pier.position.set(px, 1.24, -0.18);
      pier.userData.keepWithGlb = true;
      group.add(pier);
    }

    const upperParapet = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.48, 0.62, 0.56, 6, 3, 3), 0.022, 3.6),
      gateStoneMat
    );
    upperParapet.position.set(0, 2.58, -0.18);
    upperParapet.userData.keepWithGlb = true;
    group.add(upperParapet);

    // Closed iron-strapped double wooden gate doors ("guard your hearts and your thoughts")
    const doubleDoors = new THREE.Mesh(new THREE.BoxGeometry(1.24, 2.15, 0.22), timberDoorMat);
    doubleDoors.position.set(0, 1.18, -0.22);
    doubleDoors.userData.keepWithGlb = true;
    group.add(doubleDoors);

    for (const by of [0.52, 1.16, 1.78]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.06, 0.25), ironMat);
      strap.position.set(0, by, -0.22);
      strap.userData.keepWithGlb = true;
      group.add(strap);
    }

    // Small stone sentry guardhouse niche on the left & upright sentry spear on the right
    const sentryNiche = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.56, 0.92, 0.48, 3, 4, 3), 0.018, 3.8),
      gateStoneMat
    );
    sentryNiche.position.set(-1.38, 0.58, 0.06);
    sentryNiche.userData.keepWithGlb = true;
    group.add(sentryNiche);

    const sentryRoof = new THREE.Mesh(new THREE.ConeGeometry(0.44, 0.26, 4), gateStoneMat);
    sentryRoof.position.set(-1.38, 1.16, 0.06);
    sentryRoof.rotation.y = Math.PI / 4;
    sentryRoof.userData.keepWithGlb = true;
    group.add(sentryRoof);

    const spearShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 1.85, 8), timberDoorMat);
    spearShaft.position.set(0.88, 0.98, 0.22);
    spearShaft.rotation.z = -0.12;
    spearShaft.userData.keepWithGlb = true;
    group.add(spearShaft);

    // Warm glowing iron wall lantern mounted on the left stone pier ("awake while you sleep")
    const lanternGroup = new THREE.Group();
    lanternGroup.position.set(-0.74, 1.46, 0.24);
    lanternGroup.userData.keepWithGlb = true;

    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.24), ironMat);
    bracket.position.set(0, 0.14, -0.08);
    const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.12, 6), ironMat);
    lanternCap.position.y = 0.11;
    const lanternCore = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.18, 6), lanternGlowMat);
    lanternGroup.add(bracket, lanternCap, lanternCore);
    group.add(lanternGroup);

    const sentryLight = new THREE.PointLight(0xffcf78, isFinalePlaza ? 3.4 : 2.9, 19);
    sentryLight.position.set(-0.68, 1.48, 0.48);
    group.add(sentryLight);

    return { group, lanternGroup, lanternCore, sentryLight };
  }

  // =========================================================================
  // DISTRICT XXXVII: HELD TOGETHER (Colossians & Philemon)
  // =========================================================================

  /**
   * Colossians 1:17 (#6 "held together"):
   * A freestanding ancient Roman stone arch on a sunlit ridge with a warm rose-terracotta
   * keystone wedged at the very apex ("every stone in an arch is leaning, falling toward the
   * ground. one stone at the top keeps them all from coming down").
   */
  createColossians1KeystoneArchEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Colossians1KeystoneArchEnsemble';

    const limestoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a89b80',
      accentColor: '#e9ddbf',
      roughness: 0.88,
      map: propTex
    });
    const keystoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b87b64',
      accentColor: '#f0b89e',
      roughness: 0.72,
      map: propTex
    });

    // Flagstone ground path & twin ashlar stone piers with impost capitals
    const groundSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.65, 0.14, 1.55, 6, 2, 4), 0.018, 3.2),
      limestoneMat
    );
    groundSlab.position.y = 0.07;
    groundSlab.userData.keepWithGlb = true;
    group.add(groundSlab);

    for (const px of [-0.96, 0.96]) {
      const pier = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.56, 1.38, 0.54, 3, 5, 3), 0.018, 3.8),
        limestoneMat
      );
      pier.position.set(px, 0.83, 0);
      pier.userData.keepWithGlb = true;

      const impost = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.64, 0.14, 0.62, 3, 2, 3), 0.012, 4.0),
        limestoneMat
      );
      impost.position.set(px, 1.56, 0);
      impost.userData.keepWithGlb = true;
      group.add(pier, impost);
    }

    // Semicircular ring of 9 leaning stone voussoirs + central rose-terracotta keystone at the top
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 1.62, 0);
    archGroup.userData.keepWithGlb = true;

    const totalVoussoirs = 9;
    const radius = 0.96;
    let keystoneMesh = null;

    for (let i = 0; i < totalVoussoirs; i++) {
      const t = (i + 0.5) / totalVoussoirs;
      const angle = Math.PI * (1.0 - t);
      const isKeystone = i === 4;
      const vw = isKeystone ? 0.44 : 0.34;
      const vh = isKeystone ? 0.52 : 0.40;
      const vd = isKeystone ? 0.58 : 0.52;

      const voussoir = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(vw, vh, vd, 3, 3, 3), 0.014, 4.2),
        isKeystone ? keystoneMat : limestoneMat
      );
      voussoir.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      voussoir.rotation.z = angle - Math.PI / 2;
      archGroup.add(voussoir);
      if (isKeystone) keystoneMesh = voussoir;
    }
    group.add(archGroup);

    const keystoneLight = new THREE.PointLight(0xffe4a8, isFinalePlaza ? 3.2 : 2.8, 19);
    keystoneLight.position.set(0, 2.35, 0.45);
    group.add(keystoneLight);

    return { group, archGroup, keystoneMesh, keystoneLight };
  }

  /**
   * Colossians 2:13–14 (#12 "wiped clean"):
   * A warm stone table holding a wood-framed golden-amber wax writing tablet smoothed completely
   * clean ("now run your hand across the tablet. smooth.") with a turned bronze stylus resting
   * diagonally across the wax, a small stone bowl on a folded cream linen cloth on the left,
   * and a tall handled clay pitcher with olive branches on the right.
   */
  createColossians2WipedCleanWaxTabletAndStylusEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Colossians2WipedCleanWaxTabletAndStylusEnsemble';

    const stoneTableMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b5a689',
      accentColor: '#e8dcbf',
      roughness: 0.84,
      map: propTex
    });
    const woodFrameMat = this.painterly.createPainterlyMaterial({
      baseColor: '#755a3b',
      accentColor: '#ab885d',
      roughness: 0.76,
      map: propTex
    });
    const smoothWaxMat = new THREE.MeshStandardMaterial({
      color: 0xb88b28,
      emissive: 0x3b2905,
      emissiveIntensity: 0.25,
      roughness: 0.26,
      metalness: 0.08
    });
    const bronzeStylusMat = new THREE.MeshStandardMaterial({
      color: 0x8f7645,
      roughness: 0.32,
      metalness: 0.78
    });
    const clayPitcherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a38d6d',
      accentColor: '#dbcaa9',
      roughness: 0.78,
      map: propTex
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d4c8ae',
      accentColor: '#f2e8cf',
      roughness: 0.70,
      map: propTex
    });
    const oliveLeafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c6643',
      accentColor: '#8fa16d',
      roughness: 0.72,
      map: propTex
    });

    // Warm stone table slab
    const tableSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.2, 0.72, 1.35, 6, 3, 5), 0.018, 3.2),
      stoneTableMat
    );
    tableSlab.position.y = 0.36;
    tableSlab.userData.keepWithGlb = true;
    group.add(tableSlab);

    // Wood-framed golden-amber wax tablet smoothed clean at center-front
    const tabletGroup = new THREE.Group();
    tabletGroup.position.set(0.04, 0.76, 0.14);
    tabletGroup.rotation.y = -0.06;
    tabletGroup.userData.keepWithGlb = true;

    const woodFrame = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.07, 0.74), woodFrameMat);
    const smoothWaxBed = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.03, 0.60), smoothWaxMat);
    smoothWaxBed.position.y = 0.028;
    tabletGroup.add(woodFrame, smoothWaxBed);

    // Turned bronze stylus resting diagonally on the smooth golden wax
    const stylusGroup = new THREE.Group();
    stylusGroup.position.set(0.04, 0.06, 0.02);
    stylusGroup.rotation.set(0, -0.34, Math.PI / 2);

    const stylusShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.42, 12), bronzeStylusMat);
    const stylusTip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.09, 12), bronzeStylusMat);
    stylusTip.position.y = -0.255;
    stylusTip.rotation.x = Math.PI;
    const stylusSpatula = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), bronzeStylusMat);
    stylusSpatula.scale.set(1.2, 0.65, 1.2);
    stylusSpatula.position.y = 0.22;
    stylusGroup.add(stylusShaft, stylusTip, stylusSpatula);
    tabletGroup.add(stylusGroup);
    group.add(tabletGroup);

    // Folded cream linen cloth & small stone bowl on the back-left
    const foldedCloth = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.68, 0.06, 0.52, 5, 1, 4), 0.016, 4.0),
      linenMat
    );
    foldedCloth.position.set(-0.62, 0.75, -0.22);
    foldedCloth.rotation.y = 0.22;
    foldedCloth.userData.keepWithGlb = true;
    group.add(foldedCloth);

    const smallBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.11, 0.13, 16), clayPitcherMat);
    smallBowl.position.set(-0.74, 0.84, -0.18);
    smallBowl.userData.keepWithGlb = true;
    group.add(smallBowl);

    // Tall handled clay pitcher & olive sprigs on the back-right
    const pitcherBody = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 14), clayPitcherMat);
    pitcherBody.scale.set(1.0, 1.32, 1.0);
    pitcherBody.position.set(0.68, 1.02, -0.26);
    pitcherBody.userData.keepWithGlb = true;
    const pitcherNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 14), clayPitcherMat);
    pitcherNeck.position.set(0.68, 1.34, -0.26);
    pitcherNeck.userData.keepWithGlb = true;
    group.add(pitcherBody, pitcherNeck);

    const oliveBranch = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.18), oliveLeafMat);
    oliveBranch.position.set(0.46, 0.78, -0.16);
    oliveBranch.rotation.y = -0.38;
    oliveBranch.userData.keepWithGlb = true;
    group.add(oliveBranch);

    const tabletLight = new THREE.PointLight(0xffdf8c, isFinalePlaza ? 3.2 : 2.8, 18);
    tabletLight.position.set(0.05, 1.78, 0.38);
    group.add(tabletLight);

    return { group, tabletGroup, stylusGroup, tabletLight };
  }

  /**
   * Colossians 3:16 (#19 "dwell richly"):
   * A twilight stone courtyard portico with a square limestone pillar where a 7-string wooden
   * lyre leans on a low stone ledge beside a burning terracotta oil lamp and striped woven shawl,
   * accompanied by low wooden fellowship benches ("psalms and hymns, one voice starting and the
   * others coming in").
   */
  createColossians3CourtyardLyreAndBenchesEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Colossians3CourtyardLyreAndBenchesEnsemble';

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6c58',
      accentColor: '#c9b18a',
      roughness: 0.86,
      map: propTex
    });
    const lyreWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4128',
      accentColor: '#9c734b',
      roughness: 0.68,
      map: propTex
    });
    const stringMat = new THREE.MeshStandardMaterial({
      color: 0xe8d29c,
      roughness: 0.30,
      metalness: 0.65
    });
    const shawlMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7d68',
      accentColor: '#d9c8ac',
      roughness: 0.72,
      map: propTex
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffefc2,
      emissive: 0xe69828,
      emissiveIntensity: 1.45,
      roughness: 0.18
    });

    // Flagstone courtyard base, right stone ledge & square portico pillar
    const courtyardBase = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.55, 0.12, 1.85, 6, 2, 5), 0.016, 3.2),
      stoneMat
    );
    courtyardBase.position.y = 0.06;
    courtyardBase.userData.keepWithGlb = true;
    group.add(courtyardBase);

    const rightLedge = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.05, 0.48, 1.25, 4, 3, 4), 0.018, 3.6),
      stoneMat
    );
    rightLedge.position.set(0.62, 0.34, 0.05);
    rightLedge.userData.keepWithGlb = true;
    group.add(rightLedge);

    const porticoPillar = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.46, 2.15, 0.46, 3, 6, 3), 0.018, 3.6),
      stoneMat
    );
    porticoPillar.position.set(0.58, 1.45, -0.24);
    porticoPillar.userData.keepWithGlb = true;
    group.add(porticoPillar);

    // 7-string wooden lyre (kithara) leaning against the stone pillar on the ledge
    const lyreGroup = new THREE.Group();
    lyreGroup.position.set(0.42, 0.92, -0.02);
    lyreGroup.rotation.set(-0.18, -0.28, 0.06);
    lyreGroup.userData.keepWithGlb = true;

    const soundbox = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.09, 16), lyreWoodMat);
    soundbox.rotation.x = Math.PI / 2;
    soundbox.position.y = -0.22;
    lyreGroup.add(soundbox);

    for (const ax of [-0.18, 0.18]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.56, 10), lyreWoodMat);
      arm.position.set(ax, 0.08, 0);
      arm.rotation.z = ax < 0 ? 0.12 : -0.12;
      lyreGroup.add(arm);
    }

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 10), lyreWoodMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.y = 0.32;
    lyreGroup.add(crossbar);

    for (let s = -3; s <= 3; s++) {
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.52, 6), stringMat);
      str.position.set(s * 0.042, 0.06, 0.02);
      lyreGroup.add(str);
    }
    group.add(lyreGroup);

    // Burning terracotta oil lamp & draped shawl on the front of the stone ledge
    const oilLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.09, 14), lyreWoodMat);
    oilLamp.position.set(0.68, 0.62, 0.42);
    oilLamp.userData.keepWithGlb = true;
    const lampFlame = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.10, 8), flameMat);
    lampFlame.position.set(0.64, 0.71, 0.42);
    lampFlame.userData.keepWithGlb = true;
    group.add(oilLamp, lampFlame);

    const drapedShawl = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.46, 0.48, 0.42, 4, 4, 4), 0.022, 3.8),
      shawlMat
    );
    drapedShawl.position.set(0.88, 0.42, 0.48);
    drapedShawl.userData.keepWithGlb = true;
    group.add(drapedShawl);

    // Two low wooden fellowship benches arranged in the courtyard on the left
    for (const [bx, bz, rotY] of [[-0.68, 0.24, 0.38], [-0.24, -0.38, -0.18]]) {
      const benchSeat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.26), lyreWoodMat);
      benchSeat.position.set(bx, 0.36, bz);
      benchSeat.rotation.y = rotY;
      benchSeat.userData.keepWithGlb = true;
      group.add(benchSeat);
    }

    const hymnLight = new THREE.PointLight(0xffcc7a, isFinalePlaza ? 3.2 : 2.8, 19);
    hymnLight.position.set(0.45, 1.85, 0.35);
    group.add(hymnLight);

    return { group, lyreGroup, lampFlame, hymnLight };
  }

  /**
   * Philemon 1:22–25 (#32 "the guest room"):
   * Philemon's sunlit whitewashed guest room made ready for Paul: a low bed made with crisp
   * cream linen, a white pillow, and a fringed lavender-purple throw blanket at the foot with
   * Philemon's unrolled parchment letter resting on top, paired with a three-legged wooden stool
   * holding a burning terracotta oil lamp beside a water jar.
   */
  createPhilemon22PreparedGuestRoomEnsemble(options = {}) {
    const THREE = this.THREE;
    const { isFinalePlaza = false, propTex = null } = options;
    const group = new THREE.Group();
    group.name = 'Philemon22PreparedGuestRoomEnsemble';

    const stoneFloorMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7e6a',
      accentColor: '#cfc1a9',
      roughness: 0.86,
      map: propTex
    });
    const creamLinenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#dcd2be',
      accentColor: '#f6ecd6',
      roughness: 0.68,
      map: propTex
    });
    const lavenderThrowMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b5a6e',
      accentColor: '#9c88a1',
      roughness: 0.74,
      map: propTex
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9c7a0',
      accentColor: '#f5e7c6',
      roughness: 0.62,
      map: propTex
    });
    const stoolWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#66523a',
      accentColor: '#9c8160',
      roughness: 0.80,
      map: propTex
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xffefc2,
      emissive: 0xe69c24,
      emissiveIntensity: 1.4,
      roughness: 0.18
    });

    // Flagstone guest room floor
    const floorSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.45, 0.12, 1.65, 6, 2, 5), 0.015, 3.2),
      stoneFloorMat
    );
    floorSlab.position.y = 0.06;
    floorSlab.userData.keepWithGlb = true;
    group.add(floorSlab);

    // Prepared guest bed with crisp cream linen mattress, pillow, and lavender throw blanket
    const bedGroup = new THREE.Group();
    bedGroup.position.set(-0.34, 0.12, -0.04);
    bedGroup.userData.keepWithGlb = true;

    const mattress = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.38, 0.44, 1.08, 6, 3, 5), 0.018, 3.4),
      creamLinenMat
    );
    mattress.position.y = 0.22;

    const pillow = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.46, 0.16, 0.68, 4, 2, 4), 0.018, 3.8),
      creamLinenMat
    );
    pillow.position.set(-0.38, 0.50, 0);
    pillow.rotation.z = -0.14;

    const lavenderThrow = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.72, 0.47, 1.12, 5, 3, 5), 0.018, 3.6),
      lavenderThrowMat
    );
    lavenderThrow.position.set(0.34, 0.23, 0.02);

    // Unrolled parchment letter to Philemon resting on the lavender throw
    const letterSheet = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.44, 0.025, 0.36, 4, 1, 4), 0.008, 4.2),
      parchmentMat
    );
    letterSheet.position.set(0.28, 0.48, 0.04);
    letterSheet.rotation.y = 0.24;
    const letterRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.36, 12), parchmentMat);
    letterRoll.rotation.x = Math.PI / 2;
    letterRoll.position.set(0.12, 0.50, 0.08);
    letterRoll.rotation.z = -0.24;

    bedGroup.add(mattress, pillow, lavenderThrow, letterSheet, letterRoll);
    group.add(bedGroup);

    // Round three-legged wooden stool on the right holding a burning terracotta oil lamp & clay jar
    const stoolTop = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.25, 0.06, 18), stoolWoodMat);
    stoolTop.position.set(0.76, 0.52, 0.14);
    stoolTop.userData.keepWithGlb = true;
    group.add(stoolTop);

    for (let l = 0; l < 3; l++) {
      const a = (l / 3) * Math.PI * 2 + 0.4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.028, 0.42, 8), stoolWoodMat);
      leg.position.set(0.76 + Math.cos(a) * 0.16, 0.30, 0.14 + Math.sin(a) * 0.16);
      leg.userData.keepWithGlb = true;
      group.add(leg);
    }

    const oilLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.08, 14), stoolWoodMat);
    oilLamp.position.set(0.76, 0.59, 0.14);
    oilLamp.userData.keepWithGlb = true;
    const lampFlame = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.09, 8), flameMat);
    lampFlame.position.set(0.73, 0.67, 0.14);
    lampFlame.userData.keepWithGlb = true;
    group.add(oilLamp, lampFlame);

    const guestLight = new THREE.PointLight(0xffe6ad, isFinalePlaza ? 3.2 : 2.8, 18);
    guestLight.position.set(0.25, 1.85, 0.42);
    group.add(guestLight);

    return { group, bedGroup, lampFlame, guestLight };
  }

  // ==========================================================================
  // DISTRICT XXXVIII — CHILDREN OF THE DAY (1 & 2 Thessalonians)
  // ==========================================================================

  // 1. 1 Thessalonians 2:7 (#8 "like a nursing mother", b-038-008.jpg)
  //    Warm bedside table & stone ledge with a lit handled clay cup-lamp,
  //    cream & peach-coral swaddling cloths, woven basket with olive branch,
  //    and a tall terracotta water pitcher & carved wooden tray.
  createThessalonians2CradleLampAndSwaddlingTableEnsemble(options = {}) {
    const THREE = this.THREE;
    const isFinalePlaza = Boolean(options.isFinalePlaza);
    const propTex = options.propTex || null;
    const group = new THREE.Group();
    group.name = 'Thessalonians2CradleLampAndSwaddlingTableEnsemble';

    const stoneLedgeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9a866e',
      accentColor: '#cab89e',
      roughness: 0.88,
      map: propTex
    });
    const woodTableMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e543b',
      accentColor: '#9e805e',
      roughness: 0.82,
      map: propTex
    });
    const clayLampMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b47348',
      accentColor: '#e09d6e',
      roughness: 0.76,
      map: propTex
    });
    const creamLinenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#e3d6be',
      accentColor: '#faf0db',
      roughness: 0.70,
      map: propTex
    });
    const peachLinenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#e2986d',
      accentColor: '#f7bc97',
      roughness: 0.72,
      map: propTex
    });
    const basketMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a48358',
      accentColor: '#cfb082',
      roughness: 0.84,
      map: propTex
    });
    const oliveLeafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6c7a52',
      accentColor: '#98a878',
      roughness: 0.78,
      map: propTex
    });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffd884 });

    // Ground stone plinth
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.25, 0.16, 24), stoneLedgeMat);
    plinth.position.y = 0.08;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Foreground low wooden table holding the cup-lamp, swaddling cloths & olive basket
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.10, 1.05), woodTableMat);
    tableTop.position.set(0, 0.72, 0.12);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    [[-0.74, -0.40], [0.74, -0.40], [-0.74, 0.40], [0.74, 0.40]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.62, 10), woodTableMat);
      leg.position.set(lx, 0.38, 0.12 + lz);
      leg.castShadow = true;
      group.add(leg);
    });

    // Cream swaddling cloth draped across the center-left of the table
    const creamCloth = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.06, 0.78), creamLinenMat);
    creamCloth.position.set(-0.08, 0.79, 0.14);
    creamCloth.rotation.y = 0.08;
    creamCloth.userData.keepWithGlb = true;
    group.add(creamCloth);

    // Gently bundled swaddling roll in the center
    const swaddleRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.62, 16), creamLinenMat);
    swaddleRoll.rotation.z = Math.PI * 0.48;
    swaddleRoll.rotation.y = 0.22;
    swaddleRoll.position.set(-0.06, 0.96, 0.08);
    swaddleRoll.castShadow = true;
    swaddleRoll.userData.keepWithGlb = true;
    group.add(swaddleRoll);

    // Warm peach-coral cloth folded at the front-right corner (as in b-038-008.jpg)
    const peachCloth = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.075, 0.44), peachLinenMat);
    peachCloth.position.set(0.32, 0.81, 0.34);
    peachCloth.rotation.y = -0.18;
    peachCloth.userData.keepWithGlb = true;
    group.add(peachCloth);

    // Lit handled clay cup-lamp on the front-left corner
    const cupGroup = new THREE.Group();
    cupGroup.position.set(-0.56, 0.78, 0.30);
    cupGroup.userData.keepWithGlb = true;
    const cupBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.10, 0.22, 16), clayLampMat);
    cupBody.position.y = 0.11;
    cupBody.castShadow = true;
    const cupHandle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 8, 14, Math.PI * 1.15), clayLampMat);
    cupHandle.position.set(-0.13, 0.12, 0);
    cupHandle.rotation.z = Math.PI * 0.5;
    const cupFlame = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.11, 10), flameMat);
    cupFlame.position.set(0, 0.26, 0);
    cupGroup.add(cupBody, cupHandle, cupFlame);
    group.add(cupGroup);

    // Woven shallow basket on the right with a fresh olive branch
    const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.026, 8, 20), basketMat);
    basketRim.rotation.x = Math.PI / 2;
    basketRim.position.set(0.46, 0.83, 0.02);
    basketRim.userData.keepWithGlb = true;
    const basketBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.04, 18), creamLinenMat);
    basketBase.position.set(0.46, 0.81, 0.02);
    basketBase.userData.keepWithGlb = true;
    group.add(basketRim, basketBase);

    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.014, 0.036), oliveLeafMat);
      leaf.position.set(0.38 + i * 0.035, 0.85 + (i % 2) * 0.015, -0.04 + (i % 3) * 0.04);
      leaf.rotation.y = (i - 3) * 0.28;
      leaf.userData.keepWithGlb = true;
      group.add(leaf);
    }

    // Rear stone ledge with tall terracotta pitcher & carved wooden round tray
    const stoneShelf = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.92, 0.58), stoneLedgeMat);
    stoneShelf.position.set(0.18, 0.54, -0.62);
    stoneShelf.castShadow = true;
    stoneShelf.receiveShadow = true;
    group.add(stoneShelf);

    const pitcherBody = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), clayLampMat);
    pitcherBody.scale.set(1.0, 1.38, 1.0);
    pitcherBody.position.set(0.22, 1.28, -0.60);
    pitcherBody.castShadow = true;
    pitcherBody.userData.keepWithGlb = true;
    const pitcherNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.11, 0.22, 14), clayLampMat);
    pitcherNeck.position.set(0.22, 1.56, -0.60);
    pitcherNeck.userData.keepWithGlb = true;
    const pitcherHandle = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.02, 8, 14, Math.PI * 1.1), clayLampMat);
    pitcherHandle.position.set(0.09, 1.44, -0.60);
    pitcherHandle.rotation.z = Math.PI * 0.5;
    pitcherHandle.userData.keepWithGlb = true;
    group.add(pitcherBody, pitcherNeck, pitcherHandle);

    const carvedTray = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.035, 20), basketMat);
    carvedTray.rotation.x = Math.PI * 0.44;
    carvedTray.position.set(0.62, 1.22, -0.68);
    carvedTray.userData.keepWithGlb = true;
    group.add(carvedTray);

    const lampLight = new THREE.PointLight(0xffcf86, isFinalePlaza ? 3.2 : 2.8, 16);
    lampLight.position.set(-0.45, 1.35, 0.35);
    group.add(lampLight);

    return { group, cupGroup, cupFlame, lampLight };
  }

  // 2. 1 Thessalonians 2:9 (#10 "night and day", b-038-010.jpg)
  //    Pegged rough-hewn timber tentmaker's workbench with coarse goat-hair
  //    tent cloth, curved iron needle & hemp twine, wound twine spool,
  //    lit clay nozzle lamp, and woven fiber basket underneath.
  createThessalonians2TentmakerWorkbenchAndNeedleEnsemble(options = {}) {
    const THREE = this.THREE;
    const isFinalePlaza = Boolean(options.isFinalePlaza);
    const propTex = options.propTex || null;
    const group = new THREE.Group();
    group.name = 'Thessalonians2TentmakerWorkbenchAndNeedleEnsemble';

    const stoneFloorMat = this.painterly.createPainterlyMaterial({
      baseColor: '#837a64',
      accentColor: '#b5aa8e',
      roughness: 0.90,
      map: propTex
    });
    const benchWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b563e',
      accentColor: '#9c8364',
      roughness: 0.84,
      map: propTex
    });
    const tentClothMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c5544',
      accentColor: '#8a8068',
      roughness: 0.92,
      map: propTex
    });
    const twineMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c8b48a',
      accentColor: '#e8d8b2',
      roughness: 0.82,
      map: propTex
    });
    const ironNeedleMat = new THREE.MeshStandardMaterial({
      color: 0x9a9ea4,
      roughness: 0.35,
      metalness: 0.72
    });
    const clayLampMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8e633b',
      accentColor: '#bd8c5c',
      roughness: 0.78,
      map: propTex
    });
    const basketMat = this.painterly.createPainterlyMaterial({
      baseColor: '#786042',
      accentColor: '#a68b66',
      roughness: 0.86,
      map: propTex
    });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffe08a });

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.3, 0.16, 24), stoneFloorMat);
    plinth.position.y = 0.08;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Heavy timber workbench slab with mortise pegs
    const benchSlab = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.16, 0.98), benchWoodMat);
    benchSlab.position.set(0, 0.82, 0);
    benchSlab.castShadow = true;
    benchSlab.receiveShadow = true;
    group.add(benchSlab);

    const legCoords = [
      [-0.76, -0.34, -0.08, -0.04],
      [0.76, -0.34, 0.08, -0.04],
      [-0.76, 0.34, -0.08, 0.04],
      [0.76, 0.34, 0.08, 0.04]
    ];
    legCoords.forEach(([lx, lz, rx, rz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.74, 0.13), benchWoodMat);
      leg.position.set(lx, 0.44, lz);
      leg.rotation.z = rx;
      leg.rotation.x = rz;
      leg.castShadow = true;
      group.add(leg);
    });

    // Side stretcher bar with protruding wooden tenon pegs
    const stretcher = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.08, 0.84), benchWoodMat);
    stretcher.position.set(0, 0.70, 0);
    group.add(stretcher);

    // Coarse goat-hair tent cloth draped over the left side of the bench
    const clothTop = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.045, 0.96), tentClothMat);
    clothTop.position.set(-0.38, 0.92, 0.02);
    clothTop.rotation.y = 0.12;
    clothTop.castShadow = true;
    clothTop.userData.keepWithGlb = true;
    group.add(clothTop);

    const clothDrop = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.44, 0.045), tentClothMat);
    clothDrop.position.set(-0.46, 0.72, 0.49);
    clothDrop.rotation.x = 0.18;
    clothDrop.rotation.z = -0.14;
    clothDrop.castShadow = true;
    clothDrop.userData.keepWithGlb = true;
    group.add(clothDrop);

    // Large tentmaker's needle resting on the coarse cloth with loops of hemp twine
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.018, 0.46, 10), ironNeedleMat);
    needle.rotation.z = Math.PI * 0.48;
    needle.rotation.y = -0.35;
    needle.position.set(-0.38, 0.96, 0.12);
    needle.userData.keepWithGlb = true;
    group.add(needle);

    for (let t = 0; t < 2; t++) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.11 + t * 0.03, 0.006, 8, 24), twineMat);
      loop.rotation.x = Math.PI / 2;
      loop.position.set(-0.24 + t * 0.12, 0.95, 0.04 + t * 0.05);
      loop.userData.keepWithGlb = true;
      group.add(loop);
    }

    // Wound spool of hemp twine near the back center of the bench
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.22, 18), twineMat);
    spool.position.set(0.02, 1.01, -0.22);
    spool.castShadow = true;
    spool.userData.keepWithGlb = true;
    group.add(spool);

    // Lit terracotta nozzle lamp on the right end of the workbench
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0.54, 0.90, 0.06);
    lampGroup.userData.keepWithGlb = true;
    const lampBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.11, 0.11, 18), clayLampMat);
    lampBowl.scale.set(1.25, 1.0, 0.92);
    lampBowl.position.y = 0.055;
    lampBowl.castShadow = true;
    const lampNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.12, 12), clayLampMat);
    lampNozzle.rotation.z = Math.PI * 0.36;
    lampNozzle.position.set(-0.18, 0.07, 0);
    const lampFlame = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.13, 10), flameMat);
    lampFlame.position.set(-0.12, 0.16, 0);
    lampGroup.add(lampBowl, lampNozzle, lampFlame);
    group.add(lampGroup);

    // Woven basket of raw hemp fiber underneath the workbench
    const fiberBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.30, 0.22, 18), basketMat);
    fiberBasket.position.set(-0.34, 0.27, 0.08);
    fiberBasket.castShadow = true;
    fiberBasket.userData.keepWithGlb = true;
    const rawFiberMound = new THREE.Mesh(new THREE.SphereGeometry(0.33, 14, 10), twineMat);
    rawFiberMound.scale.set(1.0, 0.52, 1.0);
    rawFiberMound.position.set(-0.34, 0.38, 0.08);
    rawFiberMound.userData.keepWithGlb = true;
    group.add(fiberBasket, rawFiberMound);

    const benchLight = new THREE.PointLight(0xffd480, isFinalePlaza ? 3.2 : 2.8, 16);
    benchLight.position.set(0.42, 1.45, 0.15);
    group.add(benchLight);

    return { group, lampGroup, lampFlame, benchLight };
  }

  // 3. 1 Thessalonians 5:4–5 (#21 "a thief in the night", b-038-021.jpg)
  //    Stone windowsill & open wooden shutter looking toward dawn, with a
  //    lit terracotta oil lamp on the right, and a rolled parchment scroll,
  //    draped linen cloth, and small clay bowl on the left.
  createThessalonians5DawnWindowsillLampAndScrollEnsemble(options = {}) {
    const THREE = this.THREE;
    const isFinalePlaza = Boolean(options.isFinalePlaza);
    const propTex = options.propTex || null;
    const group = new THREE.Group();
    group.name = 'Thessalonians5DawnWindowsillLampAndScrollEnsemble';

    const stoneWallMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7c7058',
      accentColor: '#ae9f82',
      roughness: 0.90,
      map: propTex
    });
    const sillStoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9b8d72',
      accentColor: '#cfc0a2',
      roughness: 0.86,
      map: propTex
    });
    const shutterWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5a4c3b',
      accentColor: '#87755e',
      roughness: 0.84,
      map: propTex
    });
    const clayLampMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a67344',
      accentColor: '#d99e66',
      roughness: 0.76,
      map: propTex
    });
    const scrollMat = this.painterly.createPainterlyMaterial({
      baseColor: '#dacba8',
      accentColor: '#f5e8ca',
      roughness: 0.72,
      map: propTex
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c8bc9e',
      accentColor: '#e6dcc2',
      roughness: 0.78,
      map: propTex
    });
    const bowlMat = this.painterly.createPainterlyMaterial({
      baseColor: '#746550',
      accentColor: '#a39178',
      roughness: 0.84,
      map: propTex
    });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffe494 });

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.35, 0.16, 24), stoneWallMat);
    plinth.position.y = 0.08;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Broad stone windowsill bench
    const sillBase = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.76, 1.08), stoneWallMat);
    sillBase.position.set(0, 0.46, 0);
    sillBase.castShadow = true;
    sillBase.receiveShadow = true;
    group.add(sillBase);

    const sillTop = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.12, 1.16), sillStoneMat);
    sillTop.position.set(0, 0.88, 0);
    sillTop.castShadow = true;
    sillTop.receiveShadow = true;
    group.add(sillTop);

    // Left stone window jamb pillar & right open wooden shutter
    const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.85, 0.56), stoneWallMat);
    leftJamb.position.set(-0.94, 1.82, -0.26);
    leftJamb.castShadow = true;
    group.add(leftJamb);

    const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.85, 0.52), stoneWallMat);
    rightJamb.position.set(0.96, 1.82, -0.26);
    rightJamb.castShadow = true;
    group.add(rightJamb);

    const openShutter = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.76, 0.08), shutterWoodMat);
    openShutter.position.set(0.76, 1.80, 0.12);
    openShutter.rotation.y = -1.12;
    openShutter.castShadow = true;
    openShutter.userData.keepWithGlb = true;
    group.add(openShutter);

    // Draped linen cloth, rolled scroll & clay bowl on the left side of the sill
    const linenCloth = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.045, 0.72), linenMat);
    linenCloth.position.set(-0.46, 0.96, 0.08);
    linenCloth.rotation.y = 0.14;
    linenCloth.userData.keepWithGlb = true;
    group.add(linenCloth);

    const scrollRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.58, 16), scrollMat);
    scrollRoll.rotation.z = Math.PI / 2;
    scrollRoll.rotation.y = -0.42;
    scrollRoll.position.set(-0.52, 1.02, 0.22);
    scrollRoll.castShadow = true;
    scrollRoll.userData.keepWithGlb = true;
    group.add(scrollRoll);

    const clayBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.11, 0.11, 18), bowlMat);
    clayBowl.position.set(-0.56, 1.03, -0.10);
    clayBowl.castShadow = true;
    clayBowl.userData.keepWithGlb = true;
    group.add(clayBowl);

    // Lit terracotta spouted oil lamp with loop handle on the right side of the sill
    const lampGroup = new THREE.Group();
    lampGroup.position.set(0.34, 0.94, 0.08);
    lampGroup.userData.keepWithGlb = true;
    const lampBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), clayLampMat);
    lampBody.scale.set(1.22, 0.68, 0.95);
    lampBody.position.y = 0.11;
    lampBody.castShadow = true;
    const lampSpout = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.22, 14), clayLampMat);
    lampSpout.rotation.z = Math.PI * 0.46;
    lampSpout.position.set(-0.22, 0.11, 0);
    const lampHandle = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.022, 8, 14, Math.PI * 1.25), clayLampMat);
    lampHandle.position.set(0.18, 0.19, 0);
    lampHandle.rotation.z = -0.35;
    const lampFlame = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.16, 10), flameMat);
    lampFlame.position.set(-0.30, 0.22, 0);
    lampGroup.add(lampBody, lampSpout, lampHandle, lampFlame);
    group.add(lampGroup);

    const dawnLight = new THREE.PointLight(0xffd888, isFinalePlaza ? 3.4 : 3.0, 18);
    dawnLight.position.set(0.12, 1.48, 0.24);
    group.add(dawnLight);

    return { group, lampGroup, lampFlame, dawnLight };
  }

  // 4. 2 Thessalonians 3:10–12 (#34 "your own bread", b-038-034.jpg)
  //    Workman's quiet table with a crusty round golden-brown loaf of bread
  //    on fringed cream linen, an olive branch, a stoneware water pitcher,
  //    a shallow clay bowl of golden olive oil, and heavy leather work gloves.
  create2Thessalonians3QuietWorkTableLoafAndGlovesEnsemble(options = {}) {
    const THREE = this.THREE;
    const isFinalePlaza = Boolean(options.isFinalePlaza);
    const propTex = options.propTex || null;
    const group = new THREE.Group();
    group.name = '2Thessalonians3QuietWorkTableLoafAndGlovesEnsemble';

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a89878',
      accentColor: '#d8c9a8',
      roughness: 0.88,
      map: propTex
    });
    const tableWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7352',
      accentColor: '#bca07a',
      roughness: 0.82,
      map: propTex
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#dcd2bc',
      accentColor: '#f5ede0',
      roughness: 0.72,
      map: propTex
    });
    const breadCrustMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c89652',
      accentColor: '#ecc07c',
      roughness: 0.78,
      map: propTex
    });
    const breadSlashMat = this.painterly.createPainterlyMaterial({
      baseColor: '#e4c47e',
      accentColor: '#fadfa4',
      roughness: 0.76,
      map: propTex
    });
    const pitcherMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9a8c74',
      accentColor: '#cabba0',
      roughness: 0.82,
      map: propTex
    });
    const oliveOilMat = new THREE.MeshStandardMaterial({
      color: 0xb89e30,
      roughness: 0.22,
      metalness: 0.08
    });
    const leatherGloveMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7c6b52',
      accentColor: '#ab987a',
      roughness: 0.86,
      map: propTex
    });
    const oliveLeafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6c7852',
      accentColor: '#9aa87c',
      roughness: 0.78,
      map: propTex
    });

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.3, 0.16, 24), stoneMat);
    plinth.position.y = 0.08;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Sturdy workman's wooden table
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.12, 1.08), tableWoodMat);
    tableTop.position.set(0, 0.78, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    [[-0.78, -0.40], [0.78, -0.40], [-0.78, 0.40], [0.78, 0.40]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.68, 0.11), tableWoodMat);
      leg.position.set(lx, 0.42, lz);
      leg.castShadow = true;
      group.add(leg);
    });

    // Fringed cream linen cloth draped under the loaf and hanging over the front edge
    const clothTop = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.04, 0.82), linenMat);
    clothTop.position.set(-0.24, 0.86, 0.04);
    clothTop.rotation.y = 0.10;
    clothTop.userData.keepWithGlb = true;
    group.add(clothTop);

    const clothHang = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.04), linenMat);
    clothHang.position.set(-0.28, 0.72, 0.48);
    clothHang.rotation.z = 0.12;
    clothHang.userData.keepWithGlb = true;
    group.add(clothHang);

    // Crusty round golden-brown artisan loaf of bread on the left-center
    const loafGroup = new THREE.Group();
    loafGroup.position.set(-0.22, 0.88, -0.02);
    loafGroup.userData.keepWithGlb = true;
    const loafDome = new THREE.Mesh(new THREE.SphereGeometry(0.34, 22, 16), breadCrustMat);
    loafDome.scale.set(1.12, 0.68, 0.96);
    loafDome.position.y = 0.14;
    loafDome.castShadow = true;
    const loafSlash = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.08), breadSlashMat);
    loafSlash.position.set(-0.04, 0.35, 0.04);
    loafSlash.rotation.y = -0.48;
    loafGroup.add(loafDome, loafSlash);
    group.add(loafGroup);

    // Olive branch beside the loaf on the left
    for (let i = 0; i < 8; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.038), oliveLeafMat);
      leaf.position.set(-0.68 + i * 0.045, 0.90 + i * 0.032, -0.18 + (i % 2) * 0.05);
      leaf.rotation.z = 0.42;
      leaf.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.45;
      leaf.userData.keepWithGlb = true;
      group.add(leaf);
    }

    // Stoneware water pitcher behind the olive oil bowl on the right
    const pitcherBody = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), pitcherMat);
    pitcherBody.scale.set(1.0, 1.24, 1.0);
    pitcherBody.position.set(0.36, 1.10, -0.18);
    pitcherBody.castShadow = true;
    pitcherBody.userData.keepWithGlb = true;
    const pitcherNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.16, 16), pitcherMat);
    pitcherNeck.position.set(0.36, 1.36, -0.18);
    pitcherNeck.userData.keepWithGlb = true;
    const pitcherHandle = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.022, 8, 14, Math.PI * 1.15), pitcherMat);
    pitcherHandle.position.set(0.50, 1.22, -0.18);
    pitcherHandle.rotation.z = -Math.PI * 0.5;
    pitcherHandle.userData.keepWithGlb = true;
    group.add(pitcherBody, pitcherNeck, pitcherHandle);

    // Shallow clay bowl of golden olive oil in front
    const oilBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.12, 0.09, 20), pitcherMat);
    oilBowl.position.set(0.18, 0.90, 0.24);
    oilBowl.castShadow = true;
    oilBowl.userData.keepWithGlb = true;
    const oilSurface = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.015, 20), oliveOilMat);
    oilSurface.position.set(0.18, 0.935, 0.24);
    oilSurface.userData.keepWithGlb = true;
    group.add(oilBowl, oilSurface);

    // Heavy leather work gloves resting on the right front corner of the table
    const gloveGroup = new THREE.Group();
    gloveGroup.position.set(0.58, 0.88, 0.18);
    gloveGroup.rotation.y = -0.28;
    gloveGroup.userData.keepWithGlb = true;
    const glovePalm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.055, 0.24), leatherGloveMat);
    glovePalm.position.set(0, 0.03, -0.06);
    glovePalm.castShadow = true;
    gloveGroup.add(glovePalm);
    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.026, 0.16, 8), leatherGloveMat);
      finger.rotation.x = Math.PI / 2;
      finger.position.set(-0.09 + f * 0.06, 0.028, 0.12);
      gloveGroup.add(finger);
    }
    group.add(gloveGroup);

    const tableLight = new THREE.PointLight(0xffe59e, isFinalePlaza ? 3.2 : 2.8, 16);
    tableLight.position.set(0.0, 1.55, 0.25);
    group.add(tableLight);

    return { group, loafGroup, gloveGroup, tableLight };
  }

  // ==========================================================================
  // DISTRICT XXXIX — GRACE, MERCY, AND PEACE (1 & 2 Timothy & Titus)
  // ==========================================================================

  // 1. 1 Timothy 3:14–15 (#7 "a pillar", b-039-007.jpg)
  //    Sunlit courtyard stone plinth with a tall carved limestone pillar on
  //    a square molded base on the left, and a rough-hewn timber table on
  //    the right holding a round loaf on a wooden plate, fringed linen cloth,
  //    bread knife, and lit clay oil lamp bowl.
  createTimothy3CourtyardPillarAndTableEnsemble(options = {}) {
    const THREE = this.THREE;
    const isFinalePlaza = Boolean(options.isFinalePlaza);
    const propTex = options.propTex || null;
    const group = new THREE.Group();
    group.name = 'Timothy3CourtyardPillarAndTableEnsemble';

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a6967a',
      accentColor: '#d9caa8',
      roughness: 0.88,
      map: propTex
    });
    const tableWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#665038',
      accentColor: '#967a58',
      roughness: 0.84,
      map: propTex
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9ceb4',
      accentColor: '#f3ead4',
      roughness: 0.74,
      map: propTex
    });
    const breadMat = this.painterly.createPainterlyMaterial({
      baseColor: '#be8e4a',
      accentColor: '#e4b872',
      roughness: 0.78,
      map: propTex
    });
    const clayLampMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a5436',
      accentColor: '#ab7b52',
      roughness: 0.80,
      map: propTex
    });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffe492 });

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.4, 0.16, 24), stoneMat);
    plinth.position.y = 0.08;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Tall monolithic carved limestone pillar on the left (as in b-039-007.jpg)
    const pillarGroup = new THREE.Group();
    pillarGroup.position.set(-0.68, 0.16, -0.18);
    const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.18, 0.86), stoneMat);
    basePlinth.position.y = 0.09;
    basePlinth.castShadow = true;
    const baseTorus = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.16, 20), stoneMat);
    baseTorus.position.y = 0.26;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.34, 2.65, 22), stoneMat);
    shaft.position.y = 1.66;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    const neckRing = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.12, 20), stoneMat);
    neckRing.position.y = 3.04;
    const abacus = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.22, 0.88), stoneMat);
    abacus.position.y = 3.21;
    abacus.castShadow = true;
    pillarGroup.add(basePlinth, baseTorus, shaft, neckRing, abacus);
    group.add(pillarGroup);

    // Rough-hewn courtyard wooden table on the right foreground
    const tableGroup = new THREE.Group();
    tableGroup.position.set(0.42, 0.16, 0.22);
    tableGroup.userData.keepWithGlb = true;
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.09, 0.92), tableWoodMat);
    tableTop.position.y = 0.72;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    [[-0.56, -0.34], [0.56, -0.34], [-0.56, 0.34], [0.56, 0.34]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.09), tableWoodMat);
      leg.position.set(lx, 0.36, lz);
      leg.castShadow = true;
      tableGroup.add(leg);
    });

    // Draped fringed linen cloth on the right side of the table
    const clothTop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.035, 0.76), linenMat);
    clothTop.position.set(0.26, 0.78, 0.04);
    tableGroup.add(clothTop);
    const clothDrop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.32, 0.035), linenMat);
    clothDrop.position.set(0.30, 0.62, 0.44);
    clothDrop.rotation.x = 0.14;
    tableGroup.add(clothDrop);

    // Round wooden plate & crusty round loaf of bread
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.035, 18), tableWoodMat);
    plate.position.set(0.16, 0.80, -0.02);
    const loaf = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 14), breadMat);
    loaf.scale.set(1.08, 0.70, 0.98);
    loaf.position.set(0.16, 0.88, -0.02);
    loaf.castShadow = true;
    tableGroup.add(plate, loaf);

    // Small lit clay lamp bowl on the left side of the table
    const lampBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.08, 16), clayLampMat);
    lampBowl.position.set(-0.34, 0.80, -0.08);
    const lampFlame = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.10, 8), flameMat);
    lampFlame.position.set(-0.34, 0.88, -0.08);
    tableGroup.add(lampBowl, lampFlame);
    group.add(tableGroup);

    const pillarLight = new THREE.PointLight(0xffe19c, isFinalePlaza ? 3.2 : 2.8, 18);
    pillarLight.position.set(0.08, 1.55, 0.28);
    group.add(pillarLight);

    return { group, pillarGroup, tableGroup, lampFlame, pillarLight };
  }

  // 2. 2 Timothy 1:5 (#18 "Lois and Eunice", b-039-018.jpg)
  //    Family timber table with a lit terracotta nozzle oil lamp on the left,
  //    a rolled parchment scroll tied with a leather thong on the right,
  //    a folded sage-green wool shawl at the front edge, and an olive-branch
  //    amphora in the rear corner.
  create2Timothy1LoisAndEuniceLampAndScrollTableEnsemble(options = {}) {
    const THREE = this.THREE;
    const isFinalePlaza = Boolean(options.isFinalePlaza);
    const propTex = options.propTex || null;
    const group = new THREE.Group();
    group.name = '2Timothy1LoisAndEuniceLampAndScrollTableEnsemble';

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8c7e66',
      accentColor: '#bfb094',
      roughness: 0.88,
      map: propTex
    });
    const tableWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6b563c',
      accentColor: '#9c8260',
      roughness: 0.84,
      map: propTex
    });
    const clayLampMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a66838',
      accentColor: '#d99862',
      roughness: 0.76,
      map: propTex
    });
    const scrollMat = this.painterly.createPainterlyMaterial({
      baseColor: '#d9caa4',
      accentColor: '#f3e6c4',
      roughness: 0.72,
      map: propTex
    });
    const sageShawlMat = this.painterly.createPainterlyMaterial({
      baseColor: '#646e5a',
      accentColor: '#919c84',
      roughness: 0.82,
      map: propTex
    });
    const jarMat = this.painterly.createPainterlyMaterial({
      baseColor: '#94846b',
      accentColor: '#c4b498',
      roughness: 0.85,
      map: propTex
    });
    const oliveLeafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#62704b',
      accentColor: '#8e9e72',
      roughness: 0.78,
      map: propTex
    });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffdf88 });

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.3, 0.16, 24), stoneMat);
    plinth.position.y = 0.08;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Family timber table
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.12, 1.06), tableWoodMat);
    tableTop.position.set(0, 0.78, 0.06);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    [[-0.76, -0.38], [0.76, -0.38], [-0.76, 0.38], [0.76, 0.38]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.68, 0.11), tableWoodMat);
      leg.position.set(lx, 0.42, 0.06 + lz);
      leg.castShadow = true;
      group.add(leg);
    });

    // Lit terracotta nozzle oil lamp on the front-left of the table (as in b-039-018.jpg)
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-0.48, 0.84, 0.14);
    lampGroup.userData.keepWithGlb = true;
    const lampBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.12, 0.11, 18), clayLampMat);
    lampBowl.scale.set(1.22, 1.0, 0.94);
    lampBowl.position.y = 0.055;
    lampBowl.castShadow = true;
    const lampNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.13, 12), clayLampMat);
    lampNozzle.rotation.z = -Math.PI * 0.36;
    lampNozzle.position.set(0.19, 0.07, 0);
    const lampFlame = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.13, 10), flameMat);
    lampFlame.position.set(0.11, 0.16, 0);
    lampGroup.add(lampBowl, lampNozzle, lampFlame);
    group.add(lampGroup);

    // Folded sage-green wool shawl at the front-left edge
    const shawl = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.055, 0.34), sageShawlMat);
    shawl.position.set(-0.38, 0.86, 0.40);
    shawl.rotation.y = 0.14;
    shawl.userData.keepWithGlb = true;
    group.add(shawl);

    // Rolled parchment scroll of the Scriptures on the right with leather tie
    const scrollGroup = new THREE.Group();
    scrollGroup.position.set(0.38, 0.90, 0.18);
    scrollGroup.rotation.y = 0.46;
    scrollGroup.userData.keepWithGlb = true;
    const scrollCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.72, 18), scrollMat);
    scrollCylinder.rotation.z = Math.PI / 2;
    scrollCylinder.castShadow = true;
    const tieRing = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.008, 8, 16), tableWoodMat);
    tieRing.rotation.y = Math.PI / 2;
    scrollGroup.add(scrollCylinder, tieRing);
    group.add(scrollGroup);

    // Tall clay jar with olive branches behind the right corner of the table
    const jarBody = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), jarMat);
    jarBody.scale.set(1.0, 1.32, 1.0);
    jarBody.position.set(0.66, 0.56, -0.58);
    jarBody.castShadow = true;
    const jarNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.18, 16), jarMat);
    jarNeck.position.set(0.66, 0.94, -0.58);
    group.add(jarBody, jarNeck);

    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.016, 0.04), oliveLeafMat);
      leaf.position.set(0.58 + (i % 3) * 0.08, 1.12 + i * 0.06, -0.58 + (i % 2) * 0.06);
      leaf.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.38;
      group.add(leaf);
    }

    const lampLight = new THREE.PointLight(0xffd682, isFinalePlaza ? 3.2 : 2.8, 16);
    lampLight.position.set(-0.22, 1.45, 0.22);
    group.add(lampLight);

    return { group, lampGroup, lampFlame, scrollGroup, lampLight };
  }

  // 3. 2 Timothy 4:6–8 (#28 "fought, finished, kept", b-039-028.jpg)
  //    Carved stone finish-line pedestal at the end of a sandy stadium course,
  //    crowned with a woven green laurel/olive wreath ("the crown of
  //    righteousness") and a draped linen mantle.
  create2Timothy4StadiumFinishStoneAndLaurelCrownEnsemble(options = {}) {
    const THREE = this.THREE;
    const isFinalePlaza = Boolean(options.isFinalePlaza);
    const propTex = options.propTex || null;
    const group = new THREE.Group();
    group.name = '2Timothy4StadiumFinishStoneAndLaurelCrownEnsemble';

    const sandTrackMat = this.painterly.createPainterlyMaterial({
      baseColor: '#bca981',
      accentColor: '#e4d4ae',
      roughness: 0.90,
      map: propTex
    });
    const carvedStoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c8f73',
      accentColor: '#cfc1a2',
      roughness: 0.86,
      map: propTex
    });
    const laurelGreenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4e6338',
      accentColor: '#7e965e',
      roughness: 0.74,
      map: propTex
    });
    const goldLeafAccentMat = new THREE.MeshStandardMaterial({
      color: 0xd8b458,
      roughness: 0.36,
      metalness: 0.45
    });
    const mantleMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a7258',
      accentColor: '#a89f82',
      roughness: 0.82,
      map: propTex
    });

    const trackPlinth = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.35, 0.16, 24), sandTrackMat);
    trackPlinth.position.y = 0.08;
    trackPlinth.receiveShadow = true;
    group.add(trackPlinth);

    // Carved stone finish-line pedestal block in the foreground (as in b-039-028.jpg)
    const pedestalBlock = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.88, 1.04), carvedStoneMat);
    pedestalBlock.position.set(0.14, 0.56, 0.12);
    pedestalBlock.castShadow = true;
    pedestalBlock.receiveShadow = true;
    group.add(pedestalBlock);

    const pedestalCap = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.12, 1.12), carvedStoneMat);
    pedestalCap.position.set(0.14, 1.04, 0.12);
    pedestalCap.castShadow = true;
    group.add(pedestalCap);

    // Draped runner's mantle over the front-right corner of the pedestal
    const mantle = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.62, 0.42), mantleMat);
    mantle.position.set(0.68, 0.76, 0.36);
    mantle.rotation.z = -0.22;
    mantle.userData.keepWithGlb = true;
    group.add(mantle);

    // Woven green laurel/olive wreath ("the crown of righteousness") resting on top
    const wreathGroup = new THREE.Group();
    wreathGroup.position.set(0.06, 1.14, 0.08);
    wreathGroup.userData.keepWithGlb = true;
    const wreathRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 12, 28), laurelGreenMat);
    wreathRing.rotation.x = Math.PI / 2;
    wreathRing.castShadow = true;
    wreathGroup.add(wreathRing);

    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.018, 0.048),
        i % 4 === 0 ? goldLeafAccentMat : laurelGreenMat
      );
      leaf.position.set(Math.cos(ang) * 0.35, 0.03 + (i % 2) * 0.015, Math.sin(ang) * 0.35);
      leaf.rotation.y = -ang + 0.45;
      leaf.rotation.z = 0.22;
      wreathGroup.add(leaf);
    }
    group.add(wreathGroup);

    // Low stadium colonnade parapet wall on the left
    const stadiumWall = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.64, 1.95), carvedStoneMat);
    stadiumWall.position.set(-1.18, 0.44, -0.18);
    stadiumWall.rotation.y = 0.18;
    stadiumWall.castShadow = true;
    group.add(stadiumWall);

    const crownLight = new THREE.PointLight(0xffe79e, isFinalePlaza ? 3.4 : 3.0, 18);
    crownLight.position.set(0.06, 1.75, 0.18);
    group.add(crownLight);

    return { group, wreathGroup, crownLight };
  }

  // 4. 2 Timothy 4:9–13 (#29 "the cloak and the parchments", b-039-029.jpg)
  //    Stone bench beneath a sunlit prison window shaft, with a heavy warm
  //    rust-terracotta wool cloak draped on the left and a leather-bound
  //    codex book, stitched parchment sheets, and two tied parchment scrolls
  //    stacked on the right.
  create2Timothy4CloakAndParchmentsStoneBenchEnsemble(options = {}) {
    const THREE = this.THREE;
    const isFinalePlaza = Boolean(options.isFinalePlaza);
    const propTex = options.propTex || null;
    const group = new THREE.Group();
    group.name = '2Timothy4CloakAndParchmentsStoneBenchEnsemble';

    const stoneBenchMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e8f75',
      accentColor: '#cfc1a6',
      roughness: 0.88,
      map: propTex
    });
    const rustCloakMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c4e32',
      accentColor: '#c97250',
      roughness: 0.78,
      map: propTex
    });
    const cloakStripeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4e3c2e',
      accentColor: '#735b48',
      roughness: 0.84,
      map: propTex
    });
    const leatherCodexMat = this.painterly.createPainterlyMaterial({
      baseColor: '#735334',
      accentColor: '#a37b52',
      roughness: 0.76,
      map: propTex
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#dfd1b0',
      accentColor: '#f6ebd0',
      roughness: 0.68,
      map: propTex
    });

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.35, 0.16, 24), stoneBenchMat);
    plinth.position.y = 0.08;
    plinth.receiveShadow = true;
    group.add(plinth);

    // Wide stone bench ledge (as in b-039-029.jpg)
    const benchBlock = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.74, 1.12), stoneBenchMat);
    benchBlock.position.set(0, 0.48, 0);
    benchBlock.castShadow = true;
    benchBlock.receiveShadow = true;
    group.add(benchBlock);

    // Heavy warm rust-terracotta wool traveler's cloak draped over the left side
    const cloakGroup = new THREE.Group();
    cloakGroup.position.set(-0.42, 0.86, 0.06);
    cloakGroup.userData.keepWithGlb = true;
    const cloakFoldTop = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.22, 0.84), rustCloakMat);
    cloakFoldTop.position.set(0, 0.08, -0.04);
    cloakFoldTop.rotation.y = 0.16;
    cloakFoldTop.castShadow = true;
    const cloakFoldUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.88, 16), rustCloakMat);
    cloakFoldUpper.rotation.z = Math.PI * 0.46;
    cloakFoldUpper.rotation.y = 0.24;
    cloakFoldUpper.position.set(0.06, 0.20, -0.08);
    cloakFoldUpper.castShadow = true;
    const cloakHang = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 0.14), rustCloakMat);
    cloakHang.position.set(-0.08, -0.22, 0.42);
    cloakHang.rotation.x = 0.18;
    cloakHang.rotation.z = 0.12;
    cloakHang.castShadow = true;
    const borderStripe = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.06, 0.15), cloakStripeMat);
    borderStripe.position.set(-0.06, -0.06, 0.43);
    borderStripe.rotation.z = 0.12;
    cloakGroup.add(cloakFoldTop, cloakFoldUpper, cloakHang, borderStripe);
    group.add(cloakGroup);

    // Leather-bound codex, stitched parchment sheets & two rolled scrolls on the right
    const booksGroup = new THREE.Group();
    booksGroup.position.set(0.46, 0.86, 0.04);
    booksGroup.userData.keepWithGlb = true;

    const codex = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.54), leatherCodexMat);
    codex.position.set(0.06, 0.04, 0.02);
    codex.rotation.y = -0.32;
    codex.castShadow = true;

    const parchmentQuire = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.07, 0.50), parchmentMat);
    parchmentQuire.position.set(-0.08, 0.10, 0.04);
    parchmentQuire.rotation.y = -0.18;
    parchmentQuire.castShadow = true;

    const scroll1 = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.62, 16), parchmentMat);
    scroll1.rotation.z = Math.PI / 2;
    scroll1.rotation.y = -0.36;
    scroll1.position.set(0.08, 0.18, -0.04);
    scroll1.castShadow = true;

    const scroll2 = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.54, 16), parchmentMat);
    scroll2.rotation.z = Math.PI / 2;
    scroll2.rotation.y = -0.22;
    scroll2.position.set(0.12, 0.27, -0.12);
    scroll2.castShadow = true;

    booksGroup.add(codex, parchmentQuire, scroll1, scroll2);
    group.add(booksGroup);

    const benchLight = new THREE.PointLight(0xffe4a0, isFinalePlaza ? 3.2 : 2.8, 18);
    benchLight.position.set(-0.15, 1.65, 0.25);
    group.add(benchLight);

    return { group, cloakGroup, booksGroup, benchLight };
  }

  // ==========================================================================
  // DISTRICT XLI — DOERS OF THE WORD (JAMES) BESPOKE ENSEMBLES
  // ==========================================================================
  createJames1BronzeMirrorAndWaterBasinTableEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d7a62',
      accentColor: '#d4be9b',
      roughness: 0.88,
      map: propTex
    });
    const timberMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4128',
      accentColor: '#9c7852',
      roughness: 0.80,
      map: propTex
    });
    const bronzeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a67b3c',
      accentColor: '#f6d88c',
      roughness: 0.32
    });
    const mirrorSurfaceMat = new THREE.MeshStandardMaterial({
      color: 0xf4dca0,
      emissive: 0xd8a848,
      emissiveIntensity: 0.28,
      roughness: 0.16,
      metalness: 0.72
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3b7c8c,
      emissive: 0x245668,
      emissiveIntensity: 0.34,
      roughness: 0.14,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#ebe0c9',
      accentColor: '#ffffff',
      roughness: 0.74
    });

    // Flagstone threshold base
    const baseSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.15, 2.38, 0.16, 24), 0.025, 3.0),
      stoneMat
    );
    baseSlab.position.y = 0.08;
    baseSlab.receiveShadow = true;
    group.add(baseSlab);

    // Rough-hewn timber table beside the open stone doorway (#5 "the mirror")
    const tableTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.35, 0.14, 1.35, 8, 2, 6), 0.015, 3.2),
      timberMat
    );
    tableTop.position.set(0, 0.86, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    for (const [lx, lz] of [
      [-0.96, -0.48],
      [0.96, -0.48],
      [-0.96, 0.48],
      [0.96, 0.48]
    ]) {
      const leg = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.18, 0.76, 0.18, 2, 4, 2), 0.01, 2.5),
        timberMat
      );
      leg.position.set(lx, 0.44, lz);
      leg.castShadow = true;
      group.add(leg);
    }

    // Open stone doorway arch behind the table overlooking the bay
    for (const sx of [-1.25, 1.25]) {
      const jamb = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.36, 2.65, 0.42, 3, 8, 3), 0.02, 3.0),
        stoneMat
      );
      jamb.position.set(sx, 1.40, -0.82);
      jamb.castShadow = true;
      group.add(jamb);
    }
    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.96, 0.34, 0.48, 8, 2, 3), 0.02, 3.0),
      stoneMat
    );
    lintel.position.set(0, 2.86, -0.82);
    lintel.castShadow = true;
    group.add(lintel);

    // Ornate polished bronze hand-mirror resting in the foreground of the table
    const mirrorGroup = new THREE.Group();
    mirrorGroup.position.set(0.12, 0.96, 0.22);
    mirrorGroup.rotation.y = -0.28;

    const mirrorRim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.045, 28), bronzeMat);
    mirrorRim.castShadow = true;
    const mirrorFace = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.05, 28), mirrorSurfaceMat);
    mirrorFace.position.y = 0.005;
    const mirrorHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.056, 0.42, 14), bronzeMat);
    mirrorHandle.rotation.x = Math.PI / 2;
    mirrorHandle.position.set(0, 0, 0.52);
    mirrorHandle.castShadow = true;
    mirrorGroup.add(mirrorRim, mirrorFace, mirrorHandle);
    group.add(mirrorGroup);

    // Deep ribbed bronze water basin filled with still water set beside the mirror ("it is a basin of water set beside it")
    const basinGroup = new THREE.Group();
    basinGroup.position.set(-0.56, 0.93, -0.10);

    const basinBowl = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.46, 0.32, 0.34, 24), 0.01, 3.2),
      bronzeMat
    );
    basinBowl.position.y = 0.17;
    basinBowl.castShadow = true;
    const basinLip = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.032, 10, 28), bronzeMat);
    basinLip.rotation.x = Math.PI / 2;
    basinLip.position.y = 0.34;
    const basinWater = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.03, 24), waterMat);
    basinWater.position.y = 0.30;
    basinGroup.add(basinBowl, basinLip, basinWater);
    group.add(basinGroup);

    // Folded fringed cream linen towel on the right side of the table
    const towelGroup = new THREE.Group();
    towelGroup.position.set(0.68, 0.96, -0.06);
    towelGroup.rotation.y = 0.24;
    const towelFold1 = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.54, 0.07, 0.68, 5, 2, 5), 0.012, 3.0),
      linenMat
    );
    const towelFold2 = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.48, 0.06, 0.60, 5, 2, 5), 0.012, 3.0),
      linenMat
    );
    towelFold2.position.set(-0.02, 0.06, 0.02);
    towelGroup.add(towelFold1, towelFold2);
    group.add(towelGroup);

    const mirrorLight = new THREE.PointLight(0xffe59e, isFinalePlaza ? 3.4 : 2.9, 18);
    mirrorLight.position.set(0.0, 1.85, 0.25);
    group.add(mirrorLight);

    return { group, mirrorGroup, basinGroup, basinWater, towelGroup, mirrorLight };
  }

  createJames3BoatSternAndTimberRudderEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const quayStoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7f7360',
      accentColor: '#c8b698',
      roughness: 0.88,
      map: propTex
    });
    const hullBlueMat = this.painterly.createPainterlyMaterial({
      baseColor: '#3a5d6c',
      accentColor: '#789ca8',
      roughness: 0.78,
      map: propTex
    });
    const timberMat = this.painterly.createPainterlyMaterial({
      baseColor: '#69492c',
      accentColor: '#b58b60',
      roughness: 0.76,
      map: propTex
    });
    const ropeMat = this.painterly.createPainterlyMaterial({
      baseColor: '#bfa272',
      accentColor: '#ebd4a8',
      roughness: 0.82
    });
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0x2b697c,
      emissive: 0x194252,
      emissiveIntensity: 0.30,
      roughness: 0.20,
      metalness: 0.18
    });

    // Harbor water & stone quay steps (#14 "small things steer")
    const waterPool = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.55, 0.14, 28), seaMat);
    waterPool.position.y = 0.07;
    group.add(waterPool);

    const quayBlock = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.75, 0.48, 1.55, 6, 3, 6), 0.025, 3.2),
      quayStoneMat
    );
    quayBlock.position.set(-1.05, 0.24, 0.35);
    quayBlock.castShadow = true;
    quayBlock.receiveShadow = true;
    group.add(quayBlock);

    // Weathered blue-green planked wooden boat stern moored beside the quay
    const sternGroup = new THREE.Group();
    sternGroup.position.set(0.32, 0.26, -0.10);
    sternGroup.rotation.y = -0.22;

    const hullBody = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(1.18, 0.82, 0.76, 18, 4), 0.025, 2.8),
      hullBlueMat
    );
    hullBody.scale.set(1.05, 1.0, 1.48);
    hullBody.position.y = 0.32;
    hullBody.castShadow = true;
    sternGroup.add(hullBody);

    const sternDeck = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.78, 0.10, 2.15, 6, 2, 6), 0.015, 3.0),
      timberMat
    );
    sternDeck.position.set(0, 0.68, 0);
    sternDeck.castShadow = true;
    sternGroup.add(sternDeck);

    // Coiled hemp mooring rope on the stern deck
    for (let r = 0; r < 3; r++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.28 - r * 0.04, 0.042, 10, 24), ropeMat);
      coil.rotation.x = Math.PI / 2;
      coil.position.set(-0.34, 0.76 + r * 0.055, 0.38);
      sternGroup.add(coil);
    }

    // Heavy timber steering rudder & tiller arm angled into the water
    const rudderGroup = new THREE.Group();
    rudderGroup.position.set(0.42, 0.76, -0.78);

    const rudderPost = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 1.48, 14), timberMat);
    rudderPost.rotation.x = 0.42;
    rudderPost.position.set(0, -0.22, -0.24);
    rudderPost.castShadow = true;

    const rudderBlade = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.10, 0.86, 0.56, 2, 5, 4), 0.012, 3.0),
      timberMat
    );
    rudderBlade.rotation.x = 0.42;
    rudderBlade.position.set(0, -0.58, -0.48);
    rudderBlade.castShadow = true;

    const tillerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, 1.32, 12), timberMat);
    tillerArm.rotation.x = Math.PI / 2 - 0.16;
    tillerArm.position.set(0, 0.32, 0.48);
    tillerArm.castShadow = true;

    rudderGroup.add(rudderPost, rudderBlade, tillerArm);
    sternGroup.add(rudderGroup);
    group.add(sternGroup);

    // Woven fisherman's basket on the stone quay
    const basket = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.32, 0.24, 0.38, 16), 0.018, 3.5),
      ropeMat
    );
    basket.position.set(-1.12, 0.66, 0.36);
    basket.castShadow = true;
    group.add(basket);

    const rudderLight = new THREE.PointLight(0xffe29c, isFinalePlaza ? 3.2 : 2.8, 18);
    rudderLight.position.set(0.2, 1.85, 0.2);
    group.add(rudderLight);

    return { group, sternGroup, rudderGroup, rudderLight };
  }

  createJames3RockySpringPoolAndFigBoughEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const limestoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d806a',
      accentColor: '#d7c8ae',
      roughness: 0.88,
      map: propTex
    });
    const springWaterMat = new THREE.MeshStandardMaterial({
      color: 0x358c9b,
      emissive: 0x1d5f6e,
      emissiveIntensity: 0.36,
      roughness: 0.14,
      metalness: 0.20,
      transparent: true,
      opacity: 0.90
    });
    const cascadeMat = new THREE.MeshBasicMaterial({
      color: 0xdff8ff,
      transparent: true,
      opacity: 0.78
    });
    const trunkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5e4630',
      accentColor: '#9b7b59',
      roughness: 0.84
    });
    const foliageMat = this.painterly.createPainterlyMaterial({
      baseColor: '#486e3a',
      accentColor: '#8cb369',
      roughness: 0.76
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b36e44',
      accentColor: '#e2a378',
      roughness: 0.74
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#efe1c2',
      accentColor: '#fff6df',
      roughness: 0.68
    });

    // Turquoise-blue stone spring pool base (#17 "the spring")
    const poolRim = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.15, 2.38, 0.34, 24), 0.04, 3.2),
      limestoneMat
    );
    poolRim.position.y = 0.17;
    poolRim.receiveShadow = true;
    group.add(poolRim);

    const poolWater = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.85, 0.06, 24), springWaterMat);
    poolWater.position.y = 0.32;
    group.add(poolWater);

    // Cleft limestone crags & cascading waterfall
    for (const [rx, ry, rz, sx, sy, sz] of [
      [-0.68, 1.05, -0.88, 1.15, 1.85, 0.95],
      [0.68, 1.12, -0.88, 1.18, 1.98, 0.95],
      [0.0, 0.75, -1.12, 1.35, 1.25, 0.85]
    ]) {
      const crag = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.68, 1), 0.06, 2.8),
        limestoneMat
      );
      crag.scale.set(sx, sy, sz);
      crag.position.set(rx, ry, rz);
      crag.castShadow = true;
      group.add(crag);
    }

    const cascadeStream = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 1.38, 16), cascadeMat);
    cascadeStream.position.set(0, 0.92, -0.62);
    cascadeStream.rotation.x = 0.24;
    group.add(cascadeStream);

    // Spreading fig tree bough arching above the spring ("Can a fig tree, my brothers, yield olives?")
    const figGroup = new THREE.Group();
    figGroup.position.set(0.88, 1.45, -0.92);
    const trunk = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.14, 0.22, 1.65, 10), 0.025, 3.0),
      trunkMat
    );
    trunk.rotation.z = 0.34;
    trunk.position.set(-0.22, 0.65, 0.12);
    figGroup.add(trunk);

    for (const [fx, fy, fz, fr] of [
      [-0.58, 1.35, 0.24, 0.62],
      [-0.12, 1.52, 0.10, 0.56],
      [-0.95, 1.22, 0.32, 0.48]
    ]) {
      const canopy = new THREE.Mesh(
        this.displaceGeometry(new THREE.IcosahedronGeometry(fr, 1), 0.05, 2.6),
        foliageMat
      );
      canopy.scale.set(1.25, 0.72, 1.15);
      canopy.position.set(fx, fy, fz);
      figGroup.add(canopy);
    }
    group.add(figGroup);

    // Flat foreground boulder on the left with unrolled parchment scroll & clay water pitcher
    const flatBoulder = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.96, 0.46, 0.78, 5, 3, 5), 0.03, 3.0),
      limestoneMat
    );
    flatBoulder.position.set(-1.12, 0.48, 0.48);
    flatBoulder.castShadow = true;
    group.add(flatBoulder);

    const scrollSheet = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.03, 0.36), parchmentMat);
    scrollSheet.position.set(-1.18, 0.73, 0.48);
    scrollSheet.rotation.y = 0.22;
    group.add(scrollSheet);

    const clayPitcher = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.11, 0.16, 0.38, 16), 0.01, 3.0),
      clayMat
    );
    clayPitcher.position.set(-0.86, 0.89, 0.42);
    clayPitcher.castShadow = true;
    group.add(clayPitcher);

    const springLight = new THREE.PointLight(0xd8f6ff, isFinalePlaza ? 3.3 : 2.9, 18);
    springLight.position.set(0.0, 1.85, 0.25);
    group.add(springLight);

    return { group, poolWater, cascadeStream, figGroup, springLight };
  }

  createJames5PlowedBarleyFieldAndRainStaffEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const earthMat = this.painterly.createPainterlyMaterial({
      baseColor: '#4c3828',
      accentColor: '#7e6146',
      roughness: 0.92,
      map: propTex
    });
    const stoneWallMat = this.painterly.createPainterlyMaterial({
      baseColor: '#857763',
      accentColor: '#c9ba9e',
      roughness: 0.88,
      map: propTex
    });
    const shootMat = this.painterly.createPainterlyMaterial({
      baseColor: '#669444',
      accentColor: '#b5d97e',
      roughness: 0.68
    });
    const staffMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e4c2e',
      accentColor: '#b88d62',
      roughness: 0.78
    });

    // Dark plowed earth field terrace base (#26 "the farmer")
    const fieldBase = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.25, 2.45, 0.22, 24), 0.03, 3.0),
      earthMat
    );
    fieldBase.position.y = 0.11;
    fieldBase.receiveShadow = true;
    group.add(fieldBase);

    // Parallel plowed earth furrows with tender green barley shoots sprouting along the ridges
    const shootsGroup = new THREE.Group();
    for (let row = -2; row <= 2; row++) {
      const rz = row * 0.44;
      const ridge = new THREE.Mesh(
        this.displaceGeometry(new THREE.CylinderGeometry(0.14, 0.20, 3.1, 12, 8), 0.025, 3.5),
        earthMat
      );
      ridge.rotation.z = Math.PI / 2;
      ridge.position.set(0, 0.24, rz);
      ridge.receiveShadow = true;
      group.add(ridge);

      for (let s = -4; s <= 4; s++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.34, 6), shootMat);
        blade.position.set(s * 0.32 + (row % 2) * 0.1, 0.44, rz);
        blade.rotation.z = (s % 2 === 0 ? 1 : -1) * 0.14;
        shootsGroup.add(blade);
      }
    }
    group.add(shootsGroup);

    // Low fieldstone boundary wall along the back edge
    for (let b = -3; b <= 3; b++) {
      const stone = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.28, 1), 0.035, 3.0),
        stoneWallMat
      );
      stone.scale.set(1.25, 0.85, 0.95);
      stone.position.set(b * 0.48, 0.38 + (Math.abs(b) % 2) * 0.08, -1.25);
      stone.castShadow = true;
      group.add(stone);
    }

    // Farmer's wooden walking staff planted upright among the boundary stones
    const staffGroup = new THREE.Group();
    staffGroup.position.set(0.68, 0.22, -0.32);
    const staffPole = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.042, 0.052, 2.05, 12), 0.01, 3.2),
      staffMat
    );
    staffPole.position.y = 1.02;
    staffPole.rotation.z = -0.08;
    staffPole.castShadow = true;
    staffGroup.add(staffPole);
    group.add(staffGroup);

    const rainLight = new THREE.PointLight(0xffe6a3, isFinalePlaza ? 3.3 : 2.9, 18);
    rainLight.position.set(0.0, 1.95, 0.25);
    group.add(rainLight);

    return { group, shootsGroup, staffGroup, rainLight };
  }

  // ==========================================================================
  // DISTRICT XLII — A LIVING HOPE (1 & 2 PETER & JUDE) BESPOKE ENSEMBLES
  // ==========================================================================
  create1Peter1GoldsmithCrucibleAndTongsHearthEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const hearthStoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d7d66',
      accentColor: '#d1bf9a',
      roughness: 0.88,
      map: propTex
    });
    const crucibleMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c7850',
      accentColor: '#e2b578',
      roughness: 0.72,
      map: propTex
    });
    const moltenGoldMat = new THREE.MeshStandardMaterial({
      color: 0xffcf48,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.88,
      roughness: 0.18,
      metalness: 0.78
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0x3b2820,
      emissive: 0xe85d1a,
      emissiveIntensity: 0.76,
      roughness: 0.82
    });
    const ironMat = this.painterly.createPainterlyMaterial({
      baseColor: '#48433d',
      accentColor: '#857d73',
      roughness: 0.56
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#e5d8be',
      accentColor: '#faf2e1',
      roughness: 0.76
    });
    const oliveLeafMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5a7046',
      accentColor: '#9bb37e',
      roughness: 0.74
    });

    // Recessed stone forge hearth base (#4 "tested by fire")
    const hearthBase = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.15, 2.38, 0.36, 24), 0.03, 3.2),
      hearthStoneMat
    );
    hearthBase.position.y = 0.18;
    hearthBase.receiveShadow = true;
    group.add(hearthBase);

    // Back stone forge curb wall
    const backCurb = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.85, 0.52, 0.56, 8, 3, 4), 0.025, 3.0),
      hearthStoneMat
    );
    backCurb.position.set(0, 0.58, -1.05);
    backCurb.castShadow = true;
    group.add(backCurb);

    // Glowing bed of red-orange charcoal embers in the center pit
    const emberGroup = new THREE.Group();
    emberGroup.position.set(0, 0.38, 0.0);
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const rad = 0.22 + (i % 3) * 0.22;
      const coal = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.13, 1), 0.025, 3.5),
        emberMat
      );
      coal.position.set(Math.cos(ang) * rad, (i % 2) * 0.04, Math.sin(ang) * rad);
      emberGroup.add(coal);
    }
    group.add(emberGroup);

    // Spouted clay-and-stone goldsmith's crucible glowing with molten gold inside
    const crucibleGroup = new THREE.Group();
    crucibleGroup.position.set(0, 0.44, 0.0);

    const crucibleWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.42, 0.28, 0.58, 24, 4, true), 0.015, 3.2),
      crucibleMat
    );
    crucibleWall.position.y = 0.29;
    crucibleWall.castShadow = true;

    const crucibleRim = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.042, 10, 28), crucibleMat);
    crucibleRim.rotation.x = Math.PI / 2;
    crucibleRim.position.y = 0.58;
    crucibleRim.scale.set(1.0, 1.14, 1.0);

    const moltenPool = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.14, 24), moltenGoldMat);
    moltenPool.position.y = 0.16;

    crucibleGroup.add(crucibleWall, crucibleRim, moltenPool);
    group.add(crucibleGroup);

    // Forged iron crucible tongs resting on the right stone hearth
    const tongsGroup = new THREE.Group();
    tongsGroup.position.set(0.76, 0.40, 0.34);
    tongsGroup.rotation.y = -0.58;
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 1.32, 10), ironMat);
      arm.rotation.x = Math.PI / 2;
      arm.rotation.z = s * 0.05;
      arm.position.set(s * 0.045, 0, 0);
      tongsGroup.add(arm);

      const jaw = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.028, 8, 16, Math.PI * 0.85), ironMat);
      jaw.rotation.x = Math.PI / 2;
      jaw.rotation.z = s === -1 ? 0.25 : Math.PI - 0.25;
      jaw.position.set(s * 0.02, 0, 0.72);
      tongsGroup.add(jaw);
    }
    group.add(tongsGroup);

    // Folded coarse linen cloth & clay cooling bowl on the left
    const clothFold = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.72, 0.14, 0.88, 6, 2, 6), 0.025, 3.0),
      linenMat
    );
    clothFold.position.set(-0.92, 0.43, 0.16);
    clothFold.rotation.y = 0.22;
    group.add(clothFold);

    const clayBowl = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.38, 0.26, 0.32, 20), 0.015, 3.0),
      hearthStoneMat
    );
    clayBowl.position.set(-1.05, 0.52, -0.56);
    group.add(clayBowl);

    // Olive branch resting on the back stone ledge
    const branchGroup = new THREE.Group();
    branchGroup.position.set(0.68, 0.86, -0.98);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.92, 8), crucibleMat);
    stem.rotation.z = Math.PI / 2 - 0.12;
    branchGroup.add(stem);
    for (let l = -3; l <= 3; l++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 6), oliveLeafMat);
      leaf.position.set(l * 0.11, 0.03, (l % 2 === 0 ? 1 : -1) * 0.06);
      leaf.rotation.x = (l % 2 === 0 ? 1 : -1) * 0.65;
      branchGroup.add(leaf);
    }
    group.add(branchGroup);

    const crucibleLight = new THREE.PointLight(0xffb84d, isFinalePlaza ? 3.5 : 3.1, 18);
    crucibleLight.position.set(0.0, 1.55, 0.15);
    group.add(crucibleLight);

    return { group, crucibleGroup, moltenPool, tongsGroup, emberGroup, crucibleLight };
  }

  create1Peter2LivingStonesWallAndCornerstoneEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const limestoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#918166',
      accentColor: '#e2ceb0',
      roughness: 0.86,
      map: propTex
    });
    const cornerstoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a8926e',
      accentColor: '#f6dcaf',
      roughness: 0.72,
      map: propTex
    });
    const basketMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6242',
      accentColor: '#bfa176',
      roughness: 0.84
    });
    const woodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5e4329',
      accentColor: '#9e7852',
      roughness: 0.78
    });

    // Earth & dressed stone foundation terrace (#10 "living stones")
    const terraceBase = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.25, 2.48, 0.22, 24), 0.03, 3.0),
      limestoneMat
    );
    terraceBase.position.y = 0.11;
    terraceBase.receiveShadow = true;
    group.add(terraceBase);

    // Rising wall of rough-hewn living stones meeting at a true square cornerstone
    const wallGroup = new THREE.Group();
    wallGroup.position.set(0, 0.22, -0.15);

    // Massive dressed Cornerstone at the front corner
    const cornerstone = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.92, 0.62, 0.92, 6, 4, 6), 0.018, 2.8),
      cornerstoneMat
    );
    cornerstone.position.set(0.38, 0.31, 0.24);
    cornerstone.castShadow = true;
    cornerstone.receiveShadow = true;
    wallGroup.add(cornerstone);

    // Interlocking courses of odd-shaped living stones ("odd shapes, chipped edges, stones nobody chose")
    const courses = [
      [-0.48, 0.26, 0.24, 0.78, 0.52, 0.68],
      [-1.22, 0.25, 0.22, 0.68, 0.50, 0.66],
      [0.42, 0.26, -0.58, 0.74, 0.52, 0.72],
      [-0.36, 0.76, 0.22, 0.74, 0.48, 0.64],
      [-1.08, 0.74, 0.20, 0.66, 0.46, 0.62],
      [0.36, 0.88, 0.22, 0.76, 0.50, 0.68]
    ];
    for (const [bx, by, bz, bw, bh, bd] of courses) {
      const block = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(bw, bh, bd, 5, 4, 5), 0.028, 3.2),
        limestoneMat
      );
      block.position.set(bx, by, bz);
      block.castShadow = true;
      block.receiveShadow = true;
      wallGroup.add(block);
    }

    // Upper living stone being set into place atop the wall
    const upperLivingStone = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.72, 0.50, 0.66, 5, 4, 5), 0.025, 3.0),
      cornerstoneMat
    );
    upperLivingStone.position.set(-0.22, 1.28, 0.22);
    upperLivingStone.rotation.z = -0.08;
    upperLivingStone.castShadow = true;
    wallGroup.add(upperLivingStone);
    group.add(wallGroup);

    // Stone-mason's woven mortar basket & wooden mallet handle on the left
    const mortarBasket = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.38, 0.28, 0.36, 18), 0.02, 3.4),
      basketMat
    );
    mortarBasket.position.set(-1.18, 0.40, 0.82);
    mortarBasket.castShadow = true;
    group.add(mortarBasket);

    const toolHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.58, 10), woodMat);
    toolHandle.position.set(-1.24, 0.62, 0.78);
    toolHandle.rotation.z = 0.48;
    group.add(toolHandle);

    const cornerstoneLight = new THREE.PointLight(0xffe5a3, isFinalePlaza ? 3.3 : 2.9, 18);
    cornerstoneLight.position.set(0.1, 1.85, 0.35);
    group.add(cornerstoneLight);

    return { group, wallGroup, upperLivingStone, cornerstoneLight };
  }

  create1Peter5WovenBurdenBasketAndWindowTableEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8b795e',
      accentColor: '#d8c8ae',
      roughness: 0.88,
      map: propTex
    });
    const timberMat = this.painterly.createPainterlyMaterial({
      baseColor: '#695138',
      accentColor: '#ab8c68',
      roughness: 0.80,
      map: propTex
    });
    const basketMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a5f3e',
      accentColor: '#c4a376',
      roughness: 0.84
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#e6dac2',
      accentColor: '#fbf5e8',
      roughness: 0.74
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a67b56',
      accentColor: '#dfb892',
      roughness: 0.76
    });

    // Stone floor slab (#21 "he cares for you")
    const floorSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.15, 2.38, 0.16, 24), 0.025, 3.0),
      stoneMat
    );
    floorSlab.position.y = 0.08;
    floorSlab.receiveShadow = true;
    group.add(floorSlab);

    // Weathered wooden table in the foreground where the heavy basket is set down
    const tableTop = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.38, 0.14, 1.36, 8, 2, 6), 0.015, 3.2),
      timberMat
    );
    tableTop.position.set(0, 0.86, 0.12);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    group.add(tableTop);

    for (const [lx, lz] of [
      [-0.98, -0.36],
      [0.98, -0.36],
      [-0.98, 0.60],
      [0.98, 0.60]
    ]) {
      const leg = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.18, 0.76, 0.18, 2, 4, 2), 0.01, 2.5),
        timberMat
      );
      leg.position.set(lx, 0.44, lz);
      leg.castShadow = true;
      group.add(leg);
    }

    // Sunlit stone window frame behind the table overlooking the sea
    for (const sx of [-1.22, 1.22]) {
      const jamb = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.38, 2.35, 0.44, 3, 8, 3), 0.02, 3.0),
        stoneMat
      );
      jamb.position.set(sx, 1.62, -0.82);
      jamb.castShadow = true;
      group.add(jamb);
    }
    const sill = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.88, 0.24, 0.56, 8, 2, 4), 0.02, 3.0),
      stoneMat
    );
    sill.position.set(0, 0.98, -0.82);
    group.add(sill);

    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.92, 0.32, 0.48, 8, 2, 3), 0.02, 3.0),
      stoneMat
    );
    lintel.position.set(0, 2.88, -0.82);
    group.add(lintel);

    // Large two-handled woven reed basket of burdens set down on the left of the table ("put it down")
    const basketGroup = new THREE.Group();
    basketGroup.position.set(-0.52, 0.93, 0.14);

    const basketBody = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.56, 0.42, 0.68, 22, 5), 0.025, 3.6),
      basketMat
    );
    basketBody.position.y = 0.34;
    basketBody.castShadow = true;
    basketGroup.add(basketBody);

    const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.045, 10, 26), basketMat);
    basketRim.rotation.x = Math.PI / 2;
    basketRim.position.y = 0.68;
    basketGroup.add(basketRim);

    // Two braided rope handles on the basket rim
    for (const hx of [-0.28, 0.28]) {
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.032, 8, 18, Math.PI), basketMat);
      handle.position.set(hx, 0.68, 0);
      basketGroup.add(handle);
    }

    // Folded heavy linen cloth bundles resting inside the basket
    const clothBundle1 = new THREE.Mesh(
      this.displaceGeometry(new THREE.DodecahedronGeometry(0.38, 1), 0.03, 3.0),
      linenMat
    );
    clothBundle1.scale.set(1.25, 0.62, 1.15);
    clothBundle1.position.set(0, 0.66, 0.04);
    basketGroup.add(clothBundle1);
    group.add(basketGroup);

    // Clay water pitcher & small handled cup-bowl on the sunlit window sill
    const clayPitcher = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.12, 0.18, 0.42, 16), 0.012, 3.0),
      clayMat
    );
    clayPitcher.position.set(0.78, 1.31, -0.78);
    clayPitcher.castShadow = true;
    group.add(clayPitcher);

    const clayCup = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.14, 0.09, 0.16, 16), 0.01, 3.0),
      clayMat
    );
    clayCup.position.set(0.42, 1.18, -0.76);
    group.add(clayCup);

    const careLight = new THREE.PointLight(0xffe7a3, isFinalePlaza ? 3.3 : 2.9, 18);
    careLight.position.set(0.0, 1.90, 0.25);
    group.add(careLight);

    return { group, basketGroup, careLight };
  }

  create2Peter1DarkPlaceClayLampAndMorningStarSillEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const sillStoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#726b5d',
      accentColor: '#b8ae99',
      roughness: 0.88,
      map: propTex
    });
    const terracottaMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e683c',
      accentColor: '#dca06a',
      roughness: 0.72,
      map: propTex
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#e8d9bc',
      accentColor: '#fff4dc',
      roughness: 0.68
    });
    const linenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#c9bca3',
      accentColor: '#ece1cc',
      roughness: 0.78
    });
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffe484
    });
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xfff8d6
    });

    // Deep-cut stone window ledge & embrasure (#27 "a lamp in a dark place")
    const basePlinth = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.15, 2.38, 0.18, 24), 0.025, 3.0),
      sillStoneMat
    );
    basePlinth.position.y = 0.09;
    basePlinth.receiveShadow = true;
    group.add(basePlinth);

    const stoneLedge = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.55, 0.72, 1.42, 8, 4, 6), 0.025, 3.2),
      sillStoneMat
    );
    stoneLedge.position.set(0, 0.54, 0);
    stoneLedge.castShadow = true;
    stoneLedge.receiveShadow = true;
    group.add(stoneLedge);

    for (const sx of [-1.18, 1.18]) {
      const casementWall = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.46, 2.25, 0.92, 4, 8, 4), 0.025, 3.0),
        sillStoneMat
      );
      casementWall.position.set(sx, 1.98, -0.18);
      casementWall.castShadow = true;
      group.add(casementWall);
    }

    // Spouted terracotta oil lamp burning on the left of the stone windowsill
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-0.48, 0.92, 0.14);
    lampGroup.rotation.y = 0.25;

    const lampBody = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.28, 18, 14), 0.012, 3.2),
      terracottaMat
    );
    lampBody.scale.set(1.38, 0.56, 0.95);
    lampBody.position.y = 0.14;
    lampBody.castShadow = true;

    const lampNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.09, 0.24, 12), terracottaMat);
    lampNozzle.rotation.z = Math.PI / 2 - 0.22;
    lampNozzle.position.set(-0.34, 0.19, 0);

    const lampHandle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.026, 8, 16), terracottaMat);
    lampHandle.position.set(0.34, 0.18, 0);

    const lampFlame = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.26, 12), flameMat);
    lampFlame.position.set(-0.38, 0.36, 0);

    lampGroup.add(lampBody, lampNozzle, lampHandle, lampFlame);
    group.add(lampGroup);

    // Rolled prophetic parchment scroll on a folded linen cloth & small clay jar on the right
    const scrollCloth = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.86, 0.08, 0.78, 6, 2, 6), 0.018, 3.0),
      linenMat
    );
    scrollCloth.position.set(0.46, 0.94, 0.12);
    group.add(scrollCloth);

    const propheticScroll = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.72, 16), parchmentMat);
    propheticScroll.rotation.z = Math.PI / 2;
    propheticScroll.rotation.y = -0.38;
    propheticScroll.position.set(0.44, 1.04, 0.10);
    propheticScroll.castShadow = true;
    group.add(propheticScroll);

    const smallJar = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.14, 0.18, 0.32, 16), 0.012, 3.0),
      terracottaMat
    );
    smallJar.position.set(0.66, 1.08, -0.22);
    smallJar.castShadow = true;
    group.add(smallJar);

    // Rising Morning Star beacon suspended in the window opening ("until the day dawns, and the morning star arises")
    const morningStar = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), starMat);
    morningStar.position.set(0.28, 2.25, -0.85);
    group.add(morningStar);

    const lampLight = new THREE.PointLight(0xffd97d, isFinalePlaza ? 3.5 : 3.1, 18);
    lampLight.position.set(-0.35, 1.55, 0.25);
    group.add(lampLight);

    return { group, lampGroup, lampFlame, morningStar, lampLight };
  }

  // ==========================================================================
  // DISTRICT XLIII — LITTLE CHILDREN (1–3 JOHN) BESPOKE ENSEMBLES
  // ==========================================================================
  create1John1SunlitFellowshipRoadWallAndOliveEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const roadMat = this.painterly.createPainterlyMaterial({
      baseColor: '#a89678',
      accentColor: '#e4d2b4',
      roughness: 0.88,
      map: propTex
    });
    const stoneWallMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d7f68',
      accentColor: '#d4c4a8',
      roughness: 0.88,
      map: propTex
    });
    const trunkMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c4631',
      accentColor: '#9b7b59',
      roughness: 0.84
    });
    const foliageMat = this.painterly.createPainterlyMaterial({
      baseColor: '#566e46',
      accentColor: '#9eb882',
      roughness: 0.76
    });
    const terracottaMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9e683c',
      accentColor: '#dca06a',
      roughness: 0.72
    });
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xffe68c
    });

    // Sunlit country road terrace (#4 "in the light, together")
    const roadBase = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.25, 2.48, 0.20, 24), 0.025, 3.0),
      roadMat
    );
    roadBase.position.y = 0.10;
    roadBase.receiveShadow = true;
    group.add(roadBase);

    // Low dry-stone field wall along the left side of the road
    const wallGroup = new THREE.Group();
    wallGroup.position.set(-1.18, 0.20, 0.0);
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(i / 5);
      const col = i % 5;
      const stone = new THREE.Mesh(
        this.displaceGeometry(new THREE.DodecahedronGeometry(0.28, 1), 0.035, 3.2),
        stoneWallMat
      );
      stone.scale.set(1.15, 0.78, 1.05);
      stone.position.set((row % 2) * 0.08, 0.18 + row * 0.34, -0.88 + col * 0.44);
      stone.castShadow = true;
      wallGroup.add(stone);
    }
    group.add(wallGroup);

    // Gnarled olive tree & rocky bank on the right side of the road
    const oliveGroup = new THREE.Group();
    oliveGroup.position.set(1.12, 0.20, -0.25);

    const trunk = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.16, 0.28, 1.75, 10, 5), 0.03, 3.0),
      trunkMat
    );
    trunk.position.y = 0.85;
    trunk.rotation.z = -0.16;
    trunk.castShadow = true;
    oliveGroup.add(trunk);

    for (const [cx, cy, cz, cr] of [
      [-0.18, 1.82, 0.08, 0.68],
      [0.28, 1.95, -0.10, 0.62],
      [-0.45, 1.65, -0.18, 0.52]
    ]) {
      const canopy = new THREE.Mesh(
        this.displaceGeometry(new THREE.IcosahedronGeometry(cr, 1), 0.05, 2.6),
        foliageMat
      );
      canopy.scale.set(1.22, 0.76, 1.15);
      canopy.position.set(cx, cy, cz);
      oliveGroup.add(canopy);
    }
    group.add(oliveGroup);

    // Two companion clay oil lamps & walking staffs side by side on a milestone block ("side by side")
    const milestone = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.18, 0.44, 0.72, 5, 3, 4), 0.02, 3.0),
      stoneWallMat
    );
    milestone.position.set(0, 0.42, 0.18);
    milestone.castShadow = true;
    group.add(milestone);

    const lampsGroup = new THREE.Group();
    lampsGroup.position.set(0, 0.64, 0.18);
    for (const lx of [-0.26, 0.26]) {
      const lamp = new THREE.Mesh(
        this.displaceGeometry(new THREE.SphereGeometry(0.16, 14, 10), 0.01, 3.0),
        terracottaMat
      );
      lamp.scale.set(1.32, 0.55, 0.92);
      lamp.position.set(lx, 0.08, 0);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 10), flameMat);
      flame.position.set(lx - 0.14, 0.22, 0);
      lampsGroup.add(lamp, flame);
    }
    group.add(lampsGroup);

    const fellowshipLight = new THREE.PointLight(0xffe29c, isFinalePlaza ? 3.4 : 3.0, 18);
    fellowshipLight.position.set(0.0, 1.85, 0.25);
    group.add(fellowshipLight);

    return { group, wallGroup, oliveGroup, lampsGroup, fellowshipLight };
  }

  create1John3OpenDoorThresholdAndCompassionLoafEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#9c9078',
      accentColor: '#dfd2b8',
      roughness: 0.88,
      map: propTex
    });
    const doorWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#665138',
      accentColor: '#a68964',
      roughness: 0.80,
      map: propTex
    });
    const crustMat = this.painterly.createPainterlyMaterial({
      baseColor: '#b87e3c',
      accentColor: '#f2c87c',
      roughness: 0.68
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8d7558',
      accentColor: '#ccb292',
      roughness: 0.78
    });
    const foliageMat = this.painterly.createPainterlyMaterial({
      baseColor: '#5c7348',
      accentColor: '#9fb884',
      roughness: 0.76
    });
    const ironMat = this.painterly.createPainterlyMaterial({
      baseColor: '#3f3a34',
      accentColor: '#787066',
      roughness: 0.55
    });

    // Raised stone doorstep threshold (#18 "the closed door" -> "so leave it open. a loaf on the step is a small thing.")
    const stepSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.65, 0.28, 1.58, 8, 2, 6), 0.02, 3.0),
      stoneMat
    );
    stepSlab.position.set(0, 0.14, 0.12);
    stepSlab.receiveShadow = true;
    group.add(stepSlab);

    // Stone doorway frame
    for (const sx of [-0.96, 0.96]) {
      const jamb = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.46, 2.68, 0.48, 4, 8, 4), 0.025, 3.0),
        stoneMat
      );
      jamb.position.set(sx, 1.62, -0.32);
      jamb.castShadow = true;
      group.add(jamb);
    }
    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.48, 0.36, 0.52, 8, 2, 4), 0.025, 3.0),
      stoneMat
    );
    lintel.position.set(0, 3.08, -0.32);
    lintel.castShadow = true;
    group.add(lintel);

    // Weathered vertical-planked wooden door standing half-open with an iron ring handle
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.72, 0.28, -0.32);
    doorPivot.rotation.y = 0.56;

    const doorPanel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.18, 2.56, 0.10, 6, 8, 2), 0.015, 3.2),
      doorWoodMat
    );
    doorPanel.position.set(0.59, 1.28, 0);
    doorPanel.castShadow = true;

    const crossBatten = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.16, 0.22, 0.14, 6, 2, 2), 0.01, 2.8),
      doorWoodMat
    );
    crossBatten.position.set(0.59, 1.05, 0.02);

    const ironRing = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 8, 18), ironMat);
    ironRing.position.set(1.02, 1.26, 0.08);

    doorPivot.add(doorPanel, crossBatten, ironRing);
    group.add(doorPivot);

    // Warm crusty round loaf of bread set on the stone doorstep in the pool of light
    const loafGroup = new THREE.Group();
    loafGroup.position.set(0.24, 0.28, 0.16);
    const loafMesh = new THREE.Mesh(
      this.displaceGeometry(new THREE.SphereGeometry(0.28, 18, 14), 0.018, 3.4),
      crustMat
    );
    loafMesh.scale.set(1.22, 0.66, 1.05);
    loafMesh.position.y = 0.16;
    loafMesh.castShadow = true;
    loafGroup.add(loafMesh);
    group.add(loafGroup);

    // Tall clay jar with olive boughs on the left & woven basket with cloth on the right
    const amphora = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.20, 0.26, 0.72, 18), 0.015, 3.0),
      clayMat
    );
    amphora.position.set(-1.38, 0.48, 0.18);
    amphora.castShadow = true;
    group.add(amphora);

    for (const [bx, by, bz] of [
      [-1.44, 1.05, 0.16],
      [-1.30, 1.15, 0.20]
    ]) {
      const bough = new THREE.Mesh(
        this.displaceGeometry(new THREE.IcosahedronGeometry(0.24, 1), 0.03, 2.6),
        foliageMat
      );
      bough.scale.set(0.85, 1.45, 0.85);
      bough.position.set(bx, by, bz);
      group.add(bough);
    }

    const stepBasket = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.32, 0.25, 0.48, 16), 0.02, 3.4),
      clayMat
    );
    stepBasket.position.set(1.36, 0.36, 0.22);
    stepBasket.castShadow = true;
    group.add(stepBasket);

    const doorLight = new THREE.PointLight(0xffe59e, isFinalePlaza ? 3.4 : 3.0, 18);
    doorLight.position.set(0.22, 1.75, 0.15);
    group.add(doorLight);

    return { group, doorPivot, loafGroup, doorLight };
  }

  create1John4OpenShuttersAndBillowingLinenEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8e836f',
      accentColor: '#d9cbb4',
      roughness: 0.88,
      map: propTex
    });
    const shutterWoodMat = this.painterly.createPainterlyMaterial({
      baseColor: '#7a6246',
      accentColor: '#ba9c78',
      roughness: 0.78,
      map: propTex
    });
    const sheerCurtainMat = new THREE.MeshStandardMaterial({
      color: 0xf6eedc,
      emissive: 0xffe8bd,
      emissiveIntensity: 0.22,
      roughness: 0.62,
      transparent: true,
      opacity: 0.84,
      side: THREE.DoubleSide
    });
    const matStraw = this.painterly.createPainterlyMaterial({
      baseColor: '#7c6444',
      accentColor: '#bfa074',
      roughness: 0.88
    });
    const clayMat = this.painterly.createPainterlyMaterial({
      baseColor: '#8f6948',
      accentColor: '#cc9e76',
      roughness: 0.76
    });

    // Sunlit stone floor & woven reed mat (#25 "no fear in love" -> "fear keeps the shutters closed... love opens them")
    const floorSlab = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.25, 2.48, 0.16, 24), 0.02, 3.0),
      stoneMat
    );
    floorSlab.position.y = 0.08;
    floorSlab.receiveShadow = true;
    group.add(floorSlab);

    const reedMat = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.75, 0.04, 1.35, 6, 1, 6), 0.01, 3.5),
      matStraw
    );
    reedMat.position.set(-0.18, 0.18, 0.36);
    group.add(reedMat);

    // Tall stone doorway & wide-flung wooden shutters
    for (const sx of [-1.05, 1.05]) {
      const jamb = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(0.42, 2.75, 0.46, 4, 8, 4), 0.025, 3.0),
        stoneMat
      );
      jamb.position.set(sx, 1.54, -0.48);
      jamb.castShadow = true;
      group.add(jamb);
    }
    const lintel = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.65, 0.34, 0.50, 8, 2, 4), 0.025, 3.0),
      stoneMat
    );
    lintel.position.set(0, 3.02, -0.48);
    group.add(lintel);

    const leftShutter = new THREE.Group();
    leftShutter.position.set(-0.84, 0.18, -0.32);
    leftShutter.rotation.y = 1.18;
    const leftLeaf = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.76, 2.58, 0.08, 4, 8, 2), 0.012, 3.0),
      shutterWoodMat
    );
    leftLeaf.position.set(0.38, 1.29, 0);
    leftShutter.add(leftLeaf);
    group.add(leftShutter);

    const rightShutter = new THREE.Group();
    rightShutter.position.set(0.84, 0.18, -0.32);
    rightShutter.rotation.y = -1.18;
    const rightLeaf = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.76, 2.58, 0.08, 4, 8, 2), 0.012, 3.0),
      shutterWoodMat
    );
    rightLeaf.position.set(-0.38, 1.29, 0);
    rightShutter.add(rightLeaf);
    group.add(rightShutter);

    // Billowing sheer cream linen curtain catching the warm breeze on the right
    const curtainGroup = new THREE.Group();
    curtainGroup.position.set(0.68, 1.62, -0.10);
    const curtainPlane = new THREE.Mesh(
      this.displaceGeometry(new THREE.PlaneGeometry(1.18, 2.65, 12, 16), 0.12, 2.2),
      sheerCurtainMat
    );
    curtainPlane.rotation.z = 0.22;
    curtainPlane.rotation.y = -0.28;
    curtainGroup.add(curtainPlane);
    group.add(curtainGroup);

    // Wooden stool & clay bowl on the right, clay olive jar on the left
    const stoolTop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.56), shutterWoodMat);
    stoolTop.position.set(1.15, 0.68, 0.38);
    group.add(stoolTop);

    const clayBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.16, 16), clayMat);
    clayBowl.position.set(1.15, 0.80, 0.38);
    group.add(clayBowl);

    const oliveJar = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.52, 16), clayMat);
    oliveJar.position.set(-1.28, 0.92, 0.18);
    group.add(oliveJar);

    const loveLight = new THREE.PointLight(0xffebb0, isFinalePlaza ? 3.5 : 3.1, 18);
    loveLight.position.set(0.0, 1.95, 0.20);
    group.add(loveLight);

    return { group, leftShutter, rightShutter, curtainGroup, loveLight };
  }

  create2John12InkwellParchmentAndTravelerCloakStaffEnsemble({ isFinalePlaza = false, propTex = null } = {}) {
    const THREE = this.THREE;
    const group = new THREE.Group();

    const stoneBenchMat = this.painterly.createPainterlyMaterial({
      baseColor: '#908670',
      accentColor: '#d8ccb4',
      roughness: 0.88,
      map: propTex
    });
    const parchmentMat = this.painterly.createPainterlyMaterial({
      baseColor: '#f0e4c8',
      accentColor: '#fff9eb',
      roughness: 0.66
    });
    const inkwellMat = new THREE.MeshStandardMaterial({
      color: 0x242826,
      roughness: 0.26,
      metalness: 0.35
    });
    const reedPenMat = this.painterly.createPainterlyMaterial({
      baseColor: '#967244',
      accentColor: '#d9b580',
      roughness: 0.62
    });
    const cloakMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6d705c',
      accentColor: '#a6a892',
      roughness: 0.82,
      map: propTex
    });
    const staffMat = this.painterly.createPainterlyMaterial({
      baseColor: '#6e5236',
      accentColor: '#b58e64',
      roughness: 0.78
    });

    // Stone writing bench & courtyard wall corner (#32 "paper and ink" -> "he puts the pen down... he would rather pick up his cloak")
    const basePlinth = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(2.15, 2.38, 0.16, 24), 0.025, 3.0),
      stoneBenchMat
    );
    basePlinth.position.y = 0.08;
    basePlinth.receiveShadow = true;
    group.add(basePlinth);

    const writingBench = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(2.45, 0.68, 1.38, 8, 4, 6), 0.02, 3.2),
      stoneBenchMat
    );
    writingBench.position.set(0, 0.48, 0.08);
    writingBench.castShadow = true;
    writingBench.receiveShadow = true;
    group.add(writingBench);

    const backWall = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(1.85, 2.25, 0.32, 6, 8, 3), 0.02, 3.0),
      stoneBenchMat
    );
    backWall.position.set(0.32, 1.58, -0.52);
    backWall.castShadow = true;
    group.add(backWall);

    // Cream parchment letter sheet, dark glazed ceramic inkwell, and reed pen set down on the left
    const writingGroup = new THREE.Group();
    writingGroup.position.set(-0.46, 0.83, 0.24);

    const letterSheet = new THREE.Mesh(
      this.displaceGeometry(new THREE.BoxGeometry(0.76, 0.025, 0.62, 6, 1, 6), 0.008, 3.0),
      parchmentMat
    );
    letterSheet.rotation.y = 0.22;
    writingGroup.add(letterSheet);

    const inkwell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.18, 20), inkwellMat);
    inkwell.position.set(0.38, 0.09, -0.04);
    inkwell.castShadow = true;
    writingGroup.add(inkwell);

    const reedPen = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.68, 10), reedPenMat);
    reedPen.rotation.z = Math.PI / 2;
    reedPen.rotation.y = -0.34;
    reedPen.position.set(0.06, 0.03, 0.16);
    reedPen.castShadow = true;
    writingGroup.add(reedPen);
    group.add(writingGroup);

    // Folded sage-grey traveler's wool cloak & wooden walking staff leaning against the wall on the right
    const cloakGroup = new THREE.Group();
    cloakGroup.position.set(0.56, 0.84, 0.08);
    for (const [cx, cy, cz, sx, sy, sz, ry] of [
      [0, 0.10, 0, 0.92, 0.16, 0.78, 0.18],
      [0.08, 0.24, -0.06, 0.78, 0.18, 0.66, -0.22],
      [-0.04, 0.38, -0.12, 0.62, 0.16, 0.54, 0.12]
    ]) {
      const fold = new THREE.Mesh(
        this.displaceGeometry(new THREE.BoxGeometry(sx, sy, sz, 6, 3, 6), 0.025, 3.0),
        cloakMat
      );
      fold.position.set(cx, cy, cz);
      fold.rotation.y = ry;
      fold.castShadow = true;
      cloakGroup.add(fold);
    }
    group.add(cloakGroup);

    const staffPole = new THREE.Mesh(
      this.displaceGeometry(new THREE.CylinderGeometry(0.042, 0.048, 1.68, 12), 0.01, 3.0),
      staffMat
    );
    staffPole.position.set(0.32, 1.56, -0.18);
    staffPole.rotation.z = -0.22;
    staffPole.rotation.x = -0.16;
    staffPole.castShadow = true;
    group.add(staffPole);

    const inkLight = new THREE.PointLight(0xffe6a3, isFinalePlaza ? 3.3 : 2.9, 18);
    inkLight.position.set(-0.15, 1.85, 0.30);
    group.add(inkLight);

    return { group, writingGroup, reedPen, cloakGroup, staffPole, inkLight };
  }
}

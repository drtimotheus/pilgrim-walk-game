// ============================================================================
// THE PILGRIM WALK — Painterly Shader & Derived-Texture Engine
// Derives 3D relief meshes, 360° painterly environments, Kuwahara brushstroke
// post-processing, and canvas-grained prop textures directly from Timothy Holt's paintings.
// ============================================================================

export class PainterlyEngine {
  constructor(THREE, renderer) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.canvasNoiseTex = this.createCanvasGrainTexture();
    this.brushNormalTex = this.createBrushNormalTexture();
  }

  // Creates a subtle woven linen canvas & impasto grain texture
  createCanvasGrainTexture() {
    const THREE = this.THREE;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        // Linen weave pattern + organic paper grain
        const weaveX = Math.sin((x / size) * Math.PI * 64) * 10;
        const weaveY = Math.sin((y / size) * Math.PI * 64) * 10;
        const grain = (Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1) * 18 - 9;
        const val = Math.max(0, Math.min(255, 128 + weaveX + weaveY + grain));
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Creates a painterly brushstroke normal/roughness map so props never look like smooth plastic
  createBrushNormalTexture() {
    const THREE = this.THREE;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, size, size);

    // Paint overlapping directional brushstrokes
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 14 + Math.random() * 28;
      const h = 3 + Math.random() * 7;
      const angle = (Math.random() - 0.5) * 0.45;
      const nx = Math.floor(128 + (Math.random() - 0.5) * 50);
      const ny = Math.floor(128 + (Math.random() - 0.5) * 50);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = `rgb(${nx},${ny},245)`;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Extracts a depth map and extended 360° painterly texture directly from a loaded painting image
  deriveSceneMapsFromImage(img, sceneKind = 'garden') {
    const THREE = this.THREE;
    const w = 256;
    const h = 256;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h).data;

    // 1. Compute painterly depth map: combines vertical perspective gradient + luminance/warmth + local contrast
    const depthCanvas = document.createElement('canvas');
    depthCanvas.width = w;
    depthCanvas.height = h;
    const dCtx = depthCanvas.getContext('2d');
    const dImg = dCtx.createImageData(w, h);
    const dData = dImg.data;

    for (let y = 0; y < h; y++) {
      const vFrac = y / (h - 1); // 0 = top (sky), 1 = bottom (foreground)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = pixels[i] / 255;
        const g = pixels[i + 1] / 255;
        const b = pixels[i + 2] / 255;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        const warmth = Math.max(0, r - b);

        // Foreground rises at bottom and dark/rich silhouettes (like the great tree or ark or rocks) push forward in relief
        let depth = Math.pow(vFrac, 1.35) * 0.65;
        if (sceneKind === 'garden') {
          // Great tree on right & foreground rocks/scroll table pop out in 3D relief
          const darkness = 1.0 - lum;
          depth += darkness * 0.38 + warmth * 0.12;
        } else if (sceneKind === 'light') {
          // Dark water waves & foreground embankment vs central light column
          depth += (1.0 - lum * 0.5) * 0.3 * vFrac + warmth * 0.2;
        } else if (sceneKind === 'bow') {
          // Sloping hill, Ark on right ridge, foreground stone cairn/altar on left
          depth += (1.0 - lum) * 0.35 + vFrac * 0.25;
        } else {
          depth += (1.0 - lum) * 0.3;
        }

        const dVal = Math.max(0, Math.min(255, Math.floor(depth * 255)));
        dData[i] = dVal;
        dData[i + 1] = dVal;
        dData[i + 2] = dVal;
        dData[i + 3] = 255;
      }
    }
    dCtx.putImageData(dImg, 0, 0);
    // Smooth depth slightly so mesh displacement is sculptural and organic, not jagged
    const smoothCanvas = document.createElement('canvas');
    smoothCanvas.width = w;
    smoothCanvas.height = h;
    const sCtx = smoothCanvas.getContext('2d');
    sCtx.filter = 'blur(4px)';
    sCtx.drawImage(depthCanvas, 0, 0);

    const depthTex = new THREE.CanvasTexture(smoothCanvas);

    // 2. Outpaint / Extend the painting into a seamless 360° surround panorama
    // Uses mirrored horizon/sky/ground bands with soft painterly blending and brushstroke stamps
    const panoW = 1024;
    const panoH = 512;
    const panoCanvas = document.createElement('canvas');
    panoCanvas.width = panoW;
    panoCanvas.height = panoH;
    const pCtx = panoCanvas.getContext('2d');

    // Fill four quadrants with seamlessly mirrored strips of the painting so edges never seam
    pCtx.save();
    // Center-front: original painting aspect stretched across front 140 degrees
    pCtx.drawImage(img, panoW * 0.25, 0, panoW * 0.5, panoH);
    // Left wrap (mirrored horizontally)
    pCtx.save();
    pCtx.translate(panoW * 0.25, 0);
    pCtx.scale(-1, 1);
    pCtx.drawImage(img, 0, 0, panoW * 0.25, panoH);
    pCtx.restore();
    // Right wrap (mirrored horizontally)
    pCtx.save();
    pCtx.translate(panoW, 0);
    pCtx.scale(-1, 1);
    pCtx.drawImage(img, 0, 0, panoW * 0.25, panoH);
    pCtx.restore();

    // Soften the side/back surround with painterly dabs sampled from the painting's own pixels
    for (let s = 0; s < 1400; s++) {
      const u = Math.random();
      // Concentrate dabs on the side/back extensions so the front anchor stays crisp
      if (u > 0.3 && u < 0.7 && Math.random() < 0.7) continue;
      const v = Math.random();
      const sx = Math.min(w - 1, Math.floor(((u * 2) % 1) * w));
      const sy = Math.min(h - 1, Math.floor(v * h));
      const idx = (sy * w + sx) * 4;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];

      pCtx.save();
      pCtx.translate(u * panoW, v * panoH);
      pCtx.rotate((Math.random() - 0.5) * 0.5);
      pCtx.fillStyle = `rgba(${r},${g},${b},0.28)`;
      const bw = 18 + Math.random() * 44;
      const bh = 6 + Math.random() * 16;
      pCtx.beginPath();
      pCtx.ellipse(0, 0, bw, bh, 0, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.restore();
    }
    pCtx.restore();

    const panoTex = new THREE.CanvasTexture(panoCanvas);
    panoTex.wrapS = THREE.RepeatWrapping;
    panoTex.wrapT = THREE.ClampToEdgeWrapping;
    panoTex.colorSpace = THREE.SRGBColorSpace;

    // 3. Derive a painterly ground texture sampled from the bottom 30% of the painting
    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 512;
    groundCanvas.height = 512;
    const gCtx = groundCanvas.getContext('2d');
    // Draw bottom crop of painting
    gCtx.drawImage(img, 0, img.height * 0.65, img.width, img.height * 0.35, 0, 0, 512, 512);
    // Stamp overlapping painterly strokes sampled from the ground region so it tiles organically
    for (let s = 0; s < 1800; s++) {
      const gx = Math.random() * 512;
      const gy = Math.random() * 512;
      const sx = Math.floor(Math.random() * w);
      const sy = Math.floor((0.68 + Math.random() * 0.30) * h);
      const idx = (sy * w + sx) * 4;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
      gCtx.save();
      gCtx.translate(gx, gy);
      gCtx.rotate(Math.random() * Math.PI);
      gCtx.fillStyle = `rgba(${r},${g},${b},0.35)`;
      gCtx.beginPath();
      gCtx.ellipse(0, 0, 12 + Math.random() * 26, 4 + Math.random() * 10, 0, 0, Math.PI * 2);
      gCtx.fill();
      gCtx.restore();
    }
    const groundTex = new THREE.CanvasTexture(groundCanvas);
    groundTex.wrapS = THREE.RepeatWrapping;
    groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(6, 6);
    groundTex.colorSpace = THREE.SRGBColorSpace;

    // 4. Derive a painterly prop texture (for stone bench, tree bark, stone altar, arches)
    // directly from the painting's brushwork and palette
    const propCanvas = document.createElement('canvas');
    propCanvas.width = 256;
    propCanvas.height = 256;
    const prCtx = propCanvas.getContext('2d');
    prCtx.drawImage(img, img.width * 0.5, img.height * 0.5, img.width * 0.5, img.height * 0.5, 0, 0, 256, 256);
    for (let s = 0; s < 900; s++) {
      const px = Math.random() * 256;
      const py = Math.random() * 256;
      const sx = Math.floor((0.35 + Math.random() * 0.6) * w);
      const sy = Math.floor((0.45 + Math.random() * 0.5) * h);
      const idx = (sy * w + sx) * 4;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
      prCtx.fillStyle = `rgba(${r},${g},${b},0.4)`;
      prCtx.fillRect(px - 10, py - 3, 20 + Math.random() * 16, 5 + Math.random() * 8);
    }
    const propTex = new THREE.CanvasTexture(propCanvas);
    propTex.wrapS = THREE.RepeatWrapping;
    propTex.wrapT = THREE.RepeatWrapping;
    propTex.colorSpace = THREE.SRGBColorSpace;

    return { depthTex, panoTex, groundTex, propTex, pixels, w, h };
  }

  // Creates a painterly material derived from a palette or sampled texture with canvas grain & warm rim lighting
  createPainterlyMaterial(options = {}) {
    const THREE = this.THREE;
    const {
      map = null,
      baseColor = '#8a7962',
      accentColor = '#dbb87b',
      roughness = 0.88,
      metalness = 0.04,
      bumpScale = 0.035,
      emissive = '#000000',
      emissiveIntensity = 0.0,
      displacementMap = null,
      displacementScale = 0.0,
      transparent = false,
      opacity = 1.0,
      side = THREE.FrontSide
    } = options;

    // If no texture map is provided, synthesize a brushstroke-painted canvas texture from baseColor & accentColor
    const finalMap = map || this.createSynthesizedBrushTexture(baseColor, accentColor);

    const mat = new THREE.MeshStandardMaterial({
      map: finalMap,
      bumpMap: this.canvasNoiseTex,
      bumpScale: bumpScale,
      normalMap: this.brushNormalTex,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughness: roughness,
      metalness: metalness,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: emissiveIntensity,
      displacementMap: displacementMap,
      displacementScale: displacementScale,
      transparent: transparent,
      opacity: opacity,
      side: side
    });

    return mat;
  }

  // Generates a hand-painted oil/tempera texture in Timothy's warm palette so NO surface ever has a flat solid color
  createSynthesizedBrushTexture(hexBase, hexAccent, size = 256) {
    const THREE = this.THREE;
    const key = `${hexBase}_${hexAccent}_${size}`;
    if (!this._synthCache) this._synthCache = new Map();
    if (this._synthCache.has(key)) return this._synthCache.get(key);

    const c1 = new THREE.Color(hexBase);
    const c2 = new THREE.Color(hexAccent);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = `#${c1.getHexString()}`;
    ctx.fillRect(0, 0, size, size);

    const temp = new THREE.Color();
    for (let i = 0; i < 1100; i++) {
      const mix = Math.random() * 0.45;
      temp.copy(c1).lerp(c2, mix);
      // Slight value variation like oil pigment
      const jitter = (Math.random() - 0.5) * 0.14;
      temp.r = Math.max(0, Math.min(1, temp.r + jitter));
      temp.g = Math.max(0, Math.min(1, temp.g + jitter));
      temp.b = Math.max(0, Math.min(1, temp.b + jitter));

      ctx.save();
      ctx.translate(Math.random() * size, Math.random() * size);
      ctx.rotate((Math.random() - 0.5) * 0.6);
      ctx.fillStyle = `rgba(${Math.floor(temp.r * 255)},${Math.floor(temp.g * 255)},${Math.floor(temp.b * 255)},0.38)`;
      const w = 10 + Math.random() * 34;
      const h = 4 + Math.random() * 12;
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    this._synthCache.set(key, tex);
    return tex;
  }

  // Creates a soft glowing sprite texture for god-rays, pollen motes, and hidden Lights
  createGlowSpriteTexture(hexColor = '#ffe4a8') {
    const THREE = this.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, hexColor);
    grad.addColorStop(0.65, hexColor + '44');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Creates a painterly foliage cluster texture with visible leaf brushwork (no smooth plastic spheres/cones)
  createPainterlyFoliageTexture(hexLeaf = '#5d6344', hexHighlight = '#b89f6d') {
    const THREE = this.THREE;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const cLeaf = new THREE.Color(hexLeaf);
    const cHigh = new THREE.Color(hexHighlight);
    const temp = new THREE.Color();

    // Paint organic olive/oak leaf dabs radiating from center with alpha cutout
    for (let i = 0; i < 420; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.65) * 102;
      const x = 128 + Math.cos(angle) * dist;
      const y = 128 + Math.sin(angle) * dist;

      // Upper leaves catch golden sun
      const sunMix = Math.max(0, (128 - y) / 128) * 0.55 + Math.random() * 0.25;
      temp.copy(cLeaf).lerp(cHigh, sunMix);
      const j = (Math.random() - 0.5) * 0.12;
      temp.offsetHSL(0, 0, j);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + (Math.random() - 0.5) * 0.8);
      ctx.fillStyle = `rgba(${Math.floor(temp.r * 255)},${Math.floor(temp.g * 255)},${Math.floor(temp.b * 255)},0.85)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, 10 + Math.random() * 14, 4 + Math.random() * 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}

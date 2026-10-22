// ============================================================================
// THE PILGRIM WALK — Painterly Post-Process, Komorebi God-Rays, Bloom & Water
// Upgrades the visual engine to the "Komorebi: A Forest Flight" atmospheric standard:
//   1. Screen-space Volumetric God-Ray radial light scattering toward the sun/dawn
//   2. Soft Golden-Hour Bloom on highlights, water glints, lantern rings, and sky
//   3. Anisotropic Kuwahara painterly finish + linen canvas weave + height mist
//   4. Animated Komorebi Water Shader (rippling normal waves, sun specular glints,
//      shoreline foam, and sky reflection)
// ============================================================================

export class PainterlyPostProcess {
  constructor(THREE, renderer, painterlyEngine) {
    this.THREE = THREE;
    this.renderer = renderer;
    this.painterly = painterlyEngine;
    this.enabled = true;

    const size = renderer.getSize(new THREE.Vector2());
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.rt = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat
    });

    this.orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.orthoScene = new THREE.Scene();

    this.sunScreenPos = new THREE.Vector2(0.5, 0.68);
    this.sunWorldDir = new THREE.Vector3(0.22, 0.16, -0.95).normalize();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.rt.texture },
        tCanvas: { value: this.painterly.canvasNoiseTex },
        uResolution: { value: new THREE.Vector2(size.x * pr, size.y * pr) },
        uTime: { value: 0.0 },
        uSunScreenPos: { value: new THREE.Vector2(0.5, 0.65) },
        uSunVisible: { value: 1.0 },
        uGodRayStrength: { value: 0.34 },
        uBloomStrength: { value: 0.28 },
        uPainterlyStrength: { value: 0.52 },
        uCanvasStrength: { value: 0.035 },
        uWarmthTint: { value: new THREE.Color('#f7e8ce') }
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform sampler2D tCanvas;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform vec2 uSunScreenPos;
        uniform float uSunVisible;
        uniform float uGodRayStrength;
        uniform float uBloomStrength;
        uniform float uPainterlyStrength;
        uniform float uCanvasStrength;
        uniform vec3 uWarmthTint;
        varying vec2 vUv;

        // 4-quadrant Kuwahara filter for painterly oil brushwork
        vec3 kuwahara(vec2 uv, vec2 texel) {
          vec3 m[4];
          vec3 s[4];
          for (int k = 0; k < 4; ++k) {
            m[k] = vec3(0.0);
            s[k] = vec3(0.0);
          }
          for (int j = -2; j <= 0; ++j) {
            for (int i = -2; i <= 0; ++i) {
              vec3 c = texture2D(tDiffuse, uv + vec2(float(i), float(j)) * texel).rgb;
              m[0] += c; s[0] += c * c;
            }
          }
          for (int j = -2; j <= 0; ++j) {
            for (int i = 0; i <= 2; ++i) {
              vec3 c = texture2D(tDiffuse, uv + vec2(float(i), float(j)) * texel).rgb;
              m[1] += c; s[1] += c * c;
            }
          }
          for (int j = 0; j <= 2; ++j) {
            for (int i = 0; i <= 2; ++i) {
              vec3 c = texture2D(tDiffuse, uv + vec2(float(i), float(j)) * texel).rgb;
              m[2] += c; s[2] += c * c;
            }
          }
          for (int j = 0; j <= 2; ++j) {
            for (int i = -2; i <= 0; ++i) {
              vec3 c = texture2D(tDiffuse, uv + vec2(float(i), float(j)) * texel).rgb;
              m[3] += c; s[3] += c * c;
            }
          }

          float minSigma2 = 1e+4;
          vec3 result = texture2D(tDiffuse, uv).rgb;
          for (int k = 0; k < 4; ++k) {
            m[k] /= 9.0;
            s[k] = abs(s[k] / 9.0 - m[k] * m[k]);
            float sigma2 = s[k].r + s[k].g + s[k].b;
            if (sigma2 < minSigma2) {
              minSigma2 = sigma2;
              result = m[k];
            }
          }
          return result;
        }

        // Screen-space Komorebi Volumetric God-Rays (radial light scattering from sun through tree boughs)
        vec3 computeGodRays(vec2 uv) {
          if (uSunVisible <= 0.01) return vec3(0.0);
          vec2 delta = (uv - uSunScreenPos) * (0.82 / 16.0);
          vec2 sampleUv = uv;
          vec3 accum = vec3(0.0);
          float decay = 1.0;
          for (int i = 0; i < 16; i++) {
            sampleUv -= delta;
            vec3 samp = texture2D(tDiffuse, clamp(sampleUv, 0.002, 0.998)).rgb;
            float lum = dot(samp, vec3(0.299, 0.587, 0.114));
            // Only scatter bright sky/sun pixels occluded by darker branches/arches
            float mask = smoothstep(0.58, 0.92, lum);
            accum += samp * mask * decay * 0.075;
            decay *= 0.935;
          }
          return accum * uSunVisible * uGodRayStrength;
        }

        // Soft Golden-Hour Highlight Bloom
        vec3 computeSoftBloom(vec2 uv, vec2 texel) {
          vec3 bloom = vec3(0.0);
          float weights[5];
          weights[0] = 0.22;
          weights[1] = 0.19;
          weights[2] = 0.15;
          weights[3] = 0.11;
          weights[4] = 0.07;

          for (int i = -2; i <= 2; i++) {
            for (int j = -2; j <= 2; j++) {
              vec2 off = vec2(float(i), float(j)) * texel * 4.5;
              vec3 c = texture2D(tDiffuse, clamp(uv + off, 0.002, 0.998)).rgb;
              float lum = dot(c, vec3(0.299, 0.587, 0.114));
              float hi = smoothstep(0.62, 0.95, lum);
              bloom += c * hi * 0.055;
            }
          }
          return bloom * uBloomStrength;
        }

        void main() {
          vec2 texel = 1.1 / uResolution;
          vec3 rawCol = texture2D(tDiffuse, vUv).rgb;
          vec3 paintedCol = kuwahara(vUv, texel);
          vec3 col = mix(rawCol, paintedCol, uPainterlyStrength);

          // Add Komorebi Volumetric God-Rays & Soft Golden Bloom
          col += computeGodRays(vUv) * vec3(1.0, 0.91, 0.72);
          col += computeSoftBloom(vUv, texel) * vec3(1.0, 0.93, 0.78);

          // Subtle linen canvas weave texture
          vec2 canvasUv = vUv * (uResolution / 180.0);
          float canvasVal = texture2D(tCanvas, canvasUv).r - 0.5;
          col += canvasVal * uCanvasStrength;

          // Warm museum-grade color grading & soft vignette
          col = mix(col, col * uWarmthTint, 0.14);
          float dist = distance(vUv, vec2(0.5, 0.5));
          float vig = smoothstep(0.82, 0.30, dist);
          col *= mix(0.78, 1.03, vig);

          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthWrite: false,
      depthTest: false
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.orthoScene.add(quad);
  }

  setSize(width, height) {
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    this.rt.setSize(width * pr, height * pr);
    this.material.uniforms.uResolution.value.set(width * pr, height * pr);
  }

  render(scene, camera, time) {
    this.material.uniforms.uTime.value = time;

    // Project sun direction into screen-space UV for radial Komorebi god-rays
    const THREE = this.THREE;
    const sunWorld = camera.position.clone().addScaledVector(this.sunWorldDir, 200.0);
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const sunFacingDot = camForward.dot(this.sunWorldDir);

    sunWorld.project(camera);
    this.material.uniforms.uSunScreenPos.value.set(
      sunWorld.x * 0.5 + 0.5,
      sunWorld.y * 0.5 + 0.5
    );
    this.material.uniforms.uSunVisible.value = Math.max(0.0, Math.min(1.0, (sunFacingDot + 0.15) * 1.1));

    if (!this.enabled) {
      this.renderer.render(scene, camera);
      return;
    }
    this.renderer.setRenderTarget(this.rt);
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.orthoScene, this.orthoCamera);
  }
}

// Creates a Komorebi-style reflective, rippling water shader with sun specular glints,
// shoreline foam, and painterly sky reflection
export function createKomorebiWaterMaterial(THREE, options = {}) {
  const {
    deepColor = '#3a463d',
    shallowColor = '#7d8773',
    sunColor = '#ffe4a8',
    sunDir = new THREE.Vector3(0.22, 0.18, -0.95).normalize(),
    opacity = 0.90
  } = options;

  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0.0 },
      uDeepColor: { value: new THREE.Color(deepColor) },
      uShallowColor: { value: new THREE.Color(shallowColor) },
      uSunColor: { value: new THREE.Color(sunColor) },
      uSunDir: { value: sunDir },
      uCameraPos: { value: new THREE.Vector3() },
      uOpacity: { value: opacity }
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      varying float vWaveHeight;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float w1 = sin(pos.x * 0.85 + uTime * 1.5) * cos(pos.z * 0.65 - uTime * 1.1) * 0.045;
        float w2 = sin((pos.x + pos.z) * 1.7 - uTime * 2.1) * 0.022;
        pos.y += w1 + w2;
        vWaveHeight = w1 + w2;
        vec4 wp = modelMatrix * vec4(pos, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      uniform vec3 uCameraPos;
      uniform float uOpacity;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      varying float vWaveHeight;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        // Multi-layered scrolling DuDv-style normal perturbation
        vec2 p = vWorldPos.xz * 0.55;
        float n1 = noise(p * 2.2 + vec2(uTime * 0.45, -uTime * 0.35));
        float n2 = noise(p * 4.5 - vec2(uTime * 0.30, uTime * 0.52));
        float n3 = noise(p * 9.0 + vec2(uTime * 0.7, uTime * 0.2));
        float ripple = n1 * 0.5 + n2 * 0.35 + n3 * 0.15;

        vec3 normal = normalize(vec3(
          (n1 - n2) * 0.38,
          1.0,
          (n2 - n3) * 0.38
        ));

        vec3 viewDir = normalize(uCameraPos - vWorldPos);
        float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 3.2);

        // Shallow bank to deep center gradient + painterly sky reflection
        float edgeDist = min(vUv.x, 1.0 - vUv.x) * 2.0;
        vec3 baseWater = mix(uShallowColor, uDeepColor, smoothstep(0.0, 0.65, edgeDist));
        vec3 skyReflect = mix(baseWater, uSunColor * 0.92, 0.42 + 0.35 * ripple);
        vec3 col = mix(baseWater, skyReflect, clamp(fresnel * 0.85 + 0.18, 0.0, 1.0));

        // Golden-hour sun specular glints dancing on the water
        vec3 halfVec = normalize(normalize(uSunDir) + viewDir);
        float spec = pow(max(0.0, dot(normal, halfVec)), 48.0);
        float sparkle = smoothstep(0.66, 0.82, ripple) * pow(max(0.0, dot(normal, halfVec)), 12.0);
        col += uSunColor * (spec * 1.15 + sparkle * 0.65);

        // Soft shoreline foam along riverbanks
        float bankFoam = smoothstep(0.16, 0.02, edgeDist) * smoothstep(0.38, 0.65, ripple);
        col = mix(col, uSunColor, bankFoam * 0.48);

        // Distance atmospheric mist blend
        float dist = length(uCameraPos - vWorldPos);
        float mist = smoothstep(25.0, 145.0, dist);
        col = mix(col, mix(uShallowColor, uSunColor, 0.5), mist * 0.65);

        gl_FragColor = vec4(col, uOpacity);
      }
    `
  });
}

// Creates a dynamic painterly sky dome shader that blends the sampled palette (top, horizon, ground, accent)
// with animated painterly cloud strokes and a radiant sun/dawn glow.
export function createPainterlySkyDome(THREE, radius = 260) {
  const geo = new THREE.SphereGeometry(radius, 48, 32);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTopColor: { value: new THREE.Color('#b79d7e') },
      uHorizonColor: { value: new THREE.Color('#cfc3ac') },
      uGroundColor: { value: new THREE.Color('#686050') },
      uAccentColor: { value: new THREE.Color('#dbb87b') },
      uSunDir: { value: new THREE.Vector3(0.22, 0.16, -0.95).normalize() },
      uTime: { value: 0.0 },
      uStarIntensity: { value: 0.0 },
      uRainbowIntensity: { value: 0.0 }
    },
    vertexShader: /* glsl */`
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uGroundColor;
      uniform vec3 uAccentColor;
      uniform vec3 uSunDir;
      uniform float uTime;
      uniform float uStarIntensity;
      uniform float uRainbowIntensity;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * noise(p);
          p *= 2.05;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldPos);
        float y = dir.y;

        // Vertical gradient between ground, horizon, and zenith
        vec3 col = mix(uHorizonColor, uTopColor, smoothstep(-0.02, 0.65, max(0.0, y)));
        if (y < 0.0) {
          col = mix(uHorizonColor, uGroundColor, smoothstep(0.0, -0.35, y));
        }

        // Layered distant mountain/hill silhouettes on the horizon (Komorebi depth layers)
        if (y > -0.06 && y < 0.14) {
          float angle = atan(dir.x, dir.z);
          float ridge1 = 0.045 + 0.028 * sin(angle * 5.0 + 1.2) + 0.015 * noise(vec2(angle * 12.0, 1.0));
          float ridge2 = 0.022 + 0.018 * cos(angle * 7.0 - 0.8) + 0.012 * noise(vec2(angle * 18.0, 2.0));
          if (y < ridge1) {
            vec3 farHill = mix(uHorizonColor, uGroundColor, 0.32);
            col = mix(col, farHill, smoothstep(ridge1, ridge1 - 0.008, y) * 0.75);
          }
          if (y < ridge2) {
            vec3 midHill = mix(uHorizonColor, uGroundColor, 0.56);
            col = mix(col, midHill, smoothstep(ridge2, ridge2 - 0.008, y) * 0.85);
          }
        }

        // Painterly cloud brushstrokes across sky
        if (y > -0.02) {
          vec2 cloudUv = dir.xz / (abs(y) + 0.28) * 1.4 + vec2(uTime * 0.004, 0.0);
          float c1 = fbm(cloudUv);
          float c2 = fbm(cloudUv * 2.3 - vec2(0.0, uTime * 0.003));
          float cloudMask = smoothstep(0.38, 0.78, c1 * 0.65 + c2 * 0.35) * smoothstep(-0.01, 0.18, y);
          col = mix(col, mix(uHorizonColor, uAccentColor, 0.52), cloudMask * 0.46);
        }

        // Warm golden-hour sun disc & atmospheric halo (triggers screen-space god-rays)
        float sunDot = max(0.0, dot(dir, normalize(uSunDir)));
        col += uAccentColor * pow(sunDot, 5.5) * 0.48;
        col += vec3(1.0, 0.96, 0.84) * pow(sunDot, 65.0) * 0.92;

        // Stars kindling overhead (for Genesis No. 1 "let there be" & night/dusk moments)
        if (uStarIntensity > 0.01 && y > 0.05) {
          vec2 starGrid = floor(dir.xz / (y + 0.4) * 95.0);
          float sVal = hash(starGrid);
          if (sVal > 0.986) {
            float twinkle = 0.65 + 0.35 * sin(uTime * 2.5 + sVal * 100.0);
            float starVis = smoothstep(0.05, 0.35, y) * uStarIntensity * twinkle;
            col += vec3(1.0, 0.94, 0.80) * starVis * 0.95;
          }
        }

        // Subtle sky rainbow arc (for Genesis No. 11 "the bow in the cloud")
        if (uRainbowIntensity > 0.01 && y > 0.0 && dir.z < 0.0) {
          vec2 bowCenter = vec2(0.0, 0.06);
          float rDist = length(vec2(dir.x, y - bowCenter.y));
          float band = (rDist - 0.44) / 0.085;
          if (band > 0.0 && band < 1.0) {
            vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (band * vec3(0.85, 0.85, 0.85) + vec3(0.0, 0.33, 0.67)));
            float feather = sin(band * 3.14159);
            col = mix(col, mix(col, rainbow, 0.58), feather * uRainbowIntensity * smoothstep(0.0, 0.12, y));
          }
        }

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  return new THREE.Mesh(geo, mat);
}

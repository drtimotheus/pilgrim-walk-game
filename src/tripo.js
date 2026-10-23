// ============================================================================
// THE PILGRIM WALK — 3D (.glb) Relic Loader & Painterly Adapter (All 175 Scenes)
// Supports:
//   1. All 16 named Hero Relics in assets/models/<id>.glb
//   2. All 175 Step-Through Painting Scenes across all 44 Books in
//      assets/models/scenes/<districtSlug>-<paintingNum>.glb (or Music/<folder>/scene-<N>.glb)
//   3. Adapts imported GLTF/GLB PBR materials to match the warm oil-on-linen
//      painterly aesthetic (softened specular, linen micro-bump, warm shadows).
//   4. Supports live browser drag-and-drop / upload of .glb files from
//      Tripo3D Studio or Microsoft TRELLIS!
// ============================================================================

export class TripoRelicManager {
  constructor(THREE, painterly) {
    this.THREE = THREE;
    this.painterly = painterly;
    this.loader = null;
    this.manifest = null;
    this.modelCache = new Map(); // id -> THREE.Group template
    this.statusMap = new Map();  // id -> 'loaded' | 'procedural'
    this.loadingSet = new Set(); // id currently probing/loading
    this.activeMountPoints = new Map(); // id -> Set of { group, scale, yOffset }
  }

  async ensureLoader() {
    if (this.loader) return this.loader;
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js');
      this.loader = new mod.GLTFLoader();
    } catch (e) {
      console.warn('GLTFLoader fallback to procedural models:', e);
    }
    return this.loader;
  }

  async init() {
    try {
      const res = await fetch('assets/models/tripo-manifest.json?v=44_12');
      this.manifest = await res.json();
    } catch (e) {
      console.warn('Tripo manifest load fallback:', e);
      this.manifest = { models: [] };
    }

    // Probe which named .glb files are already saved in assets/models/
    if (this.manifest && this.manifest.models) {
      await Promise.all(
        this.manifest.models.map(async (item) => {
          try {
            const headRes = await fetch(item.file, { method: 'HEAD' });
            if (headRes.ok && !(headRes.headers.get('content-type') || '').includes('text/html')) {
              await this.loadGlbFromUrl(item.id, item.file, item.targetScale || 2.2);
            } else {
              this.statusMap.set(item.id, 'procedural');
            }
          } catch (_) {
            this.statusMap.set(item.id, 'procedural');
          }
        })
      );
    }
  }

  // Applies warm oil-on-linen painterly surface grading to any imported Tripo3D or TRELLIS mesh
  applyPainterlyAdaptation(rootObj) {
    const THREE = this.THREE;
    const bumpTex = this.painterly ? this.painterly.canvasNoiseTex : null;

    rootObj.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          // Remove harsh CGI plastic shine & add linen canvas micro-relief
          if ('roughness' in mat) {
            mat.roughness = Math.max(0.74, mat.roughness || 0.84);
          }
          if ('metalness' in mat) {
            mat.metalness = Math.min(0.32, mat.metalness || 0.06);
          }
          if (bumpTex && !mat.bumpMap) {
            mat.bumpMap = bumpTex;
            mat.bumpScale = 0.016;
          }
          if (mat.color) {
            // Subtle warm golden-hour tint to harmonize with Timothy's palettes
            const warm = new THREE.Color('#fff6e8');
            mat.color.multiply(warm);
          }
          mat.needsUpdate = true;
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  normalizeAndCenterModel(gltfScene, targetExtent = 2.4) {
    const THREE = this.THREE;
    const wrapper = new THREE.Group();
    const clone = gltfScene.clone(true);

    this.applyPainterlyAdaptation(clone);

    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = targetExtent / maxDim;
    clone.scale.setScalar(scale);

    // Center X/Z and place bottom flush at Y = 0
    clone.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale
    );

    let isPaintingSculpture = false;
    clone.traverse((ch) => {
      if (ch.name === 'PaintingSculptureMonument' || ch.name === 'PaintingSculptureMesh') {
        isPaintingSculpture = true;
      }
    });

    wrapper.add(clone);
    wrapper.userData.isPaintingSculpture = isPaintingSculpture;
    return wrapper;
  }

  async loadGlbFromUrl(id, url, targetScale = 2.4) {
    const loader = await this.ensureLoader();
    if (!loader) {
      this.statusMap.set(id, 'procedural');
      return false;
    }
    return new Promise((resolve) => {
      loader.load(
        url,
        (gltf) => {
          const normalized = this.normalizeAndCenterModel(gltf.scene, targetScale);
          this.modelCache.set(id, normalized);
          this.statusMap.set(id, 'loaded');
          this.refreshMountedInstances(id);
          resolve(true);
        },
        undefined,
        () => {
          this.statusMap.set(id, 'procedural');
          resolve(false);
        }
      );
    });
  }

  // Hot-swap a .glb file dropped by the user directly into the browser window!
  async loadGlbFromFile(id, fileObj) {
    const item = this.manifest?.models?.find((m) => m.id === id);
    const targetScale = item ? item.targetScale : 2.4;
    const blobUrl = URL.createObjectURL(fileObj);
    const ok = await this.loadGlbFromUrl(id, blobUrl, targetScale);
    return ok;
  }

  // Called by props/scenes to register a mount point for a named Hero Relic
  mountRelic(targetGroup, id, options = {}) {
    const scale = options.scale || 1.0;
    const yOffset = options.yOffset || 0.0;

    // Mark current children of targetGroup as procedural fallback so they hide if GLB loads
    targetGroup.children.forEach((ch) => {
      if (!ch.userData.isTripoMesh && !ch.isLight && !ch.isSprite) {
        ch.userData.isProceduralFallback = true;
      }
    });

    if (!this.activeMountPoints.has(id)) {
      this.activeMountPoints.set(id, new Set());
    }
    this.activeMountPoints.get(id).add({ group: targetGroup, scale, yOffset });

    if (this.modelCache.has(id)) {
      this.injectCachedModelIntoGroup(id, targetGroup, scale, yOffset);
    }
  }

  // Automatically probes and mounts a .glb model for ANY of the 175 Step-Through Painting Scenes!
  async mountSceneGlbIfAvailable(targetGroup, districtSlug, paintingNum, options = {}) {
    if (!targetGroup || !districtSlug || !paintingNum) return;
    const sceneKey = `scene-${districtSlug}-${paintingNum}`;
    const scale = options.scale || 1.0;
    const yOffset = options.yOffset ?? 0.18;
    const targetExtent = options.targetExtent || 2.6;

    // Also check if one of the 16 named hero relics corresponds to this exact (districtSlug, paintingNum)
    const namedMap = {
      'genesis-4': 'sabbath-olive-tree',
      'genesis-11': 'noah-stone-altar',
      'exodus-5': 'burning-bush-crag',
      'exodus-25': 'sinai-stone-tablets',
      'fire-by-night-5': 'bronze-altar-horns',
      'fire-by-night-21': 'golden-menorah',
      'fire-by-night-33': 'nehushtan-bronze-serpent',
      'choose-life-30': 'shechem-witness-stone',
      'joshua-judges-10': 'jericho-rams-horn-shofar',
      'joshua-judges-19': 'shechem-witness-stone',
      'joshua-judges-20': 'joseph-coffin-chest',
      'joshua-judges-33': 'gideon-broken-pitcher',
      'ruth-20': 'ruth-kinsman-sandal',
      'samuel-6': 'samuel-clay-lamp',
      'samuel-15': 'samuel-anointing-horn',
      'kings-21': 'elijah-folded-mantle'
    };
    const namedId = namedMap[`${districtSlug}-${paintingNum}`];
    if (namedId && this.modelCache.has(namedId)) {
      this.mountRelic(targetGroup, namedId, { scale, yOffset });
      return;
    }

    this.mountRelic(targetGroup, sceneKey, { scale, yOffset });
    if (this.modelCache.has(sceneKey) || this.loadingSet.has(sceneKey)) return;

    this.loadingSet.add(sceneKey);
    const candidateUrls = [
      `assets/models/scenes/${districtSlug}-${paintingNum}.glb`,
      ...(namedId ? [`assets/models/${namedId}.glb`] : [])
    ];

    for (const url of candidateUrls) {
      try {
        const headRes = await fetch(url, { method: 'HEAD' });
        if (headRes.ok && !(headRes.headers.get('content-type') || '').includes('text/html')) {
          const loaded = await this.loadGlbFromUrl(sceneKey, url, targetExtent);
          if (loaded) break;
        }
      } catch (_) {}
    }
    this.loadingSet.delete(sceneKey);
  }

  injectCachedModelIntoGroup(id, targetGroup, scale, yOffset) {
    const template = this.modelCache.get(id);
    if (!template) return;

    const isPaintingSculpture = Boolean(template.userData && template.userData.isPaintingSculpture);

    // If this is a standalone Tripo3D / TRELLIS 3D object, hide procedural fallback children (keeping base plinth)
    // If this is a 3D Sculpted Painting Monument, keep the central 3D symbol on the plinth and rise as a 3D sculpted altarpiece behind it!
    if (!isPaintingSculpture) {
      targetGroup.children.forEach((ch) => {
        if (ch.userData.isProceduralFallback && !ch.userData.keepWithGlb) {
          ch.visible = false;
        }
      });
    }

    // Remove any previous Tripo/TRELLIS instance on this group
    const prev = targetGroup.children.find((ch) => ch.userData.isTripoMesh);
    if (prev) targetGroup.remove(prev);

    const instance = template.clone(true);
    instance.scale.multiplyScalar(isPaintingSculpture ? scale * 1.18 : scale);
    instance.position.y += yOffset;
    if (isPaintingSculpture) {
      instance.position.z -= 1.38;
    }
    instance.userData.isTripoMesh = true;
    targetGroup.add(instance);
  }

  refreshMountedInstances(id) {
    const mounts = this.activeMountPoints.get(id);
    if (!mounts) return;
    mounts.forEach(({ group, scale, yOffset }) => {
      this.injectCachedModelIntoGroup(id, group, scale, yOffset);
    });
  }
}

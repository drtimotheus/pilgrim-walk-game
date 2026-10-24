// ============================================================================
// THE PILGRIM WALK — 3D (.glb) Relic Loader & Painterly Adapter (All 175 Scenes)
// Supports:
//   1. All Sacred Hero Relics in assets/models/<id>.glb (modeled with the Relic Maker)
//   2. All 175 Step-Through Painting Scenes across all 44 Books in
//      assets/models/scenes/<districtSlug>-<paintingNum>.glb
//   3. Adapts imported GLTF/GLB PBR materials to match the warm oil-on-linen
//      painterly aesthetic (softened specular, linen micro-bump, warm shadows).
//   4. Supports live browser drag-and-drop / upload of .glb files in The Relic Workshop!
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
    this.loadingPromises = new Map(); // id -> Promise<boolean>
    this.activeMountPoints = new Map(); // id -> Set of { group, scale, yOffset }
    this.relicById = new Map(); // id -> manifest item
    this.districtRelicMap = {
      genesis: ['pilgrim-lantern', 'sabbath-olive-tree', 'noah-stone-altar', 'tower-of-babel', 'joseph-coffin-chest'],
      exodus: ['burning-bush-crag', 'sinai-stone-tablets'],
      'fire-by-night': ['bronze-altar-horns', 'golden-menorah', 'nehushtan-bronze-serpent'],
      'choose-life': ['shechem-witness-stone'],
      'joshua-judges': ['jericho-rams-horn-shofar', 'shechem-witness-stone', 'joseph-coffin-chest', 'gideon-broken-pitcher'],
      ruth: ['ruth-kinsman-sandal'],
      samuel: ['samuel-clay-lamp', 'samuel-anointing-horn'],
      kings: ['elijah-folded-mantle'],
      'our-eyes-are-on-you': ['choir-army-trumpet'],
      'rise-up-and-build': ['trowel-and-sword'],
      'for-such-a-time-as-this': ['golden-scepter'],
      'out-of-the-whirlwind': ['ash-heap-potsherd'],
      'psalms-1': ['shepherds-rod-and-staff'],
      'psalms-2': ['davids-harp'],
      'psalms-3': ['sparrows-nest-altar'],
      'psalms-4': ['praise-cymbals'],
      'the-beginning-of-wisdom': ['apples-of-gold'],
      'eternity-in-their-hearts': ['threefold-cord'],
      'many-waters': ['sealed-fountain'],
      'arise-shine': ['live-coal-tongs'],
      'a-future-and-a-hope': ['potters-wheel'],
      'new-every-morning': ['ruined-watchtower'],
      'can-these-bones-live': ['wheel-within-a-wheel'],
      'a-door-of-hope': ['door-of-hope'],
      'greatly-beloved': ['stone-cut-without-hands'],
      'out-of-the-deep': ['great-fish'],
      'the-day-of-small-things': ['zerubbabels-plumb-line'],
      'good-news-of-great-joy': ['the-manger']
    };
    this.districtHeroRelicPlacement = {
      'our-eyes-are-on-you': { id: 'choir-army-trumpet', paintingNum: 25, scale: 1.0, yOffset: 0.24 },
      'rise-up-and-build': { id: 'trowel-and-sword', paintingNum: 29, scale: 1.0, yOffset: 0.24 },
      'for-such-a-time-as-this': { id: 'golden-scepter', paintingNum: 18, scale: 1.0, yOffset: 0.34, royalCushion: true },
      'out-of-the-whirlwind': { id: 'ash-heap-potsherd', paintingNum: 4, scale: 1.0, yOffset: 0.24 },
      'psalms-1': { id: 'shepherds-rod-and-staff', paintingNum: 22, scale: 1.0, yOffset: 0.24 },
      'psalms-2': { id: 'davids-harp', paintingNum: 16, scale: 1.0, yOffset: 0.24 },
      'psalms-3': { id: 'sparrows-nest-altar', paintingNum: 12, scale: 1.0, yOffset: 0.24 },
      'psalms-4': { id: 'praise-cymbals', paintingNum: 44, scale: 1.0, yOffset: 0.24 },
      'the-beginning-of-wisdom': { id: 'apples-of-gold', paintingNum: 14, scale: 1.0, yOffset: 0.24 },
      'eternity-in-their-hearts': { id: 'threefold-cord', paintingNum: 16, scale: 1.0, yOffset: 0.24 },
      'many-waters': { id: 'sealed-fountain', paintingNum: 14, scale: 1.0, yOffset: 0.24 },
      'arise-shine': { id: 'live-coal-tongs', paintingNum: 3, scale: 1.0, yOffset: 0.24 },
      'a-future-and-a-hope': { id: 'potters-wheel', paintingNum: 16, scale: 1.0, yOffset: 0.24 },
      'new-every-morning': { id: 'ruined-watchtower', paintingNum: 24, scale: 1.0, yOffset: 0.24 },
      'can-these-bones-live': { id: 'wheel-within-a-wheel', paintingNum: 2, scale: 1.0, yOffset: 0.24 },
      'a-door-of-hope': { id: 'door-of-hope', paintingNum: 6, scale: 1.0, yOffset: 0.24 },
      'greatly-beloved': { id: 'stone-cut-without-hands', paintingNum: 10, scale: 1.0, yOffset: 0.24 },
      'out-of-the-deep': { id: 'great-fish', paintingNum: 7, scale: 1.0, yOffset: 0.24 },
      'the-day-of-small-things': { id: 'zerubbabels-plumb-line', paintingNum: 29, scale: 1.0, yOffset: 0.24 },
      'good-news-of-great-joy': { id: 'the-manger', paintingNum: 8, scale: 1.0, yOffset: 0.24 }
    };
    this.namedSceneRelicMap = {
      'genesis-4': 'sabbath-olive-tree',
      'genesis-11': 'noah-stone-altar',
      'genesis-12': 'tower-of-babel',
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
  }

  async ensureLoader() {
    if (this.loader) return this.loader;
    try {
      const [mod, meshoptMod] = await Promise.all([
        import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js'),
        import('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/meshopt_decoder.module.js').catch(() => null)
      ]);
      this.loader = new mod.GLTFLoader();
      if (meshoptMod && meshoptMod.MeshoptDecoder) {
        this.loader.setMeshoptDecoder(meshoptMod.MeshoptDecoder);
      }
    } catch (e) {
      console.warn('GLTFLoader fallback to procedural models:', e);
    }
    return this.loader;
  }

  async init() {
    try {
      const res = await fetch('assets/models/tripo-manifest.json?v=44_29');
      this.manifest = await res.json();
    } catch (e) {
      console.warn('Tripo manifest load fallback:', e);
      this.manifest = { models: [] };
    }

    // Register manifest metadata without eagerly downloading all 16 .glb binaries on initial boot;
    // each district lazy-loads only its own relics and scene sculptures on entry.
    if (this.manifest && this.manifest.models) {
      this.manifest.models.forEach((item) => {
        this.relicById.set(item.id, item);
        this.statusMap.set(item.id, 'loaded');
      });
    }
  }

  async ensureRelicLoaded(id) {
    if (!id) return false;
    if (this.modelCache.has(id)) return true;
    if (this.loadingPromises.has(id)) return this.loadingPromises.get(id);

    const item = this.relicById.get(id);
    if (!item || !item.file) {
      return false;
    }

    const p = this.loadGlbFromUrl(item.id, item.file, item.targetScale || 2.2).finally(() => {
      this.loadingPromises.delete(id);
    });
    this.loadingPromises.set(id, p);
    return p;
  }

  async preloadDistrictModels(districtSlug, manifest) {
    if (!districtSlug) return;
    const tasks = [];
    const relicIds = this.districtRelicMap[districtSlug] || [];
    for (const rId of relicIds) {
      tasks.push(this.ensureRelicLoaded(rId));
    }
    if (manifest && Array.isArray(manifest.paintings)) {
      for (const p of manifest.paintings) {
        if (p.isScene) {
          tasks.push(this.ensureSceneGlbLoaded(districtSlug, p.n));
        }
      }
    }
    await Promise.all(tasks);
  }

  async ensureSceneGlbLoaded(districtSlug, paintingNum, targetExtent = 2.6) {
    if (!districtSlug || !paintingNum) return false;
    const namedId = this.namedSceneRelicMap[`${districtSlug}-${paintingNum}`];
    if (namedId) {
      return this.ensureRelicLoaded(namedId);
    }
    const sceneKey = `scene-${districtSlug}-${paintingNum}`;
    if (this.modelCache.has(sceneKey)) return true;
    if (this.loadingPromises.has(sceneKey)) return this.loadingPromises.get(sceneKey);

    const url = `assets/models/scenes/${districtSlug}-${paintingNum}.glb`;
    const p = this.loadGlbFromUrl(sceneKey, url, targetExtent).finally(() => {
      this.loadingPromises.delete(sceneKey);
    });
    this.loadingPromises.set(sceneKey, p);
    return p;
  }

  // Applies warm oil-on-linen painterly surface grading to any imported Tripo3D or TRELLIS mesh
  applyPainterlyAdaptation(rootObj) {
    const THREE = this.THREE;
    const bumpTex = this.painterly ? this.painterly.canvasNoiseTex : null;

    rootObj.traverse((child) => {
      if (child.isMesh && child.material) {
        const hasVertexColors = Boolean(
          child.geometry && child.geometry.attributes && child.geometry.attributes.color
        );
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (hasVertexColors) {
            mat.vertexColors = true;
          }
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
    } else if (this.relicById.has(id)) {
      this.ensureRelicLoaded(id);
    }
  }

  // Automatically probes and mounts a .glb model for ANY of the 175 Step-Through Painting Scenes!
  async mountSceneGlbIfAvailable(targetGroup, districtSlug, paintingNum, options = {}) {
    if (!targetGroup || !districtSlug || !paintingNum) return;
    const sceneKey = `scene-${districtSlug}-${paintingNum}`;
    const scale = options.scale || 1.0;
    const yOffset = options.yOffset ?? 0.18;
    const targetExtent = options.targetExtent || 2.6;

    const namedId = this.namedSceneRelicMap[`${districtSlug}-${paintingNum}`];
    if (namedId) {
      this.mountRelic(targetGroup, namedId, { scale, yOffset });
      await this.ensureRelicLoaded(namedId);
      return;
    }

    this.mountRelic(targetGroup, sceneKey, { scale, yOffset });
    await this.ensureSceneGlbLoaded(districtSlug, paintingNum, targetExtent);
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

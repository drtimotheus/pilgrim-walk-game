// ============================================================================
// THE PILGRIM WALK — Tripo3D Studio (.glb) Hero Relic Loader & Painterly Adapter
// Connects Timothy Holt's 200-credit (13-model) Tripo3D Studio plan directly
// to the 3D world:
//   1. Checks assets/models/<id>.glb for any of the 13 Hero Relics.
//   2. Adapts imported GLTF/GLB PBR materials to match the warm oil-on-linen
//      painterly aesthetic (softened specular, linen micro-bump, warm shadows).
//   3. Supports live browser drag-and-drop of .glb files downloaded from
//      https://studio.tripo3d.ai/ so Timothy can preview any model immediately!
// ============================================================================

import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';

export class TripoRelicManager {
  constructor(THREE, painterly) {
    this.THREE = THREE;
    this.painterly = painterly;
    this.loader = new GLTFLoader();
    this.manifest = null;
    this.modelCache = new Map(); // id -> THREE.Group template
    this.statusMap = new Map();  // id -> 'loaded' | 'procedural'
    this.activeMountPoints = new Map(); // id -> Set of { group, scale, yOffset }
  }

  async init() {
    try {
      const res = await fetch('assets/models/tripo-manifest.json');
      this.manifest = await res.json();
    } catch (e) {
      console.warn('Tripo manifest load fallback:', e);
      this.manifest = { models: [] };
    }

    // Probe which .glb files are already saved in assets/models/
    if (this.manifest && this.manifest.models) {
      await Promise.all(
        this.manifest.models.map(async (item) => {
          try {
            const headRes = await fetch(item.file, { method: 'HEAD' });
            if (headRes.ok && headRes.headers.get('content-type') !== 'text/html') {
              await this.loadGlbFromUrl(item.id, item.file, item.targetScale || 2.0);
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

  // Applies warm oil-on-linen painterly surface grading to any imported Tripo3D mesh
  applyPainterlyAdaptation(rootObj) {
    const THREE = this.THREE;
    const bumpTex = this.painterly ? this.painterly.canvasBumpTex : null;

    rootObj.traverse((child) => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          // Remove harsh CGI plastic shine & add linen canvas micro-relief
          if ('roughness' in mat) {
            mat.roughness = Math.max(0.76, mat.roughness || 0.85);
          }
          if ('metalness' in mat) {
            mat.metalness = Math.min(0.32, mat.metalness || 0.05);
          }
          if (bumpTex && !mat.bumpMap) {
            mat.bumpMap = bumpTex;
            mat.bumpScale = 0.018;
          }
          if (mat.color) {
            // Subtle warm golden-hour tint to harmonize with Timothy's palettes
            const warm = new THREE.Color('#fff5e4');
            mat.color.multiply(warm);
          }
          mat.needsUpdate = true;
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  normalizeAndCenterModel(gltfScene, targetExtent = 2.0) {
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

    wrapper.add(clone);
    return wrapper;
  }

  async loadGlbFromUrl(id, url, targetScale = 2.0) {
    return new Promise((resolve) => {
      this.loader.load(
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
    const targetScale = item ? item.targetScale : 2.0;
    const blobUrl = URL.createObjectURL(fileObj);
    const ok = await this.loadGlbFromUrl(id, blobUrl, targetScale);
    return ok;
  }

  // Called by props/scenes to register a mount point for one of the 13 Hero Relics
  mountRelic(targetGroup, id, options = {}) {
    const scale = options.scale || 1.0;
    const yOffset = options.yOffset || 0.0;

    // Mark current children of targetGroup as procedural fallback so they hide if GLB loads
    targetGroup.children.forEach((ch) => {
      if (!ch.userData.isTripoMesh && !ch.isLight) {
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

  injectCachedModelIntoGroup(id, targetGroup, scale, yOffset) {
    const template = this.modelCache.get(id);
    if (!template) return;

    // Hide procedural fallback children (keep lights!)
    targetGroup.children.forEach((ch) => {
      if (ch.userData.isProceduralFallback) {
        ch.visible = false;
      }
    });

    // Remove any previous Tripo instance on this group
    const prev = targetGroup.children.find((ch) => ch.userData.isTripoMesh);
    if (prev) targetGroup.remove(prev);

    const instance = template.clone(true);
    instance.scale.multiplyScalar(scale);
    instance.position.y += yOffset;
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

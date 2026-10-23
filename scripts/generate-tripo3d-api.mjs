#!/usr/bin/env node
/**
 * THE PILGRIM WALK — Tripo3D Automated Image-to-3D Uploader & Exporter
 * Uploads the 13 curated paintings to Tripo3D's API, waits for 3D generation,
 * downloads the .glb models, and places them into assets/models/scenes/ (and assets/models/).
 *
 * Usage:
 *   TRIPO_API_KEY="tsk_..." node scripts/generate-tripo3d-api.mjs
 */

import fs from 'fs';
import path from 'path';

const API_KEY = process.env.TRIPO_API_KEY || process.argv[2];
if (!API_KEY || !API_KEY.startsWith('tsk_')) {
  console.error('Usage: TRIPO_API_KEY="tsk_..." node scripts/generate-tripo3d-api.mjs');
  process.exit(1);
}

const ROOT = process.cwd();
const BASE = 'https://api.tripo3d.ai/v2/openapi';

const HERO_SYNC = {
  'genesis-4': 'assets/models/sabbath-olive-tree.glb',
  'exodus-5': 'assets/models/burning-bush-crag.glb',
  'fire-by-night-21': 'assets/models/golden-menorah.glb',
  'fire-by-night-33': 'assets/models/nehushtan-bronze-serpent.glb'
};

async function uploadImageToTripo(fullImgPath) {
  const buf = fs.readFileSync(fullImgPath);
  const form = new FormData();
  form.append('file', new Blob([buf], { type: 'image/jpeg' }), path.basename(fullImgPath));

  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${API_KEY}` },
    body: form
  });
  const json = await res.json();
  if (!res.ok || json.code !== 0) {
    throw new Error(`Tripo upload error: ${JSON.stringify(json)}`);
  }
  return json.data.image_token;
}

async function createImageTo3DTask(imageToken) {
  const res = await fetch(`${BASE}/task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'image_to_model',
      file: { type: 'jpg', file_token: imageToken }
    })
  });
  const json = await res.json();
  if (!res.ok || json.code !== 0) {
    throw new Error(`Tripo task creation error: ${JSON.stringify(json)}`);
  }
  return json.data.task_id;
}

async function waitForTask(taskId) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const res = await fetch(`${BASE}/task/${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    const json = await res.json();
    const status = json?.data?.status;
    if (status === 'success') {
      return json.data.output?.model || json.data.result?.model?.url;
    }
    if (status === 'failed' || status === 'cancelled') {
      throw new Error(`Tripo task ${status}: ${JSON.stringify(json.data)}`);
    }
  }
  throw new Error('Timed out waiting for Tripo3D task');
}

async function main() {
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/models/all-175-scenes-manifest.json'), 'utf8'));
  const picks = cat.scenes.filter((s) => cat.tripo13RecommendedIds.includes(s.key));

  for (const p of picks) {
    console.log(`Uploading ${p.key} (${p.imgRelPath}) to Tripo3D...`);
    const token = await uploadImageToTripo(path.join(ROOT, p.imgRelPath));
    const taskId = await createImageTo3DTask(token);
    console.log(`  Task ${taskId} running...`);
    const glbUrl = await waitForTask(taskId);
    const dl = await fetch(glbUrl);
    const buf = Buffer.from(await dl.arrayBuffer());
    const outScene = path.join(ROOT, p.outRelPath);
    fs.writeFileSync(outScene, buf);
    console.log(`  ✅ Saved ${p.outRelPath} (${(buf.length / 1024).toFixed(1)} KB)`);
    if (HERO_SYNC[p.key]) {
      fs.writeFileSync(path.join(ROOT, HERO_SYNC[p.key]), buf);
      console.log(`  ✅ Synced hero relic ${HERO_SYNC[p.key]}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

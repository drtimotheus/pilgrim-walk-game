#!/bin/bash
cd "$(dirname "$0")"
echo "=================================================================="
echo "  THE PILGRIM WALK — Microsoft TRELLIS 3D Sculpture Generator"
echo "  Connecting to https://huggingface.co/spaces/trellis-community/TRELLIS"
echo "=================================================================="
node scripts/generate-trellis-3d.mjs --limit 10 --concurrency 1
echo ""
echo "Pushing any newly generated .glb models to GitHub Pages..."
git add assets/models/
git commit -m "Update 3D GLB sculptures from Microsoft TRELLIS" || true
git push origin main || true
echo "Done!"
read -p "Press Enter to close..."

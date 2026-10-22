#!/bin/zsh
cd "$(dirname "$0")"

echo "========================================================"
echo "  THE PILGRIM WALK — Syncing Music Folder to GitHub"
echo "========================================================"

# Normalize any capital 'Scene-' filenames to lowercase 'scene-' so Linux/GitHub Pages finds them
find Music -type f -name "Scene-*.mp3" | while read -r f; do
  dir=$(dirname "$f")
  base=$(basename "$f" | tr '[:upper:]' '[:lower:]')
  mv "$f" "$dir/$base.tmp" && mv "$dir/$base.tmp" "$dir/$base"
  echo "Normalized filename: $dir/$base"
done

git add Music/
if git diff --cached --quiet; then
  echo "No new or changed music files found in Music/."
else
  git commit -m "Add/update music tracks in Music/"
  echo "Pushing new music tracks to GitHub..."
  git push origin main
  echo ""
  echo "Done! Your live GitHub site will update with the new music in ~1-2 minutes."
fi

echo ""
read -k 1 "?Press any key to close this window..."

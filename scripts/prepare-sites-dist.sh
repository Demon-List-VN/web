#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cloudflare_build="$project_root/.svelte-kit/cloudflare"
dist_root="$project_root/dist"

test -f "$cloudflare_build/_worker.js"

if test -e "$dist_root"; then
    test "$dist_root" = "$project_root/dist"
    rm -rf "$dist_root"
fi

mkdir -p "$dist_root/server" "$dist_root/client"

"$project_root/node_modules/.bin/esbuild" \
    "$cloudflare_build/_worker.js" \
    --bundle \
    --format=esm \
    --minify \
    --platform=browser \
    --external:cloudflare:workers \
    --outfile="$dist_root/server/index.js"

cp -R "$cloudflare_build/." "$dist_root/client/"
rm "$dist_root/client/_worker.js"

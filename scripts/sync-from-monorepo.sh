#!/usr/bin/env bash
# 把 monorepo 里的 pi-rules 源目录同步到本镜像仓。
# 用法: bash scripts/sync-from-monorepo.sh <monorepo 根目录>
# 只同步 src/ LICENSE NOTICE，不动 package.json / README.md / .github / scripts。
set -euo pipefail

ROOT="${1:-/Users/kiki/doger/ev/vkk_client_flutter}"
SRC="$ROOT/.pi/pi-rules"
DST="$(cd "$(dirname "$0")/.." && pwd)"

[ -d "$SRC/src" ] || { echo "找不到源目录: $SRC" >&2; exit 1; }

echo "源: $SRC"
echo "目标: $DST"
rsync -a --delete "$SRC/src/" "$DST/src/"
cp "$SRC/LICENSE" "$SRC/NOTICE" "$DST/"
echo "同步完成。差异："
git -C "$DST" status --short

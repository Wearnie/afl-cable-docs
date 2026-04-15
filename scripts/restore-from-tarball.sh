#!/usr/bin/env bash
# Restore data from a local tarball to a target storage account.
# Use this when you've received an offline snapshot instead of SAS access.
#
# The tarball should contain two top-level directories: data/ and docs/,
# matching the blob container layout.
#
# Usage:
#   ./scripts/restore-from-tarball.sh <tarball-path> <target-connection-string>

set -euo pipefail

TARBALL="${1:-}"
TARGET_CONN="${2:-}"

if [[ -z "$TARBALL" || -z "$TARGET_CONN" ]]; then
  cat <<USAGE >&2
Usage: $0 <tarball-path> <target-connection-string>

  tarball-path              Path to the snapshot tarball (data/ + docs/ at the top level)
  target-connection-string  Target Azure Storage connection string

Example:
  $0 ./afl-cable-docs-snapshot-2026-04-15.tar.gz \\
     "DefaultEndpointsProtocol=https;AccountName=target;AccountKey=..."
USAGE
  exit 1
fi

if [[ ! -f "$TARBALL" ]]; then
  echo "error: tarball not found at $TARBALL" >&2
  exit 1
fi

if ! command -v az >/dev/null 2>&1; then
  echo "error: az CLI is required. Install: https://aka.ms/azcli" >&2
  exit 1
fi

TARGET_CONTAINER="${AZURE_STORAGE_CONTAINER:-afl-cable-docs}"
WORK_DIR="$(mktemp -d -t aflrestore.XXXXXX)"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "── Extracting $TARBALL …"
tar -xzf "$TARBALL" -C "$WORK_DIR"

if [[ ! -d "$WORK_DIR/data" || ! -d "$WORK_DIR/docs" ]]; then
  echo "error: tarball must contain data/ and docs/ at the top level" >&2
  echo "       found: $(ls -1 "$WORK_DIR" | tr '\n' ' ')" >&2
  exit 1
fi

echo "── Uploading data/ → ${TARGET_CONTAINER}/data/ …"
az storage blob upload-batch \
  --connection-string "$TARGET_CONN" \
  --destination "$TARGET_CONTAINER" \
  --destination-path data \
  --source "$WORK_DIR/data" \
  --overwrite true \
  --output none

echo "── Uploading docs/ → ${TARGET_CONTAINER}/docs/ (this is the big one) …"
az storage blob upload-batch \
  --connection-string "$TARGET_CONN" \
  --destination "$TARGET_CONTAINER" \
  --destination-path docs \
  --source "$WORK_DIR/docs" \
  --overwrite true \
  --output none

echo ""
echo "✓ Restore complete."
echo ""
echo "Verify with:"
echo "  az storage blob list --connection-string \"\$TARGET_CONN\" --container-name $TARGET_CONTAINER --query 'length(@)'"

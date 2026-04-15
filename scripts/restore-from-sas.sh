#!/usr/bin/env bash
# Restore data from a source blob container to a target storage account.
# Used to migrate from the Melbourne deployment to a fresh target.
#
# Usage:
#   ./scripts/restore-from-sas.sh <source-sas-url> <target-connection-string> [--dry-run]
#
# The source SAS URL should be a container-level read+list SAS, 30-day expiry.
# Generate with:
#   az storage container generate-sas --account-name <source> \
#     --name afl-cable-docs --permissions rl --expiry 2026-05-30T00:00:00Z \
#     --auth-mode login --as-user --https-only --full-uri -o tsv
#
# The target connection string is the full `DefaultEndpointsProtocol=...` for
# the target storage account (from Bicep output `storageConnectionString`).

set -euo pipefail

SOURCE_SAS="${1:-}"
TARGET_CONN="${2:-}"
DRY_RUN=""

if [[ "${3:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
fi

if [[ -z "$SOURCE_SAS" || -z "$TARGET_CONN" ]]; then
  cat <<USAGE >&2
Usage: $0 <source-sas-url> <target-connection-string> [--dry-run]

  source-sas-url           Container SAS URL with rl permissions
  target-connection-string Target Azure Storage connection string
  --dry-run                Run azcopy in dry-run mode (no writes)

Example:
  $0 "https://src.blob.core.windows.net/afl-cable-docs?sv=2023..." \\
     "DefaultEndpointsProtocol=https;AccountName=target;AccountKey=..." \\
     --dry-run
USAGE
  exit 1
fi

if ! command -v azcopy >/dev/null 2>&1; then
  echo "error: azcopy is required. Install: https://aka.ms/azcopy" >&2
  exit 1
fi

# Derive target container URL + SAS from the target connection string.
TARGET_ACCOUNT="$(echo "$TARGET_CONN" | sed -n 's/.*AccountName=\([^;]*\).*/\1/p')"
if [[ -z "$TARGET_ACCOUNT" ]]; then
  echo "error: could not parse AccountName from target connection string" >&2
  exit 1
fi

TARGET_CONTAINER="${AZURE_STORAGE_CONTAINER:-afl-cable-docs}"

echo "── Source: $(echo "$SOURCE_SAS" | sed 's/\?.*/?<sas>/')"
echo "── Target: https://${TARGET_ACCOUNT}.blob.core.windows.net/${TARGET_CONTAINER}"
[[ -n "$DRY_RUN" ]] && echo "── Mode: DRY RUN (no writes)"
echo ""

# Generate a short-lived SAS for the target so azcopy can write to it.
# (azcopy prefers SAS over connection strings.)
TARGET_SAS_URL="$(
  az storage container generate-sas \
    --connection-string "$TARGET_CONN" \
    --name "$TARGET_CONTAINER" \
    --permissions rwl \
    --expiry "$(date -u -v+1H '+%Y-%m-%dT%H:%MZ' 2>/dev/null || date -u -d '+1 hour' '+%Y-%m-%dT%H:%MZ')" \
    --https-only \
    --full-uri \
    -o tsv 2>/dev/null
)" || {
  echo "error: could not generate target SAS. Ensure az CLI is installed and the target container exists." >&2
  exit 1
}

echo "Copying container contents (recursive)…"
azcopy copy "$SOURCE_SAS" "$TARGET_SAS_URL" --recursive $DRY_RUN

echo ""
echo "✓ Restore complete."
echo ""
echo "Verify with:"
echo "  az storage blob list --connection-string \"\$TARGET_CONN\" --container-name $TARGET_CONTAINER --query 'length(@)'"

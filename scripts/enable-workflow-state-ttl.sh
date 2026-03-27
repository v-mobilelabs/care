#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${1:-care-ai-cosmoops}"

echo "Using project: ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "Enabling TTL for collectionGroup=workflow_threads field=expiresAt"
gcloud firestore fields ttls update expiresAt \
  --collection-group=workflow_threads \
  --enable-ttl

echo "Enabling TTL for collectionGroup=checkpoints field=expiresAt"
gcloud firestore fields ttls update expiresAt \
  --collection-group=checkpoints \
  --enable-ttl

echo "\nCurrent TTL policies:"
gcloud firestore fields ttls list --collection-group=workflow_threads
gcloud firestore fields ttls list --collection-group=checkpoints

echo "\nDone."

# Workflow state TTL (Firestore)

This project stores workflow state in top-level collections:

- `workflow_threads/{profileId::sessionId::threadId}`
- `workflow_threads/{profileId::sessionId::threadId}/checkpoints/{checkpointId}`

TTL uses the `expiresAt` Firestore timestamp field.

## Why two TTL policies

Firestore TTL is configured per **collection group**. Because thread and checkpoint docs are in different collection groups, enable TTL for both:

- `workflow_threads`
- `checkpoints`

## Enable TTL (CLI)

Project in this repo:

- `care-ai-cosmoops` (from `.firebaserc`)

Run:

```bash
gcloud config set project care-ai-cosmoops

gcloud firestore fields ttls update expiresAt \
  --collection-group=workflow_threads \
  --enable-ttl

gcloud firestore fields ttls update expiresAt \
  --collection-group=checkpoints \
  --enable-ttl
```

## Verify TTL policy status

```bash
gcloud firestore fields ttls list --collection-group=workflow_threads
gcloud firestore fields ttls list --collection-group=checkpoints
```

## Console path (manual)

1. Open Firebase Console → Firestore Database.
2. Go to **TTL policies**.
3. Add policy for collection group `workflow_threads` field `expiresAt`.
4. Add policy for collection group `checkpoints` field `expiresAt`.

## Important behavior

- TTL deletion is asynchronous/eventual (not immediate).
- App code should still treat docs with `expiresAt <= now` as expired.
- Current repository code already enforces this functional-expiry filter for workflow-state reads.

## Verify concurrency/recovery without local emulator

If local emulator is unavailable, the verifier can run against non-emulator Firestore with an explicit safety gate:

```bash
WORKFLOW_STATE_VERIFY_ALLOW_NON_EMULATOR=true pnpm verify:workflow-state
```

Notes:

- The script still creates isolated random IDs and cleans them up at the end.
- Non-emulator mode is disabled by default and requires `WORKFLOW_STATE_VERIFY_ALLOW_NON_EMULATOR=true`.
- Prefer running this against a staging project/environment instead of production.

/**
 * Workflow-state concurrency + recovery verification.
 *
 * Usage:
 *   NODE_ENV=development npx tsx --env-file=.env scripts/workflow-state/check-concurrency-recovery.mts
 *
 * Safety:
 *   By default this script requires FIRESTORE_EMULATOR_HOST.
 *   To run against a non-emulator Firestore, set:
 *     WORKFLOW_STATE_VERIFY_ALLOW_NON_EMULATOR=true
 */
import { randomUUID } from "node:crypto";
import { Socket } from "node:net";
import * as firebaseAdmin from "@/lib/firebase/admin";
import * as workflowStateRepositoryModule from "@/data/workflow-state/repositories/workflow-state.repository";

type WorkflowStateRepository =
  typeof import("@/data/workflow-state/repositories/workflow-state.repository").workflowStateRepository;

const workflowStateRepositoryInterop =
  workflowStateRepositoryModule as unknown as {
    workflowStateRepository?: WorkflowStateRepository;
    default?: { workflowStateRepository?: WorkflowStateRepository };
  };

function resolveWorkflowStateRepository(): WorkflowStateRepository {
  const resolved =
    workflowStateRepositoryInterop.workflowStateRepository ??
    workflowStateRepositoryInterop.default?.workflowStateRepository;

  if (!resolved) {
    throw new Error(
      "[workflow-state-check] workflowStateRepository export could not be resolved.",
    );
  }

  return resolved;
}

const workflowStateRepository = resolveWorkflowStateRepository();

async function assertEmulatorReachable(hostAndPort: string): Promise<void> {
  const [host, portRaw] = hostAndPort.split(":");
  const port = Number(portRaw);

  assertCondition(host, "Invalid FIRESTORE_EMULATOR_HOST: host is missing.");
  assertCondition(
    Number.isFinite(port) && port > 0,
    "Invalid FIRESTORE_EMULATOR_HOST: port is missing.",
  );

  await new Promise<void>((resolve, reject) => {
    const socket = new Socket();
    const timeoutMs = 2_000;

    const closeWithError = (message: string): void => {
      socket.destroy();
      reject(new Error(`[workflow-state-check] ${message}`));
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      socket.end();
      resolve();
    });
    socket.once("timeout", () => {
      closeWithError(
        `Firestore emulator did not respond at ${hostAndPort} within ${timeoutMs}ms.`,
      );
    });
    socket.once("error", () => {
      closeWithError(
        `Unable to connect to Firestore emulator at ${hostAndPort}.`,
      );
    });

    socket.connect(port, host);
  });
}

function assertCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`[workflow-state-check] ${message}`);
  }
}

function toThreadDocId(
  profileId: string,
  sessionId: string,
  threadId: string,
): string {
  return `${profileId}::${sessionId}::${threadId}`;
}

function threadRef(profileId: string, sessionId: string, threadId: string) {
  return firebaseAdmin.db
    .collection("workflow_threads")
    .doc(toThreadDocId(profileId, sessionId, threadId));
}

async function cleanupThread(
  profileId: string,
  sessionId: string,
  threadId: string,
): Promise<void> {
  const tRef = threadRef(profileId, sessionId, threadId);
  const checkpoints = await tRef.collection("checkpoints").get();

  if (!checkpoints.empty) {
    const batch = firebaseAdmin.db.batch();
    checkpoints.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  await tRef.delete().catch(() => undefined);
}

async function run(): Promise<void> {
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const allowNonEmulator =
    process.env.WORKFLOW_STATE_VERIFY_ALLOW_NON_EMULATOR === "true";

  if (emulatorHost) {
    await assertEmulatorReachable(emulatorHost);
  } else if (!allowNonEmulator) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. Refusing to run against non-emulator Firestore. Set WORKFLOW_STATE_VERIFY_ALLOW_NON_EMULATOR=true to override.",
    );
  }

  if (!emulatorHost && allowNonEmulator) {
    console.warn(
      "[workflow-state-check] Running against NON-emulator Firestore because WORKFLOW_STATE_VERIFY_ALLOW_NON_EMULATOR=true.",
    );
  }

  const userId = `wf-user-${randomUUID()}`;
  const profileId = userId;
  const sessionId = `wf-session-${randomUUID()}`;
  const threadId = `wf-thread-${randomUUID()}`;
  const workflowName = "gateway-orchestrator";

  console.log("[workflow-state-check] Starting checks", {
    userId,
    profileId,
    sessionId,
    threadId,
    mode: emulatorHost ? "emulator" : "non-emulator",
    emulator: emulatorHost,
  });

  // 1) Concurrency on thread upsert (same doc)
  await Promise.all(
    Array.from({ length: 12 }, async (_unused, index) => {
      await workflowStateRepository.upsertThreadState({
        userId,
        profileId,
        sessionId,
        threadId,
        workflowName,
        state: { attempt: index, status: "running" },
        metadata: { source: "concurrency-check", index },
        ttlSeconds: 60 * 60,
      });
    }),
  );

  const activeThread = await workflowStateRepository.getActiveThreadState(
    profileId,
    sessionId,
    threadId,
  );

  assertCondition(
    activeThread,
    "Expected active thread after concurrent upserts.",
  );
  assertCondition(
    typeof activeThread.state.attempt === "number",
    "Expected numeric attempt in persisted thread state.",
  );
  assertCondition(
    Date.parse(activeThread.expiresAt) > Date.now(),
    "Expected active thread to have future expiresAt.",
  );

  // 2) Recovery semantics: latest checkpoint may be expired, but an older active
  // checkpoint should still be returned.
  const olderActive = await workflowStateRepository.createCheckpoint({
    userId,
    profileId,
    sessionId,
    threadId,
    workflowName,
    state: { step: "older-active" },
    nodeName: "gate_rag",
    ttlSeconds: 60 * 60,
  });

  await workflowStateRepository.createCheckpoint({
    userId,
    profileId,
    sessionId,
    threadId,
    workflowName,
    state: { step: "newer-expired" },
    nodeName: "run_rag",
    expiresAt: new Date(Date.now() - 10_000),
  });

  const latestActiveCheckpoint =
    await workflowStateRepository.getLatestActiveCheckpoint(
      profileId,
      sessionId,
      threadId,
    );

  assertCondition(
    latestActiveCheckpoint,
    "Expected latest active checkpoint to be resolved.",
  );
  assertCondition(
    latestActiveCheckpoint.checkpointId === olderActive.checkpointId,
    "Expected recovery logic to skip expired latest checkpoint and return older active one.",
  );

  // 3) Functional expiry: thread with past expiresAt should be treated as absent.
  await workflowStateRepository.upsertThreadState({
    userId,
    profileId,
    sessionId,
    threadId,
    workflowName,
    state: { status: "expired" },
    expiresAt: new Date(Date.now() - 5_000),
  });

  const expiredThread = await workflowStateRepository.getActiveThreadState(
    profileId,
    sessionId,
    threadId,
  );

  assertCondition(
    expiredThread === null,
    "Expected expired thread to be filtered out.",
  );

  await cleanupThread(profileId, sessionId, threadId);

  console.log("[workflow-state-check] ✅ All checks passed");
}

try {
  await run();
} catch (error: unknown) {
  console.error("[workflow-state-check] ❌ Failed", error);
  process.exit(1);
}

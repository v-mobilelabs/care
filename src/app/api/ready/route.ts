// GET /api/ready — Readiness check.
// Returns 200 OK only if all critical dependencies are accessible.
// Used by load balancers and orchestrators to determine if the service can handle traffic.

import { NextResponse } from "next/server";
import { auth, db, rtdb } from "@/lib/firebase/admin";

interface CheckResult {
  ok: boolean;
  latency?: number;
  error?: string;
}

interface ReadinessResponse {
  status: "ready" | "not_ready";
  timestamp: string;
  checks: {
    authentication: CheckResult;
    database: CheckResult;
    messaging: CheckResult;
  };
}

async function checkFirebaseAuth(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Try to list users with a limit of 1 — minimal read to verify Auth is responsive
    await auth.listUsers(1);
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkFirestore(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Minimal read to verify Firestore is responsive
    await db.collection("_health").limit(1).get();
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkRealtimeDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    // Minimal read to verify RTDB is responsive
    await rtdb.ref("/.info/connected").once("value");
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latency: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function GET() {
  const [authCheck, dbCheck, msgCheck] = await Promise.all([
    checkFirebaseAuth(),
    checkFirestore(),
    checkRealtimeDatabase(),
  ]);

  const allOk = authCheck.ok && dbCheck.ok && msgCheck.ok;

  const response: ReadinessResponse = {
    status: allOk ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    checks: {
      authentication: authCheck,
      database: dbCheck,
      messaging: msgCheck,
    },
  };

  return NextResponse.json(response, { status: allOk ? 200 : 503 });
}

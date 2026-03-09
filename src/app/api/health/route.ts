// GET /api/health — Basic liveness check.
// Returns 200 OK if the service is running.
// This endpoint does NOT check dependencies (Firebase, etc.) — use /api/ready for that.

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}

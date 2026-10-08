import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError, requireAuthority } from "@/lib/auth";
import {
  getSimulationStatus,
  startSimulation,
  stopSimulation,
  resetDemoData,
} from "@/lib/simulation";

// POST /api/simulation  { action: "start" | "stop" | "reset", scenarioId? }
export async function POST(request: NextRequest) {
  const auth = await requireAuthority();
  if (auth instanceof NextResponse) return auth;

  let body: { action?: string; scenarioId?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }

  if (body.action === "start") {
    const adminDb = createAdminClient();
    const result = startSimulation(body.scenarioId ?? "flood-rourkela", adminDb, auth.userId);
    if (!result.ok) return jsonError(result.error ?? "Could not start", 400);
    return NextResponse.json({ ...getSimulationStatus(), ...result });
  }

  if (body.action === "stop") {
    const stopped = stopSimulation();
    return NextResponse.json({ stopped, ...getSimulationStatus() });
  }

  if (body.action === "reset") {
    stopSimulation();
    const adminDb = createAdminClient();
    await resetDemoData(adminDb);
    return NextResponse.json({ reset: true });
  }

  return jsonError("action must be start | stop | reset");
}

// GET /api/simulation - current engine status
export async function GET() {
  const auth = await requireAuthority();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(getSimulationStatus());
}

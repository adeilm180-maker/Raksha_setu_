import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { optionalAuth } from "@/lib/auth";
import { fetchIMDAlerts } from "@/lib/imd";

// POST /api/alerts/sync - pull IMD warnings into the alerts table.
// Called by the dashboard/citizen views periodically (and manually for demos).
export async function POST() {
  await optionalAuth();

  const supabase = createAdminClient();
  const { alerts, live, source } = await fetchIMDAlerts();

  let synced = 0;
  for (const alert of alerts) {
    const { error } = await supabase.from("alerts").upsert(alert, {
      onConflict: "alert_id",
    });
    if (!error) synced++;
  }

  // Expire stale active alerts
  await supabase
    .from("alerts")
    .update({ is_active: false })
    .eq("is_active", true)
    .lt("effective_until", new Date().toISOString());

  return NextResponse.json({ synced, live, source });
}

// GET /api/alerts/sync - active weather warnings
export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .eq("is_active", true)
    .order("effective_from", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ alerts: data ?? [] });
}

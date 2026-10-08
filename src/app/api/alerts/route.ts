import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { jsonError } from "@/lib/auth";

// GET /api/alerts - public active weather warnings
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("is_active", true)
      .order("effective_from", { ascending: false });

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ alerts: data ?? [] });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Failed to load alerts", 500);
  }
}

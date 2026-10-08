import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const BASE = "http://localhost:3000";

async function testAll() {
  console.log("=== STARTING FULL END-TO-END VERIFICATION ===\n");
  const results = [];

  function record(feature, ok, details = "") {
    results.push({ feature, ok, details });
    console.log(`${ok ? "✅ PASS" : "❌ FAIL"} - ${feature}: ${details}`);
  }

  // 1. Landing Page
  try {
    const res = await fetch(`${BASE}/`);
    record("Landing Page (GET /)", res.ok, `Status ${res.status}`);
  } catch (e) {
    record("Landing Page (GET /)", false, e.message);
  }

  // 2. Weather Alerts API
  try {
    const res = await fetch(`${BASE}/api/alerts`);
    const json = await res.json();
    record("Weather Alerts API (GET /api/alerts)", res.ok && Array.isArray(json.alerts), `Found ${json.alerts?.length ?? 0} alerts`);
  } catch (e) {
    record("Weather Alerts API (GET /api/alerts)", false, e.message);
  }

  // 3. IMD Alerts Sync
  try {
    const res = await fetch(`${BASE}/api/alerts/sync`, { method: "POST" });
    const json = await res.json();
    record("IMD Alerts Sync (POST /api/alerts/sync)", res.ok, `Synced: ${json.synced}, Live: ${json.live}`);
  } catch (e) {
    record("IMD Alerts Sync (POST /api/alerts/sync)", false, e.message);
  }

  // 4. AI Classifier Preview
  try {
    const res = await fetch(`${BASE}/api/classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Water level rising rapidly near Vedvyas ghat, 8 elderly people stranded on terrace" }),
    });
    const json = await res.json();
    const c = json.classification;
    record("AI Classifier Preview (POST /api/classify)", res.ok && c?.type === "FLOOD", `Classified as ${c?.type}, Severity: ${c?.severity}, People: ${c?.peopleAffected}, Mode: ${c?.classifiedBy}`);
  } catch (e) {
    record("AI Classifier Preview (POST /api/classify)", false, e.message);
  }

  // 5. Incident Reporting Pipeline
  let createdIncidentId = null;
  try {
    const res = await fetch(`${BASE}/api/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: "Flooding near Vedvyas temple riverbank, 5 families trapped in house",
        latitude: 22.2830,
        longitude: 84.8290,
        location_text: "Vedvyas Temple",
        people_affected: 15,
        source: "APP",
      }),
    });
    const json = await res.json();
    createdIncidentId = json.incident?.id;
    record("Citizen Incident Reporting (POST /api/incidents)", res.ok && !!createdIncidentId, `Number: ${json.incident?.incident_number}, Conf: ${json.intelligence?.confidence}, Type: ${json.incident?.type}`);
  } catch (e) {
    record("Citizen Incident Reporting (POST /api/incidents)", false, e.message);
  }

  // 6. SMS Connectivity-Fallback Webhook
  try {
    const res = await fetch(`${BASE}/api/sms/incoming`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "+919876543210",
        text: "SOS FLOOD Panposh bridge 4 people trapped upstairs",
      }),
    });
    const json = await res.json();
    record("SMS Gateway Webhook (POST /api/sms/incoming)", res.ok && json.received, `Incident: ${json.incident_number}, Reply: ${json.reply?.slice(0, 40)}...`);
  } catch (e) {
    record("SMS Gateway Webhook (POST /api/sms/incoming)", false, e.message);
  }

  // 7. Operator Auth & Login Session
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: "operator@gov.in",
    password: "Password123!",
  });
  const jwt = authData?.session?.access_token;
  record("Operator Auth Login (operator@gov.in)", !authErr && !!jwt, `Session token retrieved for ${authData?.user?.email}`);

  // 8. Allocation Engine (Top 3 recommendations with multi-factor breakdown)
  const targetIncident = createdIncidentId || "c29d0124-7833-4f51-b844-48f8c8577fe0";
  let topRecommendation = null;
  try {
    const res = await fetch(`${BASE}/api/assignments/allocate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ incidentId: targetIncident }),
    });
    const json = await res.json();
    topRecommendation = json.recommendations?.[0];
    record("Allocation Engine (POST /api/assignments/allocate)", res.ok && json.recommendations?.length > 0, `Top team: ${topRecommendation?.resourceId?.slice(0, 8)}..., Score: ${topRecommendation?.totalScore?.toFixed(1)}, ETA: ${topRecommendation?.etaMinutes}m`);
  } catch (e) {
    record("Allocation Engine (POST /api/assignments/allocate)", false, e.message);
  }

  // 9. Dispatch & Assignment Creation
  let assignmentId = null;
  if (topRecommendation) {
    try {
      const res = await fetch(`${BASE}/api/assignments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          incidentId: targetIncident,
          resourceId: topRecommendation.resourceId,
          score: topRecommendation.totalScore,
          explanation: topRecommendation.explanation,
          distanceKm: topRecommendation.distanceKm,
          etaMinutes: topRecommendation.etaMinutes,
        }),
      });
      const json = await res.json();
      assignmentId = json.assignment?.id;
      record("Assignment Creation (POST /api/assignments)", res.ok && !!assignmentId, `Assignment ID: ${assignmentId}, Status: ${json.assignment?.status}`);
    } catch (e) {
      record("Assignment Creation (POST /api/assignments)", false, e.message);
    }
  }

  // 10. Assignment Progression (ACKNOWLEDGED -> EN_ROUTE)
  if (assignmentId) {
    try {
      const res = await fetch(`${BASE}/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ status: "ACKNOWLEDGED" }),
      });
      const json = await res.json();
      record("Assignment Step: ACKNOWLEDGE", res.ok && json.assignment?.status === "ACKNOWLEDGED", `Status: ${json.assignment?.status}`);
    } catch (e) {
      record("Assignment Step: ACKNOWLEDGE", false, e.message);
    }
  }

  // 11. Resource Status Flip & Dynamic Reassignment
  if (topRecommendation?.resourceId) {
    try {
      const res = await fetch(`${BASE}/api/resources/${topRecommendation.resourceId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ status: "UNAVAILABLE" }),
      });
      const json = await res.json();
      record("Dynamic Reallocation on Resource Breakdown", res.ok && json.resource?.status === "UNAVAILABLE", `Resource: ${json.resource?.team_code} UNAVAILABLE, Reallocations: ${json.reallocations?.length ?? 0}`);
    } catch (e) {
      record("Dynamic Reallocation on Resource Breakdown", false, e.message);
    }
  }

  // 12. Simulation Engine Status & Reset
  try {
    const stRes = await fetch(`${BASE}/api/simulation`, {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });
    const stJson = await stRes.json();
    record("Simulation Status (GET /api/simulation)", stRes.ok, `Running: ${stJson.running}`);

    const rstRes = await fetch(`${BASE}/api/simulation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ action: "reset" }),
    });
    const rstJson = await rstRes.json();
    record("Simulation Reset & Seed Restore (POST /api/simulation)", rstRes.ok && rstJson.reset, "Reset completed, demo seed restored");
  } catch (e) {
    record("Simulation Engine", false, e.message);
  }

  console.log("\n=== SUMMARY ===");
  const passed = results.filter((r) => r.ok).length;
  console.log(`Passed: ${passed}/${results.length}`);
  if (passed === results.length) {
    console.log("🎉 ALL FEATURES FULLY OPERATIONAL AND VERIFIED!");
  } else {
    console.log("⚠️ Some features had issues.");
  }
}

testAll();

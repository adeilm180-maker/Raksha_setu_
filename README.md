# 🛟 RakshaSetu — Real-Time Disaster Response Coordination & Resource Optimization Platform

> **"We convert fragmented disaster reports into prioritized, actionable rescue assignments in real time."**

> 👨‍💻 **Developed by:** **Mohd Adil** · **Aamir Hamza** · **Priyanshu**

RakshaSetu is a district-level **decision-support system** for disaster response. It fuses citizen reports, official weather warnings, and live resource inventory into a single geospatial situation picture — then uses a transparent multi-factor **allocation engine** to recommend *which* rescue team should respond to *which* incident first.

**SIH Problem Statement:** PS-05 — Real-Time Disaster Early-Warning & Resource Coordination Platform

> 🗺️ **Demo district:** Rourkela, Odisha (Koel river flood scenario). District-specific data lives in `src/config/city.ts` + `supabase/seed.sql` — edit both to redeploy for any other district.

---

## ⚠️ The One-Line Positioning (read this first)

RakshaSetu is **not another alert app**. India already has SACHET/NDMA for warning dissemination. We are the **operational coordination layer that comes after the warning**: incoming incident → AI-assisted triage → confidence scoring → optimal resource assignment → live reassignment when conditions change.

---

## 🆚 How RakshaSetu Is Different From Existing Platforms

| Capability | SACHET / NDMA | IMD Portals | Ushahidi | GDACS | **RakshaSetu** |
|---|:---:|:---:|:---:|:---:|:---:|
| Official geo-targeted alerts | ✅ | ✅ | ❌ | ✅ | ✅ (consumes IMD feed) |
| Citizen report submission | Limited | ❌ | ✅ | ❌ | ✅ App + PWA + **SMS fallback** |
| Live operational map | ✅ | ✅ | ✅ | ✅ | ✅ Realtime (<1s) |
| **Resource inventory (teams/shelters/stock)** | ❌ | ❌ | Partial | ❌ | ✅ |
| **Multi-factor allocation engine** | ❌ | ❌ | ❌ | ❌ | ✅ Core feature |
| **Dynamic reassignment on failure** | ❌ | ❌ | ❌ | ❌ | ✅ |
| Report confidence / duplicate clustering | ❌ | ❌ | ❌ | ❌ | ✅ |
| Connectivity fallback (SMS channel) | ✅ SMS out | ❌ | ✅ | ❌ | ✅ SMS in → same pipeline |

### What makes our approach defensible in a Q&A

1. **We don't compete with SACHET.** They answer *"what is going to happen?"* We answer *"it's happening — which team goes where, right now?"*
2. **Citizen reporting alone isn't innovation** (Ushahidi does it). Our innovation starts *after* the report arrives: AI classification → confidence scoring → duplicate clustering → scored allocation.
3. **Nearest-team-only dispatch is naive.** A boat 2 km away without medical capability loses to an ambulance boat 5 km away when 3 elderly people are trapped. Our engine weighs severity, ETA, capability match, availability and capacity with configurable weights — and shows its reasoning for every recommendation.
4. **The system is a decision-support tool, not autonomous dispatch.** Operators confirm every assignment; the engine explains itself ("RT-002 is 2.8 km away (~6 min ETA); has all required capabilities (BOAT, MEDICAL)").

### The three technical differentiators

- **Allocation Engine** — transparent weighted scoring:
  `Score = 40% Severity + 20% ETA + 20% Capability + 10% Availability + 10% Capacity`
  (weights stored in DB, switchable between Balanced / Severity-First / Speed-First profiles)
- **Confidence-aware incidents** — official alerts ≈ 0.95 trust, a single unverified app report ≈ 0.50, but 5 citizens reporting the same spot within 30 min auto-cluster into one ≥0.80-confidence incident
- **Live reassignment** — flip any team to UNAVAILABLE mid-mission and the system interrupts the assignment and immediately recommends the best replacement

---

## 🏗️ Architecture

```
Citizen PWA (/report)      Field Team (/team)      Shelter Mgr (/shelter-manage)
        │                        │                        │
        └────────────┬───────────┴────────────────────────┘
                     ▼
        Next.js API routes (allocation, assignments,
        simulation, SMS webhook, classify, alert sync)
                     ▼
┌─────────────────────────────────────────────┐
│              Supabase (Postgres)            │
│  RLS policies · triggers · PostGIS ·        │
│  Auth · Realtime (postgres_changes)         │
└─────────────────────────────────────────────┘
                     ▼
        Operator Dashboard (/dashboard/map)
   Leaflet live map · allocation UI · heatmap ·
   IMD banner · simulation controls · stats bar
                     ▲
   External: Gemini API (classification, optional)
             IMD API (warnings, optional w/ fallback)
             OSRM    (road routing, free, no key)
```

### Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind 4 | One deployable, server components + client realtime |
| Backend | Supabase (Postgres + Auth + Realtime + Storage) | Managed, free tier, zero WebSocket infra needed |
| Maps | Leaflet + React-Leaflet + OSM tiles | Free, no API key, plugin ecosystem |
| Routing | OSRM public server | Free road routing, graceful straight-line fallback |
| AI | Google Gemini 2.0 Flash | Free tier; deterministic rule-based fallback if unavailable |
| Tests | Node built-in test runner (`node:test`) | Zero dependencies |

### 📁 Project Structure (Real Source Map)

```text
raksha-setu/
├── public/                  # Static assets & icons (manifest, logo, PWA icons)
├── scripts/                 # Testing & operational verification scripts
│   ├── verify-all.mjs       # ⭐ Full end-to-end automated system test suite
│   ├── verify-realtime.mjs  # Supabase realtime WebSocket testing
│   └── probe-anon2.mjs      # Anonymous reporting test probe
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication pages
│   │   │   ├── login/       # Operator & team login
│   │   │   └── register/    # New account registration
│   │   ├── (dashboard)/     # District Emergency Operation Center (DEOC) console
│   │   │   └── dashboard/
│   │   │       ├── map/         # ⭐ Interactive operational map & dispatch panel
│   │   │       ├── incidents/   # Incident triage & lifecycle management
│   │   │       ├── assignments/ # Team dispatch board & status tracking
│   │   │       ├── resources/   # Rescue teams & fleet management
│   │   │       ├── shelters/    # Relief camp capacity & supplies
│   │   │       └── simulation/  # Disaster drill scenario controls
│   │   ├── api/             # Next.js Serverless Backend API Routes
│   │   │   ├── alerts/      # Weather warning endpoints (list & IMD sync)
│   │   │   ├── assignments/ # Team allocation engine & dispatch APIs
│   │   │   ├── classify/    # AI-assisted emergency report classification
│   │   │   ├── incidents/   # Incident reporting & intelligence pipeline
│   │   │   ├── resources/   # Resource tracking & dynamic auto-reallocation
│   │   │   ├── simulation/  # Flood scenario controller & seed reset
│   │   │   └── sms/         # SMS gateway fallback webhook
│   │   ├── citizen/         # Public citizen awareness & weather advisory portal
│   │   ├── report/          # Citizen 3-step incident reporting wizard (PWA)
│   │   ├── team/            # Field rescue team mobile console
│   │   ├── shelter-manage/  # Relief shelter manager console
│   │   ├── page.tsx         # Public landing page & platform portal
│   │   └── globals.css      # Design tokens & Tailwind CSS styling
│   ├── components/          # Modular UI components
│   │   ├── dashboard/       # Operations console, detail drawers, and data panels
│   │   ├── layout/          # Sidebar navigation, auth headers, and shell layout
│   │   ├── map/             # Leaflet live geospatial map with layer toggles
│   │   ├── ui/              # Reusable design components (Button, Badge, Input, Logo)
│   │   └── weather/         # Live IMD weather badge and alert status widgets
│   ├── config/
│   │   └── city.ts          # Geo-fencing coordinates, districts, & map bounds
│   ├── hooks/
│   │   └── useLiveData.ts   # Real-time WebSocket subscriptions to Supabase
│   ├── lib/
│   │   ├── allocation.ts    # ⭐ Multi-factor rescue team allocation engine
│   │   ├── classifier.ts    # Gemini 2.0 AI triage + rule-based fallback
│   │   ├── confidence.ts    # Geospatial clustering & report confidence scoring
│   │   ├── imd.ts           # IMD weather warning feed client
│   │   ├── simulation.ts    # Scripted timeline disaster scenario engine
│   │   ├── sms.ts           # Offline SMS report parser
│   │   ├── auth.ts          # JWT & role-based authentication guards
│   │   ├── supabase/        # Browser, server, and service-role database clients
│   │   └── __tests__/       # Allocation engine & SMS parser unit tests
│   └── types/
│       └── database.ts      # TypeScript database schema & relational types
├── supabase/
│   ├── migrations/          # 8 step-by-step SQL migrations (RLS, PostGIS, Auth)
│   └── seed.sql             # Demo flood incident & rescue fleet dataset
├── supabase_setup_full.sql  # Complete all-in-one database initialization script
└── .env.example             # Environment variable template
```

---

## 🚀 Quick Start & Setup

1. **Clone the repository:**
   ```bash
   git clone git@github.com:adeilm180-maker/Raksha_setu_.git
   cd Raksha_setu_
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env.local
   ```
   Add your Supabase project credentials in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👥 Authors & Team

Developed with ❤️ by:
- **Mohd Adil** ([@adeilm180-maker](https://github.com/adeilm180-maker))
- **Aamir Hamza**
- **Priyanshu**

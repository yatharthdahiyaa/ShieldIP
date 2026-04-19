# ShieldIP — AI-Powered Content Piracy Detection Platform

> **Hackathon MVP** | Detects, analyses, and enforces against IP violations using Anthropic Claude AI.

---

## 🚀 Quick Start

```bash
cd ShieldIP
npm install
npm run dev
```

Frontend → http://localhost:5173  
Backend  → http://localhost:3001

Add your Anthropic API key to `.env.local`:
```
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Browser (React/Vite)                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │
│  │ Layer 1  │  │ Layer 2  │  │  Layer 3 / 4 / 5     │ │
│  │ Register │  │ Monitor  │  │  AI Panel / Risk /   │ │
│  │ Content  │  │  Feed    │  │  Enforcement Engine  │ │
│  └────┬─────┘  └──────────┘  └──────────┬───────────┘ │
│       │                CLAUDE API CALLS  │             │
└───────│──────────────────────────────────│─────────────┘
        │ REST /api/hash                   │ ANTHROPIC SDK
        ▼                                  ▼
┌───────────────┐                 ┌─────────────────────┐
│ Express Server│                 │  Anthropic Claude   │
│   (port 3001) │                 │  claude-sonnet-4-5  │
│  jimp pHash   │                 │  - AI Triage JSON   │
│  generation   │                 │  - DMCA Notice Gen  │
└───────────────┘                 └─────────────────────┘
```

---

## 🧠 How AI is Used

| Layer | Feature | Claude API Call |
|-------|---------|----------------|
| **Layer 3** | Violation Triage | Given violation metadata (platform, confidence %, region), Claude returns a JSON with `threat_level` (low/medium/high/critical), `reasoning`, `recommended_action`, and `estimated_revenue_loss` |
| **Layer 5** | DMCA Notice Generation | Claude drafts a legally-styled 3-sentence DMCA takedown notice using the violation's URL and platform |

Both calls use `claude-3-5-sonnet-20241022` with `dangerouslyAllowBrowser: true` for the hackathon demo. Production would proxy through the backend.

---

## 📦 Features

### Layer 1 — Content Registration
- Drag-and-drop image upload
- Real pHash fingerprinting (via `jimp` on Node.js backend)
- Simulated blockchain registration card with Asset ID + timestamp

### Layer 2 — Piracy Monitoring Feed
- 5+ seed violations across YouTube, TikTok, Instagram, X, Twitch
- Live feed simulation: new violations every 5s when Demo Mode is active
- Per-violation: platform, URL, confidence %, region, risk score

### Layer 3 — AI Detection Engine *(Claude)*
- Selects a violation → sends to Claude with structured system prompt
- Parsed JSON response: threat level badge, reasoning block, loss estimate
- Loading skeleton while AI processes; graceful fallback if key missing

### Layer 4 — Risk Scoring Dashboard
- Animated CSS semicircle gauge (score 0–100)
- Colour-coded: green → amber → red by score range
- Shows: Domain Authority, Prior Offender flag, License Coverage

### Layer 5 — Enforcement Engine *(Claude)*
- 3 actions: DMCA Takedown | Claim & Monetize | Flag for Legal
- DMCA / Legal actions trigger Claude-generated enforcement notice in modal
- Persistent enforcement action log with timestamps

### Layer 6 — Analytics Dashboard
- **World map** (react-simple-maps) with violation hotspot dots
- **Bar chart** — violations by platform (Recharts)
- **Line chart** — weekly violations vs resolved trend (Recharts)
- **KPI cards** — Total Violations, DMCA Success Rate, Revenue Recovered, Active Monitors

### Demo Mode
Enable "Demo Mode" in the sidebar to auto-generate violations every 5 seconds and auto-select them for AI triage — perfect for live hackathon presentations.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS |
| Backend | Node.js, Express |
| AI / ML | Anthropic Claude (`claude-3-5-sonnet-20241022`) |
| Image Hashing | jimp (perceptual hash) |
| Charts | Recharts |
| Map | react-simple-maps |
| Icons | lucide-react |
| Concurrency | concurrently |

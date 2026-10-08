---
marp: true
theme: default
paginate: true
backgroundColor: "#070D18"
color: "#F1F5F9"
---

<!-- Editable slide outline — paste into PowerPoint / Google Slides, or render with Marp. -->

# 🚆 Train**Pulse**
### Real-Time Indian Railway Live Train Tracking

Cross-platform (Android · iOS · Web) · Strict TypeScript · Expo / React Native Web · Secure Hono backend

`Android` `iOS` `Web` `Truthful Telemetry`

---

## 🧩 The Problem

Railway apps bury the one thing passengers want — *where is my train right now?*

- **Feature bloat** — ticketing, PNR, seat maps and ads crowd out live tracking
- **No spatial awareness** — location shown as text lists, not a map
- **Fabricated data** — estimates presented as fact; no GPS vs. schedule distinction

---

## 💡 The Solution — A map-first, truthful companion

- The **map is the primary interface** (search overlaid on a live route map)
- **Truthful telemetry:** every position tagged `ACTUAL_GPS` vs `ESTIMATED_SCHEDULE`
- **One codebase → Android, iOS & Web parity** (Expo + React Native Web)
- Backend caching & coalescing protect upstream quotas, keep loads sub-second
- System-aware **Dark / Light theming** with official brand colors

---

## ⭐ Core Features

| | |
|---|---|
| 🔍 **Journey Search** — where-to-where w/ debounced autocomplete | 📡 **Live Telemetry** — status, speed, location, next halt, delays |
| 🗺️ **Interactive Map** — Leaflet + OpenStreetMap, Web & Mobile | 🚉 **Platform Status** — Confirmed / Expected / Unavailable |
| 🚃 **Coach & My Coach** — rake layout + offline persistence | 🛡️ **Zero Fabrication** — missing GPS flagged, never invented |

---

## 🏗️ Architecture — Decoupled client ↔ secure gateway

```
📱 Client (Expo / RN Web + Zustand)
      → ⚙️ Hono Gateway (/api/v1 · Zod validation)
            → ⚡ Cache + Coalescer (30–45s TTL · single-flight)
                  → 🛰️ RailRadar (GPS telemetry, Bearer auth)
```

- **Secret isolation** — client bundle has no API keys
- **Request coalescing** — 50 clients → 1 outbound request
- **Graceful degradation** — on 429/503 serve stale data (`X-Cache: STALE`) + freshness warning

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| Mobile & Web UI | React Native · Expo SDK 57 · Expo Router · RN Web |
| Language | TypeScript (strict mode, all packages) |
| State & Storage | Zustand · AsyncStorage |
| Mapping | Leaflet · OpenStreetMap · CartoDB tiles · react-native-webview |
| Validation | Zod schemas (runtime verification) |
| Backend | Node.js · Hono · @hono/node-server |
| Testing | Vitest |

---

## 🔌 API Surface — `/api/v1`

- `GET /trains/:n/live` — live status, speed, location, next station, delay
- `GET /trains/between?from=&to=` — direct trains between two stations
- `GET /stations/search?q=` — station autocomplete (min 2 chars)
- `GET /trains/:n/coaches` — coach composition / rake layout
- `GET /trains/:n/platform` — platform status

Status model: 🟢 On time · 🟠 Delayed · 🔴 Disrupted

---

## 📊 By The Numbers

- **3** platforms from one codebase
- **225+** automated tests (frontend + backend)
- **30–45s** adaptive polling & cache TTL
- **0** secrets in the client bundle
- **71** TypeScript source files
- **5** core REST endpoints
- **100%** Expo Go compatibility
- **<1s** cached initial-load target

---

## 🔒 Principles — Security & Discipline

- **Zero-trust frontend** — no railway keys reach the client
- **Error sanitization** — tokens / upstream keys redacted before logging
- **Truthful by default** — approximations labeled, GPS gaps flagged
- **Lifecycle-aware polling** — pauses on background / hidden tab
- **Out of scope by design** — no ticketing, PNR, seats, or accounts

---

# The train tracker you can **actually trust**.

Map-first · Cross-platform · Strictly typed · Secure by design

`Expo + RN Web` `Hono Backend` `Zod DTOs` `Leaflet / OSM` `MIT`

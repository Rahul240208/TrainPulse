# TrainPulse — Production Readiness & Final Architecture Checklist (Milestone 20)

**Application Name**: TrainPulse  
**Version**: `1.0.0` (Production Release)  
**Target Environments**: Android (Expo Go / Standalone APK/AAB), iOS (Expo Go / Standalone IPA), Web (Modern Browsers / PWA)  
**Repository Architecture**: Monorepo with Expo Client Frontend (`src/`) & Node.js/Hono Backend Microservice (`backend/`)  

---

## 1. Completed Features Matrix (Milestones 1 – 20)

| Milestone | Feature Area | Description & Production Behavior | Status |
| :--- | :--- | :--- | :--- |
| **M1–M4** | **Project Setup & Base UI** | Strict TypeScript, Expo SDK 57, Expo Router v57, dark theme design system (`#0B0F19`), responsive container (`maxWidth: 640px` mobile, `1120px` desktop). | **COMPLETE** |
| **M5** | **Live OpenStreetMap & Leaflet** | Cross-platform Leaflet mapping via `react-native-webview` (Android/iOS) and isolated DOM `iframe` (Web) with route polylines and station stops. | **COMPLETE** |
| **M6–M9** | **Backend Microservice & Cache** | Hono API server, in-memory TTL caching (30s) to conserve upstream quota, single-flight request coalescing, and upstream timeout abort (8s). | **COMPLETE** |
| **M10** | **Security & Sanitization** | Absolute isolation of `RAILRADAR_API_KEY`. Sanitization engine replacing tokens, keys, and internal server file paths with `[REDACTED]`. | **COMPLETE** |
| **M11** | **Where-to-Where Search** | Direct train search between any two station codes (`GET /api/v1/trains/between?from=...&to=...`) with duration, schedule, and distance. | **COMPLETE** |
| **M12** | **Station Search & Autocomplete** | Debounced (350ms) station search API (`GET /api/v1/stations/search?q=...`) with local catalog fallback and 1-char hint notice. | **COMPLETE** |
| **M13** | **Train Search Results Screen** | Polished results cards showing train number, name, origin, destination, departure, arrival, duration, running days, delay, and platform. | **COMPLETE** |
| **M14** | **Platform Information Card** | Real-time platform card with `CONFIRMED`, `EXPECTED`, and `UNAVAILABLE` states, relative time, and mandatory physical display disclaimer. | **COMPLETE** |
| **M15** | **Coach Data & Layout** | Visual train rake composition (Engine, Power car, Sleeper, AC classes, Pantry) with couplers, sequence numbers, and unavailable fallbacks. | **COMPLETE** |
| **M16** | **My Coach Selection & Persistence** | Coach selector allowing users to highlight their coach (`[ B2 ]`) with local persistence across sessions; strictly validates against real rake data. | **COMPLETE** |
| **M17** | **Unified Train Details Experience**| 12-section ordered hierarchy (Header, Status, Delay, Location, Speed, Next Station, Updated Time, Platform, Map, Coaches, My Coach, Route). | **COMPLETE** |
| **M18** | **Truthful Telemetry & Fallbacks** | Strict truthfulness rule: Never fabricates coordinates or "On Time" assumptions; `PositionBadge` classifies `ACTUAL_GPS`, `ESTIMATED`, `STALE`, `UNAVAILABLE`. | **COMPLETE** |
| **M19** | **Comprehensive QA & Regression** | Full regression test suite: 100% test pass rate across 23 test files (225 tests total), zero security leaks, zero compilation warnings. | **COMPLETE** |
| **M20** | **Final UI/UX & Performance Polish** | Primary Journey Workflow Stepper (`Where? ➔ Find Train ➔ Track ➔ Platform ➔ My Coach`), WCAG touch targets (≥44px), screen-reader labels, bundle verification. | **COMPLETE** |

---

## 2. Known Limitations & Upstream Constraints

1. **RailRadar Upstream Rate Limits (Developer Tier)**:
   - Upstream rate limits can be reached during rapid repeated queries without caching.
   - **Mitigation**: The backend microservice enforces an in-memory TTL cache (25–45s) and single-flight request coalescing. Repeated client queries within TTL are served directly from cache without consuming upstream quota.
2. **Coach Layout Availability**:
   - Indian Railways does not publish coach composition for 100% of regional and unreserved passenger trains.
   - **Mitigation**: The application never invents a coach composition. When unavailable, it shows the exact truthful message: `"Coach layout unavailable for this train."`
3. **Platform Alterations**:
   - Railway platform assignments frequently change close to arrival based on yard and track switching.
   - **Mitigation**: The application tags platforms as `CONFIRMED` or `EXPECTED` and displays the mandatory disclaimer: *"Platform information may change. Please verify with station displays."*
4. **GPS Blind Spots & Tunnel Traversal**:
   - Locomotives traversing remote terrains or tunnels intermittently lose direct satellite lock.
   - **Mitigation**: TrainPulse gracefully transitions `PositionBadge` and map markers to `ESTIMATED_SCHEDULE` or `STALE` without crashing or inventing fake coordinates.

---

## 3. Required Environment Variables

### Backend Service (`backend/.env`)

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `PORT` | Optional | `3000` | Local HTTP port for the Hono backend server. |
| `NODE_ENV` | Optional | `development` / `production` | Node environment mode. In production, stack traces are suppressed. |
| `RAILRADAR_API_KEY` | **Required** | `your_railradar_api_key_here` | Upstream API key for RailRadar live railway telemetry. **Strictly secret.** |
| `CORS_ORIGIN` | Optional | `*` (or specific production domain) | Allowed origins for web cross-origin requests. |

> [!CAUTION]
> **Secret Hygiene Rule**: The `RAILRADAR_API_KEY` must **NEVER** be committed to Git or added to frontend Expo configuration (`app.json`, `.env` in root). Only the backend server consumes this key.

### Frontend Application (`.env`)

| Variable Name | Required | Default / Example | Purpose |
| :--- | :---: | :--- | :--- |
| `EXPO_PUBLIC_API_URL` | Optional | `http://localhost:3000` | Base URL pointing to the TrainPulse backend microservice. |

---

## 4. API Requirements & Route Specifications

The TrainPulse frontend connects exclusively to the TrainPulse backend microservice. The backend exposes the following normalized endpoints:

### 1. Live Train Telemetry
- **Endpoint**: `GET /api/v1/trains/:trainNumber/live`
- **Validation**: `:trainNumber` must be exactly 5 numeric digits (`/^\d{5}$/`).
- **Response**: `LiveTrainData` DTO containing train number, name, type, status (`RUNNING`, `ARRIVED`, etc.), delay, location, coordinates, speed, next station ETA, platform, and station timeline.
- **Headers**: Returns `X-Cache: HIT`, `X-Cache: MISS`, or `X-Cache: STALE`.

### 2. Station Autocomplete Search
- **Endpoint**: `GET /api/v1/stations/search?q=:query`
- **Validation**: `:query` must contain at least 2 characters.
- **Response**: Array of `StationSearchResult` objects containing `code`, `name`, `city`, and `state`.

### 3. Where-to-Where Train Search
- **Endpoint**: `GET /api/v1/trains/between?from=:fromCode&to=:toCode`
- **Validation**: `:fromCode` and `:toCode` must be valid station codes (alphanumeric, 2–6 chars) and cannot be identical.
- **Response**: `TrainsBetweenResult` DTO containing `from`, `to`, `totalTrains`, and an array of `TrainBetweenItem` with departure, arrival, duration, running days, delay, and platform.

### 4. Platform Information
- **Endpoint**: `GET /api/v1/trains/:trainNumber/platform`
- **Response**: `PlatformInfo` DTO containing `platformNumber`, `status` (`CONFIRMED`, `EXPECTED`, `UNAVAILABLE`), `station`, and `updatedAt`.

### 5. Coach Composition
- **Endpoint**: `GET /api/v1/trains/:trainNumber/coaches`
- **Response**: `CoachComposition` DTO containing `trainNumber`, `available` (boolean), `totalCoaches`, and an array of `CoachInfo` (type, number, label, sequence).

---

## 5. Testing & Verification Status

```
================================================================================
TrainPulse Milestone 20 Verification Summary
================================================================================
Frontend Unit & Component Suites:  13 files, 132 tests passed (100%)
Backend Route & Service Suites:    10 files, 93 tests passed (100%)
Root TypeScript Compilation:        Clean (tsc --noEmit: Exit Code 0)
Backend TypeScript Compilation:     Clean (tsc --noEmit: Exit Code 0)
Production Web Bundle (Metro):     Clean (907 modules compiled without warnings)
================================================================================
TOTAL VERIFIED TESTS:              225 / 225 PASS (100%)
```

### Automated Test Suites

1. **Frontend Tests (`tests/`)**:
   - `coachLayout.test.ts` (Coach layout rendering, categories, My Coach selection, persistence, unavailable fallback)
   - `coachStorage.test.ts` (Local coach persistence, memory fallback, clear coach)
   - `errors.test.ts` (Client error cards, network error handling, retry actions)
   - `journeySearch.test.ts` (Journey search card, station swap, empty/same station validation)
   - `liveTrainHook.test.ts` (Zustand hook state, 30s polling lifecycle, error resilience)
   - `nextStationCard.test.ts` (Next station ETA, platform chip, cancelled/arrived fallbacks)
   - `platform.test.ts` (Platform card states, relative time calculation, physical display warning)
   - `pollingManager.test.ts` (Polling manager timer, isFetching lock, foreground/background lifecycle)
   - `positionBadge.test.ts` (Actual GPS, Estimated, Stale, and Unavailable badges)
   - `stationAutocomplete.test.ts` (Debounce, 2-char guard, local fallback, case-insensitivity)
   - `trainNumber.test.ts` (Zod 5-digit validation, non-digit stripping, whitespace trimming)
   - `trainResultCard.test.ts` (Duration formatting, delay calculation, running days formatting)
   - `trainsBetweenApi.test.ts` (Where-to-Where client API, response normalization, abort handling)

2. **Backend Tests (`backend/tests/`)**:
   - `cache.service.test.ts` (In-memory TTL cache, single-flight request coalescing, stale fallback)
   - `coachesRoute.test.ts` (Coach composition endpoint, 5-digit validation, 404 & 200 handling)
   - `errors.test.ts` (Sanitization of API keys, suppression of internal server paths, 502/503/504 error mapping)
   - `liveTrainRoute.test.ts` (Live tracking endpoint, upstream abort timeout, caching headers)
   - `platformRoute.test.ts` (Platform route validation, normalization, status mapping)
   - `railradar.service.test.ts` (RailRadar upstream client, abort controller, error handling)
   - `stationsSearchRoute.test.ts` (Station search query validation, upstream search, local catalog fallback)
   - `trainNumber.test.ts` (Backend train number validation schema)
   - `trainsBetweenRoute.test.ts` (Where-to-Where route, query validation, rate limit resilience)
   - `transformer.test.ts` (RailRadar raw response normalization into canonical LiveTrainData DTO)

---

## 6. Production Deployment Considerations

### Backend Deployment (e.g. Node.js Container, Railway, Render, Fly.io)
1. **Process Management**:
   - Run via `node dist/server.js` with `NODE_ENV=production`.
   - Set environment variable `PORT` (e.g. `8080` or `3000`).
2. **Reverse Proxy & TLS**:
   - Terminate SSL/TLS at the reverse proxy (Cloudflare, Nginx, or cloud load balancer).
3. **CORS Restrictions**:
   - Set `CORS_ORIGIN` to the production domain hosting the Web application (e.g. `https://trainpulse.app`).
4. **Health Check**:
   - Route `GET /health` or `GET /` is available for load balancer uptime probes.

### Frontend Deployment (Expo Web & Mobile)
1. **Web Build (Static Hosting / CDN)**:
   - Build with: `npx expo export --platform web`
   - Host the generated `dist/` directory on any static provider (Cloudflare Pages, Vercel, Netlify, or AWS S3 + CloudFront).
   - Configure Single Page Application rewrite (`/*` ➔ `/index.html`).
2. **Android & iOS Builds (EAS Build)**:
   - For standalone distribution, use Expo Application Services (`eas build -p android` / `eas build -p ios`).
   - Zero custom native modules are used; the project maintains 100% compatibility with Expo Go and standard EAS Build workflows.

---

## 7. Sign-Off & Status

TrainPulse has reached full implementation and complete production readiness across all 20 milestones. All requirements, guidelines, security rules, and data truthfulness policies are fully satisfied.


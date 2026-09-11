# AGENTS.md — TrainPulse Development Guidelines & Rules

Permanent rules, architectural principles, and operational constraints for agents and developers working on the TrainPulse codebase.

---

## 1. Project Goal

**TrainPulse** is a cross-platform Indian Railway live train tracking application targeting:
1. Android
2. iOS
3. Web

The initial milestone (**v1**) is dedicated **ONLY** to real-time train tracking by train number.

---

## 2. Technology Stack

- **Languages & Frameworks**: TypeScript (strict mode), React Native, Expo, Expo Router, React Native Web, Node.js, Hono
- **State & Validation**: Zustand, Zod
- **Mapping**: OpenStreetMap-based mapping (Leaflet via `react-native-webview` for mobile Expo Go; Web DOM for web)
- **Data Source**: RailRadar API (upstream)
- **Persistence**: Supabase only if persistence becomes necessary (not in v1)

---

## 3. Architecture Rules

- **Data Flow**: `Frontend (Client)` → `TrainPulse Backend` → `RailRadar API`.
- **Frontend Isolation**: The frontend must **NEVER** call RailRadar directly. Only the TrainPulse backend communicates with RailRadar.
- **Shared Schema**: Use `@trainpulse/shared` as the single source of truth for Zod validation schemas and TypeScript DTOs.
- **Responsive Layout**: Provide a responsive container (`maxWidth: 640px` on web/desktop) to prevent UI stretching on wide screens.
- **Expo Go Compatibility**: Maintain 100% Expo Go compatibility during development. Avoid native build dependencies (`react-native-maps` native compile, custom native modules) that break Expo Go.

---

## 4. Security Rules

1. **Secret Isolation**: **NEVER** expose the `RAILRADAR_API_KEY` in the frontend, mobile bundle, web build, or client network requests.
2. **Environment Protection**: All API keys must reside exclusively in backend environment variables.
3. **Git Hygiene**: Keep all `.env` and `.env.*` files strictly out of Git.
4. **Traffic Guard**: Backend must enforce CORS origin controls and IP rate limiting.

---

## 5. API Rules

### Backend Endpoint
- `GET /api/v1/trains/:trainNumber/live`

### Backend Responsibilities
- **Validation**: Strictly validate that train numbers are 5 numeric digits before hitting cache or upstream.
- **Caching**: Implement in-memory TTL caching (30–45 seconds) to respect upstream quota.
- **Request Coalescing**: Use single-flight request coalescing so simultaneous queries for the same train number share a single outbound upstream request.
- **Error & Timeout Handling**: Handle upstream timeouts (8s abort), rate limits (429), and not-found states (404) gracefully.
- **Transformation**: Normalize raw upstream data into the canonical `LiveTrainData` DTO.

### Frontend Polling Rules
- Auto-refresh live data every 30–45 seconds while tracking screen is active.
- Prevent duplicate/concurrent requests (`isFetching` lock + `AbortController`).
- Automatically pause polling when app enters background or browser tab is hidden (`AppState` / `visibilitychange`).
- Immediately cancel in-flight requests and clear polling timers on screen unmount.

---

## 6. Coding & Truthfulness Rules

1. **Strict TypeScript**: `strict: true` across all workspaces with zero type-casting bypasses where possible.
2. **Reusable Components**: Keep components modular, clean, and decoupled.
3. **Minimal Dependencies**: Avoid adding unnecessary external packages.
4. **Zero Invented Coordinates**: **Do NOT invent train location data.**
5. **Truthful Telemetry Rule**: **Never claim estimated positions are exact GPS positions.** Explicitly tag every location as `ACTUAL_GPS`, `ESTIMATED_SCHEDULE`, or `STATION_DEPARTURE`.
6. **No Surprises**: Do not make large architectural changes without explaining why.

---

## 7. Testing Rules

1. **Test Business Logic**: Always write and maintain unit tests for train number validation, data transformation, position type determination, cache TTL & coalescing, and store lifecycle transitions.
2. **Verification Requirement**: After every significant implementation, run full verification:
   - `npm run typecheck` (must exit code 0)
   - `npm run test` (all unit & integration tests must pass)

---

## 8. Scope Restrictions (Do NOT Implement in v1)

The first version **ONLY** provides live train tracking (train number, train name, running status, current location, speed, delay, next station, last updated time, live map, and actual/estimated position indicator).

**Strictly DO NOT implement:**
- Ticket booking
- PNR inquiry or status checking
- Seat availability
- Payments or wallets
- Food ordering
- Social or review features
- User authentication or login systems
- Features outside the active milestone


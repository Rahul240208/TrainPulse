import fs from 'fs';
import path from 'path';

const prd = `# TrainPulse - Product Requirements Document (PRD)

## 1. Project Overview
**Project Name:** TrainPulse
**Description:** A cross-platform Indian Railway live train tracking application (Android, iOS, Web) built with a strict "Map-First" user experience. TrainPulse focuses on providing seamless, highly visual, real-time train tracking without the clutter of unnecessary features. 

> **Screenshot:**
> ![TrainPulse Live Tracking](../assets/screenshots/hero_live_map.png)

## 2. Problem Statement
Existing railway apps are often cluttered with ticketing, PNR status, and advertisements, making the core use case—finding out exactly where a train is right now—cumbersome. Furthermore, many apps present location data as textual lists rather than intuitive map-based visualizations, leading to poor spatial awareness of a train's journey.

## 3. Target Users
* **Daily Commuters:** Users who need to quickly check if their regular train is on time before leaving for the station.
* **Long-Distance Travelers:** Passengers on board who want to track their journey progress visually.
* **Waiting Family/Friends:** People picking up passengers who need accurate, live ETAs and map positions to time their station arrival.

## 4. Goals and Success Metrics
* **Goal 1:** Deliver a purely map-centric live tracking experience where the map is the primary interface.
* **Goal 2:** Ensure cross-platform parity across Web, iOS, and Android using a single codebase.
* **Goal 3:** Protect upstream provider constraints (RailRadar) through aggressive backend caching and request coalescing.
* **Goal 4:** Provide a seamless Dark and Light theme experience based on system preferences.
* **Success Metrics:**
  * Sub-1-second initial load time for train tracking data (via cache).
  * 0 upstream rate-limit breaches (429 errors).
  * 100% Expo Go compatibility maintained during development.

## 5. Core Features (MVP Scope)
1. **Map-First Search:** Global search bar directly overlaid on a live map (search by Train Name, Train Number, or Station).
2. **Where-to-Where Search:** Find active trains running between a Source and Destination station.
3. **Live Route Visualization:** Display the entire train route geometry with accurate station markers.
4. **Live Train Marker & Interpolation:** Smoothly animated train marker that moves along the route, with explicit UI tags distinguishing \`ACTUAL_GPS\` from \`ESTIMATED_SCHEDULE\`.
5. **Live Status Panel:** Compact, floating UI panel showing speed, delay, next station, and last updated timestamp.
6. **Dynamic Theme:** System-aware Dark and Light modes using the official TrainPulse branding colors (Pulse Cyan, Midnight Navy, etc.).

## 6. Out-of-Scope (Strictly Avoided)
To maintain project focus, the following are strictly excluded from V1:
* Ticket booking and payment gateways.
* PNR inquiry or prediction.
* Seat availability checking.
* Food ordering or social features.
* User authentication and accounts.

## 7. User Stories
* *As a user, I want to open the app and immediately see a search bar over a map, so I can start tracking instantly.*
* *As a user, I want to search for "12046" and see the Shatabdi Express route plotted on the map.*
* *As a user, I want to see if the train position is an actual GPS reading or just a schedule estimate, so I can trust the data.*
* *As a user, I want to keep the app open and watch the train marker update its position automatically without manually refreshing.*
* *As a user, I want to toggle between dark mode and light mode manually if I don't prefer the system default.*

## 8. Assumptions & Risks
* **Assumptions:** Users have active internet connections. The RailRadar API provides reasonably accurate telemetry and route geometry.
* **Risks:** 
  * Upstream API rate limits or downtime. (Mitigated by TTL caching and stale data fallback).
  * Map rendering performance on low-end mobile devices. (Mitigated by using optimized Leaflet DOM/WebView implementations instead of heavy native map SDKs).

## 9. Acceptance Criteria
* The app successfully launches on Android (APK/Expo), iOS (Expo), and Web.
* Searching a valid 5-digit train number plots the route and live location on the map.
* Polling occurs automatically every 30-45 seconds when the app is active, and pauses when backgrounded.
* The backend strictly masks the RailRadar API key and never exposes it to the client.
* The UI dynamically shifts colors according to the system theme or user toggle.
`;

const srs = `# TrainPulse - Software Requirements Specification (SRS)

## 1. Introduction
This document outlines the detailed functional and non-functional requirements for the TrainPulse application. The system consists of a cross-platform frontend (React Native/Expo) and a lightweight proxy backend (Node.js/Hono).

## 2. User Roles & Permissions
* **Anonymous User:** The only supported role in MVP. Users can search for trains, view maps, and track live status without authentication.
* **System (Backend):** Responsible for securely querying the upstream RailRadar API, transforming data, and serving the frontend.

## 3. Functional Requirements

### 3.1. Search Module
* **REQ-101:** The system shall provide a unified search bar supporting Train Number, Train Name, and Station Name/Code.
* **REQ-102:** The system shall support "Where-to-Where" routing, allowing users to select a Source and Destination station to find connecting trains.
* **REQ-103:** Selecting a search result shall immediately transition the map to focus on the selected entity (train route or station).

### 3.2. Map & Visualization Module
* **REQ-201:** The system shall render an OpenStreetMap-based map.
* **REQ-202:** When a train is selected, the system shall plot the complete route geometry.
* **REQ-203:** Station markers along the route must visually differentiate between passed stations, the current station, and future stations.
* **REQ-204:** The train marker shall move smoothly between updates (interpolation) when valid adjacent coordinates are available.

### 3.3. Live Status Panel & Theming
* **REQ-301:** The system shall display a floating status panel containing: Train Number/Name, Running Status, Current Location, Next Station, Speed, Delay, and Last Updated time.
* **REQ-302:** The UI must explicitly tag location data as \`ACTUAL_GPS\`, \`ESTIMATED_SCHEDULE\`, or \`STATION_DEPARTURE\`.
* **REQ-303:** The application shall include a dynamic dark/light theme system defaulting to system preferences, with a manual toggle in the UI.

### 3.4. Background Polling & Lifecycle
* **REQ-401:** The frontend shall automatically poll the backend for live train data every 30-45 seconds.
* **REQ-402:** Polling must automatically pause when the app enters the background or the browser tab becomes hidden (\`AppState\` / \`visibilitychange\`).
* **REQ-403:** In-flight requests must be aborted when a user navigates away from the tracking screen.

## 4. Business Rules & Validations
* **BR-01 (Train Number Format):** Train numbers must be strictly validated as exactly 5 numeric digits (e.g., \`12046\`) before any upstream request is made.
* **BR-02 (Zero Invented Data):** The system shall never fabricate coordinates or claim estimated interpolation paths as verified GPS data.
* **BR-03 (Graceful Degradation):** If a live refresh fails but stale data exists, the UI shall display the stale data with a "Showing last successful update" warning rather than a hard error screen.

## 5. Data Requirements & Schemas (Shared DTOs)
* **LiveTrainData:** Canonical DTO containing \`trainNumber\`, \`status\` (ON_TIME, DELAYED, etc.), \`CurrentLocation\`, and an array of \`StationPoint\` objects.
* **PositionType:** Enum restricted to \`ACTUAL_GPS\`, \`ESTIMATED_SCHEDULE\`, and \`STATION_DEPARTURE\`.
* All data contracts between frontend and backend must be strictly validated using shared Zod schemas (\`@trainpulse/shared\`).

## 6. Security & Authorization
* **SEC-01 (Strict API Key Isolation):** The \`RAILRADAR_API_KEY\` shall never be shipped in the frontend bundle or exposed in network payloads.
* **SEC-02 (CORS Protection):** The backend shall enforce strict CORS policies allowing only authorized frontend origins.
* **SEC-03 (Error Masking):** Upstream error messages (especially Auth errors from RailRadar) must be masked; stack traces must never be exposed to the client.

## 7. Performance & Edge Cases
* **PERF-01 (Caching):** The backend must implement in-memory TTL caching (30s) to prevent exceeding upstream API quotas.
* **PERF-02 (Request Coalescing):** Simultaneous requests for the same train number must be coalesced into a single outbound upstream request.
* **EDGE-01 (Timeout):** Upstream requests exceeding 8 seconds must be aborted, and a 504 Gateway Timeout or stale cache data must be returned.
* **EDGE-02 (Layout):** Web and Desktop interfaces must enforce a responsive container (\`maxWidth: 640px\`) to prevent UI stretching on ultra-wide screens.

## 8. Acceptance Criteria
* \`npm run typecheck\` exits with code 0.
* Zod schema tests and backend unit tests pass with >90% coverage on critical services.
* Searching \`12345\` results in a mapped route; searching \`ABCDE\` results in immediate local validation failure.
`;

const arch = `# TrainPulse - System Architecture Document

## 1. System Overview
TrainPulse operates on a strictly decoupled client-server architecture. The frontend handles cross-platform UI, map rendering, and local state management. The backend acts as a secure proxy and data transformer to the external RailRadar API. 

## 2. Technology Stack
* **Frontend:** TypeScript, React Native, Expo, Expo Router, React Native Web, Zustand (State), Zod (Validation), Leaflet (Map via react-native-webview/Web DOM).
* **Backend:** Node.js, Hono, Zod, lru-cache (In-memory caching).
* **Shared:** A monorepo package (\`@trainpulse/shared\`) containing Zod DTOs for strict type synchronization.
* **Upstream:** RailRadar API.
* **Persistence:** (Deferred for MVP) Supabase is reserved for future milestones if persistent user data is needed.

## 3. High-Level Architecture Diagram

\`\`\`mermaid
flowchart TD
    subgraph ClientLayer ["Client Layer (Expo / React Native Web)"]
        UI["React UI Components"]
        Theme["ThemeContext (Dark/Light)"]
        Store["Zustand State Manager"]
        Map["Leaflet Map Engine"]
        Poller["Lifecycle-Aware Poller"]
    end

    subgraph BackendLayer ["TrainPulse Backend (Node.js / Hono)"]
        Router["API Router (/api/v1/...)"]
        Validator["Zod Schema Validator"]
        Coalescer["Single-Flight Coalescer"]
        Cache["In-Memory LRU Cache (30s TTL)"]
        Adapter["RailRadar Upstream Adapter"]
    end

    subgraph External ["External Services"]
        RailRadar["RailRadar API"]
    end

    Theme --> UI
    UI <--> Store
    Store <--> Poller
    Poller -->|HTTP GET /trains/:id/live| Router
    Router --> Validator
    Validator --> Coalescer
    Coalescer --> Cache
    Cache -->|Cache Miss| Adapter
    Adapter -->|Authenticated Request| RailRadar
    RailRadar --> Adapter
    Adapter -->|Normalize to DTO| Cache
\`\`\`

## 4. Key Architectural Decisions

### 4.1. Map Rendering Strategy
To ensure 100% Expo Go compatibility and zero native build step requirements, \`react-native-maps\` is avoided. Instead, we use an OpenStreetMap/Leaflet implementation:
* **Mobile:** Rendered inside a \`react-native-webview\`.
* **Web:** Rendered directly in the browser DOM.

### 4.2. Request Coalescing & Caching
Because TrainPulse auto-polls every 30 seconds, high traffic can overwhelm upstream providers.
* **Coalescing:** If 50 users poll train \`12046\` simultaneously, the backend halts 49 requests, makes 1 outbound request to RailRadar, and broadcasts the result to all 50 clients.
* **TTL Cache:** Successful responses are held in memory for 30-45 seconds.

### 4.3. Data Flow & Transformation
Clients never see raw upstream data. The backend adapter parses the RailRadar JSON, maps it to the \`@trainpulse/shared\` DTO (\`LiveTrainData\`), strictly types the response, and sends the sanitized payload to the client.

### 4.4. Dynamic Theming
Theme changes (Dark/Light) trigger dynamic re-evaluation of \`StyleSheet.create\` calls via a \`useTheme()\` context hook. This prevents static styles from locking into one mode upon app initialization.

## 5. Security Architecture
* **Zero Trust Frontend:** No API keys are bundled into the client. The frontend does not even know RailRadar exists.
* **Environment Secrets:** \`RAILRADAR_API_KEY\` is loaded strictly via \`.env\` in the backend.
* **Error Sanitization:** All upstream 5xx errors or auth failures are caught by a global Hono error handler. Stack traces and upstream HTTP messages are sanitized before returning a generic 502/503 to the client.

## 6. Deployment & Scalability
* **Backend:** Can be deployed to lightweight containers or serverless edge environments (e.g., Vercel, Cloud Run) that support Hono.
* **Frontend:** Deployed as Static Web Assets for the browser, and via Expo EAS for Android (APK/AAB) and iOS (IPA).
`;

const uiux = `# TrainPulse - UI/UX Design Specification

## 1. Design Philosophy
TrainPulse follows a "Map-First" philosophy. The interface is dark, tech-forward, and highly focused on the real-time location telemetry of the train. It avoids standard railway app cliches (like heavy red/blue corporate themes) in favor of a modern, data-driven "radar" aesthetic, using the official TrainPulse brand guidelines.

## 2. Official Brand & Color Palette

The app dynamically switches between Dark and Light modes using the official TrainPulse brand colors:

| Role | Name | Dark Mode Hex | Light Mode Hex |
|---|---|---|---|
| Primary Background | Signal Black / Cloud | \`#070D18\` | \`#F1F5F9\` |
| Card Background | Midnight Navy / White | \`#0B1B2E\` | \`#FFFFFF\` |
| Accent (Logo/Routes)| Pulse Cyan | \`#22D3EE\` | \`#0891B2\` |
| Live Position | Live Amber | \`#FFB020\` | \`#F59E0B\` |
| Secondary Text | Rail Slate | \`#64748B\` | \`#64748B\` |
| Status: On Time | Emerald | \`#22C55E\` | \`#22C55E\` |
| Status: Delayed | Red | \`#EF4444\` | \`#EF4444\` |

## 3. Logo and Iconography
* **Primary Logo:** A native SVG \`TrainPulseLogo\` component renders the wordmark and the pulse route graphic, dynamically picking up colors from the theme.
* **Icons:** \`@expo/vector-icons\` (Ionicons) are used for UI controls.
* **Map Markers:**
  * Passed stations: Grey/Muted small dots.
  * Current/Next station: Hollow rings.
  * Train Position: A glowing amber dot to signify "Live".

## 4. Layout Breakpoints
* **Mobile (Default):** Fluid width, standard mobile bottom tab navigation.
* **Tablet/Desktop (Web):** The main content is constrained within a \`maxWidth: 640px\` centralized column (using \`ResponsiveContainer\`) to prevent the UI from stretching out on ultra-wide screens. The background outside the container is filled with the deep background color.

## 5. Screen Specifications

### 5.1. Home/Search Screen (The "Where" Screen)
* **Header:** Features the TrainPulse dynamic SVG logo and a manual Dark/Light mode toggle button in the top right.
* **Journey Guide:** A visual stepping stone diagram explaining the tracking flow.
* **Global Search Box:** Floating above the map, allowing users to type a 5-digit train number.
* **Recent Searches:** A horizontally scrolling (or list) carousel of previously searched trains for quick access.

### 5.2. Live Tracking Map Screen (The "Track" Screen)
* **Fullscreen Map:** Occupies 100% of the viewport (underneath the transparent status bar).
* **Floating Header:** A minimal overlay back button and search icon.
* **Live Status Panel (Bottom Sheet):** A floating panel at the bottom of the screen containing:
  * Train Name, Number, and Source -> Dest pill.
  * Large, highly visible running status (e.g., "RUNNING • 12m late").
  * **Truthful Telemetry Indicator:** A badge explicitly stating \`ACTUAL GPS\`, \`STATION DEPARTURE\`, or \`ESTIMATED POSITION\`.
  * Grid of stats: Current Location, Next Station, Speed, Delay.

## 6. Interaction & Motion
* **Map Interpolation:** The train marker animates along the route polyline between polling intervals.
* **Polling Indicator:** A subtle pulse or spinning icon in the status panel while data is refreshing.
* **Error States:** If a refresh fails, the UI gracefully falls back to the last known position, tinting the timestamp amber to indicate "Stale Data".

## 7. Accessibility
* High contrast modes supported (Pulse Cyan on Midnight Navy exceeds AA requirements).
* All interactive elements have minimum 44x44 tap targets.
* Screen readers announce the "Truthful Telemetry" status distinctly so visually impaired users know the confidence level of the position data.
`;

const devPlan = `# TrainPulse - Development & Implementation Plan

## Phase 1: Project Setup & Scaffolding (COMPLETED)
- [x] Initialize Monorepo (Frontend & Backend).
- [x] Configure TypeScript in strict mode.
- [x] Setup Expo Router and React Native Web.
- [x] Create \`@trainpulse/shared\` package for Zod schemas.

## Phase 2: Design System & Theming (COMPLETED)
- [x] Define global design tokens (colors, spacing, typography).
- [x] Implement \`ThemeProvider\` context for dynamic Dark/Light mode.
- [x] Refactor all static \`StyleSheet.create\` calls to dynamic \`createStyles(theme)\` injections.
- [x] Integrate official TrainPulse branding SVG logo as a dynamic React Native component.
- [x] Add theme toggle button to the Home screen UI.

## Phase 3: Core UI & Navigation (COMPLETED)
- [x] Build \`ResponsiveContainer\` for web/desktop layout constraints.
- [x] Implement Bottom Tabs layout (Home, Search, Live Map, About).
- [x] Develop Home screen with search inputs and recent history.
- [x] Create Live Tracking screen layout (Map placeholder + Floating Status Panel).

## Phase 4: Map & Visualization Integration (PENDING)
- [ ] Implement OpenStreetMap via Leaflet (Web DOM / Mobile WebView).
- [ ] Plot route polyline coordinates.
- [ ] Render station markers (Passed, Current, Future).
- [ ] Implement smooth train marker interpolation based on speed/bearing.

## Phase 5: Backend & API Integration (PENDING)
- [ ] Develop Node.js/Hono backend proxy server.
- [ ] Implement RailRadar upstream adapter.
- [ ] Enforce Zod validation on incoming and outgoing payloads.
- [ ] Add 30s in-memory LRU cache and single-flight request coalescing.
- [ ] Hook up Frontend Zustand store to fetch from Backend API.

## Phase 6: Polish & Edge Cases (PENDING)
- [ ] Implement AppState/VisibilityChange polling pause.
- [ ] Add graceful degradation for network timeouts (Stale UI state).
- [ ] Write unit tests for critical business logic (Validation, Transformation).
- [ ] Conduct full verification: \`npm run typecheck\` and tests passing.
`;

fs.writeFileSync('d:/Live Railway Tracking/TrainPulse/docs/TrainPulse_1_PRD.md', prd, 'utf8');
fs.writeFileSync('d:/Live Railway Tracking/TrainPulse/docs/TrainPulse_2_SRS.md', srs, 'utf8');
fs.writeFileSync('d:/Live Railway Tracking/TrainPulse/docs/TrainPulse_3_Architecture.md', arch, 'utf8');
fs.writeFileSync('d:/Live Railway Tracking/TrainPulse/docs/TrainPulse_4_UI_UX.md', uiux, 'utf8');
fs.writeFileSync('d:/Live Railway Tracking/TrainPulse/docs/TrainPulse_5_DevPlan.md', devPlan, 'utf8');
console.log('Successfully organized and updated the 5 documents into docs/');


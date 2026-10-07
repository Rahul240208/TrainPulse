# TrainPulse - Software Requirements Specification (SRS)

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
* **REQ-302:** The UI must explicitly tag location data as `ACTUAL_GPS`, `ESTIMATED_SCHEDULE`, or `STATION_DEPARTURE`.
* **REQ-303:** The application shall include a dynamic dark/light theme system defaulting to system preferences, with a manual toggle in the UI.

### 3.4. Background Polling & Lifecycle
* **REQ-401:** The frontend shall automatically poll the backend for live train data every 30-45 seconds.
* **REQ-402:** Polling must automatically pause when the app enters the background or the browser tab becomes hidden (`AppState` / `visibilitychange`).
* **REQ-403:** In-flight requests must be aborted when a user navigates away from the tracking screen.

## 4. Business Rules & Validations
* **BR-01 (Train Number Format):** Train numbers must be strictly validated as exactly 5 numeric digits (e.g., `12046`) before any upstream request is made.
* **BR-02 (Zero Invented Data):** The system shall never fabricate coordinates or claim estimated interpolation paths as verified GPS data.
* **BR-03 (Graceful Degradation):** If a live refresh fails but stale data exists, the UI shall display the stale data with a "Showing last successful update" warning rather than a hard error screen.

## 5. Data Requirements & Schemas (Shared DTOs)
* **LiveTrainData:** Canonical DTO containing `trainNumber`, `status` (ON_TIME, DELAYED, etc.), `CurrentLocation`, and an array of `StationPoint` objects.
* **PositionType:** Enum restricted to `ACTUAL_GPS`, `ESTIMATED_SCHEDULE`, and `STATION_DEPARTURE`.
* All data contracts between frontend and backend must be strictly validated using shared Zod schemas (`@trainpulse/shared`).

## 6. Security & Authorization
* **SEC-01 (Strict API Key Isolation):** The `RAILRADAR_API_KEY` shall never be shipped in the frontend bundle or exposed in network payloads.
* **SEC-02 (CORS Protection):** The backend shall enforce strict CORS policies allowing only authorized frontend origins.
* **SEC-03 (Error Masking):** Upstream error messages (especially Auth errors from RailRadar) must be masked; stack traces must never be exposed to the client.

## 7. Performance & Edge Cases
* **PERF-01 (Caching):** The backend must implement in-memory TTL caching (30s) to prevent exceeding upstream API quotas.
* **PERF-02 (Request Coalescing):** Simultaneous requests for the same train number must be coalesced into a single outbound upstream request.
* **EDGE-01 (Timeout):** Upstream requests exceeding 8 seconds must be aborted, and a 504 Gateway Timeout or stale cache data must be returned.
* **EDGE-02 (Layout):** Web and Desktop interfaces must enforce a responsive container (`maxWidth: 640px`) to prevent UI stretching on ultra-wide screens.

## 8. Acceptance Criteria
* `npm run typecheck` exits with code 0.
* Zod schema tests and backend unit tests pass with >90% coverage on critical services.
* Searching `12345` results in a mapped route; searching `ABCDE` results in immediate local validation failure.

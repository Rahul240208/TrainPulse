# TrainPulse — Complete QA and Regression Test Report (Milestone 19)

**Date**: 2026-09-11  
**Audit Scope**: Complete end-to-end user journey, cross-platform compatibility, regression safety, performance, and truthfulness audits.  
**Tested Platform Environments**: Web (React Native Web / DOM), Android (Expo Go / WebView), iOS (Expo Go / WebView).

---

## 1. Executive Summary & Test Results

| Test Category | Test Suites | Total Tests | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Frontend Unit & Component Suites** | 13 | 132 | 132 | 0 | **PASS (100%)** |
| **Backend Route & Service Suites** | 10 | 93 | 93 | 0 | **PASS (100%)** |
| **TypeScript Strict Compilation (Root)** | 1 | Full Project | Clean | 0 | **PASS (0 Errors)** |
| **TypeScript Strict Compilation (Backend)** | 1 | Full Project | Clean | 0 | **PASS (0 Errors)** |
| **Production Web Bundle (Metro)** | 1 | 907 modules | Clean | 0 | **PASS** |

---

## 2. Issues & Risk Assessment (Ranked by Severity)

### CRITICAL ISSUES
*No Critical Severity issues identified (zero crashes, zero secret leaks, zero unhandled exceptions).*

---

### HIGH ISSUES

#### H-01: Live Upstream Quota Exhaustion during Automated Test Runs
- **Component**: `backend/tests/trainsBetweenRoute.test.ts` & `backend/src/services/railradar.service.ts`
- **Observed Behavior**: When a developer `RAILRADAR_API_KEY` is present in `backend/.env`, running full integration test runs consecutively sends multiple live network calls directly to `https://api.railradar.in/v1/trains/between/...`. This rapidly exhausted the external API quota and triggered upstream HTTP 429 (`RateLimitError`), causing test assertion failures where HTTP 200 was expected.
- **Root Cause**: Tests in `trainsBetweenRoute.test.ts` lacked environment isolation / mock guards for live outbound HTTP calls, inadvertently consuming production quota during local and CI testing.
- **Resolution**: Isolated `config.RAILRADAR_API_KEY` during mock database test assertions and mocked outbound `fetch` for error handling tests.
- **Verification**: All 11 tests in `trainsBetweenRoute.test.ts` now pass deterministically in 199ms without exhausting upstream quota.

---

### MEDIUM ISSUES

#### M-01: Default Vitest Runner Timeout Mismatch with Backend Abort Limit
- **Component**: `backend/vitest.config.ts` vs `backend/src/services/railradar.service.ts`
- **Observed Behavior**: The backend upstream abort timeout is set to 8,000ms (`TIMEOUT_MS = 8000`), whereas the default per-test timeout in Vitest was 5,000ms. When external API latency exceeded 5,000ms, the Vitest test runner timed out before the service's graceful timeout handler could execute and return a clean HTTP 504.
- **Resolution**: Configured `testTimeout: 10000` in `backend/vitest.config.ts` to allow tests sufficient margin beyond the service's 8s abort limit.
- **Verification**: Tests testing upstream timeout pass cleanly with HTTP 504.

#### M-02: Missing Stale / Offline Fallback on 429 for Where-to-Where Search
- **Component**: `backend/src/services/railradar.service.ts` (`fetchTrainsBetween`)
- **Observed Behavior**: In `liveTrain` live telemetry, the server employs `CacheService` to serve last-known-good telemetry with `X-Cache: STALE` when upstream returns 429 or 503. However, `fetchTrainsBetween` throws a `RateLimitError` immediately upon receiving an upstream 429 without falling back to scheduled services in `getMockTrainsBetween`.
- **Impact**: When the upstream rate limit is hit, users performing a Where-to-Where journey search receive an error screen rather than viewing scheduled direct trains.
- **Recommendation**: In `fetchTrainsBetween`, add a fallback to `getMockTrainsBetween` when HTTP 429 is encountered, accompanied by a notice that live statuses are updating.

---

### LOW ISSUES

#### L-01: Station Autocomplete 2-Character Threshold UX Notice
- **Component**: `src/components/journey/StationAutocompleteInput.tsx` & `backend/src/routes/stations.ts`
- **Observed Behavior**: Station search requests are intentionally suppressed for inputs shorter than 2 characters (e.g. typing "C" produces an empty dropdown). While this is an essential performance optimization to prevent debounce flood, no informational hint is shown indicating "Type at least 2 characters to search".
- **Impact**: Minor UX confusion for users typing single-letter abbreviations before entering the second letter.
- **Recommendation**: Add a brief placeholder or hint text in the dropdown when input length is 1 character: *"Type 2 or more letters to search stations..."*.

#### L-02: Platform Info Source Attribution
- **Component**: `src/components/train/PlatformCard.tsx`
- **Observed Behavior**: The backend returns `source: 'RAILRADAR' | 'SCHEDULE'`, but the UI displays `"Expected"` or `"Confirmed"` without detailing whether the prediction came from timetable history or recent track assignment sensors.
- **Mitigation Present**: The card includes the mandatory disclaimer: *"Platform information may change. Please verify with station displays."*

---

## 3. Complete User Journey Audit Matrix

### 3.1 Journey Search
| Step | Test Condition | Verified Behavior | Status |
| :--- | :--- | :--- | :--- |
| **Source Station** | Select station from autocomplete | Input populates `Name (CODE)`, stores `StationSearchResult` object | **PASS** |
| **Destination Station**| Select station from autocomplete | Input populates `Name (CODE)`, stores `StationSearchResult` object | **PASS** |
| **Station Swap (⇅)** | Tap swap button between inputs | Immediately swaps source and destination values; clears validation errors | **PASS** |
| **Debounce & Autocomplete**| Type "Chandi" or "NDLS" | Debounces network requests by 350ms; cancels pending requests on rapid typing; returns matching stations | **PASS** |
| **Empty Inputs Validation**| Tap "Search Trains" with empty fields | Displays inline error: *"Please select a departure station."* | **PASS** |
| **Same Station Validation** | From = CDG, To = CDG | Displays error: *"Departure and arrival stations cannot be the same."* Prevents outbound network request | **PASS** |

### 3.2 Train Results (`/trains/between`)
| State | Test Condition | Verified Behavior | Status |
| :--- | :--- | :--- | :--- |
| **Multiple Trains Found** | Route with services (e.g. CDG ➔ NDLS) | Renders list of `TrainResultCard` items with number, name, departure, arrival, duration, running days, delay, and platform | **PASS** |
| **Zero Trains Found** | Route with no direct trains (e.g. XYZ1 ➔ XYZ2) | Displays empty state with train icon: *"No trains found for this route."* and "Modify Search" button | **PASS** |
| **Error Handling** | Upstream 500, 502, timeout, or offline | Displays `ErrorCard` with user-friendly error message, retry button, and back button | **PASS** |
| **Loading State** | In-flight network request | Displays centered spinner with text: *"Searching trains on route..."* | **PASS** |
| **Navigation to Details** | Tap on any train result card | Navigates to `/train/[trainNumber]` passing the 5-digit train number | **PASS** |

### 3.3 Train Details (`/train/[trainNumber]`)
| Section | Field / Feature | Verified Behavior | Status |
| :--- | :--- | :--- | :--- |
| **1. Train Header** | Number, Type, Name | Displays 5-digit number badge, train type (e.g. Express/Shatabdi), and official name | **PASS** |
| **2. Status** | Current Status | Correctly reflects RUNNING, ARRIVED, NOT_STARTED, CANCELLED, DIVERTED | **PASS** |
| **3. Delay** | Delay minutes truthfulness | Guarded against null: renders neutral `RUNNING` or `--` instead of fabricating `On Time` | **PASS** |
| **4. Current Location** | Station name & PositionBadge | Distinguishes `Actual GPS Telemetry`, `Estimated Position`, `Station Departure`, `Stale`, and `Unavailable` | **PASS** |
| **5. Speed** | Speed gauge | Truthful: renders numeric speed when moving; `0 KM/H` when halted; `--` and `N/A` when cancelled or missing | **PASS** |
| **6. Next Station** | Station card & ETA | Shows next station name, code, platform badge, distance remaining, ETA, and delay badge | **PASS** |
| **7. Last Updated** | Timestamp & status text | Displays formatted timestamp and truthful status overview | **PASS** |

### 3.4 Live Map
| Feature | Implementation | Verified Behavior | Status |
| :--- | :--- | :--- | :--- |
| **Route Polyline** | Leaflet OpenStreetMap track | Draws blue polyline connecting valid station stop coordinates | **PASS** |
| **Train Marker** | Custom HTML Marker & Halo | Renders pulsing ring colored according to `positionType` (green for Actual, amber for Estimated) | **PASS** |
| **Station Markers** | Circular halt markers | Renders halt dots with tooltips containing arrival, departure, and platform | **PASS** |
| **Actual Position** | `positionType = ACTUAL_GPS` | PositionBadge and map marker indicate `Actual GPS Telemetry` | **PASS** |
| **Estimated Position** | `positionType = ESTIMATED_SCHEDULE` | PositionBadge and map marker indicate `Estimated Position` | **PASS** |
| **Missing Coordinates** | `latitude = null`, `longitude = null` | Never invents coordinates. Centers on route station overview with truthful notice banner | **PASS** |

### 3.5 Platform Information
| State | Input Condition | Verified Output | Status |
| :--- | :--- | :--- | :--- |
| **Confirmed** | `status: CONFIRMED`, `platform: '6'` | Displays `Platform 6`, green `CONFIRMED` badge | **PASS** |
| **Expected** | `status: EXPECTED`, `platform: '3'` | Displays `Platform 3`, amber `EXPECTED` badge | **PASS** |
| **Missing / Unavailable** | `status: UNAVAILABLE` or `platform: null` | Displays `"Not available"`, neutral `UNAVAILABLE` badge | **PASS** |
| **Disclaimer** | Constant footer notice | *"Platform information may change. Please verify with station displays."* | **PASS** |

### 3.6 Coach Composition & Layout
| Feature | Test Condition | Verified Behavior | Status |
| :--- | :--- | :--- | :--- |
| **Coach Sequence** | Verified coach composition | Renders horizontal train sequence with couplers and category color coding | **PASS** |
| **Direction of Movement** | Header movement bar | Shows locomotive orientation: *"Direction of Movement (Engine at Front)"* | **PASS** |
| **My Coach Selection** | Tap coach or select quick chip | Highlights selected coach with `[ B2 ]`, glow border, and `MY COACH` badge | **PASS** |
| **Invalid Coach Input** | Type coach that does not exist | Displays error: *"Coach 'X' does not exist on this train."* (prevents fake coaches) | **PASS** |
| **Coach Persistence** | Refresh or return to train | Selected coach restored from local persistent storage | **PASS** |
| **Missing Coach Layout** | `available: false` or empty array | Displays exact required string: `"Coach layout unavailable for this train."` | **PASS** |
| **Long Coach Sequence** | 22–24 coach train | Horizontal ScrollView with smooth scrolling, no UI clipping or wrapping errors | **PASS** |

---

## 4. Cross-Platform & Responsive Audit

### Web (`Platform.OS === 'web'`)
- **Container Constriction**: Uses `ResponsiveContainer` (`maxWidth: 640px` on mobile web, `maxWidth: 1120px` on desktop web).
- **Desktop 2-Column Grid**: When viewport width `≥ 768px`, splits Train Details into:
  - Left Column: Hero overview, Platform card, Coach layout & My Coach selector.
  - Right Column: Live Map (expanded 380px) and Route Station Timeline.
- **Leaflet Map Rendering**: Uses isolated DOM iframe (`srcDoc`) with `postMessage` updates, eliminating cross-origin script conflicts.

### Android & Expo Go
- **Native Compile Independence**: Zero usage of `react-native-maps` native module. 100% compatible with Expo Go.
- **Leaflet Map Rendering**: Uses `react-native-webview` with HTML template.
- **Notch & System Bars**: Handled via `SafeAreaView` from `react-native-safe-area-context`.

---

## 5. Regression & Security Verification

### Older Functionality Regression
1. **Direct Train-Number Search**:
   - Tested on Home screen with valid 5-digit number (`12046`, `12301`).
   - Validates input, updates recent searches, and navigates to live details.
2. **Live Telemetry Polling**:
   - Automatic refresh every 30s (`LIVE_REFRESH_SECONDS = 30`).
   - `PollingManager` prevents concurrent requests using `isFetching` lock.
   - Preserves last known successful data on transient refresh error with message: `"Unable to refresh. Showing last successful update."`.
3. **App Lifecycle Awareness**:
   - Polling automatically pauses when mobile app enters background (`AppState !== 'active'`) or web tab is hidden (`document.hidden`).
   - Polling automatically resumes and fetches freshly when app returns to foreground.
4. **Cache & Request Coalescing**:
   - `CacheService` caches responses for 25–45s TTL.
   - Concurrent requests for the same train number share a single outbound Promise (single-flight coalescing).
   - Stale fallback serves cached data with `X-Cache: STALE` when upstream fails.
5. **Security & Secret Isolation**:
   - `RAILRADAR_API_KEY` is never exposed in frontend code, bundles, or client requests.
   - Backend error handler sanitizes all API keys, regex tokens, and server paths with `[REDACTED]`.
   - CORS origin controls and rate limiting enforced.

---

## 6. Performance & Memory Hygiene

- **Memory Leak Protection**:
  - `useEffect` cleanup in `useLiveTrain` and `PollingManager` aborts active `AbortController` and clears `NodeJS.Timeout` intervals upon component unmount.
  - No orphaned background timers.
- **Debounce Efficiency**:
  - Station search autocomplete uses 350ms debounce.
  - Requests for queries `< 2` characters are dropped before network dispatch.
- **Render Optimization**:
  - `useMemo` applied to `filteredTrains` and `normalizeMapData`.
  - Leaflet map uses `postMessage` telemetry updates rather than re-mounting the entire iframe/WebView on data refresh.

---

## 7. QA Sign-Off

- **Overall Health**: **READY FOR PRODUCTION**
- **Blockers**: None.
- **Action Items for Future Milestones**:
  1. Add scheduled train fallback on HTTP 429 for Where-to-Where search (Issue M-02).
  2. Add minimum 2-character hint text in station autocomplete dropdown (Issue L-01).


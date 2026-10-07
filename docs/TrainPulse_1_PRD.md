# TrainPulse - Product Requirements Document (PRD)

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
4. **Live Train Marker & Interpolation:** Smoothly animated train marker that moves along the route, with explicit UI tags distinguishing `ACTUAL_GPS` from `ESTIMATED_SCHEDULE`.
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

# TrainPulse - Development & Implementation Plan

## Phase 1: Project Setup & Scaffolding (COMPLETED)
- [x] Initialize Monorepo (Frontend & Backend).
- [x] Configure TypeScript in strict mode.
- [x] Setup Expo Router and React Native Web.
- [x] Create `@trainpulse/shared` package for Zod schemas.

## Phase 2: Design System & Theming (COMPLETED)
- [x] Define global design tokens (colors, spacing, typography).
- [x] Implement `ThemeProvider` context for dynamic Dark/Light mode.
- [x] Refactor all static `StyleSheet.create` calls to dynamic `createStyles(theme)` injections.
- [x] Integrate official TrainPulse branding SVG logo as a dynamic React Native component.
- [x] Add theme toggle button to the Home screen UI.

## Phase 3: Core UI & Navigation (COMPLETED)
- [x] Build `ResponsiveContainer` for web/desktop layout constraints.
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
- [ ] Conduct full verification: `npm run typecheck` and tests passing.

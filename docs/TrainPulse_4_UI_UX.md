# TrainPulse - UI/UX Design Specification

## 1. Design Philosophy
TrainPulse follows a "Map-First" philosophy. The interface is dark, tech-forward, and highly focused on the real-time location telemetry of the train. It avoids standard railway app cliches (like heavy red/blue corporate themes) in favor of a modern, data-driven "radar" aesthetic, using the official TrainPulse brand guidelines.

## 2. Official Brand & Color Palette

The app dynamically switches between Dark and Light modes using the official TrainPulse brand colors:

| Role | Name | Dark Mode Hex | Light Mode Hex |
|---|---|---|---|
| Primary Background | Signal Black / Cloud | `#070D18` | `#F1F5F9` |
| Card Background | Midnight Navy / White | `#0B1B2E` | `#FFFFFF` |
| Accent (Logo/Routes)| Pulse Cyan | `#22D3EE` | `#0891B2` |
| Live Position | Live Amber | `#FFB020` | `#F59E0B` |
| Secondary Text | Rail Slate | `#64748B` | `#64748B` |
| Status: On Time | Emerald | `#22C55E` | `#22C55E` |
| Status: Delayed | Red | `#EF4444` | `#EF4444` |

## 3. Logo and Iconography
* **Primary Logo:** A native SVG `TrainPulseLogo` component renders the wordmark and the pulse route graphic, dynamically picking up colors from the theme.
* **Icons:** `@expo/vector-icons` (Ionicons) are used for UI controls.
* **Map Markers:**
  * Passed stations: Grey/Muted small dots.
  * Current/Next station: Hollow rings.
  * Train Position: A glowing amber dot to signify "Live".

## 4. Layout Breakpoints
* **Mobile (Default):** Fluid width, standard mobile bottom tab navigation.
* **Tablet/Desktop (Web):** The main content is constrained within a `maxWidth: 640px` centralized column (using `ResponsiveContainer`) to prevent the UI from stretching out on ultra-wide screens. The background outside the container is filled with the deep background color.

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
  * **Truthful Telemetry Indicator:** A badge explicitly stating `ACTUAL GPS`, `STATION DEPARTURE`, or `ESTIMATED POSITION`.
  * Grid of stats: Current Location, Next Station, Speed, Delay.

## 6. Interaction & Motion
* **Map Interpolation:** The train marker animates along the route polyline between polling intervals.
* **Polling Indicator:** A subtle pulse or spinning icon in the status panel while data is refreshing.
* **Error States:** If a refresh fails, the UI gracefully falls back to the last known position, tinting the timestamp amber to indicate "Stale Data".

## 7. Accessibility
* High contrast modes supported (Pulse Cyan on Midnight Navy exceeds AA requirements).
* All interactive elements have minimum 44x44 tap targets.
* Screen readers announce the "Truthful Telemetry" status distinctly so visually impaired users know the confidence level of the position data.

# TrainPulse Brand Guide

## Concept
The mark is a **pulse line that is also a route**: a heartbeat trace (real-time, alive) running over a dotted rail line, ending in a glowing **live-position dot**. It reads as "live tracking" at any size and stays simple enough for a 16px favicon.

## Colors
| Role | Name | Hex |
|---|---|---|
| Primary | Pulse Cyan | `#22D3EE` (on dark) / `#0891B2` (on light) |
| Primary | Midnight Navy | `#0B1B2E` |
| Deep background | Signal Black | `#070D18` |
| Secondary | Live Amber (live train / alerts) | `#FFB020` (dark) / `#F59E0B` (light) |
| Secondary | Rail Slate (secondary text, grid) | `#64748B` |
| Neutral | Cloud | `#F1F5F9` |
| Status | On time `#22C55E` · Delayed `#F59E0B` · Disrupted `#EF4444` |

Contrast: Cyan `#22D3EE` on `#070D18` ≈ 11:1. Use `#0891B2` for text on white (≈ 3.7:1, large text/UI only; use Navy for body text).

## Files
- `trainpulse-icon.svg/.png`: square app icon (512 / 1024px, rounded corners built in)
- `trainpulse-logo-dark|light.svg/.png`: horizontal logo, mark + wordmark
- `trainpulse-wordmark-dark|light.svg/.png`: wordmark only
- `trainpulse-hero-dark|light.svg/.png/.jpg`: 1920×1080 SVG, rasterized at 3840×2160

## Usage
- **Dark backgrounds:** use the `-dark` files. **Light backgrounds:** use `-light`.
- **Clear space:** at least the height of the "T" on all sides. **Minimum size:** icon 16px, full logo 120px wide.
- Don't recolor, stretch, rotate, add shadows, or place on busy imagery.
- Amber is reserved for *live* things (the position dot, active train markers, alerts). Don't use it decoratively.
- **Hero:** keep the left ~45% for headline/CTA. Tracks sweep to the right. Overlay text should be `#F1F5F9` on dark, `#0B1B2E` on light. Use `background-size: cover; background-position: right center`.
- Fonts in the SVG logos are live text. Before print or wide distribution, open in Figma/Illustrator and **convert text to outlines** (or install Space Grotesk).
- **AI/PSD:** not produced here. The SVGs open and edit directly in Illustrator, Figma, Affinity and Inkscape, and can be saved as AI/PSD from there.

## Typography
- **Headings / wordmark:** Space Grotesk, 500 ("Train") + 700 ("Pulse"); headings 600–700.
- **UI / body:** Inter, 400 body, 500 labels, 600 buttons.
- **Data, IDs, timestamps, coordinates:** JetBrains Mono 400/500 with tabular numerals.
- Fallback stack: `'Space Grotesk','Inter','Segoe UI',Arial,sans-serif`

## Iconography
- 24px grid, **2px rounded strokes**, round caps and joins, outline style, with a single filled accent dot for "live" states.
- Corner radius 2px on shapes; app icon corner radius ≈ 22%.
- Motifs: route line, node/station ring, pulse trace, dotted rail ties. Use one amber accent per icon at most.
- Map styling: dark navy base, cyan routes, amber for the selected/live train, station nodes as hollow rings.

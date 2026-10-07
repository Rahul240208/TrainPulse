import type { NormalizedMapData } from './types';
import { CARTO_API_KEY } from '../../config/map';

/**
 * Generates an isolated, cross-platform Leaflet HTML string using OpenStreetMap / CartoDB tiles.
 * Strict adherence to Truthful Telemetry:
 * - Never invents coordinates
 * - Visually tags train marker with positionType (ACTUAL_GPS / ESTIMATED_SCHEDULE / STATION_DEPARTURE)
 * - Renders station route polyline and station halt markers when available
 * - Gracefully handles missing coordinates with honest informational indicators
 */
export function generateLeafletHtml(data: NormalizedMapData): string {
  const {
    trainNumber,
    trainName,
    speedKmH,
    delayMinutes,
    positionType,
    currentStationName,
    latitude,
    longitude,
    hasExactCoordinates,
    status,
    nextStation,
    lastUpdatedTime,
    stations,
  } = data;

  // Accuracy color mapping
  const accuracyColors: Record<string, { bg: string; border: string; label: string }> = {
    ACTUAL_GPS: { bg: '#10B981', border: '#059669', label: 'ACTUAL GPS' },
    ESTIMATED_SCHEDULE: { bg: '#F59E0B', border: '#D97706', label: 'ESTIMATED SCHEDULE' },
    STATION_DEPARTURE: { bg: '#0EA5E9', border: '#0284C7', label: 'STATION DEPARTURE' },
  };

  const accuracy = accuracyColors[positionType] || accuracyColors.ESTIMATED_SCHEDULE;

  const delayText =
    delayMinutes <= 0
      ? 'On Time'
      : delayMinutes >= 60
      ? `Late by ${Math.floor(delayMinutes / 60)}h ${delayMinutes % 60}m`
      : `Late by ${delayMinutes}m`;

  const delayClass = delayMinutes <= 0 ? 'text-ontime' : 'text-late';

  const stationsJson = JSON.stringify(stations);
  const trainLat = hasExactCoordinates && latitude !== null ? latitude : null;
  const trainLng = hasExactCoordinates && longitude !== null ? longitude : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>TrainPulse Live Map</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #070B14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
    
    /* Dark map tiles styling */
    .leaflet-container { background: #070B14; }
    .leaflet-control-attribution { background: rgba(7, 11, 20, 0.8) !important; color: #64748B !important; font-size: 9px !important; }
    .leaflet-control-attribution a { color: #38BDF8 !important; }
    .leaflet-bar { border: 1px solid #1E293B !important; box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important; }
    .leaflet-bar a { background-color: #0F172A !important; color: #F1F5F9 !important; border-bottom: 1px solid #1E293B !important; }
    .leaflet-bar a:hover { background-color: #1E293B !important; color: #38BDF8 !important; }

    /* Custom Train Marker */
    .train-marker-wrapper {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .pulse-ring {
      position: absolute;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: ${accuracy.bg};
      opacity: 0.25;
      animation: pulse 2s infinite ease-out;
    }
    @keyframes pulse {
      0% { transform: scale(0.6); opacity: 0.6; }
      100% { transform: scale(1.4); opacity: 0; }
    }
    .train-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #0F172A;
      border: 3px solid ${accuracy.bg};
      box-shadow: 0 0 12px ${accuracy.bg}80, 0 4px 8px rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2;
    }
    .train-circle svg {
      width: 14px;
      height: 14px;
      fill: #FFFFFF;
    }
    .train-callout-pill {
      margin-top: 4px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #334155;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      color: #38BDF8;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      z-index: 3;
    }
    .train-speed-tag {
      color: #94A3B8;
      font-weight: 600;
      margin-left: 2px;
    }
    .train-movement-badge {
      font-size: 8px;
      font-weight: 800;
      color: #F59E0B;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid rgba(245, 158, 11, 0.5);
      padding: 1px 5px;
      border-radius: 3px;
      margin-top: 3px;
      white-space: nowrap;
      display: none;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      letter-spacing: 0.3px;
    }

    /* Station Markers */
    .station-marker {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #475569;
      border: 2px solid #0F172A;
      box-shadow: 0 1px 4px rgba(0,0,0,0.5);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 800;
      color: #FFFFFF;
      user-select: none;
      transition: transform 0.15s ease;
    }
    .station-marker:hover {
      transform: scale(1.3);
    }
    .station-marker.origin {
      background: #10B981;
      width: 15px;
      height: 15px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    }
    .station-marker.dest {
      background: #EF4444;
      width: 15px;
      height: 15px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);
    }
    .station-marker.previous {
      background: #1E293B;
      width: 13px;
      height: 13px;
      border: 1px solid #64748B;
      color: #94A3B8;
    }
    .station-marker.current {
      background: #38BDF8;
      width: 15px;
      height: 15px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 12px #38BDF8;
      color: #0F172A;
      animation: pulse-current 2s infinite;
    }
    .station-marker.next-stop {
      background: #F59E0B;
      width: 14px;
      height: 14px;
      border: 2px solid #FFFFFF;
      box-shadow: 0 0 10px #F59E0B;
      color: #0F172A;
    }
    .station-marker.future {
      background: #0F172A;
      width: 11px;
      height: 11px;
      border: 2px solid #64748B;
      color: #64748B;
    }
    @keyframes pulse-current {
      0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(56, 189, 248, 0); }
      100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
    }

    /* Station label */
    .station-code-label {
      background: transparent;
      border: none;
      box-shadow: none;
      font-size: 9px;
      font-weight: 700;
      color: #94A3B8;
      text-shadow: 0 1px 2px #000;
    }

    /* Leaflet Popup Styling */
    .leaflet-popup-content-wrapper {
      background: #0F172A !important;
      color: #F8FAFC !important;
      border: 1px solid #334155 !important;
      border-radius: 8px !important;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6) !important;
      padding: 4px !important;
    }
    .leaflet-popup-tip {
      background: #0F172A !important;
      border: 1px solid #334155 !important;
    }
    .popup-card {
      font-size: 11px;
      line-height: 1.4;
      min-width: 170px;
    }
    .popup-title {
      font-weight: 800;
      font-size: 13px;
      color: #38BDF8;
      border-bottom: 1px solid #1E293B;
      padding-bottom: 4px;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .popup-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      color: #94A3B8;
    }
    .popup-row strong {
      color: #F1F5F9;
    }
    .text-ontime { color: #10B981 !important; font-weight: 700; }
    .text-late { color: #F87171 !important; font-weight: 700; }
    .accuracy-tag {
      display: inline-block;
      font-size: 8px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 4px;
      background: ${accuracy.bg}22;
      color: ${accuracy.bg};
      border: 1px solid ${accuracy.bg}66;
      margin-top: 4px;
    }

    /* Floating Controls */
    .floating-controls {
      position: absolute;
      right: 12px;
      bottom: 24px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      z-index: 1000;
    }
    .follow-btn {
      height: 36px;
      padding: 0 12px;
      border-radius: 8px;
      background: #0F172A;
      border: 1px solid #334155;
      color: #F8FAFC;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .follow-btn.active {
      background: #0284C7;
      border-color: #38BDF8;
      color: #FFFFFF;
      box-shadow: 0 0 12px rgba(56, 189, 248, 0.4);
    }
    .follow-btn.inactive {
      background: #0F172A;
      border-color: #334155;
      color: #94A3B8;
    }
    .follow-btn svg { width: 14px; height: 14px; fill: currentColor; }
    .map-btn {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #0F172A;
      border: 1px solid #334155;
      color: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      transition: all 0.2s ease;
    }
    .map-btn:hover {
      background: #1E293B;
      color: #38BDF8;
      border-color: #38BDF8;
    }
    .map-btn svg { width: 16px; height: 16px; fill: currentColor; }

    /* Telemetry banner if coordinates unavailable */
    .truthful-notice-banner {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      background: rgba(15, 23, 42, 0.95);
      border: 1px solid #38BDF844;
      border-radius: 6px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 1000;
      color: #94A3B8;
      font-size: 11px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.4);
    }
    .truthful-notice-banner strong {
      color: #38BDF8;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  ${
    !hasExactCoordinates
      ? `<div class="truthful-notice-banner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#38BDF8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <div>
            <strong>Truthful Telemetry:</strong> Live GPS coordinates not provided by upstream radar for Train ${trainNumber}. Displaying scheduled station route.
          </div>
        </div>`
      : ''
  }

  <div class="floating-controls">
    ${
      hasExactCoordinates
        ? `<button class="follow-btn active" id="btn-follow" title="Toggle Follow Train">
            <svg viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
            <span id="btn-follow-label">Following</span>
          </button>
          <button class="map-btn" id="btn-recenter" title="Center on Train">
            <svg viewBox="0 0 24 24"><path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/></svg>
          </button>`
        : ''
    }
    <button class="map-btn" id="btn-fit-route" title="Fit Entire Route">
      <svg viewBox="0 0 24 24"><path d="M4 4h6v2H6v4H4V4zm16 0v6h-2V6h-4V4h6zm0 16h-6v-2h4v-4h2v6zm-16 0v-6h2v4h4v2H4z"/></svg>
    </button>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
  <script>
    (function() {
      var stations = ${stationsJson};
      var trainLat = ${trainLat !== null ? trainLat : 'null'};
      var trainLng = ${trainLng !== null ? trainLng : 'null'};
      var hasTrainCoords = trainLat !== null && trainLng !== null;

      // Initialize map with fallback center (central India)
      var defaultCenter = [22.5, 78.5];
      var defaultZoom = 5;

      if (hasTrainCoords) {
        defaultCenter = [trainLat, trainLng];
        defaultZoom = 8;
      } else if (stations.length > 0) {
        defaultCenter = [stations[0].latitude, stations[0].longitude];
        defaultZoom = 7;
      }

      var map = L.map('map', {
        center: defaultCenter,
        zoom: defaultZoom,
        zoomControl: false,
        attributionControl: true
      });

      // Add CartoDB Voyager tiles with API key
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_API_KEY}', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      // Collect lat/lng bounds
      var bounds = [];

      // 1. Draw Railway Route Polylines (Differentiating completed vs remaining segments)
      if (stations.length > 1) {
        stations.forEach(function(s) {
          if (s.latitude !== null && s.longitude !== null) {
            bounds.push([s.latitude, s.longitude]);
          }
        });

        // Find split index between completed and remaining route
        var splitIdx = -1;
        for (var i = 0; i < stations.length; i++) {
          if (stations[i].stationType === 'CURRENT' || stations[i].isCurrent) {
            splitIdx = i;
            break;
          }
          if (stations[i].hasDeparted || stations[i].stationType === 'PREVIOUS') {
            splitIdx = i;
          }
        }

        var allRouteLatLngs = stations
          .filter(function(s) { return s.latitude !== null && s.longitude !== null; })
          .map(function(s) { return [s.latitude, s.longitude]; });

        // Base track layer for entire route
        L.polyline(allRouteLatLngs, {
          color: '#334155',
          weight: 4,
          opacity: 0.7,
          lineJoin: 'round'
        }).addTo(map);

        // Remaining route (dashed track)
        L.polyline(allRouteLatLngs, {
          color: '#64748B',
          weight: 2,
          dashArray: '6, 8',
          opacity: 0.8
        }).addTo(map);

        // Completed route segment (solid glowing line)
        if (splitIdx >= 0) {
          var completedLatLngs = stations.slice(0, splitIdx + 1)
            .filter(function(s) { return s.latitude !== null && s.longitude !== null; })
            .map(function(s) {
              return [s.latitude, s.longitude];
            });
          if (hasTrainCoords) {
            completedLatLngs.push([trainLat, trainLng]);
          }
          if (completedLatLngs.length > 1) {
            L.polyline(completedLatLngs, {
              color: '#0284C7',
              weight: 4,
              opacity: 0.95,
              lineJoin: 'round'
            }).addTo(map);

            L.polyline(completedLatLngs, {
              color: '#38BDF8',
              weight: 2,
              opacity: 1
            }).addTo(map);
          }
        }
      }

      // 2. Render Station Halt Markers with symbols (✓, ●, ◉, ○)
      stations.forEach(function(s, idx) {
        var isOrigin = s.stationType === 'ORIGIN' || idx === 0;
        var isDest = s.stationType === 'DESTINATION' || idx === stations.length - 1;
        var isCurrent = s.stationType === 'CURRENT' || s.isCurrent;
        var isNext = s.stationType === 'NEXT' || s.isNext || ('${nextStation?.code || ''}' === s.code);
        var isPrevious = s.stationType === 'PREVIOUS' || s.hasDeparted;

        var markerClass = 'station-marker';
        var symbol = '';

        if (isCurrent) {
          markerClass += ' current';
          symbol = '●';
        } else if (isNext) {
          markerClass += ' next-stop';
          symbol = '◉';
        } else if (isPrevious) {
          markerClass += ' previous' + (isOrigin ? ' origin' : '');
          symbol = '✓';
        } else if (isOrigin) {
          markerClass += ' origin';
          symbol = '●';
        } else if (isDest) {
          markerClass += ' dest';
          symbol = '◉';
        } else {
          markerClass += ' future';
          symbol = '○';
        }

        var stationIcon = L.divIcon({
          className: 'custom-station-icon',
          html: '<div class="' + markerClass + '" title="' + s.name + ' (' + s.code + ')">' + symbol + '</div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        var statusLabel = isCurrent
          ? 'Current Station'
          : (isNext
            ? 'Next Stop'
            : (isPrevious
              ? 'Departed'
              : (isOrigin ? 'Origin' : (isDest ? 'Destination' : 'Upcoming'))));

        var delayBadge = s.delayMinutes <= 0
          ? '<span class="text-ontime">On Time</span>'
          : '<span class="text-late">+' + s.delayMinutes + 'm late</span>';

        var popupContent = '<div class="popup-card">' +
          '<div class="popup-title">' + s.code + ' &mdash; ' + s.name + '</div>' +
          '<div class="popup-row"><span>Status:</span><strong>' + statusLabel + '</strong></div>' +
          '<div class="popup-row"><span>Arr / Dep:</span><strong>' + (s.actualArrival || s.scheduledArrival || '--:--') + ' / ' + (s.actualDeparture || s.scheduledDeparture || '--:--') + '</strong></div>' +
          '<div class="popup-row"><span>Delay:</span>' + delayBadge + '</div>' +
          (s.platform ? '<div class="popup-row"><span>Platform:</span><strong>PF ' + s.platform + '</strong></div>' : '') +
        '</div>';

        if (s.latitude !== null && s.longitude !== null) {
          var stationMarker = L.marker([s.latitude, s.longitude], { icon: stationIcon }).addTo(map);
          stationMarker.bindPopup(popupContent);
        }
      });

      // 3. Render Train Marker (Truthful GPS / Estimated Position)
      var trainMarkerInstance = null;
      if (hasTrainCoords) {
        bounds.push([trainLat, trainLng]);

        var trainIcon = L.divIcon({
          className: 'custom-train-marker',
          html: '<div class="train-marker-wrapper">' +
            '<div class="pulse-ring"></div>' +
            '<div class="train-circle">' +
              '<svg viewBox="0 0 24 24"><path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V7h12v4z"/></svg>' +
            '</div>' +
            '<div class="train-callout-pill">' +
              '${trainNumber}' +
              '<span class="train-speed-tag">${speedKmH} km/h</span>' +
            '</div>' +
            '<div class="train-movement-badge">Estimated movement</div>' +
          '</div>',
          iconSize: [60, 60],
          iconAnchor: [30, 20],
          popupAnchor: [0, -18]
        });

        var trainPopupHtml = '<div class="popup-card">' +
          '<div class="popup-title">${trainNumber} &bull; ${trainName}</div>' +
          '<div class="popup-row"><span>Location:</span><strong>${currentStationName}</strong></div>' +
          '<div class="popup-row"><span>Speed:</span><strong>${speedKmH} km/h</strong></div>' +
          '<div class="popup-row"><span>Delay:</span><strong class="${delayClass}">${delayText}</strong></div>' +
          '<div class="popup-row"><span>Next Stop:</span><strong>${nextStation?.name || (status === 'CANCELLED' ? 'Cancelled' : status === 'ARRIVED' ? 'Destination Arrived' : 'Updating')}</strong></div>' +
          '<div class="popup-row"><span>Updated:</span><strong>${lastUpdatedTime}</strong></div>' +
          '<div class="accuracy-tag">${accuracy.label}</div>' +
        '</div>';

        trainMarkerInstance = L.marker([trainLat, trainLng], {
          icon: trainIcon,
          zIndexOffset: 1000
        }).addTo(map);

        trainMarkerInstance.bindPopup(trainPopupHtml);
      }

      // Auto-fit to bounds if multiple points exist
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
      } else if (hasTrainCoords) {
        map.setView([trainLat, trainLng], 9);
      }

      // Follow Train Mode state & camera control
      var isFollowMode = hasTrainCoords;
      var btnFollow = document.getElementById('btn-follow');
      var btnFollowLabel = document.getElementById('btn-follow-label');

      function setFollowMode(active) {
        isFollowMode = active;
        if (btnFollow) {
          if (active) {
            btnFollow.className = 'follow-btn active';
            if (btnFollowLabel) btnFollowLabel.textContent = 'Following';
          } else {
            btnFollow.className = 'follow-btn inactive';
            if (btnFollowLabel) btnFollowLabel.textContent = 'Follow';
          }
        }
      }

      // Automatically pause follow mode on user manual drag/pan
      map.on('dragstart', function() {
        if (isFollowMode) {
          setFollowMode(false);
        }
      });

      // Smooth Marker Animation Engine (Milestone 15)
      var activeAnimationId = null;
      var MAX_JUMP_DEGREES = 1.0;
      var DISALLOWED_STATUSES = ['CANCELLED', 'ARRIVED', 'COMPLETED', 'DIVERTED'];

      function easeOutCubic(t) {
        var clamped = Math.min(Math.max(t, 0), 1);
        return 1 - Math.pow(1 - clamped, 3);
      }

      function shouldInterpolate(prevLatLng, targetLatLng, newData) {
        if (!prevLatLng || !targetLatLng || !newData) return false;
        if (newData.isStale === true) return false;
        var st = (newData.status || '').toUpperCase().trim();
        for (var i = 0; i < DISALLOWED_STATUSES.length; i++) {
          if (st === DISALLOWED_STATUSES[i] || st.indexOf(DISALLOWED_STATUSES[i]) !== -1) {
            return false;
          }
        }
        var pLat = typeof prevLatLng.lat === 'number' ? prevLatLng.lat : prevLatLng[0];
        var pLng = typeof prevLatLng.lng === 'number' ? prevLatLng.lng : prevLatLng[1];
        var tLat = typeof targetLatLng.lat === 'number' ? targetLatLng.lat : targetLatLng[0];
        var tLng = typeof targetLatLng.lng === 'number' ? targetLatLng.lng : targetLatLng[1];

        if (typeof pLat !== 'number' || typeof pLng !== 'number' || pLat !== pLat || pLng !== pLng) return false;
        if (typeof tLat !== 'number' || typeof tLng !== 'number' || tLat !== tLat || tLng !== tLng) return false;
        if (pLat === 0 && pLng === 0) return false;
        if (tLat === 0 && tLng === 0) return false;
        // Bounds check (5-40 N, 65-100 E)
        if (pLat < 5 || pLat > 40 || pLng < 65 || pLng > 100) return false;
        if (tLat < 5 || tLat > 40 || tLng < 65 || tLng > 100) return false;

        var dLat = Math.abs(tLat - pLat);
        var dLng = Math.abs(tLng - pLng);
        // Negligible movement: snap without animating
        if (dLat < 0.00001 && dLng < 0.00001) return false;
        // Abnormal jump guard (> 1.0 degree ~ 111 km)
        if (dLat > MAX_JUMP_DEGREES || dLng > MAX_JUMP_DEGREES) return false;

        return true;
      }

      function setMarkerMovementIndicator(marker, isMoving) {
        if (!marker) return;
        var el = marker.getElement ? marker.getElement() : null;
        if (el) {
          var badge = el.querySelector('.train-movement-badge');
          if (badge) {
            badge.style.display = isMoving ? 'inline-block' : 'none';
          }
        }
      }

      function buildPopupContent(newData, isInterpolating) {
        var delayBadge = newData.delayMinutes <= 0
          ? '<span class="text-ontime">On Time</span>'
          : '<span class="text-late">+' + newData.delayMinutes + 'm</span>';

        var accuracyLabel = isInterpolating
          ? 'ESTIMATED MOVEMENT'
          : (newData.positionType === 'ACTUAL_GPS' ? 'ACTUAL GPS' : 'ESTIMATED SCHEDULE');

        var accuracyStyle = isInterpolating
          ? 'color:#F59E0B; background:#F59E0B22; border:1px solid #F59E0B66;'
          : '';

        var movementRow = isInterpolating
          ? '<div class="popup-row"><span>Movement:</span><strong style="color:#F59E0B;">Estimated movement</strong></div>'
          : '';

        return '<div class="popup-card">' +
          '<div class="popup-title">' + newData.trainNumber + ' &bull; ' + newData.trainName + '</div>' +
          '<div class="popup-row"><span>Location:</span><strong>' + newData.currentStationName + '</strong></div>' +
          '<div class="popup-row"><span>Speed:</span><strong>' + newData.speedKmH + ' km/h</strong></div>' +
          '<div class="popup-row"><span>Delay:</span>' + delayBadge + '</div>' +
          movementRow +
          '<div class="popup-row"><span>Next Stop:</span><strong>' + (newData.nextStation ? newData.nextStation.name : 'Terminated') + '</strong></div>' +
          '<div class="popup-row"><span>Updated:</span><strong>' + newData.lastUpdatedTime + '</strong></div>' +
          '<div class="accuracy-tag" style="' + accuracyStyle + '">' + accuracyLabel + '</div>' +
        '</div>';
      }

      function smoothMoveMarker(marker, startLatLng, targetLatLng, durationMs, newData) {
        if (activeAnimationId) {
          cancelAnimationFrame(activeAnimationId);
          activeAnimationId = null;
        }

        var startTime = performance.now();
        var dLat = targetLatLng.lat - startLatLng.lat;
        var dLng = targetLatLng.lng - startLatLng.lng;

        // Visual indicator: show "Estimated movement" while animating
        setMarkerMovementIndicator(marker, true);
        marker.setPopupContent(buildPopupContent(newData, true));

        // Update callout pill with authentic provider speed (no fake animation speed)
        var markerEl = marker.getElement ? marker.getElement() : null;
        if (markerEl) {
          var speedEl = markerEl.querySelector('.train-speed-tag');
          if (speedEl) speedEl.textContent = newData.speedKmH + ' km/h';
        }

        function step(now) {
          var elapsed = now - startTime;
          var progress = Math.min(elapsed / durationMs, 1);
          var eased = easeOutCubic(progress);

          var curLat = startLatLng.lat + dLat * eased;
          var curLng = startLatLng.lng + dLng * eased;

          marker.setLatLng([curLat, curLng]);

          if (progress < 1) {
            activeAnimationId = requestAnimationFrame(step);
          } else {
            marker.setLatLng(targetLatLng);
            activeAnimationId = null;
            // Animation complete: restore authentic accuracy label and hide estimated movement indicator
            setMarkerMovementIndicator(marker, false);
            marker.setPopupContent(buildPopupContent(newData, false));
          }
        }

        activeAnimationId = requestAnimationFrame(step);
      }

      // Cross-platform telemetry update listener (Web iframe & React Native WebView)
      function handleTelemetryMessage(event) {
        var payload = event.data;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch (e) {
            return;
          }
        }
        if (!payload) return;

        if (payload.type === 'FOCUS_STATION' && payload.data && payload.data.code) {
          var targetCode = payload.data.code;
          var targetStation = stations.find(function(s) { return s.code === targetCode; });
          if (targetStation) {
            setFollowMode(false);
            map.flyTo([targetStation.latitude, targetStation.longitude], 12, { duration: 1 });
          }
          return;
        }

        if (payload.type === 'CENTER_TRAIN') {
          if (hasTrainCoords && trainMarkerInstance) {
            setFollowMode(true);
            map.flyTo([trainLat, trainLng], 10, { duration: 1 });
          } else if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
          }
          return;
        }

        if (payload.type !== 'UPDATE_TELEMETRY' || !payload.data) return;

        var newData = payload.data;
        var newLat = newData.latitude;
        var newLng = newData.longitude;

        if (newLat !== null && newLng !== null && typeof newLat === 'number' && typeof newLng === 'number') {
          var targetLatLng = L.latLng(newLat, newLng);

          if (trainMarkerInstance) {
            var currentLatLng = trainMarkerInstance.getLatLng();
            var canAnimate = shouldInterpolate(currentLatLng, targetLatLng, newData);

            if (canAnimate) {
              smoothMoveMarker(trainMarkerInstance, currentLatLng, targetLatLng, 1500, newData);
            } else {
              // Direct snap without interpolation
              if (activeAnimationId) {
                cancelAnimationFrame(activeAnimationId);
                activeAnimationId = null;
              }
              setMarkerMovementIndicator(trainMarkerInstance, false);
              trainMarkerInstance.setLatLng(targetLatLng);

              var markerEl = trainMarkerInstance.getElement ? trainMarkerInstance.getElement() : null;
              if (markerEl) {
                var speedEl = markerEl.querySelector('.train-speed-tag');
                if (speedEl) speedEl.textContent = newData.speedKmH + ' km/h';
              }

              trainMarkerInstance.setPopupContent(buildPopupContent(newData, false));
            }

            // Follow mode camera pan: keep train centered when follow is active
            if (isFollowMode) {
              map.panTo(targetLatLng, { animate: true, duration: 1.0 });
            }
          }
        }
      }

      window.addEventListener('message', handleTelemetryMessage);
      document.addEventListener('message', handleTelemetryMessage);

      // Hook up UI buttons
      if (btnFollow && hasTrainCoords) {
        btnFollow.addEventListener('click', function() {
          setFollowMode(true);
          var curPos = trainMarkerInstance ? trainMarkerInstance.getLatLng() : [trainLat, trainLng];
          map.panTo(curPos, { animate: true, duration: 0.8 });
        });
      }

      var btnRecenter = document.getElementById('btn-recenter');
      if (btnRecenter && hasTrainCoords && trainMarkerInstance) {
        btnRecenter.addEventListener('click', function() {
          setFollowMode(true);
          map.flyTo([trainLat, trainLng], 10, { duration: 1 });
          trainMarkerInstance.openPopup();
        });
      }

      var btnFitRoute = document.getElementById('btn-fit-route');
      if (btnFitRoute && bounds.length > 0) {
        btnFitRoute.addEventListener('click', function() {
          setFollowMode(false);
          if (bounds.length > 1) {
            map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
          } else if (hasTrainCoords) {
            map.setView([trainLat, trainLng], 9);
          }
        });
      }
    })();
  </script>
</body>
</html>`;
}


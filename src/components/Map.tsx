'use client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import 'leaflet.heat'; // side-effect: attaches L.heatLayer to the Leaflet global


const COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  rescuer: '#0284c7',
  fleet: '#06b6d4',
} as const;

import { calculateDistanceKm, calculateBearing } from '@/lib/geo';
import { DEFAULT_COORDS } from '@/lib/constants';
import type { FleetUnit } from '@/lib/sse';

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { animate: true, duration: 1.2 });
  }, [center, map]);
  return null;
}

interface HeatmapLayerProps {
  points: [number, number, number][];
}

interface LHeat {
  setLatLngs: (pts: [number, number, number][]) => void;
  redraw: () => void;
  remove: () => void;
  addTo: (map: L.Map) => void;
}

function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  const heatRef = useRef<LHeat | null>(null);

  useEffect(() => {
    if (!map) return;
    const heatFn = (L as unknown as { heatLayer?: (pts: [number, number, number][], opts: object) => LHeat }).heatLayer;
    if (!heatFn) {
      console.warn('[Map] leaflet.heat plugin not loaded; heatmap overlay disabled.');
      return;
    }

    if (heatRef.current) {
      heatRef.current.setLatLngs(points);
      heatRef.current.redraw();
    } else {
      heatRef.current = heatFn(points, {
        radius: 35,
        blur: 25,
        maxZoom: 17,
        max: 1.0,
        gradient: {
          0.0: '#1e40af',
          0.35: '#f59e0b',
          0.65: '#ef4444',
          1.0: '#ffffff',
        },
      });
      heatRef.current.addTo(map);
    }

    return () => {
      if (heatRef.current) {
        heatRef.current.remove();
        heatRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

interface SignalItem {
  id: string;
  location_lat: number | null;
  location_lng: number | null;
  priority_score: number;
  disaster_type: string;
  battery_level: number;
  user?: {
    name: string;
  };
}

interface MapProps {
  signals: SignalItem[];
  activeSignalId?: string | null;
  onMarkerClick?: (id: string) => void;
  rescuerPos?: [number, number] | null;
  fleet?: FleetUnit[];
}

export default function Map({ signals, activeSignalId, onMarkerClick, rescuerPos, fleet = [] }: MapProps) {
  const defaultCenter = DEFAULT_COORDS;

  let activeCenter = defaultCenter;
  let activeSignal: SignalItem | null = null;

  if (activeSignalId) {
    const s = signals.find((x) => x.id === activeSignalId);
    if (s && s.location_lat && s.location_lng) {
      activeCenter = [s.location_lat, s.location_lng];
      activeSignal = s;
    }
  } else if (rescuerPos) {
    activeCenter = rescuerPos;
  }

  // Build heatmap intensity points from live SOS signals
  const heatPoints: [number, number, number][] = signals
    .filter((s) => s.location_lat && s.location_lng)
    .map((s) => [s.location_lat!, s.location_lng!, s.priority_score / 100]);

  const createIcon = (priority: string | number, isSelected: boolean) => {
    const p = Number(priority);
    const color = p >= 60 ? COLORS.critical : p >= 35 ? COLORS.high : COLORS.medium;
    const isCritical = p >= 60;

    return L.divIcon({
      className: '',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
          ${
            isCritical || isSelected
              ? `<div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: ${color}33; border: 1.5px solid ${color}80; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
              : ''
          }
          <div style="
            background-color: ${color};
            width: ${isSelected ? '22px' : '18px'};
            height: ${isSelected ? '22px' : '18px'};
            border-radius: 50%;
            box-shadow: 0 0 ${isSelected ? '18px' : '10px'} ${color}, 0 0 20px ${color}60;
            border: 2px solid white;
            transition: all 0.2s ease-in-out;
          "></div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  const createRescuerIcon = () => {
    return L.divIcon({
      className: '',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: #0284c733; border: 1.5px solid #38bdf880; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="
            background: linear-gradient(135deg, #0284c7, #0369a1);
            width: 22px;
            height: 22px;
            border-radius: 6px;
            transform: rotate(45deg);
            box-shadow: 0 0 14px #38bdf8, 0 0 24px #0284c780;
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
          </div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  };

  const createFleetIcon = (name: string) => {
    const initials = name.slice(0, 2).toUpperCase();
    return L.divIcon({
      className: '',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background: #06b6d422; border: 1.5px solid #06b6d460; animation: ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="
            background: linear-gradient(135deg, #0891b2, #0e7490);
            width: 24px;
            height: 24px;
            border-radius: 50%;
            box-shadow: 0 0 10px #06b6d4, 0 0 18px #06b6d440;
            border: 2px solid #e0f2fe;
            display: flex; align-items: center; justify-content: center;
            font-size: 8px; font-weight: 700; color: white; font-family: monospace;
          ">${initials}</div>
          <div style="
            background: #06b6d4ee; color: white; font-size: 8px; font-weight: 600;
            padding: 1px 4px; border-radius: 3px; margin-top: 2px;
            white-space: nowrap; font-family: monospace; max-width: 60px; overflow: hidden; text-overflow: ellipsis;
          ">🚑 ${name.slice(0, 8)}</div>
        </div>
      `,
      iconSize: [60, 40],
      iconAnchor: [30, 12],
    });
  };

  // Trajectory vector coordinates
  const vectorCoords: [number, number][] | null =
    rescuerPos && activeSignal?.location_lat && activeSignal?.location_lng
      ? [rescuerPos, [activeSignal.location_lat, activeSignal.location_lng]]
      : null;

  const vectorDistance =
    vectorCoords &&
    calculateDistanceKm(vectorCoords[0][0], vectorCoords[0][1], vectorCoords[1][0], vectorCoords[1][1]);
  const vectorBearing =
    vectorCoords &&
    calculateBearing(vectorCoords[0][0], vectorCoords[0][1], vectorCoords[1][0], vectorCoords[1][1]);
  const estimatedMins = vectorDistance ? Math.max(2, Math.round((vectorDistance / 40) * 60)) : null;

  return (
    <MapContainer center={defaultCenter} zoom={12} style={{ height: '100%', width: '100%', zIndex: 10 }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
      />

      <MapUpdater center={activeCenter} />

      {/* Casualty Heatmap Overlay */}
      {heatPoints.length > 0 && <HeatmapLayer points={heatPoints} />}

      {/* Rescuer Unit Position */}
      {rescuerPos && (
        <Marker position={rescuerPos} icon={createRescuerIcon()}>
          <Popup className="text-black font-sans">
            <div className="font-semibold text-xs text-sky-800">RESCUE UNIT / COMMAND HQ</div>
            <div className="text-[11px] text-slate-600">
              Coordinates: {rescuerPos[0].toFixed(4)}, {rescuerPos[1].toFixed(4)}
            </div>
          </Popup>
        </Marker>
      )}

      {/* Fleet Unit Markers — other dispatched rescuers */}
      {fleet.map((unit) => {
        const lastSeen = new Date(unit.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return (
          <Marker
            key={unit.userId}
            position={[unit.lat, unit.lng]}
            icon={createFleetIcon(unit.name)}
          >
            <Popup className="text-black font-sans">
              <div className="font-bold text-xs text-cyan-700">🚑 {unit.name}</div>
              <div className="text-[11px] text-slate-600">
                {unit.lat.toFixed(4)}, {unit.lng.toFixed(4)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Last beacon: {lastSeen}
              </div>
            </Popup>
          </Marker>
        );
      })}


      {/* Tactical Bearing Polyline */}
      {vectorCoords && (
        <Polyline
          positions={vectorCoords}
          pathOptions={{
            color: '#38bdf8',
            weight: 3,
            dashArray: '8, 8',
            opacity: 0.85,
          }}
        >
          <Tooltip sticky direction="top" className="tactical-tooltip">
            <div className="font-mono text-[11px] bg-slate-950 text-sky-300 px-2 py-1 rounded border border-sky-500/40">
              ⚡ <strong>{vectorDistance} km</strong> ({vectorBearing}) • ~{estimatedMins} min ETA
            </div>
          </Tooltip>
        </Polyline>
      )}

      {/* Victim SOS Markers */}
      {signals.map(
        (sig) =>
          sig.location_lat &&
          sig.location_lng && (
            <Marker
              key={sig.id}
              position={[sig.location_lat, sig.location_lng]}
              icon={createIcon(sig.priority_score, sig.id === activeSignalId)}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(sig.id),
              }}
            >
              <Popup className="text-black font-sans">
                <div className="font-bold text-xs">{sig.user?.name || 'Unknown Victim'}</div>
                <div className="text-[11px] text-slate-700">
                  {sig.disaster_type} • Battery: {sig.battery_level}%
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Priority Score: {sig.priority_score}/100</div>
              </Popup>
            </Marker>
          )
      )}
    </MapContainer>
  );
}

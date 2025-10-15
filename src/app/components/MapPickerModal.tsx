"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";

type LatLng = { lat: number; lng: number };
type BasemapKey =
  | "osm"
  | "carto_voyager"
  | "carto_light"
  | "carto_dark"
  | "esri_imagery"
  | "esri_hybrid"
  | "esri_topographic";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (pos: LatLng) => void;
  defaultCenter?: LatLng;
  value?: LatLng | null;
  title?: string;
  initialBasemap?: BasemapKey; // ⬅️ เลือกค่าเริ่มต้นได้
};

declare global { interface Window { L?: any } }

const ensureLeafletLoaded = () =>
  new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("No window"));
    if (window.L) return resolve();
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    const scriptId = "leaflet-js";
    const exist = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (exist) { exist.addEventListener("load", () => resolve()); return; }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });

/** แคตาล็อก basemap */
const BASEMAPS: Record<
  BasemapKey,
  {
    label: string;
    url: string;
    options?: any;
    overlayUrl?: string;
    overlayOptions?: any;
  }
> = {
  osm: {
    label: "แผนที่ถนนมาตรฐาน (OSM)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" },
  },
  carto_voyager: {
    label: "แผนที่ถนนทั่วไป (สมัยใหม่)",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    options: { maxZoom: 20, attribution: "&copy; OpenStreetMap &copy; CARTO" },
  },
  carto_light: {
    label: "แผนที่พื้นหลังสีอ่อน",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: { maxZoom: 20, attribution: "&copy; OpenStreetMap &copy; CARTO" },
  },
  carto_dark: {
    label: "แผนที่พื้นหลังสีเข้ม",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: { maxZoom: 20, attribution: "&copy; OpenStreetMap &copy; CARTO" },
  },
  esri_imagery: {
    label: "แผนที่ภาพถ่ายดาวเทียม",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: { maxZoom: 19, attribution: "Tiles &copy; Esri" },
  },
  esri_hybrid: {
    label: "ดาวเทียม + ชื่อสถานที่",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    options: { maxZoom: 19, attribution: "Tiles &copy; Esri" },
    overlayUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    overlayOptions: { maxZoom: 19 },
  },
  esri_topographic: {
    label: "แผนที่ภูมิประเทศ (ภูเขา/ภูมิประเทศ)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    options: { maxZoom: 19, attribution: "Tiles &copy; Esri" },
  },
};

export default function MapPickerModal({
  open,
  onClose,
  onSelect,
  defaultCenter = { lat: 13.736717, lng: 100.523186 },
  value,
  title = "เลือกตำแหน่งบนแผนที่",
  initialBasemap = "carto_voyager",
}: Props) {
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const overlayLayerRef = useRef<any>(null);
  const pendingFlyRef = useRef<LatLng | null>(null);

  const [pick, setPick] = useState<LatLng | null>(null);
  const [searchText, setSearchText] = useState("");
  const [basemap, setBasemap] = useState<BasemapKey>(initialBasemap);

  const mapDivId = useMemo(() => `leaflet-map-${Math.random().toString(36).slice(2)}`, []);


  const flyTo = (lat: number, lng: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) { pendingFlyRef.current = { lat, lng }; return; }
    map.setView([lat, lng], Math.max(map.getZoom() ?? 16, 17));
    marker.setLatLng([lat, lng]);
    setPick({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
  };

  // สลับ basemap
  const applyBasemap = (key: BasemapKey) => {
    const L = window.L;
    const cfg = BASEMAPS[key];
    if (!cfg || !mapRef.current) return;

    if (baseLayerRef.current) { mapRef.current.removeLayer(baseLayerRef.current); baseLayerRef.current = null; }
    if (overlayLayerRef.current) { mapRef.current.removeLayer(overlayLayerRef.current); overlayLayerRef.current = null; }

    baseLayerRef.current = L.tileLayer(cfg.url, cfg.options).addTo(mapRef.current);
    if (cfg.overlayUrl) {
      overlayLayerRef.current = L.tileLayer(cfg.overlayUrl, cfg.overlayOptions).addTo(mapRef.current);
    }
  };

  // เปิด modal → init map
  useEffect(() => {
    let destroyed = false;
    const openMap = async () => {
      if (!open) return;
      await ensureLeafletLoaded();
      if (destroyed) return;
      const L = window.L;

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; }

      const start = value ?? defaultCenter;
      const map = L.map(mapDivId, { center: [start.lat, start.lng], zoom: 16 });
      mapRef.current = map;

      applyBasemap(basemap); // ⬅️ ใช้ basemap ปัจจุบัน

        const markerIcon = L.icon({
          iconUrl: "/push-pin.png",   // ไฟล์รูปหมุดใส่ไว้ใน public/
          iconSize: [30, 30],
          iconAnchor: [15, 30],
          popupAnchor: [1, -34],
        });
      const marker = L.marker([start.lat, start.lng], { draggable: true, icon: markerIcon }).addTo(map);
      marker.on("dragend", (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        setPick({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
      });
      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        setPick({ lat: +lat.toFixed(6), lng: +lng.toFixed(6) });
      });

      markerRef.current = marker;
      setPick({ lat: +start.lat.toFixed(6), lng: +start.lng.toFixed(6) });

      if (pendingFlyRef.current) { const { lat, lng } = pendingFlyRef.current; pendingFlyRef.current = null; flyTo(lat, lng); }
    };
    openMap();

    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markerRef.current = null;
      baseLayerRef.current = null;
      overlayLayerRef.current = null;
      pendingFlyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // เปลี่ยน basemap ระหว่างเปิด modal
  useEffect(() => {
    if (!mapRef.current) return;
    applyBasemap(basemap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basemap]);

  const geocodeSearch = async () => {
    if (!searchText.trim()) return;
    try {
      const m = searchText.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/);
      if (m) { flyTo(parseFloat(m[1]), parseFloat(m[3])); return; }
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=1`;
      const resp = await fetch(url, { headers: { "Accept-Language": "th" } });
      const data = await resp.json();
      if (data?.length) flyTo(parseFloat(data[0].lat), parseFloat(data[0].lon));
      else alert("ไม่พบสถานที่ที่ค้นหา");
    } catch { alert("ค้นหาสถานที่ไม่สำเร็จ"); }
  };

  const useGPS = () => {
    if (!("geolocation" in navigator)) { alert("อุปกรณ์ไม่รองรับการระบุตำแหน่ง"); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => flyTo(+coords.latitude.toFixed(6), +coords.longitude.toFixed(6)),
      (err) => alert(err?.message || "ดึงพิกัดไม่สำเร็จ"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-base sm:text-lg font-semibold text-zinc-900">{title}</h3>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-black text-sm bg-zinc-100 hover:bg-zinc-200">ปิด</button>
        </div>

        <div className="p-4">
          {/* Controls Row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 mb-3">
            {/* 🔽 เลือกแผนที่ */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-700">Basemap:</span>
              <select
                className="rounded-lg border text-black border-zinc-300 px-3 py-2 text-sm"
                value={basemap}
                onChange={(e) => setBasemap(e.target.value as BasemapKey)}
              >
                {Object.entries(BASEMAPS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            {/* ค้นหา / GPS */}
            <div className="flex-1 flex gap-2">
              <input
                className="w-full  text-black rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="ค้นหาสถานที่ หรือพิมพ์ 13.7367,100.5232"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && geocodeSearch()}
              />
              <button className="rounded-lg bg-violet-600 px-3 py-2 text-sm text-white hover:bg-violet-700" onClick={geocodeSearch}>
                ค้นหา
              </button>
              <button className="rounded-lg text-black bg-zinc-200 px-3 py-2 text-sm hover:bg-zinc-300" onClick={useGPS}>
                ใช้พิกัดปัจจุบัน
              </button>
            </div>
          </div>

          <div id={mapDivId} style={{ width: "100%", height: 420, borderRadius: 8, overflow: "hidden" }} />
          {/* <div className="mt-2 text-sm text-black ">พิกัดที่เลือก: <strong>{pick ? `${pick.lat}, ${pick.lng}` : "-"}</strong></div> */}
        </div>

        <div className="flex justify-end gap-2 border-t px-4 py-3">
          <button className="rounded-lg bg-zinc-200 px-4 py-2 text-sm text-black hover:bg-zinc-300" onClick={onClose}>ยกเลิก</button>
          <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-50"
            disabled={!pick} onClick={() => pick && onSelect(pick)}>
            ใช้ตำแหน่งนี้
          </button>
        </div>
      </div>
    </div>
  );
}

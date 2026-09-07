"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: any;
  }
}

const SCRIPT_ID = "google-maps-script";

export interface MapLocation {
  lat: number;
  lng: number;
  title?: string;
}

export default function GoogleMap({ lat, lng, title, height = 300 }: MapLocation & { height?: number }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapsReady, setMapsReady] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hasApiKey = !!apiKey && apiKey !== "YOUR_GOOGLE_MAPS_API_KEY";

  useEffect(() => {
    if (!hasApiKey) return;

    if (window.google?.maps) {
      setMapsReady(true);
      return;
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => setMapsReady(true));
      if (window.google?.maps) setMapsReady(true);
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => setMapsReady(true));
    document.head.appendChild(script);
  }, [apiKey, hasApiKey]);

  useEffect(() => {
    if (!mapsReady) return;
    if (!window.google?.maps) return;
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: 15,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstanceRef.current,
      title: title || "Property Location",
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    };
  }, [mapsReady, lat, lng, title]);

  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-amber-300 bg-amber-50 py-16 px-6 text-center">
        <p className="text-sm font-medium text-amber-800">Map unavailable</p>
        <p className="text-xs text-amber-700">
          Set <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in
          the dashboard&apos;s <code className="rounded bg-amber-100 px-1">.env.local</code> and restart the dev server.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {!mapsReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-gray-100 text-sm text-gray-400">
          Loading map…
        </div>
      )}
      <div
        ref={mapRef}
        style={{ height: `${height}px` }}
        className="w-full rounded-2xl border border-gray-200 bg-gray-100"
      />
    </div>
  );
}

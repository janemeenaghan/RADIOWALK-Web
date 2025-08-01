"use client";

import { useState } from "react";
import dynamic from 'next/dynamic';
import { useAudio } from "~/contexts/AudioContext";
import { useLocation } from "~/contexts/LocationContext";
import { api } from "~/trpc/react";
import { StationType } from "@prisma/client";
import { NearbyStations } from "./nearby-stations";
import { AudioStreamBar } from "./AudioStreamBar";

const MapView = dynamic(() => import('./MapView').then(mod => ({ default: mod.MapView })), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-gray-500">Loading map...</p>
    </div>
  )
});

type ViewMode = 'PUBLIC' | 'PRIVATE' | 'BOTH';

export function StationSelectionWrapper() {
  const { selectedStation, setSelectedStation } = useAudio();
  const { position } = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('PUBLIC');

  // Get public stations
  const { 
    data: publicStations, 
    isLoading: publicLoading, 
    error: publicError 
  } = api.station.findNearby.useQuery({
    latitude: position?.latitude!,
    longitude: position?.longitude!,
    type: StationType.PUBLIC,
  }, {
    enabled: (viewMode === 'PUBLIC' || viewMode === 'BOTH') && !!position,
  });

  // Get private stations
  const { 
    data: privateStations, 
    isLoading: privateLoading, 
    error: privateError 
  } = api.station.findNearby.useQuery({
    latitude: position?.latitude!,
    longitude: position?.longitude!,
    type: StationType.PRIVATE,
  }, {
    enabled: (viewMode === 'PRIVATE' || viewMode === 'BOTH') && !!position,
  });

  // Combine stations based on view mode
  const stations = (() => {
    if (viewMode === 'PUBLIC') return publicStations || [];
    if (viewMode === 'PRIVATE') return privateStations || [];
    // BOTH mode: combine and sort by distance
    const combined = [
      ...(publicStations || []),
      ...(privateStations || [])
    ];
    return combined.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  })();

  const isLoading = (() => {
    if (viewMode === 'PUBLIC') return publicLoading;
    if (viewMode === 'PRIVATE') return privateLoading;
    return publicLoading || privateLoading;
  })();

  const error = publicError || privateError;

  const handleStationSelect = (station: any) => {
    setSelectedStation(station);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Map View */}
      <MapView 
        stations={stations}
        selectedStation={selectedStation}
        onStationSelect={handleStationSelect}
      />
      
      {/* Station List */}
      <NearbyStations 
        stations={stations}
        isLoading={isLoading}
        error={error}
        selectedStation={selectedStation} 
        onStationSelect={handleStationSelect}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      
      {/* Audio Player */}
      <AudioStreamBar initialStationName="" initialUsername="" initialStreamUrl="" />
    </div>
  );
}
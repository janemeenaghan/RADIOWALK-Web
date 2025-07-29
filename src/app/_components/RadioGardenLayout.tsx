"use client";

import { useState, useCallback } from "react";
import { MapView } from "~/app/_components/MapView";
import { RadioGardenSidebar } from "~/app/_components/RadioGardenSidebar";
import { useAudio } from "~/contexts/AudioContext";

export function RadioGardenLayout() {
  const { selectedStation } = useAudio();
  const [mapStations, setMapStations] = useState<any[]>([]);

  const handleStationSelect = (station: any) => {
    // This will be handled by the sidebar's internal logic
    // The map just needs to know about the selected station via context
  };

  const handleMapStationsUpdate = useCallback((stations: any[]) => {
    setMapStations(stations);
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Full-screen satellite map */}
      <MapView 
        stations={mapStations} 
        selectedStation={selectedStation} 
        onStationSelect={handleStationSelect} 
      />
      
      {/* Radio.garden-style sidebar overlay */}
      <RadioGardenSidebar onMapStationsUpdate={handleMapStationsUpdate} />
    </div>
  );
}
"use client";

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useLocation } from '~/contexts/LocationContext';
import { useAudio } from '~/contexts/AudioContext';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  owner?: {
    id: string;
    username: string | null;
    name: string | null;
    email: string | null;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
    emailVerified: Date | null;
  } | null;
  type: 'PUBLIC' | 'PRIVATE';
  distance?: number;
}

interface MapViewProps {
  stations: Station[];
  selectedStation?: Station | null;
  onStationSelect: (station: Station) => void;
}

export function MapView({ stations, selectedStation, onStationSelect }: MapViewProps) {
  const { position } = useLocation();
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.7749, -122.4194]); // Default SF
  const [mapKey, setMapKey] = useState(0); // Force re-render when center changes

  // Update map center when user location changes
  useEffect(() => {
    if (position) {
      setMapCenter([position.latitude, position.longitude]);
    }
  }, [position]);

  // Center map on selected station
  useEffect(() => {
    if (selectedStation) {
      setMapCenter([selectedStation.latitude, selectedStation.longitude]);
      setMapKey(prev => prev + 1); // Force map to re-center
    }
  }, [selectedStation]);

  if (typeof window === 'undefined') {
    return (
      <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        key={mapKey}
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* User location marker */}
        {position && (
          <Marker position={[position.latitude, position.longitude]}>
            <Popup>
              <div className="p-2">
                <div className="font-semibold text-blue-600">📍 Your Location</div>
                <div className="text-sm text-gray-600">
                  {position.latitude.toFixed(4)}, {position.longitude.toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Station markers */}
        {stations.map((station) => (
          <Marker
            key={station.id}
            position={[station.latitude, station.longitude]}
            eventHandlers={{
              click: () => onStationSelect(station),
            }}
          >
            <Popup>
              <div className="p-3 min-w-[200px]">
                {/* Station bubble with shadcn-style design */}
                <div className={`rounded-lg p-3 border-2 cursor-pointer transition-all hover:shadow-md ${
                  selectedStation?.id === station.id 
                    ? 'border-green-500 bg-green-50' 
                    : station.type === 'PRIVATE' 
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-blue-300 bg-blue-50'
                }`}>
                  <div className="font-semibold text-gray-900 mb-1">
                    {station.name}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    by {station.owner?.username || station.owner?.name || 'Unknown'}
                  </div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    station.type === 'PRIVATE' 
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {station.type === 'PRIVATE' ? '🔒 Private' : '🌐 Public'}
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
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

// Custom marker icons - Green dots based on likes, white when selected
const createStationIcon = (likes: number, isSelected: boolean = false) => {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  
  // Determine size based on likes: 0-20 (small), 21-1000 (medium), 1001+ (large)
  let size: number;
  if (likes >= 1001) {
    size = 16; // Large
  } else if (likes >= 21) {
    size = 12; // Medium
  } else {
    size = 8; // Small
  }
  
  // Selected stations are white, unselected are green
  const fillColor = isSelected ? '#ffffff' : '#22c55e';
  const strokeColor = '#ffffff';
  
  const dotSvg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="1"/>
    </svg>
  `;
  
  return new L.DivIcon({
    html: dotSvg,
    className: 'custom-station-marker',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, 0]
  });
};

const createUserIcon = () => {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  
  // White ring circle for user location
  const ringSize = 24;
  const ringSvg = `
    <svg width="${ringSize}" height="${ringSize}" viewBox="0 0 ${ringSize} ${ringSize}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${(ringSize/2) - 2}" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.9"/>
    </svg>
  `;
  
  return new L.DivIcon({
    html: ringSvg,
    className: 'custom-user-marker',
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize/2, ringSize/2],
    popupAnchor: [0, 0]
  });
};

interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  owner?: {
    id: string;
    username?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
    emailVerified?: Date | null;
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
  const [userIcon, setUserIcon] = useState<any>(null);

  // Initialize user icon on client side
  useEffect(() => {
    setUserIcon(createUserIcon());
  }, []);

  // Update map center when user location changes
  useEffect(() => {
    if (position) {
      setMapCenter([position.latitude, position.longitude]);
      setMapKey(prev => prev + 1); // Force map to re-center on user location
    }
  }, [position]);

  // Center map on selected station
  useEffect(() => {
    if (selectedStation) {
      setMapCenter([selectedStation.latitude, selectedStation.longitude]);
      setMapKey(prev => prev + 1); // Force map to re-center
    }
  }, [selectedStation]);

  return (
    <div className="fixed inset-0 w-full h-full">
      <MapContainer
        key={mapKey}
        center={mapCenter}
        zoom={13}
        style={{ height: '100vh', width: '100vw' }}
        className="z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        
        {/* User location marker */}
        {position && (
          <Marker 
            position={[position.latitude, position.longitude]}
            icon={userIcon}
          >
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
        {stations.map((station) => {
          const isSelected = selectedStation?.id === station.id;
          return (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={createStationIcon(station.likes || 0, isSelected)}
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
          );
        })}
      </MapContainer>
    </div>
  );
}
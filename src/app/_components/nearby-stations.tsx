"use client";

import { useState } from "react";
import { useLocation } from "~/contexts/LocationContext";

type ViewMode = 'PUBLIC' | 'PRIVATE' | 'BOTH';

interface NearbyStationsProps {
  stations: any[];
  isLoading: boolean;
  error: any;
  selectedStation: any | null;
  onStationSelect: (station: any) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function NearbyStations({ stations, isLoading, error, selectedStation, onStationSelect, viewMode, onViewModeChange }: NearbyStationsProps) {
  // Get real-time user location for display
  const { position, error: locationError, isLoading: locationLoading } = useLocation();

  // Data is now passed as props from parent

  // Handle station selection (Spotify-style)
  const handleStationSelect = (station: any) => {
    onStationSelect(station);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold text-white mb-2">
        Nearby Stations (5km radius)
      </h2>
      
      {/* Location status */}
      <div className="mb-4 text-sm text-white/70">
        {locationLoading && "📍 Getting your location..."}
        {locationError && `⚠️ Location error: ${locationError} (using default location)`}
        {position && !locationLoading && (
          `📍 Location: ${position.latitude.toFixed(4)}, ${position.longitude.toFixed(4)}`
        )}
      </div>
      
      {/* Simple toggle for station type */}
      <div className="mb-6 bg-white/10 p-4 rounded-lg">
        <label className="block text-white mb-2 font-semibold">Show stations:</label>
        <div className="flex gap-4">
          <label className="flex items-center text-white">
            <input
              type="radio"
              name="viewMode"
              checked={viewMode === 'PUBLIC'}
              onChange={() => onViewModeChange('PUBLIC')}
              className="mr-2"
            />
            Public only
          </label>
          <label className="flex items-center text-white">
            <input
              type="radio"
              name="viewMode"
              checked={viewMode === 'PRIVATE'}
              onChange={() => onViewModeChange('PRIVATE')}
              className="mr-2"
            />
            Private only
          </label>
          <label className="flex items-center text-white">
            <input
              type="radio"
              name="viewMode"
              checked={viewMode === 'BOTH'}
              onChange={() => onViewModeChange('BOTH')}
              className="mr-2"
            />
            Both
          </label>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-white text-center py-8">
          Loading nearby stations...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-red-300 bg-red-900/20 p-4 rounded-lg">
          Error: {error.message}
        </div>
      )}

      {/* Stations list */}
      {stations && (
        <div>
          <p className="text-white mb-4">
            Found {stations.length} stations nearby
          </p>
          
          {stations.length === 0 ? (
            <div className="text-gray-300 text-center py-8 bg-white/5 rounded-lg">
              No stations found within 5km
            </div>
          ) : (
            <div className="space-y-4">
              {stations.map((station) => {
                const isSelected = selectedStation?.id === station.id;
                return (
                  <div
                    key={station.id}
                    onClick={() => handleStationSelect(station)}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-purple-600/20 border-l-purple-400 text-purple-100'
                        : 'bg-white/10 border-l-blue-400 text-white hover:bg-white/15'
                    }`}
                  >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`text-lg font-semibold ${
                      isSelected ? 'text-purple-100' : 'text-white'
                    }`}>
                      {station.name}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      station.type === 'PUBLIC' 
                        ? 'bg-green-600 text-green-100' 
                        : 'bg-purple-600 text-purple-100'
                    }`}>
                      {station.type}
                    </span>
                  </div>
                  
                  <div className={`space-y-1 ${
                    isSelected ? 'text-purple-200' : 'text-gray-300'
                  }`}>
                    <p>📍 Distance: {station.distance?.toFixed(1)}km away</p>
                    {station.streamName && (
                      <p>📻 Stream: {station.streamName}</p>
                    )}
                    {station.tags && (
                      <p>🏷️ Tags: {station.tags}</p>
                    )}
                    <p>👤 Owner: {station.owner?.username || 'Unknown'}</p>
                    <p>❤️ Likes: {station.likes}</p>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
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
  hideControls?: boolean;
}

export function NearbyStations({ stations, isLoading, error, selectedStation, onStationSelect, viewMode, onViewModeChange, hideControls = false }: NearbyStationsProps) {
  // Get real-time user location for display
  const { position, error: locationError, isLoading: locationLoading } = useLocation();

  // Data is now passed as props from parent

  // Handle station selection (Spotify-style)
  const handleStationSelect = (station: any) => {
    onStationSelect(station);
  };

  return (
    <div className={hideControls ? "w-full" : "w-full max-w-2xl mx-auto p-4"}>
      {!hideControls && (
        <>
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
        </>
      )}
      
      {/* Location status for sidebar */}
      {hideControls && (
        <div className="mb-3 text-xs text-gray-500">
          {locationLoading && "📍 Getting location..."}
          {locationError && "⚠️ Using default location"}
          {position && !locationLoading && (
            `📍 ${position.latitude.toFixed(2)}, ${position.longitude.toFixed(2)}`
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className={`text-center py-8 ${hideControls ? 'text-gray-500' : 'text-white'}`}>
          Loading nearby stations...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className={`p-4 rounded-lg ${
          hideControls 
            ? 'text-red-600 bg-red-50 border border-red-200' 
            : 'text-red-300 bg-red-900/20'
        }`}>
          Error: {error.message}
        </div>
      )}

      {/* Stations list */}
      {stations && (
        <div>
          {!hideControls && (
            <p className="text-white mb-4">
              Found {stations.length} stations nearby
            </p>
          )}
          
          {stations.length === 0 ? (
            <div className={`text-center py-8 rounded-lg ${
              hideControls 
                ? 'text-gray-500 bg-gray-50' 
                : 'text-gray-300 bg-white/5'
            }`}>
              No stations found within 5km
            </div>
          ) : (
            <div className={hideControls ? "space-y-2" : "space-y-4"}>
              {stations.map((station) => {
                const isSelected = selectedStation?.id === station.id;
                return (
                  <div
                    key={station.id}
                    onClick={() => handleStationSelect(station)}
                    className={`${hideControls ? 'p-3' : 'p-4'} rounded-lg cursor-pointer transition-colors ${
                      hideControls
                        ? isSelected
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-white border border-gray-200 hover:bg-gray-50'
                        : isSelected
                          ? 'bg-purple-600/20 border-l-4 border-l-purple-400 text-purple-100'
                          : 'bg-white/10 border-l-4 border-l-blue-400 text-white hover:bg-white/15'
                    }`}
                  >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className={`${hideControls ? 'text-sm' : 'text-lg'} font-semibold ${
                      hideControls 
                        ? isSelected ? 'text-green-800' : 'text-gray-900'
                        : isSelected ? 'text-purple-100' : 'text-white'
                    }`}>
                      {station.name}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      station.type === 'PUBLIC' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {station.type}
                    </span>
                  </div>
                  
                  <div className={`${hideControls ? 'space-y-0' : 'space-y-1'} ${
                    hideControls 
                      ? isSelected ? 'text-green-700' : 'text-gray-600'
                      : isSelected ? 'text-purple-200' : 'text-gray-300'
                  }`}>
                    <p className={hideControls ? 'text-xs' : ''}>
                      📍 {station.distance?.toFixed(1)}km away
                    </p>
                    {!hideControls && station.streamName && (
                      <p>📻 Stream: {station.streamName}</p>
                    )}
                    {!hideControls && station.tags && (
                      <p>🏷️ Tags: {station.tags}</p>
                    )}
                    <p className={hideControls ? 'text-xs' : ''}>
                      👤 {station.owner?.username || 'Unknown'}
                    </p>
                    {!hideControls && <p>❤️ Likes: {station.likes}</p>}
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
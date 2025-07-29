"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface LocationContextType {
  position: Position | null;
  error: string | null;
  isLoading: boolean;
  hasPermission: boolean;
  requestLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

interface LocationProviderProps {
  children: ReactNode;
}

export function LocationProvider({ children }: LocationProviderProps) {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Default fallback location (San Francisco) - same as current mock
  const defaultLocation: Position = {
    latitude: 37.7749,
    longitude: -122.4194
  };

  const handleSuccess = (position: GeolocationPosition) => {
    const newPosition: Position = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy
    };
    
    setPosition(newPosition);
    setError(null);
    setIsLoading(false);
    setHasPermission(true);
  };

  const handleError = (error: GeolocationPositionError) => {
    let errorMessage = 'Unknown location error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location access denied by user';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out';
        break;
    }
    
    setError(errorMessage);
    setIsLoading(false);
    setHasPermission(false);
    
    // Fallback to default location on error
    setPosition(defaultLocation);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setPosition(defaultLocation);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Cache for 1 minute
    });

    // Set up continuous tracking
    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: false, // Less battery intensive for continuous tracking
        timeout: 15000,
        maximumAge: 300000 // Cache for 5 minutes during continuous tracking
      }
    );

    setWatchId(id);
  };

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Auto-request location on mount (with fallback)
  useEffect(() => {
    // Always start with default location, then try to get real location
    setPosition(defaultLocation);
    requestLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        position,
        error,
        isLoading,
        hasPermission,
        requestLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
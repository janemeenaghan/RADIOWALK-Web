"use client";

import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface Station {
  id: string;
  name: string;
  streamLink?: string;
  owner?: {
    username?: string;
    name?: string;
  };
}

interface AudioContextType {
  selectedStation: Station | null;
  setSelectedStation: (station: Station | null) => void;
  updateSelectedStation: (name: string, username: string, streamUrl: string) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  const updateSelectedStation = (name: string, username: string, streamUrl: string) => {
    setSelectedStation({
      id: 'current', // temporary ID for the current playing station
      name,
      streamLink: streamUrl,
      owner: {
        username,
        name: username,
      },
    });
  };

  return (
    <AudioContext.Provider
      value={{
        selectedStation,
        setSelectedStation,
        updateSelectedStation,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
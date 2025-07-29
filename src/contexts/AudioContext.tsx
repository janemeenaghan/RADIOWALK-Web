"use client";

import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: 'PUBLIC' | 'PRIVATE';
  streamLink?: string | null;
  streamName?: string | null;
  tags?: string | null;
  favicon?: string | null;
  likes: number;
  ownerId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  distance?: number;
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
  sharedUsers?: Array<{
    id: string;
    username?: string | null;
    name?: string | null;
  }>;
}

interface AudioContextType {
  selectedStation: Station | null;
  setSelectedStation: (station: Station | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);


  return (
    <AudioContext.Provider
      value={{
        selectedStation,
        setSelectedStation,
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
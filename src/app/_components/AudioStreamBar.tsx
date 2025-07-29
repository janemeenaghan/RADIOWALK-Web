"use client";

import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Slider } from "~/components/ui/slider";
import { useRef, useState, useEffect } from "react";
import { useAudio } from "~/contexts/AudioContext";

interface AudioStreamBarProps {
  initialStationName?: string;
  initialUsername?: string;
  initialStreamUrl?: string;
}

export function AudioStreamBar({ initialStationName = "", initialUsername = "", initialStreamUrl = "" }: AudioStreamBarProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stationName, setStationName] = useState<string>(initialStationName);
  const [username, setUsername] = useState<string>(initialUsername);
  const [streamUrl, setStreamUrl] = useState<string>(initialStreamUrl);
  const [volume, setVolume] = useState<number>(50); // Volume as percentage (0-100)
  
  const { selectedStation } = useAudio();

  // Update state when selectedStation changes and auto-play new stream
  useEffect(() => {
    if (selectedStation) {
      const newStationName = selectedStation.name;
      const newUsername = selectedStation.owner?.username || "";
      const newStreamUrl = selectedStation.streamLink || "";
      
      // Check if this is actually a different station
      const isDifferentStation = newStationName !== stationName || newStreamUrl !== streamUrl;
      
      setStationName(newStationName);
      setUsername(newUsername);
      setStreamUrl(newStreamUrl);
      
      // Auto-play the new stream if it's different and we have a valid URL
      if (isDifferentStation && newStreamUrl && audioRef.current) {
        // Stop current audio if playing
        if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
        
        // Load and play new stream
        audioRef.current.src = newStreamUrl;
        audioRef.current.load();
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.error("Failed to auto-play new station:", error);
            setIsPlaying(false);
          });
      }
    }
  }, [selectedStation, stationName, streamUrl, isPlaying]);

  // Initialize audio volume when component mounts
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handlePlayPause = () => {
    // If there's no valid stream URL, force pause state
    if (!streamUrl || streamUrl.length === 0) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (!isPlaying) {
      // Always reload the stream to get the current live audio
      if (audioRef.current) {
        audioRef.current.src = streamUrl;
        audioRef.current.load(); // Explicitly load the new source
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.error("Failed to play audio:", error);
          });
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    }
  };

  const handleStationChange = (newStationName: string, newUsername: string, newStreamUrl: string) => {
    // If the station is the same, do nothing
    if (newStationName === stationName && newUsername === username && newStreamUrl === streamUrl) {
      return;
    }
    // If the station is different, update the station name
    if (newStationName !== stationName) {
      setStationName(newStationName);
    }
    // If the username is different, update the username
    if (newUsername !== username) {
      setUsername(newUsername);
    }

    // If the stream url is different, update the stream url
    if (newStreamUrl !== streamUrl) {
      setStreamUrl(newStreamUrl);
      if (!audioRef.current) {
        console.warn("Audio element not ready, station info updated but playback unavailable");
        return;
      }
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      handleUpdateStream(newStreamUrl);
    }    
  };
  
  const handleUpdateStream = (newStreamUrl: string) => {
    if (audioRef.current) {
      // If the stream url is empty, pause the audio and set the playing state to false
      if (!newStreamUrl || newStreamUrl.length === 0) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      }
      else{
        audioRef.current.src = newStreamUrl;
        audioRef.current.load();
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch((error) => {
            console.error("Failed to play audio:", error);
            setIsPlaying(false);  // Set to false if play fails
          });
      }
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const volumeValue = newVolume[0] ?? 50; // Slider returns array, we want first value with fallback
    setVolume(volumeValue);
    
    // Update audio element volume (expects 0-1, we store 0-100)
    if (audioRef.current) {
      audioRef.current.volume = volumeValue / 100;
    }
  };

  return (
    <Card className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg flex items-center gap-4 p-4 shadow-lg z-50">
      <div className="flex flex-col flex-1">
        <span className="text-lg font-bold text-green-600">{stationName}</span>
        <span className="text-sm text-muted-foreground">{username}</span>
      </div>
      <Button onClick={handlePlayPause} variant="outline" size="sm" aria-label={isPlaying ? "Pause" : "Play"}>
        {isPlaying ? (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        ) : (
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21 5,3"/></svg>
        )}
      </Button>
      
      {/* Volume Control */}
      <div className="flex items-center gap-2 min-w-[100px]">
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" className="text-muted-foreground">
          <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/>
          <path d="M19.07 4.93A10 10 0 0 1 19.07 19.07M15.54 8.46A5 5 0 0 1 15.54 15.54"/>
        </svg>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => handleVolumeChange([parseInt(e.target.value)])}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <Avatar className="ml-2">
        <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
      </Avatar>
      <audio ref={audioRef} style={{ display: "none" }} />
    </Card>
  );
}

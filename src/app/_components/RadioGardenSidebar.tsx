"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { useLocation } from "~/contexts/LocationContext";
import { useAudio } from "~/contexts/AudioContext";
import { api } from "~/trpc/react";
import { StationType } from "@prisma/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "~/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { NearbyStations } from "./nearby-stations";
import { AudioStreamBar } from "./AudioStreamBar";

type ViewMode = 'PUBLIC' | 'PRIVATE' | 'BOTH';
type NavigationMode = 'nearby' | 'browse';
type SortMode = "votes" | "name";

interface RadioGardenSidebarProps {
  className?: string;
  onMapStationsUpdate?: (stations: any[]) => void;
}

export function RadioGardenSidebar({ className = "", onMapStationsUpdate }: RadioGardenSidebarProps) {
  const router = useRouter();
  const { selectedStation, setSelectedStation } = useAudio();
  const { position } = useLocation();
  
  // Navigation state
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('nearby');
  const [viewMode, setViewMode] = useState<ViewMode>('PUBLIC');
  
  // Browse stations state
  const [currentPage, setCurrentPage] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("votes");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");
  
  // Modal state for station creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRadioStation, setSelectedRadioStation] = useState<any>(null);
  const [stationName, setStationName] = useState("");
  const [stationType, setStationType] = useState<StationType>(StationType.PUBLIC);
  const [isCreating, setIsCreating] = useState(false);

  const RESULTS_PER_PAGE = 20;

  // Get nearby stations
  const { 
    data: publicStations, 
    isLoading: publicLoading, 
    error: publicError 
  } = api.station.findNearby.useQuery({
    latitude: position?.latitude!,
    longitude: position?.longitude!,
    type: StationType.PUBLIC,
  }, {
    enabled: (viewMode === 'PUBLIC' || viewMode === 'BOTH') && !!position && navigationMode === 'nearby',
  });

  const { 
    data: privateStations, 
    isLoading: privateLoading, 
    error: privateError 
  } = api.station.findNearby.useQuery({
    latitude: position?.latitude!,
    longitude: position?.longitude!,
    type: StationType.PRIVATE,
  }, {
    enabled: (viewMode === 'PRIVATE' || viewMode === 'BOTH') && !!position && navigationMode === 'nearby',
  });

  // Browse stations queries
  const queryParams = {
    limit: RESULTS_PER_PAGE,
    offset: currentPage * RESULTS_PER_PAGE,
    order: sortMode,
    reverse: sortOrder === "desc",
  };

  const { data: browseStations, isLoading: browseLoading, error: browseError } = api.radio.getAllStations.useQuery(
    queryParams,
    {
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: !searchTerm && navigationMode === 'browse',
    }
  );

  const { data: searchResults, isLoading: isSearching, error: searchError } = api.radio.smartSearch.useQuery(
    {
      searchTerm,
      limit: RESULTS_PER_PAGE,
      offset: currentPage * RESULTS_PER_PAGE,
      order: sortMode,
      reverse: sortOrder === "desc",
    },
    {
      enabled: searchTerm.length > 0 && navigationMode === 'browse',
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Station creation mutation
  const createStationMutation = api.station.create.useMutation({
    onSuccess: () => {
      setShowCreateModal(false);
      setStationName("");
      setStationType(StationType.PUBLIC);
      setSelectedRadioStation(null);
      setIsCreating(false);
      setNavigationMode('nearby');
    },
    onError: (error) => {
      console.error("Failed to create station:", error);
      setIsCreating(false);
    },
  });

  // Combine stations based on view mode for nearby
  const nearbyStations = useMemo(() => {
    if (viewMode === 'PUBLIC') return publicStations || [];
    if (viewMode === 'PRIVATE') return privateStations || [];
    const combined = [
      ...(publicStations || []),
      ...(privateStations || [])
    ];
    return combined.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [viewMode, publicStations, privateStations]);

  const nearbyLoading = (() => {
    if (viewMode === 'PUBLIC') return publicLoading;
    if (viewMode === 'PRIVATE') return privateLoading;
    return publicLoading || privateLoading;
  })();

  const nearbyError = publicError || privateError;

  // Update map with nearby stations when they change
  useEffect(() => {
    if (navigationMode === 'nearby' && onMapStationsUpdate) {
      onMapStationsUpdate(nearbyStations);
    }
  }, [nearbyStations, navigationMode, onMapStationsUpdate]);

  // Use search results if searching, otherwise use regular browse stations
  const currentBrowseStations = searchTerm ? searchResults : browseStations;
  const browseIsLoading = searchTerm ? isSearching : browseLoading;
  const browseTotalError = searchTerm ? searchError : browseError;

  const handleStationSelect = (station: any) => {
    if (navigationMode === 'nearby') {
      setSelectedStation(station);
    } else {
      console.log("Selected station for creation:", station);
      setSelectedRadioStation(station);
      setStationName(station.name || "");
      setShowCreateModal(true);
    }
  };

  const handleCreateStation = () => {
    if (!stationName.trim() || !selectedRadioStation || !position) {
      return;
    }

    setIsCreating(true);
    
    createStationMutation.mutate({
      name: stationName.trim(),
      latitude: position.latitude,
      longitude: position.longitude,
      type: stationType,
      streamLink: selectedRadioStation.url_resolved || selectedRadioStation.url,
      streamName: selectedRadioStation.name,
      favicon: selectedRadioStation.favicon,
      tags: selectedRadioStation.tags,
      likes: selectedRadioStation.votes || 0,
    });
  };

  // Browse station handlers
  const handleSortChange = (newSortMode: SortMode) => {
    if (newSortMode === sortMode) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortMode(newSortMode);
      setSortOrder("desc");
    }
    setCurrentPage(0);
  };

  const handlePageChange = (direction: "next" | "prev") => {
    if (direction === "next") {
      setCurrentPage(prev => prev + 1);
    } else if (direction === "prev" && currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleSearch = () => {
    setSearchTerm(inputValue.trim());
    setCurrentPage(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={`fixed left-0 top-0 h-screen w-1/4 bg-white/95 backdrop-blur-sm shadow-2xl z-50 flex flex-col ${className}`}>
      
      {/* Navigation Bar - 1/6 height */}
      <div className="h-20 border-b border-gray-200 bg-white/98 flex items-center justify-around px-2">
        <button
          onClick={() => { setNavigationMode('nearby'); setViewMode('PUBLIC'); }}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
            navigationMode === 'nearby' && viewMode === 'PUBLIC' 
              ? 'bg-green-100 text-green-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-lg mb-1">◎</span>
          <span className="text-xs font-medium">Public</span>
        </button>

        <button
          onClick={() => { setNavigationMode('nearby'); setViewMode('PRIVATE'); }}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
            navigationMode === 'nearby' && viewMode === 'PRIVATE' 
              ? 'bg-green-100 text-green-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-lg mb-1">●</span>
          <span className="text-xs font-medium">Private</span>
        </button>

        <button
          onClick={() => { setNavigationMode('nearby'); setViewMode('BOTH'); }}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
            navigationMode === 'nearby' && viewMode === 'BOTH' 
              ? 'bg-green-100 text-green-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <span className="text-lg mb-1">◉</span>
          <span className="text-xs font-medium">Both</span>
        </button>

        <button
          onClick={() => setNavigationMode('browse')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors ${
            navigationMode === 'browse' 
              ? 'bg-green-100 text-green-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Plus className="h-5 w-5 mb-1" />
          <span className="text-xs font-medium">Add Station</span>
        </button>
      </div>

      {/* Main Content Area - 2/3 height */}
      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {navigationMode === 'nearby' ? (
          <div className="h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Nearby Stations
            </h2>
            <div className="flex-1 overflow-auto">
              <NearbyStations 
                stations={nearbyStations}
                isLoading={nearbyLoading}
                error={nearbyError}
                selectedStation={selectedStation} 
                onStationSelect={handleStationSelect}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                hideControls={true}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Browse Global Stations
            </h2>
            
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search radio stations..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {searchTerm && (
                <p className="text-xs text-gray-500 mt-1">
                  "{searchTerm}" • {currentBrowseStations?.length || 0} results
                </p>
              )}
            </div>
            
            {/* Sort Controls */}
            <div className="flex gap-2 mb-4">
              <Button
                variant={sortMode === "votes" ? "outline" : "secondary"}
                onClick={() => handleSortChange("votes")}
                className="flex items-center gap-1 text-xs"
                size="sm"
              >
                Popular
                {sortMode === "votes" && (
                  sortOrder === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                )}
              </Button>
              
              <Button
                variant={sortMode === "name" ? "outline" : "secondary"}
                onClick={() => handleSortChange("name")}
                className="flex items-center gap-1 text-xs"
                size="sm"
              >
                Name
                {sortMode === "name" && (
                  sortOrder === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Station List */}
            <div className="flex-1 overflow-auto">
              {browseIsLoading ? (
                <p className="text-gray-500 text-sm">Loading stations...</p>
              ) : browseTotalError ? (
                <p className="text-red-500 text-sm">Error: {browseTotalError.message}</p>
              ) : (
                <div className="space-y-2">
                  {currentBrowseStations?.map((station: any, index: number) => (
                    <div 
                      key={station.stationuuid || index}
                      className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => handleStationSelect(station)}
                    >
                      <div className="font-medium text-sm text-gray-900 truncate">
                        {station.name || "Unknown Station"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {station.country} • {station.votes || 0} votes
                      </div>
                      {station.tags && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {station.tags}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => handlePageChange("prev")}
                disabled={currentPage === 0}
                size="sm"
                className="text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              
              <span className="text-xs text-gray-500">
                Page {currentPage + 1}
              </span>
              
              <Button
                variant="outline"
                onClick={() => handlePageChange("next")}
                disabled={!currentBrowseStations || currentBrowseStations.length < RESULTS_PER_PAGE}
                size="sm"
                className="text-xs"
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>


      {/* Audio Stream Bar - 1/6 height */}
      <div className="h-20 border-t border-gray-200 bg-white">
        <AudioStreamBar 
          initialStationName="" 
          initialUsername="" 
          initialStreamUrl="" 
        />
      </div>

      {/* Create Station Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Create Station</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Station Name
              </label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Enter station name"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Station Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value={StationType.PUBLIC}
                    checked={stationType === StationType.PUBLIC}
                    onChange={(e) => setStationType(e.target.value as StationType)}
                    className="mr-2"
                  />
                  Public
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value={StationType.PRIVATE}
                    checked={stationType === StationType.PRIVATE}
                    onChange={(e) => setStationType(e.target.value as StationType)}
                    className="mr-2"
                  />
                  Private
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowCreateModal(false)}
                variant="outline"
                className="flex-1"
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateStation}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={isCreating || !stationName.trim()}
              >
                {isCreating ? "Creating..." : "Create Station"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
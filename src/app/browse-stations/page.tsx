"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { useLocation } from "~/contexts/LocationContext";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "~/components/ui/table";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { api } from "~/trpc/react";
import { StationType } from "@prisma/client";

type SortMode = "votes" | "name";

export default function BrowseStationsPage() {
  const router = useRouter();
  const { position } = useLocation();
  const [currentPage, setCurrentPage] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("votes");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [inputValue, setInputValue] = useState("");
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRadioStation, setSelectedRadioStation] = useState<any>(null);
  const [stationName, setStationName] = useState("");
  const [stationType, setStationType] = useState<StationType>(StationType.PUBLIC);
  const [isCreating, setIsCreating] = useState(false);
  
  const RESULTS_PER_PAGE = 20;

  // Query stations based on sort mode
  const queryParams = {
    limit: RESULTS_PER_PAGE,
    offset: currentPage * RESULTS_PER_PAGE,
    order: sortMode,
    reverse: sortOrder === "desc",
  };
  
  console.log("Query params:", queryParams);
  
  const { data: stations, isLoading, error } = api.radio.getAllStations.useQuery(
    queryParams,
    {
      // Add query options for better error handling
      retry: 1,
      refetchOnWindowFocus: false,
      enabled: !searchTerm, // Only run when not searching
    }
  );

  // Search query for when user is searching
  const { data: searchResults, isLoading: isSearching, error: searchError } = api.radio.smartSearch.useQuery(
    {
      searchTerm,
      limit: RESULTS_PER_PAGE,
      offset: currentPage * RESULTS_PER_PAGE,
      order: sortMode,
      reverse: sortOrder === "desc",
    },
    {
      enabled: searchTerm.length > 0, // Only run when there's a search term
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );

  // Use search results if searching, otherwise use regular stations
  const currentStations = searchTerm ? searchResults : stations;
  const currentIsLoading = searchTerm ? isSearching : isLoading;
  const currentError = searchTerm ? searchError : error;

  // Station creation mutation
  const createStationMutation = api.station.create.useMutation({
    onSuccess: () => {
      setShowCreateModal(false);
      setStationName("");
      setStationType(StationType.PUBLIC);
      setSelectedRadioStation(null);
      setIsCreating(false);
      router.push("/");
    },
    onError: (error) => {
      console.error("Failed to create station:", error);
      setIsCreating(false);
    },
  });

  const handleSortChange = (newSortMode: SortMode) => {
    if (newSortMode === sortMode) {
      // Same column, toggle order
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      // New column, default to desc for both votes and name  
      setSortMode(newSortMode);
      setSortOrder("desc");
    }
    setCurrentPage(0); // Reset to first page
  };

  const handlePageChange = (direction: "next" | "prev") => {
    console.log("Page change:", direction, "current page:", currentPage);
    if (direction === "next") {
      setCurrentPage(prev => {
        const newPage = prev + 1;
        console.log("Setting page to:", newPage);
        return newPage;
      });
    } else if (direction === "prev" && currentPage > 0) {
      setCurrentPage(prev => {
        const newPage = prev - 1;
        console.log("Setting page to:", newPage);
        return newPage;
      });
    }
  };

  const handleSearch = () => {
    setSearchTerm(inputValue.trim());
    setCurrentPage(0); // Reset to first page when searching
    console.log("Searching for:", inputValue.trim());
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleStationSelect = (station: any) => {
    console.log("Selected station:", station);
    setSelectedRadioStation(station);
    setStationName(station.name || "");
    setShowCreateModal(true);
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

  if (currentIsLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Browse Radio Stations</h1>
        <p>Loading stations...</p>
      </div>
    );
  }

  if (currentError) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Browse Radio Stations</h1>
        <p className="text-red-500">Error loading stations: {currentError.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Browse Radio Stations</h1>
      
      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search radio stations by name or tags..."
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchTerm && (
          <p className="text-sm text-gray-500 mt-1">
            Searching for: "{searchTerm}" {currentStations?.length || 0} results
          </p>
        )}
      </div>
      
      {/* Sort Controls */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={sortMode === "votes" ? "outline" : "default"}
          onClick={() => handleSortChange("votes")}
          className="flex items-center gap-2"
        >
          Popularity
          {sortMode === "votes" && (
            sortOrder === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant={sortMode === "name" ? "outline" : "default"}
          onClick={() => handleSortChange("name")}
          className="flex items-center gap-2"
        >
          Name
          {sortMode === "name" && (
            sortOrder === "desc" ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Station Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Station Name</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Language</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Votes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentStations?.map((station: any, index: number) => (
            <TableRow 
              key={station.stationuuid || index}
              className="cursor-pointer"
              onClick={() => handleStationSelect(station)}
            >
              <TableCell className="font-medium">
                {station.name || "Unknown Station"}
              </TableCell>
              <TableCell>
                {station.country || "-"}
              </TableCell>
              <TableCell>
                {station.language || "-"}
              </TableCell>
              <TableCell className="max-w-xs truncate">
                {station.tags || "-"}
              </TableCell>
              <TableCell className="text-right">
                {station.votes || 0}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <Button
          variant="outline"
          onClick={() => handlePageChange("prev")}
          disabled={currentPage === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        
        <span className="text-sm text-muted-foreground">
          Page {currentPage + 1} • {currentStations?.length || 0} stations
        </span>
        
        <Button
          variant="outline"
          onClick={() => handlePageChange("next")}
          disabled={!currentStations || currentStations.length < RESULTS_PER_PAGE}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1"
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
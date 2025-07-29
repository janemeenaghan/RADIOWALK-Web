import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
} from "~/server/api/trpc";

const BASE_URL = "https://de1.api.radio-browser.info";

export const radioRouter = createTRPCRouter({
  // Get all stations with pagination
  getAllStations: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      order: z.enum(["name", "votes", "clickcount", "bitrate", "random"]).default("votes"),
      reverse: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      const { limit, offset, order, reverse } = input;

      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        order,
        reverse: reverse.toString(),
        hidebroken: "true",
        offset: offset.toString(),
      });

      const response = await fetch(`${BASE_URL}/json/stations?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`Radio Browser API error: ${response.status}`);
      }

      return response.json();
    }),

  // Get stations by tag
  getStationsByTag: publicProcedure
    .input(z.object({
      tag: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const { tag, limit, offset } = input;

      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        hidebroken: "true",
        offset: offset.toString(),
      });

      const response = await fetch(
        `${BASE_URL}/json/stations/bytag/${encodeURIComponent(tag)}?${searchParams}`
      );
      
      if (!response.ok) {
        throw new Error(`Radio Browser API error: ${response.status}`);
      }

      return response.json();
    }),

  // Search stations by name
  searchStations: publicProcedure
    .input(z.object({
      searchTerm: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const { searchTerm, limit, offset } = input;

      const searchParams = new URLSearchParams({
        name: searchTerm,
        limit: limit.toString(),
        hidebroken: "true",
        offset: offset.toString(),
      });

      const response = await fetch(`${BASE_URL}/json/stations/search?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`Radio Browser API error: ${response.status}`);
      }

      return response.json();
    }),

  // Get stations by country
  getStationsByCountry: publicProcedure
    .input(z.object({
      country: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const { country, limit, offset } = input;

      const searchParams = new URLSearchParams({
        country,
        limit: limit.toString(),
        hidebroken: "true",
        offset: offset.toString(),
      });

      const response = await fetch(`${BASE_URL}/json/stations/bycountry/${encodeURIComponent(country)}?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`Radio Browser API error: ${response.status}`);
      }

      return response.json();
    }),

  // Get top stations (by votes)
  getTopStations: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const { limit, offset } = input;

      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        order: "votes",
        reverse: "true",
        hidebroken: "true",
        offset: offset.toString(),
      });

      const response = await fetch(`${BASE_URL}/json/stations?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`Radio Browser API error: ${response.status}`);
      }

      return response.json();
    }),

  // Get all available tags
  getTags: publicProcedure
    .query(async () => {
      const response = await fetch(`${BASE_URL}/json/tags`);
      
      if (!response.ok) {
        throw new Error(`Radio Browser API error: ${response.status}`);
      }

      const tags = await response.json() as Array<{ name: string; stationcount: number }>;
      return tags.map(tag => tag.name);
    }),

  // Get all available countries
  getCountries: publicProcedure
    .query(async () => {
      const response = await fetch(`${BASE_URL}/json/countries`);
      
      if (!response.ok) {
        throw new Error(`Radio Browser API error: ${response.status}`);
      }

      const countries = await response.json() as Array<{ name: string; stationcount: number }>;
      return countries.map(country => country.name);
    }),

  // Smart search across name and tags
  smartSearch: publicProcedure
    .input(z.object({
      searchTerm: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
      order: z.enum(["name", "votes", "clickcount", "bitrate", "random"]).default("votes"),
      reverse: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      const { searchTerm, limit, offset, order, reverse } = input;

      // Try searching by name first
      const nameSearchParams = new URLSearchParams({
        name: searchTerm,
        limit: limit.toString(),
        hidebroken: "true",
        offset: offset.toString(),
        order,
        reverse: reverse.toString(),
      });

      const nameResponse = await fetch(`${BASE_URL}/json/stations/search?${nameSearchParams}`);
      
      if (nameResponse.ok) {
        const nameResults = await nameResponse.json() as any[];
        
        // If we get good results from name search, return them
        if (nameResults.length > 0) {
          return nameResults;
        }
      }

      // If name search didn't yield results, try tag search
      const tagSearchParams = new URLSearchParams({
        limit: limit.toString(),
        hidebroken: "true",
        offset: offset.toString(),
        order,
        reverse: reverse.toString(),
      });

      const tagResponse = await fetch(
        `${BASE_URL}/json/stations/bytag/${encodeURIComponent(searchTerm)}?${tagSearchParams}`
      );
      
      if (tagResponse.ok) {
        const tagResults = await tagResponse.json() as any[];
        return tagResults;
      }

      // If both fail, return empty array
      return [];
    }),
});
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { StationType } from "@prisma/client";

export const stationRouter = createTRPCRouter({
  // Create a new station
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      type: z.nativeEnum(StationType).default(StationType.PUBLIC),
      tags: z.string().optional(),
      streamLink: z.string().url().optional(),
      streamName: z.string().optional(),
      favicon: z.string().url().optional(),
      likes: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.station.create({
        data: {
          ...input,
          ownerId: ctx.session.user.id,
        },
        include: {
          owner: true,
          sharedUsers: true,
        },
      });
    }),

  // Get station by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const station = await ctx.db.station.findUnique({
        where: { id: input.id },
        include: {
          owner: true,
          sharedUsers: true,
        },
      });

      if (!station) {
        throw new Error("Station not found");
      }

      // If it's private, only return if user is owner or shared user
      if (station.type === StationType.PRIVATE) {
        // Always check authorization for private stations
        if (!ctx.session?.user?.id) {
          throw new Error("Not authorized to view this station");
        }
        // Then check if user is owner or shared user...
        const isOwner = station.ownerId === ctx.session.user.id;
        const isSharedUser = station.sharedUsers.some(
          user => user.id === ctx.session?.user?.id
        );
        
        if (!isOwner && !isSharedUser) {
          throw new Error("Not authorized to view this station");
        }
      }

      return station;
    }),

  // Get many stations with filtering
  getMany: publicProcedure
    .input(z.object({
      type: z.nativeEnum(StationType),
      tags: z.string().optional(),
      ownerId: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      const where: any = {};

      // Type filtering
      if (input.type) {
        where.type = input.type;
      }

      // Owner filtering
      if (input.ownerId) {
        where.ownerId = input.ownerId;
      }

      // Tags filtering (case-insensitive contains)
      if (input.tags) {
        where.tags = {
          contains: input.tags,
          mode: 'insensitive',
        };
      }

             // Privacy filtering - type is now required
       if (input.type === StationType.PRIVATE) {
         // For private stations, user must be logged in and own/have access
         if (!ctx.session?.user?.id) {
           throw new Error("Must be logged in to view private stations");
         }
         where.OR = [
           { ownerId: ctx.session.user.id },
           { sharedUsers: { some: { id: ctx.session.user.id } } },
         ];
       }
       // For public stations, no additional filtering needed

      return ctx.db.station.findMany({
        where,
        include: {
          owner: true,
          sharedUsers: true,
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      });
    }),

  // Find stations within radius of a location
  findNearby: publicProcedure
    .input(z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      type: z.nativeEnum(StationType),
      tags: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      // Convert radius from km to degrees (rough approximation)
      // 1 degree ≈ 111 km
      const RADIOWALK_RADIUS_KM = 5;
      const radiusDegrees = RADIOWALK_RADIUS_KM / 111;

      const where: any = {
        latitude: {
          gte: input.latitude - radiusDegrees,
          lte: input.latitude + radiusDegrees,
        },
        longitude: {
          gte: input.longitude - radiusDegrees,
          lte: input.longitude + radiusDegrees,
        },
      };

      // Type filtering
      if (input.type) {
        where.type = input.type;
      }

      // Tags filtering
      if (input.tags) {
        where.tags = {
          contains: input.tags,
          mode: 'insensitive',
        };
      }

             // Privacy filtering - type is now required
       if (input.type === StationType.PRIVATE) {
         // For private stations, user must be logged in and own/have access
         if (!ctx.session?.user?.id) {
           throw new Error("Must be logged in to view private stations");
         }
         where.OR = [
           { ownerId: ctx.session.user.id },
           { sharedUsers: { some: { id: ctx.session.user.id } } },
         ];
       }
       // For public stations, no additional filtering needed (type filter already applied above)

      const stations = await ctx.db.station.findMany({
        where,
        include: {
          owner: true,
          sharedUsers: true,
        },
        take: input.limit,
      });

      // Calculate actual distances and filter by exact radius
      const stationsWithDistance = stations
        .map(station => {
          const distance = calculateDistance(
            input.latitude, input.longitude,
            station.latitude, station.longitude
          );
          return { ...station, distance };
        })
        .filter(station => station.distance <= RADIOWALK_RADIUS_KM)
        .sort((a, b) => a.distance - b.distance);

      return stationsWithDistance;
    }),

  // Update station
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      latitude: z.number().min(-90).max(90).optional(),
      longitude: z.number().min(-180).max(180).optional(),
      type: z.nativeEnum(StationType).optional(),
      tags: z.string().optional(),
      streamLink: z.string().url().optional(),
      streamName: z.string().optional(),
      favicon: z.string().url().optional(),
      likes: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check if user owns this station
      const station = await ctx.db.station.findUnique({
        where: { id },
        select: { ownerId: true },
      });

      if (!station) {
        throw new Error("Station not found");
      }

      if (station.ownerId !== ctx.session.user.id) {
        throw new Error("Not authorized to update this station");
      }

      return ctx.db.station.update({
        where: { id },
        data: updateData,
        include: {
          owner: true,
          sharedUsers: true,
        },
      });
    }),

  // Update radio source (streamLink, streamName, favicon)
  updateRadioSource: protectedProcedure
    .input(z.object({
      id: z.string(),
      streamLink: z.string().url(),
      streamName: z.string(),
      favicon: z.string().url().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...radioData } = input;

      // Check if user owns this station
      const station = await ctx.db.station.findUnique({
        where: { id },
        select: { ownerId: true },
      });

      if (!station) {
        throw new Error("Station not found");
      }

      if (station.ownerId !== ctx.session.user.id) {
        throw new Error("Not authorized to update this station");
      }

      return ctx.db.station.update({
        where: { id },
        data: radioData,
        include: {
          owner: true,
          sharedUsers: true,
        },
      });
    }),

  // Delete station
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns this station
      const station = await ctx.db.station.findUnique({
        where: { id: input.id },
        select: { ownerId: true },
      });

      if (!station) {
        throw new Error("Station not found");
      }

      if (station.ownerId !== ctx.session.user.id) {
        throw new Error("Not authorized to delete this station");
      }

      return ctx.db.station.delete({
        where: { id: input.id },
      });
    }),

  // Share station with user
  shareWithUser: protectedProcedure
    .input(z.object({
      stationId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns this station
      const station = await ctx.db.station.findUnique({
        where: { id: input.stationId },
        select: { ownerId: true, type: true },
      });

      if (!station) {
        throw new Error("Station not found");
      }

      if (station.ownerId !== ctx.session.user.id) {
        throw new Error("Not authorized to share this station");
      }

      if (station.type !== StationType.PRIVATE) {
        throw new Error("Can only share private stations");
      }

      // Check if target user exists
      const targetUser = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser) {
        throw new Error("Target user not found");
      }

      return ctx.db.station.update({
        where: { id: input.stationId },
        data: {
          sharedUsers: {
            connect: { id: input.userId },
          },
        },
        include: {
          owner: true,
          sharedUsers: true,
        },
      });
    }),

  // Unshare station with user
  unshareWithUser: protectedProcedure
    .input(z.object({
      stationId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user owns this station
      const station = await ctx.db.station.findUnique({
        where: { id: input.stationId },
        select: { ownerId: true },
      });

      if (!station) {
        throw new Error("Station not found");
      }

      if (station.ownerId !== ctx.session.user.id) {
        throw new Error("Not authorized to modify sharing for this station");
      }

      return ctx.db.station.update({
        where: { id: input.stationId },
        data: {
          sharedUsers: {
            disconnect: { id: input.userId },
          },
        },
        include: {
          owner: true,
          sharedUsers: true,
        },
      });
    }),

  // Get user's owned stations
  getMyStations: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.station.findMany({
        where: { ownerId: ctx.session.user.id },
        include: {
          owner: true,
          sharedUsers: true,
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      });
    }),

  // Get stations shared with user
  getSharedWithMe: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.station.findMany({
        where: {
          sharedUsers: {
            some: { id: ctx.session.user.id },
          },
        },
        include: {
          owner: true,
          sharedUsers: true,
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit,
        skip: input.offset,
      });
    }),

  // Validate stream URL
  validateStream: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .query(async ({ input }) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(input.url, { 
          method: 'HEAD',
          signal: controller.signal,
          headers: {
            'User-Agent': 'RadioWalk/1.0',
          },
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type') || '';
        const isAudioStream = contentType.includes('audio/') || 
                            contentType.includes('application/ogg') ||
                            contentType.includes('video/mp2t'); // For some radio streams

        return { 
          valid: response.ok,
          contentType,
          isAudioStream,
          status: response.status,
          statusText: response.statusText,
        };
      } catch (error) {
        return { 
          valid: false,
          contentType: null,
          isAudioStream: false,
          status: null,
          statusText: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
});

// Utility function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
} 
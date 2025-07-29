import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  // Get current user profile
  getProfile: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          ownedStations: {
            include: {
              sharedUsers: true,
            },
          },
          sharedStations: {
            include: {
              owner: true,
            },
          },
        },
      });
    }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(z.object({
      username: z.string().min(1).max(50).optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check for username uniqueness if changing username
      if (input.username) {
        const existingUser = await ctx.db.user.findFirst({
          where: {
            username: input.username,
            NOT: { id: ctx.session.user.id },
          },
        });

        if (existingUser) {
          throw new Error("Username already taken");
        }
      }

      // Check for email uniqueness if changing email
      if (input.email) {
        const existingUser = await ctx.db.user.findFirst({
          where: {
            email: input.email,
            NOT: { id: ctx.session.user.id },
          },
        });

        if (existingUser) {
          throw new Error("Email already taken");
        }
      }

      return ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });
    }),

  // Search users by username or email (for sharing stations)
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: {
          AND: [
            // Exclude current user from search results
            { NOT: { id: ctx.session.user.id } },
            {
              OR: [
                {
                  username: {
                    contains: input.query,
                    mode: 'insensitive',
                  },
                },
                {
                  email: {
                    contains: input.query,
                    mode: 'insensitive',
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
        },
        take: input.limit,
        orderBy: { username: 'asc' },
      });
    }),

  // Get user by ID (public info only)
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          username: true,
          createdAt: true,
          // Only include public stations
          ownedStations: {
            where: { type: 'PUBLIC' },
            select: {
              id: true,
              name: true,
              latitude: true,
              longitude: true,
              tags: true,
              streamName: true,
              favicon: true,
              likes: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return user;
    }),

  // Get user statistics
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const [
        totalOwnedStations,
        publicStations,
        privateStations,
        sharedStations,
        totalLikes,
      ] = await Promise.all([
        // Total owned stations
        ctx.db.station.count({
          where: { ownerId: ctx.session.user.id },
        }),
        // Public stations count
        ctx.db.station.count({
          where: { 
            ownerId: ctx.session.user.id,
            type: 'PUBLIC',
          },
        }),
        // Private stations count
        ctx.db.station.count({
          where: { 
            ownerId: ctx.session.user.id,
            type: 'PRIVATE',
          },
        }),
        // Stations shared with user
        ctx.db.station.count({
          where: {
            sharedUsers: {
              some: { id: ctx.session.user.id },
            },
          },
        }),
        // Total likes across all owned stations
        ctx.db.station.aggregate({
          where: { ownerId: ctx.session.user.id },
          _sum: { likes: true },
        }),
      ]);

      return {
        totalOwnedStations,
        publicStations,
        privateStations,
        sharedStations,
        totalLikes: totalLikes._sum.likes ?? 0,
      };
    }),

  // Check if username is available
  checkUsernameAvailable: protectedProcedure
    .input(z.object({ username: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.user.findFirst({
        where: {
          username: input.username,
          NOT: { id: ctx.session.user.id },
        },
      });

      return { available: !user };
    }),

  // Get users who have access to a specific station (for station owners)
  getStationUsers: protectedProcedure
    .input(z.object({ stationId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First check if user owns this station
      const station = await ctx.db.station.findUnique({
        where: { id: input.stationId },
        select: { ownerId: true },
      });

      if (!station) {
        throw new Error("Station not found");
      }

      if (station.ownerId !== ctx.session.user.id) {
        throw new Error("Not authorized to view station users");
      }

      // Get the station with shared users
      return ctx.db.station.findUnique({
        where: { id: input.stationId },
        select: {
          id: true,
          name: true,
          type: true,
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          sharedUsers: {
            select: {
              id: true,
              username: true,
              email: true,
              createdAt: true,
            },
          },
        },
      });
    }),
}); 
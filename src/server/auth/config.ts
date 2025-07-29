import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Add more providers here as needed
  ],
  adapter: PrismaAdapter(db),
  callbacks: {
    signIn: async ({ user, account, profile }) => {
      // Generate username if user doesn't have one
      if (user.email) {
        const existingUser = await db.user.findUnique({
          where: { email: user.email },
          select: { username: true, email: true, name: true },
        });

        if (existingUser && !existingUser.username) {
          let username: string;

          // Priority 1: email prefix
          if (existingUser.email) {
            username = existingUser.email.split('@')[0];
          }
          // Priority 2: name without spaces
          else if (existingUser.name) {
            username = existingUser.name.replace(/\s+/g, '');
          }
          // Priority 3: fallback
          else {
            username = 'AnonymousUser';
          }

          // Ensure username is unique by adding numbers if needed
          let finalUsername = username;
          let counter = 1;
          while (await db.user.findUnique({ where: { username: finalUsername } })) {
            finalUsername = `${username}${counter}`;
            counter++;
          }

          await db.user.update({
            where: { email: user.email },
            data: { username: finalUsername },
          });
        }
      }
      return true;
    },
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
} satisfies NextAuthConfig;

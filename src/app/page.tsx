import { StationSelectionWrapper } from "~/app/_components/StationSelectionWrapper";
import { HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";

import Link from "next/link";

export default async function Home() {
  const session = await auth();
  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
          <div className="flex flex-col items-center gap-4">
            {session && (
              <p className="text-center text-2xl text-white">
                Logged in as {session.user?.name}
              </p>
            )}
              <Link
                href={session ? "/api/auth/signout" : "/api/auth/signin"}
                className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
              >
                {session ? "Sign out" : "Sign in"}
              </Link>
              <Link
                href="/browse-stations"
                className="rounded-full bg-green-600 px-10 py-3 font-semibold no-underline transition hover:bg-green-700"
              >
                Create Station
              </Link>
            </div>
          {/* RADIOWALK nearby stations */}
          <StationSelectionWrapper />
        </div>
      </main>
    </HydrateClient>
  );
}

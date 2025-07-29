import { HydrateClient } from "~/trpc/server";
import { auth } from "~/server/auth";
import { RadioGardenLayout } from "~/app/_components/RadioGardenLayout";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  return (
    <HydrateClient>
      <main className="relative h-screen w-screen overflow-hidden">
        {/* Radio.garden-style layout */}
        <RadioGardenLayout />
        
        {/* Top-right authentication */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-4">
          {session && (
            <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
              <p className="text-sm text-gray-800 font-medium">
                {session.user?.name}
              </p>
            </div>
          )}
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg text-sm font-semibold text-gray-800 hover:bg-white transition-colors"
          >
            {session ? "Sign out" : "Sign in"}
          </Link>
        </div>
      </main>
    </HydrateClient>
  );
}

"use client";

import { SessionProvider } from "next-auth/react";
import { TRPCReactProvider } from "~/trpc/react";
import { AudioProvider } from "~/contexts/AudioContext";
import { LocationProvider } from "~/contexts/LocationContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <TRPCReactProvider>
        <LocationProvider>
          <AudioProvider>{children}</AudioProvider>
        </LocationProvider>
      </TRPCReactProvider>
    </SessionProvider>
  );
}
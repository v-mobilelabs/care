"use client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type * as React from "react";
import { getQueryClient } from "@/lib/query/client";
import { ProfileDto } from "@/data/profile/models/profile.model";
import { SessionPayload } from "@/lib/auth/jwt";

export function QueryProvider({ children, user, profile }: {
  readonly children: React.ReactNode;
  readonly user: SessionPayload | null;
  readonly profile: ProfileDto | null;
}) {
  const queryClient = getQueryClient();
  queryClient.setQueryData(["current-user"], user);
  queryClient.setQueryData(["current-profile"], profile);
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

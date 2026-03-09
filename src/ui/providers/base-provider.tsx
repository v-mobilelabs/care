"use client";
import { MantineProvider } from "@mantine/core";
import { theme } from "../theme";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { AnalyticsProvider } from "./analytics-provider";
import { QueryProvider } from "./query-provider";
import { SessionPayload } from "@/lib/auth/jwt";
import { ProfileDto } from "@/data/profile";

export function BaseProvider({
  children,
  user,
  profile,
}: Readonly<{
  children: React.ReactNode;
  user: SessionPayload | null;
  profile: ProfileDto | null;
}>) {
  return (
    <AnalyticsProvider>
      <MantineProvider
        theme={theme}
        defaultColorScheme="auto"
        withCssVariables
        withGlobalClasses
      >
        <ModalsProvider>
          <QueryProvider user={user} profile={profile}>
            <Notifications
              position="bottom-right"
              limit={5}
              style={{ bottom: 60, pointerEvents: "none" }}
              autoClose={5000}
            />
            {children}
          </QueryProvider>
        </ModalsProvider>
      </MantineProvider>
    </AnalyticsProvider>
  );
}

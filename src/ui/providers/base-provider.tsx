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
import { MeetSessionProvider } from "@/lib/meet/meet-session-context";
import { PersistentMeetOverlay } from "@/lib/meet/persistent-meet-overlay";
import { AuthProvider } from "./auth-provider";
import { ActiveCallIsland } from "@/lib/meet/active-call-island";
import { WaitingQueueIsland } from "@/lib/meet/waiting-queue-island";
import { QueuePositionIsland } from "@/lib/meet/queue-position-island";
import { MeetAutoRejoin } from "@/lib/meet/meet-auto-rejoin";
import { SessionPayload } from "@/lib/auth/jwt";
import { ProfileDto } from "@/data/profile";
import { NotificationProvider } from "./notification-provider";

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
            <AuthProvider>
              {children}
            </AuthProvider>
          </QueryProvider>
        </ModalsProvider>
      </MantineProvider>
    </AnalyticsProvider>
  );
}

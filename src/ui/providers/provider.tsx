"use client";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import { ModalsProvider } from "@mantine/modals";
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
import { MessagingProvider } from "./messaging-provider";
import { QueryProvider } from "./query-provider";

export function Provider({
  children,
  user,
  profile,
}: Readonly<{
  children: React.ReactNode;
  user: SessionPayload | null;
  profile: ProfileDto | null;
}>) {
  return (
    <AuthProvider>
      <QueryProvider user={user} profile={profile}>
        <NotificationProvider>
          <MessagingProvider>
            <MeetSessionProvider>
              <ModalsProvider>{children}</ModalsProvider>
              <PersistentMeetOverlay />
              <MeetAutoRejoin />
              <ActiveCallIsland />
              <WaitingQueueIsland />
              <QueuePositionIsland />
            </MeetSessionProvider>
          </MessagingProvider>
        </NotificationProvider>
      </QueryProvider>
    </AuthProvider>
  );
}

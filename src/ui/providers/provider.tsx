"use client";
import { MeetSessionProvider } from "@/lib/meet/meet-session-context";
import { PersistentMeetOverlay } from "@/lib/meet/persistent-meet-overlay";
import { AuthProvider } from "./auth-provider";
import { ActiveCallIsland } from "@/lib/meet/active-call-island";
import { WaitingQueueIsland } from "@/lib/meet/waiting-queue-island";
import { QueuePositionIsland } from "@/lib/meet/queue-position-island";
import { MeetAutoRejoin } from "@/lib/meet/meet-auto-rejoin";
import { NotificationProvider } from "./notification-provider";
import { MessagingProvider } from "./messaging-provider";

export function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <MessagingProvider>
          <MeetSessionProvider>
            {children}
            <PersistentMeetOverlay />
            <MeetAutoRejoin />
            <ActiveCallIsland />
            <WaitingQueueIsland />
            <QueuePositionIsland />
          </MeetSessionProvider>
        </MessagingProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

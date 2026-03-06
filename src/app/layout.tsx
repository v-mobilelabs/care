import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Provider } from "@/ui/providers/provider";
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { AuthProvider } from "@/ui/providers/auth-provider";
import { QueryProvider } from "@/ui/providers/query-provider";
import { MeetSessionProvider } from "@/lib/meet/meet-session-context";
import { PersistentMeetOverlay } from "@/lib/meet/persistent-meet-overlay";
import { MeetAutoRejoin } from "@/lib/meet/meet-auto-rejoin";
import { ActiveCallIsland } from "@/lib/meet/active-call-island";
import { WaitingQueueIsland } from "@/lib/meet/waiting-queue-island";
import { QueuePositionIsland } from "@/lib/meet/queue-position-island";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "CareAI — AI Symptom Assessment",
  description: "Describe your symptoms to our AI, get a personalised assessment, and connect with a verified doctor.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CareAI",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#4c6ef5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = crypto.randomUUID();
  return (
    <html lang="en"  {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
      </head>
      <body className={roboto.variable}>
        <Provider>
          <AuthProvider>
            <QueryProvider>
              <MeetSessionProvider>
                {children}
                <PersistentMeetOverlay />
                <MeetAutoRejoin />
                <ActiveCallIsland />
                <WaitingQueueIsland />
                <QueuePositionIsland />
              </MeetSessionProvider>
            </QueryProvider>
          </AuthProvider>
        </Provider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Provider } from "@/ui/providers/provider";
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import "./globals.css";
import { get } from "http";
import { getServerUser } from "@/lib/api/server-prefetch";
import { GetProfileUseCase } from "@/data/profile";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = crypto.randomUUID();
  const { user, profile } = await getData(); // Ensure user data is fetched on the server for proper hydration of auth state on the client
  return (
    <html lang="en"  {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
      </head>
      <body className={roboto.variable}>
        <Provider user={user} profile={profile}>
          {children}
        </Provider>
      </body>
    </html>
  );
}

async function getData() {
  const user = await getServerUser();
  const profile = await new GetProfileUseCase().execute(
    GetProfileUseCase.validate({ userId: user?.uid }),
  );
  return { user, profile };
}
import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { getServerUser } from "@/lib/api/server-prefetch";
import { GetProfileUseCase } from "@/data/profile";
import { BaseProvider } from "@/ui/providers/base-provider";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

const bg = {
  background: "light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-7))",
}

export const metadata: Metadata = {
  title: "CareAI — AI Symptom Assessment",
  description: "Describe your symptoms to our AI, get a personalised assessment, and connect with a verified doctor.",
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4c6ef5" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1b1e" },
  ],
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
        <BaseProvider user={user} profile={profile}>
          {children}
        </BaseProvider>
      </body>
    </html>
  );
}

async function getData() {
  const user = await getServerUser();
  if (user) {
    const profile = await new GetProfileUseCase().execute(
      GetProfileUseCase.validate({ userId: user?.uid }),
    );
    return { user, profile };
  }
  return { user: null, profile: null };
}
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Provider } from "@/ui/providers/provider";
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';

const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

import { AuthProvider } from "@/ui/providers/auth-provider";
import "./globals.css";

const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "CareAI — AI Symptom Assessment",
  description: "Describe your symptoms to our AI, get a personalised assessment, and connect with a verified doctor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en"  {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
      </head>
      <body className={roboto.variable}>
        <Provider>
          <AuthProvider>{children}</AuthProvider>
        </Provider>
      </body>
    </html>
  );
}

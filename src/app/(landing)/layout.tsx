import { LandingLayout } from "@/ui/layouts/landing";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <LandingLayout>{children}</LandingLayout>
  );
}

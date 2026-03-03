import { LandingLayout } from "./landing";
import { PortalLayout } from "./portal";
import { ReactNode } from "react";
import { getQueryClient } from "@/lib/query/client";
import { Hydrate } from "@/ui/hydrate";

type MainLayoutProps = {
  readonly children: React.ReactNode;
  readonly application: Application;
  readonly menus?: Menu[];
  readonly kind: "portal" | "landing";
};

type Application = {
  id: string;
  name: string;
  url: string;
  icon: ReactNode;
};

type Menu = {
  label: string;
  icon: ReactNode;
  href: string;
};

export async function MainLayout({
  children,
  kind,
  application,
  menus,
}: MainLayoutProps) {
  const client = getQueryClient();
  const Layout =
    kind === "landing" ? (
      <LandingLayout>{children}</LandingLayout>
    ) : (
      <PortalLayout application={application} menus={menus!}>
        {children}
      </PortalLayout>
    );
  return <Hydrate client={client}>{Layout}</Hydrate>;
}
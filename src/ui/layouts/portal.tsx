"use client";
import {
  AppShell,
  Box,
  Burger,
  Group,
  Menu,
  NavLink,
  Paper,
  ScrollArea,
  Skeleton,
  Text,
  ThemeIcon,
} from "@mantine/core";
import { PortalFooter } from "../footers/portal.footer";
import { useDisclosure } from "@mantine/hooks";
import { Logo } from "../brand/logo";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { BreadcrumbsBar } from "../breadcrumbs";
import { UserCard } from "../user-card";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { useCurrentProfile } from "@/lib/auth/use-current-profile";
import { SignOutButton } from "../sign-out-button";
import { IconLogout } from "@tabler/icons-react";
import { Credits } from "../credits";
import { MessagesButton } from "../messaging/messages-button";
import { NotificationsButton } from "../notifications/notifications-button";
import { MessagingSidebar } from "../messaging/messaging-drawer";
import { useMessaging } from "../providers/messaging-provider";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { Loader } from "@mantine/core";

const ColorSchemeToggle = dynamic(
  () => import("@/ui/color-scheme-toggle").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <Skeleton height={28} width={28} radius="xl" />,
  }
);

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  href: string;
  children?: MenuItem[];
};

type MenuGroup = {
  navigation: MenuItem[];
  header: MenuItem[];
  profile: MenuItem[];
};

/* ── NavLink label with pending indicator ────────────────────────────────── */

function NavLinkLabel({ label }: Readonly<{ label: string }>) {
  const { pending } = useLinkStatus();
  return (
    <Group gap="xs" wrap="nowrap">
      {label}
      {pending && <Loader size={12} color="primary" />}
    </Group>
  );
}

/* ── Main PortalLayout ─────────────────────────────────────────────────────── */

export function PortalLayout({
  children,
  menus,
}: Readonly<{
  children: React.ReactNode;
  menus: MenuGroup;
  application?: {
    id: string;
    name: string;
    url: string;
    icon: ReactNode;
  };
}>) {
  const [opened, { toggle, close }] = useDisclosure();
  const { isOpen } = useMessaging()
  const pathName = usePathname();

  useEffect(() => {
    close();
  }, [pathName, close]);

  const { data: profile } = useCurrentProfile();
  const { data: user } = useCurrentUser();

  const Header = (
    <AppShell.Header
      px={{ base: "sm", md: "md" }}
      style={{
        background: "light-dark(rgba(255,255,255,0.7), rgba(30,32,40,0.7))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <Group justify="space-between" style={{ height: "100%" }}>
        <Group gap="sm">
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="md"
            size="sm"
          />
          <Logo />
        </Group>
        <Group gap="sm">
          {menus.header.map((menu) => (
            <NavLink
              key={menu.label}
              label={menu.label}
              href={menu.href}
              leftSection={menu.icon}
            />
          ))}
          <NotificationsButton />
          <MessagesButton />
          <ColorSchemeToggle />
          <Menu
            shadow="md"
            width={240}
            offset={8}
            position="bottom-end"
            withArrow
          >
            <Menu.Target>
              <UserCard name={profile?.name} image={profile?.photoUrl} uid={profile?.userId} />
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>
                <Text size="xs" fw={500} truncate>
                  {profile?.name ?? "Unknown User"}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  {user?.email}
                </Text>
              </Menu.Label>
              <Menu.Divider />
              {menus.profile.map((menu) => (
                <Menu.Item
                  key={menu.label}
                  leftSection={menu.icon}
                  component="a"
                  href={menu.href}
                >
                  {menu.label}
                </Menu.Item>
              ))}
              <Menu.Item leftSection={<IconLogout size={16} />} color="red">
                <SignOutButton />
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </AppShell.Header >
  );

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: { base: 260, md: 260 },
        breakpoint: "md",
        collapsed: { mobile: !opened },
      }}
      aside={{
        width: { base: 360, md: 360 },
        breakpoint: "md",
        collapsed: { mobile: !isOpen, desktop: !isOpen },
      }}
    >
      {Header}
      <Paper
        radius={0}
        pos="fixed"
        style={{
          top: "var(--app-shell-header-offset, 0px)",
          left: "var(--app-shell-navbar-offset, 0px)",
          width: "calc(100% - var(--app-shell-navbar-offset, 0px))",
          zIndex: 99,
          background: "light-dark(rgba(255,255,255,0.55), rgba(30,32,40,0.55))",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
        px={{ base: "sm" }}
        py="sm"
        withBorder={false}
      >
        <Group justify="space-between">
          <BreadcrumbsBar application={undefined} menus={menus.navigation} />
          <Credits />
        </Group>
      </Paper>
      <AppShell.Navbar
        style={{
          background: "light-dark(rgba(248,249,250,0.9), rgba(26,27,30,0.6))",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderRight: "1px solid light-dark(rgba(0,0,0,0.06), rgba(255,255,255,0.06))",
        }}
      >
        <AppShell.Section
          grow
          component={ScrollArea}
        >
          {menus.navigation.map((menu) => {
            // Exact match only - don't activate parent paths when on child routes
            const isActive = pathName === menu.href;
            return <NavLink
              component={Link}
              variant={isActive ? "filled" : "subtle"}
              color="primary"
              key={menu.label}
              label={<NavLinkLabel label={menu.label} />}
              href={menu.href}
              onClick={close}
              leftSection={
                <ThemeIcon radius="xl" size={"sm"} variant={isActive ? "filled" : "light"} color="primary">
                  {menu.icon}
                </ThemeIcon>
              }
              active={isActive}
            />
          })}
        </AppShell.Section>
        <AppShell.Section>
          <PortalFooter />
        </AppShell.Section>
      </AppShell.Navbar>
      <MessagingSidebar />
      <AppShell.Main
        style={{
          background: "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-9))",
        }}
        pt="6.5rem"
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

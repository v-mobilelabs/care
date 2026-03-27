"use client";
import {
  ActionIcon,
  AppShell,
  Badge,
  Button,
  Burger,
  Divider,
  Group,
  Loader,
  Menu,
  NavLink,
  Paper,
  ScrollArea,
  Text,
  ThemeIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { Logo } from "../brand/logo";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { BreadcrumbsBar } from "../breadcrumbs";
import { UserCard } from "../user-card";
import { useAuth } from "@/ui/providers/auth-provider";
import { useProfileQuery } from "@/ui/ai/query";
import { SignOutButton } from "../sign-out-button";
import { IconLogout, IconMoon, IconSun } from "@tabler/icons-react";
import { Credits } from "../credits";
import { MessagingSidebar } from "../messaging/messaging-drawer";
import { MessagesButton } from "../messaging/messages-button";
import { useMessaging } from "../providers/messaging-provider";
import Link, { useLinkStatus } from "@/ui/link";

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  href: string;
  beta?: boolean;
  children?: MenuItem[];
};

type MenuGroup = {
  navigation: MenuItem[];
  header: MenuItem[];
  profile: MenuItem[];
};

function isAskAiMenuItem(menu: MenuItem): boolean {
  return menu.label === "Ask AI";
}

function isRouteActive(menu: MenuItem, pathName: string): boolean {
  if (pathName === menu.href) {
    return true;
  }

  if (!menu.children || menu.children.length === 0) {
    return false;
  }

  return menu.children.some((child) => isRouteActive(child, pathName));
}

/* ── NavLink label with pending indicator ────────────────────────────────── */

function NavLinkLabel({ label, beta }: Readonly<{ label: string; beta?: boolean }>) {
  const { pending } = useLinkStatus();
  return (
    <Group gap="xs" wrap="nowrap">
      {label}
      {beta && (
        <Badge size="xs" variant="light" color="violet" radius="sm" px={5}>
          Beta
        </Badge>
      )}
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
  const [opened, setOpened] = useState(false);
  const toggle = () => {
    setOpened((current) => !current);
  };
  const close = () => {
    setOpened(false);
  };
  const { isOpen } = useMessaging()
  const pathName = usePathname();

  useEffect(() => {
    close();
  }, [pathName]);

  const { data: profile } = useProfileQuery();
  const { user } = useAuth();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", {
    getInitialValueInEffect: true,
  });
  const isDarkMode = computedColorScheme === "dark";
  const toggleColorScheme = () => {
    setColorScheme(isDarkMode ? "light" : "dark");
  };

  const renderHeaderItem = (menu: MenuItem): ReactNode => {
    if (isAskAiMenuItem(menu)) {
      return (
        <Button
          key={menu.label}
          component={Link}
          href={menu.href}
          leftSection={menu.icon}
          color="primary"
          variant="gradient"
          size="xs"
          radius="xl"
        >
          {menu.label}
        </Button>
      );
    }

    return (
      <NavLink
        key={menu.label}
        label={menu.label}
        href={menu.href}
        leftSection={menu.icon}
        component={Link}
      />
    );
  };

  const renderMenuItem = (menu: MenuItem, depth = 0): ReactNode => {
    const active = isRouteActive(menu, pathName);
    const hasChildren = Boolean(menu.children && menu.children.length > 0);
    const leftSection = (
      <ThemeIcon radius="xl" size={depth > 0 ? "md" : "lg"} p="xs" variant={active ? "filled" : "light"} color="primary">
        {menu.icon}
      </ThemeIcon>
    );

    if (hasChildren) {
      return (
        <NavLink
          key={menu.label}
          component={Link}
          variant={active ? "filled" : "subtle"}
          color="primary.7"
          label={<NavLinkLabel label={menu.label} beta={menu.beta} />}
          href={menu.href}
          leftSection={leftSection}
          active={active}
          onClick={close}
          defaultOpened={active}
          childrenOffset={depth > 0 ? 14 : 20}
        >
          {menu.children?.map((child) => renderMenuItem(child, depth + 1))}
        </NavLink>
      );
    }

    return (
      <NavLink
        key={menu.label}
        component={Link}
        variant={active ? "filled" : "subtle"}
        color="primary.7"
        label={<NavLinkLabel label={menu.label} beta={menu.beta} />}
        href={menu.href}
        onClick={close}
        leftSection={leftSection}
        active={active}
      />
    );
  };

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
          {menus.header.map((menu) => renderHeaderItem(menu))}
          <MessagesButton />
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
              <Menu.Divider />
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
        collapsed: { mobile: !opened, desktop: false },
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
        <AppShell.Section>
          {/* set User card with avatat */}
        </AppShell.Section>
        <Divider />
        <AppShell.Section

          grow
          component={ScrollArea}
        >
          {menus.navigation.map((menu) => renderMenuItem(menu))}
        </AppShell.Section>
        <Divider />
        <AppShell.Section>
          <Group justify="space-between" px="md" py="xs">
            <Text size="sm" fw={500}>Theme</Text>
            <ActionIcon
              onClick={toggleColorScheme}
              variant="light"
              size="lg"
              radius="xl"
              aria-label="Toggle color theme"
            >
              {isDarkMode ? <IconSun size={16} /> : <IconMoon size={16} />}
            </ActionIcon>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>
      <MessagingSidebar />
      <AppShell.Main
        style={{
          background: "light-dark(var(--mantine-color-gray-2), darken(var(--mantine-color-dark-9), 1%))",
        }}
        pt="6.5rem"
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

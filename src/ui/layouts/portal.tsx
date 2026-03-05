"use client";
import {
  AppShell,
  Avatar,
  Box,
  Burger,
  Divider,
  Group,
  Menu,
  NavLink,
  ScrollArea,
  Skeleton,
  Text,
} from "@mantine/core";
import { Provider } from "../providers/provider";
import { PortalFooter } from "../footers/portal.footer";
import { useDisclosure } from "@mantine/hooks";
import { Logo } from "../brand/logo";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { BreadcrumbsBar } from "../breadcrumbs";
import { useAuth } from "@/ui/providers/auth-provider";
import { getInitials } from "@/lib/get-initials";
import { IconLogout, IconUser } from "@tabler/icons-react";
import { modals } from "@mantine/modals";
import { PresenceDot } from "@/lib/presence/presence-dot";

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

export function PortalLayout({
  children,
  menus,
  application,
  profileHref,
  avatarSrc,
  avatarName,
}: Readonly<{
  children: React.ReactNode;
  menus: MenuItem[];
  application?: {
    id: string;
    name: string;
    url: string;
    icon: ReactNode;
  };
  profileHref?: string;
  avatarSrc?: string | null;
  avatarName?: string | null;
}>) {
  const [opened, { toggle }] = useDisclosure();
  const pathName = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const initials = getInitials(
    avatarName ?? user?.displayName ?? null,
    user?.email ?? null,
  );
  const photoSrc = avatarSrc ?? user?.photoURL ?? undefined;

  function doSignOut() {
    modals.closeAll();
    fetch("/api/doctors/me/availability", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: "unavailable" }),
    }).finally(() => {
      fetch("/api/auth/session", { method: "DELETE" }).finally(() => {
        router.push("/auth/login");
      });
    });
  }

  function handleSignOut() {
    modals.openConfirmModal({
      title: "Sign out",
      children: "Are you sure you want to sign out?",
      labels: { confirm: "Sign out", cancel: "Cancel" },
      confirmProps: { color: "red", leftSection: <IconLogout size={14} /> },
      onConfirm: doSignOut,
    });
  }

  const Header = (
    <AppShell.Header px={{ base: "sm", md: "md" }} style={
      {
        // 30 % secondary zone — subtle brand tint for structural chrome
        backgroundColor:
          "light-dark(var(--mantine-color-white), var(--mantine-color-dark-9))",
        borderBottom:
          "1px solid light-dark(var(--mantine-color-primary-1), rgba(107,79,248,0.12))",
      }
    }>
      <Group justify="space-between">
        <Group py="sm">
          <Burger opened={opened} onClick={toggle} hiddenFrom="md" size="sm" />
          <Logo />
        </Group>
        <Group gap="xs">
          <ColorSchemeToggle />
          {/* ── Presence indicator — standalone header item ── */}
          <Box
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: "var(--mantine-radius-xl)",
              border: "1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))",
              background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
              cursor: "default",
              userSelect: "none",
            }}
          >
            <PresenceDot uid={user?.uid} size="sm" withLabel />
          </Box>
          <Menu shadow="md" width={200} position="bottom-end" withArrow>
            <Menu.Target>
              <Avatar
                src={photoSrc ?? null}
                size={34}
                radius="xl"
                color="primary"
                imageProps={{
                  onError: (e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; },
                }}
                style={{ cursor: "pointer" }}
              >
                {initials}
              </Avatar>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>
                <Text size="xs" fw={500} truncate>{avatarName ?? user?.displayName ?? user?.email ?? "Account"}</Text>
                {avatarName && <Text size="xs" c="dimmed" truncate>{user?.email}</Text>}
              </Menu.Label>
              <Divider />
              {profileHref && (
                <Menu.Item
                  leftSection={<IconUser size={14} />}
                  component="a"
                  href={profileHref}
                >
                  My profile
                </Menu.Item>
              )}
              <Menu.Item
                leftSection={<IconLogout size={14} />}
                color="red"
                onClick={handleSignOut}
              >
                Sign out
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </AppShell.Header>
  );
  return (
    <Provider>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: { base: 260, md: 280 },
          breakpoint: "md",
          collapsed: { mobile: !opened },
        }}
        padding={{ base: "sm", md: "md" }}
      >
        {Header}
        <AppShell.Navbar
          style={
            {
              // 30 % secondary zone — brand-tinted sidebar
              backgroundColor:
                "light-dark(var(--mantine-color-primary-0), var(--mantine-color-dark-9))",
              borderRight:
                "1px solid light-dark(var(--mantine-color-primary-1), rgba(107,79,248,0.12))",
            }
          }
        >
          <AppShell.Section grow component={ScrollArea}>
            {menus?.map((menu) => {
              // Check if this menu has children (is a group)
              if (menu.children && menu.children.length > 0) {
                // This is a menu group with children
                const isGroupActive = menu.children.some((child) =>
                  pathName === child.href || pathName.startsWith(child.href + '/')
                );

                return (
                  <NavLink
                    key={menu.label}
                    label={menu.label}
                    leftSection={menu.icon}
                    p="sm"
                    defaultOpened={isGroupActive}
                    childrenOffset={28}
                  >
                    {menu.children.map((child) => {
                      const isChildActive = pathName === child.href ||
                        (child.href !== '/' && pathName.startsWith(child.href + '/'));

                      return (
                        <NavLink
                          key={child.label}
                          label={child.label}
                          leftSection={child.icon}
                          component="a"
                          href={child.href}
                          active={isChildActive}
                          variant="filled"
                        />
                      );
                    })}
                  </NavLink>
                );
              }

              // Regular menu item (no children)
              let isActive = false;

              if (pathName === menu.href) {
                // Exact match
                isActive = true;
              } else if (menu.href !== '/' && pathName.startsWith(menu.href + '/')) {
                // Child route match - check if any other menu has a more specific match
                const hasMoreSpecificMatch = menus.some(
                  (otherMenu) =>
                    otherMenu.href !== menu.href &&
                    otherMenu.href.length > menu.href.length &&
                    (pathName === otherMenu.href || pathName.startsWith(otherMenu.href + '/'))
                );
                isActive = !hasMoreSpecificMatch;
              }

              return (
                <NavLink
                  p="sm"
                  key={menu.label}
                  label={menu.label}
                  leftSection={menu.icon}
                  component="a"
                  href={menu.href}
                  active={isActive}
                  variant="filled"
                />
              );
            })}
          </AppShell.Section>
          <AppShell.Section>
            <PortalFooter />
          </AppShell.Section>
        </AppShell.Navbar>
        <AppShell.Main style={{
          // 60 % dominant zone — neutral page background
          backgroundColor:
            "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))",
        }}>
          <Box pb={{ base: "sm", md: "md" }}>
            <BreadcrumbsBar application={application} menus={menus} />
          </Box>
          {children}
        </AppShell.Main>
      </AppShell>
    </Provider>
  );
}

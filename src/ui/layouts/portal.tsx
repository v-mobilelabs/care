"use client";
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Button,
  Burger,
  Divider,
  Group,
  Loader,
  Menu,
  NavLink,
  Paper,
  Popover,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
import { Logo } from "../brand/logo";
import { usePathname } from "next/navigation";
import { cloneElement, isValidElement, type ReactNode, useCallback, useEffect, useState } from "react";
import { BreadcrumbsBar } from "../breadcrumbs";
import { UserCard } from "../user-card";
import { useAuth } from "@/ui/providers/auth-provider";
import { useProfileQuery } from "@/ui/ai/query";
import { SignOutButton } from "../sign-out-button";
import { IconChevronLeft, IconChevronRight, IconLogout, IconMoon, IconSearch, IconSun, IconX } from "@tabler/icons-react";
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

const CONTROL_ICON_SIZE = 16;
const CONTROL_CONTAINER_SIZE = "lg" as const;
const MINI_TRANSITION_DURATION = "220ms";
const MINI_TRANSITION_EASING = "ease";
const MINI_TRANSITION = `${MINI_TRANSITION_DURATION} ${MINI_TRANSITION_EASING}`;
const MENU_ITEM_SIZE = 50;
const NAV_SECTION_PADDING = "sm" as const;
const NAV_STACK_GAP = "sm" as const;
const FOOTER_STACK_PX = "sm" as const;

function withStandardIconSize(icon: ReactNode): ReactNode {
  if (isValidElement<{ size?: number }>(icon)) {
    return cloneElement(icon, { size: CONTROL_ICON_SIZE });
  }

  return icon;
}

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

function filterMenuItems(items: MenuItem[], query: string): MenuItem[] {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.reduce<MenuItem[]>((acc, item) => {
    if (item.label.toLowerCase().includes(q)) {
      acc.push(item);
    } else if (item.children && item.children.length > 0) {
      const matchedChildren = filterMenuItems(item.children, query);
      if (matchedChildren.length > 0) {
        acc.push({ ...item, children: matchedChildren });
      }
    }
    return acc;
  }, []);
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

type RenderMenuItemOptions = Readonly<{
  pathName: string;
  close: () => void;
  isCompactDesktop: boolean;
}>;

function renderHeaderItem(menu: MenuItem): ReactNode {
  const menuIcon = withStandardIconSize(menu.icon);

  if (isAskAiMenuItem(menu)) {
    return (
      <Button
        key={menu.label}
        component={Link}
        href={menu.href}
        leftSection={menuIcon}
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
      leftSection={menuIcon}
      component={Link}
    />
  );
}

function renderPortalMenuItem(menu: MenuItem, depth: number, options: RenderMenuItemOptions): ReactNode {
  const { pathName, close, isCompactDesktop } = options;
  const active = isRouteActive(menu, pathName);
  const hasChildren = Boolean(menu.children && menu.children.length > 0);
  const menuIcon = withStandardIconSize(menu.icon);

  if (isCompactDesktop) {
    return (
      <Tooltip key={menu.label} label={menu.label} position="right" offset={8}>
        <Box
          style={{
            borderRadius: "50%",
            cursor: "pointer",
            width: MENU_ITEM_SIZE,
            height: MENU_ITEM_SIZE,
            minWidth: MENU_ITEM_SIZE,
            minHeight: MENU_ITEM_SIZE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: active ? "light-dark(var(--mantine-color-primary-1), darken(var(--mantine-color-primary-9), 0.2))"
              : "transparent",
            transition: `background 150ms ease, color 150ms ease, transform ${MINI_TRANSITION}, opacity ${MINI_TRANSITION}`,
            transform: "translateZ(0)",
          }}
        >
          <ActionIcon
            variant={active ? "filled" : "light"}
            color="primary"
            size={CONTROL_CONTAINER_SIZE}
            radius="xl"
            component={Link}
            href={menu.href}
            onClick={close}
            aria-label={menu.label}
          >
            {menuIcon}
          </ActionIcon>
        </Box>
      </Tooltip >
    );
  }

  const leftSection = (
    <ThemeIcon radius="xl" size={CONTROL_CONTAINER_SIZE} p="xs" variant={active ? "filled" : "light"} color="primary">
      {menuIcon}
    </ThemeIcon>
  );

  if (hasChildren) {
    return (
      <NavLink
        key={menu.label}
        component={Link}
        variant={active ? "light" : "subtle"}
        color="primary.7"
        label={<NavLinkLabel label={menu.label} beta={menu.beta} />}
        href={menu.href}
        leftSection={leftSection}
        active={active}
        onClick={close}
        defaultOpened={active}
        childrenOffset={depth > 0 ? 14 : 20}
        style={{ borderRadius: "2rem", minHeight: MENU_ITEM_SIZE }}
      >
        {menu.children?.map((child) =>
          renderPortalMenuItem(child, depth + 1, {
            pathName,
            close,
            isCompactDesktop,
          }),
        )}
      </NavLink>
    );
  }

  return (
    <NavLink
      key={menu.label}
      component={Link}
      variant={active ? "light" : "subtle"}
      color="primary.7"
      label={<NavLinkLabel label={menu.label} beta={menu.beta} />}
      href={menu.href}
      onClick={close}
      leftSection={leftSection}
      active={active}
      style={{ borderRadius: "2rem", minHeight: MENU_ITEM_SIZE }}
    />
  );
}

/* ── Main PortalLayout ─────────────────────────────────────────────────────── */

// eslint-disable-next-line sonarjs/cognitive-complexity
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
  const [isClient, setIsClient] = useState(false);
  const [expandedMd, setExpandedMd] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const toggle = useCallback(() => setOpened((v) => !v), []);
  const close = useCallback(() => setOpened(false), []);
  const toggleExpandedMd = useCallback(() => setExpandedMd((v) => !v), []);
  const { isOpen } = useMessaging();
  const pathName = usePathname();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    close();
    setSearchOpen(false);
    setSearchQuery("");
  }, [pathName, close]);

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

  const themeToggleIcon = (() => {
    if (!isClient) {
      return <IconMoon size={CONTROL_ICON_SIZE} />;
    }

    if (isDarkMode) {
      return <IconSun size={CONTROL_ICON_SIZE} />;
    }

    return <IconMoon size={CONTROL_ICON_SIZE} />;
  })();

  const navbarConfig = {
    width: { base: 260, md: expandedMd ? 260 : 86 },
    breakpoint: "md" as const,
    collapsed: { mobile: !opened, desktop: false },
  };
  const isCompactDesktop = !expandedMd && !opened;

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

  const filteredNavigation = filterMenuItems(menus.navigation, searchQuery);

  const navSections = (
    <>
      <AppShell.Section
        grow
        component={ScrollArea}
        p={NAV_SECTION_PADDING}
        style={{ transition: `padding ${MINI_TRANSITION}` }}
      >
        <Stack
          gap={NAV_STACK_GAP}
          align="center"
          justify="center"
          style={{ transition: `gap ${MINI_TRANSITION}` }}
        >
          {(() => {
            if (isCompactDesktop) {
              return (
                <Popover
                  opened={searchOpen}
                  onClose={() => { setSearchOpen(false); setSearchQuery(""); }}
                  position="right"
                  offset={12}
                  withArrow
                >
                  <Popover.Target>
                    <Box
                      style={{
                        borderRadius: "50%",
                        cursor: "pointer",
                        width: MENU_ITEM_SIZE,
                        height: MENU_ITEM_SIZE,
                        minWidth: MENU_ITEM_SIZE,
                        minHeight: MENU_ITEM_SIZE,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: searchOpen ? "var(--mantine-color-primary-1)" : "transparent",
                        transition: `background 150ms ease`,
                      }}
                    >
                      <ActionIcon
                        variant="light"
                        color="primary"
                        size={CONTROL_CONTAINER_SIZE}
                        radius="xl"
                        onClick={() => setSearchOpen((v) => !v)}
                        aria-label="Search navigation"
                      >
                        {searchOpen ? <IconX size={CONTROL_ICON_SIZE} /> : <IconSearch size={CONTROL_ICON_SIZE} />}
                      </ActionIcon>
                    </Box>
                  </Popover.Target>
                  <Popover.Dropdown p="xs">
                    <TextInput
                      placeholder="Search..."
                      size="sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.currentTarget.value)}
                      leftSection={<IconSearch size={14} />}
                      autoFocus
                      style={{ width: 200 }}
                      radius={"xl"}
                    />
                  </Popover.Dropdown>
                </Popover>
              );
            }
            if (searchOpen) {
              return (
                <Box w="100%" px="xs" style={{ minHeight: MENU_ITEM_SIZE, display: "flex", alignItems: "center" }}>
                  <TextInput
                    radius={"xl"}
                    placeholder="Search menus..."
                    size="sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    leftSection={<IconSearch size={14} />}
                    rightSection={
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        radius="xl"
                        onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                        aria-label="Close search"
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    }
                    autoFocus
                    style={{ width: "100%" }}
                  />
                </Box>
              );
            }
            return (
              <NavLink
                label="Search"
                leftSection={
                  <ThemeIcon radius="xl" size={CONTROL_CONTAINER_SIZE} p="xs" variant="light" color="primary">
                    <IconSearch size={CONTROL_ICON_SIZE} />
                  </ThemeIcon>
                }
                variant="subtle"
                color="primary.7"
                onClick={() => setSearchOpen(true)}
                style={{ borderRadius: "2rem", minHeight: MENU_ITEM_SIZE, width: "100%" }}
              />
            );
          })()}
          {!isCompactDesktop && filteredNavigation.length === 0 && searchQuery.trim() !== "" && (
            <Text size="xs" c="dimmed" ta="center" py="sm">No results</Text>
          )}
          {filteredNavigation.map((menu) => renderPortalMenuItem(menu, 0, { pathName, close, isCompactDesktop }))}
        </Stack>
      </AppShell.Section>
      <Divider />
      <AppShell.Section>
        <Stack
          gap={NAV_STACK_GAP}
          align="center"
          justify="center"
          px={FOOTER_STACK_PX}
          py="xs"
          style={{ transition: `padding ${MINI_TRANSITION}` }}
        >
          {isCompactDesktop ? (
            <Tooltip label="Toggle theme" position="right" offset={8}>
              <ActionIcon
                onClick={toggleColorScheme}
                variant="light"
                size={CONTROL_CONTAINER_SIZE}
                radius="xl"
                aria-label="Toggle color theme"
              >
                {themeToggleIcon}
              </ActionIcon>
            </Tooltip>
          ) : (
            <NavLink
              label="Theme"
              leftSection={themeToggleIcon}
              variant="subtle"
              color="primary.7"
              onClick={toggleColorScheme}
              style={{ borderRadius: "2rem", width: "100%" }}
            />
          )}
          {opened ? null : (
            <>
              {isCompactDesktop ? (
                <Tooltip label={expandedMd ? "Collapse sidebar" : "Expand sidebar"} position="right" offset={8}>
                  <ActionIcon
                    onClick={toggleExpandedMd}
                    variant="light"
                    size={CONTROL_CONTAINER_SIZE}
                    radius="xl"
                    aria-label={expandedMd ? "Collapse sidebar" : "Expand sidebar"}
                  >
                    {expandedMd ? <IconChevronLeft size={CONTROL_ICON_SIZE} /> : <IconChevronRight size={CONTROL_ICON_SIZE} />}
                  </ActionIcon>
                </Tooltip>
              ) : (
                <NavLink
                  label={expandedMd ? "Collapse sidebar" : "Expand sidebar"}
                  leftSection={expandedMd ? <IconChevronLeft size={CONTROL_ICON_SIZE} /> : <IconChevronRight size={CONTROL_ICON_SIZE} />}
                  variant="subtle"
                  color="primary.7"
                  onClick={toggleExpandedMd}
                  style={{ borderRadius: "2rem", width: "100%" }}
                />
              )}
            </>
          )}
        </Stack>
      </AppShell.Section>
    </>
  );

  return (
    <AppShell
      withBorder={false}
      layout="alt"
      header={{ height: 48 }}
      navbar={navbarConfig}
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
          transition: `width ${MINI_TRANSITION}, padding ${MINI_TRANSITION}, gap ${MINI_TRANSITION}`,
          willChange: "width",
          overflow: "hidden",
        }}
      >
        {navSections}
      </AppShell.Navbar>
      <MessagingSidebar />
      <AppShell.Main
        style={{
          background: "light-dark(var(--mantine-color-gray-4), darken(var(--mantine-color-dark-9), 1%))",
        }}
        pt="6.5rem"
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

"use client";
import dynamic from "next/dynamic";
import { AppShell, Group, Skeleton } from "@mantine/core";
import { Logo } from "../brand/logo";
const ColorSchemeToggle = dynamic(
  () => import("@/ui/color-scheme-toggle").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <Skeleton height={40} width={40} radius="xl" />,
  }
);

export function LandingHeader() {
  return (
    <AppShell.Header px="md">
      <Group justify="space-between">
        <Group py="md">
          <Logo />
        </Group>
        <Group gap="xs">
          <ColorSchemeToggle />
        </Group>
      </Group>
    </AppShell.Header>
  );
}

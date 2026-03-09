"use client";

import { AppShell, Button, Group, Skeleton } from "@mantine/core";
import { IconMessageChatbot } from "@tabler/icons-react";
import { Logo } from "../brand/logo";
import Link from "next/link";
import { Suspense } from "react";
import ColorSchemeToggle from "../color-scheme-toggle";

export function LandingHeader() {
  return (
    <Group justify="space-between" align="center" h={64} px="md">
      <Logo />
      <Group gap="xs">
        <Suspense fallback={<Skeleton height={36} width={36} radius="xl" />}>
          <ColorSchemeToggle />
        </Suspense>
        <Button
          color="primary"
          size="sm"
          radius="xl"
          leftSection={<IconMessageChatbot size={15} />}
          component={Link}
          href="/patient/assistant"
        >
          Start Assessment
        </Button>
      </Group>
    </Group>
  );
}

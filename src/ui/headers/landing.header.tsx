"use client";
import { Button, Container, Group, Skeleton } from "@mantine/core";
import { IconMessageChatbot } from "@tabler/icons-react";
import { Logo } from "../brand/logo";
import Link from "next/link";
import { Suspense } from "react";
import dynamic from "next/dynamic";

const ColorSchemeToggle = dynamic(
  () => import("@/ui/color-scheme-toggle").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <Skeleton height={32} width={32} radius="xl" />,
  }
);

export function LandingHeader() {
  return (
    <Container>
      <Group justify="space-between" align="center" h={64}>
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
    </Container>
  );
}

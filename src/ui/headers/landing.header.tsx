import dynamic from "next/dynamic";
import { AppShell, Button, Group, Skeleton } from "@mantine/core";
import { IconMessageChatbot } from "@tabler/icons-react";
import { Logo } from "../brand/logo";
import Link from "next/link";

const ColorSchemeToggle = dynamic(
  () => import("@/ui/color-scheme-toggle").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <Skeleton height={36} width={36} radius="xl" />,
  }
);

export function LandingHeader() {
  return (
    <AppShell.Header px="md">
      <Group h="100%" justify="space-between">
        <Logo />
        <Group gap="xs">
          <ColorSchemeToggle />
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
    </AppShell.Header>
  );
}

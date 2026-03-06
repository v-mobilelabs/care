"use client";

import { Container, Stack, Title, Text, Button, ThemeIcon, Group } from "@mantine/core";
import { IconWifiOff, IconRefresh } from "@tabler/icons-react";

export default function OfflinePage() {
  return (
    <Container size="xs" py="3xl">
      <Stack align="center" gap="lg">
        <ThemeIcon size={80} radius="xl" variant="light" color="gray">
          <IconWifiOff size={40} />
        </ThemeIcon>

        <Title order={2} ta="center">
          You&apos;re offline
        </Title>

        <Text c="dimmed" ta="center" maw={360}>
          It looks like you&apos;ve lost your internet connection. Please check
          your network and try again.
        </Text>

        <Group>
          <Button
            leftSection={<IconRefresh size={18} />}
            onClick={() => globalThis.location.reload()}
          >
            Try again
          </Button>
        </Group>
      </Stack>
    </Container>
  );
}

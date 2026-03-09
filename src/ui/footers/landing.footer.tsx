"use client";
import { Group, Text, Anchor, Box, Container, ThemeIcon, Stack } from "@mantine/core";
import { IconHeartbeat } from "@tabler/icons-react";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer>
      <Box p="md" style={{ borderTop: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))" }}>
        <Container>
          <Group justify="space-between" wrap="wrap" gap="sm">
            <Stack gap={2}>
              <Group>
                <ThemeIcon size={36} radius="md" color="primary" variant="light">
                  <IconHeartbeat size={26} />
                </ThemeIcon>
                <Stack gap={1}>
                  <Text size="sm" fw={700} c="primary">CareAI</Text>
                  <Text size="xs" c="dimmed">© {new Date().getFullYear()} — Not a substitute for professional medical advice.</Text>
                </Stack>
              </Group>
            </Stack>
            <Group gap="md">
              <Anchor href="/status" c="dimmed" size="xs" underline="hover">
                System Status
              </Anchor>
              <Anchor component={Link} href="/patient/assistant" size="xs" c="dimmed">Symptom Check</Anchor>
              <Anchor component={Link} href="/privacy" size="xs" c="dimmed">Privacy Policy</Anchor>
              <Anchor component={Link} href="/terms" size="xs" c="dimmed" >Terms &amp; Conditions</Anchor>
            </Group>
          </Group>
        </Container>
      </Box>
    </footer>
  );
}

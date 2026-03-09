import { Group, Text, Anchor } from "@mantine/core";
import { Copyright } from "./copyright";

export function LandingFooter() {
  return (
    <footer>
      <Group justify="center" py="md" gap="xl">
        <Copyright />
        <Text c="dimmed" size="xs">•</Text>
        <Anchor href="/status" c="dimmed" size="xs" underline="hover">
          System Status
        </Anchor>
      </Group>
    </footer>
  );
}

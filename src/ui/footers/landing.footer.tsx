import { Group, Text } from "@mantine/core";
import { Copyright } from "./copyright";

export function LandingFooter() {
  return (
    <footer>
      <Group justify="center" py="md">
        <Copyright />
      </Group>
    </footer>
  );
}

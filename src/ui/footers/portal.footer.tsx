import { Group } from "@mantine/core";
import { Copyright } from "./copyright";

export function PortalFooter() {
  return (
    <footer>
      <Group justify="center" py="md">
        <Copyright />
      </Group>
    </footer>
  );
}

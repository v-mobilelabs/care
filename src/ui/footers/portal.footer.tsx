import { Group, Anchor, Text, Stack, NavLink } from "@mantine/core";
import { Copyright } from "./copyright";
import Link from "next/link";
import { IconChartBar } from "@tabler/icons-react";

export function PortalFooter() {
  return (
    <footer>
      <Stack>
        <Group justify="center" py="md" gap="xl">
          <Copyright />
          <Text c="dimmed" size="xs">•</Text>
        </Group>
        <NavLink leftSection={<IconChartBar size={16} />} component={Link} href="/status" c="dimmed" label="System Status" />
      </Stack>
    </footer>
  );
}

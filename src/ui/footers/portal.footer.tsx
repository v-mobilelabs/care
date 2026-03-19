import { Group, Anchor, Text, Stack, NavLink, Divider } from "@mantine/core";
import { Copyright } from "./copyright";
import Link from "@/ui/link";
import { IconChartBar } from "@tabler/icons-react";

export function PortalFooter() {
  return (
    <footer>
      <Stack gap="0">
        <NavLink leftSection={<IconChartBar size={16} />} component={Link} href="/status" c="dimmed" label="System Status" />
        <Divider />
        <Group justify="center" py="sm">
          <Copyright />
        </Group>
      </Stack>
    </footer>
  );
}

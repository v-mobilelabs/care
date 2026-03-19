import { Box, Group, Text, ThemeIcon } from "@mantine/core";
import { IconHeartbeat } from "@tabler/icons-react";
import Link from "@/ui/link";

export function Logo() {
  return (
    <Box component={Link} href="/" style={{ textDecoration: "none" }}>
      <Group gap={0}>
        <ThemeIcon size={36} radius="md" color="primary" variant="transparent">
          <IconHeartbeat size={26} />
        </ThemeIcon>
        <Text c="primary" size="xl" fw={900}>CareAI</Text>
      </Group>
    </Box>
  );
}

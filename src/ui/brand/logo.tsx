import { Badge, Box, Group, Text, ThemeIcon } from "@mantine/core";
import { IconHeartbeat } from "@tabler/icons-react";
import Link from "@/ui/link";

export function Logo() {
  return (
    <Link href="/" style={{ textDecoration: "none" }}>
      <Box>
        <Group gap={0} align="center">
          <ThemeIcon size={36} radius="md" color="primary" variant="transparent">
            <IconHeartbeat size={26} />
          </ThemeIcon>
          <Text c="primary" size="xl" fw={900}>CareAI</Text>
          <Badge size="xs" variant="light" color="violet" radius="sm" px={5} ml={4} style={{ alignSelf: "flex-start", marginTop: 2 }}>
            Beta
          </Badge>
        </Group>
      </Box>
    </Link>
  );
}

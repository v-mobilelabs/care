import { Group, Text, ThemeIcon } from "@mantine/core";
import { IconHeartbeat } from "@tabler/icons-react";

export function Logo() {
  return (
    <Group gap={6}>
      <ThemeIcon size={26} radius="md" color="primary" variant="light">
        <IconHeartbeat size={15} />
      </ThemeIcon>
      <Text c="primary" size="xl" fw={900}>CareAI</Text>
    </Group>
  );
}

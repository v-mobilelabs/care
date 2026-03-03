import { Stack, Text } from "@mantine/core";

export function Copyright() {
  return (
    <Stack align="center" gap={0}>
      <Text c="dimmed" size="xs">
        &copy; {new Date().getFullYear()} CareAI.
      </Text>
      <Text c="dimmed" size="xs">
        All rights reserved.
      </Text>
    </Stack>
  );
}

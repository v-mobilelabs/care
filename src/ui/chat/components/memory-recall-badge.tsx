"use client";

import { Badge, Group, ThemeIcon } from "@mantine/core";
import { IconBulb } from "@tabler/icons-react";

export function MemoryRecallBadge(
  props: Readonly<{ text: string; date: string }>,
) {
  const { text, date } = props;

  return (
    <Group gap={4} wrap="nowrap">
      <ThemeIcon size={16} radius="md" variant="light" color="primary">
        <IconBulb size={10} />
      </ThemeIcon>
      <Badge
        size="sm"
        variant="light"
        color="indigo"
        radius="sm"
        style={{ fontSize: 11 }}
      >
        Remembered: {text} from {date}
      </Badge>
    </Group>
  );
}

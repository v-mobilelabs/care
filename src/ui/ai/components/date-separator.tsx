"use client";
import { Divider, Text } from "@mantine/core";
import { formatChatDateLabel } from "@/lib/format";

export function DateSeparator({ date }: Readonly<{ date: string }>) {
    return (
        <Divider
            label={
                <Text size="xs" c="dimmed" fw={500}>
                    {formatChatDateLabel(date)}
                </Text>
            }
            labelPosition="center"
            my="xs"
        />
    );
}

"use client";
import { MotionCard } from "@/ui/components/motion-card";
import { Box, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import { useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";

interface HealthCardProps {
    href: string;
    icon: ReactNode;
    color: string;
    title: string;
    description: string;
    meta?: string;
}

export function HealthCard({
    href,
    icon,
    color,
    title,
    description,
    meta,
}: Readonly<HealthCardProps>) {
    const [hovered, setHovered] = useState(false);

    return (
        <Link href={href} style={{ textDecoration: "none", display: "block" }}>
            <MotionCard interactive blobColor="var(--mantine-color-primary-6)"
                withBorder
                radius="lg"
                p="lg"
                h="100%"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    transition: "box-shadow 0.15s ease, transform 0.15s ease",
                    boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.10)" : undefined,
                    transform: hovered ? "translateY(-2px)" : undefined,
                    cursor: "pointer",
                    background: hovered
                        ? "light-dark(var(--mantine-color-gray-0), rgba(255,255,255,0.04))"
                        : undefined,
                }}
            >
                <Stack gap="sm" h="100%">
                    <Group justify="space-between" align="flex-start">
                        <ThemeIcon size={44} radius="xl" variant="light" color={color}>
                            {icon}
                        </ThemeIcon>
                        <Box
                            style={{ opacity: hovered ? 1 : 0.3, transition: "opacity 0.15s ease" }}
                        >
                            <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                        </Box>
                    </Group>
                    <Stack gap={4} style={{ flex: 1 }}>
                        <Text fw={600} size="sm">
                            {title}
                        </Text>
                        <Text size="xs" c="dimmed" lh={1.5}>
                            {description}
                        </Text>
                    </Stack>
                    {meta && (
                        <Text size="xs" c="dimmed" fw={500}>
                            {meta}
                        </Text>
                    )}
                </Stack>
            </MotionCard>
        </Link>
    );
}

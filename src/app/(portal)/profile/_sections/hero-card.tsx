"use client";
import {
    Badge,
    Box,
    Group,
    Paper,
    Text,
    ThemeIcon,
    Tooltip,
} from "@mantine/core";
import {
    IconMapPin,
    IconShieldCheck,
} from "@tabler/icons-react";
import type { ProfileRecord } from "@/app/(portal)/patient/_query";
import { AvatarUpload } from "./avatar-upload";

interface Props {
    email: string | null;
    emailVerified: boolean;
    profile: ProfileRecord | undefined;
    onAvatarUpdated?: (url: string) => void;
}

export function HeroCard({ email, emailVerified, profile, onAvatarUpdated }: Readonly<Props>) {

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden" }}>
            {/* Gradient banner */}
            <Box
                style={{
                    height: 68,
                    background: "linear-gradient(135deg, var(--mantine-color-primary-6) 0%, var(--mantine-color-primary-4) 100%)",
                }}
            />
            <Box px="xl" pb="xl" style={{ position: "relative" }}>
                {/* Clickable avatar overlapping banner */}
                <AvatarUpload
                    src={profile?.photoUrl ?? null}
                    name={profile?.name ?? ""}
                    onUpdated={onAvatarUpdated}
                />

                <Group justify="space-between" align="flex-start" mt="xs" wrap="wrap" gap="xs">
                    <Box>
                        <Group gap={6} align="center">
                            <Text fw={700} size="md" lh={1.2}>
                                {profile?.name ?? "No name set"}
                            </Text>
                            {emailVerified && (
                                <Tooltip label="Email verified" withArrow>
                                    <ThemeIcon size={17} radius="xl" color="success" variant="light">
                                        <IconShieldCheck size={10} />
                                    </ThemeIcon>
                                </Tooltip>
                            )}
                        </Group>
                        <Text size="xs" c="dimmed" mt={2}>{email}</Text>
                    </Box>

                    <Group gap={6} wrap="wrap">
                        <Badge size="sm" variant="light" color="secondary" leftSection={<IconMapPin size={10} />}>
                            {[profile?.city, profile?.country].filter(Boolean).join(", ")}
                        </Badge>
                    </Group>
                </Group>
            </Box>
        </Paper>
    );
}

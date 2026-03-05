"use client";
import {
    Badge,
    Box,
    Group,
    Paper,
    Skeleton,
    Text,
    ThemeIcon,
    Tooltip,
} from "@mantine/core";
import {
    IconActivityHeartbeat,
    IconMapPin,
    IconRuler,
    IconScale,
    IconShieldCheck,
} from "@tabler/icons-react";
import type { ProfileRecord } from "@/app/chat/_query";
import { AvatarUpload } from "./avatar-upload";

interface Props {
    photoURL: string | null;
    email: string | null;
    emailVerified: boolean;
    initials: string;
    healthProfile: ProfileRecord | undefined;
    isProfileLoaded: boolean;
    bmi: { value: number; label: string; color: string } | null;
    onAvatarUpdated?: (url: string) => void;
}

export function HeroCard({ photoURL, email, emailVerified, initials, healthProfile, isProfileLoaded, bmi, onAvatarUpdated }: Readonly<Props>) {

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
                    src={photoURL}
                    initials={initials}
                    onUpdated={onAvatarUpdated}
                />

                <Group justify="space-between" align="flex-start" mt="xs" wrap="wrap" gap="xs">
                    <Box>
                        <Group gap={6} align="center">
                            <Text fw={700} size="md" lh={1.2}>
                                {healthProfile?.name ?? "No name set"}
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

                    {/* Health summary chips */}
                    {isProfileLoaded ? (
                        <Group gap={6} wrap="wrap">
                            {healthProfile?.height && (
                                <Badge size="sm" variant="light" color="blue" leftSection={<IconRuler size={10} />}>
                                    {healthProfile.height} cm
                                </Badge>
                            )}
                            {healthProfile?.weight && (
                                <Badge size="sm" variant="light" color="violet" leftSection={<IconScale size={10} />}>
                                    {healthProfile.weight} kg
                                </Badge>
                            )}
                            {bmi && (
                                <Badge size="sm" variant="light" color={bmi.color} leftSection={<IconActivityHeartbeat size={10} />}>
                                    BMI {bmi.value} · {bmi.label}
                                </Badge>
                            )}
                            {healthProfile?.city && (
                                <Badge size="sm" variant="light" color="secondary" leftSection={<IconMapPin size={10} />}>
                                    {[healthProfile.city, healthProfile.country].filter(Boolean).join(", ")}
                                </Badge>
                            )}
                        </Group>
                    ) : (
                        <Group gap={6}>
                            <Skeleton height={22} width={68} radius="xl" />
                            <Skeleton height={22} width={78} radius="xl" />
                        </Group>
                    )}
                </Group>
            </Box>
        </Paper>
    );
}

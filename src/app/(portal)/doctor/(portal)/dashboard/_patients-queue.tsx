"use client";
import {
    Avatar,
    Badge,
    Box,
    Group,
    Stack,
    Text,
} from "@mantine/core";
import { IconUser, IconUsers } from "@tabler/icons-react";
import { useAuth } from "@/ui/providers/auth-provider";
import { useDoctorCallQueue } from "@/lib/meet/use-doctor-call-queue";
import { colors } from "@/ui/tokens";
import { iosCard, iosRow, iosRowLast, iosSection, ios, allKeyframes } from "@/ui/ios";

const MAX_VISIBLE = 5;

export function PatientsQueue() {
    const { user } = useAuth();
    const queue = useDoctorCallQueue(user?.uid);

    const pending = queue.filter((c) => c.status === "pending");
    const visible = pending.slice(0, MAX_VISIBLE);
    const overflow = pending.length - MAX_VISIBLE;

    return (
        <Box style={{ ...iosCard, animation: ios.animation.fadeSlideUp("50ms") }}>
            <style>{allKeyframes}</style>

            {/* Header */}
            <Box px="lg" pt="lg" pb="sm">
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="xs" wrap="nowrap">
                        <Box
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: "light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--mantine-color-primary-5)",
                            }}
                        >
                            <IconUsers size={18} />
                        </Box>
                        <Text fw={600} size="md">Patients in Queue</Text>
                    </Group>
                    <Badge
                        color={pending.length > 0 ? colors.brand : "gray"}
                        variant="filled"
                        size="lg"
                        radius="xl"
                        style={{
                            minWidth: 32,
                            transition: ios.transition.spring,
                            transform: pending.length > 0 ? "scale(1)" : "scale(0.9)",
                        }}
                    >
                        {pending.length}
                    </Badge>
                </Group>
            </Box>

            {/* Queue list — iOS grouped rows */}
            {visible.length === 0 ? (
                <Box px="lg" pb="lg">
                    <Box
                        py="xl"
                        style={{
                            textAlign: "center",
                            borderRadius: 12,
                            background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))",
                        }}
                    >
                        <IconUsers
                            size={28}
                            color="var(--mantine-color-dimmed)"
                            style={{
                                opacity: 0.4,
                                animation: ios.animation.float,
                            }}
                        />
                        <Text size="sm" c="dimmed" mt="xs">
                            No patients waiting right now.
                        </Text>
                    </Box>
                </Box>
            ) : (
                <Box>
                    {visible.map((call, index) => {
                        const isFirst = index === 0;
                        const isLast = index === visible.length - 1 && overflow <= 0;
                        return (
                            <Box
                                key={call.requestId}
                                px="lg"
                                style={{
                                    ...(isLast ? iosRowLast : iosRow),
                                    background: isFirst
                                        ? "light-dark(rgba(99,102,241,0.04), rgba(99,102,241,0.06))"
                                        : undefined,
                                    animation: ios.animation.fadeSlideUp(ios.stagger(index)),
                                }}
                            >
                                <Group gap="sm" wrap="nowrap">
                                    <Avatar
                                        radius="xl"
                                        size="sm"
                                        color={isFirst ? "primary" : "gray"}
                                        src={call.patientPhotoUrl}
                                        style={{
                                            transition: ios.transition.fast,
                                        }}
                                    >
                                        <IconUser size={14} />
                                    </Avatar>

                                    <Text fw={isFirst ? 600 : 500} size="sm" lineClamp={1} style={{ flex: 1 }}>
                                        {call.patientName}
                                    </Text>

                                    <Badge
                                        variant={isFirst ? "filled" : "light"}
                                        color={isFirst ? "primary" : "gray"}
                                        size="sm"
                                        radius="xl"
                                        style={{ minWidth: 28 }}
                                    >
                                        #{index + 1}
                                    </Badge>
                                </Group>
                            </Box>
                        );
                    })}

                    {overflow > 0 && (
                        <Box px="lg" pb="md" pt="xs">
                            <Text size="xs" c="dimmed" ta="center">
                                +{overflow} more patient{overflow > 1 ? "s" : ""} waiting
                            </Text>
                        </Box>
                    )}
                </Box>
            )}
        </Box>
    );
}

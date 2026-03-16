"use client";
import {
    Card,
    Group,
    Avatar,
    Box,
    Text,
    Badge,
    Tooltip,
    ActionIcon,
} from "@mantine/core";
import {
    IconStethoscope,
    IconShieldCheck,
    IconShieldOff,
    IconMessageCircle,
} from "@tabler/icons-react";
import type { PatientInviteDto } from "@/data/doctor-patients";
import { colors } from "@/ui/tokens";
import { useAuth } from "@/ui/providers/auth-provider";
import { useMessaging } from "@/ui/providers/messaging-provider";
import { startConversation } from "@/lib/messaging/actions";

export function ConnectedDoctorCard({
    invite,
    onRevoke,
}: Readonly<{ invite: PatientInviteDto; onRevoke: (i: PatientInviteDto) => void }>) {
    const { user } = useAuth();
    const { openConversation } = useMessaging();

    async function handleMessage() {
        if (!user) return;
        const convId = await startConversation({
            doctorId: invite.doctorId,
            patientId: user.uid,
            doctorName: invite.doctorName ?? "Doctor",
            patientName: user.displayName ?? "Patient",
        });
        openConversation(convId);
    }

    return (
        <Card withBorder radius="lg" padding={0}>
            <Card.Section withBorder inheritPadding px="md" py="sm">
                <Group gap="sm" wrap="nowrap">
                    <Avatar
                        src={invite.doctorPhotoUrl ?? null}
                        color="primary"
                        name={invite.doctorName ?? "Doctor"}
                        radius={"50%"}
                        size={"md"}
                    />
                    <Box style={{ minWidth: 0, flex: 1 }}>
                        <Group gap="xs" align="center" wrap="nowrap">
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>
                                {invite.doctorName ?? "Unknown Doctor"}
                            </Text>
                            <Badge size="xs" variant="light" color={colors.success}>
                                Connected
                            </Badge>
                        </Group>
                        {invite.doctorSpecialty && (
                            <Group gap={4} mt={2}>
                                <IconStethoscope size={12} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{invite.doctorSpecialty}</Text>
                            </Group>
                        )}
                    </Box>
                </Group>
            </Card.Section>

            <Card.Section
                withBorder
                inheritPadding
                px="md"
                py="xs"
                bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))"
            >
                <Group justify="space-between" align="center">
                    <Group gap={4}>
                        <IconShieldCheck
                            size={12}
                            color={`var(--mantine-color-${colors.success}-6)`}
                        />
                        <Text size="xs" c={colors.success}>Can view your health records</Text>
                    </Group>
                    <Group gap={6} wrap="nowrap">
                        <Text size="10px" c="dimmed">
                            Connected {new Date(invite.updatedAt).toLocaleDateString()}
                        </Text>
                        <Tooltip label="Message doctor">
                            <ActionIcon
                                variant="light"
                                color="primary"
                                size="sm"
                                onClick={() => void handleMessage()}
                                aria-label="Message doctor"
                            >
                                <IconMessageCircle size={14} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Revoke access">
                            <ActionIcon
                                variant="subtle"
                                color="red"
                                size="sm"
                                onClick={() => onRevoke(invite)}
                                aria-label="Revoke access"
                            >
                                <IconShieldOff size={14} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </Card.Section>
        </Card>
    );
}

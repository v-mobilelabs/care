"use client";
import {
    Card,
    Group,
    ThemeIcon,
    Box,
    Text,
    Badge,
    Tooltip,
    ActionIcon,
    Stack,
} from "@mantine/core";
import {
    IconStethoscope,
    IconTrash,
    IconMapPin,
    IconBuildingHospital,
    IconPhone,
    IconWorld,
    IconClock,
    IconStar,
} from "@tabler/icons-react";
import type { DoctorRecord } from "@/app/(portal)/patient/_query";
import { DateText } from "@/ui/DateText";

export function DoctorCard({
    doctor,
    onDelete,
}: Readonly<{ doctor: DoctorRecord; onDelete: () => void }>) {
    const { clinic } = doctor;

    return (
        <Card withBorder radius="lg" padding={0}>
            <Card.Section withBorder inheritPadding px="md" py="sm">
                <Group justify="space-between" wrap="nowrap">
                    <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={36} radius="md" color="primary" variant="light">
                            <IconStethoscope size={18} />
                        </ThemeIcon>
                        <Box style={{ minWidth: 0 }}>
                            <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>
                                {doctor.name}
                            </Text>
                            <Badge size="xs" variant="light" color="primary" mt={2}>
                                {doctor.specialty}
                            </Badge>
                        </Box>
                    </Group>
                    <Tooltip label="Remove doctor">
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={onDelete}
                            aria-label="Delete doctor"
                        >
                            <IconTrash size={14} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Card.Section>

            <Card.Section inheritPadding px="md" py="xs">
                <Group gap={6}>
                    <IconMapPin size={13} color="var(--mantine-color-dimmed)" />
                    <Text size="xs" c="dimmed">{doctor.address}</Text>
                </Group>
            </Card.Section>

            {clinic && (
                <Card.Section withBorder inheritPadding px="md" py="sm">
                    <Stack gap={6}>
                        <Group gap={6}>
                            <IconBuildingHospital size={13} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" fw={600}>{clinic.name}</Text>
                        </Group>
                        {clinic.address && clinic.address !== doctor.address && (
                            <Group gap={6}>
                                <IconMapPin size={13} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{clinic.address}</Text>
                            </Group>
                        )}
                        {clinic.phone && (
                            <Group gap={6}>
                                <IconPhone size={13} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{clinic.phone}</Text>
                            </Group>
                        )}
                        {clinic.website && (
                            <Group gap={6}>
                                <IconWorld size={13} color="var(--mantine-color-dimmed)" />
                                <Text
                                    size="xs"
                                    c="blue"
                                    component="a"
                                    href={clinic.website.startsWith("http") ? clinic.website : `https://${clinic.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ wordBreak: "break-all" }}
                                >
                                    {clinic.website}
                                </Text>
                            </Group>
                        )}
                        {clinic.hours && (
                            <Group gap={6}>
                                <IconClock size={13} color="var(--mantine-color-dimmed)" />
                                <Text size="xs" c="dimmed">{clinic.hours}</Text>
                            </Group>
                        )}
                        {clinic.rating && (
                            <Group gap={6}>
                                <IconStar size={13} color="var(--mantine-color-yellow-5)" />
                                <Text size="xs" c="dimmed">{clinic.rating.toFixed(1)} / 5.0</Text>
                            </Group>
                        )}
                    </Stack>
                </Card.Section>
            )}

            {doctor.notes && (
                <Card.Section inheritPadding px="md" py="xs">
                    <Text size="xs" c="dimmed" fs="italic">{doctor.notes}</Text>
                </Card.Section>
            )}

            <Card.Section
                withBorder
                inheritPadding
                px="md"
                py="xs"
                bg="light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))"
            >
                <Text size="xs" c="dimmed">
                    Added on <DateText date={doctor.createdAt} />
                </Text>
            </Card.Section>
        </Card>
    );
}

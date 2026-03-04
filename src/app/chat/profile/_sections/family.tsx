"use client";
import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Divider,
    Group,
    Paper,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { IconCheck, IconEdit, IconMapPin, IconPlus, IconTrash, IconUser, IconUsers } from "@tabler/icons-react";

import { colors } from "@/ui/tokens";
import {
    useCreateDependentMutation,
    useDeleteDependentMutation,
    useUpdateDependentMutation,
    type DependentRecord,
} from "@/app/chat/_query";
import { DependentForm, SectionHeader } from "../_shared";
import { HealthInfoForm } from "./health-info";
import { LocationForm } from "./location-info";

// ── Dependent detail view (shown when a dependent is active) ──────────────────

export function DependentProfileContent({ dep }: Readonly<{ dep: DependentRecord }>) {
    const updateDependent = useUpdateDependentMutation();

    const initials = [dep.firstName[0], dep.lastName?.[0]]
        .filter(Boolean).join("").toUpperCase() || "?";

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group gap="sm">
                    <ThemeIcon size={34} radius="md" color="primary" variant="light">
                        <IconUser size={18} />
                    </ThemeIcon>
                    <Box>
                        <Group gap="xs" align="center">
                            <Title order={5} lh={1.2}>
                                {dep.firstName}{dep.lastName ? ` ${dep.lastName}` : ""}
                            </Title>
                            <Badge size="sm" variant="light" color="primary">{dep.relationship}</Badge>
                        </Group>
                        <Text size="xs" c="dimmed">Family member profile</Text>
                    </Box>
                </Group>
            </Box>

            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={560} mx="auto">
                        <Stack gap="xl">
                            <Group gap="md">
                                <Avatar size={56} radius="xl" color="primary">{initials}</Avatar>
                                <Box>
                                    <Text fw={600} size="sm">
                                        {dep.firstName}{dep.lastName ? ` ${dep.lastName}` : ""}
                                    </Text>
                                    <Text size="xs" c="dimmed">{dep.relationship}</Text>
                                </Box>
                            </Group>

                            <Paper withBorder radius="lg" p="xl">
                                <Stack gap="md">
                                    <SectionHeader
                                        icon={<IconUser size={16} />}
                                        title="Physical Details"
                                        subtitle="Body metrics used to personalise AI assessments"
                                    />
                                    <Divider />
                                    <HealthInfoForm
                                        key={dep.id}
                                        initial={{
                                            dateOfBirth: dep.dateOfBirth ?? "",
                                            sex: dep.sex ?? "",
                                            height: dep.height,
                                            weight: dep.weight,
                                            activityLevel: dep.activityLevel ?? "",
                                            waistCm: dep.waistCm,
                                            neckCm: dep.neckCm,
                                            hipCm: dep.hipCm,
                                        }}
                                        onSave={(data) => {
                                            updateDependent.mutate(
                                                {
                                                    dependentId: dep.id,
                                                    dateOfBirth: data.dateOfBirth,
                                                    sex: (data.sex as "male" | "female") || undefined,
                                                    height: data.height,
                                                    weight: data.weight,
                                                    activityLevel: (data.activityLevel as DependentRecord["activityLevel"]) || undefined,
                                                    waistCm: data.waistCm,
                                                    neckCm: data.neckCm,
                                                    hipCm: data.hipCm,
                                                },
                                                {
                                                    onSuccess: () =>
                                                        notifications.show({
                                                            title: "Saved",
                                                            message: "Physical details updated.",
                                                            color: colors.success,
                                                            icon: <IconCheck size={16} />,
                                                        }),
                                                },
                                            );
                                        }}
                                        saving={updateDependent.isPending}
                                    />
                                </Stack>
                            </Paper>

                            <Paper withBorder radius="lg" p="xl">
                                <Stack gap="md">
                                    <SectionHeader
                                        icon={<IconMapPin size={16} />}
                                        title="Location"
                                        subtitle="Country and city used to localise recommendations"
                                    />
                                    <Divider />
                                    <LocationForm
                                        key={`${dep.id}-loc`}
                                        initial={{
                                            country: dep.country ?? "",
                                            city: dep.city ?? "",
                                        }}
                                        onSave={(data) => {
                                            updateDependent.mutate(
                                                { dependentId: dep.id, ...data },
                                                {
                                                    onSuccess: () =>
                                                        notifications.show({
                                                            title: "Saved",
                                                            message: "Location updated.",
                                                            color: colors.success,
                                                            icon: <IconCheck size={16} />,
                                                        }),
                                                },
                                            );
                                        }}
                                        saving={updateDependent.isPending}
                                    />
                                </Stack>
                            </Paper>
                        </Stack>
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}

// ── Family members section ────────────────────────────────────────────────────

interface Props {
    dependents: DependentRecord[];
}

export function FamilySection({ dependents }: Readonly<Props>) {
    const createDependent = useCreateDependentMutation();
    const updateDependent = useUpdateDependentMutation();
    const deleteDependent = useDeleteDependentMutation();

    function openModal(existing?: DependentRecord) {
        const isEdit = !!existing;
        modals.open({
            title: isEdit ? "Edit family member" : "Add family member",
            children: (
                <DependentForm
                    existing={existing}
                    onSave={(data) => {
                        if (isEdit && existing) {
                            updateDependent.mutate(
                                { dependentId: existing.id, ...data },
                                {
                                    onSuccess: () => {
                                        notifications.show({ title: "Saved", message: "Family member updated.", color: colors.success, icon: <IconCheck size={16} /> });
                                        modals.closeAll();
                                    },
                                },
                            );
                        } else {
                            createDependent.mutate(data, {
                                onSuccess: () => {
                                    notifications.show({ title: "Added", message: "Family member added.", color: colors.success, icon: <IconCheck size={16} /> });
                                    modals.closeAll();
                                },
                            });
                        }
                    }}
                />
            ),
        });
    }

    function confirmDelete(dep: DependentRecord) {
        modals.openConfirmModal({
            title: "Remove family member?",
            children: (
                <Text size="sm">
                    This will permanently remove <strong>{dep.firstName}</strong> and all their health data.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => deleteDependent.mutate(dep.id),
        });
    }

    return (
        <Paper withBorder radius="lg" p="xl">
            <Stack gap="md">
                <SectionHeader
                    icon={<IconUsers size={16} />}
                    title="Family members"
                    subtitle="Manage health profiles for people in your care"
                    action={
                        <Button variant="light" leftSection={<IconPlus size={16} />} onClick={() => openModal()}>
                            Add
                        </Button>
                    }
                />
                <Divider />

                {dependents.length === 0 ? (
                    <Group
                        gap="sm"
                        p="md"
                        style={{
                            borderRadius: "var(--mantine-radius-md)",
                            background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                            border: "1px dashed light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-5))",
                        }}
                    >
                        <ThemeIcon size={30} radius="md" color="secondary" variant="light">
                            <IconUsers size={15} />
                        </ThemeIcon>
                        <Box>
                            <Text size="sm" fw={500}>No family members yet</Text>
                            <Text size="xs" c="dimmed">Add a dependent to manage their health in one place.</Text>
                        </Box>
                    </Group>
                ) : (
                    <Stack gap={6}>
                        {dependents.map((dep) => {
                            const depInitials = [dep.firstName[0], dep.lastName?.[0]]
                                .filter(Boolean).join("").toUpperCase();
                            return (
                                <Group
                                    key={dep.id}
                                    justify="space-between"
                                    p="sm"
                                    style={{
                                        borderRadius: "var(--mantine-radius-md)",
                                        background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                                        border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                                    }}
                                >
                                    <Group gap="sm">
                                        <Avatar size={34} radius="xl" color="primary" variant="light">
                                            {depInitials || "?"}
                                        </Avatar>
                                        <Box>
                                            <Group gap={6} align="center">
                                                <Text size="sm" fw={600}>
                                                    {dep.firstName}{dep.lastName ? ` ${dep.lastName}` : ""}
                                                </Text>
                                                <Badge size="xs" variant="light" color="primary">{dep.relationship}</Badge>
                                            </Group>
                                            <Group gap={4} mt={2}>
                                                {dep.dateOfBirth && <Text size="xs" c="dimmed">Born {dep.dateOfBirth}</Text>}
                                                {dep.height && <Text size="xs" c="dimmed">· {dep.height} cm</Text>}
                                                {dep.weight && <Text size="xs" c="dimmed">· {dep.weight} kg</Text>}
                                            </Group>
                                        </Box>
                                    </Group>
                                    <Group gap={4}>
                                        <ActionIcon variant="subtle" color="gray" onClick={() => openModal(dep)}>
                                            <IconEdit size={18} />
                                        </ActionIcon>
                                        <ActionIcon variant="subtle" color="red" onClick={() => confirmDelete(dep)}>
                                            <IconTrash size={18} />
                                        </ActionIcon>
                                    </Group>
                                </Group>
                            );
                        })}
                    </Stack>
                )}
            </Stack>
        </Paper>
    );
}

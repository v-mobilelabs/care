"use client";
import { useState } from "react";
import {
    ActionIcon,
    Avatar,
    Badge,
    Box,
    Button,
    Card,
    Group,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconEdit,
    IconHeartbeat,
    IconMapPin,
    IconPlus,
    IconRuler,
    IconScale,
    IconTrash,
    IconUserPlus,
    IconUsers,
} from "@tabler/icons-react";

import { colors } from "@/ui/tokens";
import {
    useDependentsQuery,
    useCreateDependentMutation,
    useUpdateDependentMutation,
    useDeleteDependentMutation,
    type DependentRecord,
} from "@/app/(portal)/patient/_query";
import { DependentForm } from "@/ui/chat/profile/shared";

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob?: string): number | null {
    if (!dob) return null;
    const birth = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age;
}

function calcBmi(h?: number, w?: number): { value: number; label: string; color: string } | null {
    if (!h || !w) return null;
    const v = Math.round((w / ((h / 100) ** 2)) * 10) / 10;
    if (v < 18.5) return { value: v, label: "Underweight", color: "blue" };
    if (v < 25) return { value: v, label: "Normal", color: "teal" };
    if (v < 30) return { value: v, label: "Overweight", color: "orange" };
    return { value: v, label: "Obese", color: "red" };
}

function memberCountLabel(loading: boolean, count: number): string {
    if (loading) return "Loading…";
    if (count === 0) return "No members added yet";
    return count === 1 ? "1 member" : `${count} members`;
}

// ── Member card ───────────────────────────────────────────────────────────────

interface MemberCardProps {
    dep: DependentRecord;
    onEdit: (dep: DependentRecord) => void;
    onDelete: (dep: DependentRecord) => void;
}

function MemberCard({ dep, onEdit, onDelete }: Readonly<MemberCardProps>) {
    const [hovered, setHovered] = useState(false);

    const initials = [dep.firstName[0], dep.lastName?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase() || "?";

    const age = calcAge(dep.dateOfBirth);
    const bmi = calcBmi(dep.height, dep.weight);
    const hasStats = age !== null || dep.height || dep.weight || bmi || dep.city || dep.country;

    return (
        <Card
            withBorder
            radius="lg"
            p="lg"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                transition: "box-shadow 180ms ease, transform 180ms ease",
                boxShadow: hovered ? "var(--mantine-shadow-md)" : undefined,
                transform: hovered ? "translateY(-2px)" : undefined,
            }}
        >
            <Stack gap="md">
                {/* Avatar + name + hover actions */}
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Group gap="md" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Avatar size={52} radius="xl" color="primary" variant="light" style={{ flexShrink: 0 }}>
                            {initials}
                        </Avatar>
                        <Box style={{ minWidth: 0 }}>
                            <Text fw={700} size="md" lh={1.2} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {dep.firstName}{dep.lastName ? ` ${dep.lastName}` : ""}
                            </Text>
                            <Badge mt={5} size="sm" variant="light" color="primary" radius="sm">
                                {dep.relationship}
                            </Badge>
                        </Box>
                    </Group>

                    <Group
                        gap={4}
                        style={{
                            flexShrink: 0,
                            opacity: hovered ? 1 : 0,
                            transition: "opacity 180ms ease",
                        }}
                    >
                        <Tooltip label="Edit" withArrow position="top">
                            <ActionIcon variant="subtle" color="gray" onClick={() => onEdit(dep)}>
                                <IconEdit size={18} />
                            </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Remove" withArrow position="top">
                            <ActionIcon variant="subtle" color="red" onClick={() => onDelete(dep)}>
                                <IconTrash size={18} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>

                {/* Stats badges */}
                {hasStats && (
                    <Group gap={6} wrap="wrap">
                        {age !== null && (
                            <Badge size="sm" variant="light" color="secondary" radius="sm"
                                leftSection={<IconHeartbeat size={10} />}>
                                {age} yrs
                            </Badge>
                        )}
                        {dep.height && (
                            <Badge size="sm" variant="light" color="secondary" radius="sm"
                                leftSection={<IconRuler size={10} />}>
                                {dep.height} cm
                            </Badge>
                        )}
                        {dep.weight && (
                            <Badge size="sm" variant="light" color="secondary" radius="sm"
                                leftSection={<IconScale size={10} />}>
                                {dep.weight} kg
                            </Badge>
                        )}
                        {bmi && (
                            <Badge size="sm" variant="filled" color={bmi.color} radius="sm">
                                BMI {bmi.value} · {bmi.label}
                            </Badge>
                        )}
                        {(dep.city ?? dep.country) && (
                            <Badge size="sm" variant="light" color="secondary" radius="sm"
                                leftSection={<IconMapPin size={10} />}>
                                {dep.city ?? dep.country}
                            </Badge>
                        )}
                    </Group>
                )}

                {/* Mobile-always-visible edit CTA */}
                <Group justify="flex-end">
                    <Button
                        size="xs"
                        variant="subtle"
                        color="gray"
                        leftSection={<IconEdit size={12} />}
                        onClick={() => onEdit(dep)}
                        hiddenFrom="sm"
                    >
                        Edit profile
                    </Button>
                </Group>
            </Stack>
        </Card>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FamilyMembersPage() {
    const { data: dependents = [], isLoading } = useDependentsQuery();
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
                                        notifications.show({
                                            title: "Saved",
                                            message: "Family member updated.",
                                            color: colors.success,
                                            icon: <IconCheck size={16} />,
                                        });
                                        modals.closeAll();
                                    },
                                },
                            );
                        } else {
                            createDependent.mutate(data, {
                                onSuccess: () => {
                                    notifications.show({
                                        title: "Added",
                                        message: "Family member added.",
                                        color: colors.success,
                                        icon: <IconCheck size={16} />,
                                    });
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
                    This will permanently remove <strong>{dep.firstName}</strong> and all their health data. This cannot be undone.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => deleteDependent.mutate(dep.id),
        });
    }

    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Page header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group justify="space-between" align="center">
                    <Group gap="sm">
                        <ThemeIcon size={34} radius="md" color="primary" variant="light">
                            <IconUsers size={18} />
                        </ThemeIcon>
                        <Box>
                            <Title order={5} lh={1.2}>Family Members</Title>
                            <Text size="xs" c="dimmed">
                                {memberCountLabel(isLoading, dependents.length)}
                            </Text>
                        </Box>
                    </Group>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => openModal()}>
                        Add member
                    </Button>
                </Group>
            </Box>

            {/* Content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box px={{ base: "md", sm: "xl" }} py="lg" maw={900} mx="auto">
                        {(() => {
                            if (isLoading) {
                                return (
                                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                        {["sk-a", "sk-b", "sk-c"].map((k) => (
                                            <Skeleton key={k} height={148} radius="lg" />
                                        ))}
                                    </SimpleGrid>
                                );
                            }
                            if (dependents.length === 0) {
                                return (
                                    <Stack align="center" py={80} gap="lg">
                                        <ThemeIcon size={80} radius="xl" color="primary" variant="light">
                                            <IconUserPlus size={40} />
                                        </ThemeIcon>
                                        <Stack align="center" gap={6}>
                                            <Text fw={700} size="lg">No family members yet</Text>
                                            <Text size="sm" c="dimmed" ta="center" maw={340}>
                                                Add a family member to manage their health profile, medications, and records — all in one place.
                                            </Text>
                                        </Stack>
                                        <Button leftSection={<IconPlus size={14} />} onClick={() => openModal()}>
                                            Add family member
                                        </Button>
                                    </Stack>
                                );
                            }
                            return (
                                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                    {dependents.map((dep) => (
                                        <MemberCard
                                            key={dep.id}
                                            dep={dep}
                                            onEdit={openModal}
                                            onDelete={confirmDelete}
                                        />
                                    ))}
                                </SimpleGrid>
                            );
                        })()}
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}

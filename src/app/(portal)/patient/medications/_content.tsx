"use client";
import {
    ActionIcon,
    Box,
    Button,
    Card,
    Container,
    Group,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCapsule,
    IconCheck,
    IconPlus,
} from "@tabler/icons-react";
import { useState } from "react";

import {
    useMedicationsQuery,
    useDeleteMedicationMutation,
    type MedicationRecord,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { MedicationModal } from "./_medication-modal";
import { MedicationCard } from "./_medication-card";
import { MedicationSkeletons, EmptyState } from "./_skeletons";



// ── Medications Content ───────────────────────────────────────────────────────

export function MedicationsContent() {
    const { data: medications = [], isLoading } = useMedicationsQuery();
    const deleteMutation = useDeleteMedicationMutation();
    const [addOpened, { open: openAdd, close: closeAdd }] = useDisclosure(false);
    const [editTarget, setEditTarget] = useState<MedicationRecord | null>(null);

    function handleDelete(id: string, name: string) {
        modals.openConfirmModal({
            title: "Remove medication?",
            children: (
                <Text size="sm">
                    <strong>{name}</strong> will be permanently removed from your medications list.
                </Text>
            ),
            labels: { confirm: "Remove", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMutation.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Medication removed",
                            message: `${name} has been removed.`,
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                });
            },
        });
    }

    // Group by active vs everything else
    const active = medications.filter((m) => m.status === "active" || m.status === "paused");
    const other = medications.filter((m) => m.status === "completed" || m.status === "discontinued");

    return (
        <Container pt="md">
            {/* Add/Edit Modals */}
            <MedicationModal opened={addOpened} onClose={closeAdd} />
            {editTarget && (
                <MedicationModal
                    opened={!!editTarget}
                    onClose={() => setEditTarget(null)}
                    initial={editTarget}
                />
            )}

            <Card radius="xl" shadow="xl">
                <Card.Section px="xl" py="lg" withBorder>
                    <Group justify="space-between" align="center" wrap="nowrap">
                        <Group gap="sm">
                            <ThemeIcon size={36} radius="md" color="violet" variant="light">
                                <IconCapsule size={20} />
                            </ThemeIcon>
                            <Box>
                                <Title order={4} lh={1.2}>My Medications</Title>
                                <Text size="xs" c="dimmed">
                                    {medications.length > 0
                                        ? `${active.filter((m) => m.status === "active").length} active · ${medications.length} total`
                                        : "Manage your medication list"}
                                </Text>
                            </Box>
                        </Group>
                        {/* Mobile: Icon-only button */}
                        <Tooltip label="Add Medication" withArrow hiddenFrom="sm">
                            <ActionIcon
                                size={32}
                                variant="light"
                                color="primary"
                                onClick={openAdd}
                                hiddenFrom="sm"
                                aria-label="Add Medication"
                            >
                                <IconPlus size={16} />
                            </ActionIcon>
                        </Tooltip>
                        {/* Desktop: Full button */}
                        <Button
                            leftSection={<IconPlus size={15} />}
                            size="sm"
                            color="primary"
                            variant="light"
                            onClick={openAdd}
                            visibleFrom="sm"
                        >
                            Add
                        </Button>
                    </Group>
                </Card.Section>
                <Card.Section p="md">
                    <Box style={{ flex: 1, overflow: "hidden" }}>
                        <ScrollArea style={{ height: "100%" }}>
                            <Box maw={800} mx="auto">
                                {isLoading && <MedicationSkeletons />}

                                {!isLoading && medications.length === 0 && (
                                    <EmptyState onAdd={openAdd} />
                                )}

                                {!isLoading && medications.length > 0 && (
                                    <Stack gap="xl">
                                        {/* Active / Paused */}
                                        {active.length > 0 && (
                                            <Box>
                                                <Text
                                                    size="xs"
                                                    fw={700}
                                                    c="dimmed"
                                                    mb="sm"
                                                    style={{ textTransform: "uppercase", letterSpacing: "0.6px" }}
                                                >
                                                    Current
                                                </Text>
                                                <Stack gap="sm">
                                                    {active.map((m) => (
                                                        <MedicationCard
                                                            key={m.id}
                                                            med={m}
                                                            onEdit={() => setEditTarget(m)}
                                                            isPendingDelete={deleteMutation.isPending && deleteMutation.variables === m.id}
                                                            onDelete={() => handleDelete(m.id, m.name)}
                                                        />
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}

                                        {/* Completed / Discontinued */}
                                        {other.length > 0 && (
                                            <Box>
                                                <Text
                                                    size="xs"
                                                    fw={700}
                                                    c="dimmed"
                                                    mb="sm"
                                                    style={{ textTransform: "uppercase", letterSpacing: "0.6px" }}
                                                >
                                                    Past
                                                </Text>
                                                <Stack gap="sm">
                                                    {other.map((m) => (
                                                        <MedicationCard
                                                            key={m.id}
                                                            med={m}
                                                            onEdit={() => setEditTarget(m)}
                                                            isPendingDelete={deleteMutation.isPending && deleteMutation.variables === m.id}
                                                            onDelete={() => handleDelete(m.id, m.name)}
                                                        />
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}
                                    </Stack>
                                )}
                            </Box>
                        </ScrollArea>
                    </Box>
                </Card.Section>
            </Card>
        </Container>
    );
}

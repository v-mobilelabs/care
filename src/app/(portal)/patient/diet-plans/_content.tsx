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
    IconCheck,
    IconLeaf,
    IconPlus,
    IconSalad,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
    useDietPlansQuery,
    useDeleteDietPlanMutation,
} from "@/app/(portal)/patient/_query";
import { colors } from "@/ui/tokens";
import { FoodPreferencesModal } from "./_food-preferences-modal";
import { DietPlanCard } from "./_diet-plan-card";
import { DietPlanSkeletons, EmptyState } from "./_skeletons";

// ── Diet Plans Content ────────────────────────────────────────────────────────

export function DietPlansContent() {
    const { data: plans = [], isLoading } = useDietPlansQuery();
    const deleteMutation = useDeleteDietPlanMutation();
    const router = useRouter();
    const [, startTransition] = useTransition();
    const [prefsOpened, { open: openPrefs, close: closePrefs }] = useDisclosure(false);

    function handleCreateDietPlan() {
        const id = crypto.randomUUID();
        startTransition(() => {
            router.push(`/patient/assistant?id=${id}&message=${encodeURIComponent("I want to build a diet plan")}`);
        });
    }

    function handleDelete(id: string, condition: string) {
        modals.openConfirmModal({
            title: "Delete diet plan?",
            children: (
                <Text size="sm">
                    The diet plan for <strong>{condition}</strong> will be permanently deleted.
                </Text>
            ),
            labels: { confirm: "Delete", cancel: "Cancel" },
            confirmProps: { color: "red" },
            onConfirm: () => {
                deleteMutation.mutate(id, {
                    onSuccess: () =>
                        notifications.show({
                            title: "Diet plan deleted",
                            message: "The diet plan has been removed.",
                            color: colors.success,
                            icon: <IconCheck size={16} />,
                        }),
                });
            },
        });
    }

    return (
        <Container pt="md">
            <FoodPreferencesModal opened={prefsOpened} onClose={closePrefs} />
            <Card radius="xl" shadow="xl">
                <Card.Section px="xl" py="lg" withBorder>
                    <Group justify="space-between" wrap="nowrap" align="center">
                        <Group gap="sm">
                            <ThemeIcon size={36} radius="md" color="green" variant="light">
                                <IconSalad size={20} />
                            </ThemeIcon>
                            <Box>
                                <Title order={4} lh={1.2}>My Diet Plans</Title>
                                <Text size="xs" c="dimmed">
                                    {(() => {
                                        if (plans.length === 0) return "Save AI-generated diet plans for reference";
                                        if (plans.length === 1) return "1 saved plan";
                                        return `${plans.length} saved plans`;
                                    })()}
                                </Text>
                            </Box>
                        </Group>
                        <Group gap="xs">
                            {/* Mobile: Icon-only buttons */}
                            <Tooltip label="Food Preferences" withArrow hiddenFrom="sm">
                                <ActionIcon
                                    size={32}
                                    variant="subtle"
                                    color="green"
                                    onClick={openPrefs}
                                    hiddenFrom="sm"
                                    aria-label="Food Preferences"
                                >
                                    <IconLeaf size={16} />
                                </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Create Diet Plan" withArrow hiddenFrom="sm">
                                <ActionIcon
                                    size={32}
                                    variant="light"
                                    color="green"
                                    onClick={handleCreateDietPlan}
                                    hiddenFrom="sm"
                                    aria-label="Create Diet Plan"
                                >
                                    <IconPlus size={16} />
                                </ActionIcon>
                            </Tooltip>
                            {/* Desktop: Full buttons */}
                            <Button
                                leftSection={<IconLeaf size={16} />}
                                color="green"
                                variant="subtle"
                                size="sm"
                                onClick={openPrefs}
                                visibleFrom="sm"
                            >
                                Preferences
                            </Button>
                            <Button
                                leftSection={<IconPlus size={16} />}
                                color="green"
                                variant="light"
                                size="sm"
                                onClick={handleCreateDietPlan}
                                visibleFrom="sm"
                            >
                                Create diet plan
                            </Button>
                        </Group>
                    </Group>
                </Card.Section>
                <Card.Section p="md">
                    <Box style={{ flex: 1, overflow: "hidden" }}>
                        <ScrollArea style={{ height: "100%" }}>
                            <Box maw={800} mx="auto">
                                {isLoading && <DietPlanSkeletons />}
                                {!isLoading && plans.length === 0 && <EmptyState onCreateDietPlan={handleCreateDietPlan} />}
                                {!isLoading && plans.length > 0 && (
                                    <Stack gap="sm">
                                        {plans.map((plan) => (
                                            <DietPlanCard
                                                key={plan.id}
                                                plan={plan}
                                                isPendingDelete={deleteMutation.isPending && deleteMutation.variables === plan.id}
                                                onDelete={() => handleDelete(plan.id, plan.condition)}
                                            />
                                        ))}
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

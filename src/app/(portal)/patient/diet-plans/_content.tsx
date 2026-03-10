"use client";
import {
    ActionIcon,
    Badge,
    Box,
    Button,
    Card,
    Chip,
    Collapse,
    Container,
    Divider,
    Group,
    List,
    Modal,
    Paper,
    ScrollArea,
    SimpleGrid,
    Skeleton,
    Stack,
    Tabs,
    Text,
    TextInput,
    ThemeIcon,
    Title,
    Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconClock,
    IconFlame,
    IconLeaf,
    IconPlus,
    IconSalad,
    IconScale,
    IconTrash,
    IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useTransition } from "react";

import {
    useDietPlansQuery,
    useDeleteDietPlanMutation,
    useProfileQuery,
    useUpsertProfileMutation,
    type DietPlanRecord,
} from "@/app/(portal)/patient/_query";
import { FOOD_PREFERENCE_SUGGESTIONS } from "../profile/_shared";
import { colors } from "@/ui/tokens";

// ── Food Preferences Modal ──────────────────────────────────────────────────────

function FoodPreferencesModal({
    opened,
    onClose,
}: Readonly<{ opened: boolean; onClose: () => void }>) {
    const { data: profile } = useProfileQuery();
    const upsertProfile = useUpsertProfileMutation();
    const [selected, setSelected] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState("");

    // Sync from profile each time the modal opens
    useEffect(() => {
        if (opened) {
            setSelected(profile?.foodPreferences ?? []);
            setCustomInput("");
        }
    }, [opened, profile?.foodPreferences]);

    const presets = FOOD_PREFERENCE_SUGGESTIONS;
    const customTags = selected.filter((v) => !presets.includes(v));

    function addCustom() {
        const tag = customInput.trim();
        if (!tag || selected.includes(tag)) { setCustomInput(""); return; }
        setSelected([...selected, tag]);
        setCustomInput("");
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Food Preferences"
            centered
            size="md"
        >
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Select your dietary preferences. The AI uses these to personalise every diet plan it generates for you.
                </Text>

                <Stack gap="xs">
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" lh={1}>Quick picks</Text>
                    <Chip.Group
                        multiple
                        value={selected.filter((v) => presets.includes(v))}
                        onChange={(s) => setSelected([...customTags, ...s])}
                    >
                        <Group gap={6} wrap="wrap">
                            {presets.map((pref) => (
                                <Chip key={pref} value={pref} size="xs" variant="light" color="green">
                                    {pref}
                                </Chip>
                            ))}
                        </Group>
                    </Chip.Group>
                </Stack>

                {customTags.length > 0 && (
                    <Stack gap={4}>
                        <Text size="xs" fw={600} c="dimmed" tt="uppercase" lh={1}>Custom</Text>
                        <Group gap={6} wrap="wrap">
                            {customTags.map((tag) => (
                                <Badge
                                    key={tag}
                                    size="sm"
                                    variant="light"
                                    color="green"
                                    rightSection={
                                        <Box
                                            component="span"
                                            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                                            onClick={() => setSelected(selected.filter((v) => v !== tag))}
                                        >
                                            <IconX size={10} />
                                        </Box>
                                    }
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </Group>
                    </Stack>
                )}

                <Group gap="xs" align="flex-end">
                    <TextInput
                        placeholder="Add custom preference…"
                        size="xs"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.currentTarget.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                        style={{ flex: 1 }}
                    />
                    <Button variant="light" color="green" size="xs" leftSection={<IconPlus size={14} />} onClick={addCustom}>
                        Add
                    </Button>
                </Group>

                <Divider />

                <Group justify="flex-end">
                    <Button variant="subtle" color="gray" size="sm" onClick={onClose}>Cancel</Button>
                    <Button
                        color="green"
                        size="sm"
                        leftSection={<IconCheck size={16} />}
                        loading={upsertProfile.isPending}
                        onClick={() => {
                            upsertProfile.mutate({ foodPreferences: selected }, {
                                onSuccess: () => {
                                    notifications.show({
                                        title: "Preferences saved",
                                        message: "Your food preferences have been updated.",
                                        color: colors.success,
                                        icon: <IconCheck size={16} />,
                                    });
                                    onClose();
                                },
                            });
                        }}
                    >
                        Save
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

// ── Diet Plan Card ────────────────────────────────────────────────────────────

function DietPlanCard({ plan, isPendingDelete, onDelete }: Readonly<{
    plan: DietPlanRecord;
    isPendingDelete: boolean;
    onDelete: () => void;
}>) {
    const [expanded, { toggle }] = useDisclosure(false);
    const days = plan.weeklyPlan ?? [];
    const [activeDay, setActiveDay] = useState(days[0]?.day ?? "Monday");
    const selectedDay = days.find((d) => d.day === activeDay) ?? days[0];

    const MEAL_COLORS: Record<string, string> = {
        Breakfast: "orange",
        "Morning Snack": "yellow",
        Lunch: "blue",
        "Afternoon Snack": "grape",
        Dinner: "indigo",
    };

    return (
        <Paper
            withBorder
            radius="lg"
            p={0}
            style={{
                opacity: isPendingDelete ? 0.4 : 1,
                transition: "opacity 150ms ease",
                overflow: "hidden",
                borderLeft: "4px solid var(--mantine-color-green-5)",
            }}
        >
            {/* ── Header — tinted green ── */}
            <Box
                px="md"
                pt="md"
                pb="sm"
                style={{
                    background: "light-dark(var(--mantine-color-green-0), rgba(0,0,0,0.2))",
                }}
            >
                <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }} align="flex-start">
                        <ThemeIcon
                            size={36}
                            radius="md"
                            color="green"
                            variant="filled"
                            style={{ flexShrink: 0, marginTop: 2 }}
                        >
                            <IconSalad size={18} />
                        </ThemeIcon>
                        <Box style={{ minWidth: 0 }}>
                            <Text fw={700} size="sm" lineClamp={2}>
                                Diet Plan · {plan.condition}
                            </Text>
                            <Group gap={6} mt={4} wrap="wrap">
                                {plan.weeklyWeightLossEstimate && (
                                    <Badge size="xs" color="green" variant="filled" radius="sm" leftSection={<IconScale size={10} />}>
                                        {plan.weeklyWeightLossEstimate}
                                    </Badge>
                                )}
                                {plan.totalDailyCalories && (
                                    <Badge size="xs" color="orange" variant="light" radius="sm" leftSection={<IconFlame size={10} />}>
                                        {plan.totalDailyCalories} kcal/day
                                    </Badge>
                                )}
                                {!plan.weeklyWeightLossEstimate && plan.recommended.length > 0 && (
                                    <Badge size="xs" variant="light" color="green" radius="sm">
                                        {plan.recommended.length} foods to eat
                                    </Badge>
                                )}
                                {!plan.weeklyWeightLossEstimate && plan.avoid.length > 0 && (
                                    <Badge size="xs" variant="light" color="red" radius="sm">
                                        {plan.avoid.length} to avoid
                                    </Badge>
                                )}
                                <Text size="xs" c="dimmed">{formatDate(plan.createdAt)}</Text>
                            </Group>
                        </Box>
                    </Group>

                    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }} align="center">
                        <ActionIcon
                            size={28}
                            variant="subtle"
                            color="gray"
                            onClick={toggle}
                            aria-label={expanded ? "Collapse" : "Expand"}
                        >
                            {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                        </ActionIcon>
                        <Tooltip label="Delete" withArrow>
                            <ActionIcon
                                size={28}
                                variant="subtle"
                                color="red"
                                onClick={onDelete}
                                disabled={isPendingDelete}
                                aria-label="Delete diet plan"
                            >
                                <IconTrash size={14} />
                            </ActionIcon>
                        </Tooltip>
                    </Group>
                </Group>
            </Box>

            {/* ── Overview — always visible ── */}
            <Box px="md" py="sm">
                <Text size="sm" c="dimmed" lh={1.6}>
                    {plan.overview}
                </Text>
            </Box>

            {/* ── Expandable details ── */}
            <Collapse in={expanded}>
                <Divider />
                <Box px="md" py="sm">
                    <Stack gap="md">

                        {/* ── Weekly plan (Mon–Sun tabs) ── */}
                        {days.length > 0 && (
                            <Box>
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" mb={8} style={{ letterSpacing: "0.5px" }}>Weekly Schedule</Text>
                                <ScrollArea type="never" offsetScrollbars={false}>
                                    <Tabs
                                        value={activeDay}
                                        onChange={(v) => { if (v) setActiveDay(v); }}
                                        variant="pills"
                                        styles={{
                                            list: { gap: 4, flexWrap: "nowrap", marginBottom: 12 },
                                            tab: { paddingInline: 10, paddingBlock: 4, fontSize: "0.75rem", fontWeight: 600 },
                                        }}
                                    >
                                        <Tabs.List>
                                            {days.map((d) => (
                                                <Tabs.Tab key={d.day} value={d.day}>{d.day.slice(0, 3)}</Tabs.Tab>
                                            ))}
                                        </Tabs.List>
                                    </Tabs>
                                </ScrollArea>
                                {selectedDay && (
                                    <Stack gap="xs">
                                        <Group justify="space-between" mb={4}>
                                            <Text size="xs" fw={600} c="dimmed">{selectedDay.day}</Text>
                                            <Badge size="xs" color="orange" variant="light" leftSection={<IconFlame size={10} />}>
                                                {selectedDay.totalCalories} kcal
                                            </Badge>
                                        </Group>
                                        {selectedDay.meals.map((meal) => {
                                            const mc = MEAL_COLORS[meal.name] ?? "green";
                                            return (
                                                <Paper key={meal.name} withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
                                                    <Box px="sm" py={6} style={{ background: `light-dark(var(--mantine-color-${mc}-0), rgba(0,0,0,0.15))` }}>
                                                        <Group justify="space-between" wrap="nowrap">
                                                            <Group gap={6}>
                                                                <ThemeIcon size={20} radius="sm" color={mc} variant="light"><IconClock size={12} /></ThemeIcon>
                                                                <Text size="xs" fw={700}>{meal.name}</Text>
                                                                <Text size="xs" c="dimmed">{meal.time}</Text>
                                                            </Group>
                                                            <Badge size="xs" color={mc} variant="light">{meal.totalCalories} kcal</Badge>
                                                        </Group>
                                                    </Box>
                                                    <Stack gap={0}>
                                                        {meal.foods.map((food, fi) => (
                                                            <Box key={food.item} px="sm" py={7} style={{ borderTop: fi > 0 ? "1px solid light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" : undefined }}>
                                                                {/* ── Name row ── */}
                                                                <Group justify="space-between" wrap="nowrap" gap="xs" mb={2}>
                                                                    <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                                                                        {food.dietaryType && (
                                                                            <Tooltip
                                                                                label={(() => {
                                                                                    if (food.dietaryType === "veg") return "Vegetarian";
                                                                                    if (food.dietaryType === "vegan") return "Vegan";
                                                                                    return "Non-Vegetarian";
                                                                                })()}
                                                                                withArrow
                                                                            >
                                                                                <Box
                                                                                    style={{
                                                                                        width: 13,
                                                                                        height: 13,
                                                                                        borderRadius: "50%",
                                                                                        flexShrink: 0,
                                                                                        display: "flex",
                                                                                        alignItems: "center",
                                                                                        justifyContent: "center",
                                                                                        background: (() => {
                                                                                            if (food.dietaryType === "non-veg") return "var(--mantine-color-red-6)";
                                                                                            if (food.dietaryType === "vegan") return "var(--mantine-color-teal-6)";
                                                                                            return "var(--mantine-color-green-6)";
                                                                                        })(),
                                                                                    }}
                                                                                >
                                                                                    {food.dietaryType === "vegan" && (
                                                                                        <IconLeaf size={8} color="white" />
                                                                                    )}
                                                                                </Box>
                                                                            </Tooltip>
                                                                        )}
                                                                        <Text size="sm" fw={500} lh={1.3} style={{ minWidth: 0 }}>{food.item}</Text>
                                                                    </Group>
                                                                    <Badge size="sm" color="gray" variant="outline" style={{ flexShrink: 0 }}>{food.calories} kcal</Badge>
                                                                </Group>
                                                                {/* ── Portion ── */}
                                                                <Text size="xs" c="dimmed" mb={food.nutrition ?? (food.allergens && food.allergens.length > 0) ? 4 : 0}>
                                                                    {food.portion}
                                                                </Text>
                                                                {/* ── Nutrition facts ── */}
                                                                {food.nutrition && (
                                                                    <Group gap={4} mb={food.allergens && food.allergens.length > 0 ? 4 : 0} wrap="wrap">
                                                                        {([
                                                                            { label: "Protein", short: "P", value: food.nutrition.protein, color: "blue" },
                                                                            { label: "Carbs", short: "C", value: food.nutrition.carbs, color: "orange" },
                                                                            { label: "Fat", short: "F", value: food.nutrition.fat, color: "yellow" },
                                                                            { label: "Fiber", short: "Fi", value: food.nutrition.fiber, color: "teal" },
                                                                        ] as const).map(({ label, short, value, color }) => (
                                                                            <Tooltip key={short} label={`${label}: ${value}g`} withArrow>
                                                                                <Badge size="xs" variant="light" color={color} radius="sm" style={{ cursor: "default" }}>
                                                                                    {short} {value}g
                                                                                </Badge>
                                                                            </Tooltip>
                                                                        ))}
                                                                    </Group>
                                                                )}
                                                                {/* ── Allergens ── */}
                                                                {food.allergens && food.allergens.length > 0 && (
                                                                    <Group gap={4} wrap="wrap">
                                                                        {food.allergens.map((allergen) => (
                                                                            <Badge key={allergen} size="xs" variant="dot" color="red" radius="sm">
                                                                                {allergen}
                                                                            </Badge>
                                                                        ))}
                                                                    </Group>
                                                                )}
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                </Paper>
                                            );
                                        })}
                                    </Stack>
                                )}
                            </Box>
                        )}

                        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
                            {plan.recommended.length > 0 && (
                                <Stack gap={8}>
                                    <Text
                                        size="xs"
                                        fw={700}
                                        c="green"
                                        style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
                                    >
                                        Eat more of
                                    </Text>
                                    <Stack gap={6}>
                                        {plan.recommended.map((r, i) => (
                                            // eslint-disable-next-line react/no-array-index-key
                                            <Box key={i}>
                                                <Group gap={6} align="flex-start" wrap="nowrap">
                                                    <IconCheck
                                                        size={12}
                                                        color="var(--mantine-color-green-6)"
                                                        style={{ flexShrink: 0, marginTop: 3 }}
                                                    />
                                                    <Box>
                                                        <Text size="sm" fw={500}>{r.food}</Text>
                                                        <Text size="xs" c="dimmed">{r.reason}</Text>
                                                    </Box>
                                                </Group>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Stack>
                            )}
                            {plan.avoid.length > 0 && (
                                <Stack gap={8}>
                                    <Text
                                        size="xs"
                                        fw={700}
                                        c="red"
                                        style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
                                    >
                                        Limit or avoid
                                    </Text>
                                    <Stack gap={6}>
                                        {plan.avoid.map((a, i) => (
                                            // eslint-disable-next-line react/no-array-index-key
                                            <Box key={i}>
                                                <Group gap={6} align="flex-start" wrap="nowrap">
                                                    <IconX
                                                        size={12}
                                                        color="var(--mantine-color-red-6)"
                                                        style={{ flexShrink: 0, marginTop: 3 }}
                                                    />
                                                    <Box>
                                                        <Text size="sm" fw={500}>{a.food}</Text>
                                                        <Text size="xs" c="dimmed">{a.reason}</Text>
                                                    </Box>
                                                </Group>
                                            </Box>
                                        ))}
                                    </Stack>
                                </Stack>
                            )}
                        </SimpleGrid>

                        {plan.tips.length > 0 && (
                            <Box>
                                <Text
                                    size="xs"
                                    fw={700}
                                    c="dimmed"
                                    mb={8}
                                    style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
                                >
                                    Practical tips
                                </Text>
                                <List size="sm" spacing={4}>
                                    {plan.tips.map((tip, i) => (
                                        // eslint-disable-next-line react/no-array-index-key
                                        <List.Item key={i}>
                                            <Text size="sm" c="dimmed">{tip}</Text>
                                        </List.Item>
                                    ))}
                                </List>
                            </Box>
                        )}
                    </Stack>
                </Box>
            </Collapse>
        </Paper>
    );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function DietPlanSkeletons() {
    return (
        <Stack gap="sm">
            {["sk-a", "sk-b", "sk-c"].map((k) => (
                <Skeleton key={k} height={100} radius="lg" />
            ))}
        </Stack>
    );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onCreateDietPlan }: Readonly<{ onCreateDietPlan: () => void }>) {
    return (
        <Box py={80} style={{ textAlign: "center" }}>
            <ThemeIcon size={64} radius="xl" color="green" variant="light" mx="auto" mb="md">
                <IconSalad size={32} />
            </ThemeIcon>
            <Text fw={600} size="sm" mb={6}>No diet plans saved yet</Text>
            <Text size="sm" c="dimmed" maw={320} mx="auto" lh={1.6} mb="lg">
                When the AI generates a diet plan during your session, you can save it here by tapping &ldquo;Save plan&rdquo; on the diet card.
            </Text>
            <Button
                leftSection={<IconPlus size={16} />}
                color="green"
                variant="light"
                onClick={onCreateDietPlan}
            >
                Create diet plan
            </Button>
        </Box>
    );
}

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

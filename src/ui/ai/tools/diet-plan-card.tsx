"use client";
import { ActionIcon, Badge, Box, Collapse, Group, List, Paper, ScrollArea, SimpleGrid, Stack, Tabs, Text, ThemeIcon, UnstyledButton } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconBookmark, IconBookmarkFilled, IconCheck, IconChevronDown, IconClock, IconFlame, IconSalad, IconScale, IconShoppingCart } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAddDietPlanMutation, useDietPlansQuery } from "@/app/(portal)/patient/_query";
import { useChatContext } from "@/ui/chat/context/chat-context";
import type { DietPlanInput } from "@/app/(portal)/patient/_types";
import { colors } from "@/ui/tokens";

export interface DietPlanCardProps {
    data: DietPlanInput;
}

export function DietPlanCard({ data }: Readonly<DietPlanCardProps>) {
    const addDietPlan = useAddDietPlanMutation();
    const { sessionId } = useChatContext();
    const { data: allPlans = [] } = useDietPlansQuery();
    const [guideOpen, { toggle: toggleGuide }] = useDisclosure(false);
    const [groceryOpen, { toggle: toggleGrocery }] = useDisclosure(false);
    const autoSavedRef = useRef(false);

    // Determine if a plan already exists for this session (e.g. page reload)
    const existingPlan = allPlans.find((p) => p.sessionId === sessionId);
    const [saved, setSaved] = useState(!!existingPlan);

    const days = data.weeklyPlan ?? [];
    const firstDay = days[0]?.day ?? "Monday";
    const [activeDay, setActiveDay] = useState(firstDay);

    // Auto-save (upsert) as soon as the plan card mounts.
    // Skipped if a plan already exists for this session (e.g. on page reload).
    useEffect(() => {
        if (autoSavedRef.current || existingPlan) return;
        autoSavedRef.current = true;
        addDietPlan.mutate(
            {
                sessionId,
                condition: data.condition,
                overview: data.overview,
                weeklyWeightLossEstimate: data.weeklyWeightLossEstimate,
                totalDailyCalories: data.totalDailyCalories,
                weeklyPlan: data.weeklyPlan,
                recommended: data.recommended,
                avoid: data.avoid,
                tips: data.tips,
            },
            {
                onSuccess: () => {
                    setSaved(true);
                    notifications.show({ title: "Diet plan saved", message: "Plan saved to your Diet Plans.", color: "teal", icon: <IconCheck size={16} /> });
                },
            },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const selectedDay = days.find((d) => d.day === activeDay) ?? days[0];

    const MEAL_COLORS: Record<string, string> = {
        Breakfast: "orange",
        "Morning Snack": "yellow",
        Lunch: "blue",
        "Afternoon Snack": "grape",
        Dinner: "indigo",
    };

    function handleSave() {
        if (saved) return;
        addDietPlan.mutate(
            {
                sessionId,
                condition: data.condition,
                overview: data.overview,
                weeklyWeightLossEstimate: data.weeklyWeightLossEstimate,
                totalDailyCalories: data.totalDailyCalories,
                weeklyPlan: data.weeklyPlan,
                recommended: data.recommended,
                avoid: data.avoid,
                tips: data.tips,
            },
            {
                onSuccess: () => {
                    setSaved(true);
                    notifications.show({ title: "Diet plan saved", message: "Plan saved to your Diet Plans.", color: "teal", icon: <IconCheck size={16} /> });
                },
            },
        );
    }

    return (
        <Paper withBorder radius="lg" p={0} style={{ overflow: "hidden", borderLeft: "4px solid var(--mantine-color-green-5)" }}>

            {/* ── Header ── */}
            <Box
                px="md" pt="md" pb="sm"
                style={{ background: "light-dark(var(--mantine-color-green-0), rgba(0,0,0,0.2))" }}
            >
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Group gap="sm" wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 0 }}>
                        <ThemeIcon size={40} radius="md" color="green" variant="filled" style={{ flexShrink: 0, marginTop: 2 }}>
                            <IconSalad size={22} />
                        </ThemeIcon>
                        <Box style={{ minWidth: 0 }}>
                            <Text size="xs" c="dimmed" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>Diet Plan</Text>
                            <Text fw={700} size="sm" lh={1.2}>{data.condition}</Text>
                            <Group gap={6} wrap="wrap" mt={4}>
                                {data.weeklyWeightLossEstimate && (
                                    <Badge size="xs" color="green" variant="filled" radius="sm" leftSection={<IconScale size={10} />}>
                                        {data.weeklyWeightLossEstimate}
                                    </Badge>
                                )}
                                {data.totalDailyCalories != null && data.totalDailyCalories > 0 && (
                                    <Badge size="xs" color="orange" variant="light" radius="sm" leftSection={<IconFlame size={10} />}>
                                        {data.totalDailyCalories} kcal/day
                                    </Badge>
                                )}
                            </Group>
                        </Box>
                    </Group>
                    <ActionIcon
                        size={32}
                        variant={saved ? "filled" : "subtle"}
                        color={saved ? "teal" : "gray"}
                        onClick={handleSave}
                        disabled={saved || addDietPlan.isPending}
                        loading={addDietPlan.isPending}
                        title={saved ? "Saved" : "Save plan"}
                        style={{ flexShrink: 0 }}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {saved ? (
                                <motion.div
                                    key="saved"
                                    initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <IconBookmarkFilled size={16} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="unsaved"
                                    initial={{ scale: 0.5, opacity: 0, rotate: 20 }}
                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                    exit={{ scale: 0.5, opacity: 0, rotate: -20 }}
                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                >
                                    <IconBookmark size={16} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </ActionIcon>
                </Group>
            </Box>

            {/* ── Overview ── */}
            <Box px="md" py="sm" style={{ borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))" }}>
                <Text size="sm" c="dimmed" lh={1.6}>{data.overview}</Text>
            </Box>

            {/* ── Day tabs (Mon–Sun) ── */}
            {days.length > 0 && (
                <Box>
                    <ScrollArea type="never" offsetScrollbars={false}>
                        <Tabs
                            value={activeDay}
                            onChange={(v) => { if (v) setActiveDay(v); }}
                            variant="pills"
                            styles={{
                                list: { gap: 4, padding: "10px 12px", flexWrap: "nowrap", borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))" },
                                tab: { paddingInline: 10, paddingBlock: 4, fontSize: "0.75rem", fontWeight: 600 },
                            }}
                        >
                            <Tabs.List>
                                {days.map((d) => (
                                    <Tabs.Tab key={d.day} value={d.day}>
                                        {d.day.slice(0, 3)}
                                    </Tabs.Tab>
                                ))}
                            </Tabs.List>
                        </Tabs>
                    </ScrollArea>

                    {/* Selected day meals */}
                    {selectedDay && (
                        <Stack gap={0} px="md" py="sm">
                            <Group justify="space-between" mb="sm">
                                <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }}>
                                    {selectedDay.day}
                                </Text>
                                <Badge size="sm" color="orange" variant="light" leftSection={<IconFlame size={11} />}>
                                    {selectedDay.totalCalories} kcal total
                                </Badge>
                            </Group>

                            <Stack gap="xs">
                                {selectedDay.meals.map((meal) => {
                                    const mealColor = MEAL_COLORS[meal.name] ?? "green";
                                    return (
                                        <Paper key={meal.name} withBorder radius="md" p={0} style={{ overflow: "hidden" }}>
                                            {/* Meal header */}
                                            <Box
                                                px="sm" py={6}
                                                style={{ background: `light-dark(var(--mantine-color-${mealColor}-0), rgba(0,0,0,0.15))` }}
                                            >
                                                <Group justify="space-between" wrap="nowrap">
                                                    <Group gap={6}>
                                                        <ThemeIcon size={22} radius="sm" color={mealColor} variant="light">
                                                            <IconClock size={13} />
                                                        </ThemeIcon>
                                                        <Text size="xs" fw={700}>{meal.name}</Text>
                                                        <Text size="xs" c="dimmed">{meal.time}</Text>
                                                    </Group>
                                                    <Badge size="xs" color={mealColor} variant="light">
                                                        {meal.totalCalories} kcal
                                                    </Badge>
                                                </Group>
                                            </Box>
                                            {/* Foods */}
                                            <Stack gap={0}>
                                                {meal.foods.map((food, fi) => (
                                                    <Box
                                                        key={food.item}
                                                        px="sm" py={6}
                                                        style={{
                                                            borderTop: fi > 0 ? "1px solid light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" : undefined,
                                                        }}
                                                    >
                                                        <Group justify="space-between" wrap="nowrap" gap="xs">
                                                            <Box style={{ flex: 1, minWidth: 0 }}>
                                                                <Text size="sm" fw={500} lh={1.3}>{food.item}</Text>
                                                                <Text size="xs" c="dimmed">{food.portion}</Text>
                                                            </Box>
                                                            <Badge size="sm" color="gray" variant="outline" style={{ flexShrink: 0 }}>
                                                                {food.calories} kcal
                                                            </Badge>
                                                        </Group>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        </Paper>
                                    );
                                })}
                            </Stack>
                        </Stack>
                    )}
                </Box>
            )}

            {/* ── Diet guide (foods to eat/avoid + tips) ── */}
            {(data.recommended.length > 0 || data.avoid.length > 0 || data.tips.length > 0) && (
                <Box style={{ borderTop: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))" }}>
                    <UnstyledButton
                        onClick={toggleGuide}
                        px="md" py="sm"
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    >
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }}>Diet Guide &amp; Tips</Text>
                        <IconChevronDown size={14} style={{ transform: guideOpen ? "rotate(180deg)" : undefined, transition: "transform 150ms" }} />
                    </UnstyledButton>
                    <Collapse in={guideOpen}>
                        <Box px="md" pb="md">
                            <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md" mb={data.tips.length > 0 ? "sm" : 0}>
                                {data.recommended.length > 0 && (
                                    <Stack gap={6}>
                                        <Text size="xs" fw={700} c="green" tt="uppercase" style={{ letterSpacing: "0.5px" }}>Eat more of</Text>
                                        {data.recommended.map((r) => (
                                            <Box key={r.food}>
                                                <Text size="sm" fw={500}>{r.food}</Text>
                                                <Text size="xs" c="dimmed">{r.reason}</Text>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                                {data.avoid.length > 0 && (
                                    <Stack gap={6}>
                                        <Text size="xs" fw={700} c="red" tt="uppercase" style={{ letterSpacing: "0.5px" }}>Limit or avoid</Text>
                                        {data.avoid.map((a) => (
                                            <Box key={a.food}>
                                                <Text size="sm" fw={500}>{a.food}</Text>
                                                <Text size="xs" c="dimmed">{a.reason}</Text>
                                            </Box>
                                        ))}
                                    </Stack>
                                )}
                            </SimpleGrid>
                            {data.tips.length > 0 && (
                                <>
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }} mb={4}>Practical tips</Text>
                                    <List size="sm" spacing={3}>
                                        {data.tips.map((t) => <List.Item key={t}>{t}</List.Item>)}
                                    </List>
                                </>
                            )}
                        </Box>
                    </Collapse>
                </Box>
            )}

            {/* ── Grocery List ── */}
            {data.groceryList && data.groceryList.categories.length > 0 && (
                <Box style={{ borderTop: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))" }}>
                    <UnstyledButton
                        onClick={toggleGrocery}
                        px="md" py="sm"
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                    >
                        <Group gap="xs">
                            <ThemeIcon size={20} radius="sm" color={colors.brand} variant="light">
                                <IconShoppingCart size={12} />
                            </ThemeIcon>
                            <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.5px" }}>
                                Grocery List ({data.groceryList.totalItems} items)
                            </Text>
                        </Group>
                        <IconChevronDown size={14} style={{ transform: groceryOpen ? "rotate(180deg)" : undefined, transition: "transform 150ms" }} />
                    </UnstyledButton>
                    <Collapse in={groceryOpen}>
                        <Box px="md" pb="md">
                            <Text size="xs" c="dimmed" mb="sm">
                                Week of {data.groceryList.weekOf}
                            </Text>
                            <Stack gap="md">
                                {data.groceryList.categories.map((cat) => (
                                    <Box key={cat.category}>
                                        <Group gap={6} mb={6}>
                                            <Badge size="sm" color={colors.brand} variant="light">
                                                {cat.items.length}
                                            </Badge>
                                            <Text size="xs" fw={700} tt="uppercase" style={{ letterSpacing: "0.5px" }}>
                                                {cat.category}
                                            </Text>
                                        </Group>
                                        <Stack gap={4}>
                                            {cat.items.map((item) => (
                                                <Group key={item.name} justify="space-between" wrap="nowrap" gap="xs">
                                                    <Box style={{ flex: 1, minWidth: 0 }}>
                                                        <Text size="sm" fw={500} lh={1.3}>
                                                            {item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                                                            {item.isStaple && (
                                                                <Badge size="xs" color="gray" variant="dot" ml={4}>
                                                                    Staple
                                                                </Badge>
                                                            )}
                                                        </Text>
                                                        {item.alternatives.length > 0 && (
                                                            <Text size="xs" c="dimmed">
                                                                Alt: {item.alternatives.slice(0, 2).join(", ")}
                                                            </Text>
                                                        )}
                                                    </Box>
                                                    <Badge size="sm" color="gray" variant="outline" style={{ flexShrink: 0 }}>
                                                        {item.quantity}
                                                    </Badge>
                                                </Group>
                                            ))}
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    </Collapse>
                </Box>
            )}
        </Paper>
    );
}

"use client";
import { Accordion, Badge, Box, Card, Divider, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconSalad } from "@tabler/icons-react";
import type { EnhancedDietDay, EnhancedFood, EnhancedMeal } from "@/data/diet-plans/models/nutrition.model";

// ── Constants ─────────────────────────────────────────────────────────────────

const MEAL_META: Record<string, { emoji: string; label: string }> = {
    breakfast: { emoji: "🌅", label: "Breakfast" },
    lunch: { emoji: "☀️", label: "Lunch" },
    snack: { emoji: "🍎", label: "Snack" },
    dinner: { emoji: "🌙", label: "Dinner" },
};

const MEAL_ORDER = ["breakfast", "lunch", "snack", "dinner"] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function MacroText({ label, value }: Readonly<{ label: string; value: number }>) {
    return (
        <Text size="xs" c="dimmed">
            <Text span fw={600}>{Math.round(value)}</Text>g {label}
        </Text>
    );
}

function dietTypeColor(type: string): string {
    if (type === "non-veg") return "red";
    return type === "vegan" ? "teal" : "green";
}

function FoodInfo({ food }: Readonly<{ food: EnhancedFood }>) {
    return (
        <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
            <Text size="sm" fw={500} truncate>{food.item}</Text>
            <Badge size="xs" variant="dot" color={dietTypeColor(food.dietaryType)}>{food.dietaryType}</Badge>
        </Group>
    );
}

function FoodStats({ food }: Readonly<{ food: EnhancedFood }>) {
    return (
        <Group gap={8} wrap="nowrap" style={{ flexShrink: 0 }}>
            <Text size="xs" c="dimmed" fw={500}>{food.weight_grams}g</Text>
            <Badge size="sm" variant="light" color="orange">{Math.round(food.calories)} cal</Badge>
        </Group>
    );
}

function FoodRow({ food }: Readonly<{ food: EnhancedFood }>) {
    return (
        <Box>
            <Group gap="xs" wrap="nowrap" justify="space-between">
                <FoodInfo food={food} />
                <FoodStats food={food} />
            </Group>
            {food.ingredients.length > 0 && (
                <Text size="xs" c="dimmed" style={{ paddingLeft: 2 }}>{food.ingredients.join(", ")}</Text>
            )}
        </Box>
    );
}

function MealControl({ mealKey, meal }: Readonly<{ mealKey: string; meal: EnhancedMeal }>) {
    const meta = MEAL_META[mealKey] ?? { emoji: "🍽️", label: mealKey };
    return (
        <Group gap="sm" wrap="nowrap">
            <Text size="sm">{meta.emoji}</Text>
            <Text size="sm" fw={600}>{meta.label}</Text>
            {meal.time && <Text size="xs" c="dimmed">{meal.time}</Text>}
            <Box style={{ flex: 1 }} />
            <Text size="xs" fw={600} c="dimmed">{Math.round(meal.totalCalories)} cal</Text>
        </Group>
    );
}

function MacroRow({ macros }: Readonly<{ macros: { protein_g: number; carbs_g: number; fats_g: number; fiber_g: number } }>) {
    return (
        <Group gap="md">
            <MacroText label="protein" value={macros.protein_g} />
            <MacroText label="carbs" value={macros.carbs_g} />
            <MacroText label="fat" value={macros.fats_g} />
            <MacroText label="fiber" value={macros.fiber_g} />
        </Group>
    );
}

function MealPanel({ mealKey, meal }: Readonly<{ mealKey: string; meal: EnhancedMeal }>) {
    return (
        <Accordion.Item value={mealKey}>
            <Accordion.Control>
                <MealControl mealKey={mealKey} meal={meal} />
            </Accordion.Control>
            <Accordion.Panel>
                <Stack gap={6}>
                    {meal.foods.map((food, i) => (
                        <FoodRow key={i} food={food} />
                    ))}
                    <Divider mt={4} mb={2} />
                    <MacroRow macros={meal.totalMacros} />
                </Stack>
            </Accordion.Panel>
        </Accordion.Item>
    );
}

function DayBadge({ dayNumber, dayName }: Readonly<{ dayNumber: number; dayName: string }>) {
    return (
        <Group gap="xs" wrap="nowrap">
            <ThemeIcon size={28} radius="md" color="teal" variant="filled">
                <IconSalad size={15} />
            </ThemeIcon>
            <Box>
                <Text size="xs" c="teal" fw={500} style={{ lineHeight: 1, marginBottom: 1 }}>
                    Day {dayNumber}
                </Text>
                <Text fw={700} size="sm" style={{ lineHeight: 1.3 }}>{dayName}</Text>
            </Box>
        </Group>
    );
}

function DayHeader({ data }: Readonly<{ data: EnhancedDietDay }>) {
    return (
        <Card.Section withBorder p="sm" m="0" style={{
            background: "light-dark(var(--mantine-color-teal-0), var(--mantine-color-dark-8))",
        }}>
            <Group gap="sm" wrap="nowrap" justify="space-between">
                <DayBadge dayNumber={data.day_number} dayName={data.day} />
                <Badge color="teal" variant="filled" size="lg" radius="sm">
                    {Math.round(data.dailyTotals.calories)} cal
                </Badge>
            </Group>
            <MacroRow macros={data.dailyTotals} />
        </Card.Section>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DietDayCard({ data }: Readonly<{ data: EnhancedDietDay }>) {
    return (
        <Card withBorder p={0} radius="lg" style={{ overflow: "hidden" }}>
            <DayHeader data={data} />
            <Accordion multiple chevronPosition="right">
                {MEAL_ORDER.map((key) => (
                    <MealPanel key={key} mealKey={key} meal={data.meals[key]} />
                ))}
            </Accordion>
        </Card>
    );
}

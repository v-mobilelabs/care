"use client";
import {
    Badge,
    Box,
    Button,
    Chip,
    Divider,
    Group,
    NumberInput,
    Paper,
    RingProgress,
    Select,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { IconActivityHeartbeat, IconCheck, IconLeaf, IconPlus, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { colors } from "@/ui/tokens";
import type { ProfileRecord } from "@/app/chat/_query";
import {
    COUNTRIES,
    FOOD_PREFERENCE_SUGGESTIONS,
    SectionHeader,
    bmiInfo,
    dateToIso,
    isoToDate,
    parseDMY,
} from "../_shared";

// ── Form types ────────────────────────────────────────────────────────────────

interface HealthInfoValues {
    dateOfBirth: Date | null;
    height: number | undefined;
    weight: number | undefined;
    country: string;
    city: string;
    foodPreferences: string[];
}

// ── Food preference chip picker ───────────────────────────────────────────────

function FoodPreferencePicker({
    value,
    onChange,
}: Readonly<{ value: string[]; onChange: (v: string[]) => void }>) {
    const [customInput, setCustomInput] = useState("");

    function addCustom() {
        const tag = customInput.trim();
        if (!tag || value.includes(tag)) { setCustomInput(""); return; }
        onChange([...value, tag]);
        setCustomInput("");
    }

    function removeCustom(tag: string) {
        onChange(value.filter((v) => v !== tag));
    }

    const presets = FOOD_PREFERENCE_SUGGESTIONS;
    const customTags = value.filter((v) => !presets.includes(v));

    return (
        <Stack gap="xs">
            <Text size="xs" fw={500} c="dimmed" tt="uppercase" lh={1}>Presets</Text>
            <Chip.Group multiple value={value.filter((v) => presets.includes(v))} onChange={(selected) => {
                // Keep custom tags, replace preset selection
                onChange([...customTags, ...selected]);
            }}>
                <Group gap={6} wrap="wrap">
                    {presets.map((pref) => (
                        <Chip key={pref} value={pref} size="xs" variant="light">
                            {pref}
                        </Chip>
                    ))}
                </Group>
            </Chip.Group>

            {/* Custom tags */}
            {customTags.length > 0 && (
                <Group gap={6} wrap="wrap">
                    {customTags.map((tag) => (
                        <Badge
                            key={tag}
                            size="sm"
                            variant="light"
                            color="secondary"
                            rightSection={
                                <Box
                                    component="span"
                                    style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                                    onClick={() => removeCustom(tag)}
                                >
                                    <IconX size={10} />
                                </Box>
                            }
                        >
                            {tag}
                        </Badge>
                    ))}
                </Group>
            )}

            {/* Add custom */}
            <Group gap="xs" align="flex-end">
                <TextInput
                    placeholder="Add custom preference…"
                    size="xs"
                    value={customInput}
                    onChange={(e) => setCustomInput(e.currentTarget.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                    style={{ flex: 1 }}
                />
                <Button variant="light" color="primary" leftSection={<IconPlus size={16} />} onClick={addCustom}>
                    Add
                </Button>
            </Group>
        </Stack>
    );
}

// ── Health Info Form ──────────────────────────────────────────────────────────

interface FormProps {
    initial: Omit<HealthInfoValues, "dateOfBirth"> & { dateOfBirth: string };
    onSave: (data: Omit<HealthInfoValues, "dateOfBirth"> & { dateOfBirth?: string }) => void;
    saving: boolean;
    bmi: { value: number; label: string; color: string } | null;
}

function HealthInfoForm({ initial, onSave, saving, bmi }: Readonly<FormProps>) {
    const form = useForm<HealthInfoValues>({
        initialValues: { ...initial, dateOfBirth: isoToDate(initial.dateOfBirth) },
    });

    return (
        <form onSubmit={form.onSubmit((v) => onSave({ ...v, dateOfBirth: dateToIso(v.dateOfBirth) }))}>
            <Stack gap="md">
                {/* BMI summary */}
                {bmi && (
                    <Group
                        gap="md"
                        p="sm"
                        style={{
                            borderRadius: "var(--mantine-radius-md)",
                            background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))",
                        }}
                    >
                        <RingProgress
                            size={56}
                            thickness={5}
                            roundCaps
                            sections={[{ value: Math.min((bmi.value / 40) * 100, 100), color: bmi.color }]}
                            label={<Text size="xs" fw={700} ta="center" lh={1}>{bmi.value}</Text>}
                        />
                        <Box>
                            <Text size="sm" fw={600}>BMI · {bmi.label}</Text>
                            <Text size="xs" c="dimmed">Based on your height &amp; weight</Text>
                            <Badge size="xs" mt={4} variant="light" color={bmi.color}>{bmi.value} kg/m²</Badge>
                        </Box>
                    </Group>
                )}

                <DateInput
                    size="sm"
                    label="Date of birth"
                    placeholder="DD/MM/YYYY"
                    valueFormat="DD/MM/YYYY"
                    dateParser={parseDMY}
                    maxDate={new Date()}
                    clearable
                    {...form.getInputProps("dateOfBirth")}
                />

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <NumberInput size="sm" label="Height (cm)" placeholder="170" min={50} max={300} {...form.getInputProps("height")} />
                    <NumberInput size="sm" label="Weight (kg)" placeholder="70" min={10} max={500} decimalScale={1} {...form.getInputProps("weight")} />
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <Select size="sm" label="Country" placeholder="Select country" searchable data={COUNTRIES} {...form.getInputProps("country")} />
                    <TextInput size="sm" label="City" placeholder="Chennai" {...form.getInputProps("city")} />
                </SimpleGrid>

                {/* Food preferences */}
                <Stack gap={6}>
                    <Text size="sm" fw={500}>Food preferences</Text>
                    <Text size="xs" c="dimmed">Select all that apply, or add your own</Text>
                    <FoodPreferencePicker
                        value={form.values.foodPreferences}
                        onChange={(v) => form.setFieldValue("foodPreferences", v)}
                    />
                </Stack>

                <Group justify="flex-end" mt={4}>
                    <Button type="submit" color="primary" loading={saving} leftSection={<IconCheck size={16} />}>
                        Save
                    </Button>
                </Group>
            </Stack>
        </form>
    );
}

// ── Section ───────────────────────────────────────────────────────────────────

interface SectionProps {
    healthProfile: ProfileRecord | undefined;
    upsertProfile: {
        mutate: (data: Partial<ProfileRecord>, options?: { onSuccess?: () => void }) => void;
        isPending: boolean;
    };
}

export function HealthInfoSection({ healthProfile, upsertProfile }: Readonly<SectionProps>) {
    const bmi =
        healthProfile?.height && healthProfile?.weight
            ? bmiInfo(healthProfile.height, healthProfile.weight)
            : null;

    return (
        <Paper withBorder radius="lg" p="xl">
            <Stack gap="md">
                <SectionHeader
                    icon={<IconActivityHeartbeat size={16} />}
                    title="Health information"
                    subtitle="Personalises AI responses and calculates metrics like BMI"
                />
                <Divider />
                <HealthInfoForm
                    key={healthProfile ? "loaded" : "loading"}
                    initial={{
                        dateOfBirth: healthProfile?.dateOfBirth ?? "",
                        height: healthProfile?.height,
                        weight: healthProfile?.weight,
                        country: healthProfile?.country ?? "",
                        city: healthProfile?.city ?? "",
                        foodPreferences: healthProfile?.foodPreferences ?? [],
                    }}
                    onSave={(data) => {
                        upsertProfile.mutate(data, {
                            onSuccess: () =>
                                notifications.show({
                                    title: "Saved",
                                    message: "Health info updated.",
                                    color: colors.success,
                                    icon: <IconCheck size={16} />,
                                }),
                        });
                    }}
                    saving={upsertProfile.isPending}
                    bmi={bmi}
                />
            </Stack>
        </Paper>
    );
}

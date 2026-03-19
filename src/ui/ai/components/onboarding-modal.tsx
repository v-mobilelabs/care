"use client";
import {
    Button,
    Divider,
    Group,
    Modal,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconActivity, IconUser } from "@tabler/icons-react";
import { useState } from "react";

import { colors, spacing } from "@/ui/tokens";
import {
    useUpdateIdentityMutation,
    useUpsertPatientMutation,
    type ProfileRecord,
    type PatientRecord,
} from "@/ui/ai/query";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingModalProps {
    readonly opened: boolean;
    /** Whether base identity fields are complete (name, phone, gender, country) */
    readonly profileComplete: boolean;
    /** Whether patient health fields are complete (DOB, sex, height, weight, activityLevel).
     *  Pass true for doctors — they skip the health layer. */
    readonly patientProfileComplete: boolean;
    readonly currentProfile?: ProfileRecord;
    readonly currentPatient?: PatientRecord;
    readonly onComplete: () => void;
}

interface FormValues {
    // Layer 1 — identity
    name: string;
    phone: string;
    gender: string;
    country: string;
    // Layer 2 — health
    dateOfBirth: string;
    sex: string;
    height: string;
    weight: string;
    activityLevel: string;
}

const GENDER_OPTIONS = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
    { value: "Prefer not to say", label: "Prefer not to say" },
];

const SEX_OPTIONS = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
];

const ACTIVITY_OPTIONS = [
    { value: "sedentary", label: "Sedentary — little or no exercise" },
    { value: "light", label: "Light — 1–3 days / week" },
    { value: "moderate", label: "Moderate — 3–5 days / week" },
    { value: "active", label: "Active — 6–7 days / week" },
    { value: "very_active", label: "Very Active — hard exercise daily" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function OnboardingModal({
    opened,
    profileComplete,
    patientProfileComplete,
    currentProfile,
    currentPatient,
    onComplete,
}: OnboardingModalProps) {
    const [loading, setLoading] = useState(false);
    const updateIdentity = useUpdateIdentityMutation();
    const upsertPatient = useUpsertPatientMutation();

    const form = useForm<FormValues>({
        initialValues: {
            name: currentProfile?.name ?? "",
            phone: currentProfile?.phone ?? "",
            gender: currentProfile?.gender ?? "",
            country: currentProfile?.country ?? "",
            dateOfBirth: currentPatient?.dateOfBirth ?? "",
            sex: currentPatient?.sex ?? "",
            height: currentPatient?.height ? String(currentPatient.height) : "",
            weight: currentPatient?.weight ? String(currentPatient.weight) : "",
            activityLevel: currentPatient?.activityLevel ?? "",
        },
        validate: {
            name: (v) =>
                !profileComplete && !v.trim() ? "Full name is required" : null,
            phone: (v) =>
                !profileComplete && !v.trim() ? "Phone number is required" : null,
            gender: (v) =>
                !profileComplete && !v ? "Please select your gender" : null,
            country: (v) =>
                !profileComplete && !v.trim() ? "Country is required" : null,
            dateOfBirth: (v) =>
                !patientProfileComplete && !v.trim()
                    ? "Date of birth is required"
                    : null,
            sex: (v) =>
                !patientProfileComplete && !v
                    ? "Please select your biological sex"
                    : null,
            height: (v) => {
                if (patientProfileComplete) return null;
                if (!v) return "Height is required";
                if (isNaN(Number(v)) || Number(v) <= 0) return "Enter a valid height";
                return null;
            },
            weight: (v) => {
                if (patientProfileComplete) return null;
                if (!v) return "Weight is required";
                if (isNaN(Number(v)) || Number(v) <= 0) return "Enter a valid weight";
                return null;
            },
            activityLevel: (v) =>
                !patientProfileComplete && !v
                    ? "Please select your activity level"
                    : null,
        },
    });

    async function handleSubmit(values: FormValues) {
        setLoading(true);
        try {
            const tasks: Promise<unknown>[] = [];

            if (!profileComplete) {
                tasks.push(
                    updateIdentity.mutateAsync({
                        name: values.name.trim(),
                        phone: values.phone.trim(),
                        gender: values.gender,
                        country: values.country.trim(),
                    }),
                );
            }

            if (!patientProfileComplete) {
                tasks.push(
                    upsertPatient.mutateAsync({
                        dateOfBirth: values.dateOfBirth.trim(),
                        sex: values.sex as "male" | "female",
                        height: Number(values.height),
                        weight: Number(values.weight),
                        activityLevel: values.activityLevel as PatientRecord["activityLevel"],
                    }),
                );
            }

            await Promise.all(tasks);
            onComplete();
        } catch {
            // mutations already show notifications on error
        } finally {
            setLoading(false);
        }
    }

    const needsIdentity = !profileComplete;
    const needsHealth = !patientProfileComplete;

    return (
        <Modal
            opened={opened}
            onClose={() => {
                /* intentionally non-closeable */
            }}
            withCloseButton={false}
            closeOnClickOutside={false}
            closeOnEscape={false}
            size="md"
            radius="lg"
            centered
            title={
                <Stack gap={2}>
                    <Title order={4}>Welcome to CareAI 👋</Title>
                    <Text size="sm" c="dimmed">
                        Just a few quick details to personalise your care.
                    </Text>
                </Stack>
            }
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap={spacing.md}>
                    {needsIdentity && (
                        <Stack gap={spacing.sm}>
                            <Group gap={6}>
                                <IconUser size={15} color={colors.brand} />
                                <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                                    Your Identity
                                </Text>
                            </Group>

                            <TextInput
                                label="Full name"
                                placeholder="Jane Smith"
                                {...form.getInputProps("name")}
                            />
                            <TextInput
                                label="Phone number"
                                placeholder="+1 555 000 0000"
                                {...form.getInputProps("phone")}
                            />
                            <Select
                                label="Gender"
                                placeholder="Select gender"
                                data={GENDER_OPTIONS}
                                {...form.getInputProps("gender")}
                            />
                            <TextInput
                                label="Country"
                                placeholder="United States"
                                {...form.getInputProps("country")}
                            />
                        </Stack>
                    )}

                    {needsIdentity && needsHealth && <Divider />}

                    {needsHealth && (
                        <Stack gap={spacing.sm}>
                            <Group gap={6}>
                                <IconActivity size={15} color={colors.success} />
                                <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                                    Health Profile
                                </Text>
                            </Group>

                            <TextInput
                                label="Date of birth"
                                placeholder="DD/MM/YYYY"
                                {...form.getInputProps("dateOfBirth")}
                            />
                            <Select
                                label="Biological sex"
                                placeholder="Select sex"
                                data={SEX_OPTIONS}
                                {...form.getInputProps("sex")}
                            />
                            <Group grow>
                                <NumberInput
                                    label="Height (cm)"
                                    placeholder="170"
                                    min={50}
                                    max={300}
                                    value={form.values.height === "" ? "" : Number(form.values.height)}
                                    onChange={(v) =>
                                        form.setFieldValue("height", v === "" ? "" : String(v))
                                    }
                                    error={form.errors.height}
                                />
                                <NumberInput
                                    label="Weight (kg)"
                                    placeholder="70"
                                    min={10}
                                    max={500}
                                    value={form.values.weight === "" ? "" : Number(form.values.weight)}
                                    onChange={(v) =>
                                        form.setFieldValue("weight", v === "" ? "" : String(v))
                                    }
                                    error={form.errors.weight}
                                />
                            </Group>
                            <Select
                                label="Activity level"
                                placeholder="How active are you?"
                                data={ACTIVITY_OPTIONS}
                                {...form.getInputProps("activityLevel")}
                            />
                        </Stack>
                    )}

                    <Button type="submit" loading={loading} fullWidth mt={spacing.xs}>
                        Continue to Chat
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}

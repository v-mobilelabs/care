"use client";
import {
    Box,
    Button,
    Chip,
    Group,
    Modal,
    Radio,
    Select,
    Slider,
    Stack,
    Stepper,
    Text,
    TextInput,
    Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconActivity, IconAlertTriangle, IconUser } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { colors, spacing } from "@/ui/tokens";
import { COUNTRIES, FOOD_PREFERENCE_SUGGESTIONS } from "@/ui/ai/profile/shared";
import {
    useUpdateIdentityMutation,
    useUpsertPatientMutation,
    type ProfileRecord,
    type PatientRecord,
} from "@/ui/ai/query";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OnboardingModalProps {
    readonly opened: boolean;
    /** Whether base identity fields are complete (name, phone, gender, preferredLanguage, country, DOB) */
    readonly profileComplete: boolean;
    /** Whether patient health fields are complete (height, weight, activityLevel).
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
    preferredLanguage: string;
    location: string;
    dateOfBirth: string;
    gender: string;
    country: string;
    // Layer 2 — health
    height: string;
    weight: string;
    activityLevel: string;
    foodPreferences: string[];
    allergies: string[];
}

const GENDER_OPTIONS = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
];

const PREFERRED_LANGUAGE_OPTIONS = [
    "English",
    "Hindi",
    "Tamil",
    "Telugu",
    "Kannada",
    "Malayalam",
    "Marathi",
    "Gujarati",
    "Bengali",
    "Punjabi",
    "Urdu",
    "Spanish",
    "French",
    "German",
    "Arabic",
    "Mandarin Chinese",
    "Japanese",
    "Other",
];

const ACTIVITY_OPTIONS = [
    { value: "sedentary", label: "Sedentary — little or no exercise" },
    { value: "light", label: "Light — 1–3 days / week" },
    { value: "moderate", label: "Moderate — 3–5 days / week" },
    { value: "active", label: "Active — 6–7 days / week" },
    { value: "very_active", label: "Very Active — hard exercise daily" },
];

const HEIGHT_MARKS = [
    { value: 120, label: "120" },
    { value: 160, label: "160" },
    { value: 200, label: "200" },
];

const WEIGHT_MARKS = [
    { value: 30, label: "30" },
    { value: 70, label: "70" },
    { value: 120, label: "120" },
];

const ALLERGY_SUGGESTIONS = [
    "No known allergies",
    "Peanuts",
    "Tree nuts",
    "Milk / dairy",
    "Egg",
    "Soy",
    "Wheat / gluten",
    "Shellfish",
    "Fish",
    "Sesame",
    "Penicillin",
    "Sulfa drugs",
];

function isPositiveNumber(value: string): boolean {
    if (value.trim() === "") {
        return false;
    }

    return Number(value) > 0;
}

// ── Component ─────────────────────────────────────────────────────────────────

// eslint-disable-next-line max-lines-per-function
export function OnboardingModal({
    opened,
    profileComplete,
    patientProfileComplete,
    currentProfile,
    currentPatient,
    onComplete,
}: OnboardingModalProps) {
    const [loading, setLoading] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const updateIdentity = useUpdateIdentityMutation();
    const upsertPatient = useUpsertPatientMutation();

    const needsIdentity = !profileComplete;
    const needsHealth = !patientProfileComplete;

    const visibleStepKeys = [
        ...(needsIdentity ? ["identity"] : []),
        ...(needsHealth ? ["health"] : []),
    ] as const;

    function getCurrentStepKey(stepIndex: number): "identity" | "health" {
        const key = visibleStepKeys[stepIndex];
        return key === "health" ? "health" : "identity";
    }

    function isLastStep(stepIndex: number): boolean {
        return stepIndex >= visibleStepKeys.length - 1;
    }

    function getForwardButtonLabel(stepIndex: number): string {
        const key = getCurrentStepKey(stepIndex);
        if (key === "identity" && !isLastStep(stepIndex)) {
            return "Next: Health";
        }

        return "Save & Continue";
    }

    function getBackButtonLabel(stepIndex: number): string {
        const key = getCurrentStepKey(stepIndex);
        if (key === "health") {
            return "Back: Identity";
        }

        return "Back";
    }

    function isIdentityStepValid(values: FormValues): boolean {
        return (
            values.name.trim() !== "" &&
            values.phone.trim() !== "" &&
            values.preferredLanguage.trim() !== "" &&
            values.location.trim() !== "" &&
            values.dateOfBirth.trim() !== "" &&
            values.gender !== "" &&
            values.country.trim() !== ""
        );
    }

    function isHealthStepValid(values: FormValues): boolean {
        return (
            isPositiveNumber(values.height) &&
            isPositiveNumber(values.weight) &&
            values.activityLevel !== ""
        );
    }

    function canProceedFromCurrentStep(values: FormValues): boolean {
        const key = getCurrentStepKey(activeStep);
        if (key === "identity") {
            return isIdentityStepValid(values);
        }

        return isHealthStepValid(values);
    }

    function validateStepFields(stepIndex: number): boolean {
        const key = getCurrentStepKey(stepIndex);
        if (key === "identity") {
            form.validateField("name");
            form.validateField("phone");
            form.validateField("preferredLanguage");
            form.validateField("location");
            form.validateField("dateOfBirth");
            form.validateField("gender");
            form.validateField("country");

            return isIdentityStepValid(form.values);
        }

        if (key === "health") {
            form.validateField("height");
            form.validateField("weight");
            form.validateField("activityLevel");

            return isHealthStepValid(form.values);
        }

        return true;
    }

    async function saveIdentityStep(values: FormValues): Promise<void> {
        await updateIdentity.mutateAsync({
            name: values.name.trim(),
            phone: values.phone.trim(),
            preferredLanguage: values.preferredLanguage.trim(),
            gender: values.gender,
            city: values.location.trim(),
            country: values.country.trim(),
            dateOfBirth: values.dateOfBirth.trim(),
        });
    }

    async function saveHealthStep(values: FormValues): Promise<void> {
        await upsertPatient.mutateAsync({
            height: Number(values.height),
            weight: Number(values.weight),
            activityLevel: values.activityLevel as PatientRecord["activityLevel"],
            foodPreferences:
                values.foodPreferences.length > 0
                    ? values.foodPreferences
                    : undefined,
            allergies: values.allergies,
        });
    }

    async function saveStepBeforeNext(stepIndex: number, values: FormValues): Promise<void> {
        const key = getCurrentStepKey(stepIndex);
        if (key === "identity") {
            await saveIdentityStep(values);
            return;
        }

        if (key === "health") {
            await saveHealthStep(values);
        }
    }

    async function goToNextStep(): Promise<void> {
        const isValid = validateStepFields(activeStep);
        if (!isValid) {
            return;
        }

        setLoading(true);
        try {
            await saveStepBeforeNext(activeStep, form.values);
            setActiveStep((current) => Math.min(current + 1, visibleStepKeys.length - 1));
        } catch {
            // mutations already show notifications on error
        } finally {
            setLoading(false);
        }
    }

    function goToPreviousStep(): void {
        setActiveStep((current) => Math.max(current - 1, 0));
    }

    useEffect(() => {
        if (!opened) {
            setDismissed(false);
            return;
        }

        setActiveStep(0);
    }, [opened, needsHealth, needsIdentity]);

    const form = useForm<FormValues>({
        validateInputOnChange: true,
        initialValues: {
            name: currentProfile?.name ?? "",
            phone: currentProfile?.phone ?? "",
            preferredLanguage: currentProfile?.preferredLanguage ?? "",
            location: currentProfile?.city ?? "",
            dateOfBirth: currentProfile?.dateOfBirth ?? "",
            gender:
                currentProfile?.gender === "Prefer not to say"
                    ? ""
                    : (currentProfile?.gender ?? ""),
            country: currentProfile?.country ?? "",
            height: currentPatient?.height ? String(currentPatient.height) : "170",
            weight: currentPatient?.weight ? String(currentPatient.weight) : "70",
            activityLevel: currentPatient?.activityLevel ?? "",
            foodPreferences: currentPatient?.foodPreferences ?? [],
            allergies: currentPatient?.allergies ?? [],
        },
        validate: {
            name: (v) =>
                !profileComplete && !v.trim() ? "Full name is required" : null,
            phone: (v) =>
                !profileComplete && !v.trim() ? "Phone number is required" : null,
            preferredLanguage: (v) =>
                !profileComplete && !v.trim()
                    ? "Preferred language is required"
                    : null,
            gender: (v) =>
                (() => {
                    if (!profileComplete && !v) {
                        return "Please select your gender";
                    }

                    if (v === "Prefer not to say") {
                        return "Please select a valid gender";
                    }

                    return null;
                })(),
            country: (v) =>
                !profileComplete && !v.trim() ? "Country is required" : null,
            location: (v) =>
                !profileComplete && !v.trim() ? "Location is required" : null,
            dateOfBirth: (v) =>
                !profileComplete && !v.trim()
                    ? "Date of birth is required"
                    : null,
            height: (v) => {
                if (patientProfileComplete) return null;
                if (!v) return "Height is required";
                if (Number.isNaN(Number(v)) || Number(v) <= 0) return "Enter a valid height";
                return null;
            },
            weight: (v) => {
                if (patientProfileComplete) return null;
                if (!v) return "Weight is required";
                if (Number.isNaN(Number(v)) || Number(v) <= 0) return "Enter a valid weight";
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
                tasks.push(saveIdentityStep(values));
            }

            if (!patientProfileComplete) {
                tasks.push(saveHealthStep(values));
            }

            await Promise.all(tasks);
            setDismissed(true);
            onComplete();
        } catch {
            // mutations already show notifications on error
        } finally {
            setLoading(false);
        }
    }

    return (
        <Modal
            opened={opened && !dismissed}
            onClose={() => setDismissed(true)}
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
                    <Text size="xs" fw={600} c="dimmed">
                        Step {activeStep + 1} of {visibleStepKeys.length}
                    </Text>
                </Stack>
            }
        >
            <form onSubmit={form.onSubmit(handleSubmit)}>
                <Stack gap={spacing.md}>
                    <Box style={{ overflowX: "auto" }}>
                        <Stepper
                            active={activeStep}
                            allowNextStepsSelect={false}
                            size="sm"
                            styles={{
                                steps: { flexWrap: "nowrap" },
                                step: { whiteSpace: "nowrap" },
                                stepLabel: { whiteSpace: "nowrap" },
                                stepDescription: { whiteSpace: "nowrap" },
                            }}
                        >
                            {needsIdentity && (
                                <Stepper.Step
                                    icon={<IconUser size={14} />}
                                    label="Your Identity"
                                    description="Basic profile"
                                >
                                    <Stack gap={spacing.sm} mt={spacing.sm}>
                                        <Group gap={6}>
                                            <IconUser size={15} color={colors.brand} />
                                            <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                                                Your Identity
                                            </Text>
                                        </Group>

                                        {(() => {
                                            if (needsIdentity) {
                                                return (
                                                    <>
                                                        <TextInput
                                                            size="sm"
                                                            label="Full name"
                                                            placeholder="Jane Smith"
                                                            {...form.getInputProps("name")}
                                                        />
                                                        <TextInput
                                                            size="sm"
                                                            label="Phone number"
                                                            placeholder="+1 555 000 0000"
                                                            {...form.getInputProps("phone")}
                                                        />
                                                        <Select
                                                            size="sm"
                                                            label="Preferred language"
                                                            placeholder="Select preferred language"
                                                            searchable
                                                            data={PREFERRED_LANGUAGE_OPTIONS}
                                                            {...form.getInputProps("preferredLanguage")}
                                                        />
                                                        <Radio.Group
                                                            label="Gender"
                                                            {...form.getInputProps("gender")}
                                                        >
                                                            <Group mt={6}>
                                                                {GENDER_OPTIONS.map((option) => (
                                                                    <Radio
                                                                        key={option.value}
                                                                        size="sm"
                                                                        value={option.value}
                                                                        label={option.label}
                                                                    />
                                                                ))}
                                                            </Group>
                                                        </Radio.Group>
                                                        <TextInput
                                                            size="sm"
                                                            label="Location"
                                                            placeholder="Chennai"
                                                            {...form.getInputProps("location")}
                                                        />
                                                        <TextInput
                                                            size="sm"
                                                            label="Date of birth"
                                                            placeholder="DD/MM/YYYY"
                                                            {...form.getInputProps("dateOfBirth")}
                                                        />
                                                        <Select
                                                            size="sm"
                                                            label="Country"
                                                            placeholder="Select country"
                                                            searchable
                                                            data={COUNTRIES}
                                                            {...form.getInputProps("country")}
                                                        />
                                                    </>
                                                );
                                            }

                                            return (
                                                <Text size="sm" c="dimmed">
                                                    Identity details are already complete.
                                                </Text>
                                            );
                                        })()}
                                    </Stack>
                                </Stepper.Step>
                            )}

                            {needsHealth && (
                                <Stepper.Step
                                    icon={<IconActivity size={14} />}
                                    label="Health"
                                    description="Vitals, activity, food"
                                >
                                    <Stack gap="md" mt={spacing.sm}>
                                        <Group gap={6}>
                                            <IconActivity size={15} color={colors.success} />
                                            <Text size="xs" fw={600} tt="uppercase" c="dimmed">
                                                Health Profile
                                            </Text>
                                        </Group>

                                        {(() => {
                                            if (needsHealth) {
                                                return (
                                                    <>
                                                        <Group grow align="flex-start" gap="md">
                                                            <Stack gap="xs">
                                                                <Text size="sm" fw={500}>
                                                                    Height (cm)
                                                                </Text>
                                                                <Slider
                                                                    size="sm"
                                                                    min={120}
                                                                    max={220}
                                                                    step={1}
                                                                    marks={HEIGHT_MARKS}
                                                                    value={form.values.height === "" ? 170 : Number(form.values.height)}
                                                                    onChange={(v) => form.setFieldValue("height", String(v))}
                                                                    label={(value) => `${value} cm`}
                                                                />
                                                                {form.errors.height && (
                                                                    <Text size="xs" c="danger">
                                                                        {form.errors.height}
                                                                    </Text>
                                                                )}
                                                            </Stack>
                                                            <Stack gap="xs">
                                                                <Text size="sm" fw={500}>
                                                                    Weight (kg)
                                                                </Text>
                                                                <Slider
                                                                    size="sm"
                                                                    min={30}
                                                                    max={200}
                                                                    step={1}
                                                                    marks={WEIGHT_MARKS}
                                                                    value={form.values.weight === "" ? 70 : Number(form.values.weight)}
                                                                    onChange={(v) => form.setFieldValue("weight", String(v))}
                                                                    label={(value) => `${value} kg`}
                                                                />
                                                                {form.errors.weight && (
                                                                    <Text size="xs" c="danger">
                                                                        {form.errors.weight}
                                                                    </Text>
                                                                )}
                                                            </Stack>
                                                        </Group>
                                                        <Stack gap="xs" mt="md">
                                                            <Text size="sm" fw={500}>
                                                                Activity level
                                                            </Text>
                                                            <Chip.Group
                                                                multiple={false}
                                                                value={form.values.activityLevel}
                                                                onChange={(value) =>
                                                                    form.setFieldValue("activityLevel", String(value ?? ""))
                                                                }
                                                            >
                                                                <Group gap="xs">
                                                                    {ACTIVITY_OPTIONS.map((option) => (
                                                                        <Chip key={option.value} value={option.value} size="sm">
                                                                            {option.label.split(" — ")[0]}
                                                                        </Chip>
                                                                    ))}
                                                                </Group>
                                                            </Chip.Group>
                                                            {form.errors.activityLevel && (
                                                                <Text size="xs" c="danger">
                                                                    {form.errors.activityLevel}
                                                                </Text>
                                                            )}
                                                        </Stack>
                                                        <Stack gap="xs" mt="xs">
                                                            <Text size="sm" fw={500}>
                                                                Food preferences
                                                            </Text>
                                                            <Chip.Group
                                                                multiple
                                                                value={form.values.foodPreferences}
                                                                onChange={(value) =>
                                                                    form.setFieldValue("foodPreferences", value)
                                                                }
                                                            >
                                                                <Group gap="xs">
                                                                    {FOOD_PREFERENCE_SUGGESTIONS.map((option) => (
                                                                        <Chip key={option} value={option} size="sm">
                                                                            {option}
                                                                        </Chip>
                                                                    ))}
                                                                </Group>
                                                            </Chip.Group>
                                                        </Stack>
                                                        <Stack gap="xs" mt="xs">
                                                            <Group gap={6}>
                                                                <IconAlertTriangle size={15} color={colors.warning} />
                                                                <Text size="sm" fw={500}>
                                                                    Allergies
                                                                </Text>
                                                            </Group>
                                                            <Chip.Group
                                                                multiple
                                                                value={form.values.allergies}
                                                                onChange={(value) =>
                                                                    form.setFieldValue("allergies", value)
                                                                }
                                                            >
                                                                <Group gap="xs">
                                                                    {ALLERGY_SUGGESTIONS.map((option) => (
                                                                        <Chip key={option} value={option} size="sm">
                                                                            {option}
                                                                        </Chip>
                                                                    ))}
                                                                </Group>
                                                            </Chip.Group>
                                                            <Text size="xs" c="dimmed">
                                                                Leave all options unselected if you are unsure — you can update this later.
                                                            </Text>
                                                        </Stack>
                                                        <Text size="xs" c="dimmed" mt="xs">
                                                            Height, weight, and activity are used to personalise nutrition and care suggestions.
                                                        </Text>
                                                    </>
                                                );
                                            }

                                            return (
                                                <Text size="sm" c="dimmed">
                                                    Health profile details are already complete.
                                                </Text>
                                            );
                                        })()}
                                    </Stack>
                                </Stepper.Step>
                            )}

                        </Stepper>
                    </Box>

                    <Group grow>
                        <Button
                            variant="default"
                            onClick={() => setDismissed(true)}
                            disabled={loading}
                        >
                            Skip for now
                        </Button>

                        {activeStep > 0 && (
                            <Button variant="default" onClick={goToPreviousStep} disabled={loading}>
                                {getBackButtonLabel(activeStep)}
                            </Button>
                        )}

                        {!isLastStep(activeStep) && (
                            <Button
                                type="button"
                                onClick={goToNextStep}
                                disabled={loading || !canProceedFromCurrentStep(form.values)}
                            >
                                {getForwardButtonLabel(activeStep)}
                            </Button>
                        )}

                        {isLastStep(activeStep) && (
                            <Button type="submit" loading={loading}>
                                Continue to Chat
                            </Button>
                        )}
                    </Group>
                </Stack>
            </form>
        </Modal>
    );
}

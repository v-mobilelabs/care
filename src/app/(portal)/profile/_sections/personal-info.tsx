"use client";
import {
    Button,
    Card,
    Group,
    Select,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    ThemeIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconUser } from "@tabler/icons-react";
import { updateProfile } from "firebase/auth";
import { useEffect, useState } from "react";

import { useAuth } from "@/ui/providers/auth-provider";
import { colors } from "@/ui/tokens";
import { useProfileQuery, useUpdateIdentityMutation } from "@/app/(portal)/user/_query";

const GENDER_DATA = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
    { value: "non-binary", label: "Non-binary" },
    { value: "prefer-not-to-say", label: "Prefer not to say" },
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

function splitDisplayName(displayName: string | null) {
    if (!displayName) return { firstName: "", lastName: "" };
    const parts = displayName.trim().split(/\s+/);
    return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function normalizeGenderForForm(gender?: string): string {
    if (!gender) {
        return "";
    }

    const normalized = gender.trim().toLowerCase();
    if (normalized === "man") {
        return "male";
    }

    if (normalized === "woman") {
        return "female";
    }

    if (normalized === "prefer not to say") {
        return "prefer-not-to-say";
    }

    return normalized;
}

function validate(values: { firstName: string; lastName: string }) {
    const errors: Partial<Record<"firstName" | "lastName", string>> = {};
    if (!values.firstName.trim()) errors.firstName = "First name is required";
    else if (values.firstName.trim().length > 50) errors.firstName = "First name must be 50 characters or fewer";
    if (values.lastName.trim().length > 50) errors.lastName = "Last name must be 50 characters or fewer";
    return errors;
}

function PersonalInfoForm({
    name,
    gender,
    preferredLanguage,
}: Readonly<{ name: string | null; gender?: string; preferredLanguage?: string }>) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const updateIdentity = useUpdateIdentityMutation();

    const { firstName, lastName } = splitDisplayName(name);
    const form = useForm({
        initialValues: {
            firstName,
            lastName,
            gender: normalizeGenderForForm(gender),
            preferredLanguage: preferredLanguage ?? "",
        },
        validate,
    });

    useEffect(() => {
        const nextNames = splitDisplayName(name);
        form.setValues({
            firstName: nextNames.firstName,
            lastName: nextNames.lastName,
            gender: normalizeGenderForForm(gender),
            preferredLanguage: preferredLanguage ?? "",
        });
        // Keep form in sync with async profile query updates.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, gender, preferredLanguage]);

    async function handleSave(values: {
        firstName: string;
        lastName: string;
        gender: string;
        preferredLanguage: string;
    }) {
        setSaving(true);
        try {
            const displayName = [values.firstName.trim(), values.lastName.trim()].filter(Boolean).join(" ");
            const promises: Promise<unknown>[] = [
                updateIdentity.mutateAsync({
                    name: displayName,
                    gender: values.gender || undefined,
                    preferredLanguage: values.preferredLanguage || undefined,
                }),
            ];
            if (user) promises.push(updateProfile(user, { displayName }));
            await Promise.all(promises);
            notifications.show({
                title: "Profile updated",
                message: "Your personal information has been saved.",
                color: colors.success,
                icon: <IconCheck size={16} />,
            });
        } catch {
            notifications.show({ title: "Update failed", message: "Something went wrong. Please try again.", color: "red" });
        } finally {
            setSaving(false);
        }
    }

    return (
        <Card withBorder radius="lg">
            <Card.Section withBorder style={{ background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-8))" }}>
                <Group gap="sm" align="center" p="md">
                    <ThemeIcon size={36} radius="md" variant="light" color="primary">
                        <IconUser size={20} />
                    </ThemeIcon>
                    <Text fw={600} size="md">Personal Information</Text>
                </Group>
            </Card.Section>
            <Card.Section p="md">
                <form onSubmit={form.onSubmit((v) => void handleSave(v))}>
                    <Stack gap="sm">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                            <TextInput
                                size="sm"
                                label="First name"
                                placeholder="Jane"
                                required
                                {...form.getInputProps("firstName")}
                            />
                            <TextInput
                                size="sm"
                                label="Last name"
                                placeholder="Smith"
                                {...form.getInputProps("lastName")}
                            />
                        </SimpleGrid>
                        <Select
                            size="sm"
                            label="Gender"
                            placeholder="Select gender"
                            data={GENDER_DATA}
                            clearable
                            {...form.getInputProps("gender")}
                        />
                        <Select
                            size="sm"
                            label="Preferred language"
                            placeholder="Select preferred language"
                            data={PREFERRED_LANGUAGE_OPTIONS}
                            searchable
                            clearable
                            {...form.getInputProps("preferredLanguage")}
                        />
                        <Group justify="flex-end" mt={4}>
                            <Button type="submit" color="primary" loading={saving} leftSection={<IconCheck size={16} />}>
                                Save
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Card.Section>
        </Card>
    );
}

export function PersonalInfoSection() {
    const { data: profile } = useProfileQuery();
    const name = profile?.name ?? null;
    const gender = profile?.gender ?? "";
    const preferredLanguage = profile?.preferredLanguage ?? "";
    return (
        <PersonalInfoForm
            name={name}
            gender={gender}
            preferredLanguage={preferredLanguage}
        />
    );
}

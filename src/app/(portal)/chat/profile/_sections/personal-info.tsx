"use client";
import {
    Button,
    Divider,
    Group,
    Paper,
    Select,
    SimpleGrid,
    Stack,
    TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconUser } from "@tabler/icons-react";
import { updateProfile } from "firebase/auth";
import { useState } from "react";

import { useAuth } from "@/ui/providers/auth-provider";
import { colors } from "@/ui/tokens";
import { useProfileQuery, useUpdateIdentityMutation } from "@/app/(portal)/chat/_query";
import { SectionHeader } from "../_shared";

const GENDER_DATA = [
    { value: "man", label: "Man" },
    { value: "woman", label: "Woman" },
    { value: "non-binary", label: "Non-binary" },
    { value: "prefer-not-to-say", label: "Prefer not to say" },
];

function splitDisplayName(displayName: string | null) {
    if (!displayName) return { firstName: "", lastName: "" };
    const parts = displayName.trim().split(/\s+/);
    return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

function validate(values: { firstName: string; lastName: string }) {
    const errors: Partial<Record<"firstName" | "lastName", string>> = {};
    if (!values.firstName.trim()) errors.firstName = "First name is required";
    else if (values.firstName.trim().length > 50) errors.firstName = "First name must be 50 characters or fewer";
    if (values.lastName.trim().length > 50) errors.lastName = "Last name must be 50 characters or fewer";
    return errors;
}

function PersonalInfoForm({ name, gender }: Readonly<{ name: string | null; gender?: string }>) {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const updateIdentity = useUpdateIdentityMutation();

    const { firstName, lastName } = splitDisplayName(name);
    const form = useForm({
        initialValues: { firstName, lastName, gender: gender ?? "" },
        validate,
    });

    async function handleSave(values: { firstName: string; lastName: string; gender: string }) {
        setSaving(true);
        try {
            const displayName = [values.firstName.trim(), values.lastName.trim()].filter(Boolean).join(" ");
            const promises: Promise<unknown>[] = [
                updateIdentity.mutateAsync({
                    name: displayName,
                    gender: values.gender || undefined,
                }),
            ];
            if (user) promises.push(updateProfile(user, { displayName }));
            await Promise.all(promises);
            notifications.show({
                title: "Name updated",
                message: "Your display name has been saved.",
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
        <Paper withBorder radius="lg" p="xl">
            <Stack gap="md">
                <SectionHeader
                    icon={<IconUser size={16} />}
                    title="Personal information"
                    subtitle="Your display name shown across the app"
                />
                <Divider />
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
                        <Group justify="flex-end" mt={4}>
                            <Button type="submit" color="primary" loading={saving} leftSection={<IconCheck size={16} />}>
                                Save
                            </Button>
                        </Group>
                    </Stack>
                </form>
            </Stack>
        </Paper>
    );
}

export function PersonalInfoSection() {
    const { data: profile } = useProfileQuery();
    const name = profile?.name ?? null;
    const gender = profile?.gender;
    return <PersonalInfoForm key={name ?? "loading"} name={name} gender={gender} />;
}

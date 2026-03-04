"use client";
import {
    Box,
    Button,
    Divider,
    Group,
    Paper,
    SimpleGrid,
    Stack,
    TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconUser } from "@tabler/icons-react";
import { getAuth, updateProfile } from "firebase/auth";
import { useState } from "react";

import { useAuth } from "@/ui/providers/auth-provider";
import { firebaseApp } from "@/lib/firebase/client";
import { colors } from "@/ui/tokens";
import { SectionHeader } from "../_shared";

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

export function PersonalInfoSection() {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);

    const { firstName, lastName } = splitDisplayName(user?.displayName ?? null);
    const form = useForm({
        initialValues: { firstName, lastName },
        validate,
    });

    async function handleSave(values: { firstName: string; lastName: string }) {
        const auth = getAuth(firebaseApp);
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        setSaving(true);
        try {
            const displayName = [values.firstName.trim(), values.lastName.trim()].filter(Boolean).join(" ");
            await updateProfile(currentUser, { displayName });
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
                                {...form.getInputProps("firstName")}
                            />
                            <TextInput
                                size="sm"
                                label="Last name"
                                placeholder="Smith"
                                {...form.getInputProps("lastName")}
                            />
                        </SimpleGrid>
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

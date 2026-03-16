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
import { IconCheck, IconMapPin } from "@tabler/icons-react";

import { colors } from "@/ui/tokens";
import type { ProfileRecord } from "@/app/(portal)/patient/_query";
import { useUpdateIdentityMutation } from "@/app/(portal)/patient/_query";
import { trackEvent } from "@/lib/analytics";
import { COUNTRIES } from "@/lib/constants";

// ── Form ──────────────────────────────────────────────────────────────────────

export interface LocationValues {
    country: string;
    city: string;
}

interface FormProps {
    initial: LocationValues;
    onSave: (data: LocationValues) => void;
    saving: boolean;
}

export function LocationForm({ initial, onSave, saving }: Readonly<FormProps>) {
    const form = useForm<LocationValues>({ initialValues: initial });

    return (
        <form onSubmit={form.onSubmit(onSave)}>
            <Stack gap="md">
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <Select
                        size="sm"
                        label="Country"
                        placeholder="Select country"
                        searchable
                        clearable
                        data={COUNTRIES}
                        {...form.getInputProps("country")}
                    />
                    <TextInput
                        size="sm"
                        label="City"
                        placeholder="Chennai"
                        {...form.getInputProps("city")}
                    />
                </SimpleGrid>

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
    profile: ProfileRecord | undefined;
}

export function LocationInfoSection({ profile }: Readonly<SectionProps>) {
    const updateIdentity = useUpdateIdentityMutation();
    return (
        <Card withBorder radius="lg">
            <Card.Section withBorder style={{ background: "light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))" }}>
                <Group gap="sm" align="center" p="md">
                    <ThemeIcon size={36} radius="md" variant="light" color="primary">
                        <IconMapPin size={20} />
                    </ThemeIcon>
                    <Text fw={600} size="md">Location</Text>
                </Group>
            </Card.Section>
            <Card.Section p="md">
                <LocationForm
                    key={profile ? "loaded" : "loading"}
                    initial={{
                        country: profile?.country ?? "",
                        city: profile?.city ?? "",
                    }}
                    onSave={(data) => {
                        updateIdentity.mutate(data, {
                            onSuccess: () => {
                                trackEvent({ name: "profile_updated", params: { section: "location-info" } });
                                notifications.show({
                                    title: "Saved",
                                    message: "Location updated.",
                                    color: colors.success,
                                    icon: <IconCheck size={16} />,
                                });
                            },
                        });
                    }}
                    saving={updateIdentity.isPending}
                />
            </Card.Section>
        </Card>
    );
}

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
import { IconCheck, IconMapPin } from "@tabler/icons-react";

import { colors } from "@/ui/tokens";
import type { ProfileRecord } from "@/app/(portal)/patient/_query";
import { useUpdateIdentityMutation } from "@/app/(portal)/patient/_query";
import { COUNTRIES, SectionHeader } from "../_shared";
import { trackEvent } from "@/lib/analytics";

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
    healthProfile: ProfileRecord | undefined;
}

export function LocationInfoSection({ healthProfile }: Readonly<SectionProps>) {
    const updateIdentity = useUpdateIdentityMutation();
    return (
        <Paper withBorder radius="lg" p="xl">
            <Stack gap="md">
                <SectionHeader
                    icon={<IconMapPin size={16} />}
                    title="Location"
                    subtitle="Your country and city, used to localise recommendations and AI context"
                />
                <Divider />
                <LocationForm
                    key={healthProfile ? "loaded" : "loading"}
                    initial={{
                        country: healthProfile?.country ?? "",
                        city: healthProfile?.city ?? "",
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
            </Stack>
        </Paper>
    );
}

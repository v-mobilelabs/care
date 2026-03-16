"use client";
import {
    Badge,
    Box,
    Button,
    Chip,
    Divider,
    Group,
    Modal,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
    IconCheck,
    IconPlus,
    IconX,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";

import {
    useProfileQuery,
    useUpsertProfileMutation,
} from "@/app/(portal)/patient/_query";
import { FOOD_PREFERENCE_SUGGESTIONS } from "@/ui/chat/profile/shared";
import { colors } from "@/ui/tokens";

export function FoodPreferencesModal({
    opened,
    onClose,
}: Readonly<{ opened: boolean; onClose: () => void }>) {
    const { data: profile } = useProfileQuery();
    const upsertProfile = useUpsertProfileMutation();
    const [selected, setSelected] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState("");

    // Sync from profile each time the modal opens
    useEffect(() => {
        if (opened) {
            const t = setTimeout(() => {
                setSelected(profile?.foodPreferences ?? []);
                setCustomInput("");
            }, 0);
            return () => clearTimeout(t);
        }
    }, [opened, profile?.foodPreferences]);

    const presets = FOOD_PREFERENCE_SUGGESTIONS;
    const customTags = selected.filter((v) => !presets.includes(v));

    function addCustom() {
        const tag = customInput.trim();
        if (!tag || selected.includes(tag)) { setCustomInput(""); return; }
        setSelected([...selected, tag]);
        setCustomInput("");
    }

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title="Food Preferences"
            centered
            size="md"
        >
            <Stack gap="md">
                <Text size="sm" c="dimmed">
                    Select your dietary preferences. The AI uses these to personalise every diet plan it generates for you.
                </Text>

                <Stack gap="xs">
                    <Text size="xs" fw={600} c="dimmed" tt="uppercase" lh={1}>Quick picks</Text>
                    <Chip.Group
                        multiple
                        value={selected.filter((v) => presets.includes(v))}
                        onChange={(s) => setSelected([...customTags, ...s])}
                    >
                        <Group gap={6} wrap="wrap">
                            {presets.map((pref) => (
                                <Chip key={pref} value={pref} size="xs" variant="light" color="green">
                                    {pref}
                                </Chip>
                            ))}
                        </Group>
                    </Chip.Group>
                </Stack>

                {customTags.length > 0 && (
                    <Stack gap={4}>
                        <Text size="xs" fw={600} c="dimmed" tt="uppercase" lh={1}>Custom</Text>
                        <Group gap={6} wrap="wrap">
                            {customTags.map((tag) => (
                                <Badge
                                    key={tag}
                                    size="sm"
                                    variant="light"
                                    color="green"
                                    rightSection={
                                        <Box
                                            component="span"
                                            style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                                            onClick={() => setSelected(selected.filter((v) => v !== tag))}
                                        >
                                            <IconX size={10} />
                                        </Box>
                                    }
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </Group>
                    </Stack>
                )}

                <Group gap="xs" align="flex-end">
                    <TextInput
                        placeholder="Add custom preference…"
                        size="xs"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.currentTarget.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                        style={{ flex: 1 }}
                    />
                    <Button variant="light" color="green" size="xs" leftSection={<IconPlus size={14} />} onClick={addCustom}>
                        Add
                    </Button>
                </Group>

                <Divider />

                <Group justify="flex-end">
                    <Button variant="subtle" color="gray" size="sm" onClick={onClose}>Cancel</Button>
                    <Button
                        color="green"
                        size="sm"
                        leftSection={<IconCheck size={16} />}
                        loading={upsertProfile.isPending}
                        onClick={() => {
                            upsertProfile.mutate({ foodPreferences: selected }, {
                                onSuccess: () => {
                                    notifications.show({
                                        title: "Preferences saved",
                                        message: "Your food preferences have been updated.",
                                        color: colors.success,
                                        icon: <IconCheck size={16} />,
                                    });
                                    onClose();
                                },
                            });
                        }}
                    >
                        Save
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}

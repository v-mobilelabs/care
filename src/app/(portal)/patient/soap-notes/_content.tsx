"use client";
import { Box, Tabs, Text } from "@mantine/core";
import { IconFileText, IconNotes } from "@tabler/icons-react";

// Health Records view with Conditions and SOAP Notes tabs
export function HealthRecordsContent() {
    return (
        <Box>
            <Tabs defaultValue="soap-notes">
                <Tabs.List>
                    <Tabs.Tab value="soap-notes" leftSection={<IconNotes size={16} />}>
                        SOAP Notes
                    </Tabs.Tab>
                    <Tabs.Tab value="conditions" leftSection={<IconFileText size={16} />}>
                        Conditions
                    </Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="soap-notes" pt="md">
                    <Text c="dimmed">SOAP Notes will be displayed here.</Text>
                </Tabs.Panel>
                <Tabs.Panel value="conditions" pt="md">
                    <Text c="dimmed">Conditions will be displayed here.</Text>
                </Tabs.Panel>
            </Tabs>
        </Box>
    );
}

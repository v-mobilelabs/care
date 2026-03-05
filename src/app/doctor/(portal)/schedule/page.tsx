import { Box, Paper, Stack, Text, Title } from "@mantine/core";
import { IconCalendarStats } from "@tabler/icons-react";

export const metadata = { title: "Schedule — Doctor Portal" };

export default function DoctorSchedulePage() {
    return (
        <Stack gap="lg">
            <Box>
                <Title order={2}>Schedule</Title>
                <Text c="dimmed" size="sm" mt={4}>
                    Your upcoming sessions and appointments.
                </Text>
            </Box>

            <Paper withBorder radius="lg" p="xl">
                <Stack align="center" gap="sm" py="xl">
                    <IconCalendarStats size={48} color="var(--mantine-color-primary-3)" />
                    <Title order={4} c="dimmed">No sessions scheduled</Title>
                    <Text size="sm" c="dimmed" ta="center">
                        Sessions assigned to you will appear here.
                    </Text>
                </Stack>
            </Paper>
        </Stack>
    );
}

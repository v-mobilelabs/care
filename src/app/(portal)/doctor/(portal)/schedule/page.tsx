import { Box, Stack, Text } from "@mantine/core";
import { IconCalendarStats } from "@tabler/icons-react";
import {
    iosCard,
    iosLargeTitle,
    iosSubtitle,
    ios,
    allKeyframes,
} from "@/ui/ios";

export const metadata = { title: "Schedule — Doctor Portal" };

export default function DoctorSchedulePage() {
    return (
        <Stack gap="lg">
            <style>{allKeyframes}</style>

            <Box style={{ animation: ios.animation.fadeSlideUp() }}>
                <Box
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <Box
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: "light-dark(rgba(99,102,241,0.1), rgba(99,102,241,0.15))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--mantine-color-primary-5)",
                        }}
                    >
                        <IconCalendarStats size={20} />
                    </Box>
                    <Box>
                        <Text style={iosLargeTitle}>Schedule</Text>
                        <Text style={iosSubtitle}>
                            Your upcoming sessions and appointments.
                        </Text>
                    </Box>
                </Box>
            </Box>

            <Box
                style={{
                    ...iosCard,
                    padding: "48px 24px",
                    textAlign: "center",
                    animation: ios.animation.scaleIn("100ms"),
                }}
            >
                <Box
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        background: "light-dark(rgba(0,0,0,0.04), rgba(255,255,255,0.06))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 16px",
                        animation: ios.animation.float,
                    }}
                >
                    <IconCalendarStats size={32} color="var(--mantine-color-primary-3)" />
                </Box>
                <Text fw={600} size="md" c="dimmed" mb={4}>
                    No sessions scheduled
                </Text>
                <Text size="sm" c="dimmed" ta="center" maw={280} mx="auto">
                    Sessions assigned to you will appear here.
                </Text>
            </Box>
        </Stack>
    );
}

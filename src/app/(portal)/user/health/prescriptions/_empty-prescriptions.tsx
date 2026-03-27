import { Button, Center, Group, Stack, Text, ThemeIcon, Title } from "@mantine/core";
import { IconCamera, IconReportMedical, IconUpload } from "@tabler/icons-react";

export function EmptyPrescriptions({ onCameraCapture, onFileSelect }: Readonly<{
    onCameraCapture: () => void;
    onFileSelect: () => void;
}>) {
    return (
        <Center style={{ flex: 1, flexDirection: "column", gap: 16 }} py="xl">
            <ThemeIcon size={72} radius="xl" color="primary" variant="light">
                <IconReportMedical size={36} />
            </ThemeIcon>
            <Stack gap={4} align="center">
                <Title order={4} c="dimmed">No prescriptions yet</Title>
                <Text size="sm" c="dimmed" ta="center" maw={340}>
                    Take a photo of your prescription or upload an image / PDF.
                    Tap <strong>✦</strong> on any card to auto-detect medications with AI.
                </Text>
            </Stack>
            <Group gap="sm" justify="center">
                <Button
                    leftSection={<IconCamera size={16} />}
                    variant="filled"
                    color="primary"
                    onClick={onCameraCapture}
                >
                    Take Photo
                </Button>
                <Button
                    leftSection={<IconUpload size={16} />}
                    variant="light"
                    color="primary"
                    onClick={onFileSelect}
                >
                    Upload File
                </Button>
            </Group>
        </Center>
    );
}

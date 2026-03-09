// Verify page — only shown on sign-in errors.
// The actual sign-in flow is handled by GET /api/auth/verify (a Route Handler)
// which sets the session cookie and redirects to the destination.
import { Box, Center, Container, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";

export const metadata = { title: "Signing In — CareAI" };

interface PageProps {
    searchParams: Promise<{ error?: string }>;
}

export default async function VerifyPage({ searchParams }: Readonly<PageProps>) {
    const { error } = await searchParams;
    const message = error ?? "Invalid sign-in link. Please request a new one.";
    return <ErrorView message={message} />;
}

function ErrorView({ message }: Readonly<{ message: string }>) {
    return (
        <Box style={{ minHeight: "100dvh", background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))" }}>
            <Center style={{ minHeight: "100dvh" }}>
                <Container size={420}>
                    <Stack align="center" gap="md">
                        <IconAlertCircle size={40} color="var(--mantine-color-red-5)" />
                        <Title order={3}>Sign-in failed</Title>
                        <Text size="sm" c="dimmed" ta="center">{message}</Text>
                        <Text component="a" href="/auth/login" size="sm" c="primary" style={{ textDecoration: "underline" }}>Back to login</Text>
                    </Stack>
                </Container>
            </Center>
        </Box>
    );
}

// Login page shell — no auth required. Single entry point for all user types.
import { Anchor, Box, Container, Group, Stack, Text, Title } from "@mantine/core";
import { IconSparkles, IconStethoscope } from "@tabler/icons-react";
import { MagicLinkForm } from "@/app/auth/login/_form";
import { CaptchaProvider } from "@/ui/providers/captcha-provider";

export const metadata = { title: "Sign In — CareAI" };

export default async function LoginPage({
    searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string>> }>) {
    const params = await searchParams;
    const isDoctor = params.kind === "doctor";

    return (
        <Box
            style={{
                minHeight: "100dvh",
                display: "flex",
                alignItems: "center",
                background: "light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-9))",
            }}
        >
            <Container size={420} w="100%">
                <Stack gap="xl" align="center">
                    <Stack gap={4} align="center">
                        {isDoctor
                            ? <IconStethoscope size={40} color="var(--mantine-color-primary-5)" />
                            : <IconSparkles size={40} color="var(--mantine-color-primary-5)" />}
                        <Title order={2}>
                            {isDoctor ? "Doctor Sign In" : "Welcome to CareAI"}
                        </Title>
                        <Text size="sm" c="dimmed" ta="center">
                            {isDoctor
                                ? "Enter your email and we’ll send you a magic link to access the Doctor Portal."
                                : "Enter your email and we’ll send you a magic sign-in link. No password required."}
                        </Text>
                    </Stack>
                    <CaptchaProvider>
                        <MagicLinkForm />
                    </CaptchaProvider>
                    <Group gap="xs" justify="center">
                        <Anchor href="/privacy" size="xs" c="dimmed">Privacy Policy</Anchor>
                        <Text size="xs" c="dimmed">·</Text>
                        <Anchor href="/terms" size="xs" c="dimmed">Terms &amp; Conditions</Anchor>
                    </Group>
                </Stack>
            </Container>
        </Box>
    );
}

"use client";
import { useState } from "react";
import { Button, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconMail } from "@tabler/icons-react";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { saveSignInEmail } from "@/lib/firebase/magic-link";

export function MagicLinkForm() {
    const [sent, setSent] = useState(false);
    const [loading, setLoading] = useState(false);
    const { executeRecaptcha } = useGoogleReCaptcha();
    const form = useForm({
        initialValues: { email: "" },
        validate: { email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : "Enter a valid email") },
    });

    async function handleSubmit({ email }: { email: string }) {
        if (!executeRecaptcha) {
            notifications.show({ title: "Error", message: "reCAPTCHA not ready. Refresh and try again.", color: "red" });
            return;
        }
        setLoading(true);
        try {
            const token = await executeRecaptcha("magic_link");
            const res = await fetch("/api/auth/magic-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, captchaToken: token }),
            });
            if (res.status === 429) {
                const data = (await res.json()) as { error?: string };
                notifications.show({ title: "Slow down", message: data.error ?? "Too many requests.", color: "orange" });
                return;
            }
            if (!res.ok) {
                const data = (await res.json()) as { error?: string };
                throw new Error(data.error ?? "Could not send link.");
            }
            saveSignInEmail(email);
            setSent(true);
        } catch (e) {
            notifications.show({ title: "Error", message: e instanceof Error ? e.message : "Could not send link. Try again.", color: "red" });
        } finally {
            setLoading(false);
        }
    }

    if (sent) {
        return (
            <Paper withBorder radius="lg" p="xl" w="100%">
                <Stack align="center" gap="sm">
                    <IconCheck size={32} color="var(--mantine-color-teal-5)" />
                    <Text fw={600}>Check your inbox</Text>
                    <Text size="sm" c="dimmed" ta="center">
                        We sent a magic link to <strong>{form.values.email}</strong>.
                        Click it to sign in — no password needed.
                    </Text>
                    <Button variant="subtle" onClick={() => setSent(false)}>Use a different email</Button>
                </Stack>
            </Paper>
        );
    }

    return (
        <Paper withBorder radius="lg" p="xl" w="100%" component="form" onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
                <TextInput label="Email address" placeholder="you@example.com" leftSection={<IconMail size={16} />} {...form.getInputProps("email")} />
                <Button type="submit" fullWidth loading={loading}>Send magic link</Button>
                <Text size="xs" c="dimmed" ta="center">
                    By signing in you agree to our{" "}
                    <Text component="a" href="/terms" size="xs" c="dimmed" style={{ textDecoration: "underline" }}>Terms &amp; Conditions</Text>
                    {" and "}
                    <Text component="a" href="/privacy" size="xs" c="dimmed" style={{ textDecoration: "underline" }}>Privacy Policy</Text>.
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                    Protected by reCAPTCHA —{" "}
                    <Text component="a" href="https://policies.google.com/privacy" target="_blank" size="xs" c="dimmed" style={{ textDecoration: "underline" }}>Privacy</Text>
                    {" & "}
                    <Text component="a" href="https://policies.google.com/terms" target="_blank" size="xs" c="dimmed" style={{ textDecoration: "underline" }}>Terms</Text>
                </Text>
            </Stack>
        </Paper>
    );
}

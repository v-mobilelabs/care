"use client";
import {
    Accordion,
    Box,
    Divider,
    Group,
    ScrollArea,
    Stack,
    Text,
    ThemeIcon,
    Title,
} from "@mantine/core";
import {
    IconBolt,
    IconHeartbeat,
    IconLock,
    IconMail,
    IconQuestionMark,
    IconShield,
    IconStethoscope,
} from "@tabler/icons-react";

// ── FAQ data ──────────────────────────────────────────────────────────────────

const SECTIONS = [
    {
        id: "about",
        icon: <IconHeartbeat size={16} />,
        color: "primary",
        label: "About CareAI",
        items: [
            {
                q: "What is CareAI?",
                a: "CareAI is an intelligent clinical assessment assistant built by CosmoOps Private Limited. It guides you through a structured health assessment — asking the right questions, identifying possible conditions, and helping you understand when and where to seek care.",
            },
            {
                q: "Who built CareAI?",
                a: "CareAI is designed, developed, and maintained entirely by CosmoOps Private Limited.",
            },
            {
                q: "What kinds of health questions can I ask?",
                a: "You can describe any symptom, condition, medication, lab result, or uploaded image. CareAI follows evidence-based clinical guidelines (AHA, ADA, NICE, WHO, and others) to walk you through a thorough assessment.",
            },
        ],
    },
    {
        id: "credits",
        icon: <IconBolt size={16} />,
        color: "teal",
        label: "Credits & Usage",
        items: [
            {
                q: "What are credits?",
                a: "Credits are your daily usage allowance. Every free user starts each day with 100 credits. Each message you send to CareAI costs 1 credit.",
            },
            {
                q: "When do my credits reset?",
                a: "Credits reset automatically every day at midnight UTC. You don't need to do anything — the next time you send a message after midnight, your balance is restored to 100.",
            },
            {
                q: "Why a credit system?",
                a: "The credit system lets us keep CareAI available for free while ensuring the service remains fast and reliable for everyone. It mirrors how leading AI platforms handle free-tier access.",
            },
            {
                q: "Can I get more credits?",
                a: "We are working on paid plans that offer higher daily limits. Stay tuned for announcements.",
            },
        ],
    },
    {
        id: "privacy",
        icon: <IconLock size={16} />,
        color: "violet",
        label: "Privacy & Data",
        items: [
            {
                q: "Is my health data stored?",
                a: "Your conversation history is saved to your account so you can resume sessions and review past assessments. Data is stored securely and is never shared with third parties or used to train AI models.",
            },
            {
                q: "Who can see my conversations?",
                a: "Only you can access your sessions. CosmoOps staff do not read individual conversations except in the rare case of an active security or abuse investigation.",
            },
            {
                q: "Can I delete my data?",
                a: "Yes. You can delete any session at any time from the sidebar. To request full account deletion, contact us at the email below.",
            },
        ],
    },
    {
        id: "disclaimer",
        icon: <IconShield size={16} />,
        color: "orange",
        label: "Medical Disclaimer",
        items: [
            {
                q: "Is CareAI a replacement for a doctor?",
                a: "No. CareAI is an informational tool to help you understand your symptoms and prepare for a medical appointment. It does not provide a medical diagnosis, prescribe treatment, or replace the judgment of a qualified healthcare professional.",
            },
            {
                q: "What if I am in an emergency?",
                a: "If you are experiencing a medical emergency — chest pain, difficulty breathing, severe bleeding, or any life-threatening symptom — call your local emergency services (e.g. 999, 112, or 911) immediately. Do not rely on CareAI in an emergency.",
            },
            {
                q: "How accurate is CareAI?",
                a: "CareAI follows published clinical guidelines and is regularly reviewed by our team. However, no AI system is infallible. Always verify important health decisions with a licensed clinician.",
            },
        ],
    },
    {
        id: "contact",
        icon: <IconMail size={16} />,
        color: "blue",
        label: "Contact Us",
        items: [
            {
                q: "How do I contact CosmoOps?",
                a: "Email us at support@cosmoops.com — we aim to respond within 2 business days.",
            },
            {
                q: "How do I report a bug or suggest a feature?",
                a: "Send an email to support@cosmoops.com with the subject line 'Bug report' or 'Feature request'. We read every message.",
            },
        ],
    },
];

// ── Page ──────────────────────────────────────────────────────────────────────

function FaqContent() {
    return (
        <Box style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            {/* Header */}
            <Box
                px={{ base: "md", sm: "xl" }}
                py="md"
                style={{
                    flexShrink: 0,
                    borderBottom: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                    background: "light-dark(white, var(--mantine-color-dark-8))",
                }}
            >
                <Group gap="sm">
                    <ThemeIcon size={36} radius="md" color="primary" variant="light">
                        <IconQuestionMark size={20} />
                    </ThemeIcon>
                    <Box>
                        <Title order={4} lh={1.2}>Frequently Asked Questions</Title>
                        <Text size="xs" c="dimmed">Everything you need to know about CareAI</Text>
                    </Box>
                </Group>
            </Box>

            {/* Scrollable content */}
            <Box style={{ flex: 1, overflow: "hidden" }}>
                <ScrollArea style={{ height: "100%" }}>
                    <Box maw={720} mx="auto" px={{ base: "md", sm: "xl" }} py="lg">
                        <Stack gap="xl">
                            {SECTIONS.map((section) => (
                                <Box key={section.id}>
                                    <Group gap={8} mb="sm">
                                        <ThemeIcon size={24} radius="sm" color={section.color} variant="light">
                                            {section.icon}
                                        </ThemeIcon>
                                        <Text fw={600} size="sm">{section.label}</Text>
                                    </Group>

                                    <Accordion
                                        variant="separated"
                                        radius="md"
                                        styles={{
                                            item: {
                                                border: "1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-5))",
                                                background: "light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))",
                                            },
                                            label: { fontWeight: 500, fontSize: "var(--mantine-font-size-sm)" },
                                            panel: { fontSize: "var(--mantine-font-size-sm)", color: "var(--mantine-color-dimmed)" },
                                        }}
                                    >
                                        {section.items.map((item) => (
                                            <Accordion.Item key={item.q} value={item.q}>
                                                <Accordion.Control>{item.q}</Accordion.Control>
                                                <Accordion.Panel>{item.a}</Accordion.Panel>
                                            </Accordion.Item>
                                        ))}
                                    </Accordion>
                                </Box>
                            ))}
                        </Stack>

                        <Divider my="xl" />

                        <Group gap={6} justify="center">
                            <IconStethoscope size={14} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" c="dimmed" ta="center">
                                CareAI is not a substitute for professional medical advice. Always consult a qualified doctor.
                            </Text>
                        </Group>

                        <Text size="xs" c="dimmed" ta="center" mt={4}>
                            © {new Date().getFullYear()} CosmoOps Private Limited. All rights reserved.
                        </Text>
                    </Box>
                </ScrollArea>
            </Box>
        </Box>
    );
}

export default function FaqPage() {
    return <FaqContent />;
}

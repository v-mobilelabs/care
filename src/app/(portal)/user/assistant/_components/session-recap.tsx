"use client";

import type { UIMessage } from "ai";
import {
  Box,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import Link from "@/ui/link";

type RecapLink = Readonly<{
  href: string;
  label: string;
}>;

type SessionRecapModel = Readonly<{
  shouldRender: boolean;
  patientShared: string;
  findings: string[];
  saves: string[];
  nextSteps: RecapLink[];
}>;

const MAX_FINDINGS = 4;

function getTextPart(part: UIMessage["parts"][number]): string | null {
  const candidate = part as { type?: string; text?: string };
  if (candidate.type === "text" && typeof candidate.text === "string") {
    const value = candidate.text.trim();
    return value.length > 0 ? value : null;
  }
  return null;
}

function summarizePatientShared(messages: UIMessage[]): string {
  const userTexts = messages
    .filter((message) => message.role === "user")
    .flatMap((message) => message.parts.map(getTextPart).filter((text): text is string => text !== null));

  if (userTexts.length === 0) {
    return "No user details captured yet.";
  }

  const latest = userTexts.slice(-2).join(" ").replaceAll(/\s+/g, " ").trim();
  if (latest.length <= 180) {
    return latest;
  }

  return `${latest.slice(0, 177)}...`;
}

function collectToolCounts(messages: UIMessage[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const message of messages) {
    if (message.role !== "assistant") continue;

    for (const part of message.parts) {
      const type = (part as { type?: string }).type;
      if (!type?.startsWith("tool-")) continue;

      const toolName = type.replace("tool-", "");
      counts.set(toolName, (counts.get(toolName) ?? 0) + 1);
    }
  }

  return counts;
}

function toFindings(toolCounts: Map<string, number>): string[] {
  const findings: string[] = [];

  const countAssessment = toolCounts.get("startAssessment") ?? 0;
  if (countAssessment > 0) {
    findings.push(`${countAssessment} structured assessment ${countAssessment === 1 ? "was" : "were"} prepared.`);
  }

  const countReports = toolCounts.get("submitReport") ?? 0;
  if (countReports > 0) {
    findings.push(`${countReports} clinical report ${countReports === 1 ? "was" : "were"} generated.`);
  }

  const countPrescriptions = toolCounts.get("submitPrescription") ?? 0;
  if (countPrescriptions > 0) {
    findings.push(`${countPrescriptions} prescription draft ${countPrescriptions === 1 ? "was" : "were"} captured.`);
  }

  const countReferrals = toolCounts.get("submitReferralRequest") ?? 0;
  if (countReferrals > 0) {
    findings.push(`${countReferrals} specialist referral ${countReferrals === 1 ? "was" : "were"} identified.`);
  }

  const countActionCards = toolCounts.get("actionCard") ?? 0;
  if (countActionCards > 0) {
    findings.push(`${countActionCards} follow-up action card ${countActionCards === 1 ? "is" : "are"} available.`);
  }

  return findings.slice(0, MAX_FINDINGS);
}

function toSavedArtifacts(toolCounts: Map<string, number>): string[] {
  const saves: string[] = [];

  if ((toolCounts.get("startAssessment") ?? 0) > 0) {
    saves.push("Assessment responses are saved in Assessments.");
  }

  if ((toolCounts.get("submitReport") ?? 0) > 0) {
    saves.push("Clinical summaries are available in Patient Summaries.");
  }

  if ((toolCounts.get("submitPrescription") ?? 0) > 0) {
    saves.push("Medication outputs are stored under Prescriptions.");
  }

  if ((toolCounts.get("submitReferralRequest") ?? 0) > 0) {
    saves.push("Specialist suggestions are tracked in Referrals.");
  }

  if (saves.length === 0) {
    saves.push("This session remains in History for context-aware follow-up.");
  }

  return saves;
}

function pushIfAbsent(links: RecapLink[], link: RecapLink): void {
  if (links.some((entry) => entry.href === link.href)) return;
  links.push(link);
}

function toNextSteps(toolCounts: Map<string, number>): RecapLink[] {
  const links: RecapLink[] = [];

  pushIfAbsent(links, { href: "/user/assistant", label: "Continue chat" });

  if ((toolCounts.get("startAssessment") ?? 0) > 0) {
    pushIfAbsent(links, { href: "/user/health/assessments", label: "Review assessments" });
  }
  if ((toolCounts.get("submitReport") ?? 0) > 0) {
    pushIfAbsent(links, { href: "/user/health/summary", label: "Open summaries" });
  }
  if ((toolCounts.get("submitPrescription") ?? 0) > 0) {
    pushIfAbsent(links, { href: "/user/health/prescriptions", label: "Check prescriptions" });
  }
  if ((toolCounts.get("submitReferralRequest") ?? 0) > 0) {
    pushIfAbsent(links, { href: "/user/referrals", label: "Review referrals" });
  }

  return links.slice(0, 3);
}

function buildRecap(messages: UIMessage[]): SessionRecapModel {
  const toolCounts = collectToolCounts(messages);
  const findings = toFindings(toolCounts);
  const saves = toSavedArtifacts(toolCounts);
  const nextSteps = toNextSteps(toolCounts);
  const patientShared = summarizePatientShared(messages);

  const userMessageCount = messages.filter((message) => message.role === "user").length;
  const shouldRender = userMessageCount > 0 && (findings.length > 0 || userMessageCount > 1);

  return {
    shouldRender,
    patientShared,
    findings,
    saves,
    nextSteps,
  };
}

function RecapDetails({ recap }: Readonly<{ recap: SessionRecapModel }>) {
  return (
    <Stack gap="md">
      <Box>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">What you shared</Text>
        <Text size="sm" mt={2}>{recap.patientShared}</Text>
      </Box>

      <Box>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">What CareAI found</Text>
        <Stack gap={2} mt={2}>
          {recap.findings.length > 0 ? recap.findings.map((finding) => (
            <Text key={finding} size="sm">• {finding}</Text>
          )) : <Text size="sm">• Guidance has been captured in this session.</Text>}
        </Stack>
      </Box>

      <Box>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">What is saved</Text>
        <Stack gap={2} mt={2}>
          {recap.saves.map((item) => (
            <Text key={item} size="sm">• {item}</Text>
          ))}
        </Stack>
      </Box>

      <Box>
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">Next steps</Text>
        <Group gap="xs" mt={6}>
          {recap.nextSteps.map((link) => (
            <Button key={link.href} component={Link} href={link.href} variant="light" size="xs" color="primary">
              {link.label}
            </Button>
          ))}
        </Group>
      </Box>
    </Stack>
  );
}

export function SessionRecap({ messages }: Readonly<{ messages: UIMessage[] }>) {
  const recap = buildRecap(messages);

  if (!recap.shouldRender) {
    return null;
  }

  return <RecapDetails recap={recap} />;
}

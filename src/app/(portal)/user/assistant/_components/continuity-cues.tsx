"use client";

import type { UIMessage } from "ai";
import {
  Badge,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import Link from "@/ui/link";

type Cue = Readonly<{
  label: string;
  href: string;
  count: number;
  color: string;
}>;

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

function buildCues(messages: UIMessage[]): Cue[] {
  const counts = collectToolCounts(messages);
  const cues: Cue[] = [];

  const assessments = counts.get("startAssessment") ?? 0;
  if (assessments > 0) {
    cues.push({
      label: "Assessments saved",
      href: "/user/health/assessments",
      count: assessments,
      color: "teal",
    });
  }

  const summaries = counts.get("submitReport") ?? 0;
  if (summaries > 0) {
    cues.push({
      label: "Summaries saved",
      href: "/user/health/summary",
      count: summaries,
      color: "orange",
    });
  }

  const prescriptions = counts.get("submitPrescription") ?? 0;
  if (prescriptions > 0) {
    cues.push({
      label: "Prescriptions saved",
      href: "/user/health/prescriptions",
      count: prescriptions,
      color: "red",
    });
  }

  const referrals = counts.get("submitReferralRequest") ?? 0;
  if (referrals > 0) {
    cues.push({
      label: "Referrals tracked",
      href: "/user/referrals",
      count: referrals,
      color: "primary",
    });
  }

  return cues;
}

function ContinuityDetails({ cues }: Readonly<{ cues: Cue[] }>) {
  return (
    <Stack gap="md">
      <Text size="sm" c="dimmed">
        These outputs are saved and will be available when you return.
      </Text>
      <Group gap="xs" wrap="wrap">
        {cues.map((cue) => (
          <Badge
            key={`${cue.label}-${cue.href}`}
            component={Link}
            href={cue.href}
            color={cue.color}
            variant="light"
            radius="sm"
            style={{ cursor: "pointer", textDecoration: "none" }}
          >
            {cue.label} · {cue.count}
          </Badge>
        ))}
      </Group>
    </Stack>
  );
}

export function ContinuityCues({ messages }: Readonly<{ messages: UIMessage[] }>) {
  const cues = buildCues(messages);

  if (cues.length === 0) return null;

  return <ContinuityDetails cues={cues} />;
}

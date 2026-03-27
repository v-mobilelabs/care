"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useEvidenceQuery } from "./_query";
import type { EvidenceEntry } from "./_query";
import { EvidenceResults } from "./_results";

interface EvidenceContentProps {
  initialProfileId: string;
}

function SummaryStats({ entries }: Readonly<{ entries: Array<EvidenceEntry> }>) {
  const stats = useMemo(() => {
    const total = entries.length;
    const withTokens = entries.filter((e) => e.evidence.tokenUsage).length;
    const ragUsed = entries.filter((e) => e.evidence.rag?.used).length;
    const withMemory = entries.filter((e) => e.evidence.memory?.retrieved).length;
    const totalTokens = entries.reduce((sum, e) => sum + (e.evidence.tokenUsage?.totalTokens ?? 0), 0);
    const totalCredits = entries.reduce((sum, e) => sum + (e.evidence.creditsUsed ?? 0), 0);

    return { total, withTokens, ragUsed, withMemory, totalTokens, totalCredits };
  }, [entries]);

  return (
    <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
      <Paper withBorder radius="md" p="md">
        <Text fw={600} size="sm" c="dimmed">
          Total Messages
        </Text>
        <Text fw={700} size="xl">
          {stats.total}
        </Text>
      </Paper>
      <Paper withBorder radius="md" p="md">
        <Text fw={600} size="sm" c="dimmed">
          Token Captured
        </Text>
        <Text fw={700} size="xl">
          {stats.withTokens}/{stats.total}
        </Text>
      </Paper>
      <Paper withBorder radius="md" p="md">
        <Text fw={600} size="sm" c="dimmed">
          RAG Used
        </Text>
        <Text fw={700} size="xl">
          {stats.ragUsed}/{stats.total}
        </Text>
      </Paper>
      <Paper withBorder radius="md" p="md">
        <Text fw={600} size="sm" c="dimmed">
          Memory Retrieved
        </Text>
        <Text fw={700} size="xl">
          {stats.withMemory}/{stats.total}
        </Text>
      </Paper>
      <Paper withBorder radius="md" p="md">
        <Text fw={600} size="sm" c="dimmed">
          Total Tokens
        </Text>
        <Text fw={700} size="xl">
          {stats.totalTokens.toLocaleString()}
        </Text>
      </Paper>
      <Paper withBorder radius="md" p="md">
        <Text fw={600} size="sm" c="dimmed">
          Total Credits
        </Text>
        <Text fw={700} size="xl">
          {stats.totalCredits}
        </Text>
      </Paper>
    </SimpleGrid>
  );
}

export function EvidenceContent({
  initialProfileId,
}: Readonly<EvidenceContentProps>) {
  const [profileId, setProfileId] = useState(initialProfileId);
  const [sessionId, setSessionId] = useState("");
  const [messageId, setMessageId] = useState("");

  const { data, isLoading, error, isFetching, refetch } = useEvidenceQuery(
    profileId,
    sessionId,
    messageId,
  );

  const evidenceEntries = data ?? [];

  return (
    <Stack gap="lg" p="xl">
      <Paper withBorder radius="lg" p="xl">
        <Stack gap="md">
          <Text fw={700} size="lg">
            Evidence Inspector
          </Text>
          <Text c="dimmed" size="sm">
            Inspect reasoning steps, citations, and confidence for captured AI responses.
          </Text>

          <Group align="flex-end" wrap="wrap">
            <TextInput
              label="Profile ID"
              value={profileId}
              onChange={(event) => setProfileId(event.currentTarget.value)}
              placeholder="profile uid"
              w={260}
            />
            <TextInput
              label="Session ID"
              value={sessionId}
              onChange={(event) => setSessionId(event.currentTarget.value)}
              placeholder="session id"
              w={320}
            />
            <TextInput
              label="Message ID (optional)"
              value={messageId}
              onChange={(event) => setMessageId(event.currentTarget.value)}
              placeholder="message id"
              w={320}
            />
            <Button
              onClick={() => {
                refetch().catch(() => undefined);
              }}
              loading={isFetching}
              disabled={sessionId.trim().length === 0}
            >
              Load Evidence
            </Button>
          </Group>
        </Stack>
      </Paper>

      {error ? (
        <Alert
          icon={<IconAlertCircle size={18} />}
          color="danger"
          title="Could not load evidence"
        >
          {(error as Error).message}
        </Alert>
      ) : null}

      {isLoading ? (
        <Paper withBorder radius="lg" p="xl">
          <Text c="dimmed">Loading evidence…</Text>
        </Paper>
      ) : null}

      {!isLoading && evidenceEntries.length === 0 ? (
        <Paper withBorder radius="lg" p="xl">
          <Text c="dimmed">No evidence found for the selected inputs.</Text>
        </Paper>
      ) : null}

      {!isLoading && evidenceEntries.length > 0 ? <EvidenceResults entries={evidenceEntries} /> : null}
      {!isLoading && evidenceEntries.length > 0 ? (
        <Paper withBorder radius="lg" p="xl" mt="lg">
          <Text fw={700} size="lg" mb="md">
            Pipeline Summary
          </Text>
          <SummaryStats entries={evidenceEntries} />
        </Paper>
      ) : null}
    </Stack>
  );
}

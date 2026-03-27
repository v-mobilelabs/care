import { Suspense } from "react";
import { Box, Paper, Text } from "@mantine/core";
import { getServerUser } from "@/lib/api/server-prefetch";
import { EvidenceContent } from "./_content";
import EvidenceLoading from "./loading";

export const metadata = { title: "Evidence Inspector" };

function getAdminEmails(): string[] {
  const value = process.env.ADMIN_EMAILS;
  if (!value) return [];
  return value
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

export default async function EvidencePage() {
  const user = await getServerUser();
  if (!user) {
    return (
      <Box p="xl">
        <Paper withBorder radius="lg" p="xl">
          <Text c="danger" fw={600}>
            Access denied
          </Text>
          <Text c="dimmed" mt="xs">
            Sign in with an admin account to view evidence.
          </Text>
        </Paper>
      </Box>
    );
  }

  const adminEmails = getAdminEmails();
  const isAdmin = adminEmails.includes(user.email.toLowerCase());

  if (!isAdmin) {
    return (
      <Box p="xl">
        <Paper withBorder radius="lg" p="xl">
          <Text c="danger" fw={600}>
            Access denied
          </Text>
          <Text c="dimmed" mt="xs">
            Your account is not in the admin allowlist.
          </Text>
        </Paper>
      </Box>
    );
  }

  return (
    <Suspense fallback={<EvidenceLoading />}>
      <EvidenceContent initialProfileId={user.uid} />
    </Suspense>
  );
}

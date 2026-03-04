"use client";
import { useRef } from "react";
import { Badge, Group, Stack, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";
import { IconUser, IconUserPlus } from "@tabler/icons-react";

import { useActiveProfile } from "@/app/chat/_context/active-profile-context";
import {
  useCreateDependentMutation,
  useDependentsQuery,
  type DependentRecord,
  type ExtractedPersonResult,
} from "@/app/chat/_query";
import { useAuth } from "@/ui/providers/auth-provider";
import { colors } from "@/ui/tokens";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FilePersonCheckCallbacks {
  /** Proceed with the send under the current profile. */
  onProceedNormal: (text: string, files?: FileList) => void;
  /**
   * Proceed under a different profile (existing or newly created).
   * The caller should navigate to `newSessionId` and send `text` + `files` there.
   */
  onProceedAsNewProfile: (
    text: string,
    files: FileList | undefined,
    newSessionId: string,
  ) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fuzzy name match — returns true if the two names share significant tokens. */
function namesOverlap(a: string, b: string): boolean {
  const aLow = a.toLowerCase();
  const bLow = b.toLowerCase();
  if (!aLow || !bLow) return false;
  if (aLow.includes(bLow) || bLow.includes(aLow)) return true;
  return aLow
    .split(" ")
    .filter((n) => n.length > 2)
    .some((n) => bLow.includes(n));
}

/** Find the first existing dependent whose name fuzzy-matches the document name. */
function findMatchingDependent(
  displayName: string,
  dependents: DependentRecord[],
): DependentRecord | undefined {
  return dependents.find((dep) => {
    const depName = [dep.firstName, dep.lastName].filter(Boolean).join(" ");
    return namesOverlap(displayName, depName);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Provides `checkAndSend` — an async gate that inspects attached files for
 * person details before a chat message is sent.
 *
 * Flow:
 *  1. If no image/PDF files are attached → proceed normally.
 *  2. Call POST /api/files/extract-person on the first visual file.
 *  3. If the extracted name matches the active profile → proceed normally.
 *  4. If the name matches an existing dependent → offer to switch to that profile.
 *  5. If the name matches nobody → offer to create a new profile.
 */
export function useFilePersonCheck({
  onProceedNormal,
  onProceedAsNewProfile,
}: Readonly<FilePersonCheckCallbacks>) {
  const { user } = useAuth();
  const { activeDependentId, activeProfileLabel, switchProfile } = useActiveProfile();
  const createDependent = useCreateDependentMutation();
  const { data: dependents = [] } = useDependentsQuery();
  const checkingRef = useRef(false);

  // ── Switch to an existing dependent ────────────────────────────────────────

  function switchToExisting(
    dep: DependentRecord,
    text: string,
    files: FileList | undefined,
  ) {
    const label = [dep.firstName, dep.lastName].filter(Boolean).join(" ");
    const newSessionId = crypto.randomUUID();
    switchProfile(dep.id, label);
    onProceedAsNewProfile(text, files, newSessionId);
    notifications.show({
      title: "Profile switched",
      message: `Now chatting as ${label}`,
      color: colors.success,
    });
  }

  // ── Create a new dependent then switch ─────────────────────────────────────

  function createAndSwitch(
    extracted: ExtractedPersonResult,
    displayName: string,
    text: string,
    files: FileList | undefined,
  ) {
    createDependent.mutate(
      {
        firstName: extracted.firstName ?? displayName,
        lastName: extracted.lastName,
        relationship: "Other",
        dateOfBirth: extracted.dateOfBirth,
      },
      {
        onSuccess: (newDep) => {
          const newSessionId = crypto.randomUUID();
          const label = [newDep.firstName, newDep.lastName]
            .filter(Boolean)
            .join(" ");
          switchProfile(newDep.id, label);
          onProceedAsNewProfile(text, files, newSessionId);
          notifications.show({
            title: "Profile created & switched",
            message: `Now chatting as ${label}`,
            color: colors.success,
          });
        },
        onError: () => {
          notifications.show({
            title: "Could not create profile",
            message: "Continuing with your current profile.",
            color: colors.danger,
          });
          onProceedNormal(text, files);
        },
      },
    );
  }

  // ── Shared confirm-switch modal ─────────────────────────────────────────────

  function openSwitchConfirmModal(
    displayName: string,
    text: string,
    files: FileList | undefined,
    onConfirm: () => void,
  ) {
    modals.openConfirmModal({
      title: "Switch profile?",
      children: (
        <Stack gap="xs">
          <Text size="sm">
            Your active profile will be switched to{" "}
            <Text span fw={600}>
              {displayName}
            </Text>
            .
          </Text>
          <Text size="sm" c="dimmed">
            A new session will be opened for {displayName} and this document
            will be attached there.
          </Text>
        </Stack>
      ),
      labels: { confirm: "Switch & continue", cancel: "Cancel" },
      confirmProps: { color: "primary" },
      onCancel: () => onProceedNormal(text, files),
      onConfirm,
    });
  }

  // ── Main gate ───────────────────────────────────────────────────────────────

  async function checkAndSend(text: string, files: FileList | undefined) {
    if (checkingRef.current) return;

    // Only inspect image / PDF attachments
    const visualFiles = files
      ? Array.from(files).filter(
        (f) => f.type.startsWith("image/") || f.type === "application/pdf",
      )
      : [];

    if (visualFiles.length === 0) {
      onProceedNormal(text, files);
      return;
    }

    checkingRef.current = true;

    let extracted: ExtractedPersonResult = { hasPersonData: false };
    try {
      const formData = new FormData();
      formData.append("file", visualFiles[0]);
      const res = await fetch("/api/files/extract-person", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        extracted = (await res.json()) as ExtractedPersonResult;
      }
    } catch {
      // Network error → proceed normally
    } finally {
      checkingRef.current = false;
    }

    // No person data detected → proceed normally
    if (!extracted.hasPersonData || (!extracted.firstName && !extracted.lastName)) {
      onProceedNormal(text, files);
      return;
    }

    const displayName = [extracted.firstName, extracted.lastName]
      .filter(Boolean)
      .join(" ");

    // Compare with the currently active profile
    const currentName = activeDependentId
      ? activeProfileLabel
      : (user?.displayName ?? "");

    if (namesOverlap(displayName, currentName)) {
      onProceedNormal(text, files);
      return;
    }

    // ── Check if an existing dependent profile matches the person ─────────────

    const existingDep = findMatchingDependent(displayName, dependents);

    if (existingDep) {
      // Path A: profile already exists → offer to switch
      const depLabel = [existingDep.firstName, existingDep.lastName]
        .filter(Boolean)
        .join(" ");

      modals.openConfirmModal({
        title: "Document belongs to an existing profile",
        children: (
          <Stack gap="sm">
            <Text size="sm">This document appears to contain details for:</Text>
            <Group gap={6}>
              <Badge
                size="lg"
                variant="light"
                color="primary"
                leftSection={<IconUser size={13} />}
              >
                {depLabel}
              </Badge>
              {extracted.dateOfBirth && (
                <Badge size="sm" variant="outline" color="secondary">
                  DOB: {extracted.dateOfBirth}
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              This person already has a profile. Would you like to switch to{" "}
              <Text span fw={600} c="primary">
                {depLabel}
              </Text>{" "}
              and continue in their session?
            </Text>
          </Stack>
        ),
        labels: { confirm: "Switch to this profile", cancel: "Continue as myself" },
        confirmProps: { color: "primary" },
        onCancel: () => onProceedNormal(text, files),
        onConfirm: () =>
          openSwitchConfirmModal(depLabel, text, files, () =>
            switchToExisting(existingDep, text, files),
          ),
      });
    } else {
      // Path B: no existing profile → offer to create one
      modals.openConfirmModal({
        title: "Document belongs to a different person",
        children: (
          <Stack gap="sm">
            <Text size="sm">
              This document appears to contain details for a different person:
            </Text>
            <Group gap={6}>
              <Badge
                size="lg"
                variant="light"
                color="primary"
                leftSection={<IconUserPlus size={13} />}
              >
                {displayName}
              </Badge>
              {extracted.dateOfBirth && (
                <Badge size="sm" variant="outline" color="secondary">
                  DOB: {extracted.dateOfBirth}
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed">
              Would you like to create a profile for{" "}
              <Text span fw={600} c="primary">
                {displayName}
              </Text>{" "}
              and continue in their session?
            </Text>
          </Stack>
        ),
        labels: { confirm: "Create profile & switch", cancel: "Continue as myself" },
        confirmProps: { color: "primary" },
        onCancel: () => onProceedNormal(text, files),
        onConfirm: () =>
          openSwitchConfirmModal(displayName, text, files, () =>
            createAndSwitch(extracted, displayName, text, files),
          ),
      });
    }
  }

  return { checkAndSend };
}

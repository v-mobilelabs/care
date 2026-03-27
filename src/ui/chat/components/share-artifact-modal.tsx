"use client";

import {
  Button,
  Modal,
  Stack,
  Text,
  TextInput,
  Group,
  Alert,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useState } from "react";
import { colors } from "@/ui/tokens";

export interface ShareArtifactModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly artifactType:
    | "assessment"
    | "summary"
    | "prescription"
    | "lab_report";
  readonly artifactId: string;
  readonly artifactName?: string;
  readonly onShare: (
    doctorId: string,
    message?: string,
  ) => Promise<void> | void;
}

export function ShareArtifactModal(props: Readonly<ShareArtifactModalProps>) {
  const { isOpen, onClose, artifactType, artifactId, artifactName, onShare } =
    props;
  const [doctorId, setDoctorId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    if (!doctorId.trim()) {
      setError("Please enter or select a doctor");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await onShare(doctorId, message || undefined);
      setDoctorId("");
      setMessage("");
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to share artifact";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClose() {
    setDoctorId("");
    setMessage("");
    setError(null);
    onClose();
  }

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title={`Share ${artifactType.replace("_", " ")}`}
      centered
      size="md"
    >
      <Stack gap="md">
        {artifactName && (
          <Text size="sm" c="dimmed">
            Sharing: <strong>{artifactName}</strong>
          </Text>
        )}

        <Text size="sm" c="dimmed">
          Share this {artifactType.replace("_", " ")} with your doctor. They
          will receive a notification and can view the details through your
          portal.
        </Text>

        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color={colors.danger}
            title="Error"
            style={{ fontSize: 13 }}
          >
            {error}
          </Alert>
        )}

        <Stack gap="sm">
          <TextInput
            label="Doctor ID or Email"
            placeholder="Enter doctor ID or email address"
            value={doctorId}
            onChange={(e) => setDoctorId(e.currentTarget.value)}
            disabled={isLoading}
          />

          <TextInput
            label="Optional message (leave blank for default)"
            placeholder="Add a note for your doctor..."
            value={message}
            onChange={(e) => setMessage(e.currentTarget.value)}
            disabled={isLoading}
          />
        </Stack>

        <Group justify="flex-end">
          <Button
            variant="light"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            loading={isLoading}
            disabled={!doctorId.trim()}
          >
            Share
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

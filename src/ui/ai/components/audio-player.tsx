"use client";

import { ActionIcon, Box, Group, Stack, Text } from "@mantine/core";
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconDownload,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { spacing, radius } from "@/ui/tokens";

export interface AudioPlayerProps {
  readonly sessionId?: string;
  readonly messageId?: string;
  /** GCS object path stored in the AudioPart — preferred over sessionId/messageId reconstruction. */
  readonly storagePath?: string;
  readonly duration?: number;
  readonly mimeType?: string;
}

/**
 * Inline audio player for Gemini Live response audio.
 * Fetches signed URLs dynamically from /api/sessions/{sessionId}/audio/{messageId}
 * to prevent expiry issues. Renders play/pause controls, progress bar, duration/time display.
 */
export function AudioPlayer(props: Readonly<AudioPlayerProps>) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(props.duration ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Fetch signed URL on mount — use storagePath if available, else fall back to sessionId/messageId
  useEffect(() => {
    console.log("[AudioPlayer] Props:", { storagePath: props.storagePath, sessionId: props.sessionId, messageId: props.messageId });

    if (!props.storagePath && (!props.sessionId || !props.messageId)) {
      setError("Missing audio storage path");
      return;
    }

    const url = props.storagePath
      ? `/api/audio/signed-url?path=${encodeURIComponent(props.storagePath)}`
      : `/api/sessions/${props.sessionId}/audio/${props.messageId}`;

    console.log("[AudioPlayer] Fetching:", url);
    setIsLoadingUrl(true);
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text();
          console.error("[AudioPlayer] HTTP error:", res.status, body);
          throw new Error(`HTTP ${res.status}: ${body}`);
        }
        return res.json() as Promise<{ success: boolean; url?: string; error?: string }>;
      })
      .then((data) => {
        console.log("[AudioPlayer] Response:", { success: data.success, hasUrl: !!data.url, error: data.error });
        if (data.success && data.url) {
          setAudioUrl(data.url);
          setError(null);
        } else {
          setError(data.error || "Failed to load audio");
        }
      })
      .catch((err) => {
        console.error("[AudioPlayer] Failed to fetch signed URL:", err);
        setError("Failed to load audio URL");
      })
      .finally(() => {
        setIsLoadingUrl(false);
      });
  }, [props.storagePath, props.sessionId, props.messageId]);

  useAudioEventListeners(audioRef, setIsPlaying, setCurrentTime, setDuration, setError);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      void audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement("a");
    link.href = audioUrl;
    link.download = `audio-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const progressPercent =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  const isLoading = isLoadingUrl || !audioUrl;

  return (
    <Box
      style={{
        background: `light-dark(var(--mantine-color-brand-0), rgba(70, 88, 242, 0.1))`,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBlock: spacing.sm,
      }}
    >
      <Stack gap="sm">
        {error ? (
          <Text size="sm" c="red">
            {error}
          </Text>
        ) : isLoading ? (
          <Text size="sm" c="dimmed">
            Loading audio...
          </Text>
        ) : (
          <>
            <AudioPlayerControls
              isPlaying={isPlaying}
              onPlayPause={handlePlayPause}
              onDownload={handleDownload}
              currentTime={currentTime}
              duration={duration}
              formatTime={formatTime}
              progressPercent={progressPercent}
              audioRef={audioRef}
              isLoading={isLoading}
            />
            {/* Hidden audio element - not displayed to user, no captions needed */}
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                style={{ display: "none" }}
              />
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}

// ── Extracted Component for Audio Controls ──────────────────────────────────

interface AudioPlayerControlsProps {
  readonly isPlaying: boolean;
  readonly onPlayPause: () => void;
  readonly onDownload: () => void;
  readonly currentTime: number;
  readonly duration: number;
  readonly formatTime: (seconds: number) => string;
  readonly progressPercent: number;
  readonly audioRef: React.RefObject<HTMLAudioElement | null>;
  readonly isLoading: boolean;
}

function AudioPlayerControls(
  props: Readonly<AudioPlayerControlsProps>,
): React.ReactElement {
  return (
    <>
      {/* Controls Row */}
      <Group gap="md" justify="apart">
        <Group gap="sm">
          <ActionIcon
            onClick={props.onPlayPause}
            variant="light"
            color="brand"
            size="lg"
            aria-label={props.isPlaying ? "Pause" : "Play"}
            disabled={props.isLoading}
          >
            {props.isPlaying ? (
              <IconPlayerPause size={20} />
            ) : (
              <IconPlayerPlay size={20} />
            )}
          </ActionIcon>

          {/* Time Display */}
          <Text size="xs" fw={500} style={{ minWidth: "45px" }}>
            {props.formatTime(props.currentTime)} / {props.formatTime(props.duration)}
          </Text>
        </Group>

        {/* Download */}
        <ActionIcon
          onClick={props.onDownload}
          variant="subtle"
          color="muted"
          size="sm"
          aria-label="Download audio"
          disabled={props.isLoading}
        >
          <IconDownload size={18} />
        </ActionIcon>
      </Group>

      {/* Progress Bar */}
      <Box
        onClick={(e) => {
          const audio = props.audioRef.current;
          const duration = props.duration;
          if (!audio) return;
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const newTime =
            ((e.clientX - rect.left) / rect.width) * duration;
          // eslint-disable-next-line react-hooks/immutability
          audio.currentTime = newTime;
        }}
        style={{
          height: "6px",
          background: `light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-6))`,
          borderRadius: radius.xs,
          overflow: "hidden",
          cursor: "pointer",
        }}
      >
        <Box
          style={{
            height: "100%",
            width: `${props.progressPercent}%`,
            background: `light-dark(var(--mantine-color-brand-6), var(--mantine-color-brand-4))`,
            transition: "width 0.1s linear",
          }}
        />
      </Box>
    </>
  );
}

// ── Custom Hook for Audio Event Listeners ────────────────────────────────────

function useAudioEventListeners(
  audioRef: React.RefObject<HTMLAudioElement | null>,
  setIsPlaying: (value: boolean) => void,
  setCurrentTime: (value: number) => void,
  setDuration: (value: number) => void,
  setError: (value: string | null) => void,
): void {
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);

    const handleError = (e: Event) => {
      const audioEl = e.target as HTMLAudioElement;
      const errorMsg =
        audioEl.error?.message || "Unknown playback error";
      setError(`MEDIA_ELEMENT_ERROR: ${errorMsg}`);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("error", handleError);
    };
  }, [setIsPlaying, setCurrentTime, setDuration, setError]);
}

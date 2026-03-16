"use client";
/**
 * useCallRingtone — plays a looping ringtone when pendingCallCount > 0.
 * Stops when pendingCallCount drops to 0 or component unmounts.
 * Uses Web Audio API to generate a simple beep tone.
 */
import { useEffect, useRef } from "react";

export function useCallRingtone(pendingCallCount: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    // Create audio element on first mount
    if (!audioRef.current) {
      // Use generated beep tone (no external file needed)
      audioRef.current = createBeepAudio();
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (pendingCallCount > 0 && !isPlayingRef.current) {
      // Start playing
      isPlayingRef.current = true;
      audio.play().catch((err) => {
        // Browser autoplay policy may block audio until user interaction
        console.warn("[useCallRingtone] Play failed (autoplay policy?):", err);
        isPlayingRef.current = false;
      });
    } else if (pendingCallCount === 0 && isPlayingRef.current) {
      // Stop playing
      isPlayingRef.current = false;
      audio.pause();
      audio.currentTime = 0;
    }

    // Cleanup on unmount
    return () => {
      if (audio && isPlayingRef.current) {
        audio.pause();
        audio.currentTime = 0;
        isPlayingRef.current = false;
      }
    };
  }, [pendingCallCount]);
}

/**
 * Creates a simple beep ringtone using Web Audio API as a fallback.
 * Returns an HTMLAudioElement-like object with play/pause/loop properties.
 */
function createBeepAudio(): HTMLAudioElement {
  // Fallback: use Web Audio API to generate a simple beep
  // Convert to HTMLAudioElement-compatible interface
  const AudioContextClass =
    globalThis.AudioContext ||
    (globalThis as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const audioContext = new AudioContextClass();
  let oscillator: OscillatorNode | null = null;
  let gainNode: GainNode | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  const playBeep = (gainNodeParam: GainNode) => {
    oscillator = audioContext.createOscillator();
    oscillator.frequency.value = 500;
    oscillator.connect(gainNodeParam);
    oscillator.start();
    setTimeout(() => oscillator?.stop(), 150);
  };

  const beepPattern = (gainNodeParam: GainNode) => {
    // Two short beeps (500 Hz) with 300ms gap, repeated every 2s
    playBeep(gainNodeParam);
    setTimeout(() => {
      playBeep(gainNodeParam);
    }, 300);
  };

  const fakeAudio = {
    loop: true,
    volume: 0.7,
    currentTime: 0,
    play: async () => {
      // Create oscillator + gain for a simple beep pattern
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0.3;

      beepPattern(gainNode);
      const currentGainNode = gainNode;
      intervalId = globalThis.setInterval(
        () => beepPattern(currentGainNode),
        2000,
      );
    },
    pause: () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (oscillator) {
        oscillator.stop();
        oscillator = null;
      }
    },
  } as unknown as HTMLAudioElement;

  return fakeAudio;
}
